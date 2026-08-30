import os
import sys
import json
import time
import urllib.request
import urllib.error

# Ensure rasa/actions is in sys.path so we can trace routing decisions
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "rasa", "actions"))

from actions import ActionReplyFromJsonHelper, LOCATION_ALIASES
from main_router import MainRouterService
from query_interpreter import QueryInterpreter

# Initialize local router instance to inspect decision pathways alongside the live server
helper = ActionReplyFromJsonHelper(os.path.join(ROOT, "rasa", "actions", "responses.json"))
router = MainRouterService(helper, LOCATION_ALIASES)

API_URL = "http://127.0.0.1:5000/api/chat"

# Complete dataset of 15 topics x (10 English + 10 Bisaya) = 300 test cases
TEST_DATASET = [
    # -------------------------------------------------------------
    # TOPIC 1: BukSU College Admission Test (CAT) Application & Process
    # -------------------------------------------------------------
    {
        "topic_id": 1,
        "topic_name": "BukSU College Admission Test (CAT) Application & Process",
        "expected_intents": ["take_exam", "buksu_cat_definition", "after_admission_application", "online_application_schedule", "cat_online_vs_walkin_application"],
        "expected_keywords": ["admissions.buksu.edu.ph", "admission", "cat", "steps", "permit", "register", "exam", "test", "account", "step 1", "take"],
        "questions": [
            # 10 English Questions (Varied & Grammatically Broken Patterns)
            {"lang": "en", "pattern": "Informal / Direct", "query": "how to apply buksu cat entrance test"},
            {"lang": "en", "pattern": "Phonetic spelling / missing prep", "query": "wer i can take the buksu cat exam step step?"},
            {"lang": "en", "pattern": "Wrong verb tense 'applying'", "query": "how do i applying for college admission test in buksu?"},
            {"lang": "en", "pattern": "Slang / contraction 'wats'", "query": "wats the steps for buksu cat online application?"},
            {"lang": "en", "pattern": "Broken English / missing auxiliaries", "query": "i want take entrance exam buksu how process?"},
            {"lang": "en", "pattern": "Noun phrase question", "query": "procedure to apply for admission test buksu university?"},
            {"lang": "en", "pattern": "Specific action phrasing", "query": "how can i register to buksu cat admission portal?"},
            {"lang": "en", "pattern": "Inverted syntax", "query": "entrance exam application how to do it in buksu?"},
            {"lang": "en", "pattern": "Gerund phrasing", "query": "is there a guide for buksu college admission testing?"},
            {"lang": "en", "pattern": "Broken grammar", "query": "step by step how take buksu cat exam?"},
            # 10 Bisaya Questions (Colloquial, Slang, Code-switching)
            {"lang": "ceb", "pattern": "Standard Cebuano", "query": "unsaon pag apply sa buksu cat entrance exam?"},
            {"lang": "ceb", "pattern": "Formal Cebuano", "query": "unsa pamaagi sa pag take sa admission test sa buksu?"},
            {"lang": "ceb", "pattern": "Typo 'aply'", "query": "unsaon pag aply sa buksu cat online?"},
            {"lang": "ceb", "pattern": "Bisglish phrase", "query": "unsa steps sa buksu cat exam?"},
            {"lang": "ceb", "pattern": "Particle 'ug'", "query": "asa ko mag apply ug buksu cat?"},
            {"lang": "ceb", "pattern": "Particle 'man'", "query": "unsaon man pag register sa buksu entrance exam?"},
            {"lang": "ceb", "pattern": "Imperative 'tudlui ko'", "query": "tudlui ko unsaon pag take sa buksu cat"},
            {"lang": "ceb", "pattern": "Short phrase", "query": "pamaagi sa pag apply ug buksu admission test"},
            {"lang": "ceb", "pattern": "Permit relation", "query": "unsaon pagkuha ug permit para exam sa buksu cat?"},
            {"lang": "ceb", "pattern": "Slang / conversational", "query": "gusto ko mo take ug buksu cat unsaon?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 2: BukSU CAT Exam Day Requirements & Policies
    # -------------------------------------------------------------
    {
        "topic_id": 2,
        "topic_name": "BukSU CAT Exam Day Requirements & Policies",
        "expected_intents": ["exam_requirements", "buksu_cat_calculator_policy", "reschedule_entrance_exam", "test_permit_issue", "missed_buksu_cat_schedule"],
        "expected_keywords": ["test permit", "calculator", "permit", "pencil", "valid id", "exam", "bring", "schedule", "reschedule", "dad-on", "dala"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Slang 'wat' / missing prep", "query": "wat to bring during buksu cat examination day?"},
            {"lang": "en", "pattern": "Noun fragment", "query": "requirements needed in exam room for buksu cat"},
            {"lang": "en", "pattern": "Direct policy question", "query": "can i bring calculator in buksu cat exam?"},
            {"lang": "en", "pattern": "Broken grammar", "query": "wat things i need bring on entrance test buksu?"},
            {"lang": "en", "pattern": "Specific rule", "query": "is calculator allowed in buksu entrance test?"},
            {"lang": "en", "pattern": "Issue scenario", "query": "i lost my test permit for buksu cat wat to do?"},
            {"lang": "en", "pattern": "Formal query", "query": "documents needed when taking buksu admission exam"},
            {"lang": "en", "pattern": "Slang query", "query": "wat should i bring on buksu cat test day?"},
            {"lang": "en", "pattern": "Inverted question", "query": "bring what for buksu cat exam?"},
            {"lang": "en", "pattern": "Reschedule inquiry", "query": "can i reschedule my missed buksu cat schedule?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Standard Cebuano", "query": "unsa kinahanglan dad-on sa buksu cat exam?"},
            {"lang": "ceb", "pattern": "Colloquial 'ig take'", "query": "unsa mga requirements ig take sa buksu cat?"},
            {"lang": "ceb", "pattern": "Calculator policy", "query": "pwede ba magdala ug calculator sa buksu cat exam?"},
            {"lang": "ceb", "pattern": "Particle 'unsay'", "query": "unsay dalhon sa adlaw sa entrance exam sa buksu?"},
            {"lang": "ceb", "pattern": "Typo 'dadon'", "query": "unsa kailangan dadon sa buksu admission test?"},
            {"lang": "ceb", "pattern": "Typo 'pwedi'", "query": "pwedi ba makagamit ug calculator sa buksu cat?"},
            {"lang": "ceb", "pattern": "Lost permit scenario", "query": "nawala akong test permit sa buksu cat unsa buhaton?"},
            {"lang": "ceb", "pattern": "Missed schedule", "query": "na miss nako akong buksu cat exam schedule pwede pa resched?"},
            {"lang": "ceb", "pattern": "Allowed/prohibited items", "query": "unsa ang mga bawal ug pwede dad-on sa buksu cat?"},
            {"lang": "ceb", "pattern": "Specific document inquiry", "query": "kinahanglan ba magdala 2x2 picture sa buksu cat exam?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 3: Freshman & Transferee Admission Requirements
    # -------------------------------------------------------------
    {
        "topic_id": 3,
        "topic_name": "Freshman & Transferee Admission Requirements",
        "expected_intents": ["freshman_admission_requirements", "transferee_admission_requirements", "second_courser_requirements", "law_admission_requirements", "als_graduate_buksu_cat_application", "second_courser_cat_application"],
        "expected_keywords": ["form 138", "card", "transcript", "tor", "good moral", "birth certificate", "psa", "honorable dismissal", "requirements", "freshman", "transferee", "second courser", "law"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Informal query", "query": "requirements for incoming freshman admission in buksu?"},
            {"lang": "en", "pattern": "Slang 'wat' / missing verb", "query": "wat documents needed for transferee admission buksu?"},
            {"lang": "en", "pattern": "Contraction 'im'", "query": "what are the requirements if im a second courser in buksu?"},
            {"lang": "en", "pattern": "Specific group", "query": "admission requirements for als graduate in buksu?"},
            {"lang": "en", "pattern": "Broken syntax", "query": "i want to transfer in buksu wat are requirements?"},
            {"lang": "en", "pattern": "Detailed phrase", "query": "first year college admission requirements in buksu university?"},
            {"lang": "en", "pattern": "Law category", "query": "wat are the documents required for college of law admission?"},
            {"lang": "en", "pattern": "List request", "query": "list of freshman admission requirements for buksu?"},
            {"lang": "en", "pattern": "Standard conversational", "query": "what do transferees need to submit for buksu admission?"},
            {"lang": "en", "pattern": "Short phrase", "query": "requirements for second degree applicant buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Bisglish", "query": "unsa mga requirements para freshman admission sa buksu?"},
            {"lang": "ceb", "pattern": "Transferee submission", "query": "unsa kinahanglan ipasa kung transferee sa buksu?"},
            {"lang": "ceb", "pattern": "Second courser", "query": "unsa ang mga requirements para second courser sa buksu?"},
            {"lang": "ceb", "pattern": "ALS graduate", "query": "unsa kailangan requirements para sa als graduate admission buksu?"},
            {"lang": "ceb", "pattern": "Colloquial 'papeles'", "query": "unsay mga papeles kailangan para freshman sa buksu?"},
            {"lang": "ceb", "pattern": "Transferee scenario", "query": "transferee ko sa buksu unsa akong dalhon nga requirements?"},
            {"lang": "ceb", "pattern": "Law admission", "query": "unsa requirements para mag apply sa buksu college of law?"},
            {"lang": "ceb", "pattern": "Formal 'rekisitos'", "query": "unsa mga rekisitos sa pagpa-admit isip bag-ong estudyante sa buksu?"},
            {"lang": "ceb", "pattern": "Typo 'e submit'", "query": "unsa kinahanglan e submit para makasulod sa buksu isip transferee?"},
            {"lang": "ceb", "pattern": "Short question", "query": "unsa requirements para second degree student sa buksu?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 4: Program Cut-off Scores & Board vs Non-Board Criteria
    # -------------------------------------------------------------
    {
        "topic_id": 4,
        "topic_name": "Program Cut-off Scores & Board vs Non-Board Criteria",
        "expected_intents": ["program_cutoff_scores", "cat_requirement_nursing_program", "cat_requirement_education_program", "Cat_score_for_nonboard", "board_course_cutoff_score", "non_board_cutoff_score"],
        "expected_keywords": ["percentile", "score", "cut-off", "cutoff", "nursing", "education", "board", "non-board", "rank", "percent", "grade", "score"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Missing article 'the'", "query": "what is cutoff score for nursing in buksu cat?"},
            {"lang": "en", "pattern": "Fragment", "query": "buksu cat score required for teacher education courses?"},
            {"lang": "en", "pattern": "Slang 'wat'", "query": "wat is the passing score for board courses in buksu?"},
            {"lang": "en", "pattern": "Fragment", "query": "cutoff score for non board programs in buksu cat exam?"},
            {"lang": "en", "pattern": "Slang 'how much score'", "query": "how much cat score i need for bsit in buksu?"},
            {"lang": "en", "pattern": "Formal query", "query": "what is the minimum percentile score for board programs?"},
            {"lang": "en", "pattern": "Question pattern", "query": "is there score requirement for education in buksu cat?"},
            {"lang": "en", "pattern": "Concise query", "query": "cat cutoff score for college of nursing buksu?"},
            {"lang": "en", "pattern": "Conversational", "query": "what score do i need in buksu cat for non board course?"},
            {"lang": "en", "pattern": "Short keyword query", "query": "minimum cat score for buksu programs?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Cebuano 'pila'", "query": "pila ang cutoff score sa nursing sa buksu cat?"},
            {"lang": "ceb", "pattern": "Board course score", "query": "pila ka score kinahanglan para sa board courses sa buksu?"},
            {"lang": "ceb", "pattern": "Education score", "query": "unsa ang passing score sa buksu cat para education?"},
            {"lang": "ceb", "pattern": "Non-board score", "query": "pila ang cat score requirement para non board courses sa buksu?"},
            {"lang": "ceb", "pattern": "Nursing entry", "query": "pila kinahanglan nga score sa buksu cat para makasulod sa nursing?"},
            {"lang": "ceb", "pattern": "Rating query", "query": "unsa ang cutoff rating sa buksu college admission test?"},
            {"lang": "ceb", "pattern": "Grade/score term", "query": "pila ang passing grade sa buksu cat para sa board program?"},
            {"lang": "ceb", "pattern": "Formal Cebuano", "query": "unsa ang gikinahanglan nga cat score para sa non-board course?"},
            {"lang": "ceb", "pattern": "Acronym query", "query": "pila score kinahanglan sa buksu cat para bsed?"},
            {"lang": "ceb", "pattern": "Course selection", "query": "pila ang minimum score sa buksu cat para makapili ug kurso?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 5: Admission Accounts, SIAS Credentials & Troubleshooting
    # -------------------------------------------------------------
    {
        "topic_id": 5,
        "topic_name": "Admission Accounts, SIAS Credentials & Troubleshooting",
        "expected_intents": ["admission_portal_login", "Change_Pass_admission", "Change_info_admission", "Find_Institutional_Account", "Find_Sias_Account", "sias_login_process", "sias_forgot_password", "admission_account_registration"],
        "expected_keywords": ["password", "sias", "email", "portal", "login", "register", "account", "reset", "institutional", "credentials", "recover"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Direct query", "query": "how to reset my password in admission portal buksu?"},
            {"lang": "en", "pattern": "Account recovery", "query": "i forgot my sias password how do i recover it?"},
            {"lang": "en", "pattern": "Change info", "query": "how can i change my information in buksu admission portal?"},
            {"lang": "en", "pattern": "Institutional account", "query": "how do i find my buksu institutional email account?"},
            {"lang": "en", "pattern": "Login issue", "query": "cannot login to buksu sias portal wat should i do?"},
            {"lang": "en", "pattern": "Registration", "query": "how to register an account in buksu admission system?"},
            {"lang": "en", "pattern": "Email lookup", "query": "where can i check my official buksu student email?"},
            {"lang": "en", "pattern": "Slang / abbreviation", "query": "i cant access my buksu admission account forgot pass"},
            {"lang": "en", "pattern": "Expanded acronym", "query": "steps to login in buksu student information accounting system"},
            {"lang": "en", "pattern": "Error correction", "query": "how to update wrong name in buksu admission portal?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Password reset", "query": "unsaon pag reset sa akong password sa buksu admission portal?"},
            {"lang": "ceb", "pattern": "Forgot SIAS pass", "query": "nakalimot ko sa akong sias password unsaon pag recover?"},
            {"lang": "ceb", "pattern": "SIAS login", "query": "unsaon pag login sa buksu sias portal?"},
            {"lang": "ceb", "pattern": "Find institutional email", "query": "unsaon nako pagkahibalo sa akong buksu institutional email?"},
            {"lang": "ceb", "pattern": "Update info", "query": "unsaon pag change ug information sa admission account sa buksu?"},
            {"lang": "ceb", "pattern": "Create account", "query": "unsaon pag himo ug admission account sa buksu?"},
            {"lang": "ceb", "pattern": "Cannot login", "query": "dili ko maka log in sa sias unsa akong buhaton?"},
            {"lang": "ceb", "pattern": "Find credentials", "query": "asa nako makita akong buksu student email ug password?"},
            {"lang": "ceb", "pattern": "Change pass", "query": "unsaon pag ilis ug password sa admission portal buksu?"},
            {"lang": "ceb", "pattern": "Wrong name fix", "query": "sayop akong pangalan sa admission portal unsaon pag usab?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 6: General & Online Enrollment Process
    # -------------------------------------------------------------
    {
        "topic_id": 6,
        "topic_name": "General & Online Enrollment Process",
        "expected_intents": ["enrollment_general_process", "freshman_enrollment_process", "online_enrollment_steps", "late_enrollment", "enrollment_where_to_start", "mixed_enrollment_process", "enrollment_online_system"],
        "expected_keywords": ["enrollment", "enroll", "sias", "steps", "step 1", "portal", "subject", "advised", "cor", "validate", "process", "pamaagi", "magpa-enroll"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Standard", "query": "what is the step by step enrollment process in buksu?"},
            {"lang": "en", "pattern": "Freshman enrollment", "query": "how to enroll as incoming freshman in buksu university?"},
            {"lang": "en", "pattern": "Online enrollment", "query": "wat are the steps for online enrollment in buksu sias?"},
            {"lang": "en", "pattern": "Where to start", "query": "where do i start my enrollment in buksu?"},
            {"lang": "en", "pattern": "Late enrollment", "query": "how do i enroll if im late enrollee in buksu?"},
            {"lang": "en", "pattern": "Continuing students", "query": "procedure for continuing students enrollment in buksu?"},
            {"lang": "en", "pattern": "Mixed enrollment", "query": "how does mixed enrollment process work in buksu?"},
            {"lang": "en", "pattern": "Broken syntax", "query": "i want to enroll in buksu wat should i do first?"},
            {"lang": "en", "pattern": "Complete enrollment", "query": "steps to complete my enrollment in buksu portal?"},
            {"lang": "en", "pattern": "Returning students", "query": "what is the procedure for returning student enrollment buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Standard Cebuano", "query": "unsaon pag enroll sa buksu step by step?"},
            {"lang": "ceb", "pattern": "Freshman enrollment", "query": "unsa ang pamaagi sa pag enroll para freshman sa buksu?"},
            {"lang": "ceb", "pattern": "Online SIAS enrollment", "query": "unsaon pag enroll online gamit ang sias portal sa buksu?"},
            {"lang": "ceb", "pattern": "Where to start", "query": "asa ko magsugod sa akong pagpa enroll sa buksu?"},
            {"lang": "ceb", "pattern": "Late enrollment", "query": "unsaon kung late ko mag enroll sa buksu pwede pa ba?"},
            {"lang": "ceb", "pattern": "Continuing student", "query": "unsa ang proseso sa pagpa enroll sa buksu para continuing student?"},
            {"lang": "ceb", "pattern": "Returning/old students", "query": "unsaon pag enroll sa buksu para sa mga daan nga estudyante?"},
            {"lang": "ceb", "pattern": "What to do first", "query": "unsa buhaton una para maka enroll sa buksu?"},
            {"lang": "ceb", "pattern": "Finish enrollment", "query": "unsaon pag human sa enrollment process sa buksu?"},
            {"lang": "ceb", "pattern": "Short phrase", "query": "pamaagi sa online enrollment sa buksu"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 7: Enrollment Documentary Requirements
    # -------------------------------------------------------------
    {
        "topic_id": 7,
        "topic_name": "Enrollment Documentary Requirements",
        "expected_intents": ["enrollment_documents", "psa_birth_certificate_requirement", "late_enrollment_document_submission", "con_nursing_medical_requirements", "con_nursing_requirements_submission"],
        "expected_keywords": ["psa", "birth certificate", "medical", "form 138", "good moral", "requirements", "documents", "submission", "submit", "ipasa", "papeles"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Standard", "query": "what documents are required for enrollment in buksu?"},
            {"lang": "en", "pattern": "Broken syntax", "query": "wat requirements i need to submit for enrollment buksu?"},
            {"lang": "en", "pattern": "PSA birth cert", "query": "is psa birth certificate mandatory for buksu enrollment?"},
            {"lang": "en", "pattern": "Late document", "query": "what happens if i submit my enrollment documents late in buksu?"},
            {"lang": "en", "pattern": "Nursing medical", "query": "what are medical requirements for college of nursing enrollment?"},
            {"lang": "en", "pattern": "List request", "query": "list of requirements to submit during enrollment in buksu?"},
            {"lang": "en", "pattern": "Document specifics", "query": "do i need form 138 and good moral to enroll in buksu?"},
            {"lang": "en", "pattern": "Regular student", "query": "what documents need to submit for regular student enrollment buksu?"},
            {"lang": "en", "pattern": "Short phrase", "query": "requirements to complete enrollment in buksu university"},
            {"lang": "en", "pattern": "Medical clearance", "query": "is medical clearance required for freshman enrollment in buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Requirements submission", "query": "unsa mga requirements nga kinahanglan ipasa sa enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Colloquial 'papeles'", "query": "unsa ang mga papeles kailangan para maka enroll sa buksu?"},
            {"lang": "ceb", "pattern": "PSA requirement", "query": "kinahanglan ba gyud ang psa birth certificate sa enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Late submission", "query": "unsa mahitabo kung ma late ug pasa sa enrollment requirements sa buksu?"},
            {"lang": "ceb", "pattern": "Nursing medical", "query": "unsa ang medical requirements para sa nursing enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Formal 'rekisitos'", "query": "unsa ang mga rekisitos sa pagpa enroll sa buksu?"},
            {"lang": "ceb", "pattern": "Form 138 query", "query": "kinahanglan ba ug good moral ug form 138 para enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Colloquial 'inig pa enroll'", "query": "unsang mga dokumento ang dalhon inig pa enroll sa buksu?"},
            {"lang": "ceb", "pattern": "Complete enrollment", "query": "unsa kinahanglan dad-on para makompleto ang enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Medical query", "query": "unsa mga requirement sa medical para maka enroll sa buksu?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 8: Enrollment Fees & Paying vs Non-Paying Students
    # -------------------------------------------------------------
    {
        "topic_id": 8,
        "topic_name": "Enrollment Fees & Paying vs Non-Paying Students",
        "expected_intents": ["student_fees", "paying_student_definition", "non_paying_student_definition", "paying_and_non_paying_students", "enrollment_validation_payment"],
        "expected_keywords": ["tuition", "free", "higher education", "non-paying", "paying", "fees", "miscellaneous", "bayad", "libre", "ra 10931", "cost"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Tuition fee query", "query": "how much is tuition and enrollment fee in buksu?"},
            {"lang": "en", "pattern": "Non-paying definition", "query": "who is considered a non paying student in buksu?"},
            {"lang": "en", "pattern": "Comparison", "query": "what is difference between paying and non paying student in buksu?"},
            {"lang": "en", "pattern": "Free tuition", "query": "is tuition free in buksu under free higher education?"},
            {"lang": "en", "pattern": "Paying definition", "query": "who are paying students in buksu university?"},
            {"lang": "en", "pattern": "Validation payment", "query": "do i need to pay any fee during enrollment validation in buksu?"},
            {"lang": "en", "pattern": "Misc fee", "query": "is there miscellaneous fee for undergraduate students in buksu?"},
            {"lang": "en", "pattern": "Broken syntax", "query": "how much i need pay for enrollment in buksu?"},
            {"lang": "en", "pattern": "Fees query", "query": "what are school fees charged in buksu?"},
            {"lang": "en", "pattern": "Second courser category", "query": "are second coursers paying students in buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Enrollment cost", "query": "pila ang bayad sa enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Non-paying student", "query": "kinsa ang matawag nga non-paying student sa buksu?"},
            {"lang": "ceb", "pattern": "Paying vs Non-paying", "query": "unsa ang kalainan sa paying ug non paying student sa buksu?"},
            {"lang": "ceb", "pattern": "Free tuition", "query": "libre ba ang tuition sa buksu ubos sa free tuition law?"},
            {"lang": "ceb", "pattern": "Paying students", "query": "kinsa ang mga paying students sa buksu?"},
            {"lang": "ceb", "pattern": "Validation payment", "query": "naa bay bayranan sa enrollment validation sa buksu?"},
            {"lang": "ceb", "pattern": "Semester tuition", "query": "pila ang tuition fee sa buksu kada semester?"},
            {"lang": "ceb", "pattern": "Misc fee", "query": "magbayad ba gihapon ug miscellaneous fee sa buksu?"},
            {"lang": "ceb", "pattern": "Colloquial 'inig pa enroll'", "query": "pila akong mabayran inig pa enroll sa buksu?"},
            {"lang": "ceb", "pattern": "Second courser cost", "query": "bayaran ba ang second courser sa buksu?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 9: Adding and Dropping of Subjects
    # -------------------------------------------------------------
    {
        "topic_id": 9,
        "topic_name": "Adding and Dropping of Subjects",
        "expected_intents": ["add_drop_subject"],
        "expected_keywords": ["add", "drop", "subject", "form", "two weeks", "midterm", "failing", "5.0", "registrar", "instructor", "coordinator", "drive.google.com"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Standard", "query": "how to add and drop subject in buksu?"},
            {"lang": "en", "pattern": "Adding process", "query": "wat is the process for adding subjects in buksu?"},
            {"lang": "en", "pattern": "Dropping deadline", "query": "until when is dropping of subject allowed in buksu?"},
            {"lang": "en", "pattern": "Form location/download", "query": "where can i get the add drop form in buksu?"},
            {"lang": "en", "pattern": "Late drop penalty", "query": "what happens if i drop subject after midterm in buksu?"},
            {"lang": "en", "pattern": "Signatures needed", "query": "who needs to sign my add and drop form in buksu?"},
            {"lang": "en", "pattern": "Drop subject", "query": "how to drop a course subject in buksu university?"},
            {"lang": "en", "pattern": "Period confirmation", "query": "can i add subjects during first two weeks in buksu?"},
            {"lang": "en", "pattern": "Subject change", "query": "procedure to change my enrolled subjects in buksu?"},
            {"lang": "en", "pattern": "Guide query", "query": "step by step guide for adding and dropping subject buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Add/drop Cebuano", "query": "unsaon pag add ug drop og subject sa buksu?"},
            {"lang": "ceb", "pattern": "Add subject", "query": "unsa ang proseso sa pag-add og subject sa buksu?"},
            {"lang": "ceb", "pattern": "Drop deadline", "query": "hangtod kanus-a pwede mag drop og subject sa buksu?"},
            {"lang": "ceb", "pattern": "Form source", "query": "asa makuha ang add drop form sa buksu?"},
            {"lang": "ceb", "pattern": "Late drop 5.0", "query": "unsa mahitabo kung human sa midterm mag drop og subject sa buksu?"},
            {"lang": "ceb", "pattern": "Signatures", "query": "kinsa ang kinahanglan mopirma sa add drop form sa buksu?"},
            {"lang": "ceb", "pattern": "Drop process", "query": "unsaon pag drop ug subject sa buksu?"},
            {"lang": "ceb", "pattern": "Add period", "query": "pwede ba mag add og subject sulod sa duha ka semana sa buksu?"},
            {"lang": "ceb", "pattern": "Change subject", "query": "unsaon nako pag ilis sa akong na enroll nga subject sa buksu?"},
            {"lang": "ceb", "pattern": "Short phrase", "query": "pamaagi sa pag add drop og subjects sa buksu"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 10: Enrollment Withdrawal & Campus Transfer Policy
    # -------------------------------------------------------------
    {
        "topic_id": 10,
        "topic_name": "Enrollment Withdrawal & Campus Transfer Policy",
        "expected_intents": ["enrollment_withdrawal", "campus_transfer", "double_enrollment_policy"],
        "expected_keywords": ["withdraw", "withdrawal", "transfer", "satellite", "main campus", "double enrollment", "registrar", "clearance", "cancel", "mobalhin"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Withdrawal process", "query": "how to withdraw my enrollment in buksu?"},
            {"lang": "en", "pattern": "Voluntary withdrawal", "query": "what is the procedure for voluntary withdrawal from buksu?"},
            {"lang": "en", "pattern": "Campus transfer", "query": "can i transfer from satellite campus to buksu main campus?"},
            {"lang": "en", "pattern": "Double enrollment", "query": "is double enrollment allowed in buksu and another school?"},
            {"lang": "en", "pattern": "Submit form", "query": "where to submit withdrawal form in buksu?"},
            {"lang": "en", "pattern": "Cancel enrollment", "query": "how do i cancel my enrollment in buksu university?"},
            {"lang": "en", "pattern": "Transfer requirements", "query": "what are requirements to transfer from buksu satellite campus to main?"},
            {"lang": "en", "pattern": "Simultaneous enrollment", "query": "can student enroll in two universities at the same time in buksu?"},
            {"lang": "en", "pattern": "Withdrawal steps", "query": "steps to process enrollment dropping or withdrawal in buksu?"},
            {"lang": "en", "pattern": "Transfer policy", "query": "policy on transferring between buksu campuses?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Withdraw enrollment", "query": "unsaon pag withdraw sa akong enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Voluntary withdrawal", "query": "unsa ang proseso sa voluntary withdrawal sa buksu?"},
            {"lang": "ceb", "pattern": "Campus transfer", "query": "pwede ba mag transfer gikan satellite campus padulong main campus sa buksu?"},
            {"lang": "ceb", "pattern": "Double enrollment", "query": "gitugotan ba ang double enrollment sa buksu ug sa laing eskwelahan?"},
            {"lang": "ceb", "pattern": "Form submission", "query": "asa ipasa ang withdrawal form sa buksu?"},
            {"lang": "ceb", "pattern": "Cancel enrollment", "query": "unsaon pag undang o pag cancel sa akong enrollment sa buksu?"},
            {"lang": "ceb", "pattern": "Transfer steps", "query": "unsa kinahanglan buhaton kung mobalhin gikan sa satellite campus pa main sa buksu?"},
            {"lang": "ceb", "pattern": "Simultaneous enroll", "query": "pwede ba mag dungan ug enroll sa duha ka school sa buksu?"},
            {"lang": "ceb", "pattern": "Registrar withdrawal", "query": "pamaagi sa pag withdraw sa enrollment sa buksu registrar"},
            {"lang": "ceb", "pattern": "Campus transfer policy", "query": "unsa ang policy sa pag balhin gikan sa satellite campus sa buksu?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 11: Certificate of Registration (COR) & COR Validation
    # -------------------------------------------------------------
    {
        "topic_id": 11,
        "topic_name": "Certificate of Registration (COR) & COR Validation",
        "expected_intents": ["request_cor", "where_get_cor", "cor_validation_steps", "cor_validation_day", "cor_validation_location"],
        "expected_keywords": ["cor", "certificate of registration", "validation", "validate", "sias", "registrar", "print", "window", "tatak"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Get COR", "query": "how to get certificate of registration in buksu?"},
            {"lang": "en", "pattern": "Validate COR location", "query": "where do i validate my cor in buksu campus?"},
            {"lang": "en", "pattern": "Validation steps", "query": "what are the steps to validate cor in buksu?"},
            {"lang": "en", "pattern": "Validation schedule", "query": "when is the schedule for cor validation in buksu?"},
            {"lang": "en", "pattern": "Download COR", "query": "where can i download my buksu certificate of registration?"},
            {"lang": "en", "pattern": "Print from SIAS", "query": "how to print my cor from buksu sias portal?"},
            {"lang": "en", "pattern": "Office location", "query": "which office processes certificate of registration validation in buksu?"},
            {"lang": "en", "pattern": "Semester validation", "query": "do i need to validate my cor every semester in buksu?"},
            {"lang": "en", "pattern": "Validation requirements", "query": "what do i need to bring for cor validation in buksu?"},
            {"lang": "en", "pattern": "Validated COR", "query": "steps in getting validated cor in buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Get COR", "query": "unsaon pagkuha ug certificate of registration sa buksu?"},
            {"lang": "ceb", "pattern": "COR validation location", "query": "asa dapit magpa validate ug cor sa buksu campus?"},
            {"lang": "ceb", "pattern": "Validation steps", "query": "unsa ang mga lakang o steps sa cor validation sa buksu?"},
            {"lang": "ceb", "pattern": "Validation day", "query": "kanus-a ang adlaw sa cor validation sa buksu?"},
            {"lang": "ceb", "pattern": "Download COR", "query": "asa nako ma download akong buksu cor?"},
            {"lang": "ceb", "pattern": "Print COR", "query": "unsaon pag print sa akong cor gikan sa sias portal sa buksu?"},
            {"lang": "ceb", "pattern": "Office location", "query": "asa nga opisina magpa tatak o validate sa cor sa buksu?"},
            {"lang": "ceb", "pattern": "Every semester", "query": "kinahanglan ba magpa validate ug cor kada semester sa buksu?"},
            {"lang": "ceb", "pattern": "What to bring", "query": "unsa akong dad-on para magpa validate sa akong cor sa buksu?"},
            {"lang": "ceb", "pattern": "Formal Cebuano", "query": "pamaagi sa pagkuha ug pinatikan nga cor sa buksu"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 12: Graduation Application, Clearance & TOR for Graduates
    # -------------------------------------------------------------
    {
        "topic_id": 12,
        "topic_name": "Graduation Application, Clearance & TOR for Graduates",
        "expected_intents": ["graduation_application_process", "graduating_clearance_requirements", "tor_request_for_graduates", "contact_registrar_for_tor", "request_tor_process"],
        "expected_keywords": ["graduation", "clearance", "transcript", "tor", "registrar", "graduate", "graduating", "apply", "alumni"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Apply graduation", "query": "how to apply for graduation in buksu?"},
            {"lang": "en", "pattern": "Graduation clearance", "query": "what are the clearance requirements for graduating students in buksu?"},
            {"lang": "en", "pattern": "Request TOR", "query": "how can graduates request transcript of records in buksu?"},
            {"lang": "en", "pattern": "Graduation process", "query": "what is the process for graduation application in buksu?"},
            {"lang": "en", "pattern": "Clearance submission", "query": "where do i submit my graduation clearance in buksu?"},
            {"lang": "en", "pattern": "TOR after graduation", "query": "how to get tor after graduating from buksu?"},
            {"lang": "en", "pattern": "Clearance documents", "query": "documents needed for graduating student clearance in buksu?"},
            {"lang": "en", "pattern": "Contact registrar", "query": "how to contact registrar for transcript of records request buksu?"},
            {"lang": "en", "pattern": "Complete clearance", "query": "steps to complete graduation clearance in buksu university?"},
            {"lang": "en", "pattern": "TOR processing", "query": "how long does it take to process tor for buksu alumni?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Apply graduation", "query": "unsaon pag apply para graduation sa buksu?"},
            {"lang": "ceb", "pattern": "Clearance requirements", "query": "unsa mga requirements para sa clearance sa graduating students sa buksu?"},
            {"lang": "ceb", "pattern": "Request TOR", "query": "unsaon pag request ug transcript of records para sa graduate sa buksu?"},
            {"lang": "ceb", "pattern": "Graduation process", "query": "unsa ang proseso sa pag apply og graduation sa buksu?"},
            {"lang": "ceb", "pattern": "Submit clearance", "query": "asa ipasa ang graduation clearance sa buksu?"},
            {"lang": "ceb", "pattern": "TOR for graduates", "query": "unsaon pagkuha ug tor kung graduate na sa buksu?"},
            {"lang": "ceb", "pattern": "Clearance documents", "query": "unsa mga papeles kinahanglan para makompleto ang clearance sa graduation sa buksu?"},
            {"lang": "ceb", "pattern": "Contact registrar", "query": "unsaon pag contact sa registrar para sa tor sa buksu?"},
            {"lang": "ceb", "pattern": "Clearance steps", "query": "mga lakang sa pagproseso sa clearance sa graduating sa buksu"},
            {"lang": "ceb", "pattern": "Processing time", "query": "pila ka adlaw makuha ang tor sa buksu para alumni?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 13: Student ID Application, Replacement & Validation
    # -------------------------------------------------------------
    {
        "topic_id": 13,
        "topic_name": "Student ID Application, Replacement & Validation",
        "expected_intents": ["student_id_process", "student_id_requirements", "Student_id_fee", "lost_student_id_replacement_process", "campus_entry_without_student_id", "id_validation_process", "id_validation_day"],
        "expected_keywords": ["student id", "school id", "id card", "lost", "affidavit", "replace", "validation", "sticker", "fee", "nawala", "bayad", "tatak"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Get student ID", "query": "how to get student id in buksu?"},
            {"lang": "en", "pattern": "ID requirements", "query": "what are the requirements for student id application in buksu?"},
            {"lang": "en", "pattern": "ID fee", "query": "how much is the fee for student id in buksu?"},
            {"lang": "en", "pattern": "Lost ID replacement", "query": "what to do if i lost my buksu student id?"},
            {"lang": "en", "pattern": "Entry without ID", "query": "can i enter buksu campus without student id?"},
            {"lang": "en", "pattern": "ID validation", "query": "how to validate my student id sticker in buksu?"},
            {"lang": "en", "pattern": "ID validation schedule", "query": "when is the schedule for student id validation in buksu?"},
            {"lang": "en", "pattern": "Damaged ID", "query": "where to process replacement for damaged student id in buksu?"},
            {"lang": "en", "pattern": "ID card steps", "query": "steps in applying for buksu school id card?"},
            {"lang": "en", "pattern": "Affidavit of loss", "query": "do i need affidavit of loss for lost buksu student id?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Get student ID", "query": "unsaon pagkuha ug student id sa buksu?"},
            {"lang": "ceb", "pattern": "ID requirements", "query": "unsa mga requirements para sa student id sa buksu?"},
            {"lang": "ceb", "pattern": "ID fee", "query": "pila ang bayad sa student id sa buksu?"},
            {"lang": "ceb", "pattern": "Lost ID", "query": "nawala akong buksu student id unsa akong buhaton?"},
            {"lang": "ceb", "pattern": "Entry without ID", "query": "pwede ba makasulod sa buksu campus kung walay student id?"},
            {"lang": "ceb", "pattern": "ID validation", "query": "unsaon pagpa validate sa student id sa buksu?"},
            {"lang": "ceb", "pattern": "Validation day", "query": "kanus-a ang adlaw sa student id validation sa buksu?"},
            {"lang": "ceb", "pattern": "Replace ID", "query": "asa magpa replace kung naguba o nawala ang student id sa buksu?"},
            {"lang": "ceb", "pattern": "New ID process", "query": "unsaon pag proseso sa bag-ong student id sa buksu?"},
            {"lang": "ceb", "pattern": "Affidavit of loss", "query": "kinahanglan ba ug affidavit of loss kung nawala ang id sa buksu?"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 14: Certificate Requests: Good Moral & Clinic Medical Certificate
    # -------------------------------------------------------------
    {
        "topic_id": 14,
        "topic_name": "Certificate Requests: Good Moral & Clinic Medical Certificate",
        "expected_intents": ["request_good_moral_certificate_oss", "good_moral_certificate_fee", "clinic_medical_certificate_process", "clinic_medical_certificate_cost", "clinic_medical_certificate_duration"],
        "expected_keywords": ["good moral", "oss", "medical certificate", "clinic", "certificate", "fee", "cost", "free", "office", "doktor", "bayad"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Good Moral OSS", "query": "how to request good moral certificate from oss in buksu?"},
            {"lang": "en", "pattern": "Good Moral fee", "query": "how much is the fee for good moral certificate in buksu?"},
            {"lang": "en", "pattern": "Clinic Med Cert", "query": "how to get medical certificate from university clinic in buksu?"},
            {"lang": "en", "pattern": "Med cert cost", "query": "how much does medical certificate cost in buksu clinic?"},
            {"lang": "en", "pattern": "Med cert duration", "query": "how long does it take to release medical certificate in buksu?"},
            {"lang": "en", "pattern": "Good Moral office", "query": "where is the office to get certificate of good moral character in buksu?"},
            {"lang": "en", "pattern": "Good Moral steps", "query": "steps to apply for good moral certificate in buksu?"},
            {"lang": "en", "pattern": "Free med cert", "query": "is medical certificate free in buksu university clinic?"},
            {"lang": "en", "pattern": "Good Moral requirements", "query": "requirements to request good moral certificate from buksu oss?"},
            {"lang": "en", "pattern": "Medical clearance", "query": "procedure to secure medical clearance or certificate in buksu?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Good Moral OSS", "query": "unsaon pagkuha ug good moral certificate sa oss sa buksu?"},
            {"lang": "ceb", "pattern": "Good Moral fee", "query": "pila ang bayad sa good moral certificate sa buksu?"},
            {"lang": "ceb", "pattern": "Clinic Med Cert", "query": "unsaon pagkuha ug medical certificate sa clinic sa buksu?"},
            {"lang": "ceb", "pattern": "Med cert cost", "query": "pila ang bayad sa medical certificate sa buksu clinic?"},
            {"lang": "ceb", "pattern": "Med cert duration", "query": "pila ka adlaw o oras makuha ang medical certificate sa buksu clinic?"},
            {"lang": "ceb", "pattern": "Good Moral office", "query": "asa dapit ang opisina para magkuha ug good moral sa buksu?"},
            {"lang": "ceb", "pattern": "Good Moral steps", "query": "unsa ang mga lakang sa pagkuha ug good moral certificate sa buksu?"},
            {"lang": "ceb", "pattern": "Free med cert", "query": "libre ba ang medical certificate sa clinic sa buksu?"},
            {"lang": "ceb", "pattern": "Good Moral requirements", "query": "unsa mga kinahanglan para makakuha ug good moral certificate sa buksu?"},
            {"lang": "ceb", "pattern": "Med cert phrase", "query": "pamaagi sa pagkuha ug medical certificate sa buksu clinic"},
        ]
    },
    # -------------------------------------------------------------
    # TOPIC 15: Library Services, ICT WiFi & Scholarship Procedures
    # -------------------------------------------------------------
    {
        "topic_id": 15,
        "topic_name": "Library Services, ICT WiFi & Scholarship Procedures",
        "expected_intents": ["library_id_card_requirements", "library_id_card_location", "library_borrow_books_process", "library_return_books_process", "library_late_return_penalty", "get_wifi_access", "institutional_email_account", "scholarship_application", "contact_scholarship_unit", "general_gate_pass", "bike_gate_pass"],
        "expected_keywords": ["library", "borrow", "books", "penalty", "wifi", "ict", "email", "scholarship", "gate pass", "oss", "multa", "hulam"],
        "questions": [
            # 10 English
            {"lang": "en", "pattern": "Library ID card", "query": "how to apply for library id card in buksu?"},
            {"lang": "en", "pattern": "Borrow books", "query": "how to borrow books from buksu university library?"},
            {"lang": "en", "pattern": "Late penalty", "query": "what is the penalty for late return of books in buksu library?"},
            {"lang": "en", "pattern": "WiFi access", "query": "how to connect and get wifi access in buksu campus?"},
            {"lang": "en", "pattern": "Institutional email", "query": "how to get buksu institutional email account from ict?"},
            {"lang": "en", "pattern": "Scholarship application", "query": "how to apply for scholarship in buksu oss?"},
            {"lang": "en", "pattern": "Contact scholarship", "query": "how to contact buksu scholarship unit?"},
            {"lang": "en", "pattern": "Gate pass", "query": "how to apply for campus vehicle or bike gate pass in buksu?"},
            {"lang": "en", "pattern": "Return books", "query": "steps to return borrowed library books in buksu?"},
            {"lang": "en", "pattern": "Borrow limit", "query": "how many books can students borrow from buksu library?"},
            # 10 Bisaya
            {"lang": "ceb", "pattern": "Library ID card", "query": "unsaon pagkuha ug library id card sa buksu library?"},
            {"lang": "ceb", "pattern": "Borrow books", "query": "unsaon paghulam ug libro sa library sa buksu?"},
            {"lang": "ceb", "pattern": "Late penalty", "query": "pila ang multa o penalty kung ma late ug uli sa libro sa buksu library?"},
            {"lang": "ceb", "pattern": "WiFi access", "query": "unsaon pag connect sa campus wifi sa buksu?"},
            {"lang": "ceb", "pattern": "Institutional email", "query": "unsaon pagkuha ug institutional email account sa ict sa buksu?"},
            {"lang": "ceb", "pattern": "Scholarship application", "query": "unsaon pag apply ug scholarship sa oss sa buksu?"},
            {"lang": "ceb", "pattern": "Contact scholarship", "query": "unsaon pag contact sa scholarship unit sa buksu?"},
            {"lang": "ceb", "pattern": "Gate pass", "query": "unsaon pagkuha ug gate pass para sa motor o bike sa buksu?"},
            {"lang": "ceb", "pattern": "Return books", "query": "unsa ang proseso sa pag-uli sa gihulam nga libro sa buksu library?"},
            {"lang": "ceb", "pattern": "Borrow limit", "query": "pila ka libro ang pwede mahulam sa buksu university library?"},
        ]
    }
]

def query_live_api(user_message: str, lang: str):
    """Sends query to Node /api/chat endpoint."""
    payload = {
        "intent": user_message,
        "language": lang,
        "sessionId": f"test_runner_p1_{int(time.time()*1000)}",
        "activeCategory": "procedures"
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except Exception as e:
        return {"error": str(e)}

def inspect_internal_decision(user_message: str, lang: str):
    """Runs through local MainRouterService to capture decision source and confidence."""
    msg = {"text": user_message, "entities": []}
    res = router.route_with_context("ask_procedures", msg, user_message, {"active_category": "procedures"})
    matched_intent = router.knowledge_router.last_selected_intent
    
    # Check if LLM reranker ran
    cache_key_en = f"procedures|{user_message.strip().lower().strip('?!.,:-_')}"
    cached_entry = router.knowledge_router.llm_reranker._decision_cache.get(cache_key_en)
    
    is_llm_takeover = False
    if cached_entry and cached_entry[1] is not None:
        is_llm_takeover = True
    
    return matched_intent, is_llm_takeover, res

def evaluate_response(topic_meta, server_resp, matched_intent, is_llm):
    """
    Evaluates response:
    - Responder: LLM vs RASA
    - Category:
        * Answered with Right Data
        * Answered with Wrong Data
        * Answered with Fallback Choices
        * Answered with No Data Fallback
    """
    answer_list = server_resp.get("answer") or []
    if isinstance(answer_list, list):
        full_text = " ".join(str(x) for x in answer_list)
    else:
        full_text = str(answer_list)
    
    full_text_lower = full_text.lower()
    
    # 1. Fallback / No Data checks
    if (
        "i cannot understand your question" in full_text_lower
        or "sorry, i don't have" in full_text_lower
        or "i'm not sure i understand" in full_text_lower
        or "could you rephrase" in full_text_lower
        or "no information available" in full_text_lower
        or full_text.strip() == ""
    ):
        return "Answered with No Data Fallback", "RASA", full_text
    
    # 2. Clarification / Disambiguation Fallback choices
    suggestions = server_resp.get("suggestions") or []
    choice_groups = server_resp.get("choiceGroups") or []
    if "did you mean" in full_text_lower or "please choose" in full_text_lower or (len(suggestions) > 0 and len(full_text) < 100):
        if "did you mean" in full_text_lower:
            return "Answered with Fallback Choices", "RASA", full_text
    
    # 3. Determine responder (LLM vs RASA)
    responder = "LLM" if is_llm else "RASA"
    
    # 4. Check if matched intent or text contents match expected topics
    expected_intents = topic_meta.get("expected_intents", [])
    expected_keywords = topic_meta.get("expected_keywords", [])
    
    # Check intent match or keyword match
    intent_match = matched_intent in expected_intents
    keyword_match = any(kw.lower() in full_text_lower for kw in expected_keywords)
    
    if intent_match or keyword_match:
        return "Answered with Right Data", responder, full_text
    else:
        return "Answered with Wrong Data", responder, full_text

def run_all_tests():
    all_results = []
    summary_stats = {
        "total_tests": 0,
        "right_data": 0,
        "wrong_data": 0,
        "fallback_choices": 0,
        "no_data_fallback": 0,
        "answered_by_rasa": 0,
        "answered_by_llm": 0,
        "english_total": 0,
        "english_right": 0,
        "bisaya_total": 0,
        "bisaya_right": 0,
    }
    
    print(f"Starting Phase 1 Testing: Step-by-Step Procedures & Guides ({len(TEST_DATASET)} topics)...")
    
    for topic_idx, topic in enumerate(TEST_DATASET, 1):
        print(f"\n[{topic_idx}/{len(TEST_DATASET)}] Testing Topic: {topic['topic_name']}")
        topic_results = []
        
        for q_idx, q in enumerate(topic["questions"], 1):
            query = q["query"]
            lang = q["lang"]
            pattern = q["pattern"]
            
            # Send to live server
            server_resp = query_live_api(query, lang)
            
            # Trace internal decision
            matched_intent, is_llm, internal_res = inspect_internal_decision(query, lang)
            
            # Evaluate outcome
            outcome, responder, response_text = evaluate_response(topic, server_resp, matched_intent, is_llm)
            
            # Record stats
            summary_stats["total_tests"] += 1
            if outcome == "Answered with Right Data":
                summary_stats["right_data"] += 1
                if lang == "en":
                    summary_stats["english_right"] += 1
                else:
                    summary_stats["bisaya_right"] += 1
            elif outcome == "Answered with Wrong Data":
                summary_stats["wrong_data"] += 1
            elif outcome == "Answered with Fallback Choices":
                summary_stats["fallback_choices"] += 1
            elif outcome == "Answered with No Data Fallback":
                summary_stats["no_data_fallback"] += 1
                
            if responder == "LLM":
                summary_stats["answered_by_llm"] += 1
            else:
                summary_stats["answered_by_rasa"] += 1
                
            if lang == "en":
                summary_stats["english_total"] += 1
            else:
                summary_stats["bisaya_total"] += 1
            
            result_entry = {
                "topic_id": topic["topic_id"],
                "topic_name": topic["topic_name"],
                "language": "English" if lang == "en" else "Bisaya",
                "pattern": pattern,
                "query": query,
                "matched_intent": matched_intent,
                "responder": responder,
                "outcome": outcome,
                "response_preview": (response_text[:120] + "...") if len(response_text) > 120 else response_text
            }
            topic_results.append(result_entry)
            all_results.append(result_entry)
            
            # Print progress ticker
            symbol = "OK" if outcome == "Answered with Right Data" else "X"
            print(f"  [{q_idx:02d}/20] ({result_entry['language'][:3]}) [{responder}] [{outcome}] {query}")
            
    # Save full JSON report
    output_path = os.path.join(ROOT, "scratch", "phase1_test_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"summary": summary_stats, "results": all_results}, f, indent=2)
        
    print("\n" + "="*60)
    print("TESTING COMPLETE! Summary Statistics:")
    print("="*60)
    print(f"Total Questions Tested: {summary_stats['total_tests']}")
    print(f"Answered with Right Data:      {summary_stats['right_data']} ({summary_stats['right_data']/summary_stats['total_tests']*100:.1f}%)")
    print(f"Answered with Wrong Data:      {summary_stats['wrong_data']} ({summary_stats['wrong_data']/summary_stats['total_tests']*100:.1f}%)")
    print(f"Answered with Fallback Choices:{summary_stats['fallback_choices']} ({summary_stats['fallback_choices']/summary_stats['total_tests']*100:.1f}%)")
    print(f"Answered with No Data Fallback:{summary_stats['no_data_fallback']} ({summary_stats['no_data_fallback']/summary_stats['total_tests']*100:.1f}%)")
    print(f"Answered by RASA:              {summary_stats['answered_by_rasa']} ({summary_stats['answered_by_rasa']/summary_stats['total_tests']*100:.1f}%)")
    print(f"Answered by LLM (Reranker):    {summary_stats['answered_by_llm']} ({summary_stats['answered_by_llm']/summary_stats['total_tests']*100:.1f}%)")
    print(f"English Accuracy:              {summary_stats['english_right']}/{summary_stats['english_total']} ({summary_stats['english_right']/summary_stats['english_total']*100:.1f}%)")
    print(f"Bisaya Accuracy:               {summary_stats['bisaya_right']}/{summary_stats['bisaya_total']} ({summary_stats['bisaya_right']/summary_stats['bisaya_total']*100:.1f}%)")
    print("="*60)

if __name__ == "__main__":
    run_all_tests()
