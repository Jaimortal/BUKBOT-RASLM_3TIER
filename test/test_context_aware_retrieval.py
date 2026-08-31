import sys
import unittest
import os
import json
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "rasa" / "actions"))

from actions import ActionReplyFromJsonHelper, LOCATION_ALIASES  # noqa: E402
from main_router import MainRouterService  # noqa: E402
from response_builder import ResponseBuilder  # noqa: E402
from query_normalizer import QueryNormalizer  # noqa: E402


class ContextAwareRetrievalTests(unittest.TestCase):
    def setUp(self):
        helper = ActionReplyFromJsonHelper(str(ROOT / "rasa" / "actions" / "responses.json"))
        self.router = MainRouterService(helper, LOCATION_ALIASES)

    def route(self, intent, text, entities=None, slots=None):
        message = {
            "text": text,
            "entities": entities or [],
        }
        return self.router.route_with_context(intent, message, text, slots or {})

    def text_of(self, response):
        if isinstance(response, dict):
            return response.get("text", "")
        return str(response)

    def test_response_builder_dedupes_text_and_combines_map_payloads(self):
        builder = ResponseBuilder()
        responses = [
            {
                "text": "Go to the office. Go to the office.",
                "custom": {
                    "mapData": {
                        "locationName": "Office A",
                        "mapId": "main_map",
                        "pins": [{"name": "Office", "coordinates": [1, 2]}],
                        "routes": [{"name": "Route", "points": [[0, 0], [1, 2]]}],
                    }
                },
            },
            {
                "text": "Bring your COR.",
                "custom": {
                    "mapData": {
                        "locationName": "Office A",
                        "mapId": "main_map",
                        "pins": [{"name": "Office", "coordinates": [1, 2]}],
                        "routes": [{"name": "Route", "points": [[0, 0], [1, 2]]}],
                    }
                },
            },
        ]

        merged = builder.build_multi_response(responses)[0]

        self.assertEqual(merged["text"].count("Go to the office."), 1)
        self.assertIn("Bring your COR.", merged["text"])
        self.assertEqual(len(merged["custom"]["mapData"]["pins"]), 1)
        self.assertEqual(len(merged["custom"]["mapData"]["routes"]), 1)

    def test_response_builder_converts_safe_bold_html_to_markdown(self):
        builder = ResponseBuilder()
        response = builder.build_single_response(
            "Bring your <b>validated COR</b> and <strong>school ID</strong>."
        )[0]

        self.assertIn("**validated COR**", response["text"])
        self.assertIn("**school ID**", response["text"])
        self.assertNotIn("<b>", response["text"])
        self.assertNotIn("<strong>", response["text"])

    def test_response_builder_emits_images_and_custom_payload(self):
        class FakeDispatcher:
            def __init__(self):
                self.messages = []

            def utter_message(self, **kwargs):
                self.messages.append(kwargs)

        dispatcher = FakeDispatcher()
        builder = ResponseBuilder()

        builder.emit_response(
            dispatcher,
            {
                "text": "Here is the image.",
                "images": ["/api/images/example"],
                "custom": {"mapData": {"locationName": "Test", "mapId": "main_map"}},
            },
        )

        self.assertEqual(dispatcher.messages[0]["text"], "Here is the image.")
        self.assertIn("json_message", dispatcher.messages[0])
        self.assertEqual(dispatcher.messages[1]["image"], "/api/images/example")

    def test_response_builder_emits_text_parts_as_separate_bubbles(self):
        class FakeDispatcher:
            def __init__(self):
                self.messages = []

            def utter_message(self, **kwargs):
                self.messages.append(kwargs)

        dispatcher = FakeDispatcher()
        builder = ResponseBuilder()

        builder.emit_response(
            dispatcher,
            {
                "text": "First\nSecond",
                "textParts": ["First", "Second"],
                "custom": {"suggestions": [{"label": "Next", "payload": "next"}]},
            },
        )

        self.assertEqual(dispatcher.messages[0]["text"], "First")
        self.assertEqual(dispatcher.messages[1]["text"], "Second")
        self.assertNotIn("json_message", dispatcher.messages[0])
        self.assertIn("json_message", dispatcher.messages[1])

    def test_structured_mapref_subtopic_inherits_map_payload(self):
        response = self.router.data_loader.get_response("student_id_requirements", user_message="student id requirements")

        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertGreaterEqual(len(response["custom"]["mapData"]["pins"]), 3)
        self.assertGreaterEqual(len(response["custom"]["mapData"]["routes"]), 2)

    def test_legacy_mapdata_format_still_returns_custom_payload(self):
        response = self.router.data_loader.get_response("student_id_replacement", user_message="student id replacement")

        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertTrue(response["custom"]["mapData"].get("locationName"))

    def test_hot_reload_detects_new_supper_saiyan_json_file(self):
        tmp_path = ROOT / "rasa" / "actions" / "knowledge" / "services" / "Day11_hot_reload_tmp.json"
        try:
            self.assertFalse(tmp_path.exists())
            self.assertFalse(self.router.refresh_if_changed())
            tmp_path.write_text('{"topics": []}\n', encoding="utf-8")
            self.assertTrue(self.router.refresh_if_changed())
            self.assertFalse(self.router.refresh_if_changed())
            old_mtime = tmp_path.stat().st_mtime
            os.utime(tmp_path, (old_mtime + 2, old_mtime + 2))
            self.assertTrue(self.router.refresh_if_changed())
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
            self.router.refresh_if_changed()

    def test_low_confidence_retrieval_falls_back_without_memory(self):
        response, slots = self.route("ask_general_info", "zzzz unknown capstone-only phrase")

        self.assertIn("rephrasing", self.text_of(response).lower())
        self.assertEqual(slots, {})

    def test_library_id_follow_up_requirements(self):
        first, slots = self.route(
            "ask_location",
            "where can i get library id",
            [{"entity": "document", "value": "library id"}],
        )
        second, second_slots = self.route("ask_requirement", "what are the requirements?", slots=slots)

        self.assertIn("second floor", self.text_of(first))
        self.assertIn("COR", self.text_of(second))
        self.assertEqual(second_slots["conversation_subject"], "library_id_card")
        self.assertEqual(second_slots["conversation_last_topic"], "requirements")

    def test_library_id_follow_up_payment(self):
        _, slots = self.route(
            "ask_location",
            "where can i get library id",
            [{"entity": "document", "value": "library id"}],
        )
        response, response_slots = self.route("ask_fee", "how much?", slots=slots)

        self.assertIn("library ID card", self.text_of(response))
        self.assertEqual(response_slots["conversation_last_intent"], "library_id_card_payment")

    def test_user_transcript_follow_up_wording(self):
        _, slots = self.route(
            "ask_location",
            "where can i get library id",
            [{"entity": "document", "value": "library id"}],
        )
        requirements, requirement_slots = self.route(
            "ask_requirement",
            "and whats the requirements?",
            slots=slots,
        )
        payment, payment_slots = self.route("ask_fee", "how much?", slots=requirement_slots)

        self.assertIn("COR", self.text_of(requirements))
        self.assertNotIn("freshman", self.text_of(requirements).lower())
        self.assertIn("library ID card", self.text_of(payment))
        self.assertNotIn("Admission Test", self.text_of(payment))
        self.assertEqual(payment_slots["conversation_subject"], "library_id_card")

    def test_how_much_without_memory_clarifies(self):
        response, slots = self.route("ask_fee", "how much?")

        self.assertIn("Which fee", self.text_of(response))
        self.assertIn("custom", response)
        self.assertGreaterEqual(len(response["custom"]["suggestions"]), 4)
        self.assertEqual(slots, {})

    def test_student_id_process_uses_structured_oss_data(self):
        response, slots = self.route(
            "ask_process",
            "how to get student id?",
            [{"entity": "document", "value": "student id"}],
        )

        self.assertIn("University Press", self.text_of(response))
        self.assertNotIn("process may change every year", self.text_of(response))
        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertGreaterEqual(len(response["custom"]["mapData"]["pins"]), 3)
        self.assertGreaterEqual(len(response["custom"]["mapData"]["routes"]), 2)
        self.assertEqual(slots["conversation_subject"], "student_id")

    def test_transferred_student_acceptance_routes_to_transferee_admission(self):
        response, slots = self.route(
            "ask_availability",
            "do buksu accept transferred student",
        )

        text = self.text_of(response).lower()
        self.assertIn("accepts transferees", text)
        self.assertNotIn("student id", text)
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_misspelled_transfered_students_routes_to_transferee_admission(self):
        response, slots = self.route(
            "ask_availability",
            "Is buksu accept transfered students",
        )

        text = self.text_of(response).lower()
        self.assertIn("accepts transferees", text)
        self.assertNotIn("borrow books", text)
        self.assertNotIn("inc grade", text)
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_bisaya_transfer_root_routes_to_transferee_admission(self):
        response, slots = self.route(
            "ask_availability",
            "mudawat mo ug mamalhinay nga student sa buksu",
        )

        text = self.text_of(response).lower()
        self.assertIn("transferees", text)
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_bisaya_payment_word_routes_to_student_id_fee(self):
        response, slots = self.route(
            "ask_fee",
            "pila bayad sa student id",
        )

        self.assertIn("id", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "Student_id_fee")

    def test_bisaya_process_word_routes_to_id_validation(self):
        response, slots = self.route(
            "ask_process",
            "unsaon pag validate id",
        )

        self.assertIn("validate", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "id_validation_process")

    def test_day2_phase1_bisaya_where_routes_location(self):
        response, slots = self.route("ask_location", "asa ang library")

        self.assertIn("library", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "location")

    def test_day2_phase1_bisaya_when_routes_enrollment_schedule(self):
        response, slots = self.route("ask_schedule", "kanus-a enrollment")

        self.assertIn("enrollment", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "enrollment_time_schedule")

    def test_day2_phase1_bisaya_who_routes_cot_dean(self):
        response, slots = self.route("ask_general_info", "kinsa dean sa cot")

        self.assertIn("dean", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "Dean_0f_COT")

    def test_day2_phase1_bisaya_requirements_transferee(self):
        response, slots = self.route("ask_requirement", "unsa requirements sa transferee")

        self.assertIn("transferee", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_day2_phase2_gapamalhin_routes_transfer(self):
        response, slots = self.route("ask_availability", "gapamalhin ko gikan laing school")

        self.assertIn("transferees", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_day2_phase2_mobalhin_unta_routes_transfer(self):
        response, slots = self.route("ask_availability", "mobalhin unta ko sa buksu")

        self.assertIn("transferees", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_day2_phase2_dawaton_transfer_student_routes_transfer(self):
        response, slots = self.route("ask_availability", "dawaton ba ang transfer student")

        self.assertIn("transferees", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_day2_phase2_unsay_kinahanglan_mamalhin_routes_transfer(self):
        response, slots = self.route("ask_requirement", "unsay kinahanglan para mamalhin")

        self.assertIn("transferee", self.text_of(response).lower())
        self.assertEqual(slots["conversation_last_intent"], "transferee_admission_requirements")

    def test_day3_phase1_service_and_document_normalization(self):
        cases = [
            ("ask_process", "unsaon pag validate id", "id_validation_process", "validate"),
            ("ask_location", "asa kuha library card", "library_id_card_location", "library id card"),
            ("ask_schedule", "kanus-a cor validation", "cor_validation_day", "cor"),
            ("ask_document", "test permit corrupted", "test_permit_issue", "test permit"),
            ("ask_fee", "medical cert pila", "clinic_medical_certificate_cost", "medical certificate"),
        ]

        for intent, text, expected_intent, expected_text in cases:
            with self.subTest(text=text):
                response, slots = self.route(intent, text)
                self.assertIn(expected_text, self.text_of(response).lower())
                self.assertEqual(slots["conversation_last_intent"], expected_intent)

    def test_day3_phase1_pe_without_uniform_clarifies(self):
        response, slots = self.route("ask_process", "how get pe")

        self.assertIn("Did you mean PE uniform", self.text_of(response))
        self.assertEqual(response["custom"]["suggestions"][0]["label"], "PE uniform")
        self.assertEqual(slots, {})

    def test_day3_phase2_course_acronym_and_bisaya_normalization(self):
        cases = [
            ("do buksu offer ba philo", "buksu_AB-PHILO_program", "philosophy"),
            ("naa moy bsat", "buksu_BSAT_program", "automotive"),
            ("how about bset", "buksu_BSET_program", "electronics"),
            ("masteral courses", "buksu_masters_courses", "masters degree"),
        ]

        for text, expected_intent, expected_text in cases:
            with self.subTest(text=text):
                response, slots = self.route("ask_availability", text)
                self.assertIn(expected_text, self.text_of(response).lower())
                self.assertEqual(slots["conversation_last_intent"], expected_intent)

    def test_day3_phase2_bisaya_generic_courses_show_course_menu(self):
        response, slots = self.route("ask_availability", "unsay courses sa buksu")
        labels = [item["label"] for item in response["custom"]["suggestions"]]

        self.assertIn("Which course list", self.text_of(response))
        self.assertIn("All courses offered", labels)
        self.assertIn("Board courses", labels)
        self.assertIn("Non-board courses", labels)
        self.assertEqual(slots, {})

    def test_structured_item_level_course_slots_group(self):
        response, slots = self.route("ask_availability", "ask slot left for CAS courses?")
        text = self.text_of(response)

        self.assertIn("course slots under CAS", text)
        self.assertIn("Bachelor of Arts in Philosophy: 0 slots", text)
        self.assertIn("Bachelor of Science in Mathematics: 0 slots", text)
        self.assertIn("not accurate", text)
        self.assertEqual(slots["conversation_last_intent"], "course_slots")

    def test_structured_item_level_course_slots_single_child(self):
        response, slots = self.route("ask_availability", "slot left for BA Philo")
        text = self.text_of(response)

        self.assertIn("Bachelor of Arts in Philosophy: 0 slots", text)
        self.assertNotIn("Bachelor of Science in Development Communication", text)
        self.assertEqual(slots["conversation_last_intent"], "course_slots")

    def test_structured_item_level_course_slots_multiple_children(self):
        response, slots = self.route("ask_availability", "Tell me the slots left in BSIT and BSET")
        text = self.text_of(response)

        self.assertIn("Bachelor of Science in Information Technology: 2 slots", text)
        self.assertIn("Bachelor of Science in Electronics Technology: 0 slots", text)
        self.assertNotIn("Bachelor of Science in Food Technology", text)
        self.assertEqual(slots["conversation_last_intent"], "course_slots")

    def test_structured_item_level_course_slots_multiple_groups(self):
        response, slots = self.route("ask_availability", "Available slots for COT and CAS")
        text = self.text_of(response)

        self.assertIn("course slots under CAS", text)
        self.assertIn("current slots available under COT", text)
        self.assertIn("Bachelor of Science in Information Technology: 2 slots", text)
        self.assertIn("Bachelor of Arts in Economics: 0 slots", text)
        self.assertEqual(slots["conversation_last_intent"], "course_slots")

    def test_structured_item_level_course_slots_coa_means_public_administration(self):
        coa, coa_slots = self.route("ask_availability", "slots for COA")
        bpa, bpa_slots = self.route("ask_availability", "slots left for BPA")

        self.assertIn("Bachelor of Public Administration", self.text_of(coa))
        self.assertIn("Bachelor of Public Administration", self.text_of(bpa))
        self.assertNotIn("Agriculture", self.text_of(coa))
        self.assertEqual(coa_slots["conversation_last_intent"], "course_slots")
        self.assertEqual(bpa_slots["conversation_last_intent"], "course_slots")

    def test_day4_phase1_location_wording_and_acronym_guardrails(self):
        cases = [
            ("ask_location", "asa ang cot dean office", "location", "cot dean"),
            ("ask_location", "hain dapit ang registrar", "location", "registrar"),
            ("ask_location", "diin dapit ang registrar", "location", "registrar"),
            ("ask_location", "locate cpag building", "location", "cpag"),
            ("ask_general_info", "who is dean of cot", "Dean_0f_COT", "dean"),
            ("ask_availability", "courses under cot", "course_offer_COT", "course"),
        ]

        for intent, text, expected_intent, expected_text in cases:
            with self.subTest(text=text):
                response, slots = self.route(intent, text)
                self.assertIn(expected_text, self.text_of(response).lower())
                self.assertEqual(slots["conversation_last_intent"], expected_intent)

    def test_day4_phase2_clarification_safety(self):
        student_id, student_id_slots = self.route("ask_general_info", "student id")
        borrow, borrow_slots = self.route("ask_process", "borrow books")
        transfer, transfer_slots = self.route("ask_availability", "transfered students")
        validate, validate_slots = self.route("ask_process", "how validate")

        self.assertNotIn("clarify if you mean student id", self.text_of(student_id).lower())
        self.assertIn("student id", self.text_of(student_id).lower())
        self.assertEqual(student_id_slots["conversation_last_intent"], "student_id_process")

        self.assertIn("borrow", self.text_of(borrow).lower())
        self.assertNotIn("inc", self.text_of(borrow).lower())
        self.assertEqual(borrow_slots["conversation_last_intent"], "library_borrow_books_process")

        self.assertIn("transferees", self.text_of(transfer).lower())
        self.assertNotIn("borrow books", self.text_of(transfer).lower())
        self.assertNotIn("inc grade", self.text_of(transfer).lower())
        self.assertEqual(transfer_slots["conversation_last_intent"], "transferee_admission_requirements")

        labels = [item["label"] for item in validate["custom"]["suggestions"]]
        self.assertIn("Which validation", self.text_of(validate))
        self.assertEqual(labels, ["ID validation", "COR validation"])
        self.assertEqual(validate_slots, {})

    def test_day5_phase1_admin_normalization_rules_load_and_validate(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rules_path = Path(tmpdir) / "normalization_rules.json"
            rules_path.write_text(
                json.dumps({
                    "phrases": {
                        "med cert": "medical certificate clinic certificate",
                        "": "ignored",
                    },
                    "tokens": {
                        "unsaononon": "how process steps",
                        "id": "dangerous override ignored",
                    },
                    "roots": {
                        "paenroll": "enrollment enroll",
                        "course": "dangerous override ignored",
                    },
                    "fuzzy_roots": {
                        "admisssion": "admission application",
                        "pay": "dangerous override ignored",
                    },
                }),
                encoding="utf-8",
            )

            normalizer = QueryNormalizer(rules_path=rules_path)

        self.assertIn("medical certificate", normalizer.expand("med cert"))
        self.assertIn("how process steps", normalizer.expand("unsaononon id validation"))
        self.assertIn("enrollment enroll", normalizer.expand("magpaenroll ko"))
        self.assertIn("admission application", normalizer.expand("admisssion requirements"))
        self.assertNotIn("dangerous override ignored", normalizer.expand("id course pay"))

    def test_day5_phase1_bad_admin_normalization_file_is_ignored(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rules_path = Path(tmpdir) / "normalization_rules.json"
            rules_path.write_text("{bad json", encoding="utf-8")

            normalizer = QueryNormalizer(rules_path=rules_path)

        self.assertIn("transferee transfer", normalizer.expand("transfered student"))

    def test_day1_phase2_admisson_requirements_typo(self):
        response, slots = self.route("ask_requirement", "admisson requirements")

        self.assertIn("Test Permit", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "exam_requirements")

    def test_day1_phase2_enrolment_when_typo(self):
        response, slots = self.route("ask_schedule", "enrolment when")

        self.assertIn("June", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "enrollment_time_schedule")

    def test_day1_phase2_cor_validaton_typo(self):
        response, slots = self.route("ask_process", "cor validaton")

        self.assertIn("COR", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "cor_validation_steps")

    def test_day1_phase2_libary_id_typo(self):
        response, slots = self.route("ask_location", "libary id asa kuha")

        self.assertIn("library ID card", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "library_id_card_location")

    def test_day1_phase2_cources_offered_typo(self):
        response, _ = self.route("ask_availability", "cources offered")

        self.assertIn("Which course list", self.text_of(response))
        self.assertIn("custom", response)

    def test_day1_phase2_sched_typo(self):
        response, slots = self.route("ask_schedule", "enrollment sched")

        self.assertIn("June", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "enrollment_time_schedule")

    def test_student_id_selection_does_not_clarify_itself(self):
        response, slots = self.route("ask_general_info", "student id")

        text = self.text_of(response).lower()
        self.assertNotIn("clarify if you mean student id", text)
        self.assertIn("student id", text)
        self.assertEqual(slots["conversation_last_intent"], "student_id_process")

    def test_student_id_follow_up_payment(self):
        _, slots = self.route(
            "ask_process",
            "how to get student id?",
            [{"entity": "document", "value": "student id"}],
        )
        response, response_slots = self.route("ask_fee", "how much?", slots=slots)

        self.assertIn("free ID", self.text_of(response))
        self.assertEqual(response_slots["conversation_subject"], "student_id")
        self.assertEqual(response_slots["conversation_last_intent"], "Student_id_fee")

    def test_library_borrowing_process_structured(self):
        response, slots = self.route(
            "ask_process",
            "how to borrow books",
            [{"entity": "service", "value": "borrow books"}],
        )

        self.assertIn("library ID card", self.text_of(response))
        self.assertEqual(slots["conversation_subject"], "library_borrowing")

    def test_library_hours_structured(self):
        response, slots = self.route(
            "ask_schedule",
            "library hours",
            [{"entity": "service", "value": "library hours"}],
        )

        self.assertIn("8 AM to 5 PM", self.text_of(response))
        self.assertEqual(slots["conversation_subject"], "library_hours")

    def test_good_moral_certificate_uses_structured_map(self):
        response, slots = self.route(
            "ask_process",
            "how to request good moral certificate",
            [{"entity": "document", "value": "good moral certificate"}],
        )

        self.assertIn("Good Moral Certificate", self.text_of(response))
        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertGreaterEqual(len(response["custom"]["mapData"]["pins"]), 3)
        self.assertEqual(slots["conversation_subject"], "good_moral_certificate")
        self.assertEqual(slots["conversation_last_intent"], "request_good_moral_certificate_oss")

    def test_library_late_book_penalty_does_not_route_to_library_id_payment(self):
        response, slots = self.route("ask_fee", "what is the penalty for late books")

        self.assertIn("unreturned items", self.text_of(response))
        self.assertNotIn("library ID card", self.text_of(response))
        self.assertEqual(slots["conversation_subject"], "library_borrowing")
        self.assertEqual(slots["conversation_last_intent"], "library_late_return_penalty")

    def test_library_borrowing_follow_up_penalty(self):
        _, slots = self.route("ask_process", "how to borrow books")
        response, response_slots = self.route("ask_fee", "what is the penalty?", slots=slots)

        self.assertIn("unreturned items", self.text_of(response))
        self.assertEqual(response_slots["conversation_subject"], "library_borrowing")

    def test_student_id_lost_replacement_direct_and_follow_up(self):
        direct, direct_slots = self.route("ask_process", "how to replace lost student id")
        _, slots = self.route("ask_process", "how to get student id")
        follow_up, follow_up_slots = self.route("ask_process", "replacement?", slots=slots)

        self.assertIn("affidavit of loss", self.text_of(direct).lower())
        self.assertIn("affidavit of loss", self.text_of(follow_up).lower())
        self.assertEqual(direct_slots["conversation_last_intent"], "lost_student_id_replacement_process")
        self.assertEqual(follow_up_slots["conversation_last_intent"], "lost_student_id_replacement_process")

    def test_good_moral_fee_follow_up_keeps_map(self):
        _, slots = self.route("ask_process", "how to request good moral certificate")
        response, response_slots = self.route("ask_fee", "how much?", slots=slots)

        self.assertIn("fifty pesos", self.text_of(response))
        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertEqual(response_slots["conversation_last_intent"], "good_moral_certificate_fee")

    def test_aap_shorthand_routes_to_affirmative_action(self):
        response, slots = self.route("ask_process", "what is aap")

        self.assertIn("Affirmative Action Program", self.text_of(response))
        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertEqual(slots["conversation_subject"], "affirmative_action_program")

    def test_bare_id_question_asks_clarification(self):
        response, slots = self.route("ask_process", "how to get id?")

        self.assertIn("Which ID", self.text_of(response))
        self.assertIn("custom", response)
        self.assertEqual(
            [item["label"] for item in response["custom"]["suggestions"]],
            ["Student ID", "Library ID"],
        )
        self.assertEqual(slots["conversation_subject"], "ambiguous_id")
        self.assertEqual(slots["conversation_last_topic"], "ask_process")

    def test_bare_id_clarification_completes_original_question(self):
        clarification, slots = self.route("ask_process", "how to get id?")
        response, response_slots = self.route("ask_general_info", "student id", slots=slots)

        self.assertIn("University Press", self.text_of(response))
        self.assertIn("custom", response)
        self.assertIn("mapData", response["custom"])
        self.assertGreaterEqual(len(response["custom"]["mapData"]["pins"]), 3)
        self.assertGreaterEqual(len(response["custom"]["mapData"]["routes"]), 2)
        self.assertEqual(response_slots["conversation_subject"], "student_id")

    def test_library_id_memory_answers_bare_id_follow_up(self):
        _, slots = self.route(
            "ask_fee",
            "how much is the library id?",
            [{"entity": "document", "value": "library id"}],
        )
        response, response_slots = self.route("ask_location", "where do i get the id?", slots=slots)

        self.assertIn("second floor", self.text_of(response))
        self.assertEqual(response_slots["conversation_subject"], "library_id_card")

    def test_explicit_location_overrides_library_id_memory(self):
        old_slots = {
            "conversation_subject": "library_id_card",
            "conversation_subject_type": "document",
            "conversation_category": "library_info",
            "conversation_last_topic": "payment",
            "conversation_last_intent": "library_id_card_payment",
            "conversation_turns_remaining": 2,
        }
        response, slots = self.route(
            "ask_location",
            "where is the library?",
            [{"entity": "location_name", "value": "library"}],
            old_slots,
        )

        self.assertIn("Library is located", self.text_of(response))
        self.assertEqual(slots["conversation_subject"], "Library Building")
        self.assertEqual(slots["conversation_subject_type"], "location")

    def test_generic_requirement_without_memory_clarifies(self):
        response, slots = self.route("ask_requirement", "what are the requirements?")

        self.assertIn("Which requirements", self.text_of(response))
        self.assertIn("custom", response)
        self.assertGreaterEqual(len(response["custom"]["suggestions"]), 5)
        self.assertEqual(slots, {})

    def test_unanswered_generic_turn_decays_memory(self):
        old_slots = {
            "conversation_subject": "library_id_card",
            "conversation_subject_type": "document",
            "conversation_category": "library_info",
            "conversation_last_topic": "payment",
            "conversation_last_intent": "library_id_card_payment",
            "conversation_turns_remaining": 1,
        }
        response, slots = self.route("ask_schedule", "when?", slots=old_slots)

        self.assertIn("Which schedule", self.text_of(response))
        self.assertIn("custom", response)
        self.assertGreaterEqual(len(response["custom"]["suggestions"]), 4)
        self.assertEqual(slots["conversation_turns_remaining"], 0)
        self.assertIsNone(slots["conversation_subject"])

    def test_inc_grade_follow_up_to_form(self):
        response, slots = self.route(
            "ask_process",
            "how to complete inc grade?",
            [{"entity": "topic", "value": "inc grade"}],
        )
        follow_up, follow_up_slots = self.route("ask_document", "where can i get the form?", slots=slots)

        self.assertIn("INC", self.text_of(response))
        self.assertIn("downloadable-forms", self.text_of(follow_up))
        self.assertEqual(follow_up_slots["conversation_subject"], "inc_grade")

    def test_fda_follow_up_solution(self):
        response, slots = self.route("ask_general_info", "what is fda?")
        follow_up, follow_up_slots = self.route("ask_process", "what should i do?", slots=slots)

        self.assertIn("Failure Due to Absences", self.text_of(response))
        self.assertIn("instructor", self.text_of(follow_up).lower())
        self.assertEqual(follow_up_slots["conversation_subject"], "attendance_fda")

    def test_deans_list_honors_requirements(self):
        response, slots = self.route("ask_requirement", "deans list requirements")

        self.assertIn("General Weighted Average", self.text_of(response))
        self.assertEqual(slots["conversation_subject"], "academic_honors")

    def test_graduation_application_does_not_route_to_admission_application(self):
        response, slots = self.route(
            "ask_process",
            "tell me how could i apply for graduation application",
        )

        self.assertIn("Application for Graduation", self.text_of(response))
        self.assertNotIn("College Admission Test", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "graduation_application_process")

    def test_enrollment_structured_routes(self):
        process, process_slots = self.route("ask_process", "online enrollment steps")
        documents, document_slots = self.route("ask_requirement", "enrollment documents")
        fees, fee_slots = self.route("ask_fee", "student fees")
        late, late_slots = self.route("ask_schedule", "late enrollment")

        self.assertIn("Apply Enrollment", self.text_of(process))
        self.assertIn("birth certificate", self.text_of(documents).lower())
        self.assertIn("miscellaneous fees", self.text_of(fees))
        self.assertIn("first week of classes", self.text_of(late))
        self.assertEqual(process_slots["conversation_last_intent"], "online_enrollment_steps")
        self.assertEqual(document_slots["conversation_last_intent"], "enrollment_documents")
        self.assertEqual(fee_slots["conversation_last_intent"], "student_fees")
        self.assertEqual(late_slots["conversation_last_intent"], "late_enrollment")

    def test_admission_cat_core_routes(self):
        requirements, requirement_slots = self.route("ask_requirement", "requirements for CAT")
        process, process_slots = self.route("ask_process", "how to apply for admission")
        fee, fee_slots = self.route("ask_fee", "cat fees")
        definition, definition_slots = self.route("ask_general_info", "what is buksu cat")

        self.assertIn("Test Permit", self.text_of(requirements))
        self.assertIn("College Admission Test", self.text_of(process))
        self.assertIn("FREE", self.text_of(fee))
        self.assertIn("Bukidnon State University College Admission Test", self.text_of(definition))
        self.assertEqual(requirement_slots["conversation_last_intent"], "exam_requirements")
        self.assertEqual(process_slots["conversation_last_intent"], "take_exam")
        self.assertEqual(fee_slots["conversation_last_intent"], "exam_fees")
        self.assertEqual(definition_slots["conversation_last_intent"], "buksu_cat_definition")

    def test_admission_specific_requirements(self):
        freshman, freshman_slots = self.route("ask_requirement", "freshman admission requirements")
        masters, masters_slots = self.route("ask_requirement", "masters admission requirements")
        gpat, gpat_slots = self.route("ask_general_info", "what is GPAT")

        self.assertIn("Gmail account", self.text_of(freshman))
        self.assertIn("Honorable Dismissal", self.text_of(masters))
        self.assertIn("Graduate Program Admission Test", self.text_of(gpat))
        self.assertEqual(freshman_slots["conversation_last_intent"], "freshman_admission_requirements")
        self.assertEqual(masters_slots["conversation_last_intent"], "masters_degree_admission_requirements")
        self.assertEqual(gpat_slots["conversation_last_intent"], "gpat_admission_requirements")

    def test_admission_contact_and_account_assets(self):
        contact, contact_slots = self.route("ask_contact", "admission contact")
        password, password_slots = self.route("ask_process", "change admission password")
        account, account_slots = self.route("ask_process", "find institutional account")

        self.assertIn("Admission and Testing Unit", self.text_of(contact))
        self.assertIn("mapData", contact["custom"])
        self.assertTrue(contact.get("images"))
        self.assertTrue(password.get("images"))
        self.assertTrue(account.get("images"))
        self.assertEqual(contact_slots["conversation_last_intent"], "buksu_admission_contact")
        self.assertEqual(password_slots["conversation_last_intent"], "Change_Pass_admission")
        self.assertEqual(account_slots["conversation_last_intent"], "Find_Institutional_Account")

    def test_admission_office_hours_and_aap(self):
        hours, hour_slots = self.route("ask_schedule", "buksu office hours")
        aap, aap_slots = self.route("ask_process", "failed buksu cat affirmative action")

        self.assertIn("8:00 AM", self.text_of(hours))
        self.assertIn("Affirmative Action Program", self.text_of(aap))
        self.assertIn("mapData", aap["custom"])
        self.assertEqual(hour_slots["conversation_last_intent"], "all_office_schedule")
        self.assertEqual(aap_slots["conversation_subject"], "affirmative_action_program")
        self.assertEqual(aap_slots["conversation_last_intent"], "affirmative_action")

    def test_ict_and_department_routes(self):
        wifi, wifi_slots = self.route("ask_process", "how to get wifi access")
        colleges, college_slots = self.route("ask_general_info", "what colleges are in buksu")
        cas, cas_slots = self.route("ask_availability", "courses in CAS")

        self.assertIn("Finance Building", self.text_of(wifi))
        self.assertIn("mapData", wifi["custom"])
        self.assertIn("College of Arts and Sciences", self.text_of(colleges))
        self.assertIn("Bachelor of Science in Biology", self.text_of(cas))
        self.assertEqual(wifi_slots["conversation_last_intent"], "get_wifi_access")
        self.assertEqual(college_slots["conversation_last_intent"], "buksu_academic_colleges")
        self.assertEqual(cas_slots["conversation_last_intent"], "course_offer_CAS")

    def test_courses_catalog_and_policy_routes(self):
        bsit, bsit_slots = self.route("ask_general_info", "what is bsit")
        bsit_available, bsit_available_slots = self.route("ask_availability", "does buksu have IT")
        offered, offered_slots = self.route("ask_availability", "all courses are offered")
        masters, masters_slots = self.route("ask_availability", "does buksu have masters")
        board, board_slots = self.route("ask_general_info", "what is board course")
        shifting, shifting_slots = self.route("ask_process", "can i shift course")
        prerequisite, prerequisite_slots = self.route("ask_general_info", "what is prerequisite")
        internship, internship_slots = self.route("ask_requirement", "internship requirement")

        self.assertIn("Information Technology", self.text_of(bsit))
        self.assertIn("Information Technology", self.text_of(bsit_available))
        self.assertIn("college programs", self.text_of(offered))
        self.assertIn("Masters", self.text_of(masters))
        self.assertIn("national licensure examination", self.text_of(board))
        self.assertIn("course shifting", self.text_of(shifting).lower())
        self.assertIn("Prerequisite subjects", self.text_of(prerequisite))
        self.assertIn("internship", self.text_of(internship).lower())
        self.assertEqual(bsit_slots["conversation_last_intent"], "buksu_IT")
        self.assertEqual(bsit_available_slots["conversation_last_intent"], "buksu_bsit_program")
        self.assertEqual(offered_slots["conversation_last_intent"], "buksu_courses_offered")
        self.assertEqual(masters_slots["conversation_last_intent"], "buksu_masters_courses")
        self.assertEqual(board_slots["conversation_last_intent"], "meaning_of_board_course")
        self.assertEqual(shifting_slots["conversation_last_intent"], "course_shifting")
        self.assertEqual(prerequisite_slots["conversation_last_intent"], "prerequisite_subjects_purpose")
        self.assertEqual(internship_slots["conversation_last_intent"], "internship_requirement")

    def test_college_course_routes_do_not_override_locations(self):
        cas_courses, cas_slots = self.route("ask_availability", "what courses in CAS")
        cob_courses, cob_slots = self.route("ask_availability", "courses in COB")
        cot_courses, cot_slots = self.route("ask_availability", "courses in COT")
        con_courses, con_slots = self.route("ask_availability", "courses in CON")
        coe_courses, coe_slots = self.route("ask_availability", "courses in COE")
        cpag_courses, cpag_slots = self.route("ask_availability", "courses in CPAG")
        law_courses, law_slots = self.route("ask_availability", "courses in LAW")
        coa_courses, coa_slots = self.route("ask_availability", "courses in COA")
        cas_location, cas_location_slots = self.route(
            "ask_location",
            "where is CAS",
        )
        cot_location, cot_location_slots = self.route("ask_location", "where is COT")

        self.assertIn("College of Arts and Sciences", self.text_of(cas_courses))
        self.assertIn("College of Business", self.text_of(cob_courses))
        self.assertIn("College of Technology", self.text_of(cot_courses))
        self.assertIn("College of Nursing", self.text_of(con_courses))
        self.assertIn("College of Education", self.text_of(coe_courses))
        self.assertIn("Public Administration", self.text_of(cpag_courses))
        self.assertIn("Juris Doctor", self.text_of(law_courses))
        self.assertIn("Public Administration", self.text_of(coa_courses))
        self.assertIn("CAS", self.text_of(cas_location))
        self.assertIn("COT", self.text_of(cot_location))
        self.assertEqual(cas_slots["conversation_last_intent"], "course_offer_CAS")
        self.assertEqual(cob_slots["conversation_last_intent"], "course_offer_COB")
        self.assertEqual(cot_slots["conversation_last_intent"], "course_offer_COT")
        self.assertEqual(con_slots["conversation_last_intent"], "course_offer_CON")
        self.assertEqual(coe_slots["conversation_last_intent"], "course_offer_COE")
        self.assertEqual(cpag_slots["conversation_last_intent"], "course_offer_COA")
        self.assertEqual(law_slots["conversation_last_intent"], "course_offer_LAW")
        self.assertEqual(coa_slots["conversation_last_intent"], "course_offer_COA")
        self.assertEqual(cas_location_slots.get("conversation_subject_type"), "location")
        self.assertEqual(cot_location_slots.get("conversation_subject_type"), "location")

    def test_clinic_and_dental_routes(self):
        clinic, clinic_slots = self.route("ask_general_info", "where is the clinic")
        services, service_slots = self.route("ask_availability", "medical dental services")
        dental, dental_slots = self.route("ask_requirement", "dental consultation requirements")
        dental_process, dental_process_slots = self.route("ask_process", "how to request dental consultation")
        dental_follow_up, dental_follow_up_slots = self.route(
            "ask_requirement",
            "what are the requirements?",
            slots=dental_process_slots,
        )
        oral_requirement, oral_requirement_slots = self.route(
            "ask_requirement",
            "dental oral examination requirements",
        )

        self.assertIn("Health Services Building", self.text_of(clinic))
        self.assertIn("mapData", clinic["custom"])
        self.assertIn("clinic services", self.text_of(services).lower())
        self.assertIn("choiceGroups", services["custom"])
        self.assertIn("Medical Services", [group["title"] for group in services["custom"]["choiceGroups"]])
        self.assertIn("Dental Services", [group["title"] for group in services["custom"]["choiceGroups"]])
        self.assertIn("DENTAL CONSULTATION", self.text_of(dental))
        self.assertIn("consult with the dentist", self.text_of(dental_process))
        self.assertIn("Directly ask the dental clinic", self.text_of(dental_follow_up))
        self.assertIn("ORAL EXAMINATION", self.text_of(oral_requirement))
        self.assertEqual(clinic_slots["conversation_last_intent"], "buksu_med_loc")
        self.assertEqual(service_slots, {})
        self.assertEqual(dental_slots["conversation_last_intent"], "requirement_for_dental_consultation")
        self.assertEqual(dental_process_slots["conversation_subject"], "dental_consultation")
        self.assertEqual(dental_follow_up_slots["conversation_last_intent"], "dental_clinic_direct_ask")
        self.assertEqual(oral_requirement_slots["conversation_subject"], "dental_oral_examination")

    def test_staff_admin_and_classroom_routes(self):
        dean, dean_slots = self.route("ask_general_info", "who is the dean of COT")
        head, head_slots = self.route("ask_general_info", "who is head of BSIT")
        vp, vp_slots = self.route("ask_general_info", "who are the vice presidents of buksu")
        academic_vp, academic_vp_slots = self.route("ask_general_info", "vice president for academic affairs")
        secretary, secretary_slots = self.route("ask_general_info", "who is the board secretary")
        phone, phone_slots = self.route("ask_general_info", "can i use phone in class")
        eating, eating_slots = self.route("ask_general_info", "can i eat in classroom")

        self.assertIn("Dr. Marilou", self.text_of(dean))
        self.assertIn("Department Head", self.text_of(head))
        self.assertIn("Vice President", self.text_of(vp))
        self.assertIn("Hazel Jean", self.text_of(academic_vp))
        self.assertIn("Board Secretary", self.text_of(secretary))
        self.assertIn("mobile phones", self.text_of(phone))
        self.assertIn("Eating inside classrooms", self.text_of(eating))
        self.assertEqual(dean_slots["conversation_last_intent"], "Dean_0f_COT")
        self.assertEqual(head_slots["conversation_last_intent"], "Head_of_BSIT")
        self.assertEqual(vp_slots["conversation_last_intent"], "Buksu_vice_pres")
        self.assertEqual(academic_vp_slots["conversation_last_intent"], "vicepres_academic_affairs")
        self.assertEqual(secretary_slots["conversation_last_intent"], "buksu_secretary")
        self.assertEqual(phone_slots["conversation_last_intent"], "phone_use_in_class")
        self.assertEqual(eating_slots["conversation_last_intent"], "eating_in_classroom")

    def test_all_dean_and_head_role_routes(self):
        dean_cases = {
            "who is the dean of COT": "Dean_0f_COT",
            "who is the dean of COB": "Dean_0f_COB",
            "who is the dean of CAS": "Dean_0f_CAS",
            "who is the dean of CPAG": "Dean_0f_CPAG",
            "who is the dean of CON": "Dean_0f_CON",
            "who is the dean of COE": "Dean_0f_COE",
            "who is the dean of LAW": "Dean_0f_LAW",
        }
        head_cases = {
            "who is the head of BSIT": "Head_of_BSIT",
            "who is the head of COB": "Head_of_COB",
            "who is the head of CAS": "Head_of_CAS",
            "who is the head of CPAG": "Head_of_CPAG",
            "who is the head of CON": "Head_of_CON",
            "who is the head of COE": "Head_of_COE",
            "who is the head of LAW": "Head_of_LAW",
        }

        for question, expected_intent in {**dean_cases, **head_cases}.items():
            with self.subTest(question=question):
                response, slots = self.route("ask_general_info", question)
                self.assertTrue(self.text_of(response).strip())
                self.assertEqual(slots["conversation_last_intent"], expected_intent)

    def test_dormitory_routes(self):
        general, general_slots = self.route("ask_general_info", "does buksu have dormitory")
        count, count_slots = self.route("ask_general_info", "how many dormitories does buksu have")
        male, male_slots = self.route("ask_location", "where is mahogany dorm")
        female, female_slots = self.route("ask_location", "where is rubia dorm")
        follow_up_count, follow_up_count_slots = self.route("ask_general_info", "how many?", slots=general_slots)
        follow_up_availability, follow_up_availability_slots = self.route(
            "ask_availability",
            "available slots?",
            slots=follow_up_count_slots,
        )

        self.assertIn("on-campus dormitory", self.text_of(general))
        self.assertIn("3 existing dormitories", self.text_of(count))
        self.assertIn("Mahogany Dorm", self.text_of(male))
        self.assertIn("Rubia Dormitory", self.text_of(female))
        self.assertIn("3 existing dormitories", self.text_of(follow_up_count))
        self.assertIn("limited dormitory slots", self.text_of(follow_up_availability))
        self.assertNotIn("magic", self.text_of(male).lower())
        self.assertEqual(general_slots["conversation_last_intent"], "campus_dormitories")
        self.assertEqual(count_slots["conversation_last_intent"], "number_of_dormitories")
        self.assertEqual(male_slots["conversation_last_intent"], "male_dorm")
        self.assertEqual(female_slots["conversation_last_intent"], "female_dorm")
        self.assertEqual(follow_up_count_slots["conversation_last_intent"], "number_of_dormitories")
        self.assertEqual(follow_up_availability_slots["conversation_last_intent"], "buksu_dormitory_information")

    def test_university_info_routes(self):
        about, about_slots = self.route("ask_general_info", "what is buksu")
        mission, mission_slots = self.route("ask_general_info", "buksu mission")
        vision, vision_slots = self.route("ask_general_info", "what is buksu vision")
        president, president_slots = self.route("ask_general_info", "who is the president of buksu")
        first_president, first_president_slots = self.route("ask_general_info", "who was the first president of buksu")
        presidents_list, presidents_list_slots = self.route("ask_general_info", "former presidents of buksu")
        rank, rank_slots = self.route("ask_general_info", "current rank of buksu")
        founded, founded_slots = self.route("ask_general_info", "when was buksu founded")

        self.assertIn("Bukidnon State University", self.text_of(about))
        self.assertIn("mission of Bukidnon State University", self.text_of(mission))
        self.assertIn("vision of Bukidnon State University", self.text_of(vision))
        self.assertIn("Dr. Joy", self.text_of(president))
        self.assertIn("Dr. Victor", self.text_of(first_president))
        self.assertIn("Dr. Joy", self.text_of(presidents_list))
        self.assertTrue(president.get("images"))
        self.assertIn("ranking", self.text_of(rank).lower())
        self.assertIn("1924", self.text_of(founded))
        self.assertEqual(about_slots["conversation_last_intent"], "about_buksu")
        self.assertEqual(mission_slots["conversation_last_intent"], "buksu_mission")
        self.assertEqual(vision_slots["conversation_last_intent"], "buksu_vision")
        self.assertEqual(president_slots["conversation_last_intent"], "buksu_president")
        self.assertEqual(first_president_slots["conversation_last_intent"], "Pres_thetime_university")
        self.assertEqual(presidents_list_slots["conversation_last_intent"], "buksu_presidents_list")
        self.assertEqual(rank_slots["conversation_last_intent"], "current_rank")
        self.assertEqual(founded_slots["conversation_last_intent"], "founding")

    def test_day_7_local_retrieval_paraphrases(self):
        graduation, graduation_slots = self.route(
            "ask_process",
            "tell me how could i apply for graduation application",
        )
        admission, admission_slots = self.route("ask_requirement", "what do i need for admission test")
        student_id, student_id_slots = self.route("ask_process", "where can i process my school id")
        masteral, masteral_slots = self.route("ask_availability", "do they offer masteral")
        clearance, clearance_slots = self.route("ask_requirement", "how can i get clearance for graduation")

        self.assertIn("Application for Graduation", self.text_of(graduation))
        self.assertIn("Test Permit", self.text_of(admission))
        self.assertIn("University Press", self.text_of(student_id))
        self.assertIn("Masters Degree", self.text_of(masteral))
        self.assertIn("University Clearance Form", self.text_of(clearance))
        self.assertEqual(graduation_slots["conversation_last_intent"], "graduation_application_process")
        self.assertEqual(admission_slots["conversation_last_intent"], "exam_requirements")
        self.assertEqual(student_id_slots["conversation_last_intent"], "student_id_process")
        self.assertEqual(masteral_slots["conversation_last_intent"], "buksu_masters_courses")
        self.assertEqual(clearance_slots["conversation_last_intent"], "graduating_clearance_requirements")

    def test_day_7_retrieval_handles_paraphrase_without_direct_rule(self):
        response, slots = self.route("ask_requirement", "what papers for oral exam")

        self.assertIn("DENTAL ORAL EXAMINATION", self.text_of(response))
        self.assertEqual(slots["conversation_subject"], "dental_oral_examination")
        self.assertEqual(slots["conversation_last_intent"], "dental_oral_examination_requirement")

    def test_day_7_retrieval_does_not_override_explicit_location(self):
        response, slots = self.route("ask_location", "where is CAS")

        self.assertIn("CAS", self.text_of(response))
        self.assertEqual(slots.get("conversation_subject_type"), "location")
        self.assertEqual(slots.get("conversation_last_intent"), "location")

    def test_reported_enrollment_process_does_not_route_to_late_enrollment(self):
        response, slots = self.route("ask_process", "what is the process of enrollment")

        self.assertIn("Pre-enrolment Orientation", self.text_of(response))
        self.assertNotIn("Late enrollment", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "mixed_enrollment_process")

    def test_reported_late_enrollment_question_routes_directly(self):
        response, slots = self.route("ask_process", "am i allowed to enroll even if its late?")

        self.assertIn("Late enrollment", self.text_of(response))
        self.assertIn("first week of classes", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "late_enrollment")

    def test_reported_master_courses_short_query_answers_directly(self):
        response, slots = self.route("ask_general_info", "master courses")

        self.assertIn("Masters Degree", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "buksu_masters_courses")

    def test_reported_bsit_head_is_specific(self):
        response, slots = self.route("ask_general_info", "kinsa ang head sa BSIT?")

        self.assertIn("Dr. Sales G. Aribe Jr.", self.text_of(response))
        self.assertNotIn("Electronics Technology Department", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "Head_of_BSIT")

    def test_reported_dean_of_program_routes_to_parent_college_dean(self):
        bsit_dean, bsit_slots = self.route("ask_general_info", "whos dean of bsit")
        philosophy_dean, philosophy_dean_slots = self.route(
            "ask_general_info",
            "whos dean bachelor of arts in philosophy",
        )
        philosophy_head, philosophy_head_slots = self.route(
            "ask_general_info",
            "whos head bachelor of arts in philosophy",
        )

        self.assertIn("Dr. Marilou", self.text_of(bsit_dean))
        self.assertNotIn("Dr. Sales G. Aribe Jr.", self.text_of(bsit_dean))
        self.assertIn("Dean", self.text_of(philosophy_dean))
        self.assertIn("Dr. Maribel", self.text_of(philosophy_dean))
        self.assertIn("Philosophy", self.text_of(philosophy_head))
        self.assertNotIn("engages with fundamental questions", self.text_of(philosophy_head))
        self.assertEqual(bsit_slots["conversation_last_intent"], "Dean_0f_COT")
        self.assertEqual(philosophy_dean_slots["conversation_last_intent"], "Dean_0f_CAS")
        self.assertEqual(philosophy_head_slots["conversation_last_intent"], "Head_of_CAS")

    def test_cot_head_still_returns_all_cot_department_heads(self):
        response, slots = self.route("ask_general_info", "who is the head of COT?")

        self.assertIn("Information Technology Department", self.text_of(response))
        self.assertIn("Electronics Technology Department", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "Head_of_COT")

    def test_reported_enrollment_time_uses_schedule_answer(self):
        response, slots = self.route("ask_schedule", "enrollment time")

        self.assertIn("no exact fixed enrollment time", self.text_of(response).lower())
        self.assertIn("BSURegistrar", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "enrollment_time_schedule")

    def test_reported_freshman_enrollment_process(self):
        response, slots = self.route("ask_process", "how to enroll freshman")

        self.assertIn("freshman enrollment", self.text_of(response).lower())
        self.assertIn("Pre-enrolment Orientation", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "freshman_enrollment_process")

    def test_reported_course_generic_and_typo_routes(self):
        choices, choice_slots = self.route("ask_availability", "courses")
        offered_choices, offered_choice_slots = self.route("ask_availability", "courses offerd by buksu?")
        offered, offered_slots = self.route("ask_availability", "all courses offerd by buksu?")
        bsap, bsap_slots = self.route("ask_availability", "do buksu offer BSAP?")

        self.assertIn("Which course list", self.text_of(choices))
        self.assertIn("custom", choices)
        labels = [item["label"] for item in choices["custom"]["suggestions"]]
        self.assertIn("All courses offered", labels)
        self.assertIn("Board courses", labels)
        self.assertIn("Non-board courses", labels)
        self.assertIn("Which course list", self.text_of(offered_choices))
        self.assertIn("custom", offered_choices)
        self.assertIn("undergraduate courses offered", self.text_of(offered).lower())
        self.assertIn("Bachelor of Science in Information Technology", self.text_of(offered))
        self.assertIn("Bachelor of Arts in Philosophy", self.text_of(bsap))
        self.assertEqual(choice_slots, {})
        self.assertEqual(offered_choice_slots, {})
        self.assertEqual(offered_slots["conversation_last_intent"], "buksu_courses_offered")
        self.assertEqual(bsap_slots["conversation_last_intent"], "buksu_AB-PHILO_program")

    def test_course_offer_how_about_follow_up_uses_availability_answer(self):
        first, slots = self.route("ask_availability", "do buksu offer bsat")
        second, second_slots = self.route("ask_general_info", "how about bset", slots=slots)

        self.assertIn("Bachelor of Science in Automotive Technology", self.text_of(first))
        self.assertIn("Yes, BukSU offers a Bachelor of Science in Electronics Technology", self.text_of(second))
        self.assertEqual(slots["conversation_last_intent"], "buksu_BSAT_program")
        self.assertEqual(second_slots["conversation_last_intent"], "buksu_BSET_program")

    def test_course_acronym_availability_routes(self):
        cases = {
            "do buksu offer IT?": "buksu_bsit_program",
            "do buksu offer BA philo": "buksu_AB-PHILO_program",
            "does BukSU offer BSFT": "buksu_BSFT_program",
            "does BukSU offer BSET": "buksu_BSET_program",
            "do you offer BSEMC": "buksu_BSEMC-DAT_program",
            "does BukSU offer BS Biology": "buksu_BS-BIO_program",
            "does BukSU offer AB Social Science": "buksu_AB SocSci_program",
            "does BukSU offer BSED Filipino": "buksu_BSED-FIL_program",
            "does BukSU offer BSED Math": "buksu_BSED-MATH_program",
            "does BukSU offer BEED": "buksu_BEED_program",
            "does BukSU offer BSN": "buksu_BSN_program",
            "does BukSU offer BS Environmental Science": "buksu_BS-ES_program",
            "does BukSU offer AB Sociology": "buksu_AB-SOCIO_program",
            "does BukSU offer AB English": "buksu_AB-ENG_program",
            "does BukSU offer BPED": "buksu_BPED_program",
            "does BukSU offer BS ComDev": "buksu_BS COMDEV_program",
            "does BukSU offer AB Economics": "buksu_AB-ECON_program",
            "does BukSU offer BECED": "buksu_BECED_program",
            "does BukSU offer BSDC": "buksu_BSDC_program",
            "does BukSU offer BSHM": "buksu_BSHM_program",
            "does BukSU offer BSAT": "buksu_BSAT_program",
            "does BukSU offer BPA": "buksu_BPA_program",
            "does BukSU offer BS Math": "buksu_BS-MATH_program",
            "does BukSU offer BSA": "buksu_BSA_program",
            "does BukSU offer BSBA FM": "buksu_BSBA-FM_program",
            "does BukSU offer BSED English": "buksu_BSED-ENG_program",
            "does BukSU offer BSED Science": "buksu_BSED-SCI_program",
            "does BukSU offer BSED Social Studies": "buksu_BSED-SOCSTUD_program",
            "does BukSU offer MPA": "buksu_mpa_program",
        }

        for question, expected_intent in cases.items():
            with self.subTest(question=question):
                response, slots = self.route("ask_availability", question)
                self.assertIn("BukSU", self.text_of(response))
                self.assertEqual(slots["conversation_last_intent"], expected_intent)

    def test_course_acronym_general_info_routes(self):
        philo, philo_slots = self.route("ask_general_info", "what is BA philo")
        bsa, bsa_slots = self.route("ask_general_info", "what is BSA")
        it_pronoun, _ = self.route("ask_general_info", "what is it")

        self.assertIn("fundamental questions", self.text_of(philo))
        self.assertIn("financial reporting", self.text_of(bsa))
        self.assertNotIn("Information Technology", self.text_of(it_pronoun))
        self.assertEqual(philo_slots["conversation_last_intent"], "buksu_AB_PHILO")
        self.assertEqual(bsa_slots["conversation_last_intent"], "buksu_BSA")

    def test_vague_admission_when_returns_clickable_suggestions(self):
        response, slots = self.route("ask_schedule", "when is admission?")

        self.assertIn("What admission", self.text_of(response))
        self.assertIn("custom", response)
        self.assertEqual(len(response["custom"]["suggestions"]), 3)
        self.assertEqual(slots, {})

    def test_validation_ambiguity_and_id_validation_routes(self):
        ambiguous, ambiguous_slots = self.route("ask_process", "how to validate")
        ambiguous_requirement, _ = self.route("ask_requirement", "how validate?")
        ambiguous_fallback, _ = self.route("nlu_fallback", "how validate?")
        process, process_slots = self.route("ask_process", "how to validate ID")
        schedule, schedule_slots = self.route("ask_schedule", "when is ID validation")
        cor, cor_slots = self.route("ask_process", "how to validate COR")

        self.assertIn("Which validation", self.text_of(ambiguous))
        self.assertIn("Which validation", self.text_of(ambiguous_requirement))
        self.assertIn("Which validation", self.text_of(ambiguous_fallback))
        self.assertIn("custom", ambiguous)
        self.assertEqual(
            [item["label"] for item in ambiguous["custom"]["suggestions"]],
            ["ID validation", "COR validation"],
        )
        self.assertIn("OVPCASSS", self.text_of(process))
        self.assertIn("validated COR", self.text_of(process))
        self.assertIn("August to September", self.text_of(schedule))
        self.assertIn("validate your COR", self.text_of(cor))
        self.assertEqual(ambiguous_slots, {})
        self.assertEqual(process_slots["conversation_last_intent"], "id_validation_process")
        self.assertEqual(schedule_slots["conversation_last_intent"], "id_validation_day")
        self.assertEqual(cor_slots["conversation_last_intent"], "cor_validation_steps")

    def test_cor_validation_schedule_has_button_and_follow_up_memory(self):
        schedule, slots = self.route("ask_schedule", "when is COR validation")
        follow_up, follow_up_slots = self.route("ask_process", "how to validate", slots=slots)

        self.assertIn("right after your enrollment", self.text_of(schedule))
        self.assertIn("custom", schedule)
        self.assertEqual(schedule["custom"]["suggestions"][0]["label"], "COR validation process")
        self.assertIn("Window 7", self.text_of(follow_up))
        self.assertEqual(slots["conversation_subject"], "cor_validation")
        self.assertEqual(slots["conversation_last_intent"], "cor_validation_day")
        self.assertEqual(follow_up_slots["conversation_last_intent"], "cor_validation_steps")

    def test_services_and_bot_capability_menus(self):
        generic, generic_slots = self.route("ask_general_info", "services")
        buksu, buksu_slots = self.route("ask_process", "what are the student services")
        bot, bot_slots = self.route("ask_general_info", "what can you provide")

        self.assertIn("Which services", self.text_of(generic))
        self.assertEqual([item["label"] for item in generic["custom"]["suggestions"]], ["BukSU student services", "Chatbot help menu"])
        self.assertIn("BukSU services", self.text_of(buksu))
        self.assertIn("choiceGroups", buksu["custom"])
        self.assertIn("IDs and Validation", [group["title"] for group in buksu["custom"]["choiceGroups"]])
        self.assertIn("This is all I can provide", self.text_of(bot))
        self.assertIn("Academic Policy", [group["title"] for group in bot["custom"]["choiceGroups"]])
        self.assertEqual(generic_slots, {})
        self.assertEqual(buksu_slots, {})
        self.assertEqual(bot_slots, {})

    def test_chatbot_help_menu_payloads_route_to_menus(self):
        bot, _ = self.route("ask_general_info", "chatbot help menu")
        groups = {group["title"]: [item["label"] for item in group["items"]] for group in bot["custom"]["choiceGroups"]}

        self.assertIn("Health and Campus Life", groups)
        self.assertIn("Clinic services", groups["Health and Campus Life"])
        self.assertIn("Dormitory", groups["Health and Campus Life"])
        self.assertIn("Classroom policy", groups["Health and Campus Life"])
        self.assertNotIn("University and Admin", groups)
        self.assertNotIn("Course categories", groups["Courses and Departments"])
        self.assertIn("Office hours", groups["Student Services and ICT"])
        self.assertIn("What is probation", groups["Academic Policy"])
        self.assertNotIn("Academic standing", groups["Academic Policy"])

        clinic, clinic_slots = self.route("ask_general_info", "clinic services")
        dental, dental_slots = self.route("ask_general_info", "dental services")
        dormitory, dormitory_slots = self.route("ask_general_info", "dormitory services")
        classroom, classroom_slots = self.route("ask_general_info", "classroom policy")

        self.assertIn("clinic services", self.text_of(clinic).lower())
        self.assertIn("choiceGroups", clinic["custom"])
        self.assertIn("Medical Services", [group["title"] for group in clinic["custom"]["choiceGroups"]])
        self.assertIn("Dental Services", [group["title"] for group in clinic["custom"]["choiceGroups"]])
        self.assertEqual(clinic_slots, {})
        self.assertIn("Here are the dental services", self.text_of(dental))
        self.assertIn("choiceGroups", dental["custom"])
        self.assertEqual(dental_slots["conversation_last_intent"], "dental_services_menu")
        self.assertIn("dormitory topics", self.text_of(dormitory).lower())
        self.assertIn("Dormitory Locations", [group["title"] for group in dormitory["custom"]["choiceGroups"]])
        self.assertEqual(dormitory_slots, {})
        self.assertIn("classroom policies", self.text_of(classroom).lower())
        self.assertIn("Phone use in class", [item["label"] for item in classroom["custom"]["choiceGroups"][0]["items"]])
        self.assertEqual(classroom_slots, {})

    def test_admission_result_menu_payload_uses_exam_results_topic(self):
        response, slots = self.route("ask_schedule", "admission exam results")

        self.assertIn("Examination results", self.text_of(response))
        self.assertEqual(slots["conversation_last_intent"], "exam_results")

    def test_bisaya_admission_result_follow_up_does_not_trigger_location_fallback(self):
        first, first_slots = self.route("ask_process", "unsaon nako pag lantaws akong admissiont test result")
        follow_up, follow_up_slots = self.route(
            "ask_location",
            "aha manako na makita akong result sa examination?",
            slots=first_slots,
        )

        self.assertIn("examination", self.text_of(first).lower())
        self.assertEqual(first_slots["conversation_last_intent"], "exam_results")
        self.assertIn("examination", self.text_of(follow_up).lower())
        self.assertNotIn("don't have location information", self.text_of(follow_up).lower())
        self.assertEqual(follow_up_slots["conversation_last_intent"], "exam_results")

    def test_library_services_menu(self):
        services, slots = self.route("ask_general_info", "library services")

        self.assertIn("services that library", self.text_of(services))
        self.assertIn("choiceGroups", services["custom"])
        self.assertIn("Library ID", [group["title"] for group in services["custom"]["choiceGroups"]])
        self.assertIn("Borrowing and Books", [group["title"] for group in services["custom"]["choiceGroups"]])
        self.assertEqual(slots, {})

    def test_buksu_provide_routes_to_student_services(self):
        services, slots = self.route("ask_general_info", "what do buksu can provide to us?")

        self.assertIn("BukSU services", self.text_of(services))
        self.assertIn("choiceGroups", services["custom"])
        self.assertIn("IDs and Validation", [group["title"] for group in services["custom"]["choiceGroups"]])
        self.assertEqual(slots, {})

    def test_tba_meaning(self):
        meaning, slots = self.route("ask_general_info", "tba?")

        self.assertIn("To Be Announced", self.text_of(meaning))
        self.assertEqual(slots["conversation_last_intent"], "meaning_of_tba")

    def test_service_menu_uses_admission_password_label(self):
        services, _ = self.route("ask_process", "what are the student services")
        account_group = next(group for group in services["custom"]["choiceGroups"] if group["title"] == "Accounts and Access")
        labels = [item["label"] for item in account_group["items"]]

        self.assertIn("Admission password help", labels)
        self.assertNotIn("Admission account help", labels)

    def test_buksu_services_has_clinic_services_category(self):
        services, _ = self.route("ask_process", "what are the student services")
        groups = {group["title"]: [item["label"] for item in group["items"]] for group in services["custom"]["choiceGroups"]}

        self.assertIn("Clinic Services", groups)
        self.assertIn("Dental services", groups["Clinic Services"])
        self.assertIn("Medical certificate", groups["Clinic Services"])
        self.assertNotIn("Clinic services", groups["Campus Support"])
        self.assertNotIn("Dental consultation", groups["Campus Support"])

    def test_dental_services_menu_and_protected_follow_up(self):
        menu, _ = self.route("ask_availability", "dental services")
        extraction, extraction_slots = self.route("ask_process", "request for tooth extraction")
        follow_up, follow_up_slots = self.route("ask_fee", "how much?", slots=extraction_slots)
        referral, referral_slots = self.route("ask_process", "request for referral dispensing of medicine")

        self.assertIn("Here are the dental services", self.text_of(menu))
        self.assertIn("choiceGroups", menu["custom"])
        labels = menu["custom"]["choiceGroups"][0]["items"]
        self.assertIn("Request for Tooth Extraction", [item["label"] for item in labels])
        self.assertIn("Tooth Extraction", self.text_of(extraction))
        self.assertEqual(extraction_slots["conversation_subject"], "dental_tooth_extraction")
        self.assertEqual(extraction_slots["conversation_turns_remaining"], 20)
        self.assertIn("Directly ask the dental clinic", self.text_of(follow_up))
        self.assertEqual(follow_up_slots["conversation_last_intent"], "dental_clinic_direct_ask")
        self.assertIn("Referral/Dispensing of Medicine", self.text_of(referral))
        self.assertEqual(referral_slots["conversation_subject"], "dental_referral_medicine")

    def test_medical_certificate_process_cost_and_duration(self):
        process, process_slots = self.route("ask_process", "how to get medical certificate on clinic")
        cost, cost_slots = self.route("ask_fee", "medical certificate cost")
        duration, duration_slots = self.route("ask_schedule", "duration for getting medical certificate")

        self.assertIn("validated School ID", self.text_of(process))
        self.assertIn("28 minutes", self.text_of(process))
        self.assertEqual(process_slots["conversation_subject"], "medical_certificate")
        self.assertIn("don't need to pay", self.text_of(cost))
        self.assertEqual(cost_slots["conversation_last_intent"], "clinic_medical_certificate_cost")
        self.assertIn("28 minutes", self.text_of(duration))
        self.assertEqual(duration_slots["conversation_last_intent"], "clinic_medical_certificate_duration")

    def test_pe_uniform_process_and_clarification(self):
        process, process_slots = self.route("ask_process", "how to get PE uniform")
        clarification, clarification_slots = self.route("ask_process", "how to get PE")

        self.assertIn("University Press", self.text_of(process))
        self.assertIn("Finance Office", self.text_of(process))
        self.assertIn("mapData", process["custom"])
        self.assertEqual(process_slots["conversation_last_intent"], "pe_uniform_process")
        self.assertIn("Did you mean PE uniform", self.text_of(clarification))
        self.assertEqual(clarification["custom"]["suggestions"][0]["label"], "PE uniform")
        self.assertEqual(clarification_slots, {})

    def test_test_permit_issue_does_not_route_to_cor(self):
        permit, slots = self.route("ask_document", "test permit corrupted")

        self.assertIn("test permit", self.text_of(permit).lower())
        self.assertIn("Admission and Testing Unit", self.text_of(permit))
        self.assertNotIn("Certificate of Registration", self.text_of(permit))
        self.assertEqual(slots["conversation_last_intent"], "test_permit_issue")

    def test_creator_question_accepts_create_wording(self):
        response, slots = self.route("smalltalk", "who create you")

        self.assertIn("prototype project", self.text_of(response))
        self.assertEqual(slots, {})

    def test_building_directory_suggestions_attach_to_cob_faculty_location(self):
        response, slots = self.route("ask_location", "cob faculty location")
        custom = response.get("custom", {})
        labels = [item["label"] for item in custom.get("suggestions", [])]

        self.assertIn("COB Faculty Room", self.text_of(response))
        self.assertIn("There's also other offices", self.text_of(response))
        self.assertIn("mapData", custom)
        self.assertIn("Hospitality Management Faculty Room", labels)
        self.assertIn("Business Administration Faculty Room", labels)
        self.assertIn("Accountancy Faculty Department Room", labels)
        self.assertIn("COB Accreditation Room", labels)
        self.assertIn("Students Organization", labels)
        self.assertEqual(slots["conversation_last_intent"], "location")

    def test_building_directory_queries(self):
        cases = [
            ("what offices can be found in COB", "COB Building", "Hospitality Management Faculty Room"),
            ("list of offices inside the COT building", "New COT Building", "COT Faculty Room"),
            ("what offices can be found in administrative building", "Administrative Building", "Client Care Center"),
            ("what offices can be found in Finance Building", "Finance Building", "Window 7 Payroll Regular"),
        ]

        for text, building, expected_label in cases:
            with self.subTest(text=text):
                response, slots = self.route("ask_location", text)
                labels = [item["label"] for item in response.get("custom", {}).get("suggestions", [])]
                self.assertIn(building, self.text_of(response))
                self.assertIn(expected_label, labels)
                self.assertEqual(slots["conversation_subject"], "building_directory")
                self.assertEqual(slots["conversation_turns_remaining"], 20)

    def test_building_directory_follow_up_keeps_office_context(self):
        first, first_slots = self.route("ask_location", "can i ask if you can show me all the offices under the cob building")
        follow_up, follow_up_slots = self.route("ask_general_info", "how about COT?", slots=first_slots)
        labels = [item["label"] for item in follow_up.get("custom", {}).get("suggestions", [])]

        self.assertIn("COB Building", self.text_of(first))
        self.assertEqual(first_slots["conversation_subject"], "building_directory")
        self.assertIn("New COT Building", self.text_of(follow_up))
        self.assertIn("COT Faculty Room", labels)
        self.assertNotIn("offers a variety of courses", self.text_of(follow_up))
        self.assertEqual(follow_up_slots["conversation_subject"], "building_directory")

    def test_buksu_president_office_location_does_not_route_to_main_campus(self):
        response, slots = self.route("ask_location", "BUKSU President Office")
        text = self.text_of(response)

        self.assertIn("President", text)
        self.assertNotIn("Main Campus is located at Fortich", text)
        self.assertIn("mapData", response.get("custom", {}))
        self.assertEqual(slots["conversation_last_intent"], "location")

    def test_admission_letter_of_intent_and_certificate_copy_guidance(self):
        letter, letter_slots = self.route("ask_general_info", "what does letter of intent mean?")
        first, first_slots = self.route(
            "ask_general_info",
            "what does the first one mean in admission requirements?",
        )
        certificate, certificate_slots = self.route(
            "ask_document",
            "need ba ipasa original certificates during SHS?",
        )
        cor, cor_slots = self.route("ask_document", "where can i get certificate of registration?")

        self.assertIn("formal letter", self.text_of(letter))
        self.assertIn("qualified", self.text_of(letter))
        self.assertEqual(letter_slots["conversation_last_intent"], "admission_letter_of_intent_meaning")
        self.assertIn("Letter of Intent", self.text_of(first))
        self.assertEqual(first_slots["conversation_last_intent"], "admission_letter_of_intent_meaning")
        self.assertIn("photocop", self.text_of(certificate).lower())
        self.assertNotIn("Certificate of Registration", self.text_of(certificate))
        self.assertEqual(certificate_slots["conversation_last_intent"], "admission_certificate_photocopy_guidance")
        self.assertEqual(cor_slots["conversation_last_intent"], "request_cor")

    def test_exact_deans_office_queries_route_to_location_not_person_info(self):
        cases = [
            ("where is CAS Deans Office", "CAS Dean", "Maribel G. Valdez"),
            ("COT deans office?", "COT Dean", "Marilou O. Espina"),
        ]

        for text, expected_location_text, wrong_person_text in cases:
            with self.subTest(text=text):
                response, slots = self.route("ask_location", text)
                self.assertIn(expected_location_text, self.text_of(response))
                self.assertNotIn(wrong_person_text, self.text_of(response))
                self.assertIn("mapData", response.get("custom", {}))
                self.assertEqual(slots["conversation_last_intent"], "location")

        clicked_response, _ = self.route(
            "ask_location",
            "where is COT Dean's Office",
            entities=[{"entity": "location_name", "value": "COT"}],
        )
        self.assertIn("COT Dean", self.text_of(clicked_response))
        self.assertNotIn("There are actually two buildings", self.text_of(clicked_response))

    def test_exact_faculty_room_queries_route_to_location_not_course_info(self):
        cases = [
            ("BSN Faculty Room", "BSN Faculty Room", "Bachelor of Science in Nursing focusing"),
            ("CON faculty room", "BSN Faculty Room", "Bachelor of Science in Nursing focusing"),
            ("COT Faculty Room", "COT Faculty Room", "There are actually two buildings"),
        ]

        for text, expected_location_text, wrong_text in cases:
            with self.subTest(text=text):
                response, slots = self.route("ask_location", text)
                self.assertIn(expected_location_text, self.text_of(response))
                self.assertNotIn(wrong_text, self.text_of(response))
                self.assertIn("mapData", response.get("custom", {}))
                self.assertEqual(slots["conversation_last_intent"], "location")

    def test_generic_faculty_and_deans_office_queries_show_location_choices(self):
        faculty, faculty_slots = self.route("ask_location", "faculty office")
        deans, deans_slots = self.route("ask_location", "deans office")

        faculty_labels = [item["label"] for item in faculty["custom"]["suggestions"]]
        dean_labels = [item["label"] for item in deans["custom"]["suggestions"]]

        self.assertIn("Which faculty office", self.text_of(faculty))
        self.assertIn("COT Faculty Room", faculty_labels)
        self.assertIn("BSN Faculty Room", faculty_labels)
        self.assertIn("CPAG Faculty Room", faculty_labels)
        self.assertIn("Which Dean's Office", self.text_of(deans))
        self.assertIn("CAS Dean's Office", dean_labels)
        self.assertIn("COT Dean's Office", dean_labels)
        self.assertEqual(faculty_slots, {})
        self.assertEqual(deans_slots, {})

    def test_smart_classroom_and_cpag_bare_building_route_to_locations(self):
        smart, smart_slots = self.route("ask_location", "smart classroom")
        cpag, cpag_slots = self.route("ask_location", "cpag building")

        self.assertIn("Smart Classroom", self.text_of(smart))
        self.assertIn("mapData", smart.get("custom", {}))
        self.assertNotIn("class-related concerns", self.text_of(smart))
        self.assertIn("CPAG building is located", self.text_of(cpag))
        self.assertIn("mapData", cpag.get("custom", {}))
        self.assertNotIn("offer only one course", self.text_of(cpag))
        self.assertEqual(smart_slots["conversation_last_intent"], "location")
        self.assertEqual(cpag_slots["conversation_last_intent"], "location")

    def test_finance_window_choices_route_to_exact_location_only(self):
        window3, _ = self.route("ask_location", "Windows 3 Assessment")
        window4, _ = self.route("ask_location", "Windows 4 Assessment")
        window8, _ = self.route("ask_location", "Window 8 Payroll Regular and Casual")
        window8_where, _ = self.route("ask_location", "where is Window 8 Payroll Regular and Casual")

        self.assertIn("Windows 3 (Assessment)", self.text_of(window3))
        self.assertNotIn("Sorry, I don't have location information for 3", self.text_of(window3))
        self.assertIn("Windows 4 (Assessment)", self.text_of(window4))
        self.assertNotIn("Sorry, I don't have location information for 4", self.text_of(window4))
        self.assertIn("Window 8 (Payroll Regular & Casual)", self.text_of(window8))
        self.assertNotIn("Window 7 (Payroll Regular)", self.text_of(window8))
        self.assertNotIn("not sure I fully understand", self.text_of(window8))
        self.assertIn("Window 8 (Payroll Regular & Casual)", self.text_of(window8_where))
        self.assertNotIn("not sure I fully understand", self.text_of(window8_where))

    def test_cpag_directory_prioritizes_faculty_dean_and_ge_department(self):
        response, slots = self.route("ask_location", "what offices can be found in cpag building")
        labels = [item["label"] for item in response.get("custom", {}).get("suggestions", [])]

        self.assertIn("CPAG Building", self.text_of(response))
        self.assertGreaterEqual(len(labels), 3)
        self.assertEqual(labels[:3], ["CPAG Faculty Room", "CPAG Deans Office", "GE Department"])
        self.assertEqual(slots["conversation_subject"], "building_directory")


if __name__ == "__main__":
    unittest.main()
