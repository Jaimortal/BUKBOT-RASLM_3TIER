# all the oss services topic route will be stored
OSS_SERVICES_TOPIC_PATTERNS = {
    "Student_id_fee": {
        "phrases": [
            "Student ID fee",
            "do I have to pay for the student id",
            "naa bay bayad ang id",
            "is the buksu id free",
            "pila ang cost sa id nato",
            "are we paying for school id"
        ],
        "strong_keywords": [
            "free", "libre", "cost", "price", "pay", "fee", "payment"
        ],
        "weak_keywords": [
            "fee", "pay", "bayad", "id", "pila", "student", "school", "naa",
            "getting", "gets", "get"
        ],
        "required_context": []
    },
    "Requirement_get_id": {
        "phrases": [
            "Student ID requirements",
            "what are the requirements for student id",
            "unsa ang dal on para kuha kog id",
            "requirements to get id",
            "unsa dalahon para maka id",
            "what do I need to bring for my id"
        ],
        "strong_keywords": [
            "requirements", "requirement", "bring", "dal", "dalahon"
        ],
        "weak_keywords": [
            "id", "what", "need", "unsa", "kuha", "get", "para", "maka", "get"
        ],
        "required_context": []
    },
    "lost_student_id_replacement_process": {
        "phrases": [
            "Lost student ID",
            "what to do if I lost my id",
            "unsaon kung nawala ang id",
            "how to replace lost id",
            "nawala akoang id unsa ang process",
            "how to get replacement id"
        ],
        "strong_keywords": [
            "lost", "nawala", "replacement", "replace", "affidavit"
        ],
        "weak_keywords": [
            "id", "process", "what", "how", "unsaon", "if", "kung", "akoang", "if", "need",
        ],
        "required_context": []
    },
    "request_good_moral_certificate_oss": {
        "phrases": [
            "Good moral certificate",
            "how to get good moral certificate",
            "asa mukuha og good moral",
            "pila bayad sa good moral",
            "requesting good moral",
            "where to ask for certificate of good moral"
        ],
        "strong_keywords": [
            "moral", "cert", "certificate", "requesting"
        ],
        "weak_keywords": [
            "good", "get", "kuha", "asa", "where", "how", "pila", "bayad"
        ],
        "required_context": []
    },
    "student_id_process": {
        "phrases": [
            "Student ID process",
            "how to get student id",
            "unsa ang process sa pagkuha og id",
            "asa dapit mukuha og id",
            "where do i go to get my id",
            "unsaon pag process sa id"
        ],
        "strong_keywords": [
            "procedure", "where", "asa", "steps",
            "process", "steps"
        ],
        "weak_keywords": [
            "id", "process", "how", "unsaon", "get", "kuha", "student", "go", "dapit",
            "getting", "gets", 
        ],
        "required_context": []
    },
   "affirmative_action": {
        "phrases": [
            "what if i fail the buksu cat exam can i still enroll",
            "can i still study at buksu even if i didnt pass the cat",
            "i failed the buksu cat exam is there another way to enroll",
            "is there a chance to enroll even if i did not pass the buksu cat",
            "what should i do if i didnt pass the buksu entrance exam",
            "do student can apply for affirmative program",
            "can i apply for affirmative action program if i failed the cat",
            "do i still have a chance if i fail the buksu cat exam",
            "is affirmative action available for students who did not pass the cat",
            "if i fail the exam can i still get into buksu",
            "are there other options if i didnt pass the buksu cat",
            "can i still enroll through aap if i didnt pass the exam",
            "what are my options if i failed the buksu cat exam",
            "does buksu allow students who failed the cat to enroll",
            "can i enter buksu even if i didnt pass the entrance test",
            "is it possible to enroll even if i failed the buksu admission test",

            "unsa kung mapakyas ko sa BukSU CAT exam, pwede pa ba ko maka-enroll",
            "pwede pa ba ko maka-eskwela sa BukSU bisan wala ko nakapasar sa CAT",
            "napakyas ko sa BukSU CAT exam, naa pa bay laing paagi para maka-enroll",
            "naa pa bay chance maka-enroll bisan wala ko nakapasar sa BukSU CAT",
            "unsa akong buhaton kung wala ko nakapasar sa BukSU entrance exam",
            "pwede ba ang estudyante mo-apply sa affirmative program",
            "pwede ba ko mo-apply sa affirmative action program kung napakyas ko sa CAT",
            "naa pa ba koy chance kung mapakyas ko sa BukSU CAT exam",
            "available ba ang affirmative action para sa mga estudyante nga wala nakapasar sa CAT",
            "kung mapakyas ko sa exam, makasulod pa ba ko sa BukSU",
            "naa pa bay laing option kung wala ko nakapasar sa BukSU CAT",
            "pwede pa ba ko maka-enroll pinaagi sa AAP bisan wala ko nakapasar sa exam",
            "unsa akong mga kapilian kung napakyas ko sa BukSU CAT exam",
            "tugotan ba sa BukSU ang mga estudyante nga napakyas sa CAT nga maka-enroll",
            "makasulod ba ko sa BukSU bisan wala ko nakapasar sa entrance test",
            "posible ba maka-enroll bisan napakyas ko sa BukSU admission test"
        ],
        "strong_keywords": [
            "fail", "failed", "didnt pass", "did not pass", "not pass",
            "napakyas", "wala nakapasar", "mapakyas",

            "affirmative", "aap", "affirmative action",

            "chance", "another way", "options", "possible",
            "laing paagi", "chance", "kapilian"
        ],
        "weak_keywords": [
            "buksu", "cat", "exam", "entrance", "admission", "test",
            "enroll", "enrollment", "study", "enter", "sulod",
            "eskwela", "maka-enroll", "makasulod",

            "program", "apply", "mo-apply",
            "unsa", "what", "if", "kung", "pwede"
        ],
        "required_context": []
    },
}