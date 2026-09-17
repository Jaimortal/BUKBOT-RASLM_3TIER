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
        (["bsit", "information technology", "information tech"], "buksu_IT", "buksu_bsit_program"),
        (["bsft", "ft", "food technology", "food processing", "food tech"], "buksu_FT", "buksu_BSFT_program"),
        (["bset", "et", "electronics technology", "electronics tech"], "buksu_ET", "buksu_BSET_program"),
        (["bsemc", "bsemc dat", "emc", "digital animation", "multimedia computing", "entertainment and multimedia"], "buksu_EMC", "buksu_BSEMC-DAT_program"),
        (["bs bio", "bsbio", "biology", "biotechnology"], "buksu_BS-BIO", "buksu_BS-BIO_program"),
        (["ab socsci", "ba socsci", "ab social science", "ba social science", "social science"], "buksu_AB_SocSci", "buksu_AB SocSci_program"),
        (["bsed fil", "bsed filipino", "filipino education"], "buksu_BSED_FIL", "buksu_BSED-FIL_program"),
        (["bsed math", "mathematics education", "mathematics teaching"], "buksu_BSED_MATH", "buksu_BSED-MATH_program"),
        (["beed", "elementary education", "elementary school kids", "elementary teaching"], "buksu_BEED_program", "buksu_BEED_program"),
        (["bsn", "nursing"], "buksu_BSN", "buksu_BSN_program"),
        (["bsap", "ab philo", "ba philo", "ab philosophy", "ba philosophy", "philo", "philosophy"], "buksu_AB_PHILO", "buksu_AB-PHILO_program"),
        (["bs es", "bses", "environmental science", "environmental conservation", "environmental heritage", "ecology degree"], "buksu_BS_ES", "buksu_BS-ES_program"),
        (["ab socio", "ba socio", "ab sociology", "ba sociology", "sociology"], "buksu_AB_SOCIO", "buksu_AB-SOCIO_program"),
        (["ab eng", "ba eng", "ab english", "ba english", "english language", "english literature"], "buksu_AB_ENG", "buksu_AB-ENG_program"),
        (["bped", "physical education", "sports coaches", "sports teachers"], "buksu_BPED", "buksu_BPED_program"),
        (["bs comdev", "bscomdev", "comdev", "community development", "community organizing"], "buksu_BS_COMDEV", "buksu_BS COMDEV_program"),
        (["ab econ", "ba econ", "ab economics", "ba economics", "economics", "market analysis degree"], "buksu_AB_ECON", "buksu_AB-ECON_program"),
        (["beced", "early childhood education"], "buksu_BECED", "buksu_BECED_program"),
        (["bsdc", "development communication", "devcom"], "buksu_BSDC", "buksu_BSDC_program"),
        (["bshm", "hospitality management", "hotel and restaurant"], "buksu_BSHM", "buksu_BSHM_program"),
        (["bsat", "automotive technology", "automotive engine", "vehicle repair"], "buksu_BSAT", "buksu_BSAT_program"),
        (["bpa", "public administration", "public governance", "government management"], "buksu_BPA", "buksu_BPA_program"),
        (["bs math", "bsmath", "mathematics"], "buksu_BS_MATH", "buksu_BS-MATH_program"),
        (["bsa", "accountancy", "bs accountancy", "aspiring cpas"], "buksu_BSA", "buksu_BSA_program"),
        (["bsba fm", "bsbafm", "bsba", "financial management", "corporate banking", "business administration"], "buksu_BSBA_FM", "buksu_BSBA-FM_program"),
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
        self.last_answering_source: Optional[str] = None

    def _has_any(self, text: str, terms: List[str]) -> bool:
        normalized = self.interpreter.normalize(text)
        for term in terms:
            norm_term = self.interpreter.normalize(term).strip()
            if not norm_term:
                continue
            if re.search(rf"(?<!\w){re.escape(norm_term)}(?!\w)", normalized):
                return True
        return False

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

        # Exclude queries asking about specific items, services, cards, rules, schedules, or fees inside the facility
        non_facility_subjects = [
            "card", "id", "book", "books", "borrow", "return", "penalty", "fee", "fees",
            "payment", "pay", "requirement", "requirements", "service", "services",
            "hour", "hours", "schedule", "time", "when", "contact",
            "permit", "handbook", "replace", "replacement", "lost", "another", "form",
            "weekend", "weekends", "saturday", "sunday", "holiday", "operating hours", "office hours",
        ]
        if any(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized) for term in non_facility_subjects):
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
        raw_intent = self._calculate_direct_intent_override(intent, user_message, entity_values, active_domain=active_domain)
        if not raw_intent:
            return None

        # In Open/Unrestricted Mode (no active_domain), allow all direct overrides
        if not active_domain:
            return raw_intent

        # Internal menus domain scoping
        if str(raw_intent).startswith("__"):
            menu_allowed_domains = {
                "__clinic_services_menu__": {"services"},
                "__dormitory_services_menu__": {"services", "others"},
                "__classroom_policy_menu__": {"university", "academics"},
                "__student_portal_login_clarification__": {"procedures", "university"},
                "__student_portal_password_clarification__": {"procedures", "university", "services"},
                "__validation_clarification__": {"procedures", "services"},
                "__id_clarification__": {"procedures", "services"},
                "__passing_grade_clarification__": {"procedures", "academics"},
                "__contact_clarification__": {"services", "others", "university"},
                "__private_student_records_guardrail__": {"academics", "procedures", "services", "university", "others"},
                "__out_of_scope_guardrail__": {"academics", "procedures", "services", "university", "others"},
            }
            allowed = menu_allowed_domains.get(str(raw_intent))
            if allowed is not None and active_domain not in allowed:
                return None
            return raw_intent

        # Verify that raw_intent strictly belongs to active_domain
        if self.data_loader.is_intent_in_domain(raw_intent, active_domain):
            return raw_intent

        # Specific cross-domain bridges (e.g., student service procedures relevant to services domain)
        service_procedure_intents = {
            "clinic_medical_certificate_process",
            "clinic_medical_certificate_cost",
            "clinic_medical_certificate_duration",
        }
        if active_domain == "services" and raw_intent in service_procedure_intents:
            return raw_intent

        # Reject out-of-domain match to prevent cross-domain leak
        return None

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

        # 0. CAT Requirements / Cutoff Score / Passing Score for Courses (including IT, EMC, FT, Nursing, Education, Doctors, Masteral, etc.)
        is_cat_term = self._has_any(text, [
            "cat", "buksu-cat", "buksucat", "entrance exam", "admission test", "admission exam",
            "college admission test", "exam", "testing", "ror", "report of rating"
        ])
        is_score_or_cutoff_or_req = self._has_any(text, [
            "required", "requirement", "requirements", "score", "scores", "cutoff", "cut-off", "cut off",
            "passing", "pass", "makapasar", "makasulod", "rating", "qualify", "qualification",
            "needed", "need", "kinahanglan", "kailangan", "pila", "unsa", "grade", "percentage",
            "pila ang", "unsa ang", "pila ka", "unsay", "pilay"
        ])

        # Detect graduate / doctor / masteral programs
        has_graduate_or_doctor_course = (
            self._has_any(text, [
                "doctor", "doctors", "doctorate", "doctoral", "doctor of medicine",
                "master", "masters", "masteral", "master's", "graduate program", "graduate programs",
                "graduate studies", "graduate school", "post-graduate", "postgraduate", "phd", "edd",
                "grad school", "grad studies"
            ]) or
            bool(re.search(r"\b(for|sa|in|para\s+sa|of)\s+medicine\b", text)) or
            bool(re.search(r"\bmedicine\s+(course|program|student|admission|department)\b", text)) or
            bool(re.search(r"\b(mba|mpa)\b", text))
        )

        # Detect courses (including short acronyms like IT, EMC, FT, ET, AT, etc.)
        has_it_course = (
            self._has_any(text, ["bsit", "bs-it", "bs it", "information technology", "info tech", "infotech"]) or
            bool(re.search(r"\b(for|in|sa|para\s+sa|about|under|course|program|major|department|of)\s+it\b", text, re.IGNORECASE)) or
            bool(re.search(r"\bit\s+(course|program|department|student|major|curriculum|subjects)\b", text, re.IGNORECASE)) or
            bool(re.search(r"\bIT\b", raw_text))
        )
        has_nursing_course = self._has_any(text, ["nursing", "bsn", "bs-n", "bs n", "nurse", "nurses"])
        has_education_course = self._has_any(text, ["education", "beed", "bsed", "beced", "bped", "teacher education", "educ"])
        has_other_course = (
            self._has_any(text, [
                "emc", "bsemc", "bs-emc", "bs emc", "digital animation", "multimedia",
                "ft", "bsft", "bs-ft", "bs ft", "food technology", "food tech",
                "et", "bset", "bs-et", "bs et", "electronics technology", "electronics tech",
                "bsa", "accountancy", "accounting", "cpa", "aspiring cpa",
                "bsba", "bsba-fm", "bsba fm", "financial management", "business administration",
                "bpa", "public administration",
                "bshm", "hospitality management", "hotel and restaurant", "hrm",
                "bsdc", "devcom", "development communication",
                "bsat", "automotive technology", "automotive",
                "bs-bio", "bs bio", "biology", "biotechnology",
                "bs-math", "bs math", "mathematics",
                "bs-es", "bs es", "environmental science", "ecology",
                "bs-comdev", "bs comdev", "comdev", "community development",
                "ab-econ", "ab econ", "economics",
                "ab-socio", "ab socio", "sociology",
                "ab-eng", "ab eng", "english language",
                "ab-philo", "ab philo", "philosophy",
                "ab-socsci", "ab socsci", "social science",
                "course", "courses", "program", "programs", "kurso", "non-board", "non board", "board course", "board courses"
            ]) or
            bool(re.search(r"\b(for|in|sa|para\s+sa|of)\s+at\b", text, re.IGNORECASE)) or
            bool(re.search(r"\bAT\b", raw_text))
        )

        has_any_course_target = has_it_course or has_nursing_course or has_education_course or has_other_course or has_graduate_or_doctor_course

        has_gpat = (
            self._has_any(text, [
                "gpat", "graduate program admission test", "graduate admission test",
                "graduate school admission test", "graduate admission exam", "graduate admission testing",
                "admission testing graduate", "admission test graduate", "admission exam graduate",
                "testing graduate program", "test graduate program", "exam graduate program",
                "graduate studies admission test", "graduate studies admission exam",
                "graduate school admission exam", "graduate entrance exam",
                "masteral admission test", "masters admission test", "doctorate admission test",
                "admission testing application graduate", "admission testing fee for buksu graduate",
                "application requirements for buksu graduate",
            ]) or (
                self._has_any(text, ["admission test", "admission testing", "admission exam", "entrance exam", "testing", "gpat"]) and
                self._has_any(text, ["graduate program", "graduate programs", "graduate studies", "graduate school", "masteral", "masters", "doctorate"])
            ) or (
                self._has_any(text, ["graduate", "graduates", "graduate studies", "graduate school", "masteral", "masters"]) and
                self._has_any(text, ["apply", "application", "requirements", "requirement", "fee", "pila", "unsa kailangan", "unsa kinahanglan", "kinahanglan"]) and
                self._has_any(text, ["admission", "test", "testing", "exam", "gpat"])
            )
        )

        # Check Graduate Program Admission Test (GPAT) first for graduate/doctor/masteral testing or requirements
        has_gpat_testing_query = (
            has_gpat or
            self._has_any(text, [
                "gpat", "graduate program admission test", "graduate admission test", "graduate admission testing",
                "admission testing graduate", "admission test graduate", "admission exam graduate",
                "testing graduate program", "test graduate program", "exam graduate program",
                "graduate studies admission test", "graduate studies admission exam",
                "graduate school admission exam", "graduate entrance exam",
            ]) or (
                has_graduate_or_doctor_course and self._has_any(text, [
                    "admission testing", "admission test", "admission exam", "testing", "entrance exam",
                    "apply", "application", "fee", "schedule", "requirements", "requirement",
                    "need", "needed", "kinahanglan", "kailangan", "unsaon", "how to apply"
                ]) and not self._has_any(text, ["buksu cat", "cat score", "cat requirement", "cat cutoff", "cat passing"])
            )
        )
        if has_gpat_testing_query:
            return "gpat_admission_requirements"

        # Check CAT / Admission requirement for Doctor / Masteral programs (specifically asking if CAT applies to them)
        if (
            (is_cat_term and has_graduate_or_doctor_course and self._has_any(text, ["cat", "buksu cat", "buksucat"])) or
            (self._has_any(text, ["score", "scores", "cutoff", "cut-off", "cut off", "passing", "makasulod", "makapasar", "qualify", "qualification"]) and has_graduate_or_doctor_course and not self._has_any(text, ["gpat", "lsat", "nmat"])) or
            (self._has_any(text, ["required cat", "cat required", "cat score required", "cat requirement", "cat cutoff", "cat passing"]) and has_graduate_or_doctor_course)
        ):
            return "cat_requirement_doctors_masteral"

        # General BukSU CAT definition (checked before course score if no specific course is mentioned)
        if self._has_any(text, [
            "what is buksu cat", "what is the buksu cat", "what is cat exam", "what is cat admission",
            "unsa ang buksu cat", "unsa ang buksucat", "unsay buksu cat", "unsa nang buksu cat",
            "about buksu cat", "meaning of buksu cat", "unsa ang cat exam", "what is buksu-cat"
        ]) and not has_any_course_target and not self._has_any(text, ["score", "cutoff", "cut-off", "cut off", "passing", "rating", "percentage", "qualify", "qualification"]):
            return "buksu_cat_definition"

        if (
            (is_cat_term and is_score_or_cutoff_or_req and has_any_course_target) or
            (self._has_any(text, ["score", "scores", "cutoff", "cut-off", "cut off", "passing", "makasulod", "makapasar", "rate", "rating"]) and has_any_course_target) or
            (self._has_any(text, ["pila ang cat", "unsa ang cat", "pila ang score", "unsa ang score", "pila ang passing", "unsa ang passing", "pila score", "unsa score", "pila cutoff", "unsa cutoff"]) and has_any_course_target) or
            (self._has_any(text, ["required cat", "cat required", "cat score required", "cat requirement", "cat cutoff", "cat passing"]) and has_any_course_target)
        ):
            if has_graduate_or_doctor_course:
                return "cat_requirement_doctors_masteral"
            if has_nursing_course:
                return "cat_requirement_nursing_program"
            if has_education_course:
                return "cat_requirement_education_program"
            if self._has_any(text, ["non board", "non-board"]):
                return "Cat_score_for_nonboard"
            if self._has_any(text, ["board course", "board courses"]):
                return "board_course_cutoff_score"
            return "program_cutoff_scores"

        # 1. Grade 12 / Senior High School Admission Application (Checked BEFORE Privacy to avoid "grade" collision)
        if self._has_any(text, [
            "grade 12", "shs", "senior high", "graduating grade 12", "kung grade 12", "pag grade 12", "grade 12 pa ko", "grade 12 student"
        ]) and self._has_any(text, [
            "apply", "admission", "enroll", "unsaon", "how", "pwede ba", "requirements"
        ]):
            return "freshman_admission_requirements"

        # 2. Privacy Guardrail for Personal Records, Grades, GPA, and Financial Balance
        is_grade_level = any(k in text for k in ["grade 12", "grade 11", "grade 10", "grade 7", "grade 8", "grade 9"])
        has_private_metric = any(re.search(rf"\b{re.escape(k)}\b", text) for k in [
            "grado", "gpa", "gwa", "balance sa tuition", "tuition balance", "tuition fee balance", "akong balance", "my balance"
        ]) or (
            not is_grade_level and any(re.search(rf"\b{re.escape(k)}\b", text) for k in ["grade", "grades"])
        )
        has_personal_pronoun = any(re.search(rf"\b{re.escape(w)}\b", text) for w in [
            "my", "akong", "akoang", "nako", "current", "this semester", "karon", "ako bang"
        ]) or any(phrase in text for phrase in [
            "what is my", "what's my", "unsa akong", "unsa akoang", "pila akong", "pila akoang", "pila akong balance", "unsa akong balance"
        ])
        is_policy_inquiry = any(re.search(rf"\b{re.escape(p)}\b", text) for p in [
            "inc", "incomplete", "convert", "conversion", "deadline", "allowed period", "requirement", "requirements",
            "rule", "rules", "policy", "policies", "passing", "fail", "failing", "failed", "retention", "probation",
            "dean's list", "latin honor", "latin honors", "cum laude", "summa", "magna", "shift", "shifting", "drop",
            "dropped", "dropping", "scale", "meaning", "system", "passing grade", "passing rate", "5.0", "3.0", "2.75",
            "2.5", "2.25", "2.0", "1.75", "1.5", "1.25", "1.0", "what does a grade of", "unsa ang 5.0", "unsa ang 3.0",
            "unsa ang 1.0", "gwa calculated", "compute", "computed", "computation", "computing", "calculate", "calculated",
            "calculation", "calculating", "instructor", "instructors", "teacher", "teachers", "professor", "professors",
            "faculty", "maestro", "quizzes", "quiz", "exam", "exams", "participation", "criteria", "kwenta", "pamaagi",
            "re-check", "recheck", "re check", "appeal", "re-evaluation", "reevaluation", "sayop", "wrong",
            "weighted", "equally", "timbang", "regular student", "minimum grade", "major subject", "standing",
            "drop my gwa", "epekto sa akong gwa", "dako ba ang epekto", "usa ka bagsak", "bagsak na", "bagsak ba"
        ])
        if has_private_metric and has_personal_pronoun and not is_policy_inquiry:
            return "__private_student_records_guardrail__"

        # 3. Out-of-Scope Guardrail for External City/Weather/Transit Queries
        if any(p in text for p in [
            "weather sa malaybalay", "weather in malaybalay", "panahon sa malaybalay", "current weather", "weather today",
            "boarding house near buksu", "boarding house duol buksu", "average cost of a boarding house", "safe ba mag-inarkila",
            "last jeepney", "jeepney trip", "jeepney route", "jeepney", "terminal padulong sa buksu", "terminal padulong buksu"
        ]):
            return "__out_of_scope_guardrail__"

        # 4. Late Enrollment & Late Penalty
        if self._has_any(text, [
            "enroll late", "late enroll", "late enrollment", "late mag-enroll", "late mo-enroll", "mag late enroll",
            "penalty for late enrollment", "penalty sa late enroll", "multa sa late enroll", "late mag enroll"
        ]) and not self._has_any(text, ["evening", "working", "night"]):
            return "late_enrollment"

        # 5. Incomplete (INC) Grade Policy
        if self._has_any(text, [
            "inc grade", "incomplete grade", "unsay buot ipasabot sa inc", "meaning of inc", "what is inc grade", "inc nga grado", "inc rules", "inc policy",
            "clear an inc", "inc deadline", "remove an inc", "matanggal ang inc", "inc gikan sa duha ka semester", "inc sa akong transcript", "pila ka inc ang pwede"
        ]) or (
            "inc" in raw_tokens and any(w in text for w in ["grade", "meaning", "pasabot", "rules", "policy", "grado", "deadline", "matanggal", "clear"])
        ):
            return "inc_grade_rules"

        # 6. Laptop / Gadget Financial Assistance & CHED Student Loans
        if self._has_any(text, [
            "laptop assistance", "gadget assistance", "tabang para gadget", "gadget para online class", "laptop para klase", "gadget assistance para",
            "ched student loan", "student loan", "ched loan", "ched program"
        ]):
            return "available_scholarships_buksu"

        # 7. Form 138 / Senior High School Report Card Submission -> Enrollment Documents
        if self._has_any(text, [
            "form 138", "form138", "report card submission", "mopadala sa akong form 138", "asa ihatag ang form 138", "asa ko mopadala sa akong form 138", "where to submit form 138"
        ]):
            return "enrollment_documents"

        # 8. Summer / Midyear Classes Policy
        if self._has_any(text, [
            "summer class", "summer classes", "midyear class", "midyear classes", "summer term", "naa bay summer classes"
        ]):
            return "summer_classes_policy"

        # 9. Returning Student / Balik-Aral Readmission
        if self._has_any(text, [
            "stopped studying", "stopped studying at buksu", "years ago can i come back", "balik aral", "returning student",
            "mobalik og eskwela", "undong unya mobalik", "readmission process", "readmission requirements"
        ]):
            return "returning_student_readmission_process"

        # 10. After Freshman Orientation Next Steps
        if self._has_any(text, [
            "human sa orientation", "human orientation", "after orientation", "after the orientation", "where to go after orientation", "welcome event", "freshman welcome"
        ]):
            return "orientation_next_steps"

        # 11. Student Organizations & SSC
        if self._has_any(text, [
            "join the student council", "join student council", "student council", "apil sa student council", "supreme student council", "join supreme student council", "ssc election"
        ]):
            return "supreme_student_council_joining_info"
        if self._has_any(text, [
            "mga org nga pwede sundan", "join sa org", "maka-join sa org", "student organizations", "accredited orgs", "org fair", "extracurricular activities"
        ]):
            return "student_organizations_application_process"

        # 12. Kaugmaon Official Student Publication
        if self._has_any(text, [
            "kaugmaon", "school publication", "school newspaper", "student publication"
        ]):
            return "kaugmaon_student_publication_application"

        # 13. Varsity & Sports Teams
        if self._has_any(text, [
            "varsity team", "varsity", "basketball team", "sports varsity", "varsity tryout", "varsity sports"
        ]):
            return "buksu_varsity_and_sports_teams"

        # 14. Student Grievances, Anti-Bullying, & Faculty Reports
        if self._has_any(text, [
            "bullying sa campus", "bullying", "problema sa akong professor", "problema sa professor", "report a professor", "reklamo sa maestro", "student grievance", "report harassment", "problema sa akong maestro"
        ]):
            return "student_grievance_and_complaints_process"

        # 15. BukSU Satellite Campuses
        if self._has_any(text, [
            "how many campuses", "pila ka campus", "satellite campuses", "branches of buksu", "mga satellite campus"
        ]):
            return "buksu_satellite_campuses"

        # 16. Campus Gates & Entrances
        if self._has_any(text, [
            "how many gates", "pila ka gate", "walking students", "naglakaw mosulod", "examinees enter", "mag-exam sa buksu-cat",
            "vehicle entrance", "entrance para sa mga sakyanan", "exit gate", "entrance gate", "pinakaduol nga gate", "which gate", "closest gate", "main gate buksu", "campus gate", "gates and entrances",
            "unsang pultahan ang para sa mga estudyante", "asa mosulod ang mga mag-exam", "usa ra ba ang exit gate"
        ]):
            return "campus_gates_and_entrances"

        # 16a. Gate Pass Policy, Office, Validity, and Coverage
        if self._has_any(text, ["gate pass", "gatepass", "vehicle pass", "get pass", "pass sa motor", "pass sa sakyanan"]):
            if self._has_any(text, ["bicycle", "bicycles", "bike", "bikes", "bisekleta", "bisikleta"]):
                return "bike_gate_pass"
            if self._has_any(text, [
                "get", "getting", "apply", "applying", "application", "acquire", "acquiring", "acquisition", "acquirment",
                "obtain", "secure", "securing", "claim", "request", "process", "procedure", "step", "steps",
                "kuha", "kuhaon", "makakuha", "pagkuha", "mokuha", "mukuha", "kuhag", "mangayo", "pangayo",
                "where", "asa", "aha", "unsaon", "pamaagi", "how do", "how can", "how to", "how"
            ]):
                return "gate_pass_process"
            return "general_gate_pass"

        # 16b. Computer Laboratories & Floors
        if self._has_any(text, [
            "computer lab", "computer labs", "comlab", "com lab", "comlabs", "all comlab", "comlab 8", "comlab 9", "comlab 11",
            "floor sa computer lab", "computer laboratory", "computer laboratories"
        ]):
            return "all_comlab_locations"

        # 16c. Accounting Office & Window 9
        if self._has_any(text, [
            "accounting office", "where is accounting", "asa ang accounting", "window 9 inside the finance", "window 9 sa finance", "floor of the finance building is the accounting", "floor sa finance building ang accounting", "settle tuition fees at the accounting", "accounting office location"
        ]):
            return "accounting_office_location"

        # 16d. Sports Facilities
        if self._has_any(text, [
            "sports facilities", "sports facility", "basketball court", "varsity teams usually hold their practices",
            "varsity teams nagpraktis", "intramural events and competitions", "sports facilities for students",
            "sports facility ang gihatag", "basketball court inside", "basketball court sa buksu",
            "oval or open field", "open field para sa exercise", "oval o open field", "intramural events",
            "intramural competitions", "ginahimo ang intramural", "varsity teams"
        ]):
            return "sports_facilities_for_students"

        # 16d2. Campus Facilities Availability (ATM, Cafeteria, Gym, Parking, Museum)
        if self._has_any(text, ["atm machine", "atm sa sulod", "atm on campus", "withdraw cash"]):
            return "atm_facility_availability"
        if self._has_any(text, ["cafeteria", "canteen", "mokaon ang mga estudyante", "buy food"]):
            return "cafeteria_facility_availability"
        if self._has_any(text, ["gym open", "gymnasium open", "mosulod sa gym", "gym outside of pe"]):
            return "gym_facility_availability"
        if self._has_any(text, ["parking area", "parking for students", "parking area para sa mga estudyante", "bring vehicles"]):
            return "parking_facility_availability"
        if self._has_any(text, ["museum", "visiting hours ang museum", "museum visiting hours", "museum inside buksu"]):
            return "museum_facility_availability"

        # 16e. Office Hours & Noon Break
        if self._has_any(text, [
            "noon break", "no noon break", "lunch hour", "lunchbreak", "lunch break", "during lunchtime", "oras sa paniudto", "panahon sa tanghalian", "oras sa lunch break", "open at noon"
        ]):
            if self._has_any(text, ["oss", "student services"]):
                return "oss_no_noon_break_policy"
            return "no_noon_break_policy"
        if self._has_any(text, [
            "office schedule", "office hours", "offices open", "offices close", "oras nga bukas ug sirado ang mga opisina", "schedule sa tanang opisina", "offices open on weekends", "naa ba sa weekend"
        ]):
            return "office_schedule"

        # 16f. Graduation Clearance, Attendance, & Tracer Study
        if self._has_any(text, ["graduation rehearsal", "rehearsal attendance", "attendance sa graduation rehearsal", "rehearsal mandatory"]):
            return "graduation_rehearsal_attendance"
        if self._has_any(text, ["parents attend graduation", "relatives attend graduation", "family attend graduation", "ginikanan moadto sa graduation", "parents and relatives", "mga ginikanan ug pamilya moadto sa graduation"]):
            return "graduation_attendance"
        if self._has_any(text, ["tracer study", "answer tracer study", "motubag sa tracer study"]):
            return "tracer_study"
        if self._has_any(text, ["apply for graduation", "graduation clearance", "clearance system", "clearance for graduation", "apply sa graduation", "mag-apply para sa graduation", "graduation process", "online clearance", "dili mo-clear nako"]):
            return "graduation_clearance"

        # 16g. ICT / WiFi / Portal Accounts
        if self._has_any(text, ["locked out", "account locked", "portal locked", "na-lock ang akong portal", "locked out of my portal", "na-lock", "too many wrong attempts"]):
            return "portal_account_locked_issue"
        if self._has_any(text, ["update address", "update home address", "update student portal", "update personal information", "update sa akong address sa student portal", "wrong personal information", "sayop ang akong personal"]):
            return "update_student_portal_information"
        if self._has_any(text, ["create an account", "create account", "first time", "bag-ong account", "create og account"]) and self._has_any(text, ["portal", "student portal"]):
            return "sias_login_process"
        if self._has_any(text, ["forgot my portal password", "forgot portal password", "reset my portal password", "reset portal password", "nakalimtan ko ang akong portal password", "unsaon reset"]):
            return "sias_forgot_password"
        if self._has_any(text, ["portal account help", "portal account tabang", "buksu portal account"]):
            return "sias_login_process"
        if self._has_any(text, ["from home", "gawas sa campus", "outside campus", "access the student portal"]):
            return "sias_login_process"
        if self._has_any(text, ["mobile app", "app version", "mobile app nga bersyon"]):
            return "sias_login_process"
        if self._has_any(text, ["office hours of the ict", "oras sa opisina sa ict", "ict office hours"]):
            return "about_ict"
        if self._has_any(text, ["name is missing in the enrollment", "wala ko naa sa enrollment system", "missing in the enrollment system"]):
            return "about_ict"
        if self._has_any(text, ["what can the ict office help", "unsa pa ang tabang nga makuha sa ict", "aside from wi-fi", "gawas sa wi-fi"]):
            return "about_ict"
        if self._has_any(text, ["wi-fi works in some buildings", "not in my classroom", "dili sa akong classroom", "kinsa akong sultiihan", "who do i report this to"]):
            return "campus_wifi_access"

        # 16h. Grading System & Passing Marks
        if self._has_any(text, ["2.5", "2.5 in one subject", "good grade at buksu", "maayo ba to sa buksu", "minimum grade i need to pass", "pinakababa nga grado para makapasar", "pinakababa nga grado para ma-passing"]):
            return "buksu_grading_system"
        if self._has_any(text, ["3.0 passing", "passing ba ang 3.0", "3.0 o bagsak", "grade of 3.0", "grade of 5.0", "5.0 mean", "5.0 nga grado", "bagsak ba to", "1.0 mean", "1.0 nga grado", "unsaon kini makuha", "grading scale"]):
            return "buksu_grading_system"
        if self._has_any(text, ["weighted", "equally", "gwa weighted", "count equally", "parehas ba ang timbang", "compute my gwa", "compute sa akong gwa", "kwenta sa gwa", "drop my gwa", "epekto sa akong gwa"]):
            return "department_grade_computation"
        if self._has_any(text, ["re-check of my grade", "re-check sa akong grado", "sayop", "wrong grade"]):
            return "buksu_grading_system"

        # 16i. Attendance & FDA Policy
        if self._has_any(text, [
            "fda", "failure due to absences", "how many absences", "pila ka absent", "automatically fail a subject",
            "dili ko mabagsak sa subject", "sick for a week", "masakit ko og usa ka semana", "absent tungod sa sakit",
            "late 3 times", "tulo ka tardy", "pag-tardy", "tardiness", "keeps track of attendance", "track sa attendance",
            "excuse an absence", "medical certificate for absence", "medical certificate for absent", "medical certificate for excused absence", "medical certificate for sickness", "excuse sa professor", "marked me absent", "gi-mark absent"
        ]):
            return "fda_meaning"

        # 16j. Latin Honors
        if self._has_any(text, ["latin honor", "latin honors", "cum laude", "magna", "summa"]):
            if self._has_any(text, ["failing grade", "bagsak", "one failing"]):
                return "latin_honors_graduation_requirements"
            return "latin_honors_average_gpa"

        # 16k. Good Moral Certificate
        if self._has_any(text, ["good moral", "good moral certificate", "certificate of good moral", "good moral cert"]):
            if self._has_any(text, ["fee", "payment", "bayad", "pila ang bayad"]):
                return "good_moral_certificate_fee"
            return "request_good_moral_certificate_oss"

        # 16k2. Medical Certificate (Process, Cost, Duration)
        if self._has_any(text, [
            "medical certificate", "medical cert", "clinic certificate", "clinic cert",
            "certificate for ojt", "certificate for intramural", "certificate for field trip",
            "med cert", "med certificate"
        ]):
            if self._has_any(text, [
                "duration", "how long", "how many minutes", "how many hours", "pila ka minutes", "pila ka oras",
                "dugay", "processing time", "transaction time", "fast", "time needed", "time required"
            ]):
                return "clinic_medical_certificate_duration"
            if self._has_any(text, [
                "how much", "fee", "fees", "cost", "price", "pay", "payment", "bayad",
                "pila ang bayad", "pila bayad", "pila ang medical", "free", "zero cost", "mubayad", "walay bayad", "naay bayad"
            ]):
                return "clinic_medical_certificate_cost"
            return "clinic_medical_certificate_process"

        # 16l. Course Shifting
        if self._has_any(text, ["shift", "shifting", "mag-shift", "change course", "balhin og kurso"]):
            return "course_shifting"

        # 16m. University Mission / Vision / Identity / Profile
        if self._has_any(text, ["mission of buksu", "mission of bukidnon", "buksu mission", "unsa ang mission"]):
            return "buksu_mission"
        if self._has_any(text, ["vision of buksu", "vision of bukidnon", "buksu vision", "unsa ang vision", "vision statement"]):
            return "buksu_vision"
        if self._has_any(text, ["buksu hymn", "pinulungan sa buksu hymn", "hymn talk about"]):
            return "buksu_hymn_lyrics"
        if self._has_any(text, ["current president", "leading buksu", "presidente sa buksu", "karong presidente", "kinsa ang presidente", "university president"]):
            return "buksu_president"
        if self._has_any(text, ["private ba o state", "private or a state", "institution type", "klase sa unibersidad"]):
            return "about_buksu"

        # 16n. Student ID (replacement & campus entry)
        if self._has_any(text, ["photo requirement", "picture requirement", "2x2 photo", "2x2 picture"]) and self._has_any(text, ["id", "identification", "student id"]):
            return "student_id_requirements"
        if self._has_any(text, ["student id", "school id", "id card", "bag-ong id", "daan ko nga id"]):
            if self._has_any(text, ["enter campus without", "without my student id", "bisan wala pa ang akong bag-ong id", "use my old id", "mugamit sa daan", "forgot my id", "nakalimtan nako ang id", "waiting for my new", "sa balay"]):
                return "campus_entry_without_student_id"
            if self._has_any(text, ["damaged", "na-damage", "naputol", "nadaot", "lost", "nawala"]):
                return "lost_student_id_replacement_process"

        # 16o. Classroom Policies (relocation & eating)
        if self._has_any(text, ["moved our class", "moved class", "different room", "gilihok ang klase", "lain nga room", "lain na room"]):
            return "check_class_schedule"
        if self._has_any(text, ["kumain o moinom", "kaon o inom", "eat or drink", "eating or drinking", "food and drinks", "pagkaon ug ilimnon"]):
            return "eating_in_classroom"

        # 16p. Clinic Services
        if self._has_any(text, ["feel sick", "feeling sick", "masakit sa campus", "hilantan", "dili maayo ang pamati", "where can i go if i feel sick"]):
            return "medic_clinic"

        # 16q. Dress Code Slippers
        if self._has_any(text, ["tsinelas", "slippers", "flip-flops", "flip flops"]):
            return "campus_dress_code_policy"

        # 16r. COR Validation
        if self._has_any(text, ["window 7", "window7"]):
            return "cor_validation_location"
        if self._has_any(text, ["just printed my cor", "naka-print na ko sa cor", "printed my cor", "physical cor"]):
            return "cor_validation_steps"

        # 16s. Add Drop Subject
        if self._has_any(text, ["adviser won't sign", "adviser wont sign", "dili mo-pirma akong adviser", "dili mopirma"]):
            return "add_drop_subject"
        if self._has_any(text, ["want to add a subject", "gusto ko mag-add", "magdugang og subject"]):
            return "add_drop_subject"
        if self._has_any(text, ["tanggalon ang usa ka subject", "mag-drop sa subject bisan"]):
            return "add_drop_subject"

        # Where / How to GET WiFi credentials (ICT Office)
        if (
            self._has_any(text, [
                "get wifi credentials", "where to get wifi credentials", "how to get wifi credentials",
                "asa manko mag kuha og wifi credentials", "asa mag kuha og wifi credentials", "asa magkuha og wifi credentials",
                "mag kuha og wifi credentials", "magkuha og wifi credentials", "where can i get wifi credentials",
                "how to get wifi access", "where to get wifi access", "asa makakuha og wifi access", "asa makakuha wifi access",
                "unsaon pagkuha og wifi credentials", "unsaon pagkuha og wifi account", "where is ict office for wifi",
                "get my wifi credentials", "get my wifi account", "kuha ug wifi credentials", "kuha og wifi account",
                "asa ko moadto para sa wifi credentials", "asa dapit magkuha og wifi credentials"
            ]) or (
                self._has_any(text, ["wifi credentials", "wifi account", "wifi access"]) and
                self._has_any(text, ["get", "kuha", "where", "asa", "claim", "request", "mangayo", "obtain", "process"])
            )
        ):
            return "get_wifi_access"

        # How to CONNECT to campus student Wi-Fi
        if self._has_any(text, [
            "connect to the campus wi-fi", "connect sa campus wifi", "wi-fi login",
            "connect to campus wi-fi", "connect to campus wifi", "connect to school wifi", "connect to student wifi",
            "connect on student wifi", "how to connect to wifi", "how do students connect to the campus wi-fi",
            "how do i connect to school wifi", "can you tell me on how to connect on student wifi",
            "unsaon pag connect sa student wifi", "unsaon pag-connect sa student wifi", "unsaon pag connect sa wifi",
            "student_wifi", "how to connect to student wifi", "connect to wifi"
        ]):
            return "campus_wifi_access"

        # 16h. Department Grade Computation
        if (
            self._has_any(text, [
                "computed across quizzes", "compute our grades", "instructor compute", "teachers compute grades",
                "process of the grades computation", "process of grades computation", "quizzes, major exams",
                "quizzes major exams", "unsaon pag compute sa grades sa quizzes", "giunsa pag kwenta sa maestro",
                "grading computation process", "how are grades computed", "computation sa grado",
                "calculate my entire grades", "calculate our grades", "calculate grades", "how do instructor calculate",
                "how do my instructor calculate", "instructor calculate", "teacher calculate", "professor calculate"
            ]) or (
                self._has_any(text, ["compute", "computed", "computation", "calculate", "calculated", "calculation", "kwenta"]) and
                self._has_any(text, ["grade", "grades", "grading", "grado"]) and
                self._has_any(text, ["instructor", "teacher", "professor", "faculty", "maestro", "quizzes", "exam", "exams", "participation", "how", "unsaon", "giunsa"])
            ) or (
                self._has_any(text, ["grading system of", "grading system sa", "grading process sa", "tell me the grading system of"]) and
                (
                    self._has_any(text, ["cob", "cot", "cas", "con", "cpag", "coe", "bsit", "bsemc", "bset", "bsn", "bsa", "bsba", "bpa", "department", "college", "course"]) or
                    self._has_any_token(text, ["cob", "cot", "cas", "con", "cpag", "coe", "bsit", "bsemc", "bset", "bsn", "bsa", "bsba", "bpa"])
                )
            )
        ):
            return "department_grade_computation"

        # 16i. Specific Course Maintaining & Retention Grade
        if (
            self._has_any(text, [
                "maintaining grade", "maintaining grades", "retention grade", "retention grades",
                "culling grade", "culling grades", "grades you need to maintain", "grades to maintain",
                "mentain", "pila maintaining grade", "pila retention grade"
            ]) and (
                self._has_any(text, ["bsit", "bsemc", "bset", "bsn", "bsa", "bsba", "bpa", "cot", "cob", "cas", "con", "cpag", "coe", "course", "program", "department", "college", "nursing", "accountancy"]) or
                self._has_any_token(text, ["bsit", "bsemc", "bset", "bsn", "bsa", "bsba", "bpa", "cot", "cob", "cas", "con", "cpag", "coe"])
            )
        ):
            return "specific_course_passing_retention_grade"

        # 16j. Change Class Section / Schedule Request
        if self._has_any(text, [
            "transfer to another section", "transfer section", "change class section", "change my section",
            "change section", "change my class section", "transfer to another section or change class",
            "balhin og section", "balhin ug section", "mag-ilis og section", "mag ilis ug section",
            "move to another section", "change my section this semester"
        ]):
            return "change_section_schedule_conflict"

        # 16l. Library ID Card Process & Location
        if (
            self._has_any(text, [
                "process of getting library card", "where can i get library id card", "how to get library card",
                "where to get library id", "tell me where to get library id", "where can i get my library id",
                "where do i go for library id", "where to claim library id", "where to process library card",
                "asa makuha ang library id", "asa makakuha ug library id", "unsaon pagkuha og library id",
                "unsaon pagkuha og library card", "unsaon pag process sa library id card", "library id asa makuha",
                "asa kuhaon ang library card", "asa ko makakuha og library id", "library card application process",
                "library id location", "library card location", "library orientation and tour library card"
            ]) or (
                self._has_any(text, ["library id", "library card", "barcoded library card"]) and
                self._has_any(text, ["where", "asa", "get", "kuha", "claim", "process", "apply", "application", "unsaon", "how", "release", "makuha", "hain"]) and
                not self._has_any(text, ["lost", "nawala", "replacement", "replace", "fee", "pay", "bayad", "pila", "requirement", "requirements", "cor", "bring", "dalhon"])
            )
        ):
            return "library_id_card_location"

        # 16m. Apply / Take BukSU-CAT / Admission Examination
        if (
            self._has_any(text, [
                "tell me how to apply for buksu-cat examination", "tell me how to apply for buksu cat examination",
                "tell me how to apply for buksu-cat", "tell me how to apply for buksu cat",
                "how to apply for buksu-cat examination", "how to apply for buksu cat examination",
                "how to apply for buksu-cat", "how to apply for buksu cat",
                "how to apply for cat exam", "how to apply for cat examination", "how to apply for cat testing",
                "how to apply for admission testing", "how to apply for entrance examination",
                "how to apply for entrance exam", "process of applying for buksu-cat", "process of applying for buksu cat",
                "process of applying for entrance exam", "process of applying for admission testing",
                "unsaon pag apply sa buksu-cat examination", "unsaon pag apply sa buksu cat examination",
                "unsaon pag apply sa entrance examination", "unsaon pag apply sa admission testing",
                "unsaon pag-apply sa buksu-cat", "unsaon pag-apply sa buksu cat",
                "unsaon pag-apply sa entrance exam", "unsaon pag-apply sa entrance examination",
                "take buksu cat", "how to take buksu cat", "how can i take the buksu college admission test",
                "steps to apply for buksu cat", "steps to apply for buksu-cat", "register for buksu cat exam",
                "mag register ko para buksu cat"
            ]) or (
                self._has_any(text, ["apply", "application", "register", "registration", "take", "schedule", "unsaon pag apply", "unsaon pag-apply", "unsaon pag take", "unsaon pag-take", "how can i take", "process", "steps", "guide", "how to", "unsaon"]) and
                self._has_any(text, ["buksu cat", "buksu-cat", "buksucat", "cat exam", "cat testing", "cat examination", "admission test", "admission testing", "entrance exam", "entrance examination", "college admission test"]) and
                not self._has_any(text, [
                    "after", "sunod", "human", "next step", "what next", "pagkahuman",
                    "result", "results", "score", "scores", "cutoff", "cut-off", "passing score", "rating", "passed", "fail", "failed",
                    "fee", "fees", "pay", "payment", "bayad", "pila", "cost", "free", "libre",
                    "requirement", "requirements", "dalhon", "bring", "dala", "papers", "documents",
                    "calculator", "reschedule", "missed", "retake", "walk in", "walk-in", "online ba", "definition", "meaning", "unsa ang", "what is"
                ])
            )
        ):
            return "take_exam"

        # 16k. Scholarships & Tertiary Education Subsidy (TES)
        has_tes_context = self._has_any(text, ["tes", "tertiary education subsidy", "unifast"])

        # DATA 3: TES Requirements
        if (
            (has_tes_context and self._has_any(text, ["requirement", "requirements", "document", "documents", "rekisitos", "dokumento", "papers", "guidelines", "post"])) or
            self._has_any(text, ["documents need for tes", "documents needed for tes", "tes requirements", "requirements for tes", "requirements if qualified for tes", "unsa ang requirements sa tes", "unsay kinahanglan nga dokumento para sa tes", "unsa ang rekisitos sa tes", "rekisitos sa tes", "dokumento para sa tes"])
        ) and not self._has_any(text, ["how to apply", "how do i apply", "unsaon pag apply", "unsaon mani pag apil"]):
            return "tes_requirements"

        # DATA 4: TES Grantee Selection Process (How is selection done / who assesses)
        if (
            (has_tes_context or self._has_any(text, ["grantees", "grantee"])) and
            (
                self._has_any(text, [
                    "selection of the grantees", "selection of grantees", "grantees selected", "grantees done",
                    "how are grantees selected", "who selects the grantees", "how is the selection",
                    "pagpili sa mga grantee", "pagpili sa mga tes grantee", "kinsay magpili sa mga grantee",
                    "how does unifast select", "assessment of applications", "who assesses the applications",
                    "unsaon pag assess sa tes", "unsaon pagpili sa unifast", "selection process of tes", "selection process of the grantees"
                ]) or (
                    self._has_any(text, ["selection", "select", "selected", "pagpili", "magpili", "chosen", "assessment", "assessed"]) and
                    self._has_any(text, ["grantee", "grantees", "unifast", "tes"]) and
                    self._has_any(text, ["how", "who", "unsaon", "kinsay", "process", "done", "gihimo"])
                )
            )
        ) and not self._has_any(text, ["delay", "release", "tabuk"]):
            return "tes_grantee_selection_process"

        # DATA 5: TES Qualified Grantees / Eligibility (Who is qualified / can join / can avail)
        if (
            (has_tes_context or self._has_any(text, ["grantees", "grantee"])) and
            (
                self._has_any(text, [
                    "who are qualified", "who is qualified", "who are eligible", "who is eligible",
                    "who are valid", "who is valid", "who can avail", "who can join", "who can be a grantee",
                    "can i avail tes", "can i join tes", "am i qualified", "am i eligible",
                    "kinsay pwedi maka apil", "kinsay pwede maka apil", "kinsay qualified", "kinsay eligible",
                    "pwede ba ko moapil", "pwede ba ko mo apil", "pwede ba maka apil", "pwede ba maka avail",
                    "priority beneficiaries", "listahanan", "qualified to be tes", "valid to join tes",
                    "other students allowed to join tes", "do others allowed to join tes", "allowed to join tes",
                    "kinsa ang eligible para sa tes", "kinsay pwede maka avail sa tes", "kinsay pwede ma qualify"
                ]) or (
                    self._has_any(text, ["qualified", "qualify", "eligible", "eligibility", "avail", "join", "apil", "valid", "beneficiaries", "allowed to join"]) and
                    has_tes_context and
                    self._has_any(text, ["who", "can i", "am i", "kinsay", "pwede", "pwedi", "pila", "do others"]) and
                    not self._has_any(text, ["how to apply", "unsaon pag apply", "application process", "send me the process", "requirements", "documents", "rekisitos", "how is the selection", "who selects"])
                )
            )
        ) and not self._has_any(text, ["delay", "release", "tabuk"]):
            return "tes_qualified_grantees_eligibility"

        # DATA 2: TES Application Process (How to apply / application process / how to avail)
        if (
            (has_tes_context and self._has_any(text, ["how to apply", "how do i apply", "how can i apply", "how to avail", "apply", "application", "unsaon pag apply", "unsaon mani pag apil", "unsaon pag apil", "unsaon pag avail", "pamaagi sa pag apply", "process of application", "application process"])) or
            self._has_any(text, [
                "how do i apply for the tes", "how do i apply for tes", "unsaon mani pag apil sa tes",
                "application process for tes", "how to avail tes", "send me the tes process of application",
                "how to apply for tes", "unsaon pag apply sa tes", "tes application process", "process to apply for tes",
                "unsaon pag apil sa tertiary education subsidy", "apply for tes", "apply tes", "how do students apply for tes"
            ])
        ) and not self._has_any(text, ["delay", "release", "tabuk", "requirements", "documents", "selection", "who are qualified", "who is qualified", "kinsay pwedi"]):
            return "tes_application_process"

        # DATA 1: Available Scholarships in BukSU
        if self._has_any(text, [
            "what are the scholarships i can avail of", "what are the scholarships i can avail",
            "what scholarship do student can avail", "what scholarship can students avail",
            "what scholarship can i avail", "what scholarships can i avail of",
            "what scholarships are available", "what scholarships are available in buksu",
            "what scholarships are offered in buksu", "what scholarships does buksu offer",
            "scholarships available in buksu", "scholarships in buksu", "list of scholarships in buksu",
            "available scholarships in buksu", "available scholarships",
            "unsa nga mga scholarship available sa buksu", "unsa ang mga scholarship sa buksu",
            "unsa nga scholarship ang naa sa buksu", "unsa ang mga available nga scholarship",
            "naa bay scholarship sa buksu", "naa bay available nga scholarship sa buksu",
            "are there scholarships available in buksu", "is there any scholarship available in buksu",
            "unsa nga scholarship ang pwede ma avail", "unsa nga scholarship ang pwede ma avail sa mga estudyante"
        ]) and not has_tes_context and not self._has_any(text, ["delay", "release", "cancel", "tabuk", "contact", "email", "phone", "number", "where", "location"]):
            return "available_scholarships_buksu"

        # Existing TES handlers (delay, tabuk, free tuition)
        if self._has_any(text, ["tes allowance", "tes release", "delayed for weeks", "tes delay", "dugay na ang akong tes", "dugay ang tes"]):
            return "tes_release_delay"
        if self._has_any(text, ["tabuk scholar", "tes with other", "apply for tes without losing", "tabuk scholar usab ko"]):
            return "tes_with_other_scholarships"
        if self._has_any(text, ["free tuition for undergraduate", "free tuition undergraduate", "libre ba ang tuition para sa mga undergraduate", "tuition at buksu free"]):
            return "free_tuition_undergraduate_buksu"
        if self._has_any(text, [
            "contact scholarship unit", "contact scholarships and financial grants unit",
            "contact sfgu", "how to contact scholarship unit", "scholarship contact number",
            "scholarship email", "scholarship facebook page", "unsaon pag contact sa scholarship",
            "asa mag chat about scholarship", "number sa scholarship office", "scholarship unit contact",
            "sfgu contact", "contact scholarship"
        ]):
            return "contact_scholarship_unit"

        # 16l. Library Thesis Availability
        if self._has_any(text, ["capstone and thesis", "thesis papers in the buksu library", "previous thesis", "naunang capstone ug thesis", "thesis availability"]):
            return "library_thesis_availability"

        # 16j. University History & Key Milestones
        if self._has_any(text, ["original name of buksu", "name before it became a university", "previous name", "orihinal nga ngalan sa buksu"]):
            return "previous_name_buksu_college"
        if self._has_any(text, ["year did the institution convert", "convert from a college into a full university", "convert to university", "nahimo kining unibersidad gikan sa kolehiyo", "unsang tuig nahimo kining unibersidad"]):
            return "buksu_become_university"
        if self._has_any(text, ["president during the time it became a university", "president the time university", "presidente sa dihang nahimo kining unibersidad"]):
            return "Pres_thetime_university"
        if self._has_any(text, ["law or legislation", "law that gave buksu", "balaod ang naghatag sa buksu", "conversion law"]):
            return "law_author_buksu_university_conversion"
        if self._has_any(text, ["vice president for academic affairs", "vp for academic affairs", "vpaa", "vice president para sa academic affairs"]):
            return "vicepres_academic_affairs"
        if self._has_any(text, ["vice president", "vpsas", "culture arts sports student services", "sports sa vp level", "student services and sports at the vp level"]):
            return "vicepres_culture_arts_sports_student_services"
        if self._has_any(text, ["university secretary", "secretary sa buksu"]):
            return "buksu_university_secretary"
        if self._has_any(text, ["past presidents", "multiple presidents", "presidents over the years", "presidents list", "nauna nga presidente"]):
            return "buksu_presidents_list"
        if self._has_any(text, ["head of the bsit", "head of bsit", "head sa bsit department"]):
            return "Head_of_BSIT"
        if self._has_any(text, ["dean managing the college of arts and sciences", "dean of cas", "dean sa college of arts and sciences"]):
            return "Dean_0f_CAS"
        if self._has_any(text, ["all the academic colleges", "colleges available in buksu", "kolehiyo nga naa sa buksu"]):
            return "buksu_academic_colleges"

        # 16.5. Teacher / Faculty Evaluation Privacy & Visibility
        if (
            self._has_any(text, [
                "teacher evaluation", "faculty evaluation", "evaluate teacher", "evaluate teachers",
                "evaluate the teacher", "evaluating teacher", "evaluating teachers", "evaluation sa teacher",
                "evaluation sa maestro", "evaluation sa maestra", "evaluation sa instructor",
                "student evaluation of teacher", "student evaluation", "students evaluation",
                "students evaluations", "student's evaluation", "evaluation namo"
            ]) and
            self._has_any(text, [
                "private", "privacy", "confidential", "anonymous", "see", "view", "makita", "makatan-aw",
                "read", "know", "baw-an", "kahibalo", "secret", "hide", "hidden", "look", "check", "actually"
            ])
        ) or self._has_any(text, [
            "are students evaluations kept private", "can teachers actually see them",
            "do teacher evaluation keep private", "makita ba sa teacher ang evaluation",
            "makita ba sa maestro ang evaluation", "makita ba sa maestra ang evaluation",
            "can teachers see my evaluation", "is teacher evaluation anonymous",
            "are teacher evaluations confidential", "teacher evaluation privacy",
            "faculty evaluation privacy", "can instructors see our evaluation",
            "who can see the teacher evaluation", "pwede ba makita sa teacher ang evaluation"
        ]):
            return "teacher_evaluation_privacy"

        # 17. Examination Rules & Calendar Schedules
        if self._has_any(text, ["midterm", "final exam", "finals exam", "final examination", "midterm examination", "exam rules", "examination rules"]):
            if self._has_any(text, ["rule", "rules", "guideline", "guidelines", "policy", "policies", "slip", "slipt", "permit", "what do i need", "kailangan", "kinahanglan", "patakaran"]):
                return "midterm_and_final_exam_rules"
            if self._has_any(text, ["when", "schedule", "date", "dates", "calendar", "kanus-a", "kanusa", "oras", "week", "when are"]):
                return "academic_calendar_exam_schedules"
            return "midterm_and_final_exam_rules"

        # 18. BukSU General Overview / History
        if "unsa diay ang buksu" in text or "unsa ang buksu" in text or "what is buksu" in text:
            return "about_buksu"

        # 19. Guidance Counseling & Mental Health
        if self._has_any(text, [
            "guidance counselor", "guidance counseling", "mental health", "counseling service", "kausagon", "mangayo ug counseling"
        ]):
            return "guidance_counseling_services_buksu"

        # Academics & Policies Direct Intent Routing
        if self._has_any(text, [
            "how long do i have to clear", "how long to complete inc", "complete an incomplete inc", "inc mark", "inc completion period", "inc expiration", "inc time limit"
        ]):
            return "inc_grade_rules"

        if self._has_any(text, [
            "numerical grade", "numerical grades", "grading system", "grades from 1.0", "converted into numerical", "percentage scores converted", "grading scale", "1.0 to 5.0"
        ]):
            return "buksu_grading_system"

        if self._has_any(text, [
            "general education subjects", "general curriculum", "mandatory general education", "ge subjects", "general education curriculum"
        ]):
            return "buksu_courses_offered"

        if self._has_any(text, [
            "failing grade", "failing a course", "failing grade of 5.0", "receives a failing grade", "5.0 in a course", "fail a subject", "failed a subject", "bagsak sa subject", "failing subject policy", "failing subject rules"
        ]):
            return "failed_subject_policy"

        if self._has_any(text, [
            "snacking", "drinking", "permitted inside regular classrooms", "food in classroom", "eating inside", "eating in class", "eating and drinking in classroom", "snacking and drinking"
        ]):
            return "eating_in_classroom"

        # Procedures Direct Intent Routing
        if self._has_any(text, [
            "senior high graduates", "shs graduates", "college entrance", "freshman admission", "freshmen admission", "apply for college entrance", "freshman documents", "paperwork and documents do senior high"
        ]):
            return "freshman_admission_requirements"

        if self._has_any(text, [
            "apply online as an applicant", "apply online for admission", "how to apply as an applicant", "step by step instructions to apply online"
        ]):
            return "online_application_schedule"

        if self._has_any(text, [
            "admission status is still pending", "application pending", "admission pending", "status is pending", "pending validation", "status is still pending"
        ]):
            return "application_pending"

        if self._has_any(text, [
            "typo in my name", "wrong name", "typo on the printed", "error in name", "test permit name error", "typo on test permit", "typo in name"
        ]):
            return "test_permit_name_error"

        if self._has_any(text, [
            "uploading my 2x2", "upload 2x2", "2x2 picture", "2x2 photo", "uploading photo error", "cannot upload 2x2", "cannot upload photo", "error when uploading my 2x2"
        ]):
            return "cannot_upload_2x2_picture"

        if self._has_any(text, [
            "failed to show up on my scheduled", "missed my scheduled", "missed entrance exam", "reschedule entrance exam", "missed buksu cat", "reschedule my cat", "failed to show up on my scheduled entrance"
        ]):
            return "missed_buksu_cat_schedule"

        if self._has_any(text, [
            "transferring from another college", "transferee admission", "transfer student admission", "transferee requirements", "students transferring from another"
        ]):
            return "transferee_admission_requirements"

        if self._has_any(text, [
            "returning students apply for readmission", "leave of absence", "returning student readmission", "readmission after taking a leave"
        ]):
            return "returning_student_readmission_process"

        if self._has_any(text, [
            "verify on sias", "enrolled subjects are officially confirmed", "check enrollment status on sias", "verify enrollment on sias", "check portal enrollment status"
        ]):
            return "check_portal_enrollment_status"

        if self._has_any(text, [
            "gate pass", "gatepass", "forgot my student id", "campus entry without", "temporary gate pass", "forgot my student id and need a"
        ]):
            if self._has_any(text, ["bicycle", "bicycles", "bike", "bikes", "bisekleta", "bisikleta"]):
                return "bike_gate_pass"
            if self._has_any(text, [
                "get", "getting", "apply", "applying", "application", "acquire", "acquiring", "acquisition", "acquirment",
                "obtain", "secure", "securing", "claim", "request", "process", "procedure", "step", "steps",
                "kuha", "kuhaon", "makakuha", "pagkuha", "mokuha", "mukuha", "kuhag", "mangayo", "pangayo",
                "where", "asa", "aha", "unsaon", "pamaagi", "how do", "how can", "how to", "how"
            ]):
                return "gate_pass_process"
            return "general_gate_pass"

        if self._has_any(text, [
            "activate or register for library borrowing", "library borrowing privileges", "register for library borrowing", "activate library card", "library id card registration"
        ]):
            return "library_id_card_requirements"

        # Services Direct Intent Routing
        if self._has_any(text, [
            "oral checkups", "oral examination", "dental checkup", "dental consultation", "dental services", "dentist provide", "school dentist provide"
        ]):
            return "buksu_medical_dental_services"

        if self._has_any(text, [
            "scholarships and financial grants unit", "financial grants unit", "grants unit located", "scholarship unit located", "scholarships unit", "what grants do they handle"
        ]):
            return "available_scholarships_buksu"

        if self._has_any(text, [
            "campus dress code", "clothing policy", "wash days", "civilian attire", "proper campus dress code", "clothing policy on non-uniform"
        ]):
            return "wear_civilian_attire"

        # Password Management & Reset Clarification
        _is_gate_pass_query = self._has_any(text, ["gate pass", "gatepass", "forgot my student id", "temporary gate pass"])
        is_password_query = (not _is_gate_pass_query) and (any(k in text for k in [
            "password", "passcode", "reset password", "change password", "forgot password",
            "recover password", "update password", "ilis sa password", "ilis og password",
            "usab sa password", "usbon ang password", "nakalimot kos password", "nakalimot ko sa password",
            "change my password", "reset my password", "forgot my password", "lost my password",
        ]) or (
            ("password" in tokens or "pass" in tokens or "pwd" in tokens) and 
            any(w in text for w in ["change", "reset", "forgot", "forget", "recover", "update", "ilis", "usab", "nakalimot", "lost"])
        ))

        if is_password_query:
            if any(w in text for w in ["admission", "cat", "applicant", "application", "testing"]):
                return "Change_Pass_admission"
            if any(w in text for w in ["sias", "grades portal", "grading portal", "sias portal", "enrollment portal"]):
                return "sias_forgot_password"
            if any(w in text for w in ["wifi", "wi-fi", "internet"]):
                return "wifi_password"
            if any(w in text for w in ["institutional", "email", "gmail", "google account", "office 365", "student email"]):
                return "institutional_email_account"
            return "__student_portal_password_clarification__"

        # Admission Account Registration / Sign up
        if self._has_any(text, [
            "create admission account", "register admission account", "admission portal registration",
            "how to create admission account", "how to register admission account", "sign up admission",
            "admission account registration", "wala koy admission account", "create admission portal account",
            "maghimo og admission account", "unsaon pag buhat admission account"
        ]):
            return "admission_account_registration"

        # Change / Update Admission Profile Information
        if self._has_any(text, [
            "change info admission", "change information in admission", "edit admission details",
            "update personal information", "update academic information", "change wrong details in buksu admission",
            "edit my admission application", "unsaon pag change sa akong admission info", "wrong personal information admission",
            "nasayop akong details pwede pa ma usab", "asa dapit mag change ug profile info"
        ]) or (
            self._has_any(text, ["change", "update", "edit", "usab", "ilis"]) and
            self._has_any(text, ["info", "information", "detail", "details", "profile", "personal details", "academic information"]) and
            self._has_any(text, ["admission", "cat", "applicant", "application"])
        ):
            return "Change_info_admission"

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
        # 1. Validation -> enrollment_validation_payment
        # 2. Process / Steps / How to get / Download online -> where_get_cor (5-step portal guide)
        # 3. Where to get / Inquire / Registrar office -> request_cor (Registrar & online options info)
        has_cor_signal = self._has_any_token(text, ["cor"]) or self._has_any(text, [
            "certificate of registration", "cert of registration", "registration certificate",
        ])
        _is_id_validation_query = (
            ("id" in raw_tokens or "student id" in text or "school id" in text or "akong id" in text or "sa id" in text) and
            self._has_any(text, ["validate", "validation", "pavalidate", "pa-validate", "pa validate", "pag-validate", "ma-validate", "mavalidate", "pavalidate sa id"])
        )
        if _is_id_validation_query:
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule", "month", "period", "kanus-a", "kanusa"})) or self._has_any(
                text, ["validation day", "validation date", "validation schedule", "how long", "kanus-a"]
            ):
                return "id_validation_day"
            return "id_validation_process"

        if has_cor_signal:
            if self._has_any(text, ["validate", "validation", "pa-validate", "pa validate", "pag-validate", "ma-validate", "mavalidate"]):
                if self._has_any(text, ["where", "asa", "location", "place", "hain", "diin", "asa dapit", "where do i go", "where can i", "where should i", "which window", "unsa nga window", "asa moadto"]):
                    return "cor_validation_location"
                word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
                if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule", "month", "period", "kanus-a", "kanusa"})) or self._has_any(
                    text, ["validation day", "validation date", "validation schedule", "how long", "kanus-a"]
                ):
                    return "cor_validation_day"
                return "cor_validation_steps"
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

        # Contact Unit Routing
        # Detect contact intent with precise compound phrases to avoid false-positives
        # (e.g. 'room number', 'student number', 'email for sias', 'they call it')
        _has_explicit_contact_phrase = self._has_any(text, [
            # Explicit compound contact phrases
            "contact number", "contact details", "contact info", "contact information",
            "phone number", "telephone number", "cellphone number", "mobile number",
            "email address", "email of", "email ng", "email sa",
            "facebook page", "facebook of", "fb page", "fb of",
            "reach out", "get in touch",
            # Tagalog / Cebuano
            "unsaon pag contact", "asa mag chat", "unsa ang contact",
            "tawagan", "kontak", "i-contact", "makikontak", "makakuha og contact",
        ])
        # Also catch simple "contact [unit]" phrasing
        _has_contact_verb = self._has_any(text, ["how to contact", "how do i contact", "how can i contact",
                                                  "how to reach", "how do i reach",
                                                  "pano makipag-ugnayan", "unsa ang number"])
        # Portal/account/number-in-another-context exclusions — prevents catching:
        # "room number of registrar", "student number", "email for sias portal",
        # "they call it", "number of units"
        _is_portal_context = self._has_any(text, [
            "portal", "sias", "login", "log in", "log-in", "signin", "sign in",
            "forgot", "password", "credentials", "gmail", "account",
        ])
        _is_non_contact_number = (
            self._has_any(text, ["room number", "student number", "number of units", "number of subjects",
                                 "how many", "unit number", "id number", "case number"]) or
            (self._has_any(text, ["number"]) and self._has_any(text, ["room", "unit", "subject", "how many", "pila"]))
        )

        is_contact_query = (
            (_has_explicit_contact_phrase or _has_contact_verb) and
            not _is_portal_context and
            not _is_non_contact_number
        ) or intent == "ask_contact"

        if is_contact_query:
            if self._has_any(text, ["scholarship", "sfgu", "financial grant", "financial grants", "financial assistance"]):
                return "contact_scholarship_unit"
            if self._has_any(text, ["registrar", "records office"]):
                return "contact_registrar"
            if self._has_any(text, ["atu", "admission and testing", "testing unit"]):
                return "contact_atu"
            if self._has_any(text, ["admission", "admissions"]) and not self._has_any(text, ["scholarship", "sfgu"]):
                return "buksu_admission_contact"
            if self._has_any(text, ["dormitory", "dorm", "housing", "dormitories"]):
                return "contact_dormitory_office"
            if intent == "ask_contact" or _has_explicit_contact_phrase or _has_contact_verb:
                if not self._has_any(text, ["dean", "faculty", "tor", "transcript", "cashier", "clinic", "guidance",
                                            "citl", "ictu", "apply", "requirement", "process", "where", "location",
                                            "located", "room", "building", "email", "institutional email", "problema", "problem"]):
                    return "__contact_clarification__"


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
            if self._has_any(text, [
                "get", "getting", "apply", "applying", "application", "acquire", "acquiring", "acquisition", "acquirment",
                "obtain", "secure", "securing", "claim", "request", "process", "procedure", "step", "steps",
                "kuha", "kuhaon", "makakuha", "pagkuha", "mokuha", "mukuha", "kuhag", "mangayo", "pangayo",
                "where", "asa", "aha", "unsaon", "pamaagi", "how do", "how can", "how to", "how"
            ]):
                return "gate_pass_process"
            return "general_gate_pass"

        # Add and Drop Subjects Routing
        if (
            self._has_any(text, [
                "adding and dropping", "adding & dropping", "add and drop", "add & drop",
                "add drop", "adding dropping", "mag add drop", "mag-add drop",
                "remove a subject", "remove subject", "removing a subject", "drop a subject", "dropping a subject",
                "change my subject load", "change subject load", "form needed for adding", "form for adding or removing",
                "who signs the form", "form para sa add/drop", "mo-sign sa form para ma-drop", "mawala ang usa ka subject",
                "magdugang og subject", "magdugang ug subject", "dropped a subject after", "drop og subject human"
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
        has_second_courser = self._has_any(text, ["second courser", "second coursers", "second-courser", "second-coursers", "second course", "second degree"])
        has_law = self._has_any(text, ["law", "juris doctor"])
        has_medicine = self._has_any(text, ["medicine", "college of medicine"])
        has_graduate_enrollment = has_enrollment and (
            bool(tokens.intersection({"graduate", "graduates", "law"})) or
            self._has_any(text, ["post graduate", "post-graduate"])
        )
        has_gpat = (
            self._has_any(text, [
                "gpat", "graduate program admission test", "graduate admission test",
                "graduate school admission test", "graduate admission exam", "graduate admission testing",
                "admission testing graduate", "admission test graduate", "admission exam graduate",
                "testing graduate program", "test graduate program", "exam graduate program",
                "graduate studies admission test", "graduate studies admission exam",
                "graduate school admission exam", "graduate entrance exam",
                "masteral admission test", "masters admission test", "doctorate admission test",
                "admission testing application graduate", "admission testing fee for buksu graduate",
                "application requirements for buksu graduate",
            ]) or (
                self._has_any(text, ["admission test", "admission testing", "admission exam", "entrance exam", "testing", "gpat"]) and
                self._has_any(text, ["graduate program", "graduate programs", "graduate studies", "graduate school", "masteral", "masters", "doctorate"])
            ) or (
                self._has_any(text, ["graduate", "graduates", "graduate studies", "graduate school", "masteral", "masters"]) and
                self._has_any(text, ["apply", "application", "requirements", "requirement", "fee", "pila", "unsa kailangan", "unsa kinahanglan", "kinahanglan"]) and
                self._has_any(text, ["admission", "test", "testing", "exam", "gpat"])
            )
        )
        has_exam_day_requirement_wording = (
            self._has_any(text, [
                "what to bring on the examination day", "what to bring on exam day",
                "what should i bring on buksu cat examination day", "what should i bring on exam day",
                "what to bring during exam", "what to bring to exam", "what to bring for exam",
                "what to bring in exam", "what to bring in the examination", "what to bring during the exam",
                "what are the test day requirements", "test day requirements", "exam day requirements",
                "examination day requirements", "what do i need to bring for exam", "what do i need to bring to exam",
                "what do i need to bring on exam day", "what do i need to bring during exam",
                "do i need pencil for buksu cat", "do i need pencil for exam", "items to bring for exam",
                "materials to bring for exam", "things to bring for exam", "what to bring on test day",
                "what to bring for entrance exam", "what to bring for buksu cat",
                "unsa akong kinahanglan dad-on para sa exam", "unsa akong kinahanglan dad on para sa exam",
                "unsa ang kinahanglan nako dalhon sa adlaw sa exam", "unsa kinahanglan dalhon sa exam",
                "unsa ang dad-on sa exam", "unsa ang dad on sa exam", "unsa ang dad-on sa adlaw sa exam",
                "unsa ang dad on sa adlaw sa exam", "unsa dalhon sa exam", "unsa dalhon sa adlaw sa exam",
                "unsa akong dad-on sa exam", "unsa akong dad on sa exam", "unsa akong dalhon sa exam",
                "dad on para sa buksu cat exam", "dad-on para sa buksu cat exam", "dad on para sa exam",
                "dad-on para sa exam", "dalhon para sa exam", "dalhon para sa buksu cat exam",
                "mga gamit nga dad-on sa exam", "mga gamit nga dad on sa exam", "mga gamit nga dalhon sa exam",
                "unsa mga gamit dad-on sa exam", "unsa mga gamit dad on sa exam",
            ]) or (
                self._has_any(text, ["bring", "dalhon", "dad-on", "dad on", "dala", "dal-on", "gamit", "materials", "pencil", "sharpener", "eraser", "ballpen"]) and
                self._has_any(text, ["exam", "examination", "test day", "exam day", "buksu cat", "cat exam", "entrance exam", "adlaw sa exam"]) and
                not self._has_any(text, ["how to apply", "unsaon pag apply", "register", "step by step", "requirements for admission application", "after applying"])
            )
        )
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
                "ubos",
                "ubos akong ror",
                "ubos ror",
                "ubos ang ror",
                "ubos sa cutoff",
                "ubos sa cut-off",
            ]) and
            (
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
                    "cutoff",
                    "cut off",
                    "ror",
                    "rating",
                    "report of rating",
                    "non passer",
                    "nonpasser",
                    "non-passer",
                    "first choice",
                    "first choice nga course",
                    "preferred course",
                ]) or (
                    self._has_any(text, ["course", "program", "slot", "first choice"]) and
                    self._has_any(text, ["mo-apply", "mo apply", "apply", "lain", "another", "affirmative", "aap"])
                )
            ) and
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
                "mo-apply",
                "mo apply",
                "apply",
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
        has_school_year_end = (
            self._has_any(text, ["end", "ends", "ending", "human", "mahuman", "maghuman", "mahoman", "last day", "finish", "done", "what month do school year ends", "when is the school year ends", "when do the sy end"]) and
            self._has_any(
                text,
                [
                    "school year",
                    "sy",
                    "academic year",
                    "class",
                    "classes",
                    "klase",
                    "klasi",
                ],
            ) and
            not has_enrollment
        )
        has_difference_board_nonboard = (
            self._has_any(text, ["difference", "kalainan", "kalahian", "differ", "distinction", "versus", "vs", "unsa may difference", "unsay kalahian"]) and
            ("board" in text) and
            ("non-board" in text or "non board" in text or "nonboard" in text)
        )
        has_pe_uniform_store_schedule = (
            self._has_any(text, ["open", "abli", "schedule", "hours", "time", "todeee", "today", "karon", "kanus-a", "kanusa", "what time"]) and
            (
                (self._has_any(text, ["pe", "p.e", "physical education"]) and self._has_any(text, ["palitanan", "store", "buy", "palit", "uniform"])) or
                ("university press" in text)
            )
        )
        has_excuse_letter_submit = (
            ("excuse" in text or "absence" in text or "absent" in text) and
            self._has_any(text, ["kinsa", "kinsay", "who", "whom", "hatag", "ihatag", "e hatag", "ipasa", "pasa", "give", "submit", "kanino"])
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
        has_password_wording = (
            self._has_any(text, [
                "password", "passwords", "passcode", "passcodes", "forgot password", "forget password",
                "forgot my password", "reset password", "change password", "recover password",
                "reseting password", "resetting password", "changing password", "ilis password",
                "usab password", "nakalimot sa password", "nakalimot kos password", "nakalimot ko sa password"
            ]) or
            "password" in raw_tokens or "passcode" in raw_tokens or "passwords" in raw_tokens or "passcodes" in raw_tokens
        )
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
        has_id_validation = (
            (has_validation or self._has_any(text, ["pavalidate", "pa-validate", "validate", "validation"])) and
            not has_dental and
            ("id" in raw_tokens or raw_has_student_id or self._has_any(text, ["student id", "school id", "akong id", "sa id"]))
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
        has_generic_student_portal_login = (
            (
                has_student_portal or
                self._has_any(text, ["portal", "my portal", "the portal"])
            ) and
            has_login_wording and
            not has_password_wording and
            not has_sias and
            not has_admission_portal and
            not self._has_any(text, ["admission", "admissions", "cat", "applicant", "wifi", "wi-fi", "internet", "library", "email", "institutional email", "gmail", "deped", "google"])
        )
        has_generic_student_portal_password = (
            (
                has_student_portal or
                self._has_any(text, ["portal", "my portal", "the portal", "account", "akong account", "my account"])
            ) and
            has_password_wording and
            not has_sias and
            not has_admission_portal and
            not self._has_any(text, ["admission", "admissions", "cat", "applicant", "wifi", "wi-fi", "internet", "library", "email", "institutional email", "gmail", "deped", "google"])
        )
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
        has_test_permit_name_error = (
            (has_test_permit or self._has_any(text, ["permit", "test permit", "exam permit"])) and
            self._has_any(text, [
                "name error", "wrong name", "error in name", "error in my name", "incorrect name", "maling pangalan",
                "mali ang ngalan", "mali ang name", "wrong info", "incorrect info", "name is wrong",
                "name is incorrect", "error sa ngalan", "error sa name", "misspelled", "sayup ang ngalan",
                "sayup sa ngalan", "sayup sa akong ngalan",
            ])
        )
        has_test_permit_issue = (
            has_test_permit and
            not has_test_permit_name_error and
            self._has_any(text, ["corrupt", "corrupted", "broken", "invalid", "not opening", "cannot open", "can't open", "missing", "download"])
        )
        has_cat_online_vs_walkin = (
            self._has_any(text, ["strictly online", "online lang", "online ra", "walk-in application", "walk in application", "strictly online lang", "walkin application", "online ba tanan o kinahanglan", "online ba o strictly"]) and
            self._has_any(text, ["cat", "admission", "entrance exam", "application", "buksu cat"])
        )
        has_walkin_exam = self._has_any(text, ["walkin", "walk in", "walk-in", "walk entrance exam"]) and self._has_any(text, ["entrance exam", "admission test", "buksu cat", "exam", "examination"]) and not has_cat_online_vs_walkin
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
        has_missed_cat_schedule = (
            (
                bool(tokens.intersection({"missed", "absent"})) or
                # Fix: add Cebuano "na-miss" morphology variants that were not detected before
                self._has_any(text, [
                    "missed buksu cat schedule", "missed cat schedule", "missed exam schedule",
                    "wala kaabot", "did not take",
                    "na-miss", "na miss", "namiss", "na-missed", "na missed",
                    "dili ko naabot", "wala ko naabot", "dili nako naabot",
                    "miss my schedule", "miss my exam", "miss the exam", "miss the cat",
                    "missed my schedule", "missed my exam", "missed the exam",
                    "wala ko nakatunga", "wala nakatunga",
                ])
            ) and
            self._has_any(text, ["buksu cat", "cat", "admission test", "entrance exam", "exam schedule", "test schedule", "test permit", "schedule"])
        )
        # Fix: retake / multiple-attempt CAT policy must be detected specifically and not match missed-schedule
        has_cat_retake_policy = (
            has_cat and
            not has_missed_cat_schedule and
            self._has_any(text, [
                "more than once", "twice", "two times", "2 times", "retake", "re-take", "take again",
                "take more", "take cat again", "allowed to take multiple", "how many times",
                "pila ka beses", "maka-take pag-usab", "maka take pag usab", "take pag-usab", "take ug usab",
                "maka-take usab", "maka take usab", "kaduha", "kaduhang", "ikaduha", "pag-usab",
                "take it again", "take the cat again", "take the admission test more than once",
            ]) and
            not self._has_any(text, ["miss", "missed", "na-miss", "na miss", "schedule sa test permit"])
        )
        has_admission_exam_registration = (
            has_cat and
            self._has_any(text, ["apply", "maka apply", "register", "registration", "schedule", "take", "mag register", "mag apply", "pag register"]) and
            not self._has_any(text, [
                "reschedule", "change schedule", "missed", "na-miss", "na miss",
                "more than once", "twice", "retake", "re-take", "again", "pag-usab",
            ])
        )
        has_admission_application_schedule = (
            (has_cat or self._has_any(text, ["admission application", "admission test application"])) and
            self._has_any(text, ["when", "kanus", "kanus-a", "open", "mag open", "schedule", "date"]) and
            self._has_any(text, ["application", "apply", "buksu cat", "admission"]) and
            not self._has_any(text, ["how to schedule", "how can i schedule", "how do i schedule", "unsaon pag schedule"]) and
            # Fix: do not misclassify "i miss my schedule" queries as application-schedule queries
            not self._has_any(text, ["miss", "missed", "na-miss", "na miss", "can i still", "pwede pa", "pwede pa ba"])
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
        has_cat_definition_query = (
            (has_cat or self._has_any(text, ["college admission test"])) and
            self._has_any(text, ["what is", "definition", "meaning", "para unsa", "unsa ang", "pasabot"]) and
            not self._has_any(text, ["process", "steps", "apply", "register", "registration", "schedule", "date", "reschedule", "missed", "test permit", "error"])
        )
        has_cat_calculator_policy = (
            # Fix: in procedures domain, calculator questions are always about the CAT exam.
            # Also detect combined question format: "bawal/pwede + examination room + calculator"
            (
                has_cat or
                self._has_any(text, [
                    "examination room", "exam room", "bawal dalhon", "pwede dalhon",
                    "bawal sa exam", "pwede sa exam", "sa examination", "during exam", "during examination",
                ]) or
                (active_domain == "procedures" and not self._has_any(text, [
                    "enroll", "enrollment", "transfer", "shifting", "add drop",
                    "class", "klase", "subject", "section",
                ]))
            ) and
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
        has_intent_to_enroll_confirm = (
            self._has_any(text, [
                "intent to enroll", "confirm intent to enroll", "intent to enroll button",
                "confirm enrollment", "confirm my enrollment", "confirm sa enrollment",
                "i-confirm ang enrollment", "i confirm ang intent to enroll",
                "unsaon pag confirm sa intent to enroll", "intent to enroll sa admission portal",
                "confirm my slot", "i passed cat what do i do next", "nakapasar sa cat unsa sunod",
            ]) and
            (has_admission or has_cat or self._has_any(text, ["portal", "admission portal", "admission account"]))
        )
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
        has_con_nursing = (
            self._has_any(text, ["nursing", "bsn", "college of nursing"]) or
            self._has_any_token(text, ["con"])
        )
        has_psa_birth_certificate = (
            self._has_any(text, ["psa", "birth certificate", "birth cert", "psa birth", "birthcertificate"]) and
            self._has_any(text, ["original", "photocopy", "certified true copy", "requirement", "requirements", "pwede ra", "kinahanglan"])
        )
        has_free_higher_education = (
            self._has_any(text, ["free higher education", "fhe", "ra 10931", "10931"]) or
            (
                self._has_any(text, ["tuition", "miscellaneous fee", "miscellaneous", "misc fee", "free tuition", "libre ba gyud", "libre ba"]) and
                self._has_any(text, ["tuition", "bayaran", "fees", "fee", "free", "libre"]) and
                not self._has_any(text, ["dorm", "dormitory", "uniform", "second courser", "library card", "id card", "cat", "entrance exam"])
            )
        )
        has_first_year_sias_claim = (
            self._has_any(text, ["sias"]) and
            self._has_any(text, ["claim", "default password", "first year", "freshman", "freshmen", "incoming", "bag ong estudyante", "bag-ong"])
        )
        has_late_enrollment_docs = (
            self._has_any(text, ["late", "ma-late", "malate"]) and
            self._has_any(text, ["submit", "submission", "ipasa", "pasa", "makapag-submit", "makasubmit", "pass"]) and
            self._has_any(text, ["document", "documents", "requirement", "requirements", "form 138", "enrollment", "papeles"])
        )
        has_freshman_max_units = (
            self._has_any(text, ["unit", "units"]) and
            self._has_any(text, ["maximum", "max", "pila ka units", "how many units", "limit", "pwede kuhaon"]) and
            self._has_any(text, ["first year", "freshman", "1st year", "first sem", "first semester"])
        )
        has_board_course_retention = (
            self._has_any(text, ["retention", "maintaining grade", "retaining grade", "maintaining"]) and
            self._has_any(text, ["board course", "board courses", "nursing", "accountancy", "bsn", "bsa", "board program", "board programs"])
        )
        has_haircut_hair_color = (
            self._has_any(text, ["haircut", "hair color", "colored hair", "hair style", "hairstyle", "tupi", "kolor sa buhok", "buhok"]) and
            self._has_any(text, ["policy", "bawal", "allowed", "strict", "lalaki", "men", "male", "rules", "hair", "patakaran"])
        )
        has_campus_wifi = (
            self._has_any(text, ["wifi", "wi-fi", "internet", "campus wifi"]) and
            self._has_any(text, ["connect", "access", "login", "password", "unsaon", "how to"])
        )
        has_library_no_id = (
            self._has_any(text, ["library", "laib"]) and
            self._has_any(text, ["without id", "wala pay id", "no id", "physical id", "walay id", "makasulod", "sulod", "cor only", "cor ra"])
        )
        has_drop_subject_freshman = (
            self._has_any(text, ["drop", "dropping", "mag-drop", "mag drop", "mo-drop", "mo drop"]) and
            self._has_any(text, ["subject", "course", "klase"])
        )
        has_form138_goodmoral_submission = (
            self._has_any(text, ["form 138", "report card", "good moral"]) and
            self._has_any(text, ["submit", "submission", "asa dapit", "asa i-pass", "where to submit", "asa i-submit", "i-pass", "ipass"])
        )
        has_medical_clinic_checkup = (
            self._has_any(text, ["medical exam", "medical checkup", "medical examination", "chest x-ray", "x-ray", "xray", "magpa-medical"]) and
            not has_con_nursing
        )
        has_freshman_enrollment_question = (
            self._has_any(text, ["incoming freshmen", "incoming freshman", "freshman", "freshmen"]) and
            has_enrollment and
            self._has_any(text, ["how to enroll", "unsaon pag-enroll", "unsaon pag enroll", "freshman enrollment process", "enrollment steps"])
        )
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
        has_civilian_attire = self._has_any(text, [
            "civilian", "civilian attire", "civilian clothes", "plain clothes", "regular clothes",
            "non uniform", "non-uniform", "no uniform", "walay uniform",
            "t-shirt", "t shirt", "tshirt", "pants", "jeans", "casual clothes", "casual attire",
            "shirt and pants", "t shirt and pants", "t-shirt and pants", "tshirt and pants",
            "short pants", "shorts", "slippers", "sandals", "attire", "dress code",
        ])
        has_pe_uniform_mention = self._has_any(text, [
            "pe uniform", "pe unifrom", "uniform pe", "unifrom pe",
            "physical education uniform", "pe clothes", "pe attire", "old pe", "daan nga pe", "daan na pe"
        ])
        has_uniform_policy = (
            self._has_any(text, [
                "uniform", "dress code", "dresscode", "not wearing uniform", "without uniform", "wearing uniform", "school uniform",
                "attire", "dress", "outfit", "pamesti", "uniporme", "memorandum no 01", "memo no 01", "memorandum no. 01", "memo no. 01",
                "memorandum on uniform", "memo on uniform", "no. 01, s.2026", "no. 01, s. 2026", "no 01 s 2026"
            ]) or
            has_civilian_attire or
            (has_campus_entry_wording and self._has_any(text, ["t-shirt", "t shirt", "tshirt", "pants", "shirt", "wear", "wearing", "using", "isuot", "sul-ob"]))
        ) and not has_pe_uniform_mention
        has_buksu_general_policy = (
            self._has_any(text, [
                "policy of buksu", "policy of bukidnon state university", "policies of buksu", "policies in buksu",
                "policy sa buksu", "polisiya sa buksu", "mga polisiya sa buksu", "mga policy sa buksu",
                "buksu policy", "buksu policies", "university policy", "university policies",
                "rules and regulations in buksu", "rules and regulations sa buksu", "rules and regulations of buksu",
                "rules of buksu", "rules sa buksu", "rules in buksu", "regulations in buksu", "regulations of buksu",
                "campus policy", "campus policies", "school policy", "school policies",
                "unsay policy sa buksu", "unsa ang policy sa buksu", "unsa ang mga policy sa buksu", "unsa ang mga polisiya",
                "what are the policies of buksu", "what are the policies in buksu", "what is the policy of buksu",
                "whats the policy of bukidnon state university", "what's the policy of bukidnon state university",
                "whats the policy of buksu", "what's the policy of buksu", "general policy of buksu", "general policies of buksu"
            ]) or (
                self._has_any(text, ["policy", "policies", "polisiya", "rules and regulations"]) and
                self._has_any(text, ["buksu", "bukidnon state university", "university", "campus", "school"])
            )
        ) and not has_uniform_policy and not self._has_any(text, ["curfew", "muffler", "traffic", "vehicle", "gate pass", "dorm", "probation", "retention", "attendance", "overload", "refund", "grading", "shifting", "scholarship", "admission", "enrollment", "leave", "mentoring", "clinic", "dental"])
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
        ) and not self._has_any(text, ["library", "laib", "clinic", "dorm", "dormitory", "gym", "canteen", "cafeteria"])
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
        has_library_entry_query = (
            self._has_any(text, ["library", "laib"]) and
            self._has_any(text, ["enter", "inside", "sulod", "makasulod", "mosulod", "access", "use", "gamiton", "gamit", "bring", "allowed"]) and
            (has_student_id or "id" in raw_tokens or has_cor or "cor" in raw_tokens or "school id" in text)
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
        has_it_program = bool(re.search(r"\bIT\b", raw_text)) or self._has_any_token(text, ["bsit", "bs-it"]) or self._has_any(text, ["bs it", "information technology"])
        has_course = self._has_any(
            text,
            [
                "course", "courses", "program", "programs", "bachelor",
                "bsap", "philo", "bsa", "philosophy", "masters", "master's",
                "masteral", "board course", "non board",
            ],
        ) or self._has_any_token(text, ["bsit"]) or has_it_program or self._course_route(text, intent, has_it_program=has_it_program) is not None
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
            ]) or self._has_any_token(text, ["bsit", "bset", "bsat", "bsft", "bsemc", "bsn", "bshm", "bpa"])
        )
        has_course_slot_query = has_slot_word and has_course_slot_subject
        has_dormitory = self._has_any(text, ["dormitory", "dormitories", "dorm", "dorms", "mahogany", "rubia", "kilala"])
        is_food_tech = self._has_any(text, ["food tech", "foodtech", "food technology", "food processing", "manufacturing", "degree", "bachelor", "course", "program"])
        has_classroom_food = not is_food_tech and (
            bool(raw_tokens.intersection({"eat", "eating", "snack", "snacks", "kaon", "mokaon", "mukaon", "pagkaon"})) or
            self._has_any(text, ["can i eat", "eat inside", "eating inside", "eating in class", "eat in classroom", "snacking in class", "drinking in class"])
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
                self._has_any(text, ["specific course", "course passing", "my course", "department", "program", "nursing", "accountancy", "bachelor"]) or
                self._has_any_token(text, ["bsit"])
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
        has_nursing_enrollment_support = has_con_nursing and self._has_any(
            text,
            [
                "enrollment", "enroll", "incoming", "first year", "waitlisted", "eligible",
                "requirement", "requirements", "acceptance slip", "forms", "medical",
                "laboratory", "lab", "immunization", "vaccine", "health center", "submit",
                "submission", "pass", "pasa", "ipasa", "pagpasa",
            ],
        )
        # Facility availability detections for 'others' domain
        facility_availability_intent = None
        has_avail_q = self._has_any(text, ["naa ba", "naa bay", "aduna ba", "aduna bay", "is there", "does buksu have", "do buksu have", "available", "facility", "facilities"])
        if ("atm" in text) and self._has_any(text, ["naa ba", "naa bay", "is there", "does buksu have", "do buksu have", "available", "machine", "withdraw", "atm machine"]):
            facility_availability_intent = "atm_facility_availability"
        elif self._has_any(text, ["gym", "gymnasium"]) and has_avail_q:
            facility_availability_intent = "gym_facility_availability"
        elif self._has_any(text, ["cafeteria", "canteen"]) and has_avail_q:
            facility_availability_intent = "cafeteria_facility_availability"
        elif self._has_any(text, ["oval", "sports oval", "running track", "track oval"]) and has_avail_q:
            facility_availability_intent = "oval_facility_availability"
        elif ("museum" in text) and has_avail_q:
            facility_availability_intent = "museum_facility_availability"
        elif self._has_any(text, ["dental clinic", "dental services", "dentist"]) and has_avail_q:
            facility_availability_intent = "dental_clinic_facility_availability"
        elif ("auditorium" in text) and has_avail_q:
            facility_availability_intent = "auditorium_facility_availability"

        if facility_availability_intent:
            self.last_selected_intent = facility_availability_intent
            return facility_availability_intent

        if has_additional_slots:
            return "additional_slots"
        if has_main_campus_full:
            return "main_campus_full"
        if has_no_admission_slots:
            return "no_slots"
        if has_failed_admission_enrollment_eligibility:
            return "non_passer_enrollment_affirmative_action"
        if has_affirmative_action:
            return "affirmative_action"
        if has_phone_in_class:
            return "phone_use_in_class"
        if has_cat_mobile_application:
            return "apply_cat_using_mobile_phone"
        if has_application_status_query:
            return "status_application"
        if has_admission_preferred_course_change:
            return "change_preferred_course_admission_application"
        if has_intent_to_enroll_confirm:
            return "intent_to_enroll_confirm"
        if has_application_next_step:
            return "after_admission_application"
        if has_school_year_class_start:
            return "school_year_class_start_schedule"
        if has_school_year_end:
            return "school_year_end_schedule"
        if has_difference_board_nonboard:
            return "difference_board_nonboard_courses"
        if has_pe_uniform_store_schedule:
            return "pe_uniform_store_schedule"
        if has_excuse_letter_submit:
            return "absence_excuse_requirements"
        if has_test_permit_name_error:
            return "test_permit_name_error"
        if has_test_permit_issue:
            return "test_permit_issue"
        if has_course_slot_query:
            return "course_slots"

        has_contact_info = self._has_any(text, ["contact number", "email address", "telephone", "phone number", "contact directory", "contact sa buksu", "email sa buksu"])
        if has_contact_info:
            return "buksu_contact_info"

        has_enrollment_website = (
            self._has_any(text, [
                "website for enrollment", "website for enrollemnt", "website para sa enrollment",
                "enrollment website", "enrollemnt website", "enrollment portal", "admissions portal",
                "portal for enrollment", "portal for enrollemnt", "online system for enrollment",
                "specific portal for enrollment", "website of the buksu for enrollment",
                "website of buksu for enrollment", "portal for incoming first year to enroll",
                "portal for incoming first year", "website to enroll", "website para mag enroll",
                "portal para mag enroll", "portal para sa enrollment",
                "portal for freshman to enroll", "portal for freshmen to enroll",
                "website sa enrollment", "website sa pag enroll", "portal sa pag enroll",
                "spacific portal for incoming first year to enroll", "portal for incoming first year to enroll"
            ]) or (
                self._has_any(text, [
                    "enroll", "enrollment", "enrollemnt", "enrolling", "enrol", "mag enroll", "magpa enroll", "pag enroll"
                ]) and
                self._has_any(text, ["website", "webpage", "web page", "portal", "online system", "system", "link"]) and
                not self._has_any(text, ["cannot login", "can't login", "dili maka login", "password", "reset", "forgot", "steps", "step by step", "unsaon pag apply"])
            )
        )
        if has_enrollment_website and active_domain != "location":
            return "enrollment_online_system"

        has_official_website = (
            (
                self._has_any(text, [
                    "official website", "university website", "buksu website", "website sa buksu",
                    "webpage sa buksu", "website link", "buksu web page", "official link",
                    "unsa ang website", "what is the website of buksu", "what is the official website",
                    "university official website", "official website of buksu"
                ]) or
                (self._has_any(text, ["website", "webpage", "web page"]) and self._has_any(text, ["buksu", "university", "official", "main"]))
            ) and not self._has_any(text, ["enroll", "enrollment", "enrollemnt", "enrolling", "admission", "admissions", "exam", "grade", "grades", "sias"])
        )
        if has_official_website:
            return "buksu_official_website"

        has_library_penalty = (
            self._has_any(text, ["penalty", "fine", "fines", "overdue", "late return", "unreturned", "late returned", "overdue fine"]) and
            self._has_any(text, ["library", "book", "books", "libro"])
        )
        if has_library_penalty:
            return "library_late_return_penalty"

        has_library_available = (
            self._has_any(text, ["available books", "books available", "reference collections", "dissertations", "textbooks", "library hold", "library collection", "reference collection"]) or
            (self._has_any(text, ["library", "laib"]) and self._has_any(text, ["available to borrow", "collections", "textbook", "textbooks", "materials"]))
        )
        if has_library_available:
            return "library_available_books_info"

        has_library_borrow_rules = (
            self._has_any(text, ["how many books", "how many days", "borrowing rules", "book limit", "borrow limit", "maximum books", "undergraduate student take home"]) and
            self._has_any(text, ["library", "borrow", "book", "books"])
        )
        if has_library_borrow_rules:
            return "library_book_borrowing_rules"

        has_library_return = (
            self._has_any(text, ["library", "libro", "book", "books"]) and
            self._has_any(text, ["return", "hand back", "ibalik", "pag-uli", "iuli", "pag uli", "deadline", "human na ang deadline"])
        )
        if has_library_return:
            return "library_return_books_process"

        has_library_borrow = (
            self._has_any(text, ["library", "libro", "book", "books"]) and
            self._has_any(text, ["borrow", "hiram", "hulam", "pag hiram", "pag hulam", "pag-borrow", "how to borrow", "unsaon pag hiram", "unsaon pag hulam"])
        )
        if has_library_borrow:
            return "library_borrow_books_process"

        has_clinic_services = self._has_any(text, ["clinic", "dental", "medical checkup", "checkup", "dentista", "dentist", "medical consult", "dental consult", "health services"])
        if has_clinic_services:
            if self._has_any(text, ["tooth extraction", "extract tooth", "extract a tooth", "tooth removal", "remove tooth", "paibot ngipon", "ibot ngipon", "tooth pulled", "pulled at the dental"]):
                return "request_tooth_extraction"
            if self._has_any(text, ["hours", "operating hours", "opening hours", "open", "close", "schedule"]):
                return "health_services_unit_location_hours"
            if self._has_any(text, ["first aid", "emergency consultations", "emergency", "consultations are available"]):
                return "buksu_clinic_services"
            if self._has_any(text, ["dental", "ngipon", "tooth", "teeth", "pasta", "oral checkup", "checkups"]):
                return "request_dental_consult"
            if self._has_any(text, ["medical", "checkup", "check up", "doctor", "doktor", "tambal", "medicine"]):
                return "buksu_medical_dental_services"
            return "__clinic_services_menu__"

        has_institutional_email = self._has_any(text, ["institutional email", "ms teams", "teams account", "office 365", "student email", "google workspace"])
        if has_institutional_email:
            return "institutional_email_info"

        has_dual_scholarship = (
            self._has_any(text, ["scholarship", "scholarships", "tes", "tabuk"]) and
            self._has_any(text, ["dungan", "dunganon", "duha", "duha ka", "multiple", "two", "another"])
        )
        if has_dual_scholarship:
            return "tes_with_other_scholarships"

        has_available_scholarships = (
            self._has_any(text, [
                "what scholarships are available", "what scholarships are offered", "what scholarships does buksu offer",
                "what scholarship is available", "what scholarship is offered", "what scholarship does buksu offer",
                "scholarships available", "scholarships offered", "scholarship available", "scholarship offered",
                "scholarships in buksu", "scholarship in buksu", "list of scholarships", "list of scholarship",
                "unsa nga mga scholarship available", "unsa ang mga scholarship available", "unsa nga scholarship available",
                "unsa ang mga scholarship sa buksu", "unsa nga mga scholarship sa buksu", "unsa nga scholarship naa sa buksu",
                "naa bay scholarship sa buksu", "naa bay available nga scholarship", "available scholarships in buksu",
                "available scholarships", "available scholarship", "scholarship programs", "scholarship program",
                "apply for institutional and government educational scholarships", "educational scholarships",
            ]) or (
                self._has_any(text, ["scholarship", "scholarships", "sfgu", "financial grants", "financial grant"]) and
                self._has_any(text, ["available", "offer", "offered", "offers", "list", "programs", "options", "types", "unsa", "what", "naa", "aduna", "apply", "application"])
            )
        ) and not has_dual_scholarship and not self._has_any(text, ["where", "location", "asa dapit", "hain", "diin", "room", "a1-1-02", "contact", "email", "phone", "number"])
        if has_available_scholarships:
            return "available_scholarships_buksu"

        has_scholarship_unit = self._has_any(text, ["scholarships and financial grants unit", "financial grants unit", "sfgu", "scholarships unit", "scholarship unit"])
        if has_scholarship_unit:
            return "scholarships_and_financial_grants"

        has_free_tuition = self._has_any(text, ["universal access", "tertiary education act", "free tuition", "ra 10931", "cover my tuition", "quality tertiary education"])
        if has_free_tuition:
            return "free_tuition_undergraduate_buksu"

        has_guidance_inquiry = self._has_any(text, ["guidance", "counseling", "counselor", "psychological", "personality testing", "stress support", "mental wellness"])
        if has_guidance_inquiry and not self._has_any(text, ["where is", "location of", "asa dapit", "room"]):
            if self._has_any(text, ["fee", "fees", "payment", "pay", "charge", "charged", "cost", "free", "bayad", "pila"]):
                return "ask_guidance_fee"
            if self._has_any(text, ["stress", "mental", "depressed", "anxious", "wellness"]):
                return "student_stress_support"
            return "guidance_counseling_services_buksu"

        has_lost_found = self._has_any(text, ["lost and found", "claim items", "valuables lost", "misplaced inside", "misplaced on campus", "nawala nga gamit", "lost item", "lost or misplaced"])
        if has_lost_found:
            return "lost_and_found_buksu"

        has_gate_pass = self._has_any(text, ["gate pass", "temporary gate pass", "forgot my student id and need a temporary gate pass", "forgot my id and need", "no id enter campus"])
        if has_gate_pass:
            if self._has_any(text, [
                "get", "getting", "apply", "applying", "application", "acquire", "acquiring", "acquisition", "acquirment",
                "obtain", "secure", "securing", "claim", "request", "process", "procedure", "step", "steps",
                "kuha", "kuhaon", "makakuha", "pagkuha", "mokuha", "mukuha", "kuhag", "mangayo", "pangayo",
                "where", "asa", "aha", "unsaon", "pamaagi", "how do", "how can", "how to", "how"
            ]):
                return "gate_pass_process"
            return "general_gate_pass"

        has_college_shirt = self._has_any(text, ["college shirt", "college shirts", "department shirt", "department shirts", "course shirt", "org shirt", "sbo shirt"])
        if has_college_shirt:
            has_buy_query = self._has_any(text, ["buy", "purchase", "palit", "order", "avail", "how to get", "where to get", "where can i buy", "where to buy", "how much", "price", "pila", "tagpila", "asa makapalit", "unsaon pagpalit"])
            if has_buy_query:
                return "buy_college_shirt"
            return "college_shirt_allowed"

        has_join_org = self._has_any(text, ["sign up to become a member", "join student organization", "join student organizations", "join a club", "join campus club", "become a member of an accredited campus club"])
        if has_join_org:
            return "join_student_organizations_process"

        has_orientation_query = self._has_any(text, ["freshman orientation", "new student orientation", "orientation mandatory", "freshman student orientation", "attending the freshman student orientation"])
        if has_orientation_query:
            return "new_student_orientation_purpose"

        has_freshmen_intramurals_query = self._has_any(text, ["freshman intramurals", "freshmen intramurals", "first-year freshman students allowed to join sports", "freshmen join intramurals"])
        if has_freshmen_intramurals_query:
            return "freshmen_intramurals"

        has_dress_code_query = self._has_any(text, ["dress code", "clothing policy", "wash day", "wash days", "civilian attire", "non-uniform wash days", "proper campus dress code"])
        if has_dress_code_query and not self._has_any(text, ["pe uniform", "physical education uniform"]):
            return "campus_dress_code"

        if has_buksu_general_policy:
            return "buksu_general_policies"

        if has_uniform_policy:
            return "campus_dress_code_policy"
        if has_dormitory:
            if self._has_any(text, ["mahogany", "male", "boys", "men", "lalaki"]):
                return "male_dorm"
            if self._has_any(text, ["rubia", "female", "babae", "women", "girls"]):
                return "female_dorm"
            if self._has_any(text, ["bayad", "curfew", "rate", "rates", "fee", "fees", "monthly", "binuwan", "pila", "tagpila"]):
                return "campus_dormitories"
            return "campus_dormitories"
        if not has_library_id and not has_id_validation and (has_student_id or self._has_any_token(text, ["id"]) or self._has_any(text, ["student id", "school id", "id card", "akong id"])):
            if self._has_any(text, ["replace a lost", "lost buksu student id", "lost student id", "replace lost", "replacement"]):
                return "lost_student_id_replacement_process"
            if self._has_any(text, ["unsaon", "how", "process", "picture", "pa-picture", "papicture", "pagkuha", "apply", "kuha", "claim", "get", "pag-process", "pag process", "magpa-himo", "bag-o"]):
                return "student_id_process"
        if (has_pe_uniform_mention or self._has_any(text, ["pe uniform", "school uniform", "uniform"])) and self._has_any(text, ["palit", "makapalit", "buy", "where to get", "asa dapit", "asa makapalit", "asa makuha", "how to get", "unsaon pagkuha", "request"]):
            return "pe_uniform_process"
        if has_psa_birth_certificate:
            return "psa_birth_certificate_requirement"
        if has_free_higher_education:
            return "student_fees"
        if has_first_year_sias_claim:
            return "sias_first_year_claim"
        if has_late_enrollment_docs:
            return "late_enrollment_document_submission"
        if has_freshman_max_units:
            return "freshman_maximum_units_policy"
        if has_board_course_retention:
            return "board_course_retention_policy"
        if has_haircut_hair_color:
            return "haircut_and_hair_color_policy"
        if has_campus_wifi:
            return "campus_wifi_access"
        if has_library_no_id:
            return "library_entry_without_id"
        has_course_shifting = self._has_any(text, [
            "shift course", "shifting course", "mag-shift", "mag shift", "shift ug course", "shift og course",
            "change course", "switch course", "balhin course", "balhin ug course", "shift to another course",
            "shifting to another course", "shift ug programa", "shift sa lain course", "shift ug lain course",
            "mag-shift ug course", "mag shift ug course", "mag-shift og course", "mag shift og course",
        ])
        has_enrollment_req_intent = (
            self._has_any(text, [
                "requirement", "requirements", "document", "documents", "needed",
                "kinahanglan", "gikinahanglan", "dokumento", "papeles", "unsa kinahanglan",
                "unsa ang requirements", "what are the requirements", "what are the documents",
                "what do i need", "what documents", "what documents do", "what to prepare",
                "qualify", "qualifying", "qualification", "envelope", "envelopes",
                "enrollment requirements", "documentary requirements",
                "unsa ang mga papeles", "unsa ang mga dokumento", "papers to bring", "documents to bring",
                "what papers", "unsa akong dad-on", "unsa akong dalhon", "ipasa", "submit",
                "requirements for enrollment", "enrollment documentary requirements"
            ])
        )
        has_enrollment_proc_intent = (
            self._has_any(text, [
                "how to enroll", "how do i enroll", "how can i enroll", "how to enroll in",
                "unsaon pag enroll", "unsaon pag-enroll", "unsaon pagpa enroll", "unsaon pagpa-enroll",
                "enrollment process", "process of enrollment", "steps for enrollment", "steps to enroll",
                "enrollment steps", "paagi sa pag enroll", "unsa ang proseso sa pag enroll",
                "how does enrollment work", "walk me through enrollment", "guide for enrollment",
                "how student enroll", "unsa ang enrollment process", "unsaon pag enroll sa mga estudyante",
                "how to apply for enrollment", "unsaon pag apply para enrollment", "unsaon pag apply og enrollment"
            ])
        )
        has_requirement_or_admission_intent = has_enrollment_req_intent

        # 1. Specific Law & Graduate Program Requirements
        has_law_or_graduate_req = (
            self._has_any(text, [
                "law enrollment", "graduate enrollment", "graduate enrollment requirements", "law enrollment requirements",
                "law school enrollment", "college of law enrollment", "juris doctor enrollment", "graduate school enrollment",
                "graduate studies enrollment", "masteral enrollment", "doctorate enrollment",
            ]) or
            (self._has_any(text, ["law", "juris doctor", "graduate school", "graduate studies", "masteral", "doctorate"]) and has_enrollment and self._has_any(text, ["requirement", "requirements", "document", "documents"]))
        )
        if has_law_or_graduate_req and active_domain != "location" and not self._has_any(text, ["where is", "location of", "asa dapit", "asa ang"]):
            return "graduate_law_enrollment_requirements"

        # 2. Specific College of Medicine Requirements
        has_medicine_program_req = (
            self._has_any(text, [
                "medicine enrollment", "medicine requirements",
                "doctor of medicine requirements", "doctor of medicine enrollment",
                "medicine documentary", "med school requirements",
                "medicine course requirements", "nmat result"
            ]) or
            (self._has_any_token(text, ["medicine", "nmat"]) and has_requirement_or_admission_intent) or
            (self._has_any(text, ["college of medicine", "doctor of medicine", "med school"]) and has_requirement_or_admission_intent)
        )
        if has_medicine_program_req and active_domain != "location" and not self._has_any(text, ["where is", "where", "location of", "location", "asa dapit", "asa ang", "asa", "how to go", "how to find", "building", "bldg"]):
            return "medicine_enrollment_requirements"

        # 3. General / Broad Enrollment Requirements (No specific single program specified)
        # Returns the overarching overview with 3 interactive choice buttons (Undergraduate, Law/Graduate, Medicine)
        has_general_enrollment_documents = (
            self._has_any(text, [
                "enrollment documents", "enrollment documentary requirements", "requirements for enrollment",
                "documents for enrollment", "documentary requirements", "brown envelope requirements",
                "documents to submit to registrar", "what documents do i need for enrollment",
                "what are the enrollment documentary requirements", "which enrollment requirements apply to me",
                "undergraduate graduate law medicine enrollment requirements", "choices for enrollment requirements",
                "unsa nga enrollment requirements para nako", "unsa ang mga requirements para enrollment",
                "unsa ang enrollment requirements", "unsaon pagkahibalo sa enrollment requirements"
            ])
        )
        if has_general_enrollment_documents and not (
            self._has_any_token(text, ["bsit", "bs-it", "nursing", "bsn", "bsba", "bsa", "bshm", "bstm", "bsed", "beed", "bsphilo", "emc", "bscrim"]) or
            self._has_any(text, ["bs it", "bs emc", "bs at", "bs et", "bs ft", "bs n", "bs ba", "bs hm", "bs tm", "bs ed", "be ed", "bs crim"])
        ) and active_domain != "location":
            return "enrollment_documents"

        # 4. Undergraduate Course-Aware Admission & Enrollment Routing:
        # Distinguishes when a student asks how to enroll vs documentary requirements for a specific course.
        has_undergrad_course_mention = (
            self._has_any(text, [
                # COT
                "bs it", "information technology", "info tech", "bs info tech", "bs information tech", "bs information technology",
                "bs-emc", "bs emc", "entertainment and multimedia", "multimedia computing",
                "bs automotive", "automotive technology", "auto tech", "bs-at", "bs at",
                "bs electronics", "electronics technology", "bs-et", "bs et", "electronics tech",
                "bs food tech", "food technology", "bs-ft", "bs ft",
                # CON
                "bs-n", "bs nursing", "nursing course", "nursing program",
                # COB
                "bs-ba", "bs ba", "business administration", "financial management", "marketing management",
                "bs accountancy", "bs accounting", "bsa course", "accountancy program", "accountancy course",
                "bs-hm", "bs hm", "hospitality management", "hotel management", "hrm course",
                "bs-tm", "bs tm", "tourism management", "tourism course",
                # COE
                "bs-ed", "bs ed", "secondary education", "be-ed", "be ed", "elementary education",
                "early childhood education", "special needs education", "physical education",
                "education course", "education program", "teacher education",
                # CAS
                "ba comm", "ba communication", "mass comm", "dev com", "development communication",
                "bs devcom", "bs development communication", "bs philo", "ba philo", "philosophy course",
                "ba philosophy", "bs sociology", "ba sociology", "bs economics", "ba economics", "bs english",
                "ba english", "english language", "bs community development", "community development",
                "bs math", "bs mathematics", "applied math", "bs applied math", "bs biology", "bs bio",
                "bs environmental science", "envi sci", "bs envi sci", "bs social work", "bs psychology",
                "ba psychology", "bs psych", "ba psych",
                # CPAG
                "bpa course", "bs public administration", "public administration", "public admin",
                # Criminology
                "bs-crim", "bs crim", "criminology"
            ]) or
            self._has_any_token(text, [
                "bsit", "bs-it", "bsemc", "emc", "bsat", "bset", "bsft", "bsn", "nursing", "bsba", "bsa", "accountancy", "bshm", "bstm",
                "bsed", "beed", "beced", "bsned", "bped", "education", "educ", "devcom", "bscd", "bssw", "bpa",
                "bscrim", "criminology", "philosophy", "sociology", "psychology", "economics", "bsphilo"
            ])
        )

        if has_undergrad_course_mention and active_domain != "location" and not self._has_any(text, ["where is", "location of", "asa dapit", "asa ang", "how to go to", "how to find", "building", "asa dapit ang"]):
            if has_enrollment_req_intent:
                return "freshman_enrollment_process"
            if has_enrollment_proc_intent or self._has_any(text, ["enroll", "enrollment", "enrolling", "mag-enroll", "mag enroll", "magpa-enroll", "magpa enroll"]):
                return "enrollment_general_process"

        # Enrollment Onboarding — "I want to enroll but don't know where to start"
        # Must be checked BEFORE generic enrollment and BEFORE location routing.
        # Detects confused/new students who need a full step-by-step intro, not just
        # the enrollment process (which assumes you already know what to do next).
        has_enrollment_onboarding_intent = (
            self._has_any(text, [
                # English — explicit confusion + enroll
                "i want to enroll but i don't know where to start",
                "i want to enroll but i dont know where to start",
                "i want to enroll but i don't know how to start",
                "i want to enroll but i don't know what to do",
                "i want to enroll but i dont know what to do",
                "i want to enroll but i'm confused",
                "i want to enroll but im confused",
                "i want to enroll but i don't know the process",
                "i want to enroll can you help me",
                "where do i start for enrollment",
                "where do i start to enroll",
                "how do i start enrolling",
                "how do i begin the enrollment process",
                "i need help starting enrollment",
                "help me start my enrollment",
                "can you guide me through enrollment",
                "guide me through the enrollment process",
                "i'm new here and i want to enroll",
                "im new here and i want to enroll",
                "i'm a freshman and i don't know how to enroll",
                "i don't know how to enroll in buksu",
                "i dont know how to enroll in buksu",
                "i'm lost about enrollment",
                "im lost about enrollment",
                "i'm an incoming student and i want to enroll",
                "incoming student enrollment guide",
                "freshman enrollment guide",
                "how to start the enrollment process",
                "what is the first step to enroll",
                "what is the very first thing i need to do to enroll",
                "what should i do first to enroll at buksu",
                "complete guide to enrolling at buksu",
                "full enrollment process for freshmen",
                "i want to enroll where do i go",
                "where do i go to enroll",
                "where do i go for enrollment",
                "where can i enroll",
                "where to go for enrollment",
                "where to enroll",
                "where do i enroll",
                "where do i apply for enrollment",
                "where can i apply for enrollment",
                "where should i go to enroll",
                "where do i go to start enrollment",
                # Bisaya / Cebuano — confusion phrases
                "dili ko kahibaw asa magsugod og enroll",
                "dili ko kabalo unsaon pag enroll",
                "dili ko mahibaw-an asa magsugod sa enrollment",
                "gusto ko mag enroll pero dili ko kabalo asa magsugod",
                "gusto ko mag enroll pero wala ko kabalo unsaon",
                "unsaon nako pagsugod sa enrollment",
                "asa ko magsugod sa enrollment",
                "tabangi ko magsugod sa enrollment",
                "palihog tabangi ko para sa enrollment",
                "enrollment guide para sa mga bag-ong estudyante",
                "unsa ang una nga buhaton para mag enroll",
                "asa ko moadto para mag enroll",
                "asa ko moadto para sa enrollment",
                "asa moadto para mag enroll",
                "asa mag enroll",
                "asa dapit mag enroll",
                "asa dapit magpa enroll",
                "asa magpa enroll",
            ]) or
            (
                # "enroll/enrollment" + explicit confusion/start signal, no location terms
                self._has_any(text, ["enroll", "enrollment", "enrolling"]) and
                self._has_any(text, [
                    "don't know where to start", "dont know where to start",
                    "don't know how to start", "dont know how to start",
                    "don't know what to do", "dont know what to do",
                    "don't know where to begin", "dont know where to begin",
                    "don't know anything", "dont know anything",
                    "need guidance", "need some guidance", "guidance for enrollment",
                    "guidance on enrollment", "first year student", "incoming freshman",
                    "first time enrolling", "first time to enroll",
                    "where to start", "how to start", "where do i start", "how do i start",
                    "i'm confused", "im confused", "i am confused",
                    "don't know the process", "dont know the process",
                    "i'm lost", "im lost", "i am lost",
                    "can you help", "help me",
                    "dili ko kabalo", "dili ko kahibaw", "wala ko kabalo",
                    "wala koy alamag", "bag-ong estudyante",
                    "asa magsugod", "unsaon magsugod", "unsaon nako pagsugod",
                ]) and
                not self._has_any(text, [
                    "where is", "location of", "asa dapit ang", "asa ang",
                    "how to go to", "how to find", "building", "office",
                    "room", "classroom", "where to find", "map",
                ])
            )
        )
        if has_enrollment_onboarding_intent and active_domain != "location":
            return "enrollment_where_to_start"

        has_enrollment_portal_query = (
            self._has_any(text, [
                "is there a specific portal or online system for enrollment",
                "specific portal or online system for enrollment",
                "portal or online system for enrollment",
                "online system for enrollment",
                "specific portal for enrollment",
                "what portal is used for enrollment",
                "what portal do we use for enrollment",
                "what portal do i use to enroll",
                "what website do i use to enroll",
                "what website is used for enrollment",
                "what is the enrollment portal",
                "what is the enrollment website",
                "enrollment portal of buksu",
                "portal for enrollment",
                "website for enrollment",
                "unsa ang portal para sa enrollment",
                "unsa ang website para sa enrollment",
                "naa bay specific portal para sa enrollment",
                "naa bay online system para sa enrollment",
                "unsa nga portal gamiton para mag enroll",
            ]) or (
                self._has_any(text, ["enroll", "enrollment", "enrolling", "mag enroll", "magpa enroll"]) and
                self._has_any(text, ["portal", "online system", "website", "system"]) and
                self._has_any(text, ["specific", "is there", "what portal", "which portal", "what website", "which website", "what system", "unsa nga portal", "naa ba", "naa bay", "asa nga website"]) and
                not self._has_any(text, ["cannot login", "can't login", "dili maka login", "password", "reset", "forgot", "steps", "step by step", "unsaon pag"])
            )
        )
        if has_enrollment_portal_query and active_domain != "location":
            return "enrollment_online_system"

        has_enrollment_application_intent = (
            self._has_any(text, [

                "apply for enrollment", "apply enrollment", "how to apply for enrollment",
                "application for enrollment", "enrollment application", "apply for enroll",
                "apply to enroll", "mag-apply og enrollment", "mag apply og enrollment",
                "mag-apply para enrollment", "mag apply para enrollment", "pag-apply sa enrollment",
                "how to enroll in admission", "whats the process of enrollment application",
                "can you help me to apply for enrollment", "send me the process for admission enrollment",
                "enroll in admission", "enroll in admissions", "enroll in admision", "enroll on admision",
                "how to enroll on admission portal", "enrollment on admission", "enrollment on admision",
                "how to apply for enrollment in admission", "how to apply for enrollment on admission",
                "how to apply for enrollment on admision", "process of enrollment on admission",
                "admission enrollment process", "admission enrollment application",
                "unsaon pag enroll sa admission", "proseso sa enrollment sa admission portal",
                "unsaon pag apply og enrollment sa admission", "unsaon pag apply para enrollment sa admission",
                "enrollment general process", "what is the process of enrollment", "how does enrollment work",
                "steps for enrollment", "unsa ang enrollment process", "unsa ang proseso sa pag enroll",
                "unsaon pag enroll sa mga estudyante", "how to enroll", "how to enroll in buksu",
                "unsaon pag enroll", "unsaon pagpa enroll"
            ]) and not (
                self._has_any(text, ["exam", "test", "permit", "score", "cutoff", "cut-off", "percentage", "buksu cat", "cat exam", "cat test"]) or
                self._has_any_token(text, ["cat"]) or
                self._has_any(text, ["payment", "pay", "cashier", "accounting", "lbp", "landbank"])
            )
        )
        if has_enrollment_application_intent:
            return "enrollment_general_process"

        has_after_admission_application = (
            self._has_any(text, [
                "after admission application", "unsay sunod after pag apply og admission",
                "unsay sunod buhaton after mag apply og admission", "unsay sunod after admission application",
                "what to do after applying for admission", "what is the next step after applying for admission",
                "what to do after buksu cat application", "after applying for buksu cat",
                "next step after cat application", "human ko mag apply sa admission unsay sunod",
                "human mag apply sa admission", "unsa sunod buhaton human maka apply sa cat",
                "what happens after admission application is submitted", "what next after applying for entrance exam",
                "after apply admission", "next steps after admission application",
                "what to do after applying", "what is next after applying", "unsay sunod human mag apply",
                "human mag apply", "human apply", "human ug apply",
            ]) or
            (
                self._has_any(text, ["after", "sunod", "human", "next step", "what next", "pagkahuman"]) and
                self._has_any(text, ["apply", "application", "mag-apply", "mag apply", "nag apply", "pag-apply", "pag apply", "pag submit", "submitted"]) and
                self._has_any(text, ["admission", "cat", "entrance exam", "admission test", "portal"])
            )
        )
        if has_after_admission_application:
            return "after_admission_application"

        has_take_cat_exam = (
            (
                self._has_any(text, [
                    "take exam", "apply exam", "apply for cat", "apply cat",
                    "how to apply for cat", "how to take exam", "how to take buksu cat",
                    "how to apply for admission test", "schedule buksu cat", "register for admission test",
                    "register for cat", "buksu cat steps", "unsaon pag take sa cat", "unsaon pag apply sa cat",
                    "unsaon pag apply sa entrance exam", "steps to schedule my buksu cat", "take buksu cat",
                    "steps para maka exam", "how can i take the buksu college admission test",
                    "process of applying for the buksu admission test", "apply for admission testing",
                    "apply for admission exam", "apply admission test", "entrance exam application",
                    "tell me how to apply for buksu-cat examination", "tell me how to apply for buksu cat examination",
                    "how to apply for buksu-cat examination", "how to apply for buksu cat examination",
                    "how to apply for buksu-cat", "how to apply for buksu cat",
                    "how to apply for cat exam", "how to apply for cat examination", "how to apply for cat testing",
                    "how to apply for admission testing", "how to apply for entrance examination",
                    "how to apply for entrance exam", "process of applying for buksu-cat", "process of applying for buksu cat",
                    "process of applying for entrance exam", "process of applying for admission testing",
                    "unsaon pag apply sa buksu-cat examination", "unsaon pag apply sa buksu cat examination",
                    "unsaon pag apply sa entrance examination", "unsaon pag apply sa admission testing",
                    "unsaon pag-apply sa buksu-cat", "unsaon pag-apply sa buksu cat",
                    "unsaon pag-apply sa entrance exam", "unsaon pag-apply sa entrance examination"
                ]) or (
                    self._has_any(text, ["apply", "application", "register", "registration", "take", "schedule", "unsaon pag apply", "unsaon pag-apply", "unsaon pag take", "unsaon pag-take", "how can i take", "process", "steps", "guide", "how to", "unsaon"]) and
                    self._has_any(text, ["buksu cat", "buksu-cat", "buksucat", "cat exam", "cat testing", "cat examination", "admission test", "admission testing", "entrance exam", "entrance examination", "college admission test"])
                )
            ) and
            not has_cat_online_vs_walkin and
            not self._has_any(text, [
                "after", "sunod", "human", "next step", "what next", "pagkahuman",
                "result", "results", "score", "scores", "cutoff", "cut-off", "passing score", "rating", "passed", "fail", "failed",
                "fee", "fees", "pay", "payment", "bayad", "pila", "cost", "free", "libre",
                "requirement", "requirements", "dalhon", "bring", "dala", "papers", "documents",
                "calculator", "reschedule", "missed", "retake", "walk in", "walk-in", "walkin", "online ba", "definition", "meaning", "unsa ang", "what is"
            ])
        )
        if has_take_cat_exam and active_domain != "location" and not self._has_any(text, ["where is", "location of", "asa dapit", "asa ang", "how to go to", "how to find"]):
            return "take_exam"

        if has_exam_day_requirement_wording and not has_missed_cat_schedule:
            return "exam_requirements"

        has_admission_requirements = (
            (
                self._has_any(text, [
                    "admission requirement", "admission requirements",
                    "requirements for admission", "requirement for admission",
                    "requirements for the admission", "requirements for the admission application",
                    "requirements of admission", "requirements of admission application",
                    "admission application requirements", "admission application requirement",
                    "requirements for admission testing", "requirements for buksu admission",
                    "what are the requirements for admission", "what are the requirements for the admission application",
                    "what are the requirements for admission application",
                    "what documents need for admission", "what documents are needed for admission",
                    "what documents are required for admission", "documents needed for admission",
                    "documents need for admission", "documents for admission", "documents for admission application",
                    "documentary requirements for admission", "admission documents", "admission documentary requirements",
                    "requirements to apply for admission", "requirements to apply admission",
                    "requirements to create admission account", "requirements for first year application",
                    "freshman admission requirements", "freshmen admission requirements",
                    "incoming first year admission requirements", "first year admission requirements",
                    "what are the requirements for transferees", "requirements for transferees", "requirements for transferee",
                    "transferee requirements", "transferee admission requirements", "transferee application details",
                    "documents needed for transferee admission",
                    "second courser requirements", "requirements for second courser", "what are the requirements for second coursers",
                    "law admission requirements", "juris doctor admission requirements", "requirements for law admission",
                    "masters degree admission requirements", "gpat admission requirements", "masters admission requirements",
                    "unsa ang requirements para sa admission", "unsa ang requirements para sa admission application",
                    "unsa ang requirements para maka apply sa admission", "unsa kailangan para mo apply sa buksu admission",
                    "unsa ang kailangan para mo apply sa buksu admission testing", "unsa kailangan para mo apply sa buksu admission testing",
                    "unsa kailangan para maghimo ug account", "requirements sa incoming first year",
                    "mga kinahanglanon para sa admission", "mga kinahanglanon para sa admission application",
                    "mga kinahanglanon sa admission application",
                    "papeles para sa admission", "papeles para maka apply sa admission",
                    "what does a freshman need for admission", "requirements for new student admission",
                    "unsa rules sa pag transfer sa buksu", "unsa ang gikinahanglan sa second courser",
                ]) or
                (
                    self._has_any(text, [
                        "admission", "admissions", "admission application", "admission test application",
                        "apply admission", "apply for admission", "pag-apply sa admission", "mag-apply sa admission",
                        "mag apply sa admission", "mo apply sa admission", "mo-apply sa admission",
                        "transferee", "transferees", "second courser", "second coursers", "gpat", "masters", "juris doctor"
                    ]) and
                    self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "papers", "needed", "need", "kinahanglanon", "kailangan", "kinahanglan", "gikinahanglan"]) and
                    not has_exam_day_requirement_wording and
                    not has_enrollment and
                    not self._has_any(text, [
                        "after", "sunod", "human", "result", "results", "score", "scores",
                        "fee", "fees", "pay", "payment", "bayad", "deadline", "schedule", "when", "kanus",
                        "test permit corrupted", "corrupted", "change course", "preferred course"
                    ])
                )
            )
        )
        if has_admission_requirements and active_domain != "location" and not self._has_any(text, ["where is", "location of", "asa dapit", "asa ang", "how to go to", "how to find"]):
            if has_transferee or self._has_any(text, ["transferee", "transferees", "transfer"]):
                return "transferee_admission_requirements"
            if has_second_courser or self._has_any(text, ["second courser", "second coursers", "second-courser", "second-coursers", "second course", "second degree"]):
                return "second_courser_requirements"
            if has_law or self._has_any(text, ["law", "juris doctor"]):
                return "law_admission_requirements"
            if has_gpat or self._has_any(text, ["gpat", "graduate program admission test", "graduate admission test", "graduate admission testing"]):
                return "gpat_admission_requirements"
            if has_masters or self._has_any(text, ["masters", "master", "master's"]):
                return "masters_degree_admission_requirements"
            if self._has_any(text, ["als", "alternative learning"]):
                return "als_graduate_buksu_cat_application"
            return "freshman_admission_requirements"

        has_admission_approval_time = (
            self._has_any(text, [
                "admission application processing time", "processing time for admission",
                "how many days before admission", "how many days do admission application",
                "how long does admission approval take", "how many days for buksu admission approval",
                "pila ka adlaw una ma approve ang admission", "pila ka adlaw hulaton ang approval sa admission",
                "pila ka days ang evaluation sa admission", "kanus-a ma approve akong admission",
                "waiting time for admission application", "how long to wait for test permit approval",
                "how long to get test permit", "how many days to get test permit",
                "pila ka adlaw una makuha ang test permit",
            ]) or
            (
                self._has_any(text, ["admission", "admission test", "test permit", "permit"]) and
                self._has_any(text, ["how many days", "how long", "pila ka adlaw", "pila ka days", "when will", "kanus-a", "ma verify", "verify"]) and
                self._has_any(text, ["approve", "approved", "approval", "accepted", "accept", "evaluation", "evaluate", "process", "review", "verify", "verification", "makuha", "release"])
            )
        )
        if has_admission_approval_time:
            return "admission_application_processing_time"

        has_admission_denied_reason = (
            self._has_any(text, [
                "application always denied", "why is my admission application rejected",
                "why my admission got rejected", "why did my admission application get denied",
                "ngano pirmi ma deny ang akong admission application", "nganong gi reject akong admission application",
                "unsa ang hinungdan ngano denied akong application", "reasons why admission application is rejected",
                "how to fix rejected admission application", "my application is always rejected",
                "admission application denied", "admission application rejected", "disapproved admission application",
                "why was my cat application disapproved", "gi reject sa system ang akong application",
                "gi deny sa system ang akong application",
            ]) or
            (
                self._has_any(text, ["admission", "application", "2x2", "picture", "photo", "document", "requirements"]) and
                self._has_any(text, ["denied", "rejected", "disapproved", "disapprove", "gi-disapprove", "gi disapprove", "gi deny", "gi-deny", "gi reject", "gi-reject", "ma deny", "ma reject"]) and
                self._has_any(text, ["why", "ngano", "nganong", "reason", "reasons", "hinungdan", "always", "pirmi", "fix", "ayos", "unsaon"])
            )
        )
        if has_admission_denied_reason:
            return "application_always_denied"

        has_late_enrollment = (
            self._has_any(text, [
                "late enrollment", "late enrolment", "late enrol", "late na",
                "maka enroll bisan late", "mo enroll bisan late", "ma late og enroll",
                "human sa deadline", "after deadline", "na-abtan sa deadline",
                "na lapse ang deadline", "missed deadline", "missed the deadline",
                "can i still enroll", "enroll after deadline"
            ])
        )
        if has_late_enrollment:
            return "late_enrollment"

        has_tor_request = (
            self._has_any(text, [
                "transcript of records", "request tor", "request ug tor", "request og tor",
                "request transcript", "kuha ug tor", "kuha og tor", "request of tor",
                "official transcript"
            ]) or
            (self._has_any_token(text, ["tor"]) and self._has_any(text, ["request", "kuha", "proseso", "process", "get", "pangayo"]))
        )
        if has_tor_request:
            return "request_tor_process"

        has_cor_validation = (
            self._has_any(text, ["cor", "certificate of registration"]) and
            self._has_any(text, ["validate", "pa-validate", "pa validate", "validation", "pag-validate", "ma-validate", "mavalidate", "asa magpa validate", "asa i-validate"])
        )
        if has_cor_validation and not _is_id_validation_query:
            # 1. Location intent (Where to validate)
            if self._has_any(text, ["where", "asa", "location", "place", "hain", "diin", "asa dapit", "where do i go", "where can i", "where should i", "which window", "unsa nga window", "asa moadto"]):
                return "cor_validation_location"
            # 2. Schedule / Date intent (When to validate)
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule", "month", "period", "kanus-a", "kanusa"})) or self._has_any(
                text, ["validation day", "validation date", "validation schedule", "how long", "kanus-a"]
            ):
                return "cor_validation_day"
            # 3. Process / Steps intent (How to validate)
            return "cor_validation_steps"

        has_overload_query = (
            self._has_any(text, ["overload", "overloading", "overloading policy", "pila ka units", "maximum units", "max units", "overload units"]) and
            self._has_any(text, ["graduating", "senior", "last semester", "last sem", "katapusan", "units", "student take"])
        )
        if has_overload_query:
            return "overload_units_policy"

        has_board_course_retention = (
            self._has_any(text, ["retention", "maintaining grade", "culling grade", "retention policy", "retention standards"]) or
            (self._has_any(text, ["board exam", "board course", "board courses"]) and self._has_any(text, ["grade", "standards", "standards", "cut off", "cutoff", "maintaining"]))
        )
        if has_board_course_retention:
            return "board_course_retention_policy"

        has_grading_computation = (
            self._has_any(text, ["grading system", "grade computed", "grades computed", "computed", "computation", "grading scale"]) and
            self._has_any(text, ["how", "buksu", "midterm", "final", "system", "grade"])
        )
        if has_grading_computation:
            return "buksu_grading_system"

        has_latin_honors = self._has_any(text, [
            "latin honors", "latin honor", "summa cum laude", "magna cum laude",
            "cum laude", "graduate with honors", "honor graduate", "latin honors average",
            "minimum gpa for latin honors", "gpa for latin honors", "latin honors requirements",
            "honors", "naay honors", "cum laude honors"
        ])
        if has_latin_honors:
            if self._has_any(text, ["gpa", "average", "grade", "cutoff", "pila ang gpa", "pila ka gwa", "gwa", "minimum grade"]):
                return "latin_honors_average_gpa"
            return "latin_honors_graduation_requirements"

        has_thesis_defense = self._has_any(text, ["thesis", "defense", "capstone", "oral defense", "proposal defense"])
        if has_thesis_defense:
            return "thesis_defense"

        has_prerequisite = self._has_any(text, ["prerequisite", "prerequisites", "prerequisit", "prereq", "pre requisite", "pre-requisite"])
        if has_prerequisite:
            if self._has_any(text, ["fail", "failed", "failing", "bagsak", "hagbong", "retake", "advance", "dependent", "take again"]):
                return "failed_prerequisite_subject"
            return "prerequisite_subjects_purpose"

        has_exam_query = self._has_any(text, ["midterm", "final exam", "finals exam", "final examination", "midterm examination", "exam rules", "examination rules"])
        if has_exam_query:
            if self._has_any(text, ["rule", "rules", "guideline", "guidelines", "policy", "policies", "slip", "slipt", "permit", "what do i need", "kailangan", "kinahanglan", "patakaran"]):
                return "midterm_and_final_exam_rules"
            if self._has_any(text, ["when", "schedule", "date", "dates", "calendar", "kanus-a", "kanusa", "oras", "week"]):
                return "academic_calendar_exam_schedules"

        has_lost_and_found = self._has_any(text, [
            "lost and found", "lost item", "lost items", "lose something", "lost something",
            "lost an item", "lose an item", "nawala nga butang", "nawala akong butang",
            "nawala nga gamit", "nawala akong gamit", "nawala sa campus", "lost on campus",
            "lose something on campus", "lost something on the campus", "personal belongings",
            "lose personal belongings", "lost personal belongings", "belongings"
        ])
        if has_lost_and_found:
            return "lost_and_found_buksu"

        has_chatbot_developer = self._has_any(text, [
            "naghimo aning chatbot", "nag himo aning chatbot", "nag-develop", "nag develop",
            "developer sa chatbot", "developers sa chatbot", "who made this bot",
            "who created this chatbot", "who programmed this", "nag create aning chatbot",
            "artificial intelligence chatbot", "who created", "who developed", "created and developed"
        ])
        if has_chatbot_developer:
            return "Bot_creator"

        has_student_assistant = self._has_any(text, ["student assistant", "student assistants", "apply student assistant", "apply as student assistant", "mag student assistant", "mag-apply og student assistant"])
        if has_student_assistant:
            return "student_assistant_application_process"

        has_inactive_group_member = self._has_any(text, ["group member", "groupmate", "group mate", "inactive group", "group member not active", "dili active sa group", "walay lihok nga groupmate", "group work"])
        if has_inactive_group_member:
            return "inactive_group_member"

        has_tes_scholarship_query = (
            self._has_any(text, ["tes", "tabuk", "unifast", "tertiary education subsidy"]) or
            (self._has_any(text, ["scholarship", "stipend", "allowance"]) and self._has_any(text, ["release", "delay", "taking so long", "wala pa naabot", "cancel", "other"]))
        )
        if has_tes_scholarship_query:
            if self._has_any(text, ["cancel", "i-cancel", "undang"]):
                return "cancel_tabuk_assistance"
            if self._has_any(text, ["other", "lain", "dungan", "dunganon", "duha ka scholarship", "multiple", "another"]):
                return "tes_with_other_scholarships"
            if self._has_any(text, ["delay", "dugay", "release", "taking so long", "waiting", "wala pa", "stipend", "money", "allowance"]):
                return "tes_release_delay"
            if self._has_any(text, ["requirement", "requirements", "document", "documents", "rekisitos", "dokumento"]):
                return "tes_requirements"
            if self._has_any(text, ["selection", "select", "selected", "pagpili", "magpili", "chosen", "assessment", "who selects", "how is the selection"]):
                return "tes_grantee_selection_process"
            if self._has_any(text, ["qualified", "qualify", "eligible", "eligibility", "avail", "join", "apil", "valid", "beneficiaries", "kinsay", "who can"]):
                return "tes_qualified_grantees_eligibility"
            if self._has_any(text, ["apply", "application", "unsaon pag apply", "unsaon mani pag apil", "how to apply", "how do i apply"]):
                return "tes_application_process"

        has_dasig = self._has_any(text, ["dasig", "mascot", "spirit animal", "tarsier"])
        if has_dasig:
            return "dasig_spirit_animal_buksu"

        has_mental_health_stress = self._has_any(text, ["stress", "na-stress", "na stress", "mental health", "depress", "depressed", "anxious", "anxiety"])
        if has_mental_health_stress:
            return "student_stress_support"

        has_contact_info = self._has_any(text, ["contact number", "email address", "telephone", "phone number", "contact directory", "contact sa buksu", "email sa buksu"])
        if has_contact_info:
            return "buksu_contact_info"

        has_chatbot_developer = self._has_any(text, [
            "naghimo aning chatbot", "nag himo aning chatbot", "nag-develop", "nag develop",
            "developer sa chatbot", "developers sa chatbot", "who made this bot",
            "who created this chatbot", "who programmed this", "nag create aning chatbot",
            "artificial intelligence chatbot"
        ])
        if has_chatbot_developer:
            return "Bot_creator"

        has_clinic_services = self._has_any(text, ["clinic", "dental", "medical checkup", "checkup", "dentista", "dentist", "medical consult", "dental consult"])
        if has_clinic_services:
            if self._has_any(text, ["dental", "ngipon", "tooth", "teeth", "pasta", "ibot"]):
                return "request_dental_consult"
            if self._has_any(text, ["medical", "checkup", "check up", "doctor", "doktor", "tambal", "medicine"]):
                return "buksu_medical_dental_services"
            return "__clinic_services_menu__"

        has_guidance_query = (
            self._has_any(text, ["guidance counseling", "guidance counselor", "guidance office", "counseling", "counselling", "guidance center"]) or
            (self._has_any(text, ["guidance"]) and not self._has_any(text, ["enroll", "enrollment", "admission", "cat", "exam", "course", "subject", "step", "steps", "procedure"]))
        )
        if has_guidance_query:
            if self._has_any(text, ["fee", "bayad", "tagpila", "pila", "cost", "price", "free", "libre"]):
                return "ask_guidance_fee"
            if self._has_any(text, ["eligible", "eligibility", "who can", "kinsa pwede"]):
                return "ask_guidance_eligibility"
            return "guidance_services"

        has_comlab_query = self._has_any(text, ["computer lab", "computer laboratory", "computer laboratories", "comlab", "com lab", "comlabs"])
        if has_comlab_query:
            return "all_comlab_locations"

        has_pwd_query = self._has_any(text, ["pwd", "disability", "disabled", "special needs", "pwd student", "pwd assistance"])
        if has_pwd_query:
            return "pwd_student_assistance_services"

        has_noon_break_query = (
            self._has_any(text, ["noon break", "lunch break", "no noon break", "udto break", "break sa udto"]) or
            (self._has_any(text, ["noon", "lunch", "udto"]) and self._has_any(text, ["break", "office", "offices", "open", "close", "serbisyo"]))
        )
        if has_noon_break_query:
            return "all_office_schedule"

        has_visitor_query = (
            self._has_any(text, ["visitor", "visitors", "bisita", "outsider", "guest", "mama", "papa", "parent", "parents"]) and
            self._has_any(text, ["enter", "makasulod", "sulod", "allowed", "pwede", "visit", "campus", "gate"])
        )
        if has_visitor_query:
            return "campus_weekend_visitors"

        has_portal_login_query = (
            self._has_any(text, ["portal", "sias", "student portal", "admissions portal"]) and
            self._has_any(text, [
                "cannot login", "can't login", "cant login", "dili maka login", "dili makasulod",
                "login error", "login problem", "account locked", "locked account", "troubleshoot login",
                "forgot my email", "forgot email", "what email do i use to login", "email for sias"
            ]) and
            not has_password_wording
        )
        if has_portal_login_query:
            return "portal_login_problem"

        has_bot_creator_query = (
            self._has_any(text, ["chatbot", "bot", "ai", "system"]) and
            self._has_any(text, ["creator", "creators", "developer", "developers", "who made", "naghimo", "kinsa naghimo", "capstone", "team", "author"])
        )
        if has_bot_creator_query:
            return "Bot_creator"

        has_qualifying_exam_query = (
            self._has_any(text, ["qualifying exam", "qualifying", "qualifying examination"]) and
            self._has_any(text, ["board", "course", "courses", "retention", "program", "bsn", "bsa", "maintain"])
        )
        if has_qualifying_exam_query:
            return "board_course_retention_policy"

        has_comlab_query = self._has_any(text, ["computer lab", "computer laboratory", "computer laboratories", "comlab", "com lab", "comlabs"])
        if has_comlab_query:
            return "all_comlab_locations"

        if has_drop_subject_freshman:
            return "add_drop_subject"
        if has_form138_goodmoral_submission:
            return "freshman_enrollment_process"
        if (
            has_undergraduate_enrollment_requirements or
            self._has_any(text, [
                "undergraduate requirements", "undergraduate requirement",
                "undergraduate enrollment requirements", "undergraduate enrollment requirement",
                "undergrad requirements", "undergrad requirement",
            ]) or
            (has_enrollment and self._has_any(text, ["complete list", "list of requirements", "requirements nga kinahanglan", "documentary requirements", "requirements para enrollment"]))
        ):
            return "freshman_enrollment_process"
        if has_enrollment and self._has_any(text, ["deadline", "kutob", "until when", "last day", "deadline sa submission"]):
            return "enrollment_time_schedule"
        if has_medical_clinic_checkup:
            return "con_nursing_medical_requirements" if has_con_nursing else "medic_clinic"
        if has_enrollment and self._has_any(text, ["online ba tanan", "online ba o", "adto sa campus", "mo-adto sa campus", "onsite"]):
            return "mixed_enrollment_process"
        if has_freshman_enrollment_question:
            return "enrollment_general_process"
        if has_transferee and (has_enrollment or self._has_any(text, ["enroll", "enrol", "delayed"])):
            return "transferee_enrollment"
        if has_cutoff_score or has_cat_score_requirement:
            if self._has_any(text, ["non board", "non-board"]):
                return "non_board_cutoff_score"
            if self._has_any(text, ["board course", "board courses"]):
                return "board_course_cutoff_score"
            return "program_cutoff_scores"
        if (has_pass_notice or has_exam_result) and not has_cat_result_query and not has_medical_clinic_checkup:
            return "exam_results"
        if has_cat_result_query:
            return "cat_exam_result"
        if has_cat_calculator_policy:
            return "buksu_cat_calculator_policy"
        if has_missed_cat_schedule:
            return "missed_buksu_cat_schedule"
        if has_cat_retake_policy:
            return "cat_retake_policy"
        if has_cat_online_vs_walkin:
            return "cat_online_vs_walkin_application"
        if has_reschedule_entrance_exam or has_walkin_exam:
            return "reschedule_entrance_exam"
        # Fix: only trigger exam_requirements if this is NOT a missed-schedule query
        if has_exam_day_requirement_wording and not has_missed_cat_schedule:
            return "exam_requirements"
        if has_second_courser_cat_fee:
            return "second_courser_cat_application"
        if has_exam_fee_query:
            return "exam_fees"
        if has_admission_deadline_query:
            return "admission_application_deadline"
        if has_cat_definition_query:
            return "buksu_cat_definition"
        if has_missing_admission_documents:
            return "missing_admission_documents"
        if has_second_courser and self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "papers", "ipasa", "submit", "need", "needed"]):
            return "second_courser_requirements"
        if has_transferee and (has_enrollment or self._has_any(text, ["enroll", "enrol"])):
            return "transferee_enrollment"
        if has_transferee and self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "papers", "modawat", "accept", "needed", "need", "bring"]):
            return "transferee_admission_requirements"
        if has_freshman and has_admission and self._has_any(text, ["requirement", "requirements", "document", "documents", "needed", "need", "bring", "apply"]):
            return "freshman_admission_requirements"
        if (
            has_book_penalty and
            self._has_any(text, ["book", "books", "library", "book center", "materials"])
        ):
            return "library_late_return_penalty"
        if has_library_entry_query or has_library_resources_query:
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
        if has_admission_application_schedule and not has_missed_cat_schedule:
            return "online_application_schedule"
        if has_cat_retake_policy:
            return "cat_retake_policy"
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
        if has_available_scholarships:
            return "available_scholarships_buksu"
        if has_buksu_general_policy:
            return "buksu_general_policies"

        if has_uniform_policy:
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
        if (has_cat or has_admission) and self._has_any(text, ["requirement", "requirements", "need", "needed", "bring", "document", "documents", "kailangan", "kinahanglan", "gikinahanglan"]):
            if has_exam_day_requirement_wording or self._has_any(text, ["bring", "dad-on", "dad on", "dalhon", "dala", "dal-on", "adlaw"]):
                return "exam_requirements"
            if has_transferee or self._has_any(text, ["transferee", "transferees", "transfer"]):
                return "transferee_admission_requirements"
            if has_second_courser or self._has_any(text, ["second courser", "second course"]):
                return "second_courser_requirements"
            if has_law or self._has_any(text, ["law", "juris doctor"]):
                return "law_admission_requirements"
            if has_gpat or self._has_any(text, ["gpat", "graduate program admission test", "graduate admission test", "graduate admission testing"]):
                return "gpat_admission_requirements"
            if has_masters or self._has_any(text, ["masters", "master", "master's"]):
                return "masters_degree_admission_requirements"
            return "freshman_admission_requirements"
        if has_letter_of_intent or has_admission_first_requirement:
            return "admission_letter_of_intent_meaning"
        if has_admission_certificate_copy:
            return "admission_certificate_photocopy_guidance"
        if has_transfer_acceptance and not has_enrollment:
            return "transferee_enrollment"
        if has_transferee and not has_enrollment and intent in {"ask_availability", "ask_general_info", "ask_process", "ask_requirement"}:
            return "transferee_admission_requirements"
        if not has_id_validation and has_student_id and self._has_any(text, ["unsaon", "how", "process", "picture", "pa-picture", "papicture", "pagkuha", "apply", "kuha", "claim", "get", "pag-process", "pag process"]):
            return "student_id_process"
        if (has_pe_uniform_mention or self._has_any(text, ["pe uniform", "school uniform", "uniform"])) and self._has_any(text, ["palit", "makapalit", "buy", "where to get", "asa dapit", "asa makapalit", "asa makuha", "how to get", "unsaon pagkuha", "request"]):
            return "pe_uniform_process"
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
            # 1. Location intent (Where to validate)
            if self._has_any(text, ["where", "asa", "location", "place", "hain", "diin", "asa dapit", "where do i go", "where can i", "where should i", "which window", "unsa nga window", "asa moadto"]):
                return "cor_validation_location"
            # 2. Schedule / Date intent (When to validate)
            word_tokens = set(re.findall(r"\b[\w'-]+\b", text))
            if bool(word_tokens.intersection({"when", "date", "day", "time", "schedule", "month", "period", "kanus-a", "kanusa"})) or self._has_any(
                text,
                ["validation day", "validation date", "validation schedule", "how long", "kanus-a"],
            ):
                return "cor_validation_day"
            # 3. Process / Steps intent (How to validate)
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
        if has_enrollment and not self._has_any(text, ["payment", "pay", "cashier", "accounting", "lbp", "landbank", "ofbank"]) and (has_enrollment_process or self._has_any(text, ["process", "step", "steps", "step by step", "guide", "how to enroll", "how do i enroll", "unsaon pag enroll", "unsaon pagpa enroll", "paagi sa pag enroll"])):
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
        if has_enrollment and has_validation and not has_cor_validation:
            return "enrollment_validation_payment"
        if has_enrollment and not has_cor_validation and self._has_any(text, ["pay", "payment", "paying", "cashier", "accounting", "lbp", "landbank", "ofbank"]):
            return "enrollment_validation_payment"
        if has_cor and self._has_any(text, ["approval", "approved", "after approval", "incorrect", "error", "errors"]):
            return "enrollment_application_approval"
        if has_cor and self._has_any(text, ["where", "get", "download", "kuha", "makuha", "asa", "unsaon", "how"]):
            return "where_get_cor"
        if has_enrollment_application_approval:
            return "enrollment_application_approval"
        if has_freshman and (has_enrollment_process or has_course_specific_enrollment_help):
            if self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "needed", "kinahanglan", "envelope", "envelopes"]):
                return "freshman_enrollment_process"
            return "enrollment_general_process"
        if has_course_specific_enrollment_help and has_enrollment_process:
            if self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "needed", "kinahanglan", "envelope", "envelopes"]):
                return "freshman_enrollment_process"
            return "enrollment_general_process"
        if has_school_year_class_start:
            return "school_year_class_start_schedule"
        if has_school_year_end:
            return "school_year_end_schedule"
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
        if (has_gpat or self._has_any(text, ["gpat", "graduate program admission test", "graduate admission test", "graduate admission testing"])) and self._has_any(text, ["requirement", "requirements", "admission", "apply", "application", "needed", "documents", "test", "testing", "exam", "fee"]):
            return "gpat_admission_requirements"
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
        if has_clinic or has_dental or has_dental_referral_medicine:
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
            if has_gpat:
                return "gpat_admission_requirements"
            if has_masters:
                return "masters_degree_admission_requirements"
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
                return "exam_requirements" if (has_exam_day_requirement_wording or self._has_any(text, ["bring", "dad-on", "dad on", "dalhon", "dala", "dal-on", "adlaw"])) else "freshman_admission_requirements"
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
            if has_school_year_end:
                return "school_year_end_schedule"
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
            if has_enrollment and has_validation and not has_cor_validation:
                return "enrollment_validation_payment"
            if has_enrollment and not has_cor_validation and self._has_any(text, ["pay", "payment", "paying", "cashier", "accounting", "lbp", "landbank", "ofbank"]):
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
                if self._has_any(text, ["requirement", "requirements", "document", "documents", "papeles", "needed", "kinahanglan", "envelope", "envelopes"]):
                    return "freshman_enrollment_process"
                return "enrollment_general_process"
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
            if has_gpat or self._has_any(text, ["gpat", "graduate program admission test", "graduate admission test", "graduate admission testing"]):
                return "gpat_admission_requirements"
            if has_masters:
                return "masters_degree_admission_requirements"
            if has_law:
                return "law_admission_requirements"
            if has_second_courser:
                return "second_courser_requirements"
            if has_transferee and has_admission:
                return "transferee_admission_requirements"
            if has_freshman and has_admission:
                return "freshman_admission_requirements"
            if has_cat or has_admission:
                return "exam_requirements" if (has_exam_day_requirement_wording or self._has_any(text, ["bring", "dad-on", "dad on", "dalhon", "dala", "dal-on", "adlaw"])) else "freshman_admission_requirements"
            if has_library_id:
                return "library_id_card_requirements"
            if has_student_id:
                return "student_id_requirements"
            if has_admission:
                return "exam_requirements" if (has_exam_day_requirement_wording or self._has_any(text, ["bring", "dad-on", "dad on", "dalhon", "dala", "dal-on", "adlaw"])) else "freshman_admission_requirements"
        if intent == "ask_fee" and (has_gpat or (has_graduate_or_doctor_course and (has_cat or has_admission or has_fee))):
            return "gpat_admission_requirements"
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
            if self._has_any(text, ["scholarship", "sfgu", "financial grant", "financial assistance"]):
                return "contact_scholarship_unit"
            if has_admission:
                return "buksu_admission_contact"
        return None

    def contact_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        detector = getattr(self.data_loader.helper, "detect_language", None)
        lang = str(detector(user_message)) if callable(detector) else "en"
        
        if lang == "ceb":
            text_msg = "Asa nga opisina o unit ang gusto nimong kontakon?"
        else:
            text_msg = "Which office or unit would you like to contact?"

        return self._choice_response(
            text_msg,
            [
                {"label": "Scholarships & Financial Grants (SFGU)", "payload": "/direct_intent{\"intent\":\"contact_scholarship_unit\"}"},
                {"label": "Admissions and Testing Unit (ATU)", "payload": "/direct_intent{\"intent\":\"contact_atu\"}"},
                {"label": "University Registrar", "payload": "/direct_intent{\"intent\":\"contact_registrar\"}"},
                {"label": "BukSU Admissions Office", "payload": "/direct_intent{\"intent\":\"buksu_admission_contact\"}"},
            ],
        )

    def validation_clarification_response(self, intent: str, user_message: str) -> Optional[Dict[str, Any]]:
        text = self.interpreter.normalize(user_message)
        raw_tokens = set(re.findall(r"\b[\w'-]+\b", text))
        if not self._has_any(text, ["validate", "validation"]):
            return None
        if self._has_any(text, ["enrollment", "enroll", "subject", "subjects", "kurso", "course", "courses", "credit", "crediting", "medical", "clinic", "doktor", "doctor", "advising"]):
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
            "list of services",
            "available services",
            "unsa inyong mga serbisyo",
            "mga serbisyo",
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
        if self._has_any(text, generic_service_terms) or (tokens.issubset({"service", "services", "list", "what", "are", "the", "available", "can", "provide", "you", "do", "have", "your"})):
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
                            {"label": "Undergraduate Requirements", "payload": "/direct_intent{\"intent\":\"freshman_enrollment_process\"}"},
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
        if self._has_any(text, ["faculty room", "faculty office", "room", "department", "building", "office", "dapit", "asa", "where"]):
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
                "Which portal or account password do you need help with?",
                [
                    {"label": "Admission Portal Password", "payload": "/direct_intent{\"intent\":\"Change_Pass_admission\"}"},
                    {"label": "SIAS Student Portal Password", "payload": "/direct_intent{\"intent\":\"sias_forgot_password\"}"},
                    {"label": "Institutional Email Account", "payload": "/direct_intent{\"intent\":\"institutional_email_account\"}"},
                ],
            )
        if direct_intent == "__food_tech_lab_clarification__":
            return {
                "text": "There are multiple laboratory locations under Food Technology. Please choose a building below to open all available laboratory rooms:",
                "custom": {
                    "choiceGroups": [
                        {
                            "title": "New COT Building (FoodTech Labs)",
                            "items": [
                                {"label": "FoodTech Laboratory First Floor", "payload": "/direct_intent{\"intent\":\"FoodTech Laboratory First Floor\"}"},
                                {"label": "C-1-2-01 (FoodTech Lab 1)", "payload": "/direct_intent{\"intent\":\"NC1-C-1-2-01\"}"},
                                {"label": "C-1-2-02 (FoodTech Lab 2)", "payload": "/direct_intent{\"intent\":\"NC1-C-1-2-02\"}"},
                                {"label": "C-1-2-03 (FoodTech Lab 3)", "payload": "/direct_intent{\"intent\":\"NC1-C-1-2-03\"}"},
                                {"label": "C-1-2-04 (FoodTech Lab 4)", "payload": "/direct_intent{\"intent\":\"NC1-C-1-2-04\"}"},
                                {"label": "Food Technology Laboratory (2nd Floor)", "payload": "/direct_intent{\"intent\":\"food technology laboratory\"}"},
                                {"label": "Food Tech Faculty Room (3rd Floor)", "payload": "/direct_intent{\"intent\":\"Food Technology Faculty Room\"}"},
                            ]
                        },
                        {
                            "title": "New CAS Building (Labs & Departments)",
                            "items": [
                                {"label": "Microbiology Laboratory (A4-404)", "payload": "/direct_intent{\"intent\":\"Microbiology Laboratory\"}"},
                                {"label": "Biotechnology Laboratory (A4-405)", "payload": "/direct_intent{\"intent\":\"Biotechnology Laboratory\"}"},
                                {"label": "Plant Tissue Culture Lab (3rd Floor)", "payload": "/direct_intent{\"intent\":\"Plant Tissue Culture Laboratory\"}"},
                                {"label": "Kalatungan Learning Space (3rd Floor)", "payload": "/direct_intent{\"intent\":\"Kalatungan Learning Space\"}"},
                                {"label": "Philosophy Faculty Office (2nd Floor)", "payload": "/direct_intent{\"intent\":\"Philosophy Faculty Office\"}"},
                                {"label": "Sociology Department (2nd Floor)", "payload": "/direct_intent{\"intent\":\"Sociology Department\"}"},
                                {"label": "Economics Department (2nd Floor)", "payload": "/direct_intent{\"intent\":\"Economics Department\"}"},
                                {"label": "ODeL Office (1st Floor)", "payload": "/direct_intent{\"intent\":\"ODeL Office\"}"},
                                {"label": "Language & Literature / DDL (1st Floor)", "payload": "/direct_intent{\"intent\":\"language and literature department\"}"},
                            ]
                        }
                    ]
                }
            }
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
        if direct_intent:
            self.last_selected_intent = direct_intent
        if direct_intent == "__clinic_services_menu__":
            return self._clinic_services_menu()
        if direct_intent == "__dormitory_services_menu__":
            return self._dormitory_services_menu()
        if direct_intent == "__classroom_policy_menu__":
            return self._classroom_policy_menu()
        if direct_intent == "__contact_clarification__":
            return self.contact_clarification_response(intent, user_message) or self.data_loader.fallback()
        if direct_intent == "__private_student_records_guardrail__":
            lang = self.data_loader.helper.detect_language(user_message) if self.data_loader.helper else "en"
            if lang == "ceb":
                return {
                    "text": "Usa lamang ako ka automated information assistant ug **dili ako maka-access sa imong personal nga student records, grado, GPA, o account balance**.\n\nPalihog pag-log in sa imong opisyal nga **BukSU SIAS Portal** sa: https://sias.buksu.edu.ph/sias/ aron makita ang imong opisyal nga mga grado ug financial ledger, o bisitaha ang Accounting Office sa Finance Building."
                }
            return {
                "text": "I am an automated informational assistant and **cannot access your private student records, grades, GPA, or tuition balance**.\n\nPlease log in to your official **BukSU SIAS Portal** at: https://sias.buksu.edu.ph/sias/ to view your official grades and financial ledger, or visit the Accounting Office in the Finance Building."
            }
        if direct_intent == "__out_of_scope_guardrail__":
            lang = self.data_loader.helper.detect_language(user_message) if self.data_loader.helper else "en"
            if lang == "ceb":
                return {
                    "text": "Pasensya, ang maong pangutana naa sa gawas sa akong sakop. Ako usa ka BukSU campus assistant nga gitagana alang sa mga academic policies, admissions, enrollment procedures, campus facilities, ug student services sulod sa Bukidnon State University."
                }
            return {
                "text": "I apologize, but that inquiry is outside the scope of this campus chatbot. I am specialized in providing information regarding BukSU academic policies, admissions, enrollment procedures, campus facilities, and student services within Bukidnon State University."
            }
        if direct_intent:
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

        # Issue 1 Fix: Only bypass LLM when RASA is high confidence AND the margin
        # over the runner-up is clearly unambiguous (>= 8 pts). Narrow margins go to LLM.
        margin = retrieval_result.score - retrieval_result.runner_up_score
        strong_high = retrieval_result.is_high_confidence and (
            not retrieval_result.runner_up or margin >= 8.0
        )
        if strong_high and retrieval_result.intent:
            print(f"[RASA NLU - HIGH CONFIDENCE] Query: '{user_message}' -> Score: {retrieval_result.score:.2f} (margin={margin:.1f}) -> Intent: '{retrieval_result.intent}' (RASA took over)")
            self.last_selected_intent = retrieval_result.intent
            self.last_answering_source = "RASA (High Confidence NLU)"
            return self.data_loader.get_response(retrieval_result.intent, user_message=user_message, domain=active_domain)

        # Issue 2 Fix: Pass active_domain so LLM cache key is domain-scoped
        llm_candidate = self.llm_reranker.choose(user_message, retrieval_result, domain=active_domain)
        if not llm_candidate and not retrieval_result.ranked_candidates and active_domain:
            domain_candidates = self.retrieval_scorer.index.candidates_for_domain(active_domain)
            if domain_candidates:
                from retrieval_result import RetrievalResult
                query_tokens = set(self.interpreter.tokens(user_message))
                scored_domain = []
                for cand in domain_candidates:
                    tok_overlap = len(query_tokens.intersection(set(cand.tokens)))
                    scored_domain.append((tok_overlap, cand))
                scored_domain.sort(key=lambda x: x[0], reverse=True)
                fallback_result = RetrievalResult(
                    candidate=scored_domain[0][1] if scored_domain else None,
                    score=10.0,
                    confidence="low",
                    ranked_candidates=[(cand, float(sc)) for sc, cand in scored_domain[:10]],
                )
                llm_candidate = self.llm_reranker.choose(user_message, fallback_result, domain=active_domain)

        if llm_candidate:
            print(f"[LLM MATCH - TAKEOVER] Query: '{user_message}' -> Selected: '{llm_candidate.intent}' (LLM took over)")
            self.last_selected_intent = llm_candidate.intent
            self.last_answering_source = "LLM (Reranker)"
            return self.data_loader.get_response(llm_candidate.intent, user_message=user_message, domain=active_domain)

        if retrieval_result.is_medium_confidence and retrieval_result.intent and not retrieval_result.runner_up:
            print(f"[RASA NLU - MEDIUM CONFIDENCE] Query: '{user_message}' -> Score: {retrieval_result.score:.2f} -> Intent: '{retrieval_result.intent}' (RASA took over)")
            self.last_selected_intent = retrieval_result.intent
            self.last_answering_source = "RASA (Medium Confidence NLU)"
            return self.data_loader.get_response(retrieval_result.intent, user_message=user_message, domain=active_domain)

        if retrieval_result.is_medium_confidence:
            print(f"[ROUTER - CLARIFICATION] Query: '{user_message}' -> Presenting disambiguation buttons")
            self.last_selected_intent = "__clarification__"
            self.last_answering_source = "RASA (Disambiguation)"
            return self.retrieval_scorer.clarification(retrieval_result)

        print(f"[ROUTER - DOMAIN FALLBACK] Query: '{user_message}' -> Domain fallback for '{active_domain}'")
        self.last_selected_intent = None
        self.last_answering_source = "Failed (Domain Fallback)"
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
        if self._has_any(text, [
            "shift", "shifting", "mag-shift", "mag shift", "change course", "change my course",
            "change my program", "change program", "transfer program", "transfer to a different program",
            "mag-ilis og kurso", "mag-ilis ug kurso", "pag-shift", "shift ug course", "shift og course",
            "shift to another", "shift to a different", "shift to a board", "shift padulong", "shifting request"
        ]):
            return "course_shifting"

        if self._has_any(text, ["master", "masters", "masteral", "graduate program", "doctor of medicine", "medicine course", "medicine program"]):
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
        if self._has_any(text, ["prerequisite", "prerequisites", "prerequisit", "prereq", "pre requisite", "pre-requisite"]):
            if self._has_any(text, ["fail", "failed", "failing", "bagsak", "hagbong", "retake", "advance", "dependent", "take again"]):
                return "failed_prerequisite_subject"
            return "prerequisite_subjects_purpose"
        is_loc_query = self._has_any(text, ["where", "location", "located", "find", "office", "faculty", "room", "building", "asa", "hain", "diin", "dapit", "makita", "locate"])
        if self._has_any(text, ["nstp"]) and not is_loc_query:
            return "about_nstp"
        if self._has_any(text, ["rotc"]) and not is_loc_query:
            return "rotc_meaning"
        if (self._has_any_token(text, ["pe"]) or self._has_any(text, ["physical education"])) and not is_loc_query:
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
