import importlib.util
import sys
from pathlib import Path

_path = Path(__file__).resolve().parents[2] / "scripts" / "ci_local.py"
_spec = importlib.util.spec_from_file_location("ci_local", _path)
ci_local = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ci_local)


def test_run_steps_reports_only_failures_and_keeps_going(tmp_path):
    ok = ("bien", [sys.executable, "-c", "pass"], tmp_path)
    bad = ("mal", [sys.executable, "-c", "raise SystemExit(3)"], tmp_path)
    assert ci_local.run_steps([bad, ok]) == ["mal"]
    assert ci_local.run_steps([ok]) == []
