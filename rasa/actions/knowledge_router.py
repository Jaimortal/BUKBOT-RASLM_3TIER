import re
from typing import Any, Dict, List, Optional

from query_interpreter import QueryInterpreter
from data_loader import KnowledgeDataLoader
from llm_reranker import LLMReranker
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
        "ask_facility_availability": {"available", "availability", "facility", "facilities", "have", "has", "does", "is there", "are there", "naa", "naa ba", "naa bay", "aduna"},
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

    FACILITY_AVAILABILITY_ROUTES = [
        (["library", "university library"], "library_facility_availability"),
        (["museum", "university museum"], "museum_facility_availability"),
        (["dental clinic", "dental services", "dentist", "oral clinic"], "dental_clinic_facility_availability"),
        (["medical clinic", "health services", "health clinic", "university clinic", "clinic"], "clinic_facility_availability"),
        (["fitness gym", "gymnasium", "sports facility", "gym"], "gym_facility_availability"),
        (["cafeteria", "canteen", "food area", "food court", "mapalitan pagkaon"], "cafeteria_facility_availability"),
        (["atm", "cash machine", "automated teller machine"], "atm_facility_availability"),
        (["motorcycle parking", "car parking", "vehicle parking", "parking area", "parking"], "parking_facility_availability"),
        (["mahogany dorm", "rubia dorm", "kilala dorm", "student dorm", "dormitory", "dorm"], "dormitory_facility_availability"),
        (["open field", "sports field", "oval"], "oval_facility_availability"),
        (["auditorium", "theater", "theatre", "event hall"], "auditorium_facility_availability"),
        (["guidance office", "guidance counselor", "counseling office", "counselor"], "guidance_office_facility_availability"),
        (["registrar office", "university registrar"], "registrar_office_facility_availability"),
        (["finance office", "finance building", "cashier office", "cashier", "accounting office"], "finance_cashier_facility_availability"),
        (["ict service unit", "ict office", "ictu office", "technology office"], "ict_office_facility_availability"),
        (["admission office", "admission and testing office", "atu office"], "admission_office_facility_availability"),
        (["guard house", "campus guard", "security guard", "campus security"], "guard_house_facility_availability"),
    ]

    def __init__(self, data_loader: KnowledgeDataLoader, interpreter: QueryInterpreter):
        self.data_loader = data_loader
        self.interpreter = interpreter
        self.retrieval_index = RetrievalIndex(data_loader, interpreter)
        self.retrieval_scorer = RetrievalScorer(self.retrieval_index, interpreter)
        self.llm_reranker = LLMReranker()
        self.last_selected_intent: Optional[str] = None

    def _has_any(self, text: str, terms: List[str]) -> bool:
        normalized = self.interpreter.normalize(text)
        return any(term in normalized for term in terms)

    def _has_any_token(self, text: str, terms: List[str]) -> bool:
        tokens = set(self.interpreter.tokens(text))
        return any(term in tokens for term in terms)

    def _facility_availability_route(self, text: str) -> Optional[str]:
        normalized = self.interpreter.normalize_for_search(text)
        has_availability_wording = self._has_any(
            normalized,
            [
                "does", "do", "has", "have", "is there", "are there",
                "available", "availability", "exist", "exists",
                "naa", "naa ba", "naa bay", "aduna", "aduna ba", "aduna bay",
                "provided", "provide",
            ],
        )
        has_location_wording = self._has_any(
            normalized,
            [
                "where", "location", "located", "find", "go to", "get to",
                "direction", "directions", "how to go", "how do i get",
                "asa", "hain", "diin", "dapit", "makita", "makit-an", "locate",
            ],
        )
        if not has_availability_wording or has_location_wording:
            return None

        # Exclude queries asking about specific items, services, cards, rules, or fees inside the facility
        non_facility_subjects = [
            "card", "id", "book", "books", "borrow", "return", "penalty", "fee", "fees",
            "payment", "pay", "requirement", "requirements", "service", "services",
            "hour", "hours", "schedule", "time", "open", "close", "when", "contact",
            "permit", "handbook", "replace", "replacement", "lost", "another", "form",
        ]
        if self._has_any(normalized, non_facility_subjects):
            return None

        for aliases, intent in self.FACILITY_AVAILABILITY_ROUTES:
            for alias in aliases:
                if re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", normalized):
                    return intent
        return None

    def _is_available_course_slot_query(self, text: str, tokens: set) -> bool:
        has_slot_wording = (
            self._has_any_token(text, ["slot", "slots", "bakanti", "bakante"]) or
            self._has_any(
                text,
                [
                    "available slot", "available slots", "free slots", "existing slots",
                    "open slots", "slots available", "slot left", "slots left",
                    "naa pay slot", "naa pay slots", "naapay slot", "naapay slots",
                    "naa pabay", "napay bakanti", "naapay bakanti", "naapay bakante",
                    "naay bakanti", "naay bakante",
                ],
            )
        )
        if not has_slot_wording:
            return False
        return (
            self._has_any_token(text, ["course", "courses", "cource", "cources", "program", "programs"]) or
            self._has_any_token(text, ["cas", "cot", "cob", "con", "coe", "coa", "cpag", "law"]) or
            self._has_any_token(text, ["ba", "ab", "bs", "bsit", "bset", "bsat", "bsft", "bsemc", "bsn", "bpa"]) or
            self._has_any(
                text,
                [
                    "mga course", "mga courses", "course ang", "courses ang",
                    "course nga", "courses nga", "course na", "courses na",
                    "incoming first year", "first year",
                ],
            )
        )

    def direct_intent_override(
        self,
        intent: str,
        user_message: str,
        entity_values: List[str],
        active_domain: Optional[str] = None,
    ) -> Optional[str]:
        result = self._calculate_direct_intent_override(intent, user_message, entity_values, active_domain=active_domain)
        if result and active_domain:
            if not self.data_loader.is_intent_in_domain(result, active_domain):
                return None
        return result

    def _calculate_direct_intent_override(
        self,
        intent: str,
        user_message: str,
        entity_values: List[str],
        active_domain: Optional[str] = None,
    ) -> Optional[str]:
        raw_text = " ".join([user_message, *entity_values])
        raw_normalized = self.interpreter.normalize(raw_text)
        text = self.interpreter.normalize_for_search(raw_text)
        tokens = set(self.interpreter.tokens(text))
        raw_tokens = set(re.findall(r"\b[\w'-]+\b", raw_normalized))
        facility_availability_intent = self._facility_availability_route(text) if not active_domain or active_domain == "location" else None


        # Student Handbook — intercept before location scoring penalizes it.
        # Any query mentioning "handbook" is about how to get the document,
        # not about a physical location or a general university info topic.
        if self._has_any(text, [
            "student handbook",
            "university handbook",
            "university student handbook",
            "school handbook",
            "studenthandbook",
        ]):
            return "student_handbook_access"

        # Library Card Replacement — intercept before "payment" keyword causes ambiguity
        # with student fees or other payment topics.
        # Triggered only when BOTH a loss/replacement signal AND a library card signal are present.
        _has_library_card = self._has_any(text, [
            "library card", "library id", "library id card", "barcoded library card",
        ])
        _has_lost_or_replace = self._has_any(text, [
            "lost", "lose", "nawala", "replacement", "replace", "another library",
            "new library card", "new library id", "2nd library", "second library",
            "another", "get another", "second", "2nd",
        ])
        if _has_library_card and _has_lost_or_replace:
            return "library_id_card_replacement"

        # Certificate of Registration (COR) routing:
        # 1. Process / Steps / How to get / Download online -> where_get_cor (5-step portal guide)
        # 2. Where to get / Inquire / Registrar office -> request_cor (Registrar & online options info)
        has_cor_signal = self._has_any(text, [
            "cor", "certificate of registration", "cert of registration", "registration certificate",
        ])
        if has_cor_signal:
            has_cor_process_signal = self._has_any(text, [
                "process", "steps", "step by step", "how to get", "how do i get", "how to download",
                "how do i download", "unsaon pagkuha", "unsaon pag download", "how can i get my cor",
                "download my cor", "procedure", "unsaon", "how to", "how do i",
            ])
            has_cor_location_signal = self._has_any(text, [
                "where to get", "where can i get", "where do i get", "where to access",
                "where is cor", "where can i find", "asa makuha", "asa makakuha",
                "registrar", "registrar office", "inquire",
            ])
            if has_cor_process_signal:
                return "where_get_cor"
            if has_cor_location_signal:
                return "request_cor"

        # Exam Location vs Preferred Campus
        if self._has_any(text, [
            "exam location vs campus", "testing site vs campus",
            "exam location determine campus", "does exam location mean preferred campus",
            "same ba ang testing site ug campus", "kung asa ko mag exam adto pud ko mag skwela",
        ]):
            return "exam_location_vs_campus"

        # Deans of Colleges List Routing (University Administrators)
        _is_deans_list_academic_award = self._has_any(text, [
            "qualification", "qualify", "requirement", "requirements", "criteria",
            "gwa", "grade", "grades", "apply", "how to be", "honor", "honors", "award"
        ])
        _is_specific_college_dean = self._has_any(text, [
            "cot", "cob", "cas", "cpag", "con", "coe", "law",
            "technology", "technologies", "business", "arts and sciences",
            "public administration", "nursing", "education",
        ])
        if not _is_deans_list_academic_award and not _is_specific_college_dean:
            if (
                self._has_any(text, ["dean", "deans", "mga dean"]) and
                self._has_any(text, [
                    "college", "colleges", "department", "departments", "kolehiyo",
                    "buksu", "all", "tanan", "list", "lista", "who are", "kinsa", "7", "seven",
                    "every", "each"
                ])
            ) or self._has_any(text, [
                "deans of colleges list", "deans of colleges", "dean of colleges",
                "all deans of colleges", "all deans in buksu", "dean of all colleges",
                "list of deans", "list of college deans", "who are the deans",
                "who are all the deans", "deans of every college", "deans in every college",
                "all college deans", "kinsa ang mga dean", "lista sa mga dean",
                "mga dean sa tanang kolehiyo", "mga dean sa buksu", "tanang dean sa buksu",
                "mga dean sa college", "mga dean sa department", "deans of 7 colleges",
                "deans of the 7 colleges", "7 colleges deans", "all 7 deans"
            ]):
                return "deans_of_colleges_list"

        # Specific College Deans Direct Routing
        if not _is_deans_list_academic_award and self._has_any(text, ["dean", "dean of", "current dean", "kinsa ang dean", "who is the dean"]):
            if self._has_any(text, ["cot", "technology", "technologies"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_COT"
            if self._has_any(text, ["cob", "business", "accountancy"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_COB"
            if self._has_any(text, ["cas", "arts and sciences", "arts & sciences", "natural sciences", "social sciences", "mathematics"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_CAS"
            if self._has_any(text, ["cpag", "public administration", "governance"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_CPAG"
            if self._has_any(text, ["con", "nursing"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_CON"
            if self._has_any(text, ["coe", "education", "teacher education"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_COE"
            if self._has_any(text, ["law", "college of law", "col"]) and not self._has_any(text, ["head", "chair", "faculty"]):
                return "Dean_0f_LAW"

        # Contact Scholarship Unit Routing
        if self._has_any(text, [
            "contact scholarship", "contact scholarship unit", "contact sfgu",
            "scholarship contact", "scholarship unit contact", "sfgu contact",
            "number sa scholarship", "email sa scholarship", "fb sa scholarship",
            "facebook sa scholarship", "unsaon pag contact sa scholarship",
            "asa mag chat about scholarship", "scholarship phone number",
            "scholarship email", "scholarship facebook page",
        ]):
            return "contact_scholarship_unit"

        # Scholarship Application Routing
        if self._has_any(text, [
            "apply for scholarship", "apply for scholarships", "apply scholarship", "apply scholarships",
            "scholarship application", "how to get scholarship", "how to get a scholarship",
            "scholarship requirement", "scholarship requirements", "scholarship process", "scholarship procedure",
            "requirements for the scholarship", "requirements for scholarship", "requirement for scholarship",
            "unsaon pag apply og scholarship", "unsaon pag apply ug scholarship", "unsaon pag apply sa scholarship",
            "unsaon pagkuha og scholarship", "unsaon pagkuha ug scholarship", "unsaon pag apply scholarship",
            "pamaagi sa scholarship", "pamaagi sa pag apply og scholarship", "apply og scholarship",
        ]) and not self._has_any(text, ["where is window", "location of window", "asa ang window", "contact scholarship", "contact sfgu"]):
            return "scholarship_application"

        # Gate Pass Policy Routing
        _has_account_portal = self._has_any(text, [
            "account", "portal", "login", "log in", "log-in", "signin", "sign in", "sign-in",
            "password", "passcode", "pass code", "forgot", "sias", "email", "gmail", "credentials"
        ])
        _has_gate_pass = not _has_account_portal and (
            self._has_any(text, [
                "gate pass", "gatepass", "vehicle pass", "vehicle sticker", "car sticker", "motor sticker", "motorcycle pass", "car pass", "motor pass"
            ]) or (
                self._has_any(text, ["gate", "guard", "security", "campus entrance"]) and
                self._has_any(text, ["pass", "permit", "sticker"])
            )
        )
        _has_bike = self._has_any(text, [
            "bike", "bikes", "bicycle", "bicycles", "bisekleta", "bisikleta",
        ])
        if _has_gate_pass:
            if _has_bike:
                return "bike_gate_pass"
            return "general_gate_pass"

        # Add and Drop Subjects Routing
        if (
            self._has_any(text, [
                "adding and dropping", "adding & dropping", "add and drop", "add & drop",
                "add drop", "adding dropping", "mag add drop", "mag-add drop",
            ]) or (
                self._has_any(text, ["add subject", "adding subject", "drop subject", "dropping subject"]) and
                not self._has_any(text, ["how to pay", "cashier"])
            )
        ):
            return "add_drop_subject"

        # Absence / Excuse Requirements Routing
        _has_absence = self._has_any(text, [
            "absent", "absences", "absence", "absentcess", "makaabsent", "na absent", "ma absent", "nag absent", "na-absent",
        ])
        _has_excuse_doc = self._has_any(text, [
            "pass", "submit", "ipasa", "i-pasa", "document", "documents", "letter", "excuse", "requirements",
            "unsa akong ipasa", "unsay ipasa", "what to pass", "what to submit", "medical certificate", "what do i need",
        ])
        if _has_absence and _has_excuse_doc:
            return "absence_excuse_requirements"

        # General Attendance / Allowed Absence Policy
        if _has_absence and self._has_any(text, [
            "allowed", "allow", "pwede", "puwede", "okay", "can i", "what if", "rules", "policy",
            "limit", "how many", "unsa mahitabo", "what happens", "permitted", "miss", "pila", "pila ka",
        ]):
            return "attendance_requirement"

        if self._is_available_course_slot_query(text, tokens):
            return "course_slots"

        has_enrollment = self._has_any(text, ["enroll", "enrollment", "enrol", "enrolment"])
        if has_enrollment:
            # Check for explicit Medicine
            if (self._has_any(text, ["medicine", "college of medicine"]) or "nmat" in text) and not self._has_any(text, ["schedule", "time", "date", "when"]):
                return "medicine_enrollment_requirements"

            # Check for explicit Undergraduate
            if self._has_any(text, [
                "undergraduate requirements", "undergraduate enrollment requirements",
                "undergraduate requirement", "undergraduate enrollment requirement",
                "freshman requirements", "first year requirements", "transferee requirements",
                "freshman documentary requirements", "freshman enrollment requirements",
                "undergraduate",
            ]):
                return "freshman_enrollment_process"

            # Check for explicit Law / Graduate
            if (self._has_any(text, ["law", "juris doctor", "masters", "masteral", "doctorate", "post-graduate"]) or
                re.search(r"\bgraduate\b", text)) and not self._has_any(text, ["schedule", "time", "date", "when"]):
                return "graduate_law_enrollment_requirements"

            # Check if requirements/documents asked
            if self._has_any(text, ["requirement", "requirements", "document", "documents", "need", "needs", "papers", "dad-on", "dalhon", "ipasa", "submit", "envelope", "what do i need", "what to prepare"]):
                course_name = self._extract_mentioned_course_or_dept(text)
                if course_name and not self._has_any(text, ["medicine", "college of medicine", "law", "graduate"]):
                    return f"__course_enrollment_req_notice__{course_name}"
                return "enrollment_documents"

            # Check if process/steps asked
            if self._has_any(text, ["process", "step", "steps", "step by step", "guide", "how to enroll", "how do i enroll", "unsaon pag enroll", "unsaon pagpa enroll", "paagi sa pag enroll"]):
                course_name = self._extract_mentioned_course_or_dept(text)
                if course_name and not self._has_any(text, ["medicine", "college of medicine", "law", "graduate"]):
                    return f"__course_enrollment_proc_notice__{course_name}"
                return "enrollment_general_process"
        has_cat = (
            "cat" in tokens or
            self._has_any(text, ["buksu cat", "college admission test", "admission test", "entrance exam", "buksu entrance"])
        )
        has_admission = self._has_any(text, ["admission", "application"]) or has_cat
        has_freshman = self._has_any(
            text,
            [
                "freshman",
                "freshmen",
                "incoming freshman",
                "incoming first year",
                "first incoming first year",
                "first year",
                "new student",
                "fresh student",
                "first time enrolling",
            ],
        )
        has_transferee = self._has_any(
            text,
            [
                "transferee",
                "transferees",
                "transfer student",
                "transfer students",
                "transferred student",
                "transferred students",
                "transfered student",
                "transfered students",
                "transfer applicant",
                "transfer applicants",
            ],
        )
        has_transfer_acceptance = has_transferee and self._has_any(
            text,
            ["accept", "accepted", "admit", "admitted", "allow", "allowed", "modawat", "dawat"],
        )
        has_second_courser = self._has_any(text, ["second courser", "second course"])
        has_law = self._has_any(text, ["law", "juris doctor"])
        has_medicine = self._has_any(text, ["medicine", "college of medicine"])
        has_graduate_enrollment = has_enrollment and (
            bool(tokens.intersection({"graduate", "graduates", "law"})) or
            self._has_any(text, ["post graduate", "post-graduate"])
        )
        has_gpat = self._has_any(text, ["gpat", "graduate program admission test"])
        has_deadline = self._has_any(text, ["deadline", "until when", "last day"])
        has_result = (
            self._has_any(text, ["result", "results", "ror", "rating"]) or
            self._has_any_token(text, ["passed", "pass"])
        )
        has_result_release_query = (
            self._has_any(text, ["release", "released", "releasing", "come out", "mogawas", "i-release", "release date", "date"]) or
            (
                self._has_any(text, ["when", "kanus", "kanus-a"]) and
                self._has_any(text, ["result", "results", "exam result", "cat result", "admission result", "examination result"])
            )
        ) and self._has_any(text, ["admission", "buksu cat", "cat", "exam", "examination", "test", "result", "results"])
        has_personal_cat_result_query = (
            not has_result_release_query and
            (
                self._has_any(text, [
                    "how do i know my cat score",
                    "how do i know my cat percentage",
                    "how to check my admission result",
                    "check my admission result",
                    "view my admission result",
                    "see my admission result",
                    "my cat score",
                    "my cat percentage",
                    "my cat result",
                    "my admission result",
                    "akong cat result",
                    "akong cat percentage",
                    "akong result",
                ]) or
                (
                    self._has_any(text, ["my", "akong", "nako"]) and
                    self._has_any(text, ["score", "percentage", "percent", "result", "results", "rating", "ror"]) and
                    self._has_any(text, ["cat", "buksu cat", "admission", "exam", "examination"])
                )
            )
        )
        has_cat_result_query = (
            has_personal_cat_result_query or
            (
                not has_result_release_query and
                self._has_any(text, [
                    "cat exam result", "buksu cat result", "show exam result",
                    "report of rating", "report rating", "ror", "where is show exam result",
                    "where to find report of rating", "nakapasar ba ko",
                    "pasar ba ko sa cat", "pasar na kos cat",
                ])
            ) or
            (
                not has_result_release_query and
                ("cat" in tokens or self._has_any(text, ["buksu cat"])) and
                self._has_any(text, ["result", "results", "passed", "pass", "nakapasar", "pasar", "tan aw", "tan-aw", "makita", "check"])
            )
        )
        has_exam_result = has_result and self._has_any(
            text,
            [
                "admission",
                "buksu cat",
                "cat",
                "college admission test",
                "admission test",
                "entrance exam",
                "exam",
                "examination",
                "test",
            ],
        )
        has_no_admission_slots = (
            (
                self._has_any(text, ["no available slots", "walay available slots", "wala nay slots", "no slots", "walay slot", "wala na bay bakante", "puno na ang slots"]) or
                (self._has_any(text, ["no", "wala", "walay"]) and self._has_any(text, ["slot", "slots", "schedule slots"]))
            ) and
            self._has_any(text, ["admission", "cat", "exam", "test", "portal", "main campus"])
        )
        has_main_campus_full = (
            self._has_any(text, ["main campus"]) and
            self._has_any(text, ["full", "puno", "no available slots", "wala nay slots", "wala nay slot", "no slots", "slots are full"])
        )
        has_additional_slots = self._has_any(text, [
            "additional slots", "add slots", "idugang nga slots", "naa pa bay idugang",
            "mo open pa ba", "open pa ba ang admission", "slots will open", "more slots",
        ])
        has_failed_cat_enrollment = (
            has_cat and
            has_enrollment and
            self._has_any(text, [
                "failed",
                "failed to pass",
                "did not pass",
                "didnt pass",
                "didn't pass",
                "wala nakapasar",
                "wala ko nakapasar",
                "napakyas",
                "mapakyas",
                "fail",
            ])
        )
        has_failed_admission_exam_next_step = (
            self._has_any(text, [
                "failed",
                "failed to pass",
                "faild",
                "faild to pass",
                "fail",
                "did not pass",
                "not pass",
                "didnt pass",
                "didn't pass",
                "didnot pass",
                "wala ko kapasar",
                "wala kapasar",
                "wala nakapasar",
                "wa ko kapasar",
                "napakyas",
                "mapakyas",
            ]) and
            self._has_any(text, [
                "admission",
                "admissions",
                "admission exam",
                "admission examination",
                "admission entrance exam",
                "admission entrance examination",
                "buksu admission exam",
                "buksu admission examination",
                "entrance exam",
                "entrance examination",
                "buksu entrance exam",
                "buksu entrance examination",
                "buksu cat",
                "cat exam",
                "cat examination",
            ]) and
            self._has_any(text, [
                "what should i do",
                "what do i do",
                "what to do",
                "unsa akong buhaton",
                "unsa buhaton",
                "unsay buhaton",
                "can i still enroll",
                "can still enroll",
                "still enroll",
                "still study",
                "naa pa bay chance",
                "naa pa ba koy chance",
                "chance",
                "help",
                "help me",
                "laing paagi",
                "another way",
            ])
        )
        has_failed_admission_enrollment_eligibility = (
            self._has_any(text, [
                "non passer",
                "nonpasser",
                "non-passer",
                "failed",
                "failed to pass",
                "faild",
                "faild to pass",
                "fail",
                "did not pass",
                "not pass",
                "didnt pass",
                "didn't pass",
                "didnot pass",
                "wala ko kapasar",
                "wala kapasar",
                "wala nakapasar",
                "wa ko kapasar",
                "wa kapasar",
                "wa mopasar",
                "wala mopasar",
                "wakapasar",
                "napakyas",
                "mapakyas",
                "below cutoff",
                "below cut off",
                "did not meet",
                "did not reach",
                "wala nakaabot",
                "wala kaabot",
            ]) and
            self._has_any(text, [
                "admission",
                "admissions",
                "admission exam",
                "admission examination",
                "admission entrance exam",
                "admission entrance examination",
                "buksu admission exam",
                "buksu admission examination",
                "entrance exam",
                "entrance examination",
                "buksu entrance exam",
                "buksu entrance examination",
                "buksu cat",
                "cat exam",
                "cat examination",
                "cat score",
                "cat percentage",
                "percentage score",
                "cutoff score",
                "cut off score",
                "non passer",
                "nonpasser",
                "non-passer",
            ]) and
            self._has_any(text, [
                "allow",
                "allowed",
                "accept",
                "accepted",
                "admit",
                "admitted",
                "enroll",
                "enrollment",
                "enrolled",
                "still enroll",
                "can enroll",
                "get course",
                "get courses",
                "still get course",
                "still get courses",
                "ma enroll",
                "maka enroll",
                "mo enroll",
                "mo-enroll",
                "mudawat",
                "modawat",
                "mo dawat",
                "gadawat",
                "dawat",
                "dawaton",
                "madawat",
                "pwede",
                "pwedi",
                "pwede pa",
                "pwedi pa",
                "maka sulod",
                "makasulod",
            ])
        )
        has_pass_notice = self._has_any(
            text,
            [
                "pass notice",
                "passed notice",
                "pass notification",
                "passed notification",
                "know if i passed",
                "know if passed",
                "how do i know i passed",
                "how do i know if i passed",
            ],
        )
        has_add_drop_subject = (
            self._has_any(text, ["add drop subject", "add and drop subject", "adding and dropping subject"]) or
            (self._has_any(text, ["add subject", "adding subject"]) and self._has_any(text, ["drop subject", "dropping subject"])) or
            (self._has_any(text, ["add subject", "drop subject"]) and self._has_any(text, ["subject", "course"]))
        )
        has_late_enrollment = has_enrollment and self._has_any(
            text,
            [
                "late enrollment",
                "late enrolment",
                "late enroll",
                "late enrol",
                "enroll late",
                "enrol late",
                "allowed late",
                "late allowed",
                "still enroll late",
                "still enrol late",
                "missed enrollment",
                "missed enrolment",
                "missed the enrollment",
                "missed the enrolment",
                "missed enrollment deadline",
                "missed enrolment deadline",
                "after enrollment deadline",
                "after enrolment deadline",
                "past enrollment deadline",
                "past enrolment deadline",
                "first week of classes",
            ],
        )
        has_enrollment_time = has_enrollment and self._has_any(text, ["time", "when", "schedule", "day", "date", "deadline"])
        has_school_year_class_start = (
            self._has_any(text, ["start", "starts", "sugod", "magsugod", "mag sugod", "opening", "open"]) and
            self._has_any(
                text,
                [
                    "school year",
                    "academic year",
                    "class",
                    "classes",
                    "klase",
                    "klasi",
                    "buksu school year",
                    "opening of classes",
                    "start of classes",
                    "first day of class",
                    "first day of classes",
                ],
            ) and
            not has_enrollment
        )
        has_enrollment_process = has_enrollment and self._has_any(
            text,
            [
                "process",
                "steps",
                "step by step",
                "step-by-step",
                "guide",
                "help me enroll",
                "help me to enroll",
                "help me for my enrollment",
                "help with my enrollment",
                "help for enrollment",
                "help enroll",
                "enrollment guide",
                "full process",
                "send enrollment guide",
                "how to enroll",
                "how can i enroll",
                "what should i do",
                "what to do to enroll",
                "unsaon pag enroll",
                "enrollment process",
            ],
        )
        has_course_code_pattern = bool(re.search(
            r"\b("
            r"bs|ba|ab|beed|beced|bsed|bsit|bset|bsat|bsft|bsemc|bsn|bshm|"
            r"bsa|bsba|bpa|bped|bsdc|bses|bsbio|bsmath"
            r")\b",
            text,
        ))
        has_course_specific_enrollment_help = has_enrollment and (
            has_course_code_pattern or
            self._has_any(
                text,
                [
                    "taking bachelor",
                    "taking the bachelor",
                    "taking bs",
                    "taking ba",
                    "course is",
                    "i take bachelor",
                    "i take bs",
                    "i take ba",
                    "for my course",
                    "in bachelor",
                    "bs biology",
                    "bs criminology",
                    "bs psychology",
                    "bs computer science",
                    "bs social work",
                    "bs tourism management",
                    "bs office administration",
                    "bs economics",
                    "bs agricultural education",
                    "bs library and information science",
                    "bachelor of arts",
                    "bachelor of science",
                ],
            )
        )
        has_sias = self._has_any(text, ["sias", "student information system"])
        has_student_portal = self._has_any(text, ["student portal", "student website", "portal account", "portal password"])
        has_login_wording = self._has_any(text, ["login", "log in", "sign in", "signin", "sign-in", "access", "open"])
        has_password_wording = self._has_any(text, ["password", "passcode", "forgot password", "forget password", "forgot my password", "reset password", "change password", "recover password"])
        has_account_creation_wording = self._has_any(
            text,
            [
                "create account",
                "create admission account",
                "make account",
                "make admission account",
                "register account",
                "register admission account",
                "sign up",
                "signup",
                "registration account",
                "buhat account",
                "buhat sa admission",
                "buhat admission account",
                "himo account",
                "himo admission account",
            ],
        )
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
        has_dental = self._has_any(text, ["dental", "oral examination", "oral exam", "dentist"])
        raw_has_student_id = self._has_any(raw_normalized, ["student id", "school id"])
        raw_has_library_id = self._has_any(raw_normalized, ["library id", "library card"])
        raw_has_cor = self._has_any(raw_normalized, ["cor", "certificate of registration"])
        has_id_validation = has_validation and not has_dental and (
            "id" in raw_tokens or raw_has_student_id
        )
        has_cor_validation = has_validation and raw_has_cor
        has_generic_validation_question = (
            has_validation and
            not has_id_validation and
            not has_cor_validation and
            not has_dental and
            not self._has_any(raw_normalized, ["enroll", "enrollment", "enrol", "enrolment"])
        )
        has_non_paying_student = self._has_any(text, ["non paying student", "non-paying student", "nonpaying student", "non paying students", "non-paying students", "nonpaying students"])
        has_paying_student = bool(re.search(r"(?<!non )(?<!non-)\bpaying students?\b", text)) or self._has_any(text, ["paying and non paying", "paying vs non paying"])
        has_institutional_email = self._has_any(
            text,
            [
                "institutional email",
                "institutional email address",
                "institutional gmail",
                "student email",
                "student email address",
                "official student email",
                "official buksu student email",
                "institutional account",
                "buksu email",
                "buksu gmail",
                "email login",
                "gmail account",
                "email with student id number",
                "email containing student id",
                "school email account",
            ],
        )
        has_find_institutional_account = has_institutional_email and self._has_any(
            text,
            [
                "find",
                "see",
                "view",
                "get",
                "getting",
                "where",
                "where do i get",
                "where can i find",
                "where can i see",
                "how do i get",
                "how to get",
                "how to find",
                "how to see",
                "process of getting",
                "tutorial",
                "tutorial process",
                "help me find",
                "pangita",
                "makita",
                "makit-an",
                "makuha",
                "asa",
                "aha",
                "asa mani makuha",
                "asa manako ni makita",
                "aha nako makuha",
                "tabangi",
            ],
        ) and not self._has_any(
            text,
            [
                "forgot",
                "forget",
                "forgot password",
                "reset",
                "recover",
                "cannot login",
                "can't login",
                "cant login",
                "cannot log in",
                "can't log in",
                "cant log in",
                "not working",
                "error",
                "problem",
            ],
        )
        has_admission_portal = self._has_any(text, ["admission portal", "admission website", "admission account", "admissions portal", "admissions website"])
        has_admission_account = self._has_any(text, ["admission account", "admission password", "change password", "find account"]) or has_admission_portal
        has_generic_admission_account_lookup = (
            self._has_any(text, ["admission account"]) and
            self._has_any(text, ["see", "find", "open", "access", "login", "log in", "where", "how", "help"]) and
            not self._has_any(text, ["password", "change password", "reset password"]) and
            not self._has_any(text, ["result", "results", "show exam result", "report of rating", "ror"])
        )
        has_admission_password = (
            self._has_any(text, [
                "admission password",
                "admission account password",
                "change admission password",
                "change admission account password",
                "reset admission password",
                "reset admission account password",
                "forgot admission password",
                "forgot admission account password",
            ]) or
            (has_admission_portal and has_password_wording) or
            (
                self._has_any(text, ["admission", "admissions"]) and
                has_password_wording and
                self._has_any(text, ["reset", "change", "forgot", "forget", "recover", "password"])
            )
        )
        has_admission_password_recovery = (
            has_admission_password and
            self._has_any(raw_normalized, ["forgot", "forget", "reset", "recover", "cannot remember", "cant remember", "can't remember", "nakalimot", "nalimot", "dili nako mahinumduman", "di nako mahinumduman", "wala ko kahinumdom"])
        )
        has_generic_student_portal_login = has_student_portal and has_login_wording and not has_sias and not has_admission_portal
        has_generic_student_portal_password = has_student_portal and has_password_wording and not has_sias and not has_admission_portal
        has_sias_account_lookup = has_sias and self._has_any(
            text,
            [
                "get my account",
                "get account",
                "find account",
                "where do i get",
                "where can i get",
                "where is my account",
                "where is my password",
                "account",
                "asa mani na password",
                "aha nako makuha",
                "aha manako na makita",
                "makita akong password",
                "makuha ako password",
            ],
        )
        has_admission_login_request = (
            has_login_wording and
            self._has_any(text, ["admission", "admissions"]) and
            not has_password_wording and
            not has_account_creation_wording and
            not self._has_any(raw_normalized, ["test", "exam", "cat", "result", "results", "application schedule"])
        )
        has_test_permit = self._has_any(text, ["test permit", "exam permit", "permit"])
        has_test_permit_issue = has_test_permit and self._has_any(text, ["corrupt", "corrupted", "broken", "error", "invalid", "not opening", "cannot open", "can't open", "missing", "download"])
        has_walkin_exam = self._has_any(text, ["walkin", "walk in", "walk-in", "walk entrance exam"]) and self._has_any(text, ["entrance exam", "admission test", "buksu cat", "exam", "examination"])
        has_missing_admission_documents = (
            self._has_any(text, ["missing admission document", "missing admission documents", "incomplete admission document", "incomplete admission documents"]) or
            (self._has_any(text, ["missing", "incomplete", "forgot", "remaining", "kulang"]) and self._has_any(text, ["admission", "application"]) and self._has_any(text, ["document", "documents", "requirement", "requirements"]))
        )
        has_admission_portal_error = (
            self._has_any(text, ["admission", "portal", "admission website", "admission site"]) and
            self._has_any(text, ["not working", "error", "cannot access", "can't access", "down", "dili mo work", "di mo work"])
        )
        has_denied_admission_application = (
            self._has_any(text, ["denied", "rejected", "gi deny"]) and
            self._has_any(text, ["admission", "application", "buksu cat"])
        )
        has_admission_exam_registration = (
            has_cat and
            self._has_any(text, ["apply", "maka apply", "register", "registration", "schedule", "take", "mag register", "mag apply", "pag register"]) and
            not self._has_any(text, ["reschedule", "change schedule", "missed"])
        )
        has_admission_application_schedule = (
            (has_cat or self._has_any(text, ["admission application", "admission test application"])) and
            self._has_any(text, ["when", "kanus", "kanus-a", "open", "mag open", "schedule", "date"]) and
            self._has_any(text, ["application", "apply", "buksu cat", "admission"]) and
            not self._has_any(text, ["how to schedule", "how can i schedule", "how do i schedule", "unsaon pag schedule"])
        )
        has_admission_deadline_query = (
            self._has_any(text, ["deadline", "close", "closing", "mag close", "last day", "until when", "kanus kutob"]) and
            self._has_any(text, ["admission", "portal", "application", "cat", "exam", "test"])
        )
        has_application_status_query = (
            (
                self._has_any(text, [
                    "application status", "status application", "status of application",
                    "ma-check", "ma check", "check kung nadawat", "na-accept akong application",
                    "accepted my application", "application accepted", "nadawat akong application",
                    "pagkahibalo kung na-accept", "know if accepted", "approved akong", "approved my application",
                ]) and
                self._has_any(text, ["admission", "application", "buksu cat", "cat"])
            ) or
            (
                self._has_any(text, ["pagkahibalo", "ma-check", "ma check", "check"]) and
                self._has_any(text, ["na accept", "na-accept", "accepted", "nadawat", "approved"])
            )
        )
        has_admission_preferred_course_change = (
            self._has_any(text, [
                "change",
                "change my",
                "edit",
                "update",
                "replace",
                "switch",
                "allowed",
                "gi allowed",
                "pwede",
                "ma change",
                "mo change",
                "ilis",
                "ilisan",
                "ilisdan",
                "maka ilis",
                "mag ilis",
            ]) and
            self._has_any(text, [
                "preferred course",
                "course choice",
                "chosen course",
                "selected course",
                "admission course",
                "admission courses",
                "my course",
                "akong course",
                "imong course",
                "change my course",
                "change course",
                "course after",
                "course biskan",
                "course bisan",
                "course listed",
                "course in admission",
                "course sa admission",
                "courses sa akong admission",
                "course sa akong admission",
                "course sulod sa admission",
                "course sulod sa admission application",
                "course sa sulod sa admission",
                "course sa sulod sa admission application",
                "course inside admission",
                "course inside admission application",
                "course inside my admission application",
                "course sa admission application",
                "course in my admission application",
            ]) and
            (
                self._has_any(text, [
                    "admission application",
                    "admission website",
                    "admission portal",
                    "admission account",
                    "admission examination",
                    "admission exam",
                    "entrance exam",
                    "entrance examination",
                    "buksu cat",
                    "cat result",
                    "after passing",
                    "after examination",
                    "after exam",
                    "after taking",
                    "humana",
                    "human na",
                    "after sa cat",
                    "humana kog",
                    "humana ko og",
                    "human kog",
                    "human ko og",
                ]) or has_admission
            )
        )
        has_cat_mobile_application = (
            self._has_any(text, ["phone", "cellphone", "mobile", "cp", "cell phone"]) and
            not self._has_any(text, ["class", "classroom", "during class", "in class", "sa klase", "sulod sa classroom"]) and
            (
                (
                    self._has_any(text, ["cat", "admission", "buksu cat", "admission portal", "admission website", "apply cat", "cat application", "portal"]) and
                    self._has_any(text, ["apply", "application", "portal", "website", "upload", "documents", "allowed", "gamit", "using"])
                ) or
                self._has_any(text, ["can i apply using my mobile phone", "apply using my mobile phone", "apply using phone"])
            )
        )
        has_reschedule_entrance_exam = (
            self._has_any(text, ["reschedule", "change schedule", "change exam schedule"]) and
            self._has_any(text, ["entrance exam", "admission test", "buksu cat", "cat", "exam", "examination", "test"])
        )
        has_missed_cat_schedule = (
            (
                bool(tokens.intersection({"missed", "absent"})) or
                self._has_any(text, ["missed buksu cat schedule", "missed cat schedule", "missed exam schedule", "wala kaabot", "did not take"])
            ) and
            self._has_any(text, ["buksu cat", "cat", "admission test", "entrance exam", "exam schedule", "test schedule"])
        )
        has_cat_definition_query = (
            (has_cat or self._has_any(text, ["college admission test"])) and
            self._has_any(text, ["what is", "definition", "meaning", "para unsa", "unsa ang", "pasabot"]) and
            not self._has_any(text, ["process", "steps", "apply", "register", "registration", "schedule", "date", "reschedule", "missed", "test permit", "error"])
        )
        has_cat_calculator_policy = (
            has_cat and
            self._has_any(text, ["calculator", "calcu", "scientific calculator"])
        )
        has_student_id = self._has_any(text, ["student id", "school id"])
        has_library_id = self._has_any(text, ["library id", "library card"])
        has_good_moral = self._has_any(text, ["good moral", "good moral certificate", "certificate of good moral"])
        has_exam_fee_query = (
            (
                has_cat or
                has_admission or
                self._has_any(text, ["buksu examination", "buksu cat", "buksu college admission test"]) or
                (
                    intent == "ask_fee" and
                    self._has_any(text, ["buksu"]) and
                    not (has_student_id or has_library_id or has_enrollment or has_good_moral)
                )
            ) and
            self._has_any(text, ["fee", "fees", "payment", "pay", "bayad", "bayaran", "bayad ang", "mo bayad"])
        )
        has_second_courser_cat_fee = (
            has_second_courser and
            self._has_any(text, ["fee", "fees", "payment", "pay", "bayad", "bayaran", "cat", "exam", "test"])
        )
        has_application_next_step = self._has_any(text, [
            "after submit", "after submitting", "human nako submit", "nahuman na nako submit",
            "submitted my application", "what next after application", "next step after applying",
            "application next step", "online application unsa", "akong online application unsa",
        ])
        has_undergraduate_enrollment_requirements = (
            has_enrollment and
            self._has_any(text, ["undergraduate", "first year", "freshman", "transferee"]) and
            self._has_any(text, ["requirement", "requirements", "document", "documents", "documentary"])
        )
        has_online_enrollment_button = (
            has_enrollment and
            self._has_any(text, ["apply enrollment button", "apply enrollment", "enrollment button", "where is apply"])
        )
        has_enrollment_application_approval = (
            has_enrollment and
            self._has_any(text, ["approval", "approved", "evaluator", "application is approved", "application approved"])
        )
        has_returning_student = self._has_any(text, ["returning student", "returning students", "old student", "old students"])
        has_office_hours = self._has_any(text, ["office hours", "office schedule", "buksu office", "university office"])
        has_calendar = self._has_any(text, ["academic calendar", "university calendar", "official calendar", "semester calendar", "school calendar"]) or (
            self._has_any_token(text, ["calendar"]) and
            (self._has_any(text, ["buksu", "university", "school", "semester"]) or intent == "ask_schedule")
        )
        has_weekend_visitor = (
            self._has_any(text, ["visitor", "visitors", "outsider", "outsiders", "open", "enter", "visit"]) and
            self._has_any(text, ["weekend", "saturday", "sunday"])
        )
        has_foundation_day = self._has_any(text, ["charter day", "foundation day", "founding anniversary", "anniversary celebration"])
        has_generic_buksu_contact = self._has_any(text, [
            "buksu contact", "contact buksu", "bukidnon state university contact",
            "contact number", "phone number", "telephone number", "official contact",
            "hotline",
        ]) and self._has_any(text, ["buksu", "bukidnon state university", "university"])
        has_university_worth_it = self._has_any(text, [
            "worth it", "should i study", "why choose buksu", "good school",
            "recommended", "worth studying", "freshmen choose", "okay ba mag study",
        ]) and not self._has_any(text, ["study place", "place to study", "place to review"])
        has_university_study_place = self._has_any(text, [
            "study place", "where can i study", "where to study", "place to study",
            "place to review", "quiet place", "study area", "mag study", "can i study in library",
        ]) and not has_university_worth_it
        has_buksu_location = (
            self._has_any(text, ["main campus", "buksu", "bukidnon state university", "university"]) and
            self._has_any(text, ["where", "location", "located", "address"]) and
            not has_university_study_place and
            not has_calendar and
            not has_generic_buksu_contact
        )
        has_campus_entry_wording = self._has_any(text, [
            "enter",
            "inter",
            "inside",
            "get inside",
            "go school",
            "go to school",
            "go buksu",
            "go to buksu",
            "go inside",
            "come school",
            "come to school",
            "attend",
            "sulod",
            "makasulod",
        ])
        has_civilian_attire = self._has_any(text, ["civilian", "civilian attire", "civilian clothes", "plain clothes", "regular clothes", "non uniform", "non-uniform", "no uniform"])
        has_pe_uniform_mention = self._has_any(text, [
            "pe uniform", "pe unifrom", "uniform pe", "unifrom pe",
            "physical education uniform", "pe clothes", "pe attire", "old pe", "daan nga pe", "daan na pe"
        ])
        has_uniform_policy = (
            self._has_any(text, ["uniform", "dress code", "not wearing uniform", "without uniform", "wearing uniform", "school uniform"]) or
            has_civilian_attire
        ) and not has_pe_uniform_mention
        has_specific_buksu_office_location = self._has_any(text, [
            "buksu president office",
            "president office",
            "presidential office",
            "office of the president",
        ])
        has_building_directory_query = (
            self._has_any(text, [
                "what offices", "which offices", "list of offices", "offices can be found",
                "offices inside", "rooms inside", "what rooms", "which rooms",
                "inside the", "found in", "under the", "under",
            ]) and
            self._has_any(text, [
                "building", "cob", "cot", "finance", "administrative", "administration",
                "admin", "new cot", "old cot", "cpag", "cas", "con",
            ])
        )
        has_location_office_building_query = (
            intent == "ask_location" and
            self._has_any(text, [
                "office", "building", "room", "registrar", "finance",
                "cpag", "cas", "cot", "cob", "coa", "coe", "con",
                "dean", "sbo", "student body organization",
            ])
        )
        has_student_id = self._has_any(text, ["student id", "school id"])
        has_library_id = self._has_any(text, ["library id", "library card"])
        has_lost_student_id = has_student_id and self._has_any(text, ["lost", "lose", "replace", "replacement", "nawala"])
        has_no_id_campus_entry = (
            (
                has_student_id or
                (
                    "id" in raw_tokens and
                    not raw_has_library_id and
                    has_campus_entry_wording
                ) or
                self._has_any(text, [
                    "no id",
                    "without id",
                    "without student id",
                    "dont have id",
                    "don't have id",
                    "do not have id",
                    "dont have my id",
                    "don't have my id",
                    "do not have my id",
                    "dont have student id",
                    "don't have student id",
                    "do not have student id",
                    "no physical id",
                    "physical id",
                    "forgot my id",
                    "forgot student id",
                    "left my id",
                    "left my student id",
                    "nabilin akong id",
                    "nabilin akong student id",
                    "way id",
                    "wakoy id",
                    "wa koy id",
                    "wala koy id",
                    "wakoy student id",
                    "wa koy student id",
                    "wala koy student id",
                    "walay id",
                    "walay student id",
                    "wala pakoy id",
                    "wala pa koy id",
                    "wala pakoy student id",
                    "wala pa koy student id",
                    "nawala akong id",
                    "nawala akong student id",
                    "lose my id",
                    "lost my id",
                    "lost student id",
                ])
            ) and
            (
                has_campus_entry_wording or
                self._has_any(text, [
                    "allowed to enter",
                    "allowed to go inside",
                    "allowed to go buksu",
                    "allowed to go to buksu",
                    "allowed to go to school",
                    "can i enter",
                    "can i go inside",
                    "can i go buksu",
                    "can i go to buksu",
                    "can i still go",
                    "can i still go to school",
                    "allowed to attend",
                    "maka sulod",
                    "makasulod",
                    "mosulod",
                    "maka sulod sa buksu",
                    "makasulod sa buksu",
                    "sulod sa campus",
                    "inside campus",
                ])
            )
        )
        has_library_books = self._has_any(text, [
            "borrow books", "borrow book", "return books", "return book",
            "get books", "get book", "getting books", "getting book",
            "get library books", "getting library books",
            "return library books", "return borrowed books", "late books", "late book",
            "unreturned book", "unreturned books", "library resources",
            "available books", "book availability", "books available",
            "late return book", "late return books", "overdue book", "overdue books",
        ])
        has_library_resources_query = (
            self._has_any(text, ["library resources", "library resource", "buksu library resources", "digital library resources"]) or
            (self._has_any(text, ["library"]) and self._has_any(text, ["resource", "resources"]))
        )
        has_library_hours = (
            not has_library_id and
            self._has_any(text, ["library"]) and
            self._has_any(text, ["hours", "schedule", "open", "close", "closing time", "opening hours", "oras", "kanus"])
        )
        has_book_penalty = self._has_any(text, ["penalty", "fine", "fines", "late return", "unreturned", "overdue"])
        has_good_moral = self._has_any(text, ["good moral", "good moral certificate", "certificate of good moral"])
        has_student_organization = self._has_any(
            text,
            [
                "student organization",
                "student organizations",
                "student club",
                "student clubs",
                "clubs i can join",
                "organization i can join",
                "organizations i can join",
                "active clubs",
                "active student organizations",
                "join student organization",
                "join student organizations",
                "sbo",
                "student body organization",
            ],
        )
        has_affirmative_action = (
            self._has_any(text, ["affirmative action", "aap", "diversity and inclusion"]) or
            (
                self._has_any_token(text, ["affirmative"]) and
                self._has_any(text, ["apply", "process", "how", "help", "tabangi", "unsaon", "what is", "program"])
            ) or
            has_failed_admission_exam_next_step or
            (
                has_cat and
                self._has_any(
                    text,
                    [
                        "failed",
                        "fail",
                        "did not pass",
                        "not pass",
                        "didnt pass",
                        "didn't pass",
                        "wala ko kapasar",
                        "wala kapasar",
                        "wala nakapasar",
                        "wa ko kapasar",
                        "failed admission exam",
                        "failed buksu cat",
                    ],
                )
            )
        )
        has_masters = self._has_any(text, ["master", "masters", "master's", "masteral", "graduate program", "graduate studies"])
        has_inc = self._has_any(text, ["inc form", "inc grade", "incomplete"]) or self._has_any_token(text, ["inc"])
        has_registrar = self._has_any(text, ["registrar"])
        has_fda = self._has_any(text, ["fda", "failure due to absences"])
        has_deans_list = self._has_any(text, ["deans list", "dean's list", "dean honor list", "dean lister", "deans lister"])
        has_college_honors = self._has_any(text, ["college honors", "college honor", "college honor grades", "college honors grades"])
        has_university_scholar = self._has_any(text, ["university scholar"])
        has_graduation = self._has_any(text, ["graduation", "graduating", "graduate clearance", "grad application", "grad clearance"])
        has_withdraw_enrollment = self._has_any(text, ["withdraw enrollment", "withdraw my enrollment", "voluntary withdrawal", "cancel enrollment", "drop enrollment", "withdrawal form", "enrollment withdrawal"])
        has_tor = self._has_any_token(text, ["tor"]) or self._has_any(text, ["transcript of records", "transcript"])
        has_tor_contact = has_tor and self._has_any(text, ["contact", "phone", "number", "email", "inquiry", "who to contact", "kinsa contact"])
        has_tor_request = has_tor and self._has_any(text, ["request", "get", "graduate", "graduates", "after graduation", "requirements", "unsaon", "what is", "meaning"])
        has_registrar_schedule = has_registrar and self._has_any(text, ["schedule", "office hours", "hours", "open", "close", "closing time", "oras", "kanus", "visit"])
        has_request_cor_document = (
            has_cor and
            intent in {"ask_document", "ask_process", "ask_general_info"} and
            self._has_any(text, ["request", "get", "download", "copy", "where", "kuha", "makuha", "unsaon", "asa"])
        )
        has_failed_subject = self._has_any(text, ["failed subject", "fail a subject", "fail one subject", "failing subject", "retake failed subject", "bagsak subject", "nabagsak"])
        has_academic_probation = self._has_any(text, ["academic probation", "probation meaning", "student probation", "probation policy", "probation requirements"])
        has_grading_system = self._has_any(text, [
            "grading system", "grade system", "gwa grading", "grade scale",
            "buksu grades", "grade computed", "how is grade computed",
            "passing grade", "what does 5.0 mean", "inc mean in grades",
            "5 0 mean", "5.0 mean",
        ])
        has_access_grades = self._has_any(text, [
            "access grades", "see my grades", "see grades", "check grades",
            "view grades", "final grades", "tan aw grades", "asa makita grades",
        ])
        has_end_semester = self._has_any(text, [
            "semester end", "semester ending", "end of semester", "end of sem",
            "end semester", "finals end", "end sa semester", "end of classes",
        ])
        has_inc_form = has_inc and self._has_any_token(text, ["form", "forms"])
        has_inc_consequence = has_inc and self._has_any(text, ["consequence", "not completed", "dont comply", "don't comply", "expires", "expired", "become failed", "dili ma complete"])
        has_inc_solution = has_inc and self._has_any(text, ["complete", "comply", "solution", "remove", "what to do", "unsaon"])
        has_attendance_requirement = self._has_any(text, ["attendance requirement", "attendance policy", "absences allowed", "seven absences", "7 absences", "absence limit"])
        has_subject_overload = self._has_any(text, ["subject overload", "overload subject", "overload units", "units overload", "academic overload", "overloading units", "extra units"]) or (
            self._has_any(text, ["overload"]) and self._has_any(text, ["unit", "units", "subject", "subjects", "graduating", "approval"])
        )
        has_overload_policy = has_subject_overload and self._has_any(text, [
            "policy", "how many", "requirements", "approval", "can i",
            "graduating", "who", "who can", "who is allowed", "allowed", "eligible",
            "qualified", "qualify", "kinsa pwede",
        ])
        has_fda_solution = has_fda and self._has_any(text, [
            "what should i do", "what to do", "next step", "next steps",
            "received", "got", "have fda", "solve", "solution", "fix",
            "handle", "unsaon", "buhaton", "naay fda",
        ])
        has_thesis_topic = self._has_any(text, ["thesis topic", "capstone topic", "research topic", "choose thesis", "choose capstone"])
        has_thesis_panel = self._has_any(text, ["thesis panel", "panelists", "defense panel", "panel sa defense"])
        has_thesis_failure = self._has_any(text, ["fail thesis defense", "failed thesis defense", "failed capstone defense", "fail defense", "defense fails", "retake thesis defense"])
        has_graduation_clearance = self._has_any(text, ["graduation clearance", "graduating clearance", "university clearance", "graduate clearance"]) and self._has_any(text, ["requirement", "requirements", "document", "documents", "clearance form"])
        has_ict = self._has_any_token(text, ["ict", "ictsu"]) or self._has_any(text, ["information communications technology", "wifi", "wi-fi"])
        has_clinic = self._has_any(text, ["clinic", "medical clinic", "health services"])
        has_medical_certificate = self._has_any(text, ["medical certificate", "medical cert", "clinic certificate", "certificate for ojt", "certificate for intramural"])
        has_tooth_extraction = self._has_any(text, ["tooth extraction", "extract tooth", "extract a tooth", "tooth removal", "remove tooth", "paibot ngipon", "ibot ngipon"])
        has_dental_referral_medicine = self._has_any(text, ["referral dispensing", "dispensing of medicine", "dental medicine", "prescription slip", "referral medicine", "medicine dispensing", "get medicine from dental", "dental referral"])
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
        has_explicit_college_name = (
            bool(tokens.intersection({"cas", "cob", "cot", "con", "coe", "coa", "cpag"})) or
            self._has_any(
                text,
                [
                    "college of arts and sciences",
                    "college of business",
                    "college of technology",
                    "college of technologies",
                    "college of nursing",
                    "college of education",
                    "college of law",
                    "college of public administration",
                    "public administration and governance",
                ],
            )
        )
        has_college_course_list_query = (
            has_explicit_college_name and
            self._has_any(text, ["course", "courses", "program", "programs", "offer", "offers", "offered", "under", "list"])
        )
        has_evening_classes = self._has_any(
            text,
            [
                "evening class",
                "evening classes",
                "night class",
                "night classes",
                "classes for working students",
                "working students",
                "working student",
            ],
        )
        has_training_course = self._has_any(text, ["internship", "ojt", "on the job", "prerequisite", "nstp", "rotc", "physical education", "course shifting", "program shifting"])
        has_pe_uniform = (
            self._has_any(text, [
                "pe uniform", "pe unifrom", "uniform pe", "unifrom pe",
                "physical education uniform", "buksu pe uniform", "buksu uniform pe"
            ]) or (
                self._has_any(text, ["pe clothes", "pe uniform clothes", "pe attire", "pe shirt", "pe t-shirt"]) and
                self._has_any(text, ["where", "get", "kuha", "makuha", "asa", "how", "unsaon", "request", "buy", "allowed", "use", "wear", "gamiton", "pwede", "pwedi", "daan", "old"])
            )
        )
        has_old_pe_uniform = (
            self._has_any(text, [
                "old pe", "old pe uniform", "old pe unifrom", "old uniform pe", "old uniform in pe",
                "previous pe", "previous pe uniform", "previous uniform pe",
                "daan nga pe", "daan na pe", "daan pe", "daan akong pe", "pe nako kay daan",
                "gamiton ang daan nga pe", "gamiton daan nga pe", "gamiton ang daan na pe",
                "pwedi rakaha gamiton ang daan", "pwede rakaha gamiton ang daan",
                "pwedi ba gamiton ang daan", "pwede ba gamiton ang daan",
                "pwedi raning daan", "pwede raning daan", "pwedi ba daan", "pwede ba daan",
                "okay ra ba daan", "okay rakaha daan", "okay rakaha ni daan",
                "daan na pe", "daan nga physical education",
                "allowed to use old pe", "allowed to wear old pe", "allowed to use the old pe",
                "allowed to use the old uniform pe", "allowed to use the old pe uniform",
                "allowed to wear the old pe", "allowed to wear old pe uniform",
                "can i use my old pe", "can i use old pe", "can i still use my old pe",
                "can i wear old pe", "can i wear my old pe", "can i still wear my old pe",
                "is it allowed to use old pe", "is it allowed to use the old pe",
                "is it allowed to use the old uniform pe", "is it allowed to wear old pe",
                "jogging pants and white shirt", "jogging pants for pe", "jogging pants in pe",
                "wear jogging pants in pe", "wear jogging pants for pe", "jogging pants",
                "white shirt for pe", "white shirt in pe", "white upper for pe", "white upper in pe",
                "white upper for physical education", "white shirt for physical education",
                "no pe uniform yet", "walay pe uniform", "wala pay pe uniform"
            ]) or (
                (
                    self._has_any(text, ["pe", "physical education"]) or
                    self._has_any(text, ["uniform", "unifrom", "attire", "jogging pants"])
                ) and (
                    self._has_any(text, ["old", "previous", "daan", "karaan", "dati", "used", "jogging", "pants", "white"]) and
                    self._has_any(text, ["pe", "physical education", "uniform", "unifrom", "pants", "shirt", "jogging", "upper"])
                ) and (
                    self._has_any(text, ["allowed", "allow", "use", "using", "wear", "wearing", "still", "pwede", "pwedi", "gamiton", "isuot", "sul-ob", "okay", "ok", "rakaha", "ra ba", "raba", "what if", "kung"])
                )
            )
        )
        has_college = (
            self._has_any(text, ["college", "colleges"]) or
            self._has_any_token(text, ["cas", "cob", "cot", "con", "coe", "cpag", "coa", "law"])
        )
        has_slot_word = (
            self._has_any_token(text, ["slot", "slots", "bakanti", "bakante"]) or
            self._has_any(text, [
                "slot left", "slots left", "available slot", "available slots",
                "open slots", "slots available", "free slots", "existing slots",
                "pilay bakanti", "naa pay slot", "naa pay slots", "naapay slot",
                "naapay slots", "napay bakanti", "naapay bakanti", "naapay bakante",
            ])
        )
        has_course_slot_subject = (
            has_college or
            self._has_any_token(text, ["ba", "ab", "bs"]) or
            self._has_any_token(text, ["cas", "cot", "cob", "con", "coe", "coa"]) or
            self._course_route(text, intent, has_it_program=has_it_program) is not None or
            self._has_any(text, [
                "course slot",
                "course slots",
                "courses with slots",
                "courses that still have slots",
                "courses still have slots",
                "courses have slots",
                "courses with available slots",
                "courses with open slots",
                "courses has a free slots",
                "courses have free slots",
                "courses has existing slots",
                "courses have existing slots",
                "list of course that has existing slots",
                "list of course that still have slots",
                "list of courses that still have slots",
                "course in buksu that still have slots",
                "course do buksu that have slot",
                "any course that has a slot",
                "courses ang naay slots",
                "course ang naay slots",
                "courses nga naay slots",
                "course nga naay slots",
                "mga course nga naay slots",
                "mga course nga naay bakante",
                "course nga daghan pag slot",
                "course nga naa pay slots",
                "course nga naa pay slot",
                "courses nga naa pay slots",
                "courses nga naa pay slot",
                "course nga naapay bakanti",
                "course na bakanti",
                "course nga naay available",
                "ba philo",
                "ba eco",
                "bsit",
                "bset",
                "bsat",
                "bsft",
                "bsemc",
                "bs multimedia",
                "bsn",
                "bshm",
                "bpa",
                "public administration",
                "bachelor of public administration",
                "law",
                "law course",
                "college of law",
                "juris doctor",
                "juris doctor program",
            ])
        )
        has_course_slot_query = has_slot_word and has_course_slot_subject
        has_dormitory = self._has_any(text, ["dormitory", "dormitories", "dorm", "dorms", "mahogany", "rubia", "kilala"])
        has_classroom_food = (
            bool(raw_tokens.intersection({"eat", "eating", "food", "snack", "kaon", "mokaon", "mukaon", "pagkaon"})) or
            self._has_any(text, ["can i eat", "eat inside", "eating inside"])
        )
        has_classroom = (
            self._has_any(
                text,
                [
                    "classroom",
                    "classroom policy",
                    "classroom policies",
                    "class rules",
                    "in class",
                    "during class",
                    "in classroom",
                    "inside classroom",
                    "sulod sa classroom",
                    "sulod sa klase",
                    "sa klase",
                    "assignment",
                    "assignments",
                    "homework",
                    "google classroom",
                    "class concern",
                    "class concerns",
                    "issue with instructor",
                    "concern with teacher",
                ],
            ) or
            (
                self._has_any(text, ["class", "klase"]) and
                self._has_any(text, ["policy", "policies", "rule", "rules", "concern", "concerns", "problem", "issue", "schedule", "section", "phone", "food", "eat"])
            )
        ) or has_classroom_food
        has_phone_in_class = (
            self._has_any(text, ["phone", "cellphone", "mobile phone", "cell phone", "gadget"]) or
            "cp" in raw_tokens
        ) and self._has_any(text, ["class", "classroom", "during class", "in class", "sulod sa classroom", "sa klase"])
        has_class_schedule = self._has_any(
            text,
            [
                "class schedule",
                "schedule of class",
                "schedule for class",
                "change my class schedule",
                "change class schedule",
                "check my class schedule",
                "check class schedule",
                "check schedule",
                "adjust class schedule",
                "adjust my schedule",
                "class schedule concern",
                "schedule concern",
                "schedule adjustment",
                "schedule adjustment help",
                "schedule in cor",
                "my cor schedule",
                "subject schedule",
                "where can i see my schedule",
                "where to find subject schedule",
                "asa makita akong schedule",
                "balhin schedule",
                "change section",
                "change my section",
                "section change",
                "transfer section",
                "section transfer",
                "balhin section",
                "schedule conflict",
                "class schedule conflict",
                "section conflict",
            ],
        )
        has_section_change = self._has_any(text, ["change section", "change my section", "section change", "transfer section", "section transfer"]) or (
            self._has_any(text, ["section"]) and self._has_any(text, ["conflict", "schedule conflict", "change", "transfer", "balhin", "balhin section"])
        )
        has_shift_to_another_course = (
            self._has_any(text, ["shift to another course", "shift to another program", "shift course", "shift program", "change course", "change program", "transfer to another course"]) and
            self._has_any(text, ["how", "process", "next semester", "next school year", "second semester", "when", "unsaon", "kanus"])
        )
        has_specific_course_passing_grade = (
            self._has_any(text, ["passing grade", "retention grade", "culling grade", "grade required to stay", "required to stay in program"]) and
            (
                self._course_route(text, intent, has_it_program=has_it_program) is not None or
                self._has_any(text, ["specific course", "course passing", "my course", "department", "program", "bsit", "nursing", "accountancy", "bachelor"])
                or self._has_any(text, ["passing grade course", "passing grade sa course"])
            ) and
            not self._has_any(text, ["cat", "buksu cat", "admission test", "entrance exam", "percentage", "percent"])
        )
        has_generic_passing_grade = (
            self._has_any(text, ["passing grade"]) and
            not has_specific_course_passing_grade and
            not self._has_any(text, ["cat", "buksu cat", "admission test", "entrance exam", "percentage", "percent"])
        )
        has_cutoff_score = (
            (
                self._has_any(
                    text,
                    [
                        "cut off",
                        "cut-off",
                        "cutoff",
                        "cut score",
                        "passing score",
                        "passing rate",
                        "percentage",
                        "percent",
                        "qualification percentage",
                        "entrance exam percentage",
                        "examination percentage",
                        "qualification score",
                        "cat score",
                        "buksu cat score",
                    ],
                ) or
                (self._has_any_token(text, ["cut"]) and self._has_any_token(text, ["score", "scores"])) or
                (self._has_any_token(text, ["passing"]) and self._has_any_token(text, ["score", "scores"]))
            ) and
            not self._has_any(text, ["result", "results", "ror"]) and
            not has_personal_cat_result_query
        )
        has_exam_day_requirement_wording = self._has_any(
            text,
            [
                "what to bring",
                "bring on exam",
                "bring on examination",
                "bring during exam",
                "bring during examination",
                "exam day",
                "examination day",
                "testing day",
                "test permit",
                "application form",
                "pencil",
                "eraser",
                "sharpener",
                "documents to bring",
                "requirements to bring",
                "kinahanglan nako dalhon",
                "kinahanglan dalhon",
                "dalhon sa adlaw",
                "dad-on sa adlaw",
                "dad on sa adlaw",
            ],
        )
        has_cat_score_requirement = (
            not has_exam_day_requirement_wording and
            not has_personal_cat_result_query and
            (
                has_cat or
                self._has_any(text, ["entrance exam", "admission examination", "buksu examination", "buksu percentage examination"])
            ) and
            (
                has_course or
                self._has_any(text, ["percentage", "percent", "passing rate", "passing score", "score", "cutoff", "cut off", "qualification"])
            ) and
            self._has_any(text, ["requirement", "requirements", "needed", "need", "percentage", "percent", "score", "passing", "qualification", "qualify"])
        )
        has_admin_person = (
            self._has_any(text, ["vice president", "vice presidents", "secretary", "board secretary"]) or
            self._has_any_token(text, ["vp", "vps"]) or
            self._has_any(
                text,
                [
                    "hazel jean",
                    "abejuela",
                    "carina joane",
                    "barroso",
                    "dante victoria",
                    "lincoln tan",
                ],
            )
        )
        has_dean_or_head = self._has_any(
            text,
            [
                "dean",
                "head",
                "chairperson",
                "program chair",
                "program chairs",
                "who manages",
                "who handles",
                "who leads",
            ],
        )
        has_major_english_program = self._has_any(text, ["major in english", "english major program", "english education program"])
        has_con_nursing = (
            self._has_any(text, ["nursing", "bsn", "college of nursing"]) or
            self._has_any_token(text, ["con"])
        )
        has_nursing_enrollment_support = has_con_nursing and self._has_any(
            text,
            [
                "enrollment", "enroll", "incoming", "first year", "waitlisted", "eligible",
                "requirement", "requirements", "acceptance slip", "forms", "medical",
                "laboratory", "lab", "immunization", "vaccine", "health center", "submit",
                "submission", "pass", "pasa", "ipasa", "pagpasa",
            ],
        )

        if facility_availability_intent:
            return facility_availability_intent

        if has_additional_slots:
            return "additional_slots"
        if has_main_campus_full:
            return "main_campus_full"
        if has_no_admission_slots:
            return "no_slots"
        if has_course_slot_query:
            return "course_slots"
        if has_phone_in_class:
            return "phone_use_in_class"
        if has_cat_mobile_application:
            return "apply_cat_using_mobile_phone"
        if has_application_status_query:
            return "status_application"
        if has_admission_preferred_course_change:
            return "change_preferred_course_admission_application"
        if has_application_next_step:
            return "application_next_step"
        if has_school_year_class_start:
            return "school_year_class_start_schedule"
        if has_test_permit_issue:
            return "test_permit_issue"
        if has_failed_admission_enrollment_eligibility:
            return "non_passer_enrollment_affirmative_action"
        if has_affirmative_action:
            return "affirmative_action"
        if (has_pass_notice or has_exam_result) and not has_cat_result_query:
            return "exam_results"
        if has_cat_result_query:
            return "cat_exam_result"
        if has_cat_calculator_policy:
            return "buksu_cat_calculator_policy"
        if has_missed_cat_schedule:
            return "missed_buksu_cat_schedule"
        if has_reschedule_entrance_exam or has_walkin_exam:
            return "reschedule_entrance_exam"
        if has_exam_day_requirement_wording:
            return "exam_requirements"
        if has_second_courser_cat_fee:
            return "second_courser_cat_application"
        if has_exam_fee_query:
            return "exam_fees"
        if has_admission_deadline_query:
            return "admission_application_deadline"
        if has_walkin_exam:
            return "reschedule_entrance_exam"
        if has_cat_definition_query:
            return "buksu_cat_definition"
        if has_missing_admission_documents:
            return "missing_admission_documents"
        if has_second_courser and self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "papers", "ipasa", "submit", "need", "needed"]):
            return "second_courser_requirements"
        if has_transferee and self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "papers", "modawat", "accept", "needed", "need", "bring"]):
            return "transferee_admission_requirements"
        if has_freshman and has_admission and self._has_any(text, ["requirement", "requirements", "document", "documents", "needed", "need", "bring", "apply"]):
            return "freshman_admission_requirements"
        if (
            has_book_penalty and
            self._has_any(text, ["book", "books", "library", "book center", "materials"])
        ):
            return "library_late_return_penalty"
        if has_library_resources_query:
            return "access_buksu_library_resources"
        if has_library_books or (
            self._has_any(text, ["book", "books"]) and
            self._has_any(text, ["available", "availability", "ask", "return", "borrow", "get", "getting", "process", "steps", "late", "penalty", "fine", "policy", "rules", "reserve", "how many"])
        ):
            if self._has_any(text, ["rule", "rules", "policy", "guideline", "guidelines", "how many", "many", "maximum", "reserve"]):
                return "library_borrowing_rules"
            if self._has_any(text, ["resource", "resources"]):
                return "access_buksu_library_resources"
            if self._has_any(text, ["return", "give back", "uli", "ibalik"]):
                return "library_return_books_process"
            if self._has_any(text, ["available", "availability", "have", "ask for available", "books naa", "naa bay books"]):
                return "library_available_books"
            return "library_borrow_books_process"
        if has_building_directory_query:
            return None
        if has_location_office_building_query and not (
            has_library_id or has_student_id or has_good_moral or has_pe_uniform_mention
        ):
            return None
        if has_evening_classes:
            return "evening_classes_working_students"

        if has_add_drop_subject:
            return "add_drop_subject"
        if has_withdraw_enrollment:
            return "withdraw_enrollment_policy"
        if has_tor_contact:
            return "contact_registrar_for_tor"
        if has_tor_request:
            return "tor_request_for_graduates"
        if has_registrar_schedule:
            return "registrar_office_schedule"
        if has_request_cor_document and not has_cor_validation:
            return "request_cor"
        if has_find_institutional_account:
            return "Find_Institutional_Account"
        if has_institutional_email:
            return "institutional_email_account"
        if has_generic_student_portal_password:
            return "__student_portal_password_clarification__"
        if has_generic_student_portal_login:
            return "__student_portal_login_clarification__"
        if has_sias and has_password_wording:
            return "sias_forgot_password"
        if has_sias_account_lookup:
            return "Find_Sias_Account"
        if has_sias and has_login_wording:
            return "sias_login_process"
        if has_admission_portal and has_account_creation_wording:
            return "admission_account_registration"
        if (has_admission_portal and has_login_wording and not has_password_wording) or has_admission_login_request:
            return "admission_portal_login"
        if has_failed_admission_enrollment_eligibility:
            return "non_passer_enrollment_affirmative_action"
        if has_affirmative_action:
            return "affirmative_action"
        if has_pass_notice or has_exam_result:
            return "exam_results"
        if has_generic_admission_account_lookup:
            return "__admission_account_clarification__"
        if has_admission_password_recovery:
            return "reset_portal_password_buksu"
        if has_admission_password:
            return "Change_Pass_admission"
        if has_student_organization:
            return "active_student_organizations_guidance"
        if has_class_schedule:
            if has_section_change:
                return "change_section_schedule_conflict"
            if self._has_any(text, ["help"]) and not self._has_any(text, ["concern", "process"]):
                return "class_schedule_help"
            if self._has_any(text, ["issue", "problem"]) and not self._has_any(text, ["change", "adjust", "balhin", "transfer"]):
                return "class_schedule_help"
            if self._has_any(text, ["change", "adjust", "balhin", "transfer"]) and not self._has_any(text, ["check"]):
                return "change_class_schedule"
            if self._has_any(text, ["check", "view", "see", "where"]) and not self._has_any(text, ["change", "adjust"]):
                return "check_class_schedule"
            return "class_schedule_help"
        if has_shift_to_another_course:
            return "shift_to_another_course_next_school_year"
        if has_failed_subject:
            return "failed_subject_policy"
        if has_academic_probation:
            return "academic_probation"
        if has_access_grades:
            return "access_grades"
        if has_end_semester:
            return "end_of_semester"
        if has_fda_solution:
            return "fda_solution"
        if has_fda and self._has_any(text, ["meaning", "what is", "what does", "stands for", "failure due to absences", "pasabot"]):
            return "fda_meaning"
        if self._has_any(text, ["overload"]) and self._has_any(text, ["meaning", "pasabot"]) and not self._has_any(text, ["policy"]):
            return "subject_overload"
        if has_specific_course_passing_grade:
            return "specific_course_passing_retention_grade"
        if has_grading_system and not has_cat_score_requirement and not has_cutoff_score:
            return "buksu_grading_system"
        if has_inc_form:
            return "get_inc_form"
        if has_inc_consequence:
            return "inc_grade_consequences"
        if has_inc_solution:
            return "inc_grade_solution"
        if has_attendance_requirement:
            return "attendance_requirement"
        if has_overload_policy:
            return "overload_units_policy"
        if has_subject_overload:
            return "subject_overload"
        if has_college_honors:
            return "College_Honors_gpa"
        if has_university_scholar:
            return "University_Scholar_gpa"
        if has_thesis_topic:
            return "thesis_topic_selection"
        if has_thesis_panel:
            return "thesis_defense_panelists"
        if has_thesis_failure:
            return "thesis_defense_failure"
        if has_graduation_clearance:
            return "graduating_clearance_requirements"
        if has_generic_passing_grade:
            return "__passing_grade_clarification__"
        if has_cat_score_requirement:
            if self._has_any(text, ["non board", "non-board"]):
                return "non_board_cutoff_score"
            if self._has_any(text, ["board course", "board courses"]):
                return "board_course_cutoff_score"
            return "program_cutoff_scores"
        if has_cutoff_score:
            if self._has_any(text, ["non board", "non-board"]):
                return "non_board_cutoff_score"
            if self._has_any(text, ["board course", "board courses"]):
                return "board_course_cutoff_score"
            return "program_cutoff_scores"
        if has_admission_portal_error:
            return "system_error"
        if has_denied_admission_application:
            return "denied_applications"
        if has_main_campus_full:
            return "main_campus_full"
        if has_no_admission_slots:
            return "no_slots"
        if has_admission_application_schedule:
            return "online_application_schedule"
        if has_admission_exam_registration:
            return "take_exam"

        if intent == "ask_fee" and has_student_id:
            return "Student_id_fee"
        if intent == "ask_fee" and has_library_id:
            return "library_id_card_payment"
        if intent == "ask_fee" and has_good_moral:
            return "good_moral_certificate_fee"

        course_choice = self.course_clarification_response(intent, user_message)
        if course_choice:
            return "__course_clarification__"
        if has_college_course_list_query and intent != "ask_location" and not has_dean_or_head:
            college_course_route = self._college_course_route(text)
            if college_course_route:
                return college_course_route
        course_route = self._course_route(text, intent, has_it_program=has_it_program)
        if course_route and intent in {"ask_availability", "ask_general_info"} and not has_dean_or_head:
            return course_route
        if self.pe_uniform_clarification_response(intent, user_message):
            return "__pe_uniform_clarification__"
        if self._has_any(text, ["how about", "what about", "how about the", "what about the"]):
            course_follow_up = self._course_route(text, "ask_availability", has_it_program=has_it_program)
            if course_follow_up:
                return course_follow_up
        if has_library_hours:
            return "library_hours"
        if has_office_hours:
            return "all_office_schedule"
        if has_calendar:
            return "buksu_university_calendar"
        if has_weekend_visitor:
            return "campus_weekend_visitors"
        if has_uniform_policy:
            if (
                has_civilian_attire or
                self._has_any(text, ["not wearing uniform", "without uniform", "no uniform", "walay uniform", "uniform not required", "not required today"]) or
                has_campus_entry_wording
            ):
                return "wear_civilian_attire"
            return "campus_dress_code_policy"
        if has_foundation_day:
            return "buksu_foundation_day"
        if has_failed_cat_enrollment:
            return "non_passer_enrollment_affirmative_action"
        if has_main_campus_full:
            return "main_campus_full"
        if has_no_admission_slots:
            return "no_slots"
        if has_generic_buksu_contact:
            return "buksu_contact_number"
        if has_university_worth_it:
            return "Buksu_worth_it"
        if has_university_study_place:
            return "buksu_study_place"
        if has_no_id_campus_entry:
            return "campus_entry_without_student_id"
        if has_buksu_location and not has_specific_buksu_office_location:
            return "bukus_location"
        if has_test_permit_issue:
            return "test_permit_issue"
        if has_walkin_exam:
            return "reschedule_entrance_exam"
        if has_missing_admission_documents:
            return "missing_admission_documents"
        if has_admission_preferred_course_change:
            return "change_preferred_course_admission_application"
        if (has_cat or has_admission) and self._has_any(text, ["requirement", "requirements", "need", "needed", "bring", "document", "documents", "kailangan", "kinahanglan"]):
            return "exam_requirements"
        if has_letter_of_intent or has_admission_first_requirement:
            return "admission_letter_of_intent_meaning"
        if has_admission_certificate_copy:
            return "admission_certificate_photocopy_guidance"
        if has_transfer_acceptance and not has_enrollment:
            return "transferee_enrollment"
        if has_transferee and not has_enrollment and intent in {"ask_availability", "ask_general_info", "ask_process", "ask_requirement"}:
            return "transferee_admission_requirements"
        if has_old_pe_uniform:
            return "pe_uniform_old_allowed"
        if has_pe_uniform:
            return "pe_uniform_process"
        if has_generic_validation_question:
            return "__validation_clarification__"
        if (
            "id" in raw_tokens and
            not raw_has_student_id and
            not raw_has_library_id and
            not has_student_id and
            not has_library_id and
            not has_validation and
            self._has_any(text, ["where", "get", "how", "process", "fee", "payment", "requirements", "validate", "validation", "kuha", "asa", "unsaon"])
        ):
            return "__id_clarification__"
        if has_id_validation:
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule", "month", "period"})) or self._has_any(
                text,
                ["validation day", "validation date", "validation schedule"],
            ):
                return "id_validation_day"
            return "id_validation_process"
        if has_cor_validation:
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule", "month", "period"})) or self._has_any(
                text,
                ["validation day", "validation date", "validation schedule", "how long"],
            ):
                return "cor_validation_day"
            return "cor_validation_steps"
        if has_paying_student and has_non_paying_student:
            return "paying_and_non_paying_students"
        if has_non_paying_student:
            return "non_paying_student_definition"
        if has_paying_student:
            return "paying_student_definition"
        if has_nursing_enrollment_support and not self._has_any(text, ["offer", "offers", "offered", "available", "availability"]):
            if self._has_any(text, ["immunization", "vaccine", "health center"]):
                return "con_nursing_immunization_record"
            if self._has_any(text, ["medical", "laboratory", "lab", "examination", "exam"]):
                return "con_nursing_medical_requirements"
            if self._has_any(text, ["submit", "submission", "pass", "pasa", "ipasa", "pagpasa", "acceptance slip", "forms"]):
                return "con_nursing_requirements_submission"
            return "con_nursing_enrollment_guidance"
        if has_returning_student and (has_enrollment or self._has_any(text, ["process", "steps", "how", "procedure"])):
            return "returning_students_scope_notice"
        # Specific Level Enrollment Requirements
        if has_enrollment and (has_medicine or self._has_any(text, ["nmat", "college of medicine"])) and not self._has_any(text, ["schedule", "time", "date", "when"]):
            return "medicine_enrollment_requirements"
        if (has_graduate_enrollment or (has_enrollment and self._has_any(text, ["law", "juris doctor", "graduate", "masters", "masteral", "doctorate", "post-graduate"]))) and not self._has_any(text, ["schedule", "time", "date", "when"]):
            return "graduate_law_enrollment_requirements"
        if self._has_any(text, ["undergraduate requirements", "undergraduate enrollment requirements", "freshman requirements", "first year requirements", "transferee requirements", "freshman documentary requirements"]):
            return "freshman_enrollment_process"

        # Enrollment Requirements / Documents with Course Name or Department mentioned
        if has_enrollment and self._has_any(text, ["requirement", "requirements", "document", "documents", "need", "needs", "papers", "dad-on", "dalhon", "ipasa", "submit", "envelope", "what do i need", "what to prepare"]):
            course_name = self._extract_mentioned_course_or_dept(text)
            if course_name and not self._has_any(text, ["medicine", "college of medicine", "law", "graduate"]):
                return f"__course_enrollment_req_notice__{course_name}"
            return "enrollment_documents"

        # Enrollment Process / Steps with Course Name mentioned
        if has_enrollment and (has_enrollment_process or self._has_any(text, ["process", "step", "steps", "step by step", "guide", "how to enroll", "how do i enroll", "unsaon pag enroll", "unsaon pagpa enroll", "paagi sa pag enroll"])):
            course_name = self._extract_mentioned_course_or_dept(text)
            if course_name and not self._has_any(text, ["medicine", "college of medicine", "law", "graduate"]):
                return f"__course_enrollment_proc_notice__{course_name}"
            return "enrollment_general_process"

        if has_transferee and has_enrollment:
            return "transferee_enrollment"
        if has_undergraduate_enrollment_requirements:
            return "enrollment_documents"
        if has_enrollment and self._has_any(text, ["document list", "documents list", "documentary list", "documents to bring", "bring on enrollment day", "needed on enrollment day"]):
            return "freshman_enrollment_process"
        if has_enrollment and self._has_any(text, ["medical exam", "medical examination", "medical certificate"]) and self._has_any(text, ["before enrollment", "required before", "required"]):
            return "freshman_enrollment_process"
        if has_enrollment and has_validation:
            return "enrollment_validation_payment"
        if has_enrollment and self._has_any(text, ["pay", "payment", "paying", "cashier", "accounting", "lbp", "landbank", "ofbank"]):
            return "enrollment_validation_payment"
        if has_cor and self._has_any(text, ["approval", "approved", "after approval", "incorrect", "error", "errors"]):
            return "enrollment_application_approval"
        if has_cor and self._has_any(text, ["where", "get", "download", "kuha", "makuha", "asa", "unsaon", "how"]):
            return "where_get_cor"
        if has_enrollment_application_approval:
            return "enrollment_application_approval"
        if has_freshman and (has_enrollment_process or has_course_specific_enrollment_help):
            return "freshman_enrollment_process"
        if has_course_specific_enrollment_help and has_enrollment_process:
            return "freshman_enrollment_process"
        if has_school_year_class_start:
            return "school_year_class_start_schedule"
        if has_enrollment_time and not has_late_enrollment:
            return "enrollment_time_schedule"
        if has_late_enrollment:
            return "late_enrollment"
        if has_online_enrollment_button:
            return "online_enrollment_steps"
        if has_enrollment and "online" in text:
            return "online_enrollment_steps"
        if has_enrollment_process:
            return "enrollment_general_process"
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
            if has_find_institutional_account:
                return "Find_Institutional_Account"
            if has_institutional_email:
                return "institutional_email_account"
            if self._has_any(text, ["mission"]):
                return "ict_mission"
            return "about_ict"
        if has_medical_certificate:
            if self._has_any(text, ["duration", "time", "minutes", "minute", "hours", "how long", "how fast", "pila ka minutes", "pila ka oras"]):
                return "clinic_medical_certificate_duration"
            if self._has_any(text, ["cost", "fee", "payment", "how much", "pay", "bayad", "free", "pila", "naay bayad"]):
                return "clinic_medical_certificate_cost"
            return "clinic_medical_certificate_process"
        if has_clinic or has_dental:
            if has_dental and has_location_wording:
                return None
            if self._has_any(text, ["mission"]):
                return "med_mission"
            if self._has_any(text, ["vision"]):
                return "med_vision"
            if self._has_any(text, ["health services unit info", "clinic information", "about clinic", "about buksu clinic"]):
                return "medic_clinic"
            if self._has_any(text, ["medical dental services", "medical and dental services", "medical dental consultation", "medical and dental consultation", "health services unit services", "services sa clinic ug dental"]):
                return "buksu_medical_dental_services"
            if (
                self._has_any(text, ["medical dental", "medical and dental", "health services"]) and
                self._has_any(text, ["provide", "help", "offer", "services", "consultation"])
            ):
                return "buksu_medical_dental_services"
            if self._has_any(text, ["does clinic offer dental services", "clinic offer dental services", "clinic offers dental services"]):
                return "buksu_medical_dental_services"
            if has_clinic and not has_dental and self._has_any(text, ["service", "services", "available", "offer"]):
                _has_specific_complaint = self._has_any(text, [
                    "ngipon", "tooth", "teeth", "ibot", "extract", "extraction", "sakit", "pain", "ache",
                    "consult", "consultation", "checkup", "check up", "check-up", "medicine", "tambal",
                    "fever", "hilanat", "headache", "labad", "wound", "samad", "first aid", "first-aid", "bandage"
                ])
                if not _has_specific_complaint:
                    return "__clinic_services_menu__"
            if has_tooth_extraction:
                return "request_tooth_extraction"
            if has_dental_referral_medicine:
                return "request_referral_dispensing_medicine"
            if has_dental:
                if self._has_any(text, ["service", "services", "servicing", "available", "offer"]) and not self._has_any(text, ["consult", "consultation", "oral examination"]):
                    return "dental_services_menu"
                if self._has_any(text, ["menu", "list"]) and self._has_any(text, ["dental", "dentist"]):
                    return "dental_services_menu"
                if self._has_any(text, ["validated id", "school id", "study load", "photocopy id", "photocopy of id"]):
                    if self._has_any(text, ["oral examination", "oral exam"]):
                        return "dental_oral_examination_requirement"
                    return "requirement_for_dental_consultation"
                if self._has_any(text, ["requirement", "requirements", "checklist", "bring", "papers", "documents"]) or (
                    self._has_any(text, ["need", "needed"]) and
                    self._has_any(text, ["document", "documents", "validated id", "study load", "photocopy", "bring"])
                ):
                    if self._has_any(text, ["oral examination", "oral exam"]):
                        return "dental_oral_examination_requirement"
                    return "requirement_for_dental_consultation"
                if self._has_any(text, ["oral examination", "oral exam"]):
                    return "request_dental_oral_examination"
                return "request_dental_consult"
            if self._has_any(text, ["mission"]):
                return "med_mission"
            if self._has_any(text, ["vision"]):
                return "med_vision"
            if self._has_any(text, ["where", "location", "find", "asa dapit", "asa ang clinic"]):
                return "buksu_med_loc"
            if self._has_any(text, ["what is clinic", "about clinic", "about the clinic", "unsa ang clinic", "tell me about the clinic", "information about clinic", "info about clinic"]):
                return "medic_clinic"
            return None
        if has_dean_or_head:
            college_route = self._college_person_route(text)
            if college_route:
                return college_route
        if has_admin_person:
            if self._has_any(text, ["hazel jean", "abejuela"]):
                return "vicepres_academic_affairs"
            if self._has_any(text, ["carina joane", "barroso"]):
                return "vicepres_research_extension_innovations"
            if self._has_any(text, ["lincoln tan"]):
                return "vicepres_culture_arts_sports_student_services"
            if self._has_any(text, ["dante victoria"]):
                if self._has_any(text, ["secretary", "board secretary"]):
                    return "buksu_secretary"
                return "vicepres_administration_finance"
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
        if self._has_any(text, ["who created you", "who create you", "who made you", "who built you", "kinsa naghimo nimo"]):
            return "Bot_creator"
        if has_classroom:
            if self._has_any(text, ["classroom policy", "classroom policies", "class rules"]) and not self._has_any(
                text,
                ["phone", "cellphone", "mobile", "gadget", "food", "snack", "kaon", "mokaon", "mukaon", "assignment", "assignments", "schedule"],
            ):
                return "__classroom_policy_menu__"
            if has_section_change:
                return "change_section_schedule_conflict"
            if has_class_schedule:
                return "class_schedule_help"
            if has_phone_in_class:
                return "phone_use_in_class"
            if has_classroom_food:
                return "eating_in_classroom"
            if self._has_any(text, ["assignment", "assignments", "homework", "google classroom", "submit", "pasa", "ipasa", "turn in"]):
                return "submit_assignments_online"
            if self._has_any(text, ["concern", "concerns", "problem", "issue", "teacher", "instructor", "problema", "grado", "grade", "class issue", "klase concern"]):
                return "class_concerns"
        if intent == "ask_requirement":
            if has_enrollment:
                if has_medicine:
                    return "medicine_enrollment_requirements"
                if has_graduate_enrollment:
                    return "graduate_law_enrollment_requirements"
                if has_freshman or has_transferee:
                    return "freshman_enrollment_process"
                return "enrollment_documents"
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
            if has_library_resources_query:
                return "access_buksu_library_resources"
            if has_library_id:
                return "library_id_card_requirements"
            if has_student_id:
                return "student_id_requirements"
            if has_freshman and (has_admission or self._has_any(text, ["document", "documents", "requirements", "papeles", "papers", "needed", "need"])):
                return "freshman_admission_requirements"
            if has_cat or has_admission:
                return "exam_requirements"
        if has_college_honors:
            return "College_Honors_gpa"
        if has_college and intent != "ask_location":
            college_course_route = self._college_course_route(text)
            if college_course_route:
                return college_course_route
            if self._has_any(text, ["college", "colleges"]):
                return "buksu_academic_colleges"
        if has_college_course_list_query and intent != "ask_location":
            college_course_route = self._college_course_route(text)
            if college_course_route:
                return college_course_route
        if has_course or has_training_course:
            if has_major_english_program:
                return "buksu_BSED-ENG_program"
            course_route = self._course_route(text, intent, has_it_program=has_it_program)
            if course_route:
                return course_route
        if has_failed_admission_enrollment_eligibility:
            return "non_passer_enrollment_affirmative_action"
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
            if self._has_any(text, ["service", "services", "menu", "topics", "information", "info"]) and not self._has_any(
                text,
                [
                    "male", "female", "boy", "boys", "girl", "girls", "rubia", "mahogany",
                    "kilala", "how many", "number", "count", "pila", "pros", "cons",
                    "advantage", "advantages", "benefit", "benefits", "good", "downside",
                    "slot", "slots", "available", "availability", "requirement", "requirements",
                    "details", "who can stay", "can freshmen stay", "kinsa pwede",
                ],
            ):
                return "__dormitory_services_menu__"
            dormitory_route = self._dormitory_route(text)
            if dormitory_route:
                return dormitory_route
        if has_specific_buksu_office_location and (has_location_wording or intent == "ask_location"):
            return None
        if has_no_id_campus_entry:
            return "campus_entry_without_student_id"
        university_route = self._university_route(text)
        if university_route:
            return university_route
        if has_lost_student_id:
            return "lost_student_id_replacement_process"
        if raw_normalized.strip() in {"student id", "school id"}:
            return "student_id_process"
        if has_student_id and self._has_any(text, ["where", "process", "get", "kuha", "makuha", "asa", "how", "unsaon"]):
            return "student_id_process"
        if intent in {"ask_process", "ask_document", "ask_general_info", "ask_location", "ask_requirement"} and has_good_moral:
            return "request_good_moral_certificate_oss"
        if intent in {"ask_location", "ask_document", "ask_general_info"} and has_library_id:
            if self._has_any(text, ["where", "get", "claim", "release", "released", "process", "kuha", "makuha", "asa"]):
                return "library_id_card_location"
        if intent == "ask_schedule":
            if has_school_year_class_start:
                return "school_year_class_start_schedule"
            if has_office_hours:
                return "all_office_schedule"
            if has_admission:
                if has_pass_notice or has_result:
                    return "exam_results"
                if has_deadline:
                    return "admission_application_deadline"
                return "online_application_schedule"
            if has_enrollment:
                return "enrollment_time_schedule"
            if has_registrar:
                return "office_schedule"
        if intent == "ask_process":
            if has_enrollment and has_validation:
                return "enrollment_validation_payment"
            if has_enrollment and self._has_any(text, ["pay", "payment", "paying", "cashier", "accounting", "lbp", "landbank", "ofbank"]):
                return "enrollment_validation_payment"
            if has_enrollment and has_medicine:
                return "medicine_enrollment_requirements"
            if has_graduate_enrollment:
                return "graduate_law_enrollment_requirements"
            if has_cor and self._has_any(text, ["approval", "approved", "after approval", "incorrect", "error", "errors"]):
                return "enrollment_application_approval"
            if has_transferee and has_enrollment:
                return "transferee_enrollment"
            if has_freshman and has_enrollment:
                return "freshman_enrollment_process"
            if has_sias:
                if has_password_wording:
                    return "sias_forgot_password"
                if has_sias_account_lookup:
                    return "Find_Sias_Account"
                if has_login_wording:
                    return "sias_login_process"
                return "access_sias"
            if has_admission_account:
                if has_account_creation_wording:
                    return "admission_account_registration"
                if has_login_wording and not has_password_wording:
                    return "admission_portal_login"
                if has_admission_password_recovery:
                    return "reset_portal_password_buksu"
                if "password" in text:
                    return "Change_Pass_admission"
                if "institutional" in text:
                    return "Find_Institutional_Account"
                return "Change_info_admission"
            if has_cor:
                return "where_get_cor"
            if has_admission:
                if has_pass_notice or has_result:
                    return "exam_results"
                if "reschedule" in text:
                    return "reschedule_entrance_exam"
                if "missed" in tokens or "miss" in tokens:
                    return "missed_buksu_cat_schedule"
                return "take_exam"
            if has_no_id_campus_entry:
                return "campus_entry_without_student_id"
            if has_student_id:
                return "student_id_process"
            if has_library_id:
                return "library_id_card_location"
            if has_enrollment and "online" in text:
                return "online_enrollment_steps"
            if has_enrollment:
                return "enrollment_general_process"
            if has_inc:
                if "form" in text:
                    return "get_inc_form"
                return "inc_grade_solution"
        if intent == "ask_requirement" and has_inc:
            return "inc_grade_solution"
        if intent == "ask_requirement":
            if has_enrollment:
                if has_medicine:
                    return "medicine_enrollment_requirements"
                if has_graduate_enrollment:
                    return "graduate_law_enrollment_requirements"
                if has_freshman or has_transferee:
                    return "freshman_enrollment_process"
                return "enrollment_documents"
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
            if has_admission:
                return "exam_requirements"
        if intent == "ask_fee" and (has_cat or has_admission):
            return "exam_fees"
        if intent == "ask_fee" and has_enrollment and self._has_any(text, ["pay", "payment", "paying", "cashier", "accounting", "lbp", "landbank", "ofbank", "online"]):
            return "enrollment_validation_payment"
        if intent == "ask_fee" and (has_enrollment or self._has_any(text, ["student fee", "student fees", "laboratory fee", "miscellaneous fee", "tuition"])):
            return "student_fees"
        if has_book_penalty and self._has_any(text, ["book", "books", "library", "book center", "materials"]):
            return "library_late_return_penalty"
        if intent == "ask_fee" and has_book_penalty:
            return "library_late_return_penalty"
        if intent in {"ask_process", "ask_availability", "ask_general_info", "ask_location", "ask_requirement"} and (
            has_library_books or
            (self._has_any(text, ["book", "books"]) and self._has_any(text, ["available", "availability", "ask", "return", "borrow", "get", "getting", "process", "steps", "late", "penalty", "fine"])) or
            self._has_any(text, ["library resources"])
        ):
            if self._has_any(text, ["resource", "resources"]):
                return "access_buksu_library_resources"
            if self._has_any(text, ["return", "give back", "uli", "ibalik"]):
                return "library_return_books_process"
            if self._has_any(text, ["available", "availability", "have", "ask for available", "books naa", "naa bay books"]):
                return "library_available_books"
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
        raw_tokens = set(re.findall(r"\b[\w'-]+\b", text))
        if not self._has_any(text, ["validate", "validation"]):
            return None
        if self._has_any(text, ["enrollment", "enroll"]):
            return None
        has_specific_validation_target = (
            bool(raw_tokens.intersection({"id", "cor"})) or
            self._has_any(text, ["student id", "school id", "certificate of registration"])
        )
        if has_specific_validation_target:
            return None

        return self._choice_response(
            "Which validation do you mean?",
            [
                {"label": "ID validation", "payload": "/direct_intent{\"intent\":\"id_validation_process\"}"},
                {"label": "COR validation", "payload": "/direct_intent{\"intent\":\"cor_validation_steps\"}"},
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
            return self._clinic_services_menu()
        if self._has_any(text, ["dental services", "dental servicing", "dental clinic services"]):
            return self._clinic_services_menu()

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
                        {"label": "Where to get library ID", "payload": "/direct_intent{\"intent\":\"library_id_card_location\"}"},
                        {"label": "Library ID requirements", "payload": "/direct_intent{\"intent\":\"library_id_card_requirements\"}"},
                        {"label": "Library ID payment", "payload": "/direct_intent{\"intent\":\"library_id_card_requirements\"}"},
                    ],
                },
                {
                    "title": "Borrowing and Books",
                    "items": [
                        {"label": "Borrow books", "payload": "/direct_intent{\"intent\":\"library_borrow_books_process\"}"},
                        {"label": "Borrowing rules", "payload": "/direct_intent{\"intent\":\"library_borrowing_rules\"}"},
                        {"label": "Return books", "payload": "/direct_intent{\"intent\":\"library_return_books_process\"}"},
                        {"label": "Late return penalty", "payload": "/direct_intent{\"intent\":\"library_late_return_penalty\"}"},
                    ],
                },
                {
                    "title": "Library Access",
                    "items": [
                        {"label": "Available books", "payload": "/direct_intent{\"intent\":\"library_available_books\"}"},
                        {"label": "Library resources", "payload": "/direct_intent{\"intent\":\"access_buksu_library_resources\"}"},
                        {"label": "Library hours", "payload": "/direct_intent{\"intent\":\"library_hours\"}"},
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
                        {"label": "Student ID process", "payload": "/direct_intent{\"intent\":\"student_id_requirements\"}"},
                        {"label": "Student ID fee", "payload": "/direct_intent{\"intent\":\"Student_id_fee\"}"},
                        {"label": "ID validation process", "payload": "/direct_intent{\"intent\":\"id_validation_process\"}"},
                        {"label": "ID validation day", "payload": "/direct_intent{\"intent\":\"id_validation_process\"}"},
                        {"label": "COR validation process", "payload": "/direct_intent{\"intent\":\"cor_validation_steps\"}"},
                        {"label": "COR validation day", "payload": "/direct_intent{\"intent\":\"cor_validation_day\"}"},
                    ],
                },
                {
                    "title": "Accounts and Access",
                    "items": [
                        {"label": "Wi-Fi access", "payload": "/direct_intent{\"intent\":\"get_wifi_access\"}"},
                        {"label": "SIAS access", "payload": "/direct_intent{\"intent\":\"access_sias\"}"},
                        {"label": "COR request", "payload": "/direct_intent{\"intent\":\"request_cor\"}"},
                        {"label": "Admission password help", "payload": "/direct_intent{\"intent\":\"Change_Pass_admission\"}"},
                    ],
                },
                {
                    "title": "Documents",
                    "items": [
                        {"label": "INC form", "payload": "/direct_intent{\"intent\":\"inc_grade_solution\"}"},
                        {"label": "TOR request", "payload": "/direct_intent{\"intent\":\"contact_registrar_for_tor\"}"},
                        {"label": "Graduation clearance", "payload": "/direct_intent{\"intent\":\"graduating_clearance_requirements\"}"},
                    ],
                },
                {
                    "title": "Campus Support",
                    "items": [
                        {"label": "Library ID", "payload": "/direct_intent{\"intent\":\"library_id_card_requirements\"}"},
                        {"label": "Borrow books", "payload": "/direct_intent{\"intent\":\"library_borrow_books_process\"}"},
                        {"label": "PE uniform", "payload": "/direct_intent{\"intent\":\"pe_uniform_process\"}"},
                    ],
                },
                {
                    "title": "Clinic Services",
                    "items": [
                        {"label": "Dental services", "payload": "/direct_intent{\"intent\":\"dental_services_menu\"}"},
                        {"label": "Medical certificate", "payload": "/direct_intent{\"intent\":\"clinic_medical_certificate_process\"}"},
                        {"label": "Medical certificate cost", "payload": "/direct_intent{\"intent\":\"clinic_medical_certificate_cost\"}"},
                        {"label": "Medical certificate duration", "payload": "/direct_intent{\"intent\":\"clinic_medical_certificate_duration\"}"},
                    ],
                },
            ],
        )

    def _bot_services_menu(self) -> Dict[str, Any]:
        return self._choice_group_response(
            "This is all I can provide to help you. Open a category and choose a topic.",
            [
                {
                    "title": "Academic Policies and Grades",
                    "items": [
                        {"label": "Grading system", "payload": "/direct_intent{\"intent\":\"buksu_grading_system\"}"},
                        {"label": "Incomplete grade", "payload": "/direct_intent{\"intent\":\"inc_grade_solution\"}"},
                        {"label": "FDA", "payload": "/direct_intent{\"intent\":\"academic_probation\"}"},
                        {"label": "Dean's list", "payload": "/direct_intent{\"intent\":\"College_Honors_gpa\"}"},
                        {"label": "Graduation application", "payload": "/direct_intent{\"intent\":\"graduation_application_process\"}"},
                    ],
                },
                {
                    "title": "Admissions and Enrollment",
                    "items": [
                        {"label": "Admission testing", "payload": "/direct_intent{\"intent\":\"online_application_schedule\"}"},
                        {"label": "Admission requirements", "payload": "/direct_intent{\"intent\":\"freshman_admission_requirements\"}"},
                        {"label": "Admission result", "payload": "/direct_intent{\"intent\":\"exam_results\"}"},
                        {"label": "Enrollment time", "payload": "/direct_intent{\"intent\":\"enrollment_time_schedule\"}"},
                        {"label": "Freshman enrollment", "payload": "/direct_intent{\"intent\":\"freshman_enrollment_process\"}"},
                        {"label": "Late enrollment", "payload": "/direct_intent{\"intent\":\"late_enrollment\"}"},
                    ],
                },
                {
                    "title": "Courses and Departments",
                    "items": [
                        {"label": "All courses", "payload": "/direct_intent{\"intent\":\"board_course_cutoff_score\"}"},
                        {"label": "Board courses", "payload": "/direct_intent{\"intent\":\"buksu_board_courses\"}"},
                        {"label": "Non-board courses", "payload": "/direct_intent{\"intent\":\"buksu_non_board_courses\"}"},
                        {"label": "Master's programs", "payload": "/direct_intent{\"intent\":\"buksu_masters_courses\"}"},
                        {"label": "College list", "payload": "/direct_intent{\"intent\":\"buksu_academic_colleges\"}"},
                    ],
                },
                {
                    "title": "Library",
                    "items": [
                        {"label": "Library services", "payload": "/direct_intent{\"intent\":\"access_buksu_library_resources\"}"},
                        {"label": "Library ID", "payload": "/direct_intent{\"intent\":\"library_id_card_location\"}"},
                        {"label": "Borrow books", "payload": "/direct_intent{\"intent\":\"library_borrow_books_process\"}"},
                        {"label": "Library hours", "payload": "/direct_intent{\"intent\":\"library_hours\"}"},
                    ],
                },
                {
                    "title": "Student Services and ICT",
                    "items": [
                        {"label": "Student ID process", "payload": "/direct_intent{\"intent\":\"student_id_requirements\"}"},
                        {"label": "ID validation", "payload": "/direct_intent{\"intent\":\"id_validation_process\"}"},
                        {"label": "COR validation", "payload": "/direct_intent{\"intent\":\"cor_validation_steps\"}"},
                        {"label": "Wi-Fi access", "payload": "/direct_intent{\"intent\":\"get_wifi_access\"}"},
                        {"label": "SIAS access", "payload": "/direct_intent{\"intent\":\"access_sias\"}"},
                        {"label": "Office hours", "payload": "/direct_intent{\"intent\":\"all_office_schedule\"}"},
                    ],
                },
                {
                    "title": "Health and Campus Life",
                    "items": [
                        {"label": "Clinic services", "payload": "/direct_intent{\"intent\":\"buksu_medical_dental_services\"}"},
                        {"label": "Dental consultation", "payload": "/direct_intent{\"intent\":\"request_dental_consult\"}"},
                        {"label": "Dormitory", "payload": "/direct_intent{\"intent\":\"buksu_dormitory_information\"}"},
                        {"label": "Classroom policy", "payload": "/direct_intent{\"intent\":\"buksu_grading_system\"}"},
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
                        {"label": "Medic Clinic Overview", "payload": "/direct_intent{\"intent\":\"medic_clinic\"}"},
                        {"label": "Free Consultation Info", "payload": "/direct_intent{\"intent\":\"buksu_medical_dental_services\"}"},
                        {"label": "Clinic Mission", "payload": "/direct_intent{\"intent\":\"med_mission\"}"},
                        {"label": "Clinic Vision", "payload": "/direct_intent{\"intent\":\"med_vision\"}"},
                    ],
                },
                {
                    "title": "Dental Services",
                    "items": [
                        {"label": "Dental Services List", "payload": "/direct_intent{\"intent\":\"dental_services_menu\"}"},
                        {"label": "Dental Consultation", "payload": "/direct_intent{\"intent\":\"request_dental_consult\"}"},
                        {"label": "Dental Consult Requirements", "payload": "/direct_intent{\"intent\":\"requirement_for_dental_consultation\"}"},
                        {"label": "Dental Oral Examination", "payload": "/direct_intent{\"intent\":\"request_dental_oral_examination\"}"},
                        {"label": "Oral Exam Requirements", "payload": "/direct_intent{\"intent\":\"dental_oral_examination_requirement\"}"},
                        {"label": "Tooth Extraction", "payload": "/direct_intent{\"intent\":\"request_tooth_extraction\"}"},
                        {"label": "Referral / Medicine", "payload": "/direct_intent{\"intent\":\"request_referral_dispensing_medicine\"}"},
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
                        {"label": "Dormitory overview", "payload": "/direct_intent{\"intent\":\"buksu_dormitory_information\"}"},
                        {"label": "How many dormitories", "payload": "/direct_intent{\"intent\":\"campus_dormitories\"}"},
                        {"label": "Dormitory availability", "payload": "/direct_intent{\"intent\":\"female_dorm\"}"},
                        {"label": "Dormitory pros and cons", "payload": "/direct_intent{\"intent\":\"dormitory_pros_cons\"}"},
                    ],
                },
                {
                    "title": "Dormitory Locations",
                    "items": [
                        {"label": "Mahogany Dormitory", "payload": "/direct_intent{\"intent\":\"location_Mahogany_dorm\"}"},
                        {"label": "Mahogany Dormitory", "payload": "/direct_intent{\"intent\":\"location_Mahogany_dorm\"}"},
                        {"label": "Rubia Dormitory", "payload": "/direct_intent{\"intent\":\"location_Rubia_dorm\"}"},
                        {"label": "Kilala Dormitory", "payload": "/direct_intent{\"intent\":\"campus_dormitories\"}"},
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
                        {"label": "Phone use in class", "payload": "/direct_intent{\"intent\":\"phone_use_in_class\"}"},
                        {"label": "Eating in classroom", "payload": "/direct_intent{\"intent\":\"eating_in_classroom\"}"},
                        {"label": "Class concerns", "payload": "/direct_intent{\"intent\":\"class_concerns\"}"},
                        {"label": "Submit assignments online", "payload": "/direct_intent{\"intent\":\"submit_assignments_online\"}"},
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
                        "payload": "/direct_intent{\"intent\":\"online_application_schedule\"}",
                    },
                    {
                        "label": "Admission enrollment",
                        "payload": "/direct_intent{\"intent\":\"enrollment_time_schedule\"}",
                    },
                    {
                        "label": "Admission testing result",
                        "payload": "/direct_intent{\"intent\":\"exam_results\"}",
                    },
                ]
            },
        }

    def _extract_mentioned_course_or_dept(self, text: str) -> Optional[str]:
        course_dept_map = [
            ("bsemc-dat", "BSEMC-DAT"),
            ("bsemc dat", "BSEMC-DAT"),
            ("bsemc", "BSEMC"),
            ("bsit", "BSIT"),
            ("bset", "BSET"),
            ("bsat", "BSAT"),
            ("bsft", "BSFT"),
            ("bsn", "BS Nursing"),
            ("bshm", "BSHM"),
            ("bsa", "BS Accountancy"),
            ("bsba", "BSBA"),
            ("bpa", "BPA"),
            ("beed", "BEEd"),
            ("beced", "BECEd"),
            ("bsed", "BSEd"),
            ("bped", "BPEd"),
            ("bsdc", "BSDC"),
            ("bses", "BSES"),
            ("bsbio", "BS Biology"),
            ("bsmath", "BS Mathematics"),
            ("information technology", "Information Technology"),
            ("entertainment and multimedia computing", "Entertainment and Multimedia Computing"),
            ("food technology", "Food Technology"),
            ("automotive technology", "Automotive Technology"),
            ("electronics technology", "Electronics Technology"),
            ("nursing", "Nursing"),
            ("hospitality management", "Hospitality Management"),
            ("accountancy", "Accountancy"),
            ("business administration", "Business Administration"),
            ("public administration", "Public Administration"),
            ("elementary education", "Elementary Education"),
            ("secondary education", "Secondary Education"),
            ("early childhood education", "Early Childhood Education"),
            ("physical education", "Physical Education"),
            ("development communication", "Development Communication"),
            ("environmental science", "Environmental Science"),
            ("biology", "Biology"),
            ("mathematics", "Mathematics"),
            ("philosophy", "Philosophy"),
            ("economics", "Economics"),
            ("sociology", "Sociology"),
            ("english language", "English Language Studies"),
            ("social work", "Social Work"),
            ("psychology", "Psychology"),
            ("college of technologies", "College of Technologies"),
            ("college of technology", "College of Technologies"),
            ("cot", "College of Technologies"),
            ("college of arts and sciences", "College of Arts and Sciences"),
            ("cas", "College of Arts and Sciences"),
            ("college of business", "College of Business"),
            ("cob", "College of Business"),
            ("college of education", "College of Education"),
            ("coe", "College of Education"),
            ("college of nursing", "College of Nursing"),
            ("con", "College of Nursing"),
            ("college of public administration", "CPAG"),
            ("cpag", "CPAG"),
        ]
        text_lower = text.lower()
        for key, display_title in course_dept_map:
            if re.search(rf"\b{re.escape(key)}\b", text_lower):
                return display_title
        return None

    def _course_enrollment_requirements_choice(self, course_name: str) -> Dict[str, Any]:
        text_bubble_1 = f"The data we have for enrollment is general; we don't have specific data for the enrollment of **{course_name}**, as this may be given by your department."
        text_bubble_2 = "Here are the enrollment requirements you can choose:"
        full_text = f"{text_bubble_1}\n\n{text_bubble_2}"
        return {
            "text": full_text,
            "textParts": [text_bubble_1, text_bubble_2],
            "custom": {
                "choiceGroups": [
                    {
                        "title": "Here are the enrollment requirements you can choose:",
                        "items": [
                            {"label": "Undergraduate Requirements", "payload": "/direct_intent{\"intent\":\"freshman_admission_requirements\"}"},
                            {"label": "Law & Graduate Requirements", "payload": "/direct_intent{\"intent\":\"graduate_law_enrollment_requirements\"}"},
                            {"label": "College of Medicine Requirements", "payload": "/direct_intent{\"intent\":\"medicine_enrollment_requirements\"}"},
                        ]
                    }
                ]
            }
        }

    def _course_enrollment_process_response(self, course_name: str, active_domain: Optional[str] = None) -> Dict[str, Any]:
        base_resp = self.data_loader.get_response("enrollment_general_process", domain=active_domain or "procedures")
        notice_text = f"Our enrollment process data is general across Bukidnon State University based on University Registrar guidelines. Additional department-specific instructions for **{course_name}** will be announced by your college department."
        
        if isinstance(base_resp, dict):
            parts = [notice_text] + (base_resp.get("textParts", []) or [base_resp.get("text", "")])
            return {
                **base_resp,
                "text": f"{notice_text}\n\n{base_resp.get('text', '')}",
                "textParts": parts
            }
        return {
            "text": f"{notice_text}\n\n{base_resp}",
            "textParts": [notice_text, str(base_resp)]
        }

    def course_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        tokens = set(self.interpreter.tokens(text))
        bare_course_terms = {"course", "courses", "cource", "cources", "program", "programs"}
        filler_terms = {
            "buksu", "bukidnon", "state", "university", "school",
            "available", "availability", "avalilable", "offer", "offers", "offered", "do", "does",
            "unsa", "unsay", "what", "information", "sa", "ang", "mga",
            "na", "nga", "diri", "diris", "dinhi", "ari", "here",
            "pwedi", "pwede", "puwede", "pwedeng", "pweding", "nako", "ko",
            "ma", "may", "mangutana", "mangutanag", "sudlan", "masudlan",
            "enrollan", "enrolan", "enroll", "enrollment",
        }
        bisaya_course_availability = (
            bool(tokens.intersection(bare_course_terms)) and
            self._has_any(
                text,
                [
                    "unsay course",
                    "unsa nga course",
                    "unsa may mga course",
                    "pwedi ma enrollan",
                    "pwede ma enrollan",
                    "pwedi nako enrollan",
                    "pwede nako enrollan",
                    "pwedi nako ma sudlan",
                    "pwede nako ma sudlan",
                    "course na available",
                    "course nga available",
                ],
            )
        )

        if intent not in {"ask_availability", "ask_general_info", "nlu_fallback"} and not (
            intent == "ask_process" and bisaya_course_availability
        ):
            return None
        if not tokens.intersection(bare_course_terms):
            return None
        if self._has_any_token(text, ["slot", "slots", "bakanti", "bakante"]) or self._has_any(
            text,
            [
                "available slot", "available slots", "free slots", "existing slots",
                "open slots", "slots available", "naa pay slot", "naa pay slots",
                "naapay slot", "naapay slots", "naa pabay", "napay bakanti",
                "naapay bakanti", "naapay bakante",
            ],
        ):
            return None
        if self._has_any(text, ["all courses", "all course", "course list", "program list", "list of courses", "list of programs"]):
            return None
        if self._has_any(text, ["board course", "board courses", "non board", "non-board", "master", "masters", "doctoral"]):
            return None
        clarification_terms = bare_course_terms.union(filler_terms).union({"offered", "offerd", "cource", "cources", "by", "in"})
        if any(token not in clarification_terms for token in tokens):
            return None

        is_bisaya = self._has_any(text, ["unsa", "unsay", "pwedi", "pwede", "puwede", "diris", "diri", "sudlan", "enrollan"])
        if is_bisaya:
            return self._choice_response(
                "Unsang listahan sa courses imong gusto tan-awon?",
                [
                    {"label": "Tanang courses offered", "payload": "/direct_intent{\"intent\":\"board_course_cutoff_score\"}"},
                    {"label": "Board courses", "payload": "/direct_intent{\"intent\":\"buksu_board_courses\"}"},
                    {"label": "Non-board courses", "payload": "/direct_intent{\"intent\":\"buksu_non_board_courses\"}"},
                    {"label": "Master's ug doctoral programs", "payload": "/direct_intent{\"intent\":\"buksu_masters_courses\"}"},
                ],
            )

        return self._choice_response(
            "Which course list do you want to view?",
            [
                {"label": "All courses offered", "payload": "/direct_intent{\"intent\":\"board_course_cutoff_score\"}"},
                {"label": "Board courses", "payload": "/direct_intent{\"intent\":\"buksu_board_courses\"}"},
                {"label": "Non-board courses", "payload": "/direct_intent{\"intent\":\"buksu_non_board_courses\"}"},
                {"label": "Master's and doctoral programs", "payload": "/direct_intent{\"intent\":\"buksu_masters_courses\"}"},
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
        if self._has_any(text, ["old", "daan", "previous", "jogging", "white", "allowed", "pwede", "pwedi", "gamiton", "isuot", "sul-ob"]):
            return None
        if self._has_any(text, ["pe clothes", "pe clothing"]) and self._has_any(text, ["where", "get", "request", "buy", "kuha", "asa"]):
            return None
        if not self._has_any(text, ["how", "get", "where", "request", "buy", "kuha", "asa"]):
            return None

        return self._choice_response(
            "Did you mean PE uniform?",
            [
                {"label": "PE uniform", "payload": "/direct_intent{\"intent\":\"pe_uniform_process\"}"},
            ],
        )

    def find_best_response(
        self,
        intent: str,
        user_message: str,
        entity_values: List[str],
        active_domain: Optional[str] = None,
    ) -> Any:
        self.last_selected_intent = None
        direct_intent = self.direct_intent_override(
            intent, user_message, entity_values, active_domain=active_domain
        )
        if direct_intent and str(direct_intent).startswith("__course_enrollment_req_notice__"):
            course_name = str(direct_intent).replace("__course_enrollment_req_notice__", "")
            return self._course_enrollment_requirements_choice(course_name)

        if direct_intent and str(direct_intent).startswith("__course_enrollment_proc_notice__"):
            course_name = str(direct_intent).replace("__course_enrollment_proc_notice__", "")
            return self._course_enrollment_process_response(course_name, active_domain=active_domain)

        if direct_intent == "__course_clarification__":
            return self.course_clarification_response(intent, user_message) or self.data_loader.fallback()
        if direct_intent == "__pe_uniform_clarification__":
            return self.pe_uniform_clarification_response(intent, user_message) or self.data_loader.fallback()
        if direct_intent == "__admission_account_clarification__":
            return self._choice_response(
                "Which account do you mean?",
                [
                    {"label": "Institutional email account", "payload": "/direct_intent{\"intent\":\"institutional_email_account\"}"},
                    {"label": "Admission password help", "payload": "/direct_intent{\"intent\":\"Change_Pass_admission\"}"},
                ],
            )
        if direct_intent == "__student_portal_password_clarification__":
            return self._choice_response(
                "Which student portal password do you mean?",
                [
                    {"label": "Admission Forgot Password", "payload": "/direct_intent{\"intent\":\"Change_Pass_admission\"}"},
                    {"label": "SIAS password", "payload": "/direct_intent{\"intent\":\"sias_forgot_password\"}"},
                ],
            )
        if direct_intent == "__student_portal_login_clarification__":
            return self._choice_response(
                "Which student portal do you want to log in to?",
                [
                    {"label": "Admission portal", "payload": "/direct_intent{\"intent\":\"admission_portal_login\"}"},
                    {"label": "SIAS portal", "payload": "/direct_intent{\"intent\":\"sias_login_process\"}"},
                ],
            )
        if direct_intent == "__validation_clarification__":
            return self.validation_clarification_response(intent, user_message) or self.data_loader.fallback()
        if direct_intent == "__id_clarification__":
            return self._choice_response(
                "Which ID do you mean?",
                [
                    {"label": "Student ID", "payload": "/direct_intent{\"intent\":\"student_id_requirements\"}"},
                    {"label": "Library ID", "payload": "/direct_intent{\"intent\":\"library_id_card_location\"}"},
                ],
            )
        if direct_intent == "__passing_grade_clarification__":
            return self._choice_response(
                "Do you mean the BukSU CAT passing percentage?",
                [
                    {"label": "BukSU CAT passing rate", "payload": "/direct_intent{\"intent\":\"board_course_cutoff_score\"}"},
                ],
            )
        if direct_intent == "__clinic_services_menu__":
            return self._clinic_services_menu()
        if direct_intent == "__dormitory_services_menu__":
            return self._dormitory_services_menu()
        if direct_intent == "__classroom_policy_menu__":
            return self._classroom_policy_menu()
        if direct_intent:
            self.last_selected_intent = direct_intent
            return self.data_loader.get_response(direct_intent, user_message=user_message, domain=active_domain)

        validation_choice = self.validation_clarification_response(intent, user_message)
        if validation_choice:
            return validation_choice

        services_choice = self.services_response(intent, user_message) if not active_domain or active_domain == "services" else None
        if services_choice:
            return services_choice

        query_tokens = self.interpreter.tokens(user_message)
        raw_tokens = self.interpreter.tokens(user_message, expand=False) or self.interpreter.normalize(user_message).replace("?", "").split()
        clarification_tokens = raw_tokens
        if not entity_values and self._needs_subject_clarification(intent, clarification_tokens):
            return self._clarification_for(intent)

        if not query_tokens and not entity_values:
            return self._domain_fallback_response(active_domain)

        if not entity_values and self.interpreter.normalize(user_message) in {"what is it", "what it", "about it"}:
            return self._domain_fallback_response(active_domain)

        if not entity_values and self._looks_like_unresolved_location_query(user_message) and active_domain != "location":
            if active_domain:
                return self._domain_fallback_response(active_domain)
            return self.data_loader.fallback()

        retrieval_result = self.retrieval_scorer.search(intent, user_message, entity_values, domain=active_domain)
        if retrieval_result.is_high_confidence and retrieval_result.intent:
            print(f"[RASA NLU - HIGH CONFIDENCE] Query: '{user_message}' -> Score: {retrieval_result.score:.2f} -> Intent: '{retrieval_result.intent}' (RASA took over)")
            self.last_selected_intent = retrieval_result.intent
            return self.data_loader.get_response(retrieval_result.intent, user_message=user_message, domain=active_domain)

        llm_candidate = self.llm_reranker.choose(user_message, retrieval_result)
        if llm_candidate:
            print(f"[LLM MATCH - TAKEOVER] Query: '{user_message}' -> Selected: '{llm_candidate.intent}' (LLM took over)")
            self.last_selected_intent = llm_candidate.intent
            return self.data_loader.get_response(llm_candidate.intent, user_message=user_message, domain=active_domain)

        if retrieval_result.is_medium_confidence and retrieval_result.intent and not retrieval_result.runner_up:
            print(f"[RASA NLU - MEDIUM CONFIDENCE] Query: '{user_message}' -> Score: {retrieval_result.score:.2f} -> Intent: '{retrieval_result.intent}' (RASA took over)")
            self.last_selected_intent = retrieval_result.intent
            return self.data_loader.get_response(retrieval_result.intent, user_message=user_message, domain=active_domain)

        if retrieval_result.is_medium_confidence:
            print(f"[ROUTER - CLARIFICATION] Query: '{user_message}' -> Presenting disambiguation buttons")
            return self.retrieval_scorer.clarification(retrieval_result)

        print(f"[ROUTER - DOMAIN FALLBACK] Query: '{user_message}' -> Domain fallback for '{active_domain}'")
        return self._domain_fallback_response(active_domain, retrieval_result=retrieval_result)

    def _domain_fallback_response(
        self,
        active_domain: Optional[str],
        retrieval_result: Optional[Any] = None,
    ) -> Any:
        from domain_registry import get_domain_info, get_domain_suggestions
        if not active_domain:
            return self.data_loader.fallback()

        info = get_domain_info(active_domain)
        title = info.get("title", "this category") if info else "this category"
        
        # Extract dynamic suggestion buttons from ranked candidates within the category
        suggestions = []
        if retrieval_result and hasattr(retrieval_result, "ranked_candidates") and retrieval_result.ranked_candidates:
            seen_labels = set()
            for cand in retrieval_result.ranked_candidates:
                label = str(getattr(cand, "display_name", None) or getattr(cand, "topic", None) or getattr(cand, "intent", None) or "").strip()
                if label and label.lower() not in seen_labels and not label.startswith("__"):
                    seen_labels.add(label.lower())
                    phrases = getattr(cand, "phrases", [])
                    payload = phrases[0] if phrases else label
                    suggestions.append({"label": label, "payload": payload})
                if len(suggestions) >= 3:
                    break

        # If not enough partial candidate matches, fill with domain starters
        if len(suggestions) < 3:
            domain_starters = get_domain_suggestions(active_domain)
            for q in domain_starters:
                if q.lower() not in {s["label"].lower() for s in suggestions}:
                    suggestions.append({"label": q, "payload": q})
                if len(suggestions) >= 3:
                    break

        return {
            "text": f"I couldn't find a matching answer for that in **{title}**.\n\nYou can try asking about:",
            "custom": {
                "suggestions": suggestions
            },
        }

    def _looks_like_unresolved_location_query(self, user_message: str) -> bool:
        text = self.interpreter.normalize(user_message)
        if self._has_any(text, ["uniform", "civilian attire", "civilian clothes", "dress code", "not wearing uniform", "without uniform"]):
            return False
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
                [
                    "information technology",
                    "food technology",
                    "automotive technology",
                    "electronics technology",
                    "entertainment and multimedia",
                    "digital animation",
                    "multimedia computing",
                ],
                ("Dean_0f_COT", "Head_of_COT"),
            ),
            (
                ["bsap", "philosophy"],
                [
                    "bachelor of arts in philosophy",
                    "bachelor of arts in english",
                    "bachelor of arts in social science",
                    "bachelor of science in biology",
                    "english language",
                    "social science",
                    "sociology",
                    "economics",
                    "biology",
                    "environmental science",
                    "mathematics",
                    "development communication",
                    "community development",
                ],
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
            if self._has_any(text, ["meaning", "what is", "what does", "definition", "explain", "pasabot"]):
                return "meaning_of_nonboard_course"
            return "buksu_non_board_courses"
        if self._has_any(text, ["board course", "board courses"]):
            if self._has_any(text, ["meaning", "what is", "what does", "definition", "explain", "pasabot"]):
                return "meaning_of_board_course"
            return "buksu_board_courses"
        if self._has_any(text, [
            "courses offered",
            "course offered",
            "courses offerd",
            "course offerd",
            "what courses",
            "course list",
            "programs offered",
            "all courses",
            "courses nga gina offer",
            "courses nga gi offer",
            "kurso nga gina offer",
            "kurso nga gi offer",
            "listahan sa mga courses",
            "listahan sa mga kurso",
            "mga courses ang gina offer",
            "mga courses nga gina offer",
            "mga kurso ang gina offer",
            "mga kurso nga gina offer",
        ]):
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
        if self._has_any(text, ["pros", "cons", "benefit", "benefits", "advantage", "advantages", "rules", "curfew", "good", "downside"]):
            return "dormitory_pros_cons"
        if self._has_any(text, [
            "slot", "slots", "available", "availability", "who can stay", "athlete",
            "can freshmen stay", "kinsa pwede", "requirements availability", "information details",
        ]):
            return "buksu_dormitory_information"
        if self._has_any_token(text, ["female", "girls", "girl"]) or self._has_any(text, ["rubia"]):
            return "female_dorm"
        if self._has_any_token(text, ["male", "boys", "boy"]) or self._has_any(text, ["mahogany"]):
            return "male_dorm"
        return "campus_dormitories"

    def _university_route(self, text: str) -> Optional[str]:
        has_university_context = self._has_any(text, ["buksu", "bukidnon state university", "university", "school"])
        has_specific_university_term = (
            self._has_any_token(text, [
                "mission", "vision", "values", "seal", "hymn", "gazette", "ranking", "rank",
                "wuri", "edurank", "greenmetric", "founded", "founding", "history", "age",
                "president", "presidents", "abbreviation", "acronym", "tba",
            ]) or
            self._has_any(text, [
                "buksu overview", "explain buksu", "school information",
                "core values", "became university", "become university", "university status",
                "meaning of buksu", "buksu meaning", "what does buksu mean",
                "buksu stands for", "unsa pasabot buksu", "unsa meaning sa buksu",
                "campus tour", "tour buksu", "visitors tour", "song lyrics",
                "study place", "where to study", "place to review",
                "can i study in library", "mag study", "how old", "years old",
                "how many years", "how long has", "university age", "age of school",
                "worth it", "why choose buksu", "good school", "recommended",
                "worth studying", "freshmen choose", "okay ba mag study",
                "to be announced", "historical background", "how did buksu start",
                "foundation year", "when did buksu start", "changed to university",
                "nahimong university", "leader when buksu became university",
                "dr joy mirasol", "who leads buksu",
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
        if self._has_any_token(text, ["hymn"]) or self._has_any(text, ["buksu song", "song lyrics"]):
            return "buksu_hymn_lyrics"
        if self._has_any_token(text, ["gazette"]):
            return "Whats_buksu_gazette"
        if self._has_any_token(text, ["ranking", "rank", "wuri", "edurank", "greenmetric"]):
            return "current_rank"
        if self._has_any(text, [
            "buksu presidents", "buksu president list", "buksu presidents list",
            "list of buksu presidents", "list of bukidnon state university presidents",
            "presidents list", "list of presidents", "former president", "former presidents",
            "past president", "past presidents", "previous president", "previous presidents",
            "old president", "old presidents", "who were the presidents", "mga president",
            "former university presidents", "previous university presidents",
            "president history list",
        ]):
            return "buksu_presidents_list"
        if self._has_any(text, ["president", "leader"]) and self._has_any(text, [
            "became university", "2007", "at the time", "first university president",
            "first president of buksu", "first buksu president", "during university status",
            "pag become university", "when university status granted",
        ]):
            return "Pres_thetime_university"
        if self._has_any(text, ["president", "dr joy mirasol", "who leads buksu"]):
            return "buksu_president"
        if self._has_any(text, ["became university", "become university", "university status", "changed to university", "nahimong university"]):
            return "buksu_become_university"
        if self._has_any(text, ["how old", "age", "years old", "how many years", "how long has", "age of school"]):
            return "Buksu_age"
        if self._has_any(text, ["founded", "founding", "anniversary", "foundation year", "when did buksu start"]):
            return "founding"
        if self._has_any(text, ["history", "background", "historical background", "how did buksu start"]):
            return "buksu_history_background"
        if self._has_any(text, [
            "abbreviation", "acronym", "meaning of buksu", "buksu meaning",
            "what does buksu mean", "buksu stands for", "unsa pasabot buksu",
            "unsa meaning sa buksu",
        ]):
            return "meaning_of_buksu"
        if self._has_any(text, ["where", "location", "located"]):
            return "bukus_location"
        if self._has_any(text, [
            "worth it", "should i study", "why choose buksu", "good school",
            "recommended", "worth studying", "freshmen choose", "okay ba mag study",
        ]):
            return "Buksu_worth_it"
        if self._has_any(text, [
            "study place", "where can i study", "where to study", "place to review",
            "place to study", "quiet place", "study area", "mag study",
            "can i study in library",
        ]):
            return "buksu_study_place"
        if self._has_any(text, ["campus tour", "tour", "tour buksu", "visitors tour", "visitors tour buksu"]):
            return "Campus_tour"
        if has_university_context and explicit_about_buksu:
            return "about_buksu"
        if self._has_any(text, ["buksu overview", "explain buksu", "school information"]):
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
    def location_responses(self, locations: List[str], user_message: str) -> List[Dict[str, Any]]:
        responses = []
        for location in locations:
            response = self.data_loader.get_location_response(location, user_message)
            text = response.get("text", "")
            if text and not text.lower().startswith("sorry, i don't have information"):
                responses.append(response)
        return responses
