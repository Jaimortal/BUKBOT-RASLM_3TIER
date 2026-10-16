# BukSU Chatbot — "Process / Procedures" Edge-Gap Test Question Bank
**Scope**: 100% strictly grounded in **current ready production data** (`rasa/data/nlu.yml` and `rasa/actions/knowledge/**/*.json`).  
**Purpose**: Pre-update vs. Post-update comparison benchmark to test every topic and subtopic under the **Process / Procedures** category, including English, Cebuano/Bisaya, Mixed/Taglish, conversational edge cases, typos, and intent-boundary overlaps (`ask_process` vs `ask_document` / `ask_requirement` / `ask_location` / `ask_schedule`).

---

## How to Use This Benchmark for Comparison
For each question below, test it against:
1. **Current Production Model** (`20260825-010246-cheerful-van.tar.gz` / `OV_SMl_Sample`)
2. **Updated Candidate Model** (`Candidate v5`)

Check two things for every test question:
- **NLU Intent Predicted**: Does it classify as `ask_process` (or the appropriate partnered intent)?
- **Knowledge Topic Returned**: Does `action_main_router` return the exact production `intent` answer listed in the table?

---

## Category 1: Enrollment Procedures (`procedures/enrollment_procedures.json` & `nlu.yml`)

### 1.1 General Enrollment & Where to Start (`enrollment_general_process`, `enrollment_where_to_start`, `mixed_enrollment_process`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ENR-01 | Baseline (`nlu.yml`) | What is the process of enrollment at BukSU? | `ask_process` | `enrollment_general_process` |
| ENR-02 | Conversational Edge | I want to enroll in BukSU but I have no idea where to start, what is step 1? | `ask_process` | `enrollment_where_to_start` |
| ENR-03 | Bisaya Edge | Unsaon pag enroll sa BukSU kung magsugod pa lang ko ug wala ko kabalo asa mag una? | `ask_process` | `enrollment_where_to_start` |
| ENR-04 | Onsite / Walk-in Edge | How does the mixed or face-to-face onsite enrollment process work? | `ask_process` | `mixed_enrollment_process` |
| ENR-05 | Bisaya Conversational | Giunsa ang face to face nga proseso sa pag enroll sa campus? | `ask_process` | `mixed_enrollment_process` |
| ENR-06 | Typo / Short Edge | enrolmnt process step by step | `ask_process` | `enrollment_general_process` |

### 1.2 Online Enrollment & Portal Steps (`enrollment_online_system`, `online_enrollment_steps`, `check_portal_enrollment_status`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ENR-07 | Baseline (`nlu.yml`) | What is the process for online enrollment? | `ask_process` | `online_enrollment_steps` |
| ENR-08 | Portal Availability Boundary | Can I enroll online through a specific BukSU enrollment website? | `ask_process` | `enrollment_online_system` |
| ENR-09 | Step-by-Step Edge | What are the exact steps to submit my online enrollment application? | `ask_process` | `online_enrollment_steps` |
| ENR-10 | Bisaya Portal Check | Unsaon nako pag check sa akong enrollment status ug subjects sa BukSU portal? | `ask_process` | `check_portal_enrollment_status` |
| ENR-11 | Verification Edge | How do I verify if my enrollment is already successful in the student portal dashboard? | `ask_process` | `check_portal_enrollment_status` |
| ENR-12 | Mixed Conversational | Asa nga section sa portal nako ma-confirm kung enrolled na ba ko ug makita akong schedule? | `ask_process` | `check_portal_enrollment_status` |

### 1.3 Freshman, Continuing, Returning & Transferee Enrollment (`freshman_enrollment_process`, `continuing_students_enrollment_process`, `returning_students_scope_notice`, `transferee_enrollment`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ENR-13 | Baseline (`nlu.yml`) | How can a freshman enroll at BukSU? | `ask_process` | `freshman_enrollment_process` |
| ENR-14 | Continuing Account Migration | How do continuing students enroll through the admissions portal using account migration? | `ask_process` | `continuing_students_enrollment_process` |
| ENR-15 | Bisaya Continuing Edge | Unsa ang enrollment process para sa continuing students ig login sa admissions portal? | `ask_process` | `continuing_students_enrollment_process` |
| ENR-16 | Returning Student Edge | What is the enrollment process for returning students who stopped for a semester? | `ask_process` | `returning_students_scope_notice` |
| ENR-17 | Transferee Edge | How can a transferee student enroll in BukSU? | `ask_process` | `transferee_enrollment` |
| ENR-18 | Bisaya Transferee | Unsa ang proseso sa pag enroll kung transferee gikan sa laing school? | `ask_process` | `transferee_enrollment` |

### 1.4 Late Enrollment, Approval, Validation & Overload (`late_enrollment`, `enrollment_application_approval`, `enrollment_validation_payment`, `senior_academic_overload`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ENR-19 | Baseline (`nlu.yml`) | Am I allowed to enroll even if it is late, and how do I do late enrollment? | `ask_process` | `late_enrollment` |
| ENR-20 | Late Document Submission | What happens if I submit my enrollment documents late after the schedule? | `ask_process` | `late_enrollment_document_submission` |
| ENR-21 | Post-Approval Next Step | How do I know my enrollment application is approved and how do I download my COR? | `ask_process` | `enrollment_application_approval` |
| ENR-22 | Validation & Payment Step | How do I validate my enrollment and settle payment at Finance? | `ask_process` | `enrollment_validation_payment` |
| ENR-23 | Graduating Overload Edge | How do I apply for senior academic overload of units in my final year? | `ask_process` | `senior_academic_overload` |

### 1.5 Campus Transfer, Double Enrollment, SIAS Claim & CON Nursing Submission (`campus_transfer`, `double_enrollment_policy`, `sias_first_year_claim`, `access_sias`, `con_nursing_requirements_submission`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ENR-24 | Satellite to Main Transfer | Pwede ba ko mobalhin gikan sa satellite campus padulong sa lain nga campus sa BukSU? | `ask_process` | `campus_transfer` |
| ENR-25 | Double Enrollment Edge | Pwede ba ko maka enroll sa BukSU samtang nag eskwela pa ko sa lain nga unibersidad? | `ask_process` | `double_enrollment_policy` |
| ENR-26 | First-Year SIAS Claim | Paano po mag-claim ng SIAS account at default password para sa incoming first year? | `ask_process` | `sias_first_year_claim` |
| ENR-27 | SIAS Access Edge | Unsaon nako pag access ug pag login sa akong BukSU SIAS account? | `ask_process` | `access_sias` |
| ENR-28 | CON Nursing Submission | What is the process of passing and submitting nursing enrollment requirements in CON? | `ask_process` | `con_nursing_requirements_submission` |

---

## Category 2: Admission & BukSU-CAT Procedures (`procedures/admission_procedures.json` & `nlu.yml`)

### 2.1 Applying for Admission & BukSU-CAT (`take_exam`, `cat_online_vs_walkin_application`, `apply_cat_using_mobile_phone`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ADM-01 | Baseline (`nlu.yml`) | How do I apply for admission and take the BukSU-CAT examination? | `ask_process` | `take_exam` |
| ADM-02 | Walk-In vs Online Edge | Is walk-in entrance exam application allowed or is BukSU-CAT strictly online? | `ask_process` | `cat_online_vs_walkin_application` |
| ADM-03 | Bisaya Walk-In Edge | Pwede ba mag walk-in application sa BukSU CAT o online ra jud tanan? | `ask_process` | `cat_online_vs_walkin_application` |
| ADM-04 | Mobile Phone Application | Pwede ba mag apply sa BukSU CAT gamit lang ang cellphone? | `ask_process` | `apply_cat_using_mobile_phone` |
| ADM-05 | Second Courser / ALS Application | How can an ALS graduate or second courser apply for the BukSU-CAT? | `ask_process` | `als_graduate_buksu_cat_application` / `second_courser_cat_application` |

### 2.2 Post-Application Workflow, Pending/Denied Status & Intent to Enroll (`after_admission_application`, `status_application`, `application_pending`, `application_always_denied`, `denied_applications`, `intent_to_enroll_confirm`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ADM-06 | Next Step Edge | Nahuman na nako ang online admission application, unsa na ang sunod buhaton? | `ask_process` | `after_admission_application` |
| ADM-07 | Status Check Edge | Unsaon nako pagkahibalo kung na-accept na ba akong admission application? | `ask_process` | `status_application` |
| ADM-08 | Pending Status Edge | Ngano pending gihapon ang akong admission application status ug unsay buhaton? | `ask_process` | `application_pending` |
| ADM-09 | Rejected / Denied Edge | Why is my admission application always denied or rejected in the portal? | `ask_process` | `application_always_denied` |
| ADM-10 | Testing Site Denial | Ngano gi-deny akong admission application sa testing site? | `ask_process` | `denied_applications` |
| ADM-11 | Confirm Intent to Enroll | How do I confirm my intent to enroll in the admission portal after passing? | `ask_process` | `intent_to_enroll_confirm` |
| ADM-12 | Exam Results Check | How do I know if I passed the BukSU-CAT admission exam? | `ask_process` | `exam_results` / `cat_exam_result` |

### 2.3 Rescheduling, Missed Exam, Full Slots & Course Change (`reschedule_entrance_exam`, `missed_buksu_cat_schedule`, `no_slots`, `additional_slots`, `main_campus_full`, `change_preferred_course_admission_application`, `change_program_after_application`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ADM-13 | Reschedule / Site Change | Can I still reschedule my entrance exam or change my testing site after approval? | `ask_process` | `reschedule_entrance_exam` |
| ADM-14 | Missed Exam Edge | Na-miss nako ang akong BukSU CAT exam schedule, unsa akong pwede buhaton? | `ask_process` | `missed_buksu_cat_schedule` |
| ADM-15 | Retake Policy Edge | Can I retake the BukSU-CAT examination more than once if I failed? | `ask_process` | `cat_retake_policy` |
| ADM-16 | No Slots Available | What should I do if there are no available slots for the BukSU-CAT exam? | `ask_process` | `no_slots` |
| ADM-17 | Main Campus Full Edge | Unsa akong buhaton kung puno na ang slots sa Main Campus? | `ask_process` | `main_campus_full` |
| ADM-18 | Change Course After Submitting | Pwede ba usbon ang akong program choice human sa pag submit sa BukSU CAT application? | `ask_process` | `change_program_after_application` |
| ADM-19 | Change Course After Passing | Can I still change my preferred course even after passing the BukSU-CAT? | `ask_process` | `change_preferred_course_admission_application` |

### 2.4 Test Permit Errors, 2x2 Photo Upload & Portal Troubleshooting (`test_permit_issue`, `test_permit_corrupted`, `test_permit_name_error`, `cannot_upload_2x2_picture`, `system_error`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ADM-20 | Corrupted Test Permit | Dili ma-open ang akong test permit sa akong cellphone kay corrupted, unsaon ni? | `ask_process` | `test_permit_corrupted` |
| ADM-21 | Wrong Name on Permit | What should I do if there is a wrong spelling or error in my name on the test permit? | `ask_process` | `test_permit_name_error` |
| ADM-22 | 2x2 Photo Upload Error | Dili nako ma-upload ang akong 2x2 nga profile picture sa admission portal, unsay buhaton? | `ask_process` | `cannot_upload_2x2_picture` |
| ADM-23 | Website Error Edge | Ngano nag system error ang admission website samtang nag fill up ko? | `ask_process` | `system_error` |
| ADM-24 | Missing Admission Docs | Where and how do I submit my missing admission documents? | `ask_process` / `ask_document` | `missing_admission_documents` |

### 2.5 Admission Accounts, Affirmative Action & Returning Readmission (`admission_account_registration`, `admission_portal_login`, `Change_info_admission`, `Change_Pass_admission`, `affirmative_action`, `non_passer_enrollment_affirmative_action`, `returning_student_readmission_process`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ADM-25 | Create Admission Account | How do I create and register a new BukSU admission account? | `ask_process` | `admission_account_registration` |
| ADM-26 | Change Admission Info | Unsaon pag change sa akong personal info sa admission account? | `ask_process` | `Change_info_admission` |
| ADM-27 | Change Admission Password | Unsaon pag usab sa akong password sa admission portal? | `ask_process` | `Change_Pass_admission` |
| ADM-28 | Affirmative Action (AAP) | How do I apply for the Affirmative Action Program (AAP) at BukSU? | `ask_process` | `affirmative_action` |
| ADM-29 | Non-Passer Cutoff Edge | Pwede pa ba ko mo-enroll pinaagi sa Affirmative Action bisan ubos akong score sa cutoff? | `ask_process` | `non_passer_enrollment_affirmative_action` |
| ADM-30 | Stopped Years Ago Readmission | What if I stopped studying at BukSU years ago, what is the process to come back and readmit? | `ask_process` | `returning_student_readmission_process` |
| ADM-31 | Student Assistant Application | Unsa ang proseso ug asa i-submit ang application para mahimong Student Assistant? | `ask_process` | `student_assistant_application_process` |

---

## Category 3: Academic Transactions & Registrar Procedures (`procedures/academic_transactions.json` & `enrollment_procedures.json`)

### 3.1 Adding / Dropping Subjects & Enrollment Withdrawal (`add_drop_subject`, `withdraw_enrollment_policy`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ACT-01 | Baseline (`nlu.yml`) | What is the adding and dropping subject process at the Registrar? | `ask_process` | `add_drop_subject` |
| ACT-02 | Bisaya Add/Drop Edge | Unsaon pag add o pag drop ug subject ug kinsay mopirma sa form? | `ask_process` | `add_drop_subject` |
| ACT-03 | Baseline Withdrawal (`nlu.yml`) | What is the process for voluntary withdrawal of enrollment? | `ask_process` | `withdraw_enrollment_policy` |
| ACT-04 | Bisaya Withdrawal Edge | Unsaon pag withdraw o pag cancel sa akong enrollment sa Registrar? | `ask_process` | `withdraw_enrollment_policy` |

### 3.2 Certificate of Registration (COR) Request & Validation (`request_cor`, `where_get_cor`, `cor_validation_steps`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ACT-05 | Baseline (`nlu.yml`) | How do I request and download my Certificate of Registration (COR)? | `ask_process` / `ask_document` | `where_get_cor` / `request_cor` |
| ACT-06 | Bisaya COR Request | Unsaon nako pag request og COR sa Registrar o online? | `ask_process` | `request_cor` |
| ACT-07 | Baseline COR Validation (`nlu.yml`) | What are the step-by-step procedures for COR validation? | `ask_process` | `cor_validation_steps` |
| ACT-08 | Conversational Next-Step Edge | Naka-print na ko sa akong COR gikan sa admission portal, unsay sunod buhaton para ma-validate? | `ask_process` | `cor_validation_steps` |
| ACT-09 | Window 7 / Finance Edge | Tabangi ko unsaon pag validate sa akong COR didto sa Finance Window 7 ug Registrar. | `ask_process` | `cor_validation_steps` |

### 3.3 Transcript of Records (TOR) & Early Document Request (`tor_request_for_graduates`, `request_tor_process`, `early_document_request`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ACT-10 | Graduate TOR Request | How do graduates request their Transcript of Records (TOR) at the Registrar? | `ask_process` / `ask_document` | `tor_request_for_graduates` |
| ACT-11 | Detailed Window 1-6 TOR Process | What is the step-by-step process to get my TOR from Registrar Window 1-6, Accounting, and Cashier? | `ask_process` | `request_tor_process` |
| ACT-12 | Bisaya TOR Process | Unsaon pag request ug TOR sa Registrar ug unsay proseso sa pagbayad sa Cashier? | `ask_process` | `tor_request_for_graduates` / `request_tor_process` |
| ACT-13 | Undergraduate Early Request | Pwede ba mag-request ug documents o TOR sa Registrar bisan wala pa ko ka-graduate? | `ask_process` | `early_document_request` |

### 3.4 Graduation Application, Online Clearance & Rehearsal (`graduation_application_process`, `graduating_clearance_requirements`, `graduation_rehearsal_attendance`, `graduation_attendance`, `tracer_study`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ACT-14 | Graduation Application | How do I apply for graduation and file my application in my final semester? | `ask_process` | `graduation_application_process` |
| ACT-15 | Bisaya Graduation Filing | Unsaon pag apply para sa graduation sa BukSU? | `ask_process` | `graduation_application_process` |
| ACT-16 | Online Clearance Steps | How do I process my University Clearance online at clearance.buksu.edu.ph? | `ask_process` / `ask_requirement` | `graduating_clearance_requirements` |
| ACT-17 | Graduation Rehearsal Policy | Obligado ba ko moadto ug mo-attend sa graduation rehearsal? | `ask_process` | `graduation_rehearsal_attendance` |
| ACT-18 | Parents at Graduation | Pwede ba mo-attend ang mga ginikanan ug bisita sa graduation ceremony? | `ask_process` | `graduation_attendance` |
| ACT-19 | Graduate Tracer Study | Unsa man ang tracer study para sa mga graduates ug unsaon pag apil? | `ask_process` | `tracer_study` |

---

## Category 4: Student Service & ICT Procedures (`procedures/student_service_procedures.json` & `nlu.yml`)

### 4.1 Student ID Application, Validation, Lost Replacement & No-ID Entry (`student_id_process`, `id_validation_process`, `lost_student_id_replacement_process`, `campus_entry_without_student_id`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| SSP-01 | Baseline (`nlu.yml`) | How do I get my student ID and what is the process? | `ask_process` | `student_id_process` |
| SSP-02 | Bisaya Student ID (`nlu.yml`) | Unsaon pagkuha sa student ID sa BukSU? | `ask_process` | `student_id_process` |
| SSP-03 | Baseline ID Validation (`nlu.yml`) | How do I validate my student ID every semester? | `ask_process` | `id_validation_process` |
| SSP-04 | Lost Student ID Edge | I lost my student ID, what is the process to replace a lost ID? | `ask_process` | `lost_student_id_replacement_process` |
| SSP-05 | Campus Entry Without ID | How do I enter the campus if I don't have my physical student ID yet? | `ask_process` | `campus_entry_without_student_id` |

### 4.2 ICT Services: Wi-Fi Access, Password Reset & Locked Accounts (`get_wifi_access`, `campus_wifi_access`, `change_portal_password_buksu`, `reset_portal_password_buksu`, `portal_account_locked_issue`, `portal_login_problem`, `update_student_portal_information`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| SSP-06 | Baseline Wi-Fi (`nlu.yml`) | How can I access campus Wi-Fi and get my Wi-Fi credentials? | `ask_process` | `get_wifi_access` / `campus_wifi_access` |
| SSP-07 | Connect to Student Wi-Fi | Can you tell me how students connect to the school Wi-Fi network? | `ask_process` | `campus_wifi_access` |
| SSP-08 | Baseline Password Reset (`nlu.yml`) | How can I reset my portal password if I forgot it? | `ask_process` | `change_portal_password_buksu` |
| SSP-09 | Bisaya Forgot Password | Nakalimot ko sa akong BukSU admission account password, unsaon nako pag recover? | `ask_process` | `reset_portal_password_buksu` |
| SSP-10 | SIAS Forgot Password | How do I reset my SIAS password if I forgot my SIAS login credentials? | `ask_process` | `sias_forgot_password` |
| SSP-11 | Locked Portal Account | Unsa ang angay buhaton kung ma-lock ang akong BukSU student portal account? | `ask_process` | `portal_account_locked_issue` |
| SSP-12 | Portal Login Failure | Ngano dili ko maka-login sa BukSU student portal ug unsa akong angay i-check? | `ask_process` | `portal_login_problem` |
| SSP-13 | Update Profile Info | Asa ug unsaon nako pag edit o pag usab sa akong profile details sa student portal? | `ask_process` | `update_student_portal_information` |

### 4.3 Good Moral, Medical Certificate, Library ID, PE Uniform, College Shirt & Gate Pass (`request_good_moral_certificate_oss`, `clinic_medical_certificate_process`, `library_id_card_replacement`, `pe_uniform_process`, `buy_college_shirt`, `gate_pass_process`, `join_student_organizations_process`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| SSP-14 | Good Moral Request | How do I request a Good Moral Certificate from the Office of Student Services (OSS)? | `ask_process` / `ask_document` | `request_good_moral_certificate_oss` |
| SSP-15 | Clinic Medical Certificate | What is the process for getting a medical certificate at the University Clinic? | `ask_process` / `ask_document` | `clinic_medical_certificate_process` |
| SSP-16 | Baseline Library ID (`nlu.yml`) | Unsaon pagkuha sa library ID card? | `ask_process` | `library_id_card_location` / `library_id_card_requirements` |
| SSP-17 | Lost Library Card Edge | What should I do if I lost my library card and need a replacement? | `ask_process` | `library_id_card_replacement` |
| SSP-18 | PE Uniform Process | How do I get or buy my PE uniform at BukSU? | `ask_process` | `pe_uniform_process` |
| SSP-19 | College Shirt Purchase | How and where can I buy my department college t-shirt? | `ask_process` | `buy_college_shirt` |
| SSP-20 | Vehicle Gate Pass Process | What is the process of getting a gate pass sticker for my vehicle or motorcycle? | `ask_process` | `gate_pass_process` |
| SSP-21 | Join Student Organization | Unsaon pag apil sa mga accredited student organizations o clubs panahon sa Org Fair? | `ask_process` | `join_student_organizations_process` |

---

## Category 5: Academic Policies, Grading, Shifting & Clinic/Library/OSS Workflows (Other Production JSONs)

### 5.1 Grades Access, INC Completion & FDA Resolution (`academics/grading_and_retention.json`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ACD-01 | View Grades in SIAS | How do I check and view my semester grades in the SIAS portal? | `ask_process` | `access_grades` |
| ACD-02 | Baseline INC Completion (`nlu.yml`) | How do I complete an INC (Incomplete) grade and process the INC form? | `ask_process` | `inc_grade_solution` |
| ACD-03 | Bisaya INC Completion | Unsaon pag complete sa akong INC nga grado sa subject? | `ask_process` | `inc_grade_solution` |
| ACD-04 | FDA Grade Resolution | What should I do if I receive an FDA (Failure Due to Absences) grade? | `ask_process` | `fda_solution` |
| ACD-05 | Retake Failed Subject | What is the process if I failed a subject for the first time and need to retake it? | `ask_process` | `failed_subject_policy` |

### 5.2 Course Shifting & Class Schedule Changes (`academics/degree_programs.json` & `academics/classroom_policies.json`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| ACD-06 | Baseline Course Shifting (`nlu.yml`) | How do I shift to another course or program next semester? | `ask_process` | `course_shifting` / `shift_to_another_course_next_school_year` |
| ACD-07 | 3rd Year Shifting Edge | Pwede ba ko maka-shift og course bisan 3rd year student na ko sa BukSU, ug unsaon? | `ask_process` | `course_shifting_later_years` |
| ACD-08 | Change Class Section / Conflict | Can a freshman request to transfer to another section or change class schedules due to conflict? | `ask_process` | `change_section_schedule_conflict` |
| ACD-09 | Check / Adjust Schedule | How do I check or adjust my class schedule in my department? | `ask_process` | `class_schedule_help` / `change_class_schedule` |

### 5.3 Clinic Dental Requests, Library Borrowing & OSS Scholarships (`services/clinic_services.json`, `services/library_services.json`, `services/oss_student_services.json`)
| ID | Edge-Gap Type | Test Question | Expected NLU Intent | Expected Knowledge Topic (`intent`) |
|:---|:---|:---|:---|:---|
| SRV-01 | Baseline Dental Consult (`nlu.yml`) | How do I request a dental consultation at the clinic? | `ask_process` | `request_dental_consult` |
| SRV-02 | Baseline Dental Oral Exam (`nlu.yml`) | How do I request a dental oral examination? | `ask_process` | `request_dental_oral_examination` |
| SRV-03 | Tooth Extraction Process | What is the process to request a tooth extraction at the university dental clinic? | `ask_process` | `request_tooth_extraction` |
| SRV-04 | Borrow Library Books | What is the process of borrowing books from the BukSU library? | `ask_process` | `library_borrow_books_process` |
| SRV-05 | Return Library Books | How and where do I return borrowed library books? | `ask_process` | `library_return_books_process` |
| SRV-06 | Apply for Scholarship | How can I apply for a scholarship at BukSU? | `ask_process` | `scholarship_application` |
| SRV-07 | Apply for TES Grant | Unsaon pag apply sa Tertiary Education Subsidy (TES) scholarship? | `ask_process` | `tes_application_process` |
| SRV-08 | TES Grantee Selection | How is the selection process of TES grantees done? | `ask_process` | `tes_grantee_selection_process` |

---

## Summary Count of Edge-Gap Process Test Questions
- **Category 1 (Enrollment Procedures)**: 28 test questions
- **Category 2 (Admission & BukSU-CAT Procedures)**: 31 test questions
- **Category 3 (Academic Transactions & Registrar)**: 19 test questions
- **Category 4 (Student Services, ID & ICT Procedures)**: 21 test questions
- **Category 5 (Grading, Shifting, Clinic, Library & Scholarships)**: 17 test questions
- **Total Production-Grounded Process Edge-Gap Questions**: **116 categorized questions**

