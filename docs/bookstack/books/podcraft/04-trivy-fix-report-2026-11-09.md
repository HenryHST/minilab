---
title: Trivy Fix-Report 2026-11-09
chapter: security
---

# Trivy Fix-Report — podcraft (2026-11-09)

Scan: `vulnerabilities-20261109-171320.csv` (22 Zeilen = 11 Findings × 2 Ressourcen: `podcraft-image-pull/pull` + `podcraft-754fbc86c/podcraft`).

Image-SoT: `git.stadthagen.dev/dev/podcraft` · Runtime-Check gegen Digest `sha256:e74968fb…` (Tag `0.4.0`).

## Deduplizierte Findings

| Severity | Package | CSV Installed | Fixed Version | IDs | Runtime `e74968fb` |
|----------|---------|---------------|---------------|-----|---------------------|
| HIGH | msgpack | 1.1.2 | ≥1.2.3 | CVE-2026-114613, GHSA-6v7p-g79w-8964 | **nicht vorhanden** (Scan veraltet / SBOM-FP) |
| HIGH | setuptools | 70.3.0 | ≥78.1.1 (besser ≥84.1.0) | CVE-2025-47273, CVE-2026-59890 (MED), GHSA-xmj3-9gf7-h52w (LOW) | **nicht vorhanden** |
| HIGH/MED | urllib3 | 2.7.0 | ≥2.8.0 | CVE-2026-97687, CVE-2026-97689, CVE-2026-97688 | **bereits 2.8.0** |
| MED/UNK | zlib1g | `…-1+b1` | `…-1+deb13u1` | CVE-2026-27171, CVE-2026-76844, CVE-2026-85091 | **noch `…-1+b1`** ← einziges offenes Host-Paket |

## Ursache

1. **Python-CVEs im CSV treffen das laufende Digest nicht** — `pip list` / Site-Packages zeigen nur `urllib3==2.8.0`; weder `msgpack` noch `setuptools` liegen auf der Disk. Wahrscheinlich Scan gegen älteren Layer/SBOM (Workflow exportiert deshalb RootFS für Trivy).
2. **zlib1g kommt unverändert aus `python:3.14-slim` (Debian 13)** — Dockerfile installierte bisher keine apt-Upgrades.
3. **urllib3** war transitive Abhängigkeit von `kubernetes`; ohne Floor in `requirements.txt` kann ein Rebuild zurückfallen.

## Remediation (minilab `apps/dev/podcraft`, Ziel **0.4.1**)

| Maßnahme | Datei | Wirkung |
|----------|-------|---------|
| `apt-get … --only-upgrade zlib1g` | `Dockerfile` | schließt Debian-CVEs auf `+deb13u1` |
| `pip install setuptools≥84.1.0` dann `pip uninstall setuptools` | `Dockerfile` | verhindert Base-Image-Reste |
| Build-Assert `urllib3 ≥ 2.8.0` | `Dockerfile` | fail-fast |
| Pin `urllib3≥2.8.0` | `requirements.txt` | hält Floor für kubernetes-Transitiv |
| `VERSION` → `0.4.1` | `VERSION` | neues Image-Tag |

**Nicht nötig:** msgpack pinnen — Package ist nicht im Image und nicht in den App-Deps (`kubernetes==37.0.1`).

## Deploy-Pfad

1. Änderungen nach Forgejo `dev/podcraft` syncen (Workflow `.forgejo/workflows/image.yml`).
2. Image-Build (push/`workflow_dispatch`) → Tag `0.4.1` + Digest notieren.
3. CI-Trivy-FS-Schritt (CRITICAL/HIGH) muss grün sein.
4. In minilab `deployment.yaml` + `image-pull-job.yaml` Tag/Digest auf `0.4.1@sha256:…` setzen, Argo sync.
5. Verify im Pod:

```bash
kubectl -n podcraft exec deploy/podcraft -c podcraft -- \
  sh -c 'python3 -c "import importlib.metadata as m; print(m.version(\"urllib3\"))";
         dpkg-query -W -f="${Package} ${Version}\n" zlib1g;
         python3 -m pip list 2>/dev/null | grep -Ei "msgpack|setuptools" || echo "msgpack/setuptools: absent (ok)"'
```

Erwartung: `urllib3` ≥2.8.0, `zlib1g` endet auf `+deb13u1`, kein msgpack/setuptools.
