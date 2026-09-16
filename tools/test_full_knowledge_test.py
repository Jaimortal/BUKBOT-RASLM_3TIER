import json
import tempfile
import threading
import unittest
from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, HTTPServer
from io import StringIO
from pathlib import Path
from unittest.mock import patch

import full_knowledge_test as qa


def example(**changes):
    values = dict(id="K001-EN-01", query="How do I get this?", language="en",
                  section="K001", title="Example", category="procedures",
                  expected_intent="expected", expected_topic="expected",
                  expected_answers={"en": ["The complete answer."], "ceb": ["Ang tubag."]})
    return qa.Case(**{**values, **changes})


class BankTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.topics = qa.load_bank(qa.BANK_FILES["topics"], "topics")
        cls.gaps = qa.load_bank(qa.BANK_FILES["gaps"], "gaps")

    def test_real_bank_counts_and_exclusions(self):
        self.assertEqual(len(self.topics), 9880)
        self.assertEqual(len(self.gaps), 200)
        self.assertEqual(len({c.id for c in self.topics}), 9880)
        self.assertNotIn("location", {c.category for c in self.topics})
        self.assertTrue(all(c.source and c.pointer for c in self.topics))

    def test_balanced_quick_suite(self):
        cases = qa.select_cases(self.topics)
        self.assertEqual(len(cases), 988)
        self.assertEqual(len({c.section for c in cases}), 494)
        self.assertEqual(sum(c.language == "ceb" for c in cases), 494)
        self.assertTrue(all(c.id.endswith("01") for c in cases))

    def test_categories_and_open_are_independent(self):
        cases = qa.select_cases(self.topics, context="both")
        self.assertEqual(len(cases), 1976)
        self.assertEqual(len({c.run_id for c in cases}), 1976)
        self.assertEqual(len(qa.select_cases(self.gaps, context="category")), 0)

    def test_filters_and_repeatable_shuffle(self):
        cases = qa.select_cases(self.topics, suite="full", only="admission_procedures", language="ceb")
        self.assertTrue(cases)
        self.assertTrue(all(c.language == "ceb" and "admission_procedures" in c.source for c in cases))
        a = qa.select_cases(self.topics, shuffle=True, maximum=12)
        b = qa.select_cases(self.topics, shuffle=True, maximum=12)
        self.assertEqual([c.run_id for c in a], [c.run_id for c in b])

    def test_bank_source_drift_fails_loudly(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "procedures").mkdir()
            (root / "procedures/a.json").write_text(json.dumps({"topics": [{"topic": "changed", "intent": "changed", "responses": {"en": ["answer"]}}]}))
            bank = root / "bank.md"
            text = "### K001 - Example\nSource: [procedures/a.json](a), pointer `/topics/0`.\nTopic: `expected`. Intent: `expected`.\n"
            text += "\n".join(f"- K001-{lang}-{i:02}: question {i}" for lang in ("EN", "CEB") for i in range(1, 11))
            bank.write_text(text)
            with self.assertRaisesRegex(ValueError, "reference changed"):
                qa.load_bank(bank, "topics", root)


class ScoringTests(unittest.TestCase):
    def test_expected_never_in_job(self):
        case = example(context="open")
        self.assertEqual(qa.job_for(case), {"query": case.query, "category": None})
        case.context = "category"
        self.assertEqual(qa.job_for(case), {"query": case.query, "category": "procedures"})

    def test_exact_duplicate_answer_accepted(self):
        row = qa.grade(example(), {"actual_intent": "duplicate", "response": {"text": "The <b>complete</b> answer."}})
        self.assertEqual(row["status"], "ANSWER_MATCH")

    def test_route_match_is_not_full_answer_accuracy(self):
        row = qa.grade(example(), {"actual_intent": "expected", "response": {"answer": "Only a partial answer."}})
        self.assertEqual(row["status"], "ROUTE_MATCH")
        self.assertTrue(row["notes"])

    def test_empty_correct_id_is_not_pass(self):
        self.assertEqual(qa.grade(example(), {"actual_intent": "expected", "response": {}})["status"], "EMPTY_RESPONSE")

    def test_wrong_id_needs_equivalence_review(self):
        row = qa.grade(example(), {"actual_intent": "other", "response": "Another answer."})
        self.assertEqual(row["status"], "TOPIC_MISMATCH_REVIEW")

    def test_suggestion_target_is_not_an_answer_match(self):
        response = {"text": "Do you mean one of these?", "custom": {"suggestions": [{"payload": '/direct_intent{"intent":"expected"}'}]}}
        self.assertEqual(qa.grade(example(), {"response": response})["status"], "CLARIFICATION_REVIEW")

    def test_english_returned_for_bisaya(self):
        case = example(language="ceb")
        row = qa.grade(case, {"actual_intent": "expected", "response": "The complete answer."})
        self.assertEqual(row["status"], "LANGUAGE_MISMATCH")

    def test_unknown_language_not_guessed(self):
        row = qa.grade(example(language="ceb"), {"response": "Different paraphrase."})
        self.assertEqual(row["status"], "ANSWER_REVIEW")

    def test_child_parent_match_does_not_pass(self):
        row = qa.grade(example(pointer="/topics/0/items/1"), {"actual_intent": "expected", "response": "All course slots."})
        self.assertEqual(row["status"], "CHILD_ROW_REVIEW")

    def test_gap_does_not_get_false_pass(self):
        row = qa.grade(example(bank="gaps"), {"response": "Yes, it costs 999 pesos."})
        self.assertEqual(row["status"], "GAP_REVIEW")

    def test_transport_error_is_error(self):
        self.assertEqual(qa.grade(example(bank="gaps"), {"error": "HTTP 500"})["status"], "ERROR")

    def test_response_arrays_and_attachment_separation(self):
        response = [{"text": "Part one", "custom": {"mapData": {"pins": []}}}, {"text": "Part two", "image": "/example.png"}]
        self.assertEqual(qa.answer_text(response), "Part one\n\nPart two")
        media = qa.attachment_summary(response)
        self.assertTrue(media["has_map"])
        self.assertEqual(media["images"], ["/example.png"])
        self.assertEqual(qa.answer_text({"text": "joined", "textParts": ["Part one", "Part two"]}), "Part one\n\nPart two")


class RunnerTests(unittest.TestCase):
    def test_api_request_has_only_user_inputs_and_unique_session(self):
        received = []

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                received.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"answer": ["The complete answer."], "intent": "UNTRUSTWORTHY_ECHO"}).encode())

            def log_message(self, *args):
                pass

        server = HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{server.server_port}/api/chat"
            a = qa.call_api(qa.job_for(example()), url, 2)
            b = qa.call_api(qa.job_for(example(context="category")), url, 2)
            self.assertEqual(a["actual_intent"], "")
            self.assertEqual(qa.grade(example(), a)["status"], "ANSWER_MATCH")
            self.assertEqual(set(received[0]), {"intent", "sessionId"})
            self.assertEqual(received[1]["activeCategory"], "procedures")
            self.assertNotEqual(a["session_id"], b["session_id"])
        finally:
            server.shutdown()
            thread.join()
            server.server_close()

    def test_partial_journal_recovery_preserves_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "results.jsonl"
            row = {"run_id": "K001-EN-01:open", "status": "ANSWER_MATCH", "response": {"text": "full payload"}}
            complete = json.dumps(row).encode() + b"\n"
            path.write_bytes(complete + b'{"run_id":')
            with redirect_stdout(StringIO()):
                recovered = qa.read_results(path)
            self.assertEqual(len(recovered), 1)
            self.assertNotIn("response", recovered[row["run_id"]])
            qa.repair_journal_tail(path)
            self.assertEqual(path.read_bytes(), complete)

    def test_corrupt_complete_journal_line_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "results.jsonl"
            path.write_bytes(b"bad\n")
            with self.assertRaises(ValueError):
                qa.read_results(path)

    def test_resume_skips_completed_queries_and_refuses_changed_baseline(self):
        with tempfile.TemporaryDirectory() as tmp:
            options = ["--out-dir", tmp, "--max-tests", "1"]
            observations = {"response": "The complete answer.", "actual_intent": "expected"}
            with patch.object(qa, "load_bank", return_value=[example()]), patch.object(qa, "runtime_snapshot", return_value={"test.py": "abc"}), patch.object(qa, "LocalRunner") as runner, redirect_stdout(StringIO()):
                runner.return_value.run.return_value = observations
                qa.main(options)
                self.assertEqual(runner.return_value.run.call_count, 1)
                folder = next(Path(tmp).iterdir())
                qa.main(options + ["--resume", str(folder)])
                self.assertEqual(runner.return_value.run.call_count, 1)
                with patch.object(qa, "runtime_snapshot", return_value={"test.py": "changed"}):
                    with self.assertRaisesRegex(ValueError, "Resume configuration"):
                        qa.main(options + ["--resume", str(folder)])

    def test_csv_formula_escaping(self):
        self.assertEqual(qa.csv_cell("=SUM(1,2)"), "'=SUM(1,2)")

    def test_flagged_rerun_keeps_nonfirst_variant(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            previous = root / "previous"
            previous.mkdir()
            case = example(id="K001-EN-09")
            (previous / "results.jsonl").write_text(json.dumps({"run_id": case.run_id, "status": "ANSWER_REVIEW"}) + "\n")
            with patch.object(qa, "load_bank", return_value=[case]), patch.object(qa, "runtime_snapshot", return_value={}), patch.object(qa, "LocalRunner") as runner, redirect_stdout(StringIO()):
                runner.return_value.run.return_value = {"response": "The complete answer."}
                qa.main(["--out-dir", str(root / "new"), "--rerun-flagged", str(previous)])
                runner.return_value.run.assert_called_once_with(qa.job_for(case))

    def test_percentile_reports_slow_request_for_small_samples(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = qa.grade(example(), {"response": "The complete answer.", "latency_ms": 1})
            b = qa.grade(example(id="K001-EN-02"), {"response": "The complete answer.", "latency_ms": 100})
            qa.write_reports(Path(tmp), {a["run_id"]: a, b["run_id"]: b}, 2, 1, [], False)
            self.assertIn("100.0 ms", (Path(tmp) / "report.md").read_text())


if __name__ == "__main__":
    unittest.main()
