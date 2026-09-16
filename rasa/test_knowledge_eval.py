"""
Comprehensive Knowledge Evaluation Suite for Academics, Procedures, and Services.
Tests end-user unfamiliar queries (conversational, Cebuano, synonyms, indirect questions)
against MainRouterService to ensure 100% resolution accuracy, zero intent overlap,
and clear tracking of whether Direct Rule, RASA NLU, or LLM Reranker resolved each query.
"""

import os
import sys
import time
import io
from contextlib import redirect_stdout

ACTIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "actions")
sys.path.insert(0, ACTIONS_DIR)

from main_router import MainRouterService
from actions import LOCATION_ALIASES, ActionReplyFromJsonHelper

TEST_CASES = [
    # =========================================================================
    # 1. ACADEMICS CATEGORY
    # =========================================================================
    # Degree Programs & Course Overviews
    {
        "category": "academics",
        "expected_topics": {"buksu_bsit_program", "bsit", "buksu_IT"},
        "query": "Tell me what kind of subjects and training are included in information tech degree",
        "desc": "BSIT degree overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_bsit_program", "bsit", "buksu_IT"},
        "query": "unsa ang mga ginatudlo sa kursong BSIT",
        "desc": "BSIT degree overview in Cebuano"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSN_program", "bsn", "buksu_BSN"},
        "query": "What are the core competencies taught in nursing here",
        "desc": "BS Nursing overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSA_program", "bsa", "buksu_BSA"},
        "query": "How is the accountancy program structured for aspiring CPAs",
        "desc": "BSA Accountancy overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSAT_program", "bsat", "buksu_BSAT"},
        "query": "Do you teach vehicle repair and automotive engine maintenance",
        "desc": "Automotive Tech overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSET_program", "bset", "buksu_ET"},
        "query": "What skills will I learn in the electronics tech bachelor course",
        "desc": "Electronics Tech overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSFT_program", "bsft", "buksu_FT"},
        "query": "What topics are covered in food processing and manufacturing course",
        "desc": "Food Tech overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BPA_program", "bpa", "buksu_BPA"},
        "query": "Is public governance and government management offered as a program",
        "desc": "Public Administration overview"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BEED_program", "beed", "buksu_BEED"},
        "query": "What is the training for teaching elementary school kids",
        "desc": "BEEd Elementary Education"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BPED_program", "bped", "buksu_BPED"},
        "query": "Which curriculum prepares students to be physical education coaches and sports teachers",
        "desc": "BPEd Physical Education"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSED-MATH_program", "bsed_math", "buksu_BSED_MATH"},
        "query": "What does the high school mathematics teaching major cover",
        "desc": "BSEd Math"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSED-ENG_program", "bsed_eng", "buksu_BSED_ENG"},
        "query": "Overview of secondary education major in english literature",
        "desc": "BSEd English"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_AB-SOCIO_program", "ab_socio", "buksu_AB_SOCIO"},
        "query": "What do students study in sociology bachelor degree",
        "desc": "BA Sociology"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_AB-PHILO_program", "ab_philo", "buksu_AB_PHILO"},
        "query": "What concepts are studied in the philosophy program",
        "desc": "BA Philosophy"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_AB-ECON_program", "ab_econ", "buksu_AB_ECON"},
        "query": "Details regarding economics and market analysis degree",
        "desc": "BA Economics"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSHM_program", "bshm", "buksu_BSHM"},
        "query": "What training is given for hotel and restaurant management students",
        "desc": "BSHM Hospitality Management"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BSBA-FM_program", "bsba_fm", "buksu_BSBA_FM"},
        "query": "Tell me about corporate banking and financial management specialization",
        "desc": "BSBA Financial Management"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BS-ES_program", "bs_es", "buksu_BS_ES"},
        "query": "What will I learn in environmental conservation and ecology degree",
        "desc": "BS Environmental Science"
    },
    {
        "category": "academics",
        "expected_topics": {"buksu_BS COMDEV_program", "bs_comdev", "buksu_BS_COMDEV"},
        "query": "What does the rural community organizing program focus on",
        "desc": "BS Community Development"
    },

    # Subjects & Curriculum Rules
    {
        "category": "academics",
        "expected_topics": {"minor_subject"},
        "query": "What role do minor subjects play and what happens if you fail one",
        "desc": "Minor subject definition"
    },
    {
        "category": "academics",
        "expected_topics": {"prerequisite_subjects_purpose"},
        "query": "Why are there prerequisite courses before higher year subjects",
        "desc": "Prerequisite purpose"
    },
    {
        "category": "academics",
        "expected_topics": {"failed_prerequisite_subject"},
        "query": "what happened if i failed the spacific prerequisit subject?",
        "desc": "Failed prerequisite subject"
    },
    {
        "category": "academics",
        "expected_topics": {"failed_prerequisite_subject"},
        "query": "mabagsak ba ko if nahagbong sa prerequisite unya maka take paba kog advance",
        "desc": "Failed prerequisite in Cebuano"
    },
    {
        "category": "academics",
        "expected_topics": {"midterm_and_final_exam_rules"},
        "query": "What are the rules and guidelines for Midterm and Final Examinations",
        "desc": "Exam rules"
    },
    {
        "category": "academics",
        "expected_topics": {"general_curriculum_subjects", "course_catalog", "buksu_courses_offered", "buksu_courses_offered_list"},
        "query": "What are the mandatory general education subjects for all undergrads",
        "desc": "General Education Curriculum"
    },
    {
        "category": "academics",
        "expected_topics": {"about_nstp"},
        "query": "What is the purpose of the National Service Training Program",
        "desc": "NSTP program overview"
    },
    {
        "category": "academics",
        "expected_topics": {"rotc_meaning", "about_nstp"},
        "query": "What does ROTC stand for and what is its goal",
        "desc": "ROTC meaning"
    },
    {
        "category": "academics",
        "expected_topics": {"course_shifting_and_training", "course_shifting", "program_shifting_policy"},
        "query": "Can a student shift to another course program after first year",
        "desc": "Course shifting"
    },

    # Grading, Retention & Honors
    {
        "category": "academics",
        "expected_topics": {"grading_system", "buksu_grading_system"},
        "query": "How are percentage scores converted into numerical grades from 1.0 to 5.0",
        "desc": "Numerical grading system"
    },
    {
        "category": "academics",
        "expected_topics": {"inc_grade_rules", "inc_grade"},
        "query": "How long do I have to clear and complete an incomplete INC mark",
        "desc": "INC Grade completion"
    },
    {
        "category": "academics",
        "expected_topics": {"failed_subject_policy", "academic_standing"},
        "query": "What is the policy when a student receives a failing grade of 5.0 in a course",
        "desc": "Failed subject policy"
    },
    {
        "category": "academics",
        "expected_topics": {"attendance_fda", "fda_meaning"},
        "query": "What is Failure Due to Absences FDA rule for missing lectures",
        "desc": "FDA attendance policy"
    },
    {
        "category": "academics",
        "expected_topics": {"academic_honors", "deans_list", "College_Honors_gpa"},
        "query": "What grade weighted average is required to qualify as Dean's Lister",
        "desc": "Dean's Lister honor"
    },
    {
        "category": "academics",
        "expected_topics": {"latin_honors_graduation_requirements", "latin_honors_average_gpa", "buksu_graduation_honors"},
        "query": "What are the rules and GPA cutoffs for Summa, Magna, and Cum Laude",
        "desc": "Latin honors criteria"
    },
    {
        "category": "academics",
        "expected_topics": {"subject_overload", "overload_units_policy"},
        "query": "Can graduating seniors overload additional academic units",
        "desc": "Overloading policy"
    },
    {
        "category": "academics",
        "expected_topics": {"summer_classes_policy"},
        "query": "Are midyear or summer classes permitted for back subjects",
        "desc": "Summer classes policy"
    },
    {
        "category": "academics",
        "expected_topics": {"academic_calendar_exam_schedules"},
        "query": "When is the official midterm examination schedule posted on the calendar",
        "desc": "Exam calendar dates"
    },
    {
        "category": "academics",
        "expected_topics": {"classroom_policies", "phone_use_in_class"},
        "query": "Are students allowed to use smartphones during professor lectures",
        "desc": "Classroom phone policy"
    },
    {
        "category": "academics",
        "expected_topics": {"classroom_policies", "eating_in_classroom"},
        "query": "Is snacking and drinking permitted inside regular classrooms and labs",
        "desc": "Food and drink policy in class"
    },
    {
        "category": "academics",
        "expected_topics": {"board_exam_information", "licensure_examination", "meaning_of_board_course", "buksu_board_courses"},
        "query": "Which degree courses in BukSU have PRC professional licensure exams",
        "desc": "PRC Board exam degrees"
    },

    # =========================================================================
    # 2. PROCEDURES CATEGORY
    # =========================================================================
    # Admission & Testing
    {
        "category": "procedures",
        "expected_topics": {"admission_requirements", "freshman_admission_requirements"},
        "query": "What paperwork and documents do senior high graduates need to submit for college entrance",
        "desc": "Freshman admission requirements"
    },
    {
        "category": "procedures",
        "expected_topics": {"college_admission_test", "buksu_cat_definition"},
        "query": "How do I take the BukSU College Admission Test",
        "desc": "BukSU CAT info"
    },
    {
        "category": "procedures",
        "expected_topics": {"admission_application", "online_application_schedule", "after_admission_application"},
        "query": "What are the step by step instructions to apply online as an applicant",
        "desc": "Admission application steps"
    },
    {
        "category": "procedures",
        "expected_topics": {"program_qualification_scores", "board_course_cutoff_score", "non_board_cutoff_score", "program_cutoff_scores", "Cat_score_for_nonboard"},
        "query": "What is the passing score percentage needed in the CAT exam for quota programs",
        "desc": "Cutoff scores"
    },
    {
        "category": "procedures",
        "expected_topics": {"application_pending", "denied_applications", "status_application"},
        "query": "My admission status is still pending validation, what should I do",
        "desc": "Pending admission status"
    },
    {
        "category": "procedures",
        "expected_topics": {"test_permit_corrupted", "test_permit_issue"},
        "query": "My downloaded examination permit PDF is corrupted and won't open",
        "desc": "Corrupted test permit"
    },
    {
        "category": "procedures",
        "expected_topics": {"test_permit_name_error", "test_permit_issue"},
        "query": "There is a typo in my name on the printed CAT test permit",
        "desc": "Name error on test permit"
    },
    {
        "category": "procedures",
        "expected_topics": {"cannot_upload_2x2_picture"},
        "query": "The admission portal keeps giving an error when uploading my 2x2 ID photo",
        "desc": "Photo upload error"
    },
    {
        "category": "procedures",
        "expected_topics": {"missed_buksu_cat_schedule", "reschedule_entrance_exam"},
        "query": "I failed to show up on my scheduled entrance exam date, can I reschedule",
        "desc": "Missed CAT schedule"
    },
    {
        "category": "procedures",
        "expected_topics": {"affirmative_action_program_admission", "affirmative_action", "non_passer_enrollment_affirmative_action"},
        "query": "How does the Affirmative Action Program AAP help indigenous and underprivileged applicants",
        "desc": "Affirmative action admission"
    },
    {
        "category": "procedures",
        "expected_topics": {"transferee_admission_requirements"},
        "query": "What are the admission rules for students transferring from another college",
        "desc": "Transferee requirements"
    },
    {
        "category": "procedures",
        "expected_topics": {"second_courser_requirements", "second_courser_cat_application"},
        "query": "What documents are required for degree holders applying for a second course",
        "desc": "Second courser admission"
    },
    {
        "category": "procedures",
        "expected_topics": {"returning_student_readmission_process", "returning_students_scope_notice"},
        "query": "How do returning students apply for readmission after taking a leave of absence",
        "desc": "Returning student readmission"
    },
    {
        "category": "procedures",
        "expected_topics": {"student_assistant_application_process", "student_assistant_application"},
        "query": "What is the procedure to become a student assistant on campus to work while studying",
        "desc": "Student assistant application"
    },

    # Enrollment & Academic Transactions
    {
        "category": "procedures",
        "expected_topics": {"enrollment_process", "enrollment_general_process", "online_enrollment_steps"},
        "query": "Walk me through the full steps of enrolling for the new semester",
        "desc": "Enrollment steps"
    },
    {
        "category": "procedures",
        "expected_topics": {"enrollment_general_process"},
        "query": "how to enroll in BSA",
        "desc": "Course specific enrollment process"
    },
    {
        "category": "procedures",
        "expected_topics": {"enrollment_requirements", "enrollment_documents"},
        "query": "What papers do I need to bring for enrollment registration",
        "desc": "Enrollment requirements"
    },
    {
        "category": "procedures",
        "expected_topics": {"freshman_enrollment_process", "enrollment_documents", "enrollment_requirements"},
        "query": "what are the requirements to enroll in BSA",
        "desc": "Course specific enrollment requirements"
    },
    {
        "category": "procedures",
        "expected_topics": {"enrollment_fees", "enrollment_validation_payment", "student_fees"},
        "query": "Is there any payment or fee needed during semester enrollment",
        "desc": "Enrollment fees"
    },
    {
        "category": "procedures",
        "expected_topics": {"sias_access", "sias_first_year_claim", "Find_Sias_Account"},
        "query": "How do first year freshies get their SIAS student portal login account",
        "desc": "Freshmen SIAS claim"
    },
    {
        "category": "procedures",
        "expected_topics": {"sias_forgot_password", "sias_access"},
        "query": "I cannot remember my SIAS portal password, how to reset it",
        "desc": "SIAS forgot password"
    },
    {
        "category": "procedures",
        "expected_topics": {"check_portal_enrollment_status"},
        "query": "How can I verify on SIAS if my enrolled subjects are officially confirmed",
        "desc": "Check enrollment status on portal"
    },
    {
        "category": "procedures",
        "expected_topics": {"add_drop_subject"},
        "query": "How do I officially add or drop a subject after the semester starts",
        "desc": "Adding and dropping subjects"
    },
    {
        "category": "procedures",
        "expected_topics": {"withdrawal", "withdraw_enrollment_policy"},
        "query": "What is the procedure if I want to formally withdraw my enrollment from BukSU",
        "desc": "Enrollment withdrawal"
    },
    {
        "category": "procedures",
        "expected_topics": {"cor_validation", "cor_validation_steps", "cor_validation_location", "where_get_cor"},
        "query": "Where and how do I get my Certificate of Registration COR signed or validated",
        "desc": "COR validation"
    },
    {
        "category": "procedures",
        "expected_topics": {"registrar_documents", "request_cor", "where_get_cor"},
        "query": "How can I obtain a copy of my Certificate of Registration",
        "desc": "Request COR"
    },
    {
        "category": "procedures",
        "expected_topics": {"request_tor_process", "tor_request_for_graduates"},
        "query": "What is the procedure to request an official Transcript of Records from Registrar",
        "desc": "TOR request"
    },
    {
        "category": "procedures",
        "expected_topics": {"graduation_clearance", "graduating_clearance_requirements", "graduation_application_process"},
        "query": "What are the clearance steps required for graduating students",
        "desc": "Graduation clearance"
    },
    {
        "category": "procedures",
        "expected_topics": {"transfer_and_enrollment_policy", "transferee_enrollment"},
        "query": "How does the crediting and enrollment work for transferee students",
        "desc": "Transferee enrollment"
    },

    # Student Service Procedures
    {
        "category": "procedures",
        "expected_topics": {"student_id", "student_id_process", "student_id_requirements"},
        "query": "How do newly admitted students process and get their physical school ID",
        "desc": "Student ID issuance"
    },
    {
        "category": "procedures",
        "expected_topics": {"lost_student_id_replacement_process", "student_id_replacement"},
        "query": "What steps are required to replace a lost BukSU student ID card",
        "desc": "Lost student ID replacement"
    },
    {
        "category": "procedures",
        "expected_topics": {"good_moral_certificate", "request_good_moral_certificate_oss", "good_moral_certificate_fee"},
        "query": "How do I apply for a Certificate of Good Moral Character from OSS",
        "desc": "Good moral cert"
    },
    {
        "category": "procedures",
        "expected_topics": {"medical_certificate", "clinic_medical_certificate_process", "clinic_medical_certificate_cost"},
        "query": "What is the process to secure a medical health clearance from university clinic",
        "desc": "Medical clearance request"
    },
    {
        "category": "procedures",
        "expected_topics": {"gate_pass_policy", "general_gate_pass", "gate_pass_process", "bike_gate_pass", "campus_entry_without_student_id"},
        "query": "What should I do if I forgot my student ID and need a temporary gate pass to enter",
        "desc": "Gate pass policy"
    },
    {
        "category": "procedures",
        "expected_topics": {"pe_uniform", "pe_uniform_process", "pe_uniform_old_allowed", "pe_uniform_store_schedule"},
        "query": "Where and how can students buy and claim the official PE uniform",
        "desc": "PE uniform process"
    },
    {
        "category": "procedures",
        "expected_topics": {"college_shirt", "buy_college_shirt", "college_shirt_allowed"},
        "query": "When are college department shirts worn and where to get them",
        "desc": "College shirt info"
    },
    {
        "category": "procedures",
        "expected_topics": {"library_id_card", "library_id_card_requirements", "library_id_card_location", "library_id_card_payment"},
        "query": "How do students activate or register for library borrowing privileges",
        "desc": "Library card registration"
    },
    {
        "category": "procedures",
        "expected_topics": {"scholarship", "scholarship_application", "available_scholarships_buksu"},
        "query": "How do I apply for institutional and government educational scholarships",
        "desc": "Scholarship application guidance"
    },
    {
        "category": "procedures",
        "expected_topics": {"join_student_organizations_process", "student_organizations_application_process", "student_organizations"},
        "query": "How can a student sign up to become a member of an accredited campus club",
        "desc": "Join student organizations"
    },
    {
        "category": "procedures",
        "expected_topics": {"new_student_orientation_purpose"},
        "query": "Why is attending the freshman student orientation mandatory",
        "desc": "Orientation purpose"
    },
    {
        "category": "procedures",
        "expected_topics": {"freshmen_intramurals", "about_intramurals", "intramurals_week_classes"},
        "query": "Are first-year freshman students allowed to join sports competitions during University Days",
        "desc": "Freshmen intramurals participation"
    },

    # =========================================================================
    # 3. SERVICES CATEGORY
    # =========================================================================
    # Clinic & Health Services
    {
        "category": "services",
        "expected_topics": {"health_services_unit_location_hours", "university_clinic", "medic_clinic", "buksu_med_loc"},
        "query": "What time is the campus medical clinic open and what are its operating hours",
        "desc": "Clinic hours & location"
    },
    {
        "category": "services",
        "expected_topics": {"buksu_clinic_services", "university_clinic", "medic_clinic"},
        "query": "What free first aid and emergency consultations are available at the clinic",
        "desc": "First aid & clinic services"
    },
    {
        "category": "services",
        "expected_topics": {"dental_services", "buksu_medical_dental_services", "dental_services_menu", "dental_clinic_direct_ask"},
        "query": "Does the school dentist provide tooth extraction and oral checkups for students",
        "desc": "Dental clinic services"
    },
    {
        "category": "services",
        "expected_topics": {"dental_services", "request_tooth_extraction", "dental_services_menu", "request_dental_consult"},
        "query": "How do I schedule an appointment to have a tooth pulled at the dental clinic",
        "desc": "Tooth extraction request"
    },
    {
        "category": "services",
        "expected_topics": {"student_stress_support", "guidance_counseling_services_buksu", "ask_guidance_services"},
        "query": "Where can a student go for mental wellness support and stress relief counseling",
        "desc": "Mental health & stress support"
    },

    # Dormitories
    {
        "category": "services",
        "expected_topics": {"campus_dormitories", "buksu_dormitory_information", "number_of_dormitories"},
        "query": "What student housing and residence halls are available inside the university",
        "desc": "Campus dormitories overview"
    },
    {
        "category": "services",
        "expected_topics": {"campus_dormitories", "male_dorm", "buksu_dormitory_information"},
        "query": "Tell me about the Mahogany Hall on-campus residence for boys",
        "desc": "Mahogany male dorm"
    },
    {
        "category": "services",
        "expected_topics": {"campus_dormitories", "female_dorm", "buksu_dormitory_information"},
        "query": "What are the accommodations and rules at Rubia Hall for female boarders",
        "desc": "Rubia female dorm"
    },

    # Library Services
    {
        "category": "services",
        "expected_topics": {"library_hours", "buksu_library_hours"},
        "query": "What are the opening and closing schedules of the University Library",
        "desc": "Library hours"
    },
    {
        "category": "services",
        "expected_topics": {"library_book_borrowing_rules", "library_borrowing", "library_borrow_books", "library_borrow_books_process"},
        "query": "How many books can an undergraduate student take home and for how many days",
        "desc": "Library borrowing rules"
    },
    {
        "category": "services",
        "expected_topics": {"library_return_books", "library_return_books_process", "library_borrowing"},
        "query": "Where and how do I hand back borrowed books to the circulation counter",
        "desc": "Returning library books"
    },
    {
        "category": "services",
        "expected_topics": {"library_late_return_penalty", "library_borrowing"},
        "query": "How much is the overdue fine charged for late returned library books",
        "desc": "Library overdue penalty"
    },
    {
        "category": "services",
        "expected_topics": {"library_available_books_info", "library_available_books", "access_buksu_library_resources"},
        "query": "What reference collections, dissertations, and textbooks does the library hold",
        "desc": "Available books & collections"
    },

    # Office of Student Services (OSS) & Campus Life
    {
        "category": "services",
        "expected_topics": {"guidance_counseling_services_buksu", "ask_guidance_services", "ask_how_to_avail_guidance"},
        "query": "What counseling and personality testing services are offered by the Guidance Center",
        "desc": "Guidance counseling overview"
    },
    {
        "category": "services",
        "expected_topics": {"ask_guidance_fee", "guidance_counseling_services_buksu"},
        "query": "Is there any payment charged for personal psychological counseling sessions",
        "desc": "Guidance fee"
    },
    {
        "category": "services",
        "expected_topics": {"scholarships_and_financial_grants", "available_scholarships_buksu", "contact_scholarship_unit", "scholarship_application"},
        "query": "Where is the Scholarships and Financial Grants Unit located and what grants do they handle",
        "desc": "Scholarships unit overview"
    },
    {
        "category": "services",
        "expected_topics": {"free_tuition_undergraduate_buksu"},
        "query": "How does the Universal Access to Quality Tertiary Education Act cover my tuition",
        "desc": "Free tuition law"
    },
    {
        "category": "services",
        "expected_topics": {"pwd_student_assistance_services"},
        "query": "What accessibility accommodations are provided for students with disabilities PWD",
        "desc": "PWD assistance services"
    },
    {
        "category": "services",
        "expected_topics": {"lost_and_found_buksu"},
        "query": "Where do I claim items and valuables lost or misplaced inside the university campus",
        "desc": "Lost and Found Center"
    },
    {
        "category": "services",
        "expected_topics": {"student_grievance_and_complaints_process"},
        "query": "How do I file a formal complaint if I experience bullying or harassment from peers",
        "desc": "Student grievance & anti-bullying"
    },
    {
        "category": "services",
        "expected_topics": {"supreme_student_council_joining_info", "student_organizations"},
        "query": "How does a student run for office or join the Supreme Student Council SSC",
        "desc": "Supreme Student Council"
    },
    {
        "category": "services",
        "expected_topics": {"kaugmaon_student_publication_application"},
        "query": "How can I apply to become a writer or photojournalist for the Kaugmaon campus newspaper",
        "desc": "Kaugmaon student publication"
    },
    {
        "category": "services",
        "expected_topics": {"buksu_varsity_and_sports_teams"},
        "query": "What athletic teams and varsity tryouts are available for sports enthusiasts",
        "desc": "Varsity sports teams"
    },
    {
        "category": "services",
        "expected_topics": {"campus_dress_code", "wear_civilian_attire", "campus_dress_code_policy"},
        "query": "What is the proper campus dress code and clothing policy on non-uniform wash days",
        "desc": "Campus dress code"
    },
    {
        "category": "services",
        "expected_topics": {"institutional_email_info", "Find_Institutional_Account"},
        "query": "What is the official BukSU Google Workspace student email used for",
        "desc": "Institutional email info"
    },
]

def run_evaluation():
    print("=" * 80, flush=True)
    print("STARTING END-USER KNOWLEDGE EVALUATION (ACADEMICS, PROCEDURES, SERVICES)", flush=True)
    print("=" * 80, flush=True)

    t0 = time.time()
    helper = ActionReplyFromJsonHelper()
    router = MainRouterService(helper, LOCATION_ALIASES)
    print(f"Router initialized in {time.time() - t0:.2f}s\n", flush=True)

    tallies = {
        "DIRECT_RULE": 0,
        "RASA_HIGH": 0,
        "RASA_MED": 0,
        "LLM_TAKEOVER": 0,
        "CLARIFICATION": 0,
        "FALLBACK": 0,
        "MISMATCH": 0,
    }

    category_stats = {
        "academics": {"total": 0, "pass": 0, "fail": 0},
        "procedures": {"total": 0, "pass": 0, "fail": 0},
        "services": {"total": 0, "pass": 0, "fail": 0}
    }

    results = []

    for idx, tc in enumerate(TEST_CASES, 1):
        cat = tc["category"]
        expected_set = tc["expected_topics"]
        query = tc["query"]
        desc = tc["desc"]

        category_stats[cat]["total"] += 1

        buf = io.StringIO()
        with redirect_stdout(buf):
            slots = {"active_category": cat}
            response, updated_slots = router.route_with_context(
                intent="ask_knowledge",
                latest_message={},
                user_message=query,
                slots=slots
            )
        output_logs = buf.getvalue()

        # Identify Resolver
        resolver = "UNKNOWN"
        if "[ROUTER - DIRECT POINT DATA GRAB]" in output_logs or "[ROUTER - LAYER 1: Direct Rule Override]" in output_logs:
            resolver = "DIRECT_RULE"
        elif "[RASA NLU - HIGH CONFIDENCE]" in output_logs:
            resolver = "RASA_HIGH"
        elif "[RASA NLU - MEDIUM CONFIDENCE]" in output_logs:
            resolver = "RASA_MED"
        elif "[LLM MATCH - TAKEOVER]" in output_logs:
            resolver = "LLM_TAKEOVER"
        elif "[ROUTER - CLARIFICATION]" in output_logs:
            resolver = "CLARIFICATION"
        elif "[ROUTER - DOMAIN FALLBACK]" in output_logs or "I'm sorry, I couldn't find" in str(response):
            resolver = "FALLBACK"
        else:
            sel = getattr(router.knowledge_router, "last_selected_intent", None)
            if sel:
                resolver = "DIRECT_RULE"
            else:
                resolver = "FALLBACK"

        selected_intent = getattr(router.knowledge_router, "last_selected_intent", None)

        is_pass = False
        if selected_intent in expected_set:
            is_pass = True
        elif response and isinstance(response, dict) and response.get("text"):
            # Check if response text meaningfully matches the expected domain topic
            text = response["text"].lower()
            for exp in expected_set:
                norm_exp = exp.replace("_", " ").replace("-", " ")
                if norm_exp in text or exp in text:
                    is_pass = True
                    break

        if is_pass:
            tallies[resolver] = tallies.get(resolver, 0) + 1
            category_stats[cat]["pass"] += 1
            status_tag = f"[PASS - {resolver}]"
        else:
            if resolver == "FALLBACK":
                tallies["FALLBACK"] += 1
            else:
                tallies["MISMATCH"] += 1
            category_stats[cat]["fail"] += 1
            status_tag = f"[FAIL - {resolver}]"

        results.append({
            "idx": idx,
            "category": cat,
            "desc": desc,
            "query": query,
            "expected": expected_set,
            "matched": selected_intent,
            "resolver": resolver,
            "is_pass": is_pass,
            "status_tag": status_tag,
            "response_text": (response.get("text", "") if isinstance(response, dict) else str(response))[:120].replace("\n", " ")
        })

        print(f"{idx:02d}. {status_tag:<22} [{cat.upper():10s}] {query[:42]:<42} -> {selected_intent}", flush=True)

    print("\n" + "=" * 80, flush=True)
    print("KNOWLEDGE EVALUATION RESULTS SUMMARY", flush=True)
    print("=" * 80, flush=True)

    total_tested = len(results)
    total_passed = sum(1 for r in results if r["is_pass"])
    total_failed = total_tested - total_passed
    accuracy = (total_passed / total_tested * 100) if total_tested > 0 else 0

    print(f"Total Test Cases: {total_tested}", flush=True)
    print(f"Passed:           {total_passed} ({accuracy:.2f}%)", flush=True)
    print(f"Failed:           {total_failed} ({100 - accuracy:.2f}%)", flush=True)
    print("-" * 80, flush=True)

    print("WHO ANSWERED THE QUERY (Resolver Attribution):", flush=True)
    print(f"  * DIRECT_RULE  (Layer 1 Direct Intent / Fast Path):   {tallies.get('DIRECT_RULE', 0):2d} ({tallies.get('DIRECT_RULE', 0)/total_tested*100:5.1f}%)", flush=True)
    print(f"  * RASA_HIGH    (Layer 2 RASA Retrieval High Conf):    {tallies.get('RASA_HIGH', 0):2d} ({tallies.get('RASA_HIGH', 0)/total_tested*100:5.1f}%)", flush=True)
    print(f"  * RASA_MED     (Layer 2 RASA Retrieval Med Conf):     {tallies.get('RASA_MED', 0):2d} ({tallies.get('RASA_MED', 0)/total_tested*100:5.1f}%)", flush=True)
    print(f"  * LLM_TAKEOVER (Layer 3 Groq LLM Reranker AI Choice):  {tallies.get('LLM_TAKEOVER', 0):2d} ({tallies.get('LLM_TAKEOVER', 0)/total_tested*100:5.1f}%)", flush=True)
    print(f"  * CLARIFICATION(Interactive Disambiguation Buttons):   {tallies.get('CLARIFICATION', 0):2d} ({tallies.get('CLARIFICATION', 0)/total_tested*100:5.1f}%)", flush=True)
    print(f"  * FALLBACK     (Unmatched Query / Fallback Handler):  {tallies.get('FALLBACK', 0):2d} ({tallies.get('FALLBACK', 0)/total_tested*100:5.1f}%)", flush=True)
    print(f"  * MISMATCH     (Collided with Wrong Topic):           {tallies.get('MISMATCH', 0):2d} ({tallies.get('MISMATCH', 0)/total_tested*100:5.1f}%)", flush=True)
    print("-" * 80, flush=True)

    print("PER-CATEGORY ACCURACY BREAKDOWN:", flush=True)
    for c_name, st in category_stats.items():
        c_tot = st["total"]
        c_acc = (st["pass"] / c_tot * 100) if c_tot > 0 else 0
        print(f"  * {c_name.upper():12s}: {st['pass']}/{c_tot} passed ({c_acc:5.1f}%) [Fails: {st['fail']}]", flush=True)

    if total_failed > 0:
        print("\n" + "=" * 80, flush=True)
        print("INVESTIGATION OF FAILING / OVERLAPPING CASES:", flush=True)
        print("=" * 80, flush=True)
        for r in results:
            if not r["is_pass"]:
                print(f"[{r['category'].upper()}] Query #{r['idx']}: '{r['query']}'", flush=True)
                print(f"   - Expected Topic(s): {r['expected']}", flush=True)
                print(f"   - Matched Topic:     {r['matched']}", flush=True)
                print(f"   - Resolver:          {r['resolver']}", flush=True)
                print(f"   - Response Snippet:  {r['response_text']}...", flush=True)
                print("-" * 40, flush=True)

if __name__ == "__main__":
    run_evaluation()
