"""Read-only deployment checks. Run from the project root before a pilot rollout."""

import json
import os
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_env(path):
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main():
    os.chdir(ROOT)
    env = {**read_env(ROOT / ".env"), **os.environ}
    failures = []
    warnings = []

    if not (ROOT / ".env").is_file():
        failures.append("Missing root .env file")
    if not shutil.which("node"):
        failures.append("Node.js is not on PATH")
    if not shutil.which("python"):
        failures.append("Python is not on PATH")
    if not (ROOT / "node_modules").is_dir():
        failures.append("Node dependencies missing; run npm ci")

    for key in ("PGHOST", "PGPORT", "PGUSER", "PGDATABASE", "PGPASSWORD", "JWT_SECRET"):
        value = env.get(key, "")
        if not value or value.lower() in {"change-me", "your-super-secret-jwt-key-change-this-in-production"}:
            failures.append(f"Set a non-placeholder {key} in .env")
    if env.get("PGPASSWORD", "").lower() in {"postgres", "adpass"}:
        warnings.append("PGPASSWORD looks like a development default; use a unique production password")
    if len(env.get("JWT_SECRET", "")) < 32:
        failures.append("JWT_SECRET should contain at least 32 random characters")

    required = [
        ROOT / "rasa" / "config.yml",
        ROOT / "rasa" / "domain.yml",
        ROOT / "rasa" / "endpoints.yml",
        ROOT / "rasa" / "actions" / "responses.json",
        ROOT / "rasa" / "actions" / "knowledge" / "location" / "responses_location_core.json",
    ]
    for item in required:
        if not item.is_file():
            failures.append(f"Missing {item.relative_to(ROOT)}")

    knowledge_root = ROOT / "rasa" / "actions" / "knowledge"
    if knowledge_root.is_dir():
        for item in knowledge_root.rglob("*.json"):
            try:
                json.loads(item.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                failures.append(f"Invalid JSON: {item.relative_to(ROOT)} ({exc})")

    if not list((ROOT / "rasa" / "models").glob("*.tar.gz")):
        failures.append("No trained Rasa model in rasa/models")
    if not (ROOT / "dist" / "index.cjs").is_file() or not (ROOT / "dist" / "public" / "index.html").is_file():
        warnings.append("Production build missing; run npm run build before startup")
    if env.get("RASA_LLM_RERANKER_ENABLED", "false").lower() in {"true", "1", "yes", "on"}:
        warnings.append("LLM enabled: verify provider key, quota, latency, and fallback on the deployed host")
    if env.get("HOST", "127.0.0.1") == "0.0.0.0":
        warnings.append("Node listens on all interfaces; protect the admin API behind TLS/reverse proxy")

    print("Deployment preflight (read-only)")
    for message in warnings:
        print(f"WARN: {message}")
    for message in failures:
        print(f"FAIL: {message}")
    print(f"Result: {'FAIL' if failures else 'PASS'} ({len(failures)} failures, {len(warnings)} warnings)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
