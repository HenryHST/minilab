<?php
/**
 * Idempotent BookStack bootstrap for cluster docs-import.
 * Env: BOOKSTACK_TOKEN_ID, BOOKSTACK_TOKEN_SECRET
 * Creates/updates:
 *   - role "GitOps Import" + user gitops-import@localhost + API token "docs-import"
 *   - role "BookStack Familie" (OIDC group display_name; content ACL for Regal Familie)
 *   - app setting app-disable-comments=true (global comments off)
 */
declare(strict_types=1);

use BookStack\Api\ApiToken;
use BookStack\Permissions\PermissionsRepo;
use BookStack\Users\Models\Role;
use BookStack\Users\Models\User;
use BookStack\Users\UserRepo;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

$tokenId = getenv('BOOKSTACK_TOKEN_ID') ?: '';
$tokenSecret = getenv('BOOKSTACK_TOKEN_SECRET') ?: '';
if ($tokenId === '' || $tokenSecret === '') {
    fwrite(STDERR, "ERROR: BOOKSTACK_TOKEN_ID / BOOKSTACK_TOKEN_SECRET required\n");
    exit(1);
}
if (strlen($tokenId) < 16 || strlen($tokenSecret) < 16) {
    fwrite(STDERR, "ERROR: token id/secret must be at least 16 chars\n");
    exit(1);
}

$gitopsPermissions = [
    'access-api',
    'bookshelf-view-all',
    'bookshelf-create-all',
    'bookshelf-update-all',
    'book-view-all',
    'book-create-all',
    'book-update-all',
    'chapter-view-all',
    'chapter-create-all',
    'chapter-update-all',
    'page-view-all',
    'page-create-all',
    'page-update-all',
    // Inline chapter screenshots (import_books.py → POST /api/image-gallery)
    'image-create-all',
    'image-update-all',
    // Content ACL for Regal Familie (import_books.py → /api/content-permissions)
    'restrictions-manage-all',
    // List roles for ACL role_id lookup (/api/roles)
    'settings-manage',
];

$familiePermissions = [
    'bookshelf-view-all',
    'bookshelf-create-all',
    'bookshelf-update-all',
    'book-view-all',
    'book-create-all',
    'book-update-all',
    'chapter-view-all',
    'chapter-create-all',
    'chapter-update-all',
    'page-view-all',
    'page-create-all',
    'page-update-all',
    'image-create-all',
    'image-update-all',
    'attachment-create-all',
    'attachment-update-all',
    // PDF/HTML/Markdown/ZIP export from the UI (view alone is not enough)
    'content-export',
];

$roleName = 'GitOps Import';
$email = 'gitops-import@localhost';
$userName = 'gitops-import';
$tokenName = 'docs-import';
$familieRoleName = 'BookStack Familie';

/** @var PermissionsRepo $permsRepo */
$permsRepo = app(PermissionsRepo::class);
/** @var UserRepo $userRepo */
$userRepo = app(UserRepo::class);

$role = Role::query()->where('display_name', $roleName)->first();
if ($role === null) {
    $role = $permsRepo->saveNewRole([
        'display_name' => $roleName,
        'description' => 'Least-privilege API role for cluster docs-import CronJob',
        'permissions' => $gitopsPermissions,
        'mfa_enforced' => false,
    ]);
    echo "ROLE created id={$role->id}\n";
} else {
    $permsRepo->updateRole($role->id, [
        'description' => 'Least-privilege API role for cluster docs-import CronJob',
        'permissions' => $gitopsPermissions,
        'mfa_enforced' => false,
    ]);
    $role = $permsRepo->getRoleById($role->id);
    echo "ROLE updated id={$role->id}\n";
}

$familieRole = Role::query()->where('display_name', $familieRoleName)->first();
if ($familieRole === null) {
    $familieRole = $permsRepo->saveNewRole([
        'display_name' => $familieRoleName,
        'description' => 'OIDC group BookStack Familie — view/create/update + export, no delete',
        'permissions' => $familiePermissions,
        'mfa_enforced' => false,
    ]);
    echo "ROLE created id={$familieRole->id} display_name={$familieRoleName}\n";
} else {
    $permsRepo->updateRole($familieRole->id, [
        'description' => 'OIDC group BookStack Familie — view/create/update + export, no delete',
        'permissions' => $familiePermissions,
        'mfa_enforced' => false,
    ]);
    $familieRole = $permsRepo->getRoleById($familieRole->id);
    echo "ROLE updated id={$familieRole->id} display_name={$familieRoleName}\n";
}

$user = User::query()->where('email', $email)->first();
if ($user === null) {
    $user = $userRepo->create([
        'name' => $userName,
        'email' => $email,
        'password' => Str::random(48),
        'roles' => [$role->id],
    ], false);
    echo "USER created id={$user->id}\n";
} else {
    $user->email_confirmed = true;
    $user->save();
    $user->roles()->sync([$role->id]);
    echo "USER updated id={$user->id}\n";
}

$token = ApiToken::query()
    ->where('user_id', $user->id)
    ->where('name', $tokenName)
    ->first();

if ($token === null) {
    $byId = ApiToken::query()->where('token_id', $tokenId)->first();
    if ($byId !== null && (int) $byId->user_id !== (int) $user->id) {
        fwrite(STDERR, "ERROR: token_id already belongs to another user\n");
        exit(1);
    }
    $token = $byId ?? new ApiToken();
}

$token->forceFill([
    'name' => $tokenName,
    'token_id' => $tokenId,
    'secret' => Hash::make($tokenSecret),
    'user_id' => $user->id,
    'expires_at' => ApiToken::defaultExpiry(),
]);
$token->save();
echo "TOKEN upserted id={$token->id} token_id={$tokenId}\n";

setting()->put('app-disable-comments', 'true');
echo "SETTING app-disable-comments=true\n";

echo "OK\n";
