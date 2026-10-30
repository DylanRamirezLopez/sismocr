"""
CI local y gratuito: ejecuta en este equipo lo mismo que .github/workflows/ci.yml.

    python scripts/ci_local.py             # solo comprobar
    python scripts/ci_local.py --publish   # además, publicar el resultado en el commit

--publish crea estados de commit (local/backend, local/frontend) que se ven en el PR.
No usa GitHub Actions, así que no consume minutos ni depende de la facturación.
Requiere: pip install -r backend/requirements.txt -r backend/requirements-dev.txt
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "sismoscr"
PYTHON = sys.executable
GH_WINDOWS = Path("C:/Program Files/GitHub CLI/gh.exe")


def tool(name: str) -> str:
    return shutil.which(name) or name


def run_step(name: str, command: list[str], cwd: Path, env: dict | None = None) -> bool:
    print(f"\n=== {name}", flush=True)
    result = subprocess.run(
        command, cwd=cwd, env={**os.environ, **(env or {})},
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    output = (result.stdout + result.stderr).strip()
    print("\n".join(output.splitlines()[-(30 if result.returncode else 2):]), flush=True)
    print("OK" if result.returncode == 0 else f"FALLO (código {result.returncode})", flush=True)
    return result.returncode == 0


def run_steps(steps: list[tuple]) -> list[str]:
    """Ejecuta todos los pasos y devuelve los nombres de los que fallaron."""
    return [step[0] for step in steps if not run_step(*step)]


def pytest_step(name: str, database_url: str | None = None) -> tuple:
    env = {"TEST_DATABASE_URL": database_url} if database_url else {}
    return (name, [PYTHON, "-m", "pytest", "tests", "-q", "-p", "no:cacheprovider"], BACKEND, env)


def check_backend() -> list[str]:
    failed = run_steps([
        ("ruff", [PYTHON, "-m", "ruff", "check", "app", "tests", "--no-cache"], BACKEND),
        pytest_step("pytest (SQLite)"),
    ])

    # Postgres embebido y desechable: el mismo motor de producción, sin Docker
    import pgserver

    data_dir = tempfile.mkdtemp(prefix="sismocr_pg_")
    server = pgserver.get_server(data_dir, cleanup_mode="stop")
    try:
        url = server.get_uri().replace("postgresql://", "postgresql+asyncpg://", 1)
        failed += run_steps([pytest_step("pytest (PostgreSQL)", url)])
    finally:
        server.cleanup()
        shutil.rmtree(data_dir, ignore_errors=True)
    return failed


def check_frontend() -> list[str]:
    npx = tool("npx")
    return run_steps([
        ("tsc", [npx, "tsc", "--noEmit"], FRONTEND),
        ("eslint", [npx, "eslint"], FRONTEND),
        ("next build", [npx, "next", "build"], FRONTEND),
    ])


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def publishable_commit() -> str:
    """El resultado solo vale para un commit exacto: sin cambios locales y ya subido."""
    if git("status", "--porcelain"):
        sys.exit("No se publica: hay cambios sin commit, el resultado no correspondería al commit.")
    if not git("branch", "-r", "--contains", "HEAD"):
        sys.exit("No se publica: el commit no está en GitHub. Haz push primero.")
    return git("rev-parse", "HEAD")


def publish(sha: str, context: str, failed: list[str]):
    gh = shutil.which("gh") or str(GH_WINDOWS)
    state = "failure" if failed else "success"
    description = f"Falló: {', '.join(failed)}" if failed else "Correcto en local"
    subprocess.run(
        [gh, "api", "-X", "POST", f"repos/{{owner}}/{{repo}}/statuses/{sha}",
         "-f", f"state={state}", "-f", f"context={context}", "-f", f"description={description}"],
        cwd=ROOT, check=True, stdout=subprocess.DEVNULL,
    )
    print(f"Publicado {context}: {state}")


def main() -> int:
    parser = argparse.ArgumentParser(description="CI local de SismosCR")
    parser.add_argument("--publish", action="store_true", help="publicar el resultado en el commit actual")
    args = parser.parse_args()

    # Se valida antes de empezar: no tiene sentido esperar al final para descubrirlo
    sha = publishable_commit() if args.publish else None

    results = {"local/backend": check_backend(), "local/frontend": check_frontend()}

    if sha:
        for context, failed in results.items():
            publish(sha, context, failed)

    print("\n=== Resumen")
    for context, failed in results.items():
        print(f"{context}: {'FALLO en ' + ', '.join(failed) if failed else 'OK'}")
    return 1 if any(results.values()) else 0


if __name__ == "__main__":
    sys.exit(main())
