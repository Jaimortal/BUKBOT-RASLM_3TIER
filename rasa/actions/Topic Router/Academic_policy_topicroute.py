# Academic Policy topic patterns for detecting specific academic policy questions
ACADEMIC_POLICY_TOPIC_PATTERNS = {
    "failed_subject_policy": {
        "phrases": [
            "fail subject policy",
            "failed subject retake",
            "consequences failing subject",
            "nabagsak subject",
            "retake nabagsak",
            "multiple failures subject"
        ],
        "strong_keywords": 
        [
            "failed subject", "fail subject", "nabagsak subject", "retake", "failed", "subject",
            "multiple", "subjects", "nabagsak"
        ],
        "weak_keywords": ["retake", "consequences", "multiple", "policy", "same", "what", "retake", "balikon", "mabagsak"],
        "required_context": []
    },
    "deans_list": {
        "phrases": [
            "deans list requirements",
            "qualify deans list",
            "deans list GWA",
            "deans honor list",
            "maka deans list"
        ],
        "strong_keywords": ["deans list", "dean", "list" "dean's"  ],
        "weak_keywords": 
        [
            "qualify", "requirements", "GWA", "maka", "qualify", "qualified", "for", "what", 
            "GWA", "GPA", "Grades", "grade", "honor", "unsaon", "maapil", "ma", "apil"
        ],
        "required_context": []
    },
    "academic_probation": {
        "phrases": [
            "academic probation",
            "probation status",
            "low performance probation",
            "academic probation policy",
            "ma academic probation"
        ],
        "strong_keywords": ["academic probation", "probation status", "probation", "probe", "academic"],
        "weak_keywords": ["low", "performance", "policy", "mean", "meaning", "explain", "what", "of", "pasabot", "unsay"],
        "required_context": []
    },
    "buksu_grading_system": {
        "phrases": [
            "buksu grading system",
            "grading scale",
            "grade meaning",
            "what is the grading system of buksu",
            "grading mechanism"
        ],
        "strong_keywords": ["grading system", "buksu grading", "grading", "system", "explain", "grade" "is"],
        "weak_keywords": ["scale", "meaning", "1.0", "INC", "what", "buksu" "mechanism"],
        "required_context": []
    },
    "inc_grade_solution": {
        "phrases": [
            "complete INC grade",
            "INC form process",
            "solve INC grade",
            "INC requirements",
            "pag complete INC"
        ],
        "strong_keywords": ["inc", "should", "help", "inc", "solve", "steps", "complete", "process", "steps"],
        "weak_keywords": ["complete", "solve", "requirements", "grade", "i", "do", "what"],
        "required_context": []
    },
    "inc_grade_consequences": {
        "phrases": [
            "INC grade consequences",
            "not complete INC",
            "INC deadline miss",
            "INC block enrollment",
            "dili ma completo INC"
        ],
        "strong_keywords": ["INC", "consequences", "happened", "happen", "fail", "complete", "inc" "completing"],
        "weak_keywords": ["deadline", "block", "miss", "dili", "failed", "not complete" "grade"],
        "required_context": []
    },
    "fda_meaning": {
        "phrases": [
            "FDA meaning",
            "FDA absences",
            "failure due absences",
            "FDA grade explanation",
            "FDA absence count"
        ],
        "strong_keywords": ["fda", "meaning", "mean", "absences", "given", "absence"],
        "weak_keywords": ["fda", "absences", "failure", "due", "get"],
        "required_context": []
    },
    "fda_solution": {
        "phrases": [
            "FDA next steps",
            "after FDA grade",
            "what do FDA",
            "FDA actions",
            "nakadawat FDA"
        ],
        "strong_keywords": ["fda", "should", "buhaton", "sulotion", "do", "need", "should i", "unsay buhaton", "process"],
        "weak_keywords": ["fda", "after", "next", "steps", "what", "unsa", "buhaton", "process", "could", "how"],
        "required_context": []
    },
    "overload_units_policy": {
        "phrases": [
            "overload units",
            "more units policy",
            "maximum units load",
            "sobra units",
            "pwede daghang units"
        ],
        "strong_keywords": 
        [
            "units", "regular", "load", "mag overload", "policy"
        ],
        "weak_keywords": 
        [
            "maximum", "sobra", "pwede", "add", "load", "more", "daghang", "pwede", "sobra", "allowed"
        ],
        "required_context": []
    },
    "subject_overload": {
        "phrases": [
            "subject overloading",
            "subject overload meaning",
            "pag overload subjects",
            "subject overload pasabot"
        ],
        "strong_keywords": ["subject", "overload", "overloading", "loaded"],
        "weak_keywords": ["meaning", "pag", "pasabot", "purpose", "reason", "main", "more"],
        "required_context": []
    },
    "attendance_requirement": {
        "phrases": [
            "attendance policy",
            "attendance important",
            "sign attendance",
            "attendance sheet",
            "pwede absent"
        ],
        "strong_keywords": ["attendance policy", "attendance"],
        "weak_keywords": ["sheet", "sign", "important" "required", "need", "kinahanglan", ],
        "required_context": []
    },
    "thesis_defense_failure": {
        "phrases": [
            "thesis defense fail",
            "failed thesis defense",
            "mabagsak thesis",
            "thesis defense consequences",
            "defense failure"
        ],
        "strong_keywords": ["thesis", "capstone", "research", "defense", "failed", "mabagsak", "failing"],
        "weak_keywords": ["fail", "mabagsak", "failure", "consequences", "mahitabo", "happened"],
        "required_context": []
    },
    "thesis_topic_selection": {
        "phrases": [
            "thesis topic propose",
            "thesis title choose",
            "propose thesis topic",
            "thesis title selection",
            "thesis topic process"
        ],
        "strong_keywords": ["topic", "thesis", "capstone", "research", "title", "own"],
        "weak_keywords": ["propose", "choose", "my" "akoang", "akoa"],
        "required_context": []
    },

    "College_Honors_gpa": {
        "phrases": [
            "college honors GWA",
            "college honor grades",
            "college honors requirements",
            "college honor list"
        ],
        "strong_keywords": ["college", "honors", "honor", "list" ],
        "weak_keywords": 
        [
           "qualify", "requirements", "GWA", "maka", "qualify", "qualified", "for", "what", 
            "GWA", "GPA", "Grades", "grade", "honor", "unsaon", "maapil", "ma", "apil"
        ],
        "required_context": []
    },
    "University_Scholar_gpa": {
        "phrases": [
            "university scholar GWA",
            "university scholar grades",
            "university scholar requirements",
            "university scholar qualify"
            "what grades do i need to achive to be qualified as a university scholar in buksu"
        ],
        "strong_keywords": ["university", "scholar", "honors", "honor", "list"],
        "weak_keywords": 
        [
            "qualify", "requirements", "GWA", "maka", "qualify", "qualified", "for", "what", 
            "GWA", "GPA", "Grades", "grade", "honor", "unsaon", "maapil", "ma", "apil"
        ],
        "required_context": []
    },
    "registrar_office_schedule": {
        "phrases": [
            "office hours",
            "what time does the registrar office open in buksu"
            "registrar schedule",
            "office open time",
            "oras opisina",
            "registrar open"
        ],
        "strong_keywords": ["office", "oras", "hours", "open", "closed", "close", ],
        "weak_keywords": ["registrar", "open", "schedule", "registrar", "time"],
        "required_context": []
    },
    "add_drop_subject": {
        "phrases": [
            "add drop subject",
            "add subject period",
            "drop subject deadline",
            "pwedi add drop",
            "last day add drop"
            "how to add a subject for this semester"
        ],
        "strong_keywords": 
        [
            "add", "drop", "adding", "dropping", "dungag", "kulang", "pag drop", "pag add",
        ],
        "weak_keywords": 
        [
            "subject", "period", "deadline", "semester", "unsaon", "pag", "pamaagi",
        ],
        "required_context": []
    },
    "request_cor": {
        "phrases": [
            "request COR",
            "certificate registration",
            "get COR copy",
            "pag request COR",
            "kuha COR"
            "where can i request a copy of my cor "
        ],
        "strong_keywords": ["COR", "certificate registration", "certificate of registration", "cor", ],
        "weak_keywords": ["get", "copy", "kuha", "request", "process", "pag"],
        "required_context": []
    },
    "withdraw_enrollment_policy": {
        "phrases": [
            "withdraw enrollment",
            "withdrawal form",
            "official withdrawal",
            "pag withdraw enrollment",
            "enrollment withdrawal",
            "How can i process some withdraw enrollment",
            "Where to submit Withdrawal Form",
            "When to file withdrawal form"
        ],
        "strong_keywords": ["withdraw enrollment", "withdrawal form", "withdrawal", "withdraw", "withdrawing"],
        "weak_keywords": ["official", "policy", "process", "procedure", "file"],
        "required_context": []
    },
    "thesis_defense_panelists": {
        "phrases": [
            "thesis panelist",
            "number of panelists",
            "defense panelists",
            "pila ka panelist"
        ],
        "strong_keywords": ["panelist", "panelists", "panel"],
        "weak_keywords": ["thesis", "defense", "number", "pila", "kabuok", "how many", "research", "capstone"],
        "required_context": []
    },
    "end_of_semester": {
        "phrases": [
            "end of semester",
            "what happens after semester",
            "finishing semester",
            "katapusan sa semester"
        ],
        "strong_keywords": ["end", "katapusan", "semester", "paghuman"],
        "weak_keywords": ["after", "happen", "mahitabo", "karon"],
        "required_context": []
    },
    "access_grades": {
        "phrases": [
            "view my grades",
            "check grades semester",
            "website to view grades",
            "tan-aw sa grado"
        ],
        "strong_keywords": ["view", "grades", "grade", "makita", "grado", "tan-aw"],
        "weak_keywords": ["website", "process", "where", "asa", "semester"],
        "required_context": []
    },
    "get_inc_form": {
        "phrases": [
            "download INC form",
            "where to get INC form",
            "link for INC form",
            "asa makuha INC form",
            "download sa form para INC"
        ],
        "strong_keywords": ["download", "inc", "form", "link", "makuha"],
        "weak_keywords": ["where", "asa", "get"],
        "required_context": []
    },
    "contact_registrar_for_tor": {
        "phrases": [
            "request copy of tor",
            "where can i request a copy of my tor",
            "process to request a copy of my transcript of record"
        ],
        "strong_keywords": ["request", "copy", "tor", "transcript", "record"],
        "weak_keywords": ["where", "process", "asa", "unsaon"],
        "required_context": []
    },
    "tor_request_for_graduates": {
        "phrases": [
            "graduate tor",
            "where graduate get tor",
            "where can i get my tor if im already a graduate"
        ],
        "strong_keywords": ["graduate", "graduates", "tor", "student", "students"],
        "weak_keywords": ["where", "get", "request", "asa", "makuha"],
        "required_context": []
    },
    "graduation_application_process": {
        "phrases": [
            "apply for graduation",
            "where do i apply for graduation",
            "asa ko pwede mag apply para sa graduation"
        ],
        "strong_keywords": ["apply", "applying", "graduation", "graduating"],
        "weak_keywords": ["where", "process", "asa", "unsaon"],
        "required_context": []
    },
    "graduating_clearance_requirements": {
        "phrases": [
            "clearance for graduation",
            "what document do i need for graduations",
            "clear before the graduation"
        ],
        "strong_keywords": ["clearance", "clear", "cleared", "graduation", "document", "documents", "dokumento"],
        "weak_keywords": ["process", "before", "after", "unsa", "kinahanglan"],
        "required_context": []
    }
}