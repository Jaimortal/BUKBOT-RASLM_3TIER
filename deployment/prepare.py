"""Stage explicitly selected runtime files; never modify or delete source files.

Existing production files are never overwritten, including the model and secrets.
Uses only Python's standard library. Run --dry-run to review before staging.
"""

import argparse
import json
from pathlib import Path
import secrets
import shutil


ROOT = Path(__file__).resolve().parents[1]
SETTINGS = ("map_settings.json", "chat_widget_settings.json", "user_privileges.json")
REPORT = Path("docs/Testing/FULL TESTING TOPICS/result/02FAQ_1.1_Report.json")


def read_json(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Expected a regular JSON file: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def plan_files(root, model, admin):
    if model.is_symlink() or not model.is_file() or not model.name.endswith(".tar.gz"):
        raise ValueError("Select an existing trained Rasa .tar.gz model explicitly")
    accounts = read_json(admin)
    development = accounts.get("development", {}) if isinstance(accounts, dict) else {}
    users = development.get("users", []) if isinstance(development, dict) else []
    if not isinstance(users, list) or not all(isinstance(user, dict) for user in users):
        raise ValueError("Admin JSON must contain a development.users array of objects")
    if not users or not any(u.get("enabled") and u.get("role") == "main-admin" for u in users):
        raise ValueError("Admin JSON must contain an enabled main-admin in development.users")
    for user in users:
        if not isinstance(user.get("password"), str) or not user["password"].startswith(("$2a$", "$2b$", "$2y$")):
            raise ValueError("Admin passwords must be bcrypt hashes, not plain text")
    files = [(model, Path("model.tar.gz")), (admin, Path("account/admin-users.json"))]
    knowledge = root / "rasa/actions/knowledge"
    paths = sorted(knowledge.rglob("*.json"))
    if not paths:
        raise ValueError("Knowledge JSON files are missing")
    for source in paths:
        # Reject symlinked parents too: staging must not follow an unexpected tree.
        if source.resolve() != source.absolute():
            raise ValueError(f"Symlink in knowledge path: {source}")
        read_json(source)
        files.append((source, Path("actions/knowledge") / source.relative_to(knowledge)))
    for name in ("responses.json", "normalization_rules.json"):
        source = root / "rasa/actions" / name
        read_json(source)
        files.append((source, Path("actions") / name))
    for name in SETTINGS:
        source = root / "data" / name
        read_json(source)
        files.append((source, Path("data") / name))
    if (root / REPORT).is_file():
        read_json(root / REPORT)
        files.append((root / REPORT, Path("faq-report") / REPORT.name))
    return files


def stage(root, model, admin, dry_run=False):
    files = plan_files(root, model, admin)
    runtime = root / "deployment/runtime"
    # Refuse redirects out of this deployment folder.
    for destination in [runtime, root / "deployment/.env",
                        *[runtime / p for p in ("backups", "performance", "faq-report", "data/activity_logs.json")],
                        *[runtime / p for _, p in files]]:
        if destination.resolve() != destination.absolute():
            raise ValueError(f"Symlink in deployment destination: {destination}")
    for source, relative in files:
        destination = runtime / relative
        if destination.exists() and not destination.is_file():
            raise ValueError(f"Expected a file, found a directory: {destination}")
        action = "KEEP" if destination.exists() else "COPY"
        print(f"{action}: {relative}")
    if dry_run:
        print("Dry run: no files written. Existing runtime files and secrets will be kept.")
        return
    for name in ("backups", "performance", "faq-report", "data", "account"):
        (runtime / name).mkdir(parents=True, exist_ok=True)
    for source, relative in files:
        destination = runtime / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            # Exclusive creation also protects against an existing file appearing mid-run.
            with source.open("rb") as incoming, destination.open("xb") as outgoing:
                shutil.copyfileobj(incoming, outgoing)
    log = runtime / "data/activity_logs.json"
    if not log.exists():
        log.write_text("[]\n", encoding="utf-8")
    env = root / "deployment/.env"
    if not env.exists():
        with env.open("x", encoding="utf-8") as fp:
            fp.write(
                "# Runtime secrets; never included in Docker images or Git.\n"
                "PGUSER=chatbot\nPGDATABASE=buksu_chatbot\n"
                f"PGPASSWORD={secrets.token_hex(32)}\nJWT_SECRET={secrets.token_hex(48)}\n"
                "WEB_PORT=5000\nRASA_LLM_RERANKER_ENABLED=false\n"
                "# Add optional SMTP_*, GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_ID,\n"
                "# and LLM provider settings here when needed.\n"
            )
        env.chmod(0o600)
    (runtime / "account/admin-users.json").chmod(0o600)
    print("Ready: deployment/runtime and deployment/.env. No source files changed.")
    print("On Linux, grant container UID 1000 ownership of deployment/runtime before startup.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--admin-file", required=True, type=Path,
                        help="Explicitly selected production admin JSON; never selected automatically")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        stage(ROOT, args.model.absolute(), args.admin_file.absolute(), args.dry_run)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Preparation failed: {exc}\n")


if __name__ == "__main__":
    main()
