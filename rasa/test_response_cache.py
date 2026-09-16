"""Run from the project root: python -m unittest discover -s rasa -p test_response_cache.py"""

import os
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent / "actions"))
from main_router import MainRouterService


class ResponseCacheTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {"RASA_LLM_RERANKER_ENABLED": "false"})
        env.start()
        self.addCleanup(env.stop)
        self.router = MainRouterService()

    def test_questions_with_same_broad_intent_have_different_keys(self):
        for first, second in [
            ("How do I borrow books?", "How do I change my section?"),
            ("Where is the registrar?", "Is there a registrar?"),
            ("I passed the CAT", "I did not pass the CAT"),
            ("unsaon pag login sa admission", "unsaon pag reset sa admission"),
        ]:
            with self.subTest(first=first):
                self.assertNotEqual(
                    self.router._cache_key("knowledge", "ask_process", first),
                    self.router._cache_key("knowledge", "ask_process", second),
                )

    def test_key_separates_purpose_subject_and_language(self):
        key = self.router._cache_key("location", "registrar", "registrar")
        self.assertNotEqual(key, self.router._cache_key("facility_availability", "registrar", "registrar"))
        self.assertNotEqual(key, self.router._cache_key("location", "library", "registrar"))
        with patch.object(self.router, "_cache_language", return_value="ceb"):
            self.assertNotEqual(key, self.router._cache_key("location", "registrar", "registrar"))

    def test_general_retrieval_runs_each_turn_and_preserves_selected_topic(self):
        # Isolate the scored retrieval branch while exercising the real routing method.
        queries = ["How do I borrow books?", "How do I change my section?", "How do I borrow books?"]
        topics = ["borrow_books", "change_section", "borrow_books"]
        with ExitStack() as stack:
            for name in ("direct_intent_override", "services_response", "admission_clarification_response",
                         "course_clarification_response", "validation_clarification_response",
                         "pe_uniform_clarification_response", "_facility_availability_route"):
                stack.enter_context(patch.object(self.router.knowledge_router, name, return_value=None))
            stack.enter_context(patch.object(self.router.context_manager, "resolve_follow_up_intent", return_value=None))
            build = stack.enter_context(patch.object(self.router.context_manager, "build_memory", return_value=None))
            stack.enter_context(patch.object(self.router, "_context_updates", return_value={}))
            def select(intent, query, values):
                topic = "borrow_books" if "books" in query else "change_section"
                self.router.knowledge_router.last_selected_intent = topic
                return {"text": topic}
            scorer = stack.enter_context(patch.object(self.router.knowledge_router, "find_best_response", side_effect=select))
            for query, topic in zip(queries, topics):
                response, _ = self.router.route_with_context("ask_process", {}, query, slots={})
                self.assertEqual(response, {"text": topic})
                self.assertEqual(build.call_args.kwargs["response_intent"], topic)
            self.assertEqual(scorer.call_count, 3)
            self.assertEqual(self.router._response_cache, {})

    def test_location_repeat_preserves_media_and_does_not_share_mutations(self):
        payload = {"text": "Library location", "custom": {
            "mapData": {"pins": [{"name": "Library"}]},
            "images": ["library.png"], "suggestions": [{"label": "Hours", "payload": "library hours"}]}}
        resolved = SimpleNamespace(locations=["library"])
        with patch.object(self.router.knowledge_router, "location_responses", return_value=[payload]) as render, \
             patch.object(self.router.context_manager, "build_memory", return_value=None), \
             patch.object(self.router, "_context_updates", return_value={}):
            first, _ = self.router._route_locations("ask_location", "Where is the library?", resolved, {})
            second, _ = self.router._route_locations("ask_location", "Where is the library?", resolved, {})
            self.assertEqual(first, second)
            self.assertEqual(render.call_count, 1)
            second["custom"]["images"].clear()
            third, _ = self.router._route_locations("ask_location", "Where is the library?", resolved, {})
            self.assertEqual(third["custom"]["images"], ["library.png"])

    def test_expiry_and_data_reload_invalidate_cache(self):
        with patch("main_router.time.time", return_value=1000):
            self.router._cache_set("sample", {"text": "Library"})
        with patch("main_router.time.time", return_value=1601):
            self.assertIsNone(self.router._cache_get("sample"))
        self.router._cache_set("sample", {"text": "Library"})
        with patch.object(self.router.data_loader, "refresh_if_changed", return_value=True):
            self.assertTrue(self.router.refresh_if_changed())
        self.assertEqual(self.router._response_cache, {})

    def test_existing_fallback_and_clarification_exclusions(self):
        for text in ["Do you mean library or student ID?", "I'm not sure. Try rephrasing."]:
            self.router._cache_set("sample", {"text": text})
            self.assertIsNone(self.router._cache_get("sample"))


if __name__ == "__main__":
    unittest.main()
