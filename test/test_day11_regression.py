import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "rasa" / "actions"))

from actions import ActionReplyFromJsonHelper, LOCATION_ALIASES  # noqa: E402
from main_router import MainRouterService  # noqa: E402


class Day11RegressionTests(unittest.TestCase):
    def setUp(self):
        helper = ActionReplyFromJsonHelper(str(ROOT / "rasa" / "actions" / "responses.json"))
        self.router = MainRouterService(helper, LOCATION_ALIASES)

    def route(self, intent, text, slots=None):
        message = {"text": text, "entities": []}
        return self.router.route_with_context(intent, message, text, slots or {})

    def text_of(self, response):
        if isinstance(response, dict):
            return response.get("text", "")
        return str(response)

    def labels_of(self, response):
        return [
            item.get("label")
            for item in (response.get("custom") or {}).get("suggestions", [])
            if item.get("label")
        ]

    def test_context_memory_routes_follow_up_requirements(self):
        first, first_slots = self.route("ask_location", "where can i get library id")
        follow_up, follow_up_slots = self.route(
            "ask_requirement",
            "what are the requirements?",
            first_slots,
        )

        self.assertIn("second floor", self.text_of(first).lower())
        self.assertIn("COR", self.text_of(follow_up))
        self.assertNotIn("freshman", self.text_of(follow_up).lower())
        self.assertEqual(follow_up_slots["conversation_subject"], "library_id_card")
        self.assertEqual(follow_up_slots["conversation_last_intent"], "library_id_card_requirements")

    def test_ambiguous_validation_asks_for_clarification(self):
        response, slots = self.route("ask_process", "how validate?")

        self.assertIn("Which validation", self.text_of(response))
        self.assertEqual(self.labels_of(response), ["ID validation", "COR validation"])
        self.assertEqual(slots, {})

    def test_low_confidence_question_uses_safe_fallback(self):
        response, slots = self.route("ask_general_info", "blue pencil dragon schedule")

        text = self.text_of(response).lower()
        self.assertTrue("not sure" in text or "do you mean" in text or "clarify" in text)
        self.assertEqual(slots, {})

    def test_location_map_payload_survives_old_and_new_formats(self):
        response, slots = self.route("ask_location", "where is AVC")
        custom = response.get("custom") or {}

        self.assertIn("mapData", custom)
        self.assertGreaterEqual(len(custom["mapData"].get("pins") or []), 1)
        self.assertGreaterEqual(len(custom["mapData"].get("routes") or []), 1)
        self.assertEqual(slots["conversation_last_intent"], "location")

    def test_structured_mapref_and_image_payload_are_flattened(self):
        loader = self.router.data_loader
        topic_lookup = {
            "source_map": {
                "topic": "source_map",
                "pins": [{"name": "Start", "coordinates": [1, 2]}],
                "routes": [{"name": "Path", "points": [[1, 2], [3, 4]]}],
            }
        }
        map_data = loader._map_data_for_topic({"topic": "uses_map", "mapRef": "source_map"}, "uses_map", topic_lookup)
        records = loader._flatten_topic(
            topic={
                "topic": "image_topic",
                "intent": "image_payload_test",
                "responses": {"en": ["Image answer"], "ceb": ["Image answer"]},
                "imageUrls": ["/api/images/day11"],
                "mapRef": "source_map",
            },
            base_intent="ask_general_info",
            category="Day 11",
            source_name="day11_test.json",
            topic_lookup=topic_lookup,
        )

        self.assertEqual(map_data["pins"][0]["name"], "Start")
        self.assertEqual(map_data["routes"][0]["name"], "Path")
        self.assertEqual(records[0]["responses"]["imageUrls"], ["/api/images/day11"])
        self.assertEqual(records[0]["responses"]["mapData"]["pins"][0]["name"], "Start")

    def test_admin_json_saves_have_backup_hooks(self):
        files_to_check = [
            ROOT / "server" / "admin.ts",
            ROOT / "server" / "admin-db.ts",
            ROOT / "server" / "controllers" / "adminKnowledgeController.ts",
            ROOT / "server" / "controllers" / "adminBotTopicsController.ts",
        ]

        for path in files_to_check:
            source = path.read_text(encoding="utf-8")
            with self.subTest(path=path.name):
                self.assertIn("backupJsonFile", source)

    def test_hot_reload_rejects_invalid_json_before_state_swap(self):
        helper = self.router.data_loader.helper
        invalid_path = ROOT / "test" / "day11_invalid_temp.json"
        invalid_path.write_text("{not valid json", encoding="utf-8")
        try:
            error = helper._json_validation_error(str(invalid_path))
        finally:
            invalid_path.unlink(missing_ok=True)

        self.assertIn("invalid JSON", error)


if __name__ == "__main__":
    unittest.main()
