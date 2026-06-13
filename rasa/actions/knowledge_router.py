import re
from typing import Any, Dict, List, Optional

from query_interpreter import QueryInterpreter
from data_loader import KnowledgeDataLoader
from retrieval_index import RetrievalIndex
from retrieval_scorer import RetrievalScorer


class KnowledgeRouter:
    """Routes purpose intent + resolved entities to existing knowledge records."""

    PURPOSE_TERMS = {
        "ask_schedule": {"when", "schedule", "deadline", "time", "hours", "open", "close", "period", "kanus", "kanusa", "oras", "adlawa"},
        "ask_fee": {"fee", "fees", "payment", "pay", "cost", "price", "how much", "bayad", "pila"},
        "ask_requirement": {"requirement", "requirements", "need", "needed", "bring", "document", "documents", "kailangan", "kinahanglan"},
        "ask_process": {"how", "process", "steps", "apply", "request", "get", "reset", "complete", "enroll", "unsaon", "pagkuha", "pamaagi"},
        "ask_contact": {"contact", "email", "phone", "number", "telephone", "call"},
        "ask_availability": {"available", "availability", "offer", "offers", "have", "has", "does", "naa", "open"},
        "ask_document": {"form", "document", "documents", "cor", "permit", "certificate", "download", "request"},
        "ask_general_info": {"what", "about", "info", "information", "explain", "meaning", "unsa", "pasabot"},
    }

    COURSE_ROUTES = [
        (["bsit", "information technology"], "buksu_IT", "buksu_bsit_program"),
        (["bsft", "ft", "food technology"], "buksu_FT", "buksu_BSFT_program"),
        (["bset", "et", "electronics technology"], "buksu_ET", "buksu_BSET_program"),
        (["bsemc", "bsemc dat", "emc", "digital animation", "multimedia computing", "entertainment and multimedia"], "buksu_EMC", "buksu_BSEMC-DAT_program"),
        (["bs bio", "bsbio", "biology", "biotechnology"], "buksu_BS-BIO", "buksu_BS-BIO_program"),
        (["ab socsci", "ba socsci", "ab social science", "ba social science", "social science"], "buksu_AB_SocSci", "buksu_AB SocSci_program"),
        (["bsed fil", "bsed filipino", "filipino education"], "buksu_BSED_FIL", "buksu_BSED-FIL_program"),
        (["bsed math", "mathematics education"], "buksu_BSED_MATH", "buksu_BSED-MATH_program"),
        (["beed", "elementary education"], "buksu_BEED_program", "buksu_BEED_program"),
        (["bsn", "nursing"], "buksu_BSN", "buksu_BSN_program"),
        (["bsap", "ab philo", "ba philo", "ab philosophy", "ba philosophy", "philo", "philosophy"], "buksu_AB_PHILO", "buksu_AB-PHILO_program"),
        (["bs es", "bses", "environmental science", "environmental heritage"], "buksu_BS_ES", "buksu_BS-ES_program"),
        (["ab socio", "ba socio", "ab sociology", "ba sociology", "sociology"], "buksu_AB_SOCIO", "buksu_AB-SOCIO_program"),
        (["ab eng", "ba eng", "ab english", "ba english", "english language"], "buksu_AB_ENG", "buksu_AB-ENG_program"),
        (["bped", "physical education"], "buksu_BPED", "buksu_BPED_program"),
        (["bs comdev", "bscomdev", "comdev", "community development"], "buksu_BS_COMDEV", "buksu_BS COMDEV_program"),
        (["ab econ", "ba econ", "ab economics", "ba economics", "economics"], "buksu_AB_ECON", "buksu_AB-ECON_program"),
        (["beced", "early childhood education"], "buksu_BECED", "buksu_BECED_program"),
        (["bsdc", "development communication", "devcom"], "buksu_BSDC", "buksu_BSDC_program"),
        (["bshm", "hospitality management"], "buksu_BSHM", "buksu_BSHM_program"),
        (["bsat", "automotive technology"], "buksu_BSAT", "buksu_BSAT_program"),
        (["bpa", "public administration"], "buksu_BPA", "buksu_BPA_program"),
        (["bs math", "bsmath", "mathematics"], "buksu_BS_MATH", "buksu_BS-MATH_program"),
        (["bsa", "accountancy", "bs accountancy"], "buksu_BSA", "buksu_BSA_program"),
        (["bsba fm", "bsbafm", "bsba", "financial management", "business administration"], "buksu_BSBA_FM", "buksu_BSBA-FM_program"),
        (["bsed eng", "bsed english", "english education"], "buksu_BSED_ENG", "buksu_BSED-ENG_program"),
        (["bsed sci", "bsed science", "science education"], "buksu_BSED_SCI", "buksu_BSED-SCI_program"),
        (["bsed socstud", "bsed social studies", "social studies education"], "buksu_BSED_SOCSTUD", "buksu_BSED-SOCSTUD_program"),
        (["mpa", "master in public administration"], "buksu_mpa_program", "buksu_mpa_program"),
    ]

    def __init__(self, data_loader: KnowledgeDataLoader, interpreter: QueryInterpreter):
        self.data_loader = data_loader
        self.interpreter = interpreter
        self.retrieval_index = RetrievalIndex(data_loader, interpreter)
        self.retrieval_scorer = RetrievalScorer(self.retrieval_index, interpreter)
        self.last_selected_intent: Optional[str] = None

    def _has_any(self, text: str, terms: List[str]) -> bool:
        normalized = self.interpreter.normalize(text)
        return any(term in normalized for term in terms)

    def _has_any_token(self, text: str, terms: List[str]) -> bool:
        tokens = set(self.interpreter.tokens(text))
        return any(term in tokens for term in terms)

    def direct_intent_override(self, intent: str, user_message: str, entity_values: List[str]) -> Optional[str]:
        raw_text = " ".join([user_message, *entity_values])
        text = self.interpreter.normalize(raw_text)
        tokens = set(self.interpreter.tokens(text))

        has_enrollment = self._has_any(text, ["enroll", "enrollment"])
        has_cat = (
            "cat" in tokens or
            self._has_any(text, ["buksu cat", "college admission test", "admission test", "entrance exam"])
        )
        has_admission = self._has_any(text, ["admission", "application"]) or has_cat
        has_freshman = self._has_any(text, ["freshman", "freshmen", "incoming first year", "first year"])
        has_transferee = self._has_any(text, ["transferee", "transfer student"])
        has_second_courser = self._has_any(text, ["second courser", "second course"])
        has_law = self._has_any(text, ["law", "juris doctor"])
        has_gpat = self._has_any(text, ["gpat", "graduate program admission test"])
        has_deadline = self._has_any(text, ["deadline", "until when", "last day"])
        has_result = self._has_any(text, ["result", "results", "passed", "pass", "ror", "rating"])
        has_late_enrollment = has_enrollment and self._has_any(text, ["late", "allowed late", "still enroll", "first week"])
        has_enrollment_time = has_enrollment and self._has_any(text, ["time", "when", "schedule", "day", "date", "deadline"])
        has_enrollment_process = has_enrollment and self._has_any(
            text,
            ["process", "steps", "how to enroll", "how can i enroll", "unsaon pag enroll", "enrollment process"],
        )
        has_sias = self._has_any(text, ["sias", "student information system"])
        has_cor = self._has_any(text, ["cor", "certificate of registration"])
        has_letter_of_intent = self._has_any(text, ["letter of intent", "intent letter"])
        has_admission_first_requirement = (
            self._has_any(text, ["first one mean", "first one means", "first requirement", "first requirement mean"]) and
            self._has_any(text, ["admission", "requirements", "requirement"])
        )
        has_admission_certificate_copy = (
            not has_cor and
            self._has_any(text, ["certificate", "certificates", "awards", "recognitions", "recognition"]) and
            self._has_any(text, ["original", "photocopy", "copy", "copies", "submit", "ipasa", "pasa", "pass"])
        )
        has_validation = self._has_any(text, ["validate", "validation", "validated"])
        has_id_validation = has_validation and (
            self._has_any_token(text, ["id"]) or self._has_any(text, ["student id", "school id"])
        )
        has_cor_validation = has_validation and has_cor
        has_admission_account = self._has_any(text, ["admission account", "institutional account", "admission password", "change password", "find account"])
        has_test_permit = self._has_any(text, ["test permit", "exam permit", "permit"])
        has_test_permit_issue = has_test_permit and self._has_any(text, ["corrupt", "corrupted", "broken", "error", "invalid", "not opening", "cannot open", "can't open", "missing", "download"])
        has_office_hours = self._has_any(text, ["office hours", "office schedule", "buksu office", "university office"])
        has_calendar = self._has_any(text, ["academic calendar", "university calendar", "official calendar", "semester calendar", "school calendar"])
        has_weekend_visitor = self._has_any(text, ["visitor", "visitors"]) and self._has_any(text, ["weekend", "saturday", "sunday"])
        has_foundation_day = self._has_any(text, ["charter day", "foundation day", "founding anniversary", "anniversary celebration"])
        has_generic_buksu_contact = self._has_any(text, ["buksu contact", "bukidnon state university contact", "contact number", "phone number", "telephone number"]) and self._has_any(text, ["buksu", "bukidnon state university", "university"])
        has_buksu_location = self._has_any(text, ["main campus", "buksu", "bukidnon state university", "university"]) and self._has_any(text, ["where", "location", "located", "address"])
        has_specific_buksu_office_location = self._has_any(text, [
            "buksu president office",
            "president office",
            "presidential office",
            "office of the president",
        ])
        has_student_id = self._has_any(text, ["student id", "school id"])
        has_library_id = self._has_any(text, ["library id", "library card"])
        has_lost_student_id = has_student_id and self._has_any(text, ["lost", "lose", "replace", "replacement", "nawala"])
        has_library_books = self._has_any(text, ["borrow books", "borrow book", "return books", "late books", "late book", "unreturned book", "library resources"])
        has_book_penalty = self._has_any(text, ["penalty", "fine", "fines", "late return", "unreturned"])
        has_good_moral = self._has_any(text, ["good moral", "good moral certificate", "certificate of good moral"])
        has_affirmative_action = self._has_any(text, ["affirmative action", "aap", "diversity and inclusion"])
        has_masters = self._has_any(text, ["master", "masters", "master's", "masteral", "graduate program", "graduate studies"])
        has_inc = self._has_any(text, ["inc form", "inc grade", "incomplete"])
        has_registrar = self._has_any(text, ["registrar"])
        has_fda = self._has_any(text, ["fda", "failure due to absences"])
        has_deans_list = self._has_any(text, ["deans list", "dean's list", "dean honor list"])
        has_college_honors = self._has_any(text, ["college honors"])
        has_university_scholar = self._has_any(text, ["university scholar"])
        has_graduation = self._has_any(text, ["graduation", "graduating", "graduate clearance", "grad application", "grad clearance"])
        has_ict = self._has_any(text, ["ict", "information communications technology", "wifi", "wi-fi"])
        has_clinic = self._has_any(text, ["clinic", "medical clinic", "health services"])
        has_dental = self._has_any(text, ["dental", "oral examination", "oral exam", "dentist"])
        has_medical_certificate = self._has_any(text, ["medical certificate", "clinic certificate", "certificate for ojt", "certificate for intramural"])
        has_tooth_extraction = self._has_any(text, ["tooth extraction", "extract tooth", "extract a tooth"])
        has_dental_referral_medicine = self._has_any(text, ["referral dispensing", "dispensing of medicine", "dental medicine", "prescription slip", "referral medicine"])
        has_location_wording = self._has_any(text, ["where", "location", "located", "find", "go to", "get to", "direction", "directions"])
        has_it_program = bool(re.search(r"\bIT\b", raw_text)) or self._has_any(text, ["bsit", "information technology"])
        has_course = self._has_any(
            text,
            [
                "course", "courses", "program", "programs", "bachelor",
                "bsit", "bsap", "philo", "bsa", "philosophy", "masters", "master's",
                "masteral", "board course", "non board",
            ],
        ) or has_it_program or self._course_route(text, intent, has_it_program=has_it_program) is not None
        has_training_course = self._has_any(text, ["internship", "ojt", "on the job", "prerequisite", "nstp", "rotc", "physical education", "course shifting", "program shifting"])
        has_pe_uniform = self._has_any(text, ["pe uniform", "physical education uniform"])
        has_college = (
            self._has_any(text, ["college", "colleges"]) or
            self._has_any_token(text, ["cas", "cob", "cot", "con", "coe", "cpag", "coa", "law"])
        )
        has_dormitory = self._has_any(text, ["dormitory", "dormitories", "dorm", "dorms", "mahogany", "rubia", "kilala"])
        has_classroom = self._has_any(text, ["classroom", "class", "phone", "assignment", "assignments", "instructor"])
        has_admin_person = self._has_any(text, ["vice president", "vice presidents", "secretary", "board secretary"])
        has_dean_or_head = self._has_any(text, ["dean", "head", "chairperson", "program chair"])

        course_choice = self.course_clarification_response(intent, user_message)
        if course_choice:
            return "__course_clarification__"
        if self.pe_uniform_clarification_response(intent, user_message):
            return "__pe_uniform_clarification__"
        if self._has_any(text, ["how about", "what about", "how about the", "what about the"]):
            course_follow_up = self._course_route(text, "ask_availability", has_it_program=has_it_program)
            if course_follow_up:
                return course_follow_up
        if has_office_hours:
            return "all_office_schedule"
        if has_calendar:
            return "buksu_university_calendar"
        if has_weekend_visitor:
            return "campus_weekend_visitors"
        if has_foundation_day:
            return "buksu_foundation_day"
        if has_generic_buksu_contact:
            return "buksu_contact_number"
        if has_buksu_location and not has_specific_buksu_office_location:
            return "bukus_location"
        if has_test_permit_issue:
            return "test_permit_issue"
        if has_letter_of_intent or has_admission_first_requirement:
            return "admission_letter_of_intent_meaning"
        if has_admission_certificate_copy:
            return "admission_certificate_photocopy_guidance"
        if has_pe_uniform:
            return "pe_uniform_process"
        if has_id_validation:
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule"})) or self._has_any(
                text,
                ["validation day", "validation date", "validation schedule"],
            ):
                return "id_validation_day"
            return "id_validation_process"
        if has_cor_validation:
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule"})) or self._has_any(
                text,
                ["validation day", "validation date", "validation schedule"],
            ):
                return "cor_validation_day"
            return "cor_validation_steps"
        if has_freshman and has_enrollment_process:
            return "freshman_enrollment_process"
        if has_enrollment_time and not has_late_enrollment:
            return "enrollment_time_schedule"
        if has_late_enrollment:
            return "late_enrollment"
        if has_enrollment and "online" in text:
            return "online_enrollment_steps"
        if has_enrollment_process:
            return "mixed_enrollment_process"
        if has_masters and self._has_any(text, ["requirement", "requirements", "admission", "apply", "application", "needed", "documents"]):
            return "masters_degree_admission_requirements"
        if has_masters:
            return "buksu_masters_courses"
        if has_graduation:
            if self._has_any(text, ["clearance", "requirement", "requirements", "document", "documents"]):
                return "graduating_clearance_requirements"
            if self._has_any(text, ["apply", "application", "file", "process", "how"]):
                return "graduation_application_process"
        if has_ict:
            if self._has_any(text, ["wifi", "wi-fi", "internet", "access", "connect"]):
                return "get_wifi_access"
            if self._has_any(text, ["mission"]):
                return "ict_mission"
            return "about_ict"
        if has_medical_certificate:
            if self._has_any(text, ["cost", "fee", "payment", "how much", "pay", "bayad"]):
                return "clinic_medical_certificate_cost"
            if self._has_any(text, ["duration", "time", "minutes", "hours", "how long"]):
                return "clinic_medical_certificate_duration"
            return "clinic_medical_certificate_process"
        if has_clinic or has_dental:
            if has_dental and has_location_wording:
                return None
            if self._has_any(text, ["medical dental services", "medical and dental services", "medical dental consultation", "medical and dental consultation"]):
                return "buksu_medical_dental_services"
            if has_clinic and not has_dental and self._has_any(text, ["service", "services", "available", "offer"]):
                return "buksu_medical_dental_services"
            if has_dental:
                if has_tooth_extraction:
                    return "request_tooth_extraction"
                if has_dental_referral_medicine:
                    return "request_referral_dispensing_medicine"
                if self._has_any(text, ["service", "services", "servicing", "available", "offer"]) and not self._has_any(text, ["consult", "consultation", "oral examination"]):
                    return "dental_services_menu"
                if self._has_any(text, ["requirement", "requirements", "checklist", "need", "needed", "bring", "papers", "documents"]):
                    if self._has_any(text, ["oral examination", "oral exam"]):
                        return "dental_oral_examination_requirement"
                    return "requirement_for_dental_consultation"
                if self._has_any(text, ["oral examination"]):
                    return "request_dental_oral_examination"
                return "request_dental_consult"
            if self._has_any(text, ["mission"]):
                return "med_mission"
            if self._has_any(text, ["vision"]):
                return "med_vision"
            if self._has_any(text, ["where", "location", "find"]):
                return "buksu_med_loc"
            return "medic_clinic"
        if has_dean_or_head:
            college_route = self._college_person_route(text)
            if college_route:
                return college_route
        if has_admin_person:
            if self._has_any(text, ["academic affairs"]):
                return "vicepres_academic_affairs"
            if self._has_any(text, ["research", "extension", "innovation"]):
                return "vicepres_research_extension_innovations"
            if self._has_any(text, ["administration", "finance"]):
                return "vicepres_administration_finance"
            if self._has_any(text, ["culture", "arts", "sports", "student services"]):
                return "vicepres_culture_arts_sports_student_services"
            if self._has_any(text, ["secretary", "board secretary"]):
                return "buksu_secretary"
            return "Buksu_vice_pres"
        if has_classroom:
            if self._has_any(text, ["phone", "mobile"]):
                return "phone_use_in_class"
            if self._has_any(text, ["eat", "eating", "food"]):
                return "eating_in_classroom"
            if self._has_any(text, ["assignment", "assignments", "submit"]):
                return "submit_assignments_online"
            return "class_concerns"
        if intent == "ask_requirement":
            if has_masters:
                return "masters_degree_admission_requirements"
            if has_gpat:
                return "gpat_admission_requirements"
            if has_law:
                return "law_admission_requirements"
            if has_second_courser:
                return "second_courser_requirements"
            if has_transferee and has_admission:
                return "transferee_admission_requirements"
            if has_freshman and has_admission:
                return "freshman_admission_requirements"
            if has_cat or has_admission:
                return "exam_requirements"
            if has_library_id:
                return "library_id_card_requirements"
            if has_student_id:
                return "student_id_requirements"
            if has_enrollment:
                return "enrollment_documents"
        if has_college and intent != "ask_location":
            college_course_route = self._college_course_route(text)
            if college_course_route:
                return college_course_route
            if self._has_any(text, ["college", "colleges"]):
                return "buksu_academic_colleges"
        if has_course or has_training_course:
            course_route = self._course_route(text, intent, has_it_program=has_it_program)
            if course_route:
                return course_route
        if has_affirmative_action:
            return "affirmative_action"
        if intent == "ask_general_info" and has_cat:
            if has_result:
                return "exam_results"
            return "buksu_cat_definition"
        if intent in {"ask_general_info", "ask_requirement"}:
            if has_deans_list:
                return "deans_list"
            if has_college_honors:
                return "College_Honors_gpa"
            if has_university_scholar:
                return "University_Scholar_gpa"
            if has_fda:
                return "fda_meaning"
        if intent == "ask_process" and has_fda:
            return "fda_solution"
        if intent == "ask_general_info" and has_gpat:
            return "gpat_admission_requirements"
        if has_dormitory:
            dormitory_route = self._dormitory_route(text)
            if dormitory_route:
                return dormitory_route
        if has_specific_buksu_office_location and (has_location_wording or intent == "ask_location"):
            return None
        university_route = self._university_route(text)
        if university_route:
            return university_route
        if has_lost_student_id:
            return "lost_student_id_replacement_process"
        if intent in {"ask_process", "ask_document", "ask_general_info", "ask_location"} and has_good_moral:
            return "request_good_moral_certificate_oss"
        if intent in {"ask_location", "ask_document", "ask_general_info"} and has_library_id:
            if self._has_any(text, ["where", "get", "kuha", "makuha", "asa"]):
                return "library_id_card_location"
        if intent == "ask_schedule":
            if has_office_hours:
                return "all_office_schedule"
            if has_admission:
                if has_result:
                    return "exam_results"
                if has_deadline:
                    return "admission_application_deadline"
                return "online_application_schedule"
            if has_enrollment:
                return "enrollment_time_schedule"
            if has_registrar:
                return "office_schedule"
        if intent == "ask_process":
            if has_transferee and has_enrollment:
                return "transferee_enrollment"
            if has_freshman and has_enrollment:
                return "freshman_enrollment_process"
            if has_sias:
                return "access_sias"
            if has_admission_account:
                if "password" in text:
                    return "Change_Pass_admission"
                if "institutional" in text:
                    return "Find_Institutional_Account"
                return "Change_info_admission"
            if has_cor:
                return "where_get_cor"
            if has_admission:
                if has_result:
                    return "exam_results"
                if "reschedule" in text:
                    return "reschedule_entrance_exam"
                if "missed" in tokens or "miss" in tokens:
                    return "missed_buksu_cat_schedule"
                return "take_exam"
            if has_student_id:
                return "student_id_process"
            if has_library_id:
                return "library_id_card_location"
            if has_enrollment and "online" in text:
                return "online_enrollment_steps"
            if has_enrollment:
                return "mixed_enrollment_process"
            if has_inc:
                if "form" in text:
                    return "get_inc_form"
                return "inc_grade_solution"
        if intent == "ask_requirement" and has_inc:
            return "inc_grade_solution"
        if intent == "ask_requirement":
            if has_masters:
                return "masters_degree_admission_requirements"
            if has_gpat:
                return "gpat_admission_requirements"
            if has_law:
                return "law_admission_requirements"
            if has_second_courser:
                return "second_courser_requirements"
            if has_transferee and has_admission:
                return "transferee_admission_requirements"
            if has_freshman and has_admission:
                return "freshman_admission_requirements"
            if has_cat or has_admission:
                return "exam_requirements"
            if has_library_id:
                return "library_id_card_requirements"
            if has_student_id:
                return "student_id_requirements"
            if has_enrollment:
                return "enrollment_documents"
            if has_admission:
                return "exam_requirements"
        if intent == "ask_fee" and has_library_id:
            return "library_id_card_payment"
        if intent == "ask_fee" and has_student_id:
            return "Student_id_fee"
        if intent == "ask_fee" and (has_cat or has_admission):
            return "exam_fees"
        if intent == "ask_fee" and (has_enrollment or self._has_any(text, ["student fee", "student fees", "laboratory fee", "miscellaneous fee", "tuition"])):
            return "student_fees"
        if intent == "ask_fee" and has_book_penalty:
            return "library_late_return_penalty"
        if intent == "ask_fee" and has_good_moral:
            return "good_moral_certificate_fee"
        if intent in {"ask_process", "ask_availability", "ask_general_info"} and has_library_books:
            if self._has_any(text, ["return"]):
                return "library_return_books_process"
            if self._has_any(text, ["available", "availability", "have"]):
                return "library_available_books"
            if self._has_any(text, ["resource"]):
                return "access_buksu_library_resources"
            return "library_borrow_books_process"
        if intent == "ask_document":
            if has_inc:
                return "get_inc_form"
            if "cor" in text or "certificate of registration" in text:
                return "request_cor"
        if intent == "ask_contact":
            if has_registrar:
                return "contact_registrar"
            if self._has_any(text, ["atu", "admission and testing"]):
                return "contact_atu"
            if self._has_any(text, ["scholarship"]):
                return "contact_scholarship_unit"
            if has_admission:
                return "buksu_admission_contact"
        return None

    def validation_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        if not self._has_any(text, ["validate", "validation"]):
            return None
        has_specific_validation_target = (
            self._has_any_token(text, ["id", "cor"]) or
            self._has_any(text, ["student id", "school id", "certificate of registration"])
        )
        if has_specific_validation_target:
            return None

        return self._choice_response(
            "Which validation do you mean?",
            [
                {"label": "ID validation", "payload": "how to validate ID"},
                {"label": "COR validation", "payload": "how to validate COR"},
            ],
        )

    def services_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        tokens = set(re.findall(r"\b[\w'-]+\b", text))
        if "service" not in tokens and "services" not in tokens and not self._has_any(text, [
            "what can you provide", "what can you help", "help me with",
            "list of all you can help", "chatbot help menu", "buksu can provide",
            "buksu provide", "buksu offers to students", "buksu can give",
            "classroom policy", "classroom policies", "class rules",
        ]):
            return None

        if self._has_any(text, ["library service", "library services", "services do library", "services does library", "services sa library", "services sa librarya"]):
            return self._library_services_menu()
        if self._has_any(text, ["clinic services", "health services", "medical dental services", "medical and dental services", "medical services"]):
            return self._clinic_services_menu()
        if self._has_any(text, ["dormitory services", "dormitory menu", "dormitory information", "dormitory info"]):
            return self._dormitory_services_menu()
        if self._has_any(text, ["classroom policy", "classroom policies", "class rules"]):
            return self._classroom_policy_menu()
        if "dental" in tokens and ("service" in tokens or "services" in tokens or "servicing" in tokens or "offer" in tokens):
            return None
        if self._has_any(text, ["dental services", "dental servicing", "dental clinic services"]):
            return None

        generic_service_terms = [
            "what services can you provide",
            "what services do you provide",
            "services can you provide",
            "what services can you give",
            "what services do you have",
            "what are your services",
            "services",
            "service",
        ]
        bot_terms = [
            "chatbot services", "bot services", "chatbot help menu",
            "what can you provide",
            "what can you help", "services that chatbot can provide",
            "list of all you can help",
        ]
        buksu_terms = [
            "student services", "buksu services", "services that buksu",
            "services ni buksu", "services sa buksu", "available services for students",
            "buksu can provide", "buksu provide", "buksu can give",
            "what do buksu can provide", "what can buksu provide",
            "what does buksu provide", "what buksu can provide", "services do buksu",
        ]

        if self._has_any(text, buksu_terms):
            return self._buksu_services_menu()
        if self._has_any(text, bot_terms):
            return self._bot_services_menu()
        if self._has_any(text, generic_service_terms) or (("service" in tokens or "services" in tokens) and tokens.issubset({"service", "services", "list", "what", "are", "the", "available", "can", "provide", "you", "do", "have", "your"})):
            return self._choice_response(
                "Which services do you want to view?",
                [
                    {"label": "BukSU student services", "payload": "what are the student services"},
                    {"label": "Chatbot help menu", "payload": "chatbot help menu"},
                ],
            )

        return None

    def _library_services_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "Here are the services that library have. Choose the library service you need.",
            [
                {
                    "title": "Library ID",
                    "items": [
                        {"label": "Where to get library ID", "payload": "where can I get library id"},
                        {"label": "Library ID requirements", "payload": "library id requirements"},
                        {"label": "Library ID payment", "payload": "how much is library id"},
                    ],
                },
                {
                    "title": "Borrowing and Books",
                    "items": [
                        {"label": "Borrow books", "payload": "how to borrow books"},
                        {"label": "Borrowing rules", "payload": "library borrowing rules"},
                        {"label": "Return books", "payload": "how to return books"},
                        {"label": "Late return penalty", "payload": "library late return penalty"},
                    ],
                },
                {
                    "title": "Library Access",
                    "items": [
                        {"label": "Available books", "payload": "available books in library"},
                        {"label": "Library resources", "payload": "how to access buksu library resources"},
                        {"label": "Library hours", "payload": "library hours"},
                    ],
                },
            ],
        )

    def _buksu_services_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "Here are BukSU services I can help you with. Open a category and choose one.",
            [
                {
                    "title": "IDs and Validation",
                    "items": [
                        {"label": "Student ID process", "payload": "how to get student id"},
                        {"label": "Student ID fee", "payload": "how much is student id"},
                        {"label": "ID validation process", "payload": "how to validate ID"},
                        {"label": "ID validation day", "payload": "when is ID validation"},
                        {"label": "COR validation process", "payload": "how to validate COR"},
                        {"label": "COR validation day", "payload": "when is COR validation"},
                    ],
                },
                {
                    "title": "Accounts and Access",
                    "items": [
                        {"label": "Wi-Fi access", "payload": "how to get wifi access"},
                        {"label": "SIAS access", "payload": "how to access SIAS"},
                        {"label": "COR request", "payload": "how to get COR"},
                        {"label": "Admission password help", "payload": "change admission password"},
                    ],
                },
                {
                    "title": "Documents",
                    "items": [
                        {"label": "INC form", "payload": "where can I get INC form"},
                        {"label": "TOR request", "payload": "how to request TOR"},
                        {"label": "Graduation clearance", "payload": "graduation clearance requirements"},
                    ],
                },
                {
                    "title": "Campus Support",
                    "items": [
                        {"label": "Library ID", "payload": "where can I get library id"},
                        {"label": "Borrow books", "payload": "how to borrow books"},
                        {"label": "PE uniform", "payload": "how to get PE uniform"},
                    ],
                },
                {
                    "title": "Clinic Services",
                    "items": [
                        {"label": "Dental services", "payload": "dental services"},
                        {"label": "Medical certificate", "payload": "how to get medical certificate on clinic"},
                        {"label": "Medical certificate cost", "payload": "medical certificate cost"},
                        {"label": "Medical certificate duration", "payload": "duration for getting medical certificate"},
                    ],
                },
            ],
        )

    def _bot_services_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "This is all I can provide to help you. Open a category and choose a topic.",
            [
                {
                    "title": "Academic Policy",
                    "items": [
                        {"label": "What is probation", "payload": "what is academic probation"},
                        {"label": "INC grade", "payload": "how to complete INC grade"},
                        {"label": "FDA", "payload": "what is FDA"},
                        {"label": "Dean's list", "payload": "deans list requirements"},
                        {"label": "Graduation application", "payload": "how to apply for graduation"},
                    ],
                },
                {
                    "title": "Admissions and Enrollment",
                    "items": [
                        {"label": "Admission testing", "payload": "how to apply for admission"},
                        {"label": "Admission requirements", "payload": "admission requirements"},
                        {"label": "Admission result", "payload": "admission exam results"},
                        {"label": "Enrollment time", "payload": "enrollment time"},
                        {"label": "Freshman enrollment", "payload": "how to enroll freshman"},
                        {"label": "Late enrollment", "payload": "late enrollment allowed"},
                    ],
                },
                {
                    "title": "Courses and Departments",
                    "items": [
                        {"label": "All courses", "payload": "all courses offered by BukSU"},
                        {"label": "Board courses", "payload": "board courses offered by BukSU"},
                        {"label": "Non-board courses", "payload": "non-board courses offered by BukSU"},
                        {"label": "Master's programs", "payload": "master courses offered by BukSU"},
                        {"label": "College list", "payload": "list of colleges"},
                    ],
                },
                {
                    "title": "Library",
                    "items": [
                        {"label": "Library services", "payload": "library services"},
                        {"label": "Library ID", "payload": "where can I get library id"},
                        {"label": "Borrow books", "payload": "how to borrow books"},
                        {"label": "Library hours", "payload": "library hours"},
                    ],
                },
                {
                    "title": "Student Services and ICT",
                    "items": [
                        {"label": "Student ID process", "payload": "how to get student id"},
                        {"label": "ID validation", "payload": "how to validate ID"},
                        {"label": "COR validation", "payload": "how to validate COR"},
                        {"label": "Wi-Fi access", "payload": "how to get wifi access"},
                        {"label": "SIAS access", "payload": "how to access SIAS"},
                        {"label": "Office hours", "payload": "what are the office hours of the university"},
                    ],
                },
                {
                    "title": "Health and Campus Life",
                    "items": [
                        {"label": "Clinic services", "payload": "clinic services"},
                        {"label": "Dental consultation", "payload": "dental services"},
                        {"label": "Dormitory", "payload": "dormitory services"},
                        {"label": "Classroom policy", "payload": "classroom policy"},
                    ],
                },
            ],
        )

    def _clinic_services_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "Here are the clinic services I can help with. Choose the service you need.",
            [
                {
                    "title": "Medical Services",
                    "items": [
                        {"label": "Medical certificate process", "payload": "how to get medical certificate on clinic"},
                        {"label": "Medical certificate cost", "payload": "medical certificate cost"},
                        {"label": "Medical certificate duration", "payload": "duration for getting medical certificate"},
                    ],
                },
                {
                    "title": "Dental Services",
                    "items": [
                        {"label": "Dental services list", "payload": "dental services"},
                        {"label": "Dental consultation", "payload": "request for dental consultation"},
                        {"label": "Dental oral examination", "payload": "request for dental oral examination"},
                        {"label": "Tooth extraction", "payload": "request for tooth extraction"},
                        {"label": "Referral/Dispensing of Medicine", "payload": "request for referral dispensing of medicine"},
                    ],
                },
            ],
        )

    def _dormitory_services_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "Here are the dormitory topics I can help with. Choose one if you need details.",
            [
                {
                    "title": "Dormitory Information",
                    "items": [
                        {"label": "Dormitory overview", "payload": "does buksu have dormitory"},
                        {"label": "How many dormitories", "payload": "how many dormitories does buksu have"},
                        {"label": "Dormitory availability", "payload": "who can stay in buksu dormitory"},
                        {"label": "Dormitory pros and cons", "payload": "pros and cons of dormitory"},
                    ],
                },
                {
                    "title": "Dormitory Locations",
                    "items": [
                        {"label": "Mahogany Dormitory", "payload": "where is mahogany dorm"},
                        {"label": "Rubia Dormitory", "payload": "where is rubia dorm"},
                        {"label": "Kilala Dormitory", "payload": "where is kilala dorm"},
                    ],
                },
            ],
        )

    def _classroom_policy_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "Here are the classroom policies mostly applicable to different courses. Choose a topic.",
            [
                {
                    "title": "Classroom Policies",
                    "items": [
                        {"label": "Phone use in class", "payload": "can i use phone in class"},
                        {"label": "Eating in classroom", "payload": "can i eat in classroom"},
                        {"label": "Class concerns", "payload": "class concerns"},
                        {"label": "Submit assignments online", "payload": "submit assignments online"},
                    ],
                },
            ],
        )

    def _choice_group_response(self, text: str, groups: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "text": text,
            "custom": {
                "choiceGroups": groups
            },
        }

    def admission_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        if intent not in {"ask_schedule", "ask_general_info"}:
            return None
        if not self._has_any(text, ["admission"]):
            return None
        if not self._has_any(text, ["when", "schedule", "kanus", "kanusa"]):
            return None

        specific_terms = [
            "application", "deadline", "cat", "test", "testing", "exam",
            "result", "passed", "pass", "enrollment", "freshman", "transferee",
        ]
        if self._has_any(text, specific_terms):
            return None

        return {
            "text": "What admission are you referring to?",
            "custom": {
                "suggestions": [
                    {
                        "label": "Admission application/testing",
                        "payload": "when is the admission application testing schedule",
                    },
                    {
                        "label": "Admission enrollment",
                        "payload": "when is admission enrollment",
                    },
                    {
                        "label": "Admission testing result",
                        "payload": "when is admission testing result",
                    },
                ]
            },
        }

    def course_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        tokens = set(self.interpreter.tokens(text))
        bare_course_terms = {"course", "courses", "program", "programs"}
        filler_terms = {"buksu", "bukidnon", "state", "university", "school", "available", "offer", "offers"}

        if intent not in {"ask_availability", "ask_general_info"}:
            return None
        if not tokens.intersection(bare_course_terms):
            return None
        if self._has_any(text, ["all courses", "all course", "course list", "program list", "list of courses", "list of programs"]):
            return None
        if self._has_any(text, ["board course", "board courses", "non board", "non-board", "master", "masters", "doctoral"]):
            return None
        clarification_terms = bare_course_terms.union(filler_terms).union({"offered", "offerd", "by", "in"})
        if any(token not in clarification_terms for token in tokens):
            return None

        return self._choice_response(
            "Which course list do you want to view?",
            [
                {"label": "All courses offered", "payload": "all courses offered by BukSU"},
                {"label": "Board courses", "payload": "board courses offered by BukSU"},
                {"label": "Non-board courses", "payload": "non-board courses offered by BukSU"},
                {"label": "Master's and doctoral programs", "payload": "master courses offered by BukSU"},
            ],
        )

    def pe_uniform_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        tokens = set(self.interpreter.tokens(text))
        if intent not in {"ask_process", "ask_general_info", "ask_document", "ask_location"}:
            return None
        if "pe" not in tokens and "physical education" not in text:
            return None
        if "uniform" in tokens or "uniforms" in tokens:
            return None
        if not self._has_any(text, ["how", "get", "where", "request", "buy", "kuha", "asa"]):
            return None

        return self._choice_response(
            "Did you mean PE uniform?",
            [
                {"label": "PE uniform", "payload": "how to get PE uniform"},
            ],
        )

    def find_best_response(self, intent: str, user_message: str, entity_values: List[str]) -> Any:
        self.last_selected_intent = None
        direct_intent = self.direct_intent_override(intent, user_message, entity_values)
        if direct_intent == "__course_clarification__":
            return self.course_clarification_response(intent, user_message) or self.data_loader.fallback()
        if direct_intent == "__pe_uniform_clarification__":
            return self.pe_uniform_clarification_response(intent, user_message) or self.data_loader.fallback()
        if direct_intent:
            self.last_selected_intent = direct_intent
            return self.data_loader.get_response(direct_intent, user_message=user_message)

        query_tokens = self.interpreter.tokens(user_message)
        raw_tokens = self.interpreter.normalize(user_message).replace("?", "").split()
        clarification_tokens = query_tokens or raw_tokens
        if not entity_values and self._needs_subject_clarification(intent, clarification_tokens):
            return self._clarification_for(intent)

        if not query_tokens and not entity_values:
            return self.data_loader.fallback()

        if not entity_values and self.interpreter.normalize(user_message) in {"what is it", "what it", "about it"}:
            return self.data_loader.fallback()

        if not entity_values and self._looks_like_unresolved_location_query(user_message):
            return self.data_loader.fallback()

        retrieval_result = self.retrieval_scorer.search(intent, user_message, entity_values)
        if retrieval_result.is_high_confidence and retrieval_result.intent:
            self.last_selected_intent = retrieval_result.intent
            return self.data_loader.get_response(retrieval_result.intent, user_message=user_message)

        if retrieval_result.is_medium_confidence:
            return self.retrieval_scorer.clarification(retrieval_result)

        return self.data_loader.fallback()

    def _looks_like_unresolved_location_query(self, user_message: str) -> bool:
        text = self.interpreter.normalize(user_message)
        if self._has_any(text, ["admission", "enrollment", "course", "program", "requirements", "fee", "schedule"]):
            return False
        location_terms = [
            "where", "location", "located", "find", "go to", "get to",
            "direction", "directions", "inside campus", "on campus",
            "office where", "room", "building", "desk", "gate",
        ]
        return any(term in text for term in location_terms)

    def _needs_subject_clarification(self, intent: str, query_tokens: List[str]) -> bool:
        if intent not in {"ask_fee", "ask_requirement", "ask_schedule", "ask_process"}:
            return False

        generic_tokens = {
            "fee", "fees", "payment", "requirements", "requirement",
            "schedule", "process", "steps", "how", "when", "much",
            "what", "whats", "and", "the", "are", "is",
        }
        return bool(query_tokens) and all(token in generic_tokens for token in query_tokens)

    def _choice_response(self, text: str, suggestions: List[Dict[str, str]]) -> Dict[str, Any]:
        return {
            "text": text,
            "custom": {
                "suggestions": suggestions
            },
        }

    def _clarification_for(self, intent: str) -> Dict[str, Any]:
        if intent == "ask_fee":
            return self._choice_response(
                "Which fee are you asking about?",
                [
                    {"label": "Library ID fee", "payload": "how much is the library id"},
                    {"label": "Enrollment fee", "payload": "enrollment fee"},
                    {"label": "Admission test fee", "payload": "admission test fee"},
                    {"label": "Student ID fee", "payload": "how much is the student id"},
                ],
            )
        if intent == "ask_requirement":
            return self._choice_response(
                "Which requirements do you need?",
                [
                    {"label": "Enrollment requirements", "payload": "enrollment requirements"},
                    {"label": "Student ID requirements", "payload": "student id requirements"},
                    {"label": "Library ID requirements", "payload": "library id requirements"},
                    {"label": "Admission requirements", "payload": "admission requirements"},
                    {"label": "INC form", "payload": "INC form requirements"},
                ],
            )
        if intent == "ask_schedule":
            return self._choice_response(
                "Which schedule do you need?",
                [
                    {"label": "Enrollment", "payload": "enrollment time"},
                    {"label": "Admission application/testing", "payload": "when is the admission application testing schedule"},
                    {"label": "Registrar office hours", "payload": "registrar office hours"},
                    {"label": "COR validation", "payload": "COR validation schedule"},
                ],
            )
        if intent == "ask_process":
            return self._choice_response(
                "Which process do you want to know?",
                [
                    {"label": "Online enrollment", "payload": "online enrollment steps"},
                    {"label": "Student ID", "payload": "how to get student id"},
                    {"label": "COR request", "payload": "how to get COR"},
                    {"label": "INC completion", "payload": "how to complete INC grade"},
                ],
            )
        return self._choice_response(
            "Can you tell me which topic you mean?",
            [
                {"label": "Enrollment", "payload": "enrollment information"},
                {"label": "Admission", "payload": "admission information"},
            ],
        )

    def _college_course_route(self, text: str) -> Optional[str]:
        college_routes = [
            (["cas"], ["arts and sciences"], "course_offer_CAS"),
            (["cob"], ["business"], "course_offer_COB"),
            (["cot"], ["technology", "technologies"], "course_offer_COT"),
            (["con"], ["nursing"], "course_offer_CON"),
            (["coe"], ["education"], "course_offer_COE"),
            (["law"], ["juris doctor"], "course_offer_LAW"),
            (["coa", "cpag"], ["administration", "public administration"], "course_offer_COA"),
        ]
        for acronym_terms, phrase_terms, route in college_routes:
            if self._has_any_token(text, acronym_terms) or self._has_any(text, phrase_terms):
                return route
        return None

    def _college_person_route(self, text: str) -> Optional[str]:
        is_head = self._has_any(text, ["head", "chairperson", "program chair"])
        is_dean = self._has_any(text, ["dean"])
        if self._has_any_token(text, ["bsit"]) or self._has_any(text, ["information technology"]):
            return "Dean_0f_COT" if is_dean else "Head_of_BSIT"

        course_college = self._course_college_route(text)
        if course_college:
            dean_route, head_route = course_college
            return dean_route if is_dean else head_route

        routes = [
            (["cot"], ["technology", "technologies"], "Head_of_COT" if is_head else "Dean_0f_COT"),
            (["cob"], ["business"], "Head_of_COB" if is_head else "Dean_0f_COB"),
            (["cas"], ["arts and sciences"], "Head_of_CAS" if is_head else "Dean_0f_CAS"),
            (["cpag"], ["public administration", "governance"], "Head_of_CPAG" if is_head else "Dean_0f_CPAG"),
            (["con"], ["nursing"], "Head_of_CON" if is_head else "Dean_0f_CON"),
            (["coe"], ["education"], "Head_of_COE" if is_head else "Dean_0f_COE"),
            (["law"], ["juris doctor"], "Head_of_LAW" if is_head else "Dean_0f_LAW"),
        ]
        for acronym_terms, phrase_terms, route in routes:
            if self._has_any_token(text, acronym_terms) or self._has_any(text, phrase_terms):
                return route
        return None

    def _course_college_route(self, text: str) -> Optional[tuple]:
        routes = [
            (
                ["bsit", "bsemc", "bsft"],
                ["information technology", "food technology", "automotive technology", "electronics technology", "entertainment and multimedia"],
                ("Dean_0f_COT", "Head_of_COT"),
            ),
            (
                ["bsap", "philosophy", "english language", "social science", "sociology", "economics", "biology", "environmental science", "mathematics", "development communication", "community development"],
                ["bachelor of arts in philosophy", "bachelor of arts in english", "bachelor of arts in social science", "bachelor of science in biology"],
                ("Dean_0f_CAS", "Head_of_CAS"),
            ),
            (
                ["bsa", "bsba", "bshm"],
                ["accountancy", "business administration", "hospitality management"],
                ("Dean_0f_COB", "Head_of_COB"),
            ),
            (
                ["bsn"],
                ["nursing"],
                ("Dean_0f_CON", "Head_of_CON"),
            ),
            (
                ["beed", "bped"],
                ["elementary education", "secondary education", "early childhood education", "physical education"],
                ("Dean_0f_COE", "Head_of_COE"),
            ),
            (
                ["bpa"],
                ["public administration"],
                ("Dean_0f_CPAG", "Head_of_CPAG"),
            ),
            (
                ["juris doctor"],
                ["law school", "juris doctor"],
                ("Dean_0f_LAW", "Head_of_LAW"),
            ),
        ]
        for acronym_terms, phrase_terms, route_pair in routes:
            if self._has_any_token(text, acronym_terms) or self._has_any(text, phrase_terms):
                return route_pair
        return None

    def _course_route(self, text: str, intent: str, has_it_program: bool = False) -> Optional[str]:
        if self._has_any(text, ["master", "masters", "masteral", "graduate program"]):
            return "buksu_masters_courses"
        if has_it_program:
            return self._course_answer_intent(intent, text, "buksu_IT", "buksu_bsit_program")

        matched_course = self._matched_course_route(text)
        if matched_course:
            general_intent, availability_intent = matched_course
            return self._course_answer_intent(intent, text, general_intent, availability_intent)

        if self._has_any(text, ["non board", "non-board"]):
            if self._has_any(text, ["meaning", "what is", "definition"]):
                return "meaning_of_nonboard_course"
            return "buksu_non_board_courses"
        if self._has_any(text, ["board course", "board courses"]):
            if self._has_any(text, ["meaning", "what is", "definition"]):
                return "meaning_of_board_course"
            return "buksu_board_courses"
        if self._has_any(text, ["courses offered", "course offered", "courses offerd", "course offerd", "what courses", "course list", "programs offered", "all courses"]):
            return "buksu_courses_offered"
        if self._has_any(text, ["shift", "shifting"]):
            return "course_shifting"
        if self._has_any(text, ["internship"]):
            return "internship_requirement"
        if self._has_any(text, ["ojt", "on the job"]):
            return "on_the_job_training"
        if self._has_any(text, ["prerequisite"]):
            return "prerequisite_subjects_purpose"
        if self._has_any(text, ["nstp"]):
            return "about_nstp"
        if self._has_any(text, ["rotc"]):
            return "rotc_meaning"
        if self._has_any_token(text, ["pe"]) or self._has_any(text, ["physical education"]):
            return "about_pe"
        return None

    def _matched_course_route(self, text: str) -> Optional[tuple]:
        for terms, general_intent, availability_intent in self.COURSE_ROUTES:
            if self._matches_course_terms(text, terms):
                return general_intent, availability_intent
        return None

    def _matches_course_terms(self, text: str, terms: List[str]) -> bool:
        tokens = set(self.interpreter.tokens(text))
        for term in terms:
            normalized_term = self.interpreter.normalize(term)
            if not normalized_term:
                continue

            # Acronyms and compact codes must match whole tokens only. This
            # prevents ET/FT/PE from firing inside words like get/shifting/penalty.
            compact = normalized_term.replace(" ", "")
            if len(compact) <= 6 and compact.isalnum():
                if normalized_term in tokens or compact in tokens:
                    return True
                if " " in normalized_term and re.search(rf"\b{re.escape(normalized_term)}\b", text):
                    return True
                continue

            if re.search(rf"\b{re.escape(normalized_term)}\b", text):
                return True
        return False

    def _course_answer_intent(self, intent: str, text: str, general_intent: str, availability_intent: str) -> str:
        availability_terms = [
            "offer", "offers", "offered", "available", "availability",
            "have", "has", "naa", "nagtanyag", "do buksu", "does buksu",
        ]
        general_terms = ["what is", "about", "info", "information", "meaning", "explain", "unsa"]
        if intent == "ask_general_info" and self._has_any(text, general_terms) and not self._has_any(text, availability_terms):
            return general_intent
        return availability_intent

    def _dormitory_route(self, text: str) -> Optional[str]:
        if self._has_any(text, ["how many", "number", "count", "pila"]):
            return "number_of_dormitories"
        if self._has_any(text, ["pros", "cons", "benefit", "benefits", "advantage", "rules", "curfew"]):
            return "dormitory_pros_cons"
        if self._has_any(text, ["slot", "slots", "available", "availability", "who can stay", "athlete"]):
            return "buksu_dormitory_information"
        if self._has_any(text, ["male", "mahogany"]):
            return "male_dorm"
        if self._has_any(text, ["female", "rubia"]):
            return "female_dorm"
        return "campus_dormitories"

    def _university_route(self, text: str) -> Optional[str]:
        has_university_context = self._has_any(text, ["buksu", "bukidnon state university", "university", "school"])
        has_specific_university_term = (
            self._has_any_token(text, [
                "mission", "vision", "seal", "hymn", "gazette", "ranking", "rank",
                "wuri", "edurank", "greenmetric", "founded", "founding", "history",
                "president", "presidents", "abbreviation", "tba",
            ]) or
            self._has_any(text, [
                "core values", "became university", "university status",
                "meaning of buksu", "what does buksu mean", "campus tour",
                "study place", "worth it", "to be announced",
            ])
        )
        explicit_about_buksu = self._has_any(text, [
            "what is buksu", "about buksu", "tell me about buksu",
            "what is bukidnon state university", "about bukidnon state university",
        ])
        if not explicit_about_buksu and not has_specific_university_term:
            return None

        if self._has_any_token(text, ["mission"]):
            return "buksu_mission"
        if self._has_any_token(text, ["vision"]):
            return "buksu_vision"
        if self._has_any(text, ["core values", "values"]):
            return "buksu_core_values"
        if self._has_any_token(text, ["seal"]):
            return "buksu_seal_significance"
        if self._has_any_token(text, ["tba"]) or self._has_any(text, ["to be announced"]):
            return "meaning_of_tba"
        if self._has_any_token(text, ["hymn"]):
            return "buksu_hymn_lyrics"
        if self._has_any_token(text, ["gazette"]):
            return "Whats_buksu_gazette"
        if self._has_any_token(text, ["ranking", "rank", "wuri", "edurank", "greenmetric"]):
            return "current_rank"
        if self._has_any(text, [
            "presidents list", "list of presidents", "former president", "former presidents",
            "past president", "past presidents", "previous president", "previous presidents",
            "old president", "old presidents",
        ]):
            return "buksu_presidents_list"
        if self._has_any(text, ["president"]) and self._has_any(text, [
            "became university", "2007", "at the time", "first university president",
            "first president of buksu", "first buksu president",
        ]):
            return "Pres_thetime_university"
        if self._has_any(text, ["president"]):
            return "buksu_president"
        if self._has_any(text, ["became university", "university status"]):
            return "buksu_become_university"
        if self._has_any(text, ["how old", "age"]):
            return "Buksu_age"
        if self._has_any(text, ["founded", "founding", "anniversary"]):
            return "founding"
        if self._has_any(text, ["history", "background"]):
            return "buksu_history_background"
        if self._has_any(text, ["abbreviation", "meaning of buksu", "what does buksu mean"]):
            return "meaning_of_buksu"
        if self._has_any(text, ["where", "location", "located"]):
            return "bukus_location"
        if self._has_any(text, ["worth it", "should i study"]):
            return "Buksu_worth_it"
        if self._has_any(text, ["study place", "where can i study"]):
            return "buksu_study_place"
        if self._has_any(text, ["campus tour", "tour"]):
            return "Campus_tour"
        if has_university_context and explicit_about_buksu:
            return "about_buksu"
        return None

    def location_responses(self, locations: List[str], user_message: str) -> List[Dict[str, Any]]:
        responses = []
        for location in locations:
            response = self.data_loader.get_location_response(location, user_message)
            text = response.get("text", "")
            if text and not text.lower().startswith("sorry, i don't have information"):
                responses.append(response)
        return responses
