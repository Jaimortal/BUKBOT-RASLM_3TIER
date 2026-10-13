import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location("prepare", Path(__file__).resolve().parents[1] / "prepare.py")
prepare = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(prepare)


class StagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.write("rasa/actions/knowledge/academics/classroom.json", {"example": "original"})
        for name in ("responses.json", "normalization_rules.json"):
            self.write("rasa/actions/" + name, {})
        for name in prepare.SETTINGS:
            self.write("data/" + name, {})
        self.write("data/activity_logs.json", [{"development": "do not copy"}])
        self.write("server/account/admin-users.json", {"development": "do not copy"})
        self.write("production-admin.json", {"development": {"users": [{"enabled": True, "role": "main-admin", "password": "$2b$12$test-fixture"}]}})
        self.model = self.root / "selected.tar.gz"
        self.model.write_bytes(b"selected model fixture")
        (self.root / "other.tar.gz").write_bytes(b"must not copy")
        (self.root / ".env").write_text("LOCAL_SECRET=do-not-copy\n")
        self.admin = self.root / "production-admin.json"

    def write(self, relative, value):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value), encoding="utf-8")

    def stage(self, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()):
            prepare.stage(self.root, self.model, self.admin, **kwargs)

    def test_dry_run_writes_nothing(self):
        before = sorted(str(p.relative_to(self.root)) for p in self.root.rglob("*"))
        self.stage(dry_run=True)
        self.assertEqual(before, sorted(str(p.relative_to(self.root)) for p in self.root.rglob("*")))

    def test_only_selected_data_and_new_secrets_are_staged(self):
        self.stage()
        runtime = self.root / "deployment/runtime"
        self.assertEqual((runtime / "model.tar.gz").read_bytes(), self.model.read_bytes())
        self.assertFalse((runtime / "other.tar.gz").exists())
        self.assertEqual(json.loads((runtime / "data/activity_logs.json").read_text()), [])
        self.assertEqual((runtime / "account/admin-users.json").read_bytes(), self.admin.read_bytes())
        self.assertNotIn("LOCAL_SECRET", (self.root / "deployment/.env").read_text())
        self.assertIn("do-not-copy", (self.root / ".env").read_text())

    def test_rerun_keeps_live_edits_accounts_secrets_and_model(self):
        self.stage()
        relative = "deployment/runtime/actions/knowledge/academics/classroom.json"
        self.write(relative, {"live": "admin edit"})
        self.write("production-admin.json", {"development": {"users": [{"enabled": True, "role": "main-admin", "password": "$2b$12$new-fixture"}]}})
        self.model.write_bytes(b"different model")
        env = (self.root / "deployment/.env").read_bytes()
        self.stage()
        self.assertEqual(json.loads((self.root / relative).read_text()), {"live": "admin edit"})
        self.assertEqual((self.root / "deployment/runtime/model.tar.gz").read_bytes(), b"selected model fixture")
        self.assertEqual((self.root / "deployment/.env").read_bytes(), env)
        self.assertNotIn("new-fixture", (self.root / "deployment/runtime/account/admin-users.json").read_text())

    def test_invalid_json_fails_before_any_staging(self):
        (self.root / "rasa/actions/responses.json").write_text("not json")
        with self.assertRaises(ValueError):
            self.stage()
        self.assertFalse((self.root / "deployment").exists())

    def test_plaintext_admin_password_is_rejected(self):
        self.write("production-admin.json", {"development": {"users": [{"enabled": True, "role": "main-admin", "password": "plaintext"}]}})
        with self.assertRaises(ValueError):
            self.stage()
        self.assertFalse((self.root / "deployment").exists())

    def test_redirected_runtime_is_rejected(self):
        (self.root / "deployment").mkdir()
        target = self.root / "elsewhere"
        target.mkdir()
        try:
            (self.root / "deployment/runtime").symlink_to(target, target_is_directory=True)
        except OSError:
            self.skipTest("Symlink creation unavailable on this host")
        with self.assertRaises(ValueError):
            self.stage()
        self.assertEqual(list(target.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
