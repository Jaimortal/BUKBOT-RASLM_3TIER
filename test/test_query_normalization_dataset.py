import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "rasa" / "actions"))

from actions import ActionReplyFromJsonHelper, LOCATION_ALIASES  # noqa: E402
from main_router import MainRouterService  # noqa: E402


class QueryNormalizationDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        helper = ActionReplyFromJsonHelper(str(ROOT / "rasa" / "actions" / "responses.json"))
        cls.router = MainRouterService(helper, LOCATION_ALIASES)

    def route(self, intent, text):
        return self.router.route_with_context(intent, {"text": text, "entities": []}, text, {})

    def suggestions(self, response):
        if not isinstance(response, dict):
            return []
        return [item.get("label") for item in response.get("custom", {}).get("suggestions", [])]

    def assert_routes(self, cases):
        for intent, text, expected in cases:
            with self.subTest(text=text):
                response, slots = self.route(intent, text)
                self.assertEqual(slots.get("conversation_last_intent"), expected)

    def assert_suggestions_include(self, cases):
        for intent, text, expected_labels in cases:
            with self.subTest(text=text):
                response, slots = self.route(intent, text)
                labels = self.suggestions(response)
                for label in expected_labels:
                    self.assertIn(label, labels)
                self.assertEqual(slots, {})

    def test_english_typos_dataset(self):
        self.assert_routes([
            ("ask_availability", "Is buksu accept transfered students?", "transferee_admission_requirements"),
            ("ask_requirement", "admisson requirements", "exam_requirements"),
            ("ask_schedule", "enrolment when", "enrollment_time_schedule"),
            ("ask_process", "cor validaton", "cor_validation_steps"),
            ("ask_location", "libary id asa kuha", "library_id_card_location"),
            ("ask_schedule", "enrollment sched", "enrollment_time_schedule"),
            ("ask_availability", "masteral courses", "buksu_masters_courses"),
            ("ask_document", "test permit corrupted", "test_permit_issue"),
        ])
        self.assert_suggestions_include([
            ("ask_availability", "cources offered", ["All courses offered", "Board courses", "Non-board courses"]),
            ("ask_availability", "do buksu offer cources?", ["All courses offered", "Board courses", "Non-board courses"]),
        ])

    def test_bisaya_location_dataset(self):
        self.assert_routes([
            ("ask_location", "asa ang registrar", "location"),
            ("ask_location", "hain dapit ang library", "location"),
            ("ask_location", "diin ang clinic", "buksu_med_loc"),
            ("ask_location", "asa makita ang cpag building", "location"),
            ("ask_location", "asa makit-an ang cot dean office", "location"),
            ("ask_location", "asa ang finance office", "location"),
            ("ask_location", "hain ang gym", "location"),
            ("ask_location", "diin dapit ang dental", "location"),
            ("ask_location", "asa ang main gate", "location"),
            ("ask_location", "locate cpag building", "location"),
        ])

    def test_bisaya_payment_dataset(self):
        self.assert_routes([
            ("ask_fee", "pila ang student id", "Student_id_fee"),
            ("ask_fee", "pila bayad sa student id", "Student_id_fee"),
            ("ask_fee", "tagpila medical cert", "clinic_medical_certificate_cost"),
            ("ask_fee", "pila library id", "library_id_card_payment"),
            ("ask_fee", "pila bayad good moral certificate", "good_moral_certificate_fee"),
            ("ask_fee", "pila ang admission test", "exam_fees"),
            ("ask_fee", "pila cost medical certificate", "clinic_medical_certificate_cost"),
            ("ask_fee", "bayranan sa library late books", "library_late_return_penalty"),
        ])

    def test_bisaya_requirements_dataset(self):
        self.assert_routes([
            ("ask_requirement", "unsa requirements sa transferee", "transferee_admission_requirements"),
            ("ask_requirement", "unsay kinahanglan para mamalhin", "transferee_admission_requirements"),
            ("ask_requirement", "dokomento needed transferee", "transferee_admission_requirements"),
            ("ask_requirement", "dad on nako para admission", "exam_requirements"),
            ("ask_requirement", "unsay dad-on sa admission exam", "exam_requirements"),
            ("ask_requirement", "papeles para freshman", "freshman_admission_requirements"),
            ("ask_requirement", "kailangan para student id", "student_id_requirements"),
            ("ask_requirement", "kinahanglan sa library id", "library_id_card_requirements"),
            ("ask_requirement", "dokumento sa good moral", "request_good_moral_certificate_oss"),
            ("ask_requirement", "requirements sa masters", "masters_degree_admission_requirements"),
        ])

    def test_bisaya_transfer_dataset(self):
        self.assert_routes([
            ("ask_availability", "mobalhin nga student sa buksu", "transferee_admission_requirements"),
            ("ask_availability", "gapamalhin ko gikan laing school", "transferee_admission_requirements"),
            ("ask_availability", "mamalhinay ko sa buksu", "transferee_admission_requirements"),
            ("ask_availability", "mobalhin unta ko sa buksu", "transferee_admission_requirements"),
            ("ask_availability", "mudawat mo ug transferee", "transferee_admission_requirements"),
            ("ask_availability", "dawaton ba ang transfer student", "transferee_admission_requirements"),
            ("ask_requirement", "mamalhin ko unsa requirements", "transferee_admission_requirements"),
            ("ask_process", "unsaon pag transfer sa buksu", "transferee_admission_requirements"),
            ("ask_availability", "modawat mo transfer student", "transferee_admission_requirements"),
            ("ask_availability", "dawat ba transferee", "transferee_admission_requirements"),
        ])

    def test_services_and_document_dataset(self):
        self.assert_routes([
            ("ask_process", "unsaon pag validate id", "id_validation_process"),
            ("ask_location", "asa kuha library card", "library_id_card_location"),
            ("ask_schedule", "kanus-a cor validation", "cor_validation_day"),
            ("ask_fee", "medical cert pila", "clinic_medical_certificate_cost"),
            ("ask_process", "kuha good moral certificate", "request_good_moral_certificate_oss"),
            ("ask_document", "where get certificate of registration", "request_cor"),
            ("ask_process", "unsaon pagkuha library id", "library_id_card_location"),
            ("ask_schedule", "kanusa id validation", "id_validation_day"),
            ("ask_process", "how validate cor", "cor_validation_steps"),
        ])
        self.assert_suggestions_include([
            ("ask_process", "how get pe", ["PE uniform"]),
        ])

    def test_course_acronym_dataset(self):
        self.assert_routes([
            ("ask_availability", "do buksu offer ba philo", "buksu_AB-PHILO_program"),
            ("ask_availability", "naa moy bsat", "buksu_BSAT_program"),
            ("ask_availability", "how about bset", "buksu_BSET_program"),
            ("ask_availability", "do buksu offer IT", "buksu_bsit_program"),
            ("ask_availability", "do buksu offer bsn", "buksu_BSN_program"),
            ("ask_availability", "do buksu offer bshm", "buksu_BSHM_program"),
            ("ask_availability", "do buksu offer bsa", "buksu_BSA_program"),
            ("ask_availability", "masteral courses", "buksu_masters_courses"),
            ("ask_general_info", "what is BA philo", "buksu_AB_PHILO"),
        ])
        self.assert_suggestions_include([
            ("ask_availability", "unsay courses sa buksu", ["All courses offered", "Board courses", "Non-board courses"]),
        ])

    def test_ambiguous_and_safety_dataset(self):
        self.assert_routes([
            ("ask_general_info", "student id", "student_id_process"),
            ("ask_availability", "transfered students", "transferee_admission_requirements"),
            ("ask_process", "borrow books", "library_borrow_books_process"),
        ])
        self.assert_suggestions_include([
            ("ask_process", "how validate", ["ID validation", "COR validation"]),
            ("ask_fee", "how much?", ["Library ID fee", "Enrollment fee", "Admission test fee", "Student ID fee"]),
            ("ask_location", "faculty office", ["COT Faculty Room", "COB Faculty Room"]),
            ("ask_location", "deans office", ["COT Dean's Office", "CAS Dean's Office"]),
            ("ask_schedule", "when is admission", ["Admission application/testing", "Admission enrollment", "Admission testing result"]),
            ("ask_availability", "courses", ["All courses offered", "Board courses", "Non-board courses"]),
        ])
        response, slots = self.route("ask_general_info", "what is it")
        self.assertEqual(slots, {})
        self.assertNotIn("Information Technology", response.get("text", "") if isinstance(response, dict) else str(response))


if __name__ == "__main__":
    unittest.main()
