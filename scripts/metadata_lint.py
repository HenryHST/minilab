#!/usr/bin/env python3
"""Static lint for Kubernetes labels/annotations conventions in minilab apps/."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

try:
    import yaml
except ImportError:  # pragma: no cover
    print("PyYAML required: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

SKIP_DIR_PARTS = {
    "charts",
    "chart",
    "templates",
    "expected_templates",
    "tests",
    "testdata",
    "blueprints",
    "examples",
}
SECRET_ANNOT_KEY_RE = re.compile(
    r"(password|token|private[_-]?key|\.pem$|/pem$)", re.IGNORECASE
)
ALPHA_SECCOMP_PREFIX = "container.seccomp.security.alpha.kubernetes.io/"
LONGHORN_REPLICA_KEYS = {
    "longhorn.io/volume-replica-count",
    "longhorn.io/numberOfReplicas",
}
PILOT_DEPLOY_PATHS = {
    "apps/monitoring/kromgo/deployment.yaml",
}
CNPG_COMPONENT_PATHS = {
    "apps/dev/termix/cnpg-cluster.yaml",
    "apps/monitoring/gatus/manifests/cnpg-cluster.yaml",
}
MAX_ANNOT_VALUE = 8 * 1024
MAX_ANNOT_TOTAL = 256 * 1024


@dataclass
class Finding:
    code: str
    severity: str  # error | warning
    path: str
    message: str


@dataclass
class LintResult:
    findings: list[Finding] = field(default_factory=list)

    def add(self, code: str, severity: str, path: str, message: str) -> None:
        self.findings.append(Finding(code, severity, path, message))

    @property
    def errors(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "error"]

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "warning"]


def _is_skipped(path: Path, root: Path) -> bool:
    try:
        rel_parts = path.relative_to(root).parts
    except ValueError:
        rel_parts = path.parts
    return any(p in SKIP_DIR_PARTS for p in rel_parts)


def iter_docs(path: Path) -> Iterator[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    for doc in yaml.safe_load_all(text):
        if isinstance(doc, dict):
            yield doc


def check_grafana_folder(doc: dict[str, Any], path: str, result: LintResult) -> None:
    if doc.get("kind") != "ConfigMap":
        return
    meta = doc.get("metadata") or {}
    labels = meta.get("labels") or {}
    if str(labels.get("grafana_dashboard", "")) != "1":
        return
    annot = meta.get("annotations") or {}
    if "grafana_folder" not in annot:
        result.add(
            "G1",
            "error",
            path,
            "ConfigMap with grafana_dashboard=1 missing annotation grafana_folder",
        )


def check_cnpg_reload(doc: dict[str, Any], path: str, result: LintResult) -> None:
    if "cnpg-certificates" not in path and not path.endswith("cnpg-certificates.yaml"):
        # Also accept fixtures named *-server-tls secrets
        pass
    if doc.get("kind") != "Secret":
        return
    meta = doc.get("metadata") or {}
    name = str(meta.get("name") or "")
    if not (name.endswith("-server-tls") or "cnpg-certificates" in path):
        return
    if not name.endswith("-server-tls"):
        return
    labels = meta.get("labels") or {}
    annot = meta.get("annotations") or {}
    if "cnpg.io/reload" in annot and "cnpg.io/reload" not in labels:
        result.add(
            "C1",
            "error",
            path,
            f"Secret {name}: cnpg.io/reload must be a label, not an annotation",
        )
    elif "cnpg.io/reload" not in labels:
        result.add(
            "C1",
            "error",
            path,
            f"Secret {name}: missing label cnpg.io/reload",
        )


def _is_pilot_deploy_path(path: str) -> bool:
    norm = path.replace("\\", "/")
    name = Path(norm).name
    if any(norm.endswith(p) for p in PILOT_DEPLOY_PATHS):
        return True
    if "kromgo/deployment.yaml" in norm:
        return True
    if name.startswith("pilot-") and name.endswith(".yaml"):
        return True
    return False


def check_pilot_dual_write(doc: dict[str, Any], path: str, result: LintResult) -> None:
    if doc.get("kind") != "Deployment" or not _is_pilot_deploy_path(path):
        return
    tmpl = ((doc.get("spec") or {}).get("template") or {}).get("metadata") or {}
    labels = tmpl.get("labels") or {}
    app = labels.get("app")
    std = labels.get("app.kubernetes.io/name")
    if not app or not std:
        result.add(
            "L1",
            "error",
            path,
            "Pilot Deployment pod template needs dual-write app + app.kubernetes.io/name",
        )
    elif str(app) != str(std):
        result.add(
            "L1",
            "error",
            path,
            f"Pilot dual-write mismatch app={app!r} vs app.kubernetes.io/name={std!r}",
        )


def check_cnpg_component(doc: dict[str, Any], path: str, result: LintResult) -> None:
    norm = path.replace("\\", "/")
    if not any(norm.endswith(p) for p in CNPG_COMPONENT_PATHS):
        return
    if doc.get("kind") != "Cluster":
        return
    labels = (doc.get("metadata") or {}).get("labels") or {}
    if labels.get("app.kubernetes.io/component") != "postgresql":
        result.add(
            "P1",
            "error",
            path,
            "CNPG Cluster missing label app.kubernetes.io/component=postgresql",
        )


def check_annotations_safety(doc: dict[str, Any], path: str, result: LintResult) -> None:
    meta = doc.get("metadata") or {}
    annot = meta.get("annotations") or {}
    if not isinstance(annot, dict):
        return
    total = 0
    for key, value in annot.items():
        k = str(key)
        v = "" if value is None else str(value)
        total += len(k) + len(v)
        if SECRET_ANNOT_KEY_RE.search(k):
            result.add(
                "A1",
                "error",
                path,
                f"Suspicious annotation key looks like a secret: {k}",
            )
        if len(v) > MAX_ANNOT_VALUE:
            result.add(
                "A2",
                "error",
                path,
                f"Annotation {k} value length {len(v)} exceeds {MAX_ANNOT_VALUE}",
            )
        if k.startswith(ALPHA_SECCOMP_PREFIX):
            result.add(
                "W2",
                "warning",
                path,
                f"Deprecated alpha seccomp annotation: {k}",
            )
        if k in LONGHORN_REPLICA_KEYS and doc.get("kind") == "PersistentVolumeClaim":
            result.add(
                "W1",
                "warning",
                path,
                f"Longhorn PVC annotation {k} is a no-op; use StorageClass or Volume patch",
            )
    if total > MAX_ANNOT_TOTAL:
        result.add(
            "A2",
            "error",
            path,
            f"Total annotations size {total} exceeds {MAX_ANNOT_TOTAL}",
        )


def check_np_template(path: Path, result: LintResult) -> None:
    text = path.read_text(encoding="utf-8")
    if "dual-write" not in text.lower() and "dual_write" not in text.lower():
        result.add(
            "L2",
            "error",
            str(path),
            "NetworkPolicy template must document dual-write label contract",
        )


def _rel(path: Path, root: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return str(path)


def lint_file(path: Path, root: Path, result: LintResult) -> None:
    rel = _rel(path, root)
    # Placeholder template is not valid YAML — text contract only.
    if path.name == "networkpolicy-app.yaml" and "_templates" in path.parts:
        check_np_template(path, result)
        return
    try:
        docs = list(iter_docs(path))
    except yaml.YAMLError as exc:
        result.add("YAML", "error", rel, f"YAML parse error: {exc}")
        return
    for doc in docs:
        check_grafana_folder(doc, rel, result)
        check_cnpg_reload(doc, rel, result)
        check_pilot_dual_write(doc, rel, result)
        check_cnpg_component(doc, rel, result)
        check_annotations_safety(doc, rel, result)


def lint_tree(root: Path) -> LintResult:
    result = LintResult()
    apps = root / "apps"
    scan_root = apps if apps.is_dir() else root
    for path in sorted(scan_root.rglob("*.yaml")):
        if _is_skipped(path, scan_root):
            continue
        lint_file(path, root, result)
    # Always check template if present
    tmpl = root / "apps" / "_templates" / "networkpolicy-app.yaml"
    if tmpl.is_file() and not any(
        f.path.endswith("_templates/networkpolicy-app.yaml") for f in result.findings if f.code == "L2"
    ):
        # lint_file already ran via rglob if under apps
        pass
    return result


def lint_paths(paths: list[Path], root: Path) -> LintResult:
    result = LintResult()
    for path in paths:
        lint_file(path, root, result)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Repository root (default: parent of scripts/)",
    )
    parser.add_argument(
        "--fail-on-warning",
        action="store_true",
        help="Exit non-zero on warnings as well as errors",
    )
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="Optional explicit YAML files (default: scan apps/)",
    )
    args = parser.parse_args(argv)
    root = args.root.resolve()
    if args.paths:
        result = lint_paths([p.resolve() for p in args.paths], root)
    else:
        result = lint_tree(root)

    for f in result.findings:
        print(f"{f.severity.upper()} [{f.code}] {f.path}: {f.message}")

    err_n = len(result.errors)
    warn_n = len(result.warnings)
    print(f"Summary: {err_n} error(s), {warn_n} warning(s)")
    if err_n:
        return 1
    if args.fail_on_warning and warn_n:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
