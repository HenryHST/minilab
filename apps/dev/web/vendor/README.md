# Homepage robot-heads vendor

Local ESM bundle for [web.stadthagen.dev](https://web.stadthagen.dev) so the Mascot does **not** load `esm.sh` at runtime.

Upstream Git mirror (audit / tags): https://git.stadthagen.dev/ops/robot-heads  
npm pin (Renovate): `robot-heads` in `package.json`

## Build

```bash
cd apps/dev/web/vendor
npm install
npm run build
npm run sync-configmap   # writes apps/dev/web/homepage-robot-vendor.configmap.yaml
```

Commit `dist/nxk3-robot.mjs` and the ConfigMap YAML after bumps.

## After a Renovate PR

1. Merge version bump in `package.json` / lockfile
2. `npm install && npm run build && npm run sync-configmap`
3. Commit dist + ConfigMap; Argo syncs Homepage; `kubectl -n homepage rollout restart deploy/web` if the mount does not refresh
