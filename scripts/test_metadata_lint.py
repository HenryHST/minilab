#!/usr/bin/env python3
"""Unit tests for metadata_lint against fixtures (no cluster)."""

from __future__ import annotations

import unittest
from pathlib import Path

from metadata_lint import LintResult, lint_file, lint_paths

ROOT = Path(__file__).resolve().parents[1]
FIX = ROOT / "scripts" / "testdata" / "metadata_lint"


class MetadataLintFixtures(unittest.TestCase):
    def _codes(self, path: Path) -> set[str]:
        result = LintResult()
        lint_file(path, ROOT, result)
        return {f.code for f in result.errors}

    def test_dashboard_missing_folder(self) -> None:
        self.assertIn("G1", self._codes(FIX / "bad" / "dashboard-missing-folder.yaml"))

    def test_dashboard_with_folder(self) -> None:
        self.assertNotIn("G1", self._codes(FIX / "good" / "dashboard-with-folder.yaml"))

    def test_cnpg_reload_as_annotation(self) -> None:
        self.assertIn("C1", self._codes(FIX / "bad" / "cnpg-reload-as-annotation.yaml"))

    def test_cnpg_reload_label(self) -> None:
        self.assertNotIn("C1", self._codes(FIX / "good" / "cnpg-reload-label.yaml"))

    def test_pilot_missing_std(self) -> None:
        self.assertIn("L1", self._codes(FIX / "bad" / "pilot-missing-std-label.yaml"))

    def test_pilot_dual_write(self) -> None:
        self.assertNotIn("L1", self._codes(FIX / "good" / "pilot-dual-write.yaml"))

    def test_repo_dashboards_and_pilot_pass(self) -> None:
        paths = [
            ROOT / "apps/monitoring/kube-prometheus-stack/manifests/dashboard-mqtt.yaml",
            ROOT / "apps/monitoring/kube-prometheus-stack/manifests/dashboard-wud.yaml",
            ROOT / "apps/monitoring/kromgo/deployment.yaml",
            ROOT / "apps/dev/termix/cnpg-cluster.yaml",
            ROOT / "apps/monitoring/gatus/manifests/cnpg-cluster.yaml",
            ROOT / "apps/_templates/networkpolicy-app.yaml",
        ]
        result = lint_paths(paths, ROOT)
        errors = [f for f in result.errors]
        self.assertEqual(errors, [], msg="\n".join(f"{e.path}: {e.message}" for e in errors))


if __name__ == "__main__":
    unittest.main()
