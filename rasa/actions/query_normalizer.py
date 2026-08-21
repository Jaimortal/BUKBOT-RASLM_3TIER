import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Set


class QueryNormalizer:
    """Adds controlled English concepts for typos, Bisaya roots, and aliases.

    This is intentionally not a general grammar corrector or translator. It
    only expands known school-domain words so retrieval can match messy user
    input without overcorrecting unrelated text.
    """

    PHRASE_CONCEPTS: Dict[str, str] = {
        # English typos and variants
        "transfered student": "transferee transfer student",
        "transfered students": "transferee transfer students",
        "transferred student": "transferee transfer student",
        "transferred students": "transferee transfer students",
        "transfer student": "transferee transfer student",
        "transfer students": "transferee transfer students",
        "enrolment": "enrollment",
        "enrollmen": "enrollment",
        "enrollmnt": "enrollment",
        "enrolmen": "enrollment",
        "enrolmnt": "enrollment",
        "late enrol": "late enrollment",
        "late enrolment": "late enrollment",
        "is late enrol allowed": "late enrollment allowed",
        "examinaton": "examination",
        "lagin": "login",
        "sign in": "login sign in",
        "signin": "login sign in",
        "sign-in": "login sign in",
        "faild": "failed",
        "faild to pass": "failed to pass did not pass",
        "didnt": "did not",
        "didn't": "did not",
        "dident": "did not",
        "didnot": "did not",
        "non passer": "non passer did not pass failed applicant",
        "non passers": "non passer did not pass failed applicants",
        "non-passer": "non passer did not pass failed applicant",
        "non-passers": "non passer did not pass failed applicants",
        "nonpasser": "non passer did not pass failed applicant",
        "nonpassers": "non passer did not pass failed applicants",
        "wakapasar": "wala kapasar did not pass",
        "wa kapasar": "wala kapasar did not pass",
        "wa ko kapasar": "wala ko kapasar did not pass",
        "wa mopasar": "wala kapasar did not pass",
        "wa mo pasar": "wala kapasar did not pass",
        "wala mopasar": "wala kapasar did not pass",
        "wala mo pasar": "wala kapasar did not pass",
        "wala nakaabot": "did not meet did not reach below",
        "wala kaabot": "did not meet did not reach below",
        "wala nakaabot sa cutoff": "did not meet cutoff score below cutoff",
        "wala nakaabot sa cut off": "did not meet cutoff score below cutoff",
        "acess":"access",
        "student portal": "student portal student website",
        "poral": "portal",
        "admission portal": "admission portal admission website",
        "admission website": "admission portal admission website",
        "sias portal": "sias portal sias website student information system",
        "sias website": "sias portal sias website student information system",
        "admisson": "admission",
        "admissons": "admissions",
        "college admisson test": "college admission test buksu cat",
        "entrance exam": "entrance exam admission exam buksu cat",
        "entrance examination": "entrance examination admission examination buksu cat",
        "buksu entrance exam": "buksu entrance exam buksu cat admission exam",
        "buksu entrance examination": "buksu entrance examination buksu cat admission examination",
        "admission entrance exam": "admission entrance exam buksu cat",
        "admission entrance examination": "admission entrance examination buksu cat",
        "failed to pass admission examination": "failed did not pass admission examination buksu cat",
        "failed to pass the admission examination": "failed did not pass admission examination buksu cat",
        "faild to pass admission examination": "failed did not pass admission examination buksu cat",
        "faild to pass the admission examination": "failed did not pass admission examination buksu cat",
        "failed to pass entrance exam": "failed did not pass entrance exam admission exam buksu cat",
        "faild to pass entrance exam": "failed did not pass entrance exam admission exam buksu cat",
        "faild to pass the entrance exam": "failed did not pass entrance exam admission exam buksu cat",
        "did not pass the entrance exam": "did not pass entrance exam admission exam buksu cat",
        "did not pass entrance exam": "did not pass entrance exam admission exam buksu cat",
        "did not pass the cat score": "did not pass cat score buksu cat cutoff score",
        "did not pass cat score": "did not pass cat score buksu cat cutoff score",
        "admision": "admission",
        "admissiont": "admission",
        "admittion": "admission",
        "admition": "admission",
        "validaton": "validation",
        "vallidate": "validate validation",
        "vallidation": "validation",
        "validte": "validate validation",
        "validtion": "validation",
        "avalilable": "available availability",
        "avaliable": "available availability",
        "availble": "available availability",
        "libary": "library",
        "libary id": "library id library card",
        "libary card": "library id library card",
        "school id": "student id school id",
        "valid id": "student id school id id validation",
        "id validation": "student id school id id validation",
        "no id": "without student id no student id",
        "no student id": "without student id no student id",
        "even no id": "even without student id no student id",
        "without id": "without student id no student id",
        "without student id": "without student id no student id",
        "dont have my id": "without student id no student id",
        "don't have my id": "without student id no student id",
        "do not have my id": "without student id no student id",
        "physical id": "physical student id",
        "nabilin akong id": "forgot left student id",
        "nabilin akong student id": "forgot left student id",
        "way id": "without student id no student id",
        "walay id": "without student id no student id",
        "biskan way id": "even without student id no student id",
        "bisan way id": "even without student id no student id",
        "wakoy id": "without student id no student id",
        "wa koy id": "without student id no student id",
        "wala koy id": "without student id no student id",
        "wakoy student id": "without student id no student id",
        "wa koy student id": "without student id no student id",
        "wala koy student id": "without student id no student id",
        "wala pakoy id": "without student id no student id",
        "wala pa koy id": "without student id no student id",
        "wala pakoy student id": "without student id no student id",
        "wala pa koy student id": "without student id no student id",
        "walay student id": "without student id no student id",
        "library card": "library id library card",
        "library id card": "library id library card",
        "certificate of registration": "cor certificate of registration",
        "cor validation": "cor validation certificate of registration",
        "exam permit": "test permit exam permit",
        "test permit": "test permit exam permit",
        "good moral": "good moral certificate",
        "good moral certificate": "good moral certificate",
        "medical cert": "medical certificate clinic certificate",
        "medical certificate": "medical certificate clinic certificate",
        "dental oral exam": "dental oral examination",
        "dental oral examination": "dental oral examination",
        "use civilian": "civilian attire uniform policy wear",
        "wear civilian": "civilian attire uniform policy wear",
        "allowed to use civilian": "civilian attire uniform policy wear allowed",
        "allowed to wear civilian": "civilian attire uniform policy wear allowed",
        "civilian clothes": "civilian attire plain clothes uniform policy wear",
        "plain clothes": "civilian attire plain clothes uniform policy wear",
        "regular clothes": "civilian attire plain clothes uniform policy wear",
        "no uniform": "without uniform civilian attire uniform policy",
        "not wearing uniform": "without uniform civilian attire uniform policy",
        "without uniform": "without uniform civilian attire uniform policy",
        "inter school": "enter school campus",
        "inter inside": "enter inside campus",
        "pe uniform": "pe uniform physical education uniform",
        "pe unifrom": "pe uniform physical education uniform",
        "uniform pe": "pe uniform physical education uniform",
        "unifrom pe": "pe uniform physical education uniform",
        "buksu pe uniform": "pe uniform physical education uniform",
        "buksu uniform pe": "pe uniform physical education uniform",
        "old pe uniform": "old pe uniform daan nga pe attire allowed",
        "old pe unifrom": "old pe uniform daan nga pe attire allowed",
        "old uniform pe": "old pe uniform daan nga pe attire allowed",
        "old pe": "old pe uniform daan nga pe attire allowed",
        "daan nga pe": "old pe uniform daan nga pe attire allowed",
        "daan na pe": "old pe uniform daan na pe attire allowed",
        "daan pe": "old pe uniform daan pe attire allowed",
        "physical education uniform": "pe uniform physical education uniform",
        "cut off score": "cutoff score cat score program qualification score",
        "cut off scores": "cutoff score cat score program qualification score",
        "cut-off score": "cutoff score cat score program qualification score",
        "cut-off scores": "cutoff score cat score program qualification score",
        "passing score": "cutoff score cat score program qualification score",
        "requirment": "requirement requirements documents need",
        "requirments": "requirements documents need",
        "masteral": "masters graduate program",
        "cources offered": "courses offered programs",
        "cources offerd": "courses offered programs",
        "unsay course na available": "what courses available offered",
        "unsay courses na available": "what courses available offered",
        "unsay course available": "what courses available offered",
        "unsay courses available": "what courses available offered",
        "course na avalilable": "course available",
        "course nga avalilable": "course available",
        "course na available diris buksu pwedi nako ma sudlan": "what courses available offered",
        "course pwedi ma enrollan": "what courses available offered",
        "course pwede ma enrollan": "what courses available offered",
        "course diris buksu na pwedi nako enrollan": "what courses available offered",
        "course diris buksu na pwede nako enrollan": "what courses available offered",
        "unsa may mga course": "what courses available offered",
        "unsay mga course": "what courses available offered",
        "pwedi ko mangutanag unsa nga course": "what courses available offered",
        "pwede ko mangutanag unsa nga course": "what courses available offered",
        "sched of": "schedule of",
        "fresh student": "new student freshman first year",
        "first incoming first year": "incoming first year freshman",
        "help me enroll": "help me enroll enrollment process guide",
        "help me to enroll": "help me enroll enrollment process guide",
        "help me for my enrollment": "help me enroll enrollment process guide",
        "help with my enrollment": "help me enroll enrollment process guide",
        "help for enrollment": "help me enroll enrollment process guide",
        "enrollment guide": "enrollment process guide steps",
        "philosopy": "philosophy ba philo",
        "agri business": "agri-business agriculture business",
        "agri-business": "agri-business agriculture business",
        # Course acronyms and compact student wording
        "information tech": "bsit information technology",
        "ba philo": "ab philo ba philosophy bachelor of arts philosophy",
        "ab philo": "ab philo ba philosophy bachelor of arts philosophy",
        "ba philosophy": "ab philo ba philosophy bachelor of arts philosophy",
        "ab philosophy": "ab philo ba philosophy bachelor of arts philosophy",
        "bs accountancy": "bsa accountancy",
        "automotive technology": "bsat automotive technology",
        "electronic technology": "bset electronics technology",
        "electronics technology": "bset electronics technology",
        "hospitality management": "bshm hospitality management",
        "graduate studies": "masters graduate program",
        # Common mixed-language student wording
        "balhin student": "transferee transfer student",
        "balhin nga student": "transferee transfer student",
        "mobalhin nga student": "transferee transfer student",
        "mubalhin nga student": "transferee transfer student",
        "gapamalhin ko": "transferee transfer student",
        "mamalhinay ko": "transferee transfer student",
        "mobalhin unta": "transferee transfer student",
        "mubalhin unta": "transferee transfer student",
        "dawaton ba": "accept availability",
        "resulta sa exam": "exam result results",
        "resulta sa examination": "exam result results",
        "resulta sa admission": "admission exam result results",
        "asa makita akong result": "where view check exam result",
        "aha makita akong result": "where view check exam result",
        "aha manako na makita akong result": "where view check exam result",
        "asa nako makita akong result": "where view check exam result",
        "asa dapit": "where location find",
        "asa makita": "where location find",
        "asa makit-an": "where location find",
        "hain dapit": "where location find",
        "diin dapit": "where location find",
        "location of": "where location find",
        "locate": "where location find",
        "dad on": "requirements documents need bring",
        "dad-on": "requirements documents need bring",
        "o v p c a s": "ovpcasss osas student services",
        "o v p c a s s s": "ovpcasss osas student services",
    }

    TOKEN_CONCEPTS: Dict[str, str] = {
        # Bisaya intent words
        "asa": "where location find",
        "aha": "where location find",
        "hain": "where location find",
        "diin": "where location find",
        "unsa": "what information",
        "unsay": "what information",
        "unsaon": "how process steps",
        "unsaonon": "how process steps",
        "giunsa": "how process steps",
        "gunsa": "how process steps",
        "kanus": "when schedule date",
        "kanusa": "when schedule date",
        "kanus-a": "when schedule date",
        "kinsa": "who person",
        "pila": "fee payment cost how much",
        "tagpila": "fee payment cost how much",
        "bayad": "fee payment cost",
        "bayranan": "fee payment cost",
        "mubayad": "fee payment cost pay",
        "kinahanglan": "requirements documents need bring",
        "kailangan": "requirements documents need bring",
        "dad-on": "requirements documents need bring",
        "dad": "requirements documents need bring",
        "dalhon": "requirements documents need bring",
        "dala": "requirements documents need bring",
        "dadon": "requirements documents need bring",
        "dokumento": "documents requirements",
        "dokomento": "documents requirements",
        "documento": "documents requirements",
        "papeles": "documents requirements",
        "cert": "certificate",
        "kuha": "get process request",
        "makuha": "get where location process",
        "makita": "find where location",
        "makit-an": "find where location",
        "lantaw": "view check see",
        "lantaws": "view check see",
        "tanaw": "view check see",
        "tan-aw": "view check see",
        "resulta": "result results",
        "modawat": "accept availability",
        "mudawat": "accept availability",
        "dawat": "accept availability",
        "gadawat": "accept availability",
        "dawaton": "accept allowed",
        "madawat": "accept availability",
        "naa": "available availability offer have",
        "moy": "you have offer",
        # English normalized concepts
        "id": "id",
        "cor": "cor certificate registration",
        "portal": "portal website",
        "website": "website portal",
        "ovpcasss": "ovpcasss osas student services",
        "ovpcas": "ovpcasss osas student services",
        "osas": "osas ovpcasss student services",
        "cpag": "cpag college public administration governance",
        "cot": "cot college technologies technology",
        "cas": "cas college arts sciences",
        "cob": "cob college business",
        "coe": "coe college education",
        "con": "con college nursing",
        "coa": "cpag college public administration governance",
        "civilian": "civilian attire uniform policy wear",
        "plain": "plain clothes civilian attire",
        "inter": "enter",
        "bsit": "bsit information technology",
        "bsa": "bsa accountancy",
        "bsat": "bsat automotive technology",
        "bset": "bset electronics technology",
        "bsn": "bsn nursing",
        "bshm": "bshm hospitality management",
        "transfered": "transferee transfer",
        "transferred": "transferee transfer",
        "transferee": "transferee transfer student",
        "transferees": "transferee transfer students",
        "admisson": "admission",
        "enrolment": "enrollment",
        "enrollmen": "enrollment enroll",
        "enrollmnt": "enrollment enroll",
        "enrolmen": "enrollment enroll",
        "enrolmnt": "enrollment enroll",
        "validaton": "validation",
        "libary": "library",
        "requirment": "requirement requirements documents need",
        "requirments": "requirements documents need",
        "cource": "course program",
        "cources": "courses course programs",
        "offerd": "offered availability",
        "sched": "schedule when date",
        "sked": "schedule when date",
        "admittion": "admission",
        "admition": "admission",
        "enrollment": "enrollment enroll",
        "enrolment": "enrollment enroll",
    }

    ROOT_CONCEPTS: Dict[str, str] = {
        # Root matching handles messy Bisaya forms:
        # mobalhin, mubalhin, gabalhin, gapamalhin, mamalhinay, pagbalhin.
        "balhin": "transferee transfer student",
        "malhin": "transferee transfer student",
        "pamalhin": "transferee transfer student",
        "dawat": "accept availability",
        "dawaton": "accept availability",
        "gidawat": "accept availability",
        "madawat": "accept availability",
        "dawata": "accept availability",
        "kuha": "get process request",
        "kuhaa": "get process request",
        "pagkuha": "get process request",
        "bayad": "fee payment cost",
        "bayran": "fee payment cost",
        "bayaran": "fee payment cost",
        "kinahanglan": "requirements documents need",
        "kinahanglang": "requirements documents need",
        "kinahangln": "requirements documents need",
        "dokumento": "documents requirements",
        "dokomento": "documents requirements",
        "documento": "documents requirements",
        "papel": "documents requirements",
        "valid": "validation validate",
        "enroll": "enrollment enroll",
        "admission": "admission application",
    }

    FUZZY_ROOTS: Dict[str, str] = {
        "transferee": "transferee transfer student",
        "admission": "admission application",
        "enrollment": "enrollment enroll",
        "validation": "validation validate",
        "library": "library",
        "requirements": "requirements documents need",
    }

    ADMIN_RULE_TYPES = {
        "phrases": "phrase_concepts",
        "tokens": "token_concepts",
        "roots": "root_concepts",
        "fuzzy_roots": "fuzzy_roots",
    }

    BLOCKED_ADMIN_KEYS = {
        "a", "an", "and", "ang", "are", "at", "by", "course", "courses",
        "for", "go", "id", "in", "is", "mga", "of", "office", "on",
        "or", "pay", "program", "programs", "sa", "school", "student",
        "the", "to", "what", "when", "where", "who",
    }

    def __init__(self, rules_path: Optional[Path] = None):
        self.rules_path = rules_path or Path(__file__).with_name("normalization_rules.json")
        self.phrase_concepts = dict(self.PHRASE_CONCEPTS)
        self.token_concepts = dict(self.TOKEN_CONCEPTS)
        self.root_concepts = dict(self.ROOT_CONCEPTS)
        self.fuzzy_roots = dict(self.FUZZY_ROOTS)
        self.load_admin_rules()

    def normalize_basic(self, text: str) -> str:
        text = str(text or "").lower()
        text = re.sub(r"[^\w\s?'-]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    def load_admin_rules(self) -> None:
        """Merge optional admin-maintained rules from normalization_rules.json.

        The file is intentionally additive and defensive. Invalid entries are
        ignored so one bad admin rule cannot stop the action server.
        """
        if not self.rules_path.exists():
            return

        try:
            data = json.loads(self.rules_path.read_text(encoding="utf-8"))
        except Exception:
            return

        if not isinstance(data, dict):
            return

        for source_key, target_attr in self.ADMIN_RULE_TYPES.items():
            raw_rules = data.get(source_key, {})
            if not isinstance(raw_rules, dict):
                continue

            target = getattr(self, target_attr)
            for raw_key, raw_value in raw_rules.items():
                key = self._normalize_admin_key(raw_key)
                value = self._normalize_admin_value(raw_value)
                if not key or not value:
                    continue
                if source_key != "phrases" and key in self.BLOCKED_ADMIN_KEYS:
                    continue
                if source_key == "fuzzy_roots" and len(key) < 5:
                    continue
                target[key] = value

    def _normalize_admin_key(self, value: Any) -> str:
        normalized = self.normalize_basic(str(value or ""))
        if not normalized or len(normalized) > 80:
            return ""
        return normalized

    def _normalize_admin_value(self, value: Any) -> str:
        normalized = self.normalize_basic(str(value or ""))
        if not normalized or len(normalized) > 160:
            return ""
        return normalized

    def expand(self, text: str) -> str:
        normalized = self.normalize_basic(text)
        if not normalized:
            return ""

        concepts: List[str] = []
        seen: Set[str] = set()

        def add(value: str) -> None:
            value = self.normalize_basic(value)
            if value and value not in seen:
                concepts.append(value)
                seen.add(value)

        for phrase, concept in self.phrase_concepts.items():
            if re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", normalized):
                add(concept)

        tokens = re.findall(r"\b[\w'-]+\b", normalized)
        for token in tokens:
            if token in self.token_concepts:
                add(self.token_concepts[token])

            for root, concept in self.root_concepts.items():
                if root in token:
                    add(concept)

            fuzzy_concept = self._fuzzy_concept(token)
            if fuzzy_concept:
                add(fuzzy_concept)

        if not concepts:
            return normalized
        return f"{normalized} {' '.join(concepts)}"

    def _fuzzy_concept(self, token: str) -> str:
        if len(token) < 5:
            return ""
        for root, concept in self.fuzzy_roots.items():
            if abs(len(token) - len(root)) > 3:
                continue
            if SequenceMatcher(None, token, root).ratio() >= 0.82:
                return concept
        return ""
