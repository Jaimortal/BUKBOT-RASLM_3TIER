# BukSU Chatbot — Ready-Production Evaluation Report (`Process` Edge-Gap Benchmark)

## 1. Executive Summary & Overall Accuracy Level

- **Evaluated Production Model**: `rasa/Backup_version/OV_SMl_Sample/models/20260825-010246-cheerful-van.tar.gz` *(Active Ready-Production Model)*
- **Production NLU Data**: `rasa/data/nlu.yml` (`55` training examples under `ask_process`)
- **Benchmark Test Set**: [`PROCESS_EDGE_GAP_TEST_QUESTIONS.md`](PROCESS_EDGE_GAP_TEST_QUESTIONS.md) (**116 production-grounded questions**)

| Accuracy Metric | Correct / Total | **Accuracy Level (%)** | What This Means |
|:---|:---:|:---:|:---|
| **Strict `ask_process` NLU Accuracy** | **87 / 116** | **75.00%** | Exact match where the ready-production NLU model predicts `ask_process` |
| **Acceptable Boundary NLU Accuracy** | **90 / 116** | **77.59%** | Includes dual-intent document/requirement process questions |
| **Knowledge Topic Match Accuracy (`KnowledgeRouter`)** | **68 / 116** | **58.62%** | Exact match on the expected JSON knowledge `intent` topic |
| **Downstream `action_main_router` Reach Rate** | **113 / 116** | **97.41%** | Queries routed to `action_main_router` (not lost to fallback/goodbye) |
| **Mean NLU Prediction Confidence** | — | **89.16%** (`0.8916`) | Average DIETClassifier confidence across all 116 questions |

---

## 2. Accuracy Level Breakdown by Category

| Category | Questions | Strict `ask_process` Correct | **Strict NLU Accuracy (%)** | Acceptable NLU Correct | **Acceptable NLU Accuracy (%)** | **Knowledge Topic Accuracy (%)** | Avg Confidence |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Category 1: Enrollment Procedures (`procedures/enrollment_procedures.json` & `nlu.yml`) | 28 | 23/28 | **82.14%** | 23/28 | **82.14%** | **12/28 (42.86%)** | 91.78% |
| Category 2: Admission & BukSU-CAT Procedures (`procedures/admission_procedures.json` & `nlu.yml`) | 31 | 19/31 | **61.29%** | 20/31 | **64.52%** | **21/31 (67.74%)** | 82.98% |
| Category 3: Academic Transactions & Registrar Procedures (`procedures/academic_transactions.json` & `enrollment_procedures.json`) | 19 | 12/19 | **63.16%** | 13/19 | **68.42%** | **13/19 (68.42%)** | 85.79% |
| Category 4: Student Service & ICT Procedures (`procedures/student_service_procedures.json` & `nlu.yml`) | 21 | 19/21 | **90.48%** | 20/21 | **95.24%** | **13/21 (61.90%)** | 94.24% |
| Category 5: Academic Policies, Grading, Shifting & Clinic/Library/OSS Workflows (Other Production JSONs) | 17 | 14/17 | **82.35%** | 14/17 | **82.35%** | **9/17 (52.94%)** | 93.62% |

---

## 3. Predicted NLU Intent Distribution (Edge-Gap Drift Analysis)

When the ready-production NLU model (`cheerful-van`) was tested on all 116 Process Edge-Gap questions, here is how it classified them:

| Predicted NLU Intent | Count | Share (%) | Interpretation |
|:---|:---:|:---:|:---|
| `ask_process` | 87 | 75.00% | Target intent (Correct) |
| `ask_document` | 5 | 4.31% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_general_info` | 4 | 3.45% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_location` | 4 | 3.45% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_requirement` | 4 | 3.45% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_schedule` | 4 | 3.45% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_availability` | 2 | 1.72% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_facility_availability` | 2 | 1.72% | Edge-gap drift (predicted another intent instead of ask_process) |
| `nlu_fallback` | 2 | 1.72% | Edge-gap drift (predicted another intent instead of ask_process) |
| `ask_contact` | 1 | 0.86% | Edge-gap drift (predicted another intent instead of ask_process) |
| `smalltalk` | 1 | 0.86% | Edge-gap drift (predicted another intent instead of ask_process) |

---

## 4. Evaluation Artifacts Inside `OV_SMl_Sample`

All evaluation artifacts for this run are saved inside [`process_edge_gap_eval_results/`](process_edge_gap_eval_results/):
- [`process_edge_gap_eval_results/intent_report.json`](process_edge_gap_eval_results/intent_report.json) — Precision, recall, and F1 report
- [`process_edge_gap_eval_results/intent_errors.json`](process_edge_gap_eval_results/intent_errors.json) — All misclassified edge-gap questions
- [`process_edge_gap_eval_results/intent_successes.json`](process_edge_gap_eval_results/intent_successes.json) — All correctly classified questions
- [`process_edge_gap_eval_results/detailed_edge_gap_results.json`](process_edge_gap_eval_results/detailed_edge_gap_results.json) — Complete per-question JSON log

---

## 5. Complete Question-by-Question Evaluation Results (All 116 Questions)

| ID | Edge-Gap Type | Test Question | Expected NLU | Predicted NLU | Conf | Selected Knowledge Topic | NLU Status |
|:---|:---|:---|:---|:---|:---:|:---|:---:|
| ENR-01 | Baseline (`nlu.yml`) | What is the process of enrollment at BukSU? | `ask_process` | `ask_process` | 1.0000 | `enrollment_general_process` | **PASS** |
| ENR-02 | Conversational Edge | I want to enroll in BukSU but I have no idea where to start, what is step 1? | `ask_process` | `ask_location` | 0.6398 | `enrollment_where_to_start` | **FAIL** |
| ENR-03 | Bisaya Edge | Unsaon pag enroll sa BukSU kung magsugod pa lang ko ug wala ko kabalo asa mag una? | `ask_process` | `ask_process` | 0.9966 | `enrollment_where_to_start` | **PASS** |
| ENR-04 | Onsite / Walk-in Edge | How does the mixed or face-to-face onsite enrollment process work? | `ask_process` | `ask_process` | 1.0000 | `mixed_enrollment_process` | **PASS** |
| ENR-05 | Bisaya Conversational | Giunsa ang face to face nga proseso sa pag enroll sa campus? | `ask_process` | `ask_process` | 0.9984 | `enrollment_general_process` | **PASS** |
| ENR-06 | Typo / Short Edge | enrolmnt process step by step | `ask_process` | `ask_process` | 1.0000 | `enrollment_general_process` | **PASS** |
| ENR-07 | Baseline (`nlu.yml`) | What is the process for online enrollment? | `ask_process` | `ask_process` | 1.0000 | `enrollment_general_process` | **PASS** |
| ENR-08 | Portal Availability Boundary | Can I enroll online through a specific BukSU enrollment website? | `ask_process` | `ask_process` | 0.9977 | `enrollment_online_system` | **PASS** |
| ENR-09 | Step-by-Step Edge | What are the exact steps to submit my online enrollment application? | `ask_process` | `ask_process` | 0.9999 | `enrollment_general_process` | **PASS** |
| ENR-10 | Bisaya Portal Check | Unsaon nako pag check sa akong enrollment status ug subjects sa BukSU portal? | `ask_process` | `ask_process` | 0.9994 | `enrollment_general_process` | **PASS** |
| ENR-11 | Verification Edge | How do I verify if my enrollment is already successful in the student portal dashboard? | `ask_process` | `ask_process` | 0.9997 | `enrollment_online_system` | **PASS** |
| ENR-12 | Mixed Conversational | Asa nga section sa portal nako ma-confirm kung enrolled na ba ko ug makita akong schedule? | `ask_process` | `ask_process` | 0.6329 | `enrollment_online_system` | **PASS** |
| ENR-13 | Baseline (`nlu.yml`) | How can a freshman enroll at BukSU? | `ask_process` | `ask_process` | 1.0000 | `enrollment_general_process` | **PASS** |
| ENR-14 | Continuing Account Migration | How do continuing students enroll through the admissions portal using account migration? | `ask_process` | `ask_process` | 0.9983 | `enrollment_online_system` | **PASS** |
| ENR-15 | Bisaya Continuing Edge | Unsa ang enrollment process para sa continuing students ig login sa admissions portal? | `ask_process` | `ask_process` | 0.9977 | `enrollment_online_system` | **PASS** |
| ENR-16 | Returning Student Edge | What is the enrollment process for returning students who stopped for a semester? | `ask_process` | `ask_process` | 0.9999 | `returning_students_scope_notice` | **PASS** |
| ENR-17 | Transferee Edge | How can a transferee student enroll in BukSU? | `ask_process` | `ask_process` | 1.0000 | `transferee_enrollment` | **PASS** |
| ENR-18 | Bisaya Transferee | Unsa ang proseso sa pag enroll kung transferee gikan sa laing school? | `ask_process` | `ask_process` | 0.9992 | `enrollment_general_process` | **PASS** |
| ENR-19 | Baseline (`nlu.yml`) | Am I allowed to enroll even if it is late, and how do I do late enrollment? | `ask_process` | `ask_process` | 1.0000 | `late_enrollment` | **PASS** |
| ENR-20 | Late Document Submission | What happens if I submit my enrollment documents late after the schedule? | `ask_process` | `ask_document` | 0.6540 | `late_enrollment_document_submission` | **FAIL** |
| ENR-21 | Post-Approval Next Step | How do I know my enrollment application is approved and how do I download my COR? | `ask_process` | `ask_process` | 0.9989 | `where_get_cor` | **PASS** |
| ENR-22 | Validation & Payment Step | How do I validate my enrollment and settle payment at Finance? | `ask_process` | `ask_process` | 0.8815 | `enrollment_validation_payment` | **PASS** |
| ENR-23 | Graduating Overload Edge | How do I apply for senior academic overload of units in my final year? | `ask_process` | `ask_process` | 0.9975 | `overload_units_policy` | **PASS** |
| ENR-24 | Satellite to Main Transfer | Pwede ba ko mobalhin gikan sa satellite campus padulong sa lain nga campus sa BukSU? | `ask_process` | `ask_facility_availability` | 0.9982 | `campus_transfer` | **FAIL** |
| ENR-25 | Double Enrollment Edge | Pwede ba ko maka enroll sa BukSU samtang nag eskwela pa ko sa lain nga unibersidad? | `ask_process` | `ask_process` | 0.5360 | `enrollment_general_process` | **PASS** |
| ENR-26 | First-Year SIAS Claim | Paano po mag-claim ng SIAS account at default password para sa incoming first year? | `ask_process` | `ask_general_info` | 0.7188 | `sias_forgot_password` | **FAIL** |
| ENR-27 | SIAS Access Edge | Unsaon nako pag access ug pag login sa akong BukSU SIAS account? | `ask_process` | `ask_process` | 0.9965 | `Find_Sias_Account` | **PASS** |
| ENR-28 | CON Nursing Submission | What is the process of passing and submitting nursing enrollment requirements in CON? | `ask_process` | `ask_requirement` | 0.6575 | `cat_requirement_nursing_program` | **FAIL** |
| ADM-01 | Baseline (`nlu.yml`) | How do I apply for admission and take the BukSU-CAT examination? | `ask_process` | `ask_process` | 1.0000 | `take_exam` | **PASS** |
| ADM-02 | Walk-In vs Online Edge | Is walk-in entrance exam application allowed or is BukSU-CAT strictly online? | `ask_process` | `ask_process` | 1.0000 | `cat_online_vs_walkin_application` | **PASS** |
| ADM-03 | Bisaya Walk-In Edge | Pwede ba mag walk-in application sa BukSU CAT o online ra jud tanan? | `ask_process` | `ask_process` | 0.6001 | `cat_online_vs_walkin_application` | **PASS** |
| ADM-04 | Mobile Phone Application | Pwede ba mag apply sa BukSU CAT gamit lang ang cellphone? | `ask_process` | `ask_process` | 0.9963 | `take_exam` | **PASS** |
| ADM-05 | Second Courser / ALS Application | How can an ALS graduate or second courser apply for the BukSU-CAT? | `ask_process` | `ask_process` | 0.9996 | `gpat_admission_requirements` | **PASS** |
| ADM-06 | Next Step Edge | Nahuman na nako ang online admission application, unsa na ang sunod buhaton? | `ask_process` | `ask_process` | 0.9870 | `after_admission_application` | **PASS** |
| ADM-07 | Status Check Edge | Unsaon nako pagkahibalo kung na-accept na ba akong admission application? | `ask_process` | `ask_process` | 0.9996 | `status_application` | **PASS** |
| ADM-08 | Pending Status Edge | Ngano pending gihapon ang akong admission application status ug unsay buhaton? | `ask_process` | `ask_process` | 0.4485 | `status_application` | **PASS** |
| ADM-09 | Rejected / Denied Edge | Why is my admission application always denied or rejected in the portal? | `ask_process` | `ask_schedule` | 0.8107 | `application_always_denied` | **FAIL** |
| ADM-10 | Testing Site Denial | Ngano gi-deny akong admission application sa testing site? | `ask_process` | `ask_schedule` | 0.9915 | `application_always_denied` | **FAIL** |
| ADM-11 | Confirm Intent to Enroll | How do I confirm my intent to enroll in the admission portal after passing? | `ask_process` | `ask_process` | 0.9999 | `intent_to_enroll_confirm` | **PASS** |
| ADM-12 | Exam Results Check | How do I know if I passed the BukSU-CAT admission exam? | `ask_process` | `ask_general_info` | 0.9999 | `cat_exam_result` | **FAIL** |
| ADM-13 | Reschedule / Site Change | Can I still reschedule my entrance exam or change my testing site after approval? | `ask_process` | `ask_process` | 0.9974 | `reschedule_entrance_exam` | **PASS** |
| ADM-14 | Missed Exam Edge | Na-miss nako ang akong BukSU CAT exam schedule, unsa akong pwede buhaton? | `ask_process` | `ask_process` | 0.9505 | `missed_buksu_cat_schedule` | **PASS** |
| ADM-15 | Retake Policy Edge | Can I retake the BukSU-CAT examination more than once if I failed? | `ask_process` | `ask_process` | 0.9991 | `affirmative_action` | **PASS** |
| ADM-16 | No Slots Available | What should I do if there are no available slots for the BukSU-CAT exam? | `ask_process` | `ask_requirement` | 0.6657 | `no_slots` | **FAIL** |
| ADM-17 | Main Campus Full Edge | Unsa akong buhaton kung puno na ang slots sa Main Campus? | `ask_process` | `smalltalk` | 0.3361 | `main_campus_full` | **FAIL** |
| ADM-18 | Change Course After Submitting | Pwede ba usbon ang akong program choice human sa pag submit sa BukSU CAT application? | `ask_process` | `ask_general_info` | 0.6022 | `after_admission_application` | **FAIL** |
| ADM-19 | Change Course After Passing | Can I still change my preferred course even after passing the BukSU-CAT? | `ask_process` | `ask_process` | 0.9923 | `program_cutoff_scores` | **PASS** |
| ADM-20 | Corrupted Test Permit | Dili ma-open ang akong test permit sa akong cellphone kay corrupted, unsaon ni? | `ask_process` | `ask_process` | 0.9820 | `admission_examination_date` | **PASS** |
| ADM-21 | Wrong Name on Permit | What should I do if there is a wrong spelling or error in my name on the test permit? | `ask_process` | `ask_facility_availability` | 0.3323 | `test_permit_name_error` | **FAIL** |
| ADM-22 | 2x2 Photo Upload Error | Dili nako ma-upload ang akong 2x2 nga profile picture sa admission portal, unsay buhaton? | `ask_process` | `ask_process` | 0.9986 | `Change_info_admission` | **PASS** |
| ADM-23 | Website Error Edge | Ngano nag system error ang admission website samtang nag fill up ko? | `ask_process` | `ask_general_info` | 0.8263 | `system_error` | **FAIL** |
| ADM-24 | Missing Admission Docs | Where and how do I submit my missing admission documents? | `ask_process` / `ask_document` | `ask_document` | 0.9942 | `freshman_admission_requirements` | **BOUNDARY PASS** |
| ADM-25 | Create Admission Account | How do I create and register a new BukSU admission account? | `ask_process` | `nlu_fallback` | 0.3000 | `admission_account_registration` | **FAIL** |
| ADM-26 | Change Admission Info | Unsaon pag change sa akong personal info sa admission account? | `ask_process` | `ask_process` | 0.9358 | `Change_info_admission` | **PASS** |
| ADM-27 | Change Admission Password | Unsaon pag usab sa akong password sa admission portal? | `ask_process` | `ask_process` | 1.0000 | `Change_Pass_admission` | **PASS** |
| ADM-28 | Affirmative Action (AAP) | How do I apply for the Affirmative Action Program (AAP) at BukSU? | `ask_process` | `ask_process` | 0.9991 | `affirmative_action` | **PASS** |
| ADM-29 | Non-Passer Cutoff Edge | Pwede pa ba ko mo-enroll pinaagi sa Affirmative Action bisan ubos akong score sa cutoff? | `ask_process` | `nlu_fallback` | 0.3000 | `non_passer_enrollment_affirmative_action` | **FAIL** |
| ADM-30 | Stopped Years Ago Readmission | What if I stopped studying at BukSU years ago, what is the process to come back and readmit? | `ask_process` | `ask_process` | 0.9998 | `returning_student_readmission_process` | **PASS** |
| ADM-31 | Student Assistant Application | Unsa ang proseso ug asa i-submit ang application para mahimong Student Assistant? | `ask_process` | `ask_location` | 0.6779 | `student_assistant_application_process` | **FAIL** |
| ACT-01 | Baseline (`nlu.yml`) | What is the adding and dropping subject process at the Registrar? | `ask_process` | `ask_process` | 0.9803 | `add_drop_subject` | **PASS** |
| ACT-02 | Bisaya Add/Drop Edge | Unsaon pag add o pag drop ug subject ug kinsay mopirma sa form? | `ask_process` | `ask_schedule` | 0.3990 | `add_drop_subject` | **FAIL** |
| ACT-03 | Baseline Withdrawal (`nlu.yml`) | What is the process for voluntary withdrawal of enrollment? | `ask_process` | `ask_process` | 1.0000 | `withdraw_enrollment_policy` | **PASS** |
| ACT-04 | Bisaya Withdrawal Edge | Unsaon pag withdraw o pag cancel sa akong enrollment sa Registrar? | `ask_process` | `ask_process` | 0.9939 | `withdraw_enrollment_policy` | **PASS** |
| ACT-05 | Baseline (`nlu.yml`) | How do I request and download my Certificate of Registration (COR)? | `ask_process` / `ask_document` | `ask_document` | 0.9983 | `where_get_cor` | **BOUNDARY PASS** |
| ACT-06 | Bisaya COR Request | Unsaon nako pag request og COR sa Registrar o online? | `ask_process` | `ask_process` | 0.9998 | `where_get_cor` | **PASS** |
| ACT-07 | Baseline COR Validation (`nlu.yml`) | What are the step-by-step procedures for COR validation? | `ask_process` | `ask_process` | 0.9993 | `cor_validation_steps` | **PASS** |
| ACT-08 | Conversational Next-Step Edge | Naka-print na ko sa akong COR gikan sa admission portal, unsay sunod buhaton para ma-validate? | `ask_process` | `ask_process` | 0.9896 | `cor_validation_steps` | **PASS** |
| ACT-09 | Window 7 / Finance Edge | Tabangi ko unsaon pag validate sa akong COR didto sa Finance Window 7 ug Registrar. | `ask_process` | `ask_location` | 0.8830 | `cor_validation_location` | **FAIL** |
| ACT-10 | Graduate TOR Request | How do graduates request their Transcript of Records (TOR) at the Registrar? | `ask_process` / `ask_document` | `ask_availability` | 0.5553 | `request_tor_process` | **FAIL** |
| ACT-11 | Detailed Window 1-6 TOR Process | What is the step-by-step process to get my TOR from Registrar Window 1-6, Accounting, and Cashier? | `ask_process` | `ask_process` | 0.5618 | `request_tor_process` | **PASS** |
| ACT-12 | Bisaya TOR Process | Unsaon pag request ug TOR sa Registrar ug unsay proseso sa pagbayad sa Cashier? | `ask_process` | `ask_process` | 0.8521 | `request_tor_process` | **PASS** |
| ACT-13 | Undergraduate Early Request | Pwede ba mag-request ug documents o TOR sa Registrar bisan wala pa ko ka-graduate? | `ask_process` | `ask_document` | 0.9136 | `request_tor_process` | **FAIL** |
| ACT-14 | Graduation Application | How do I apply for graduation and file my application in my final semester? | `ask_process` | `ask_process` | 0.9980 | `graduation_clearance` | **PASS** |
| ACT-15 | Bisaya Graduation Filing | Unsaon pag apply para sa graduation sa BukSU? | `ask_process` | `ask_process` | 0.9914 | `graduation_application_process` | **PASS** |
| ACT-16 | Online Clearance Steps | How do I process my University Clearance online at clearance.buksu.edu.ph? | `ask_process` / `ask_requirement` | `ask_process` | 1.0000 | `graduating_clearance_requirements` | **PASS** |
| ACT-17 | Graduation Rehearsal Policy | Obligado ba ko moadto ug mo-attend sa graduation rehearsal? | `ask_process` | `ask_location` | 0.7638 | `graduation_rehearsal_attendance` | **FAIL** |
| ACT-18 | Parents at Graduation | Pwede ba mo-attend ang mga ginikanan ug bisita sa graduation ceremony? | `ask_process` | `ask_contact` | 0.4318 | `__contact_clarification__` | **FAIL** |
| ACT-19 | Graduate Tracer Study | Unsa man ang tracer study para sa mga graduates ug unsaon pag apil? | `ask_process` | `ask_process` | 0.9883 | `tracer_study` | **PASS** |
| SSP-01 | Baseline (`nlu.yml`) | How do I get my student ID and what is the process? | `ask_process` | `ask_process` | 1.0000 | `student_id_process` | **PASS** |
| SSP-02 | Bisaya Student ID (`nlu.yml`) | Unsaon pagkuha sa student ID sa BukSU? | `ask_process` | `ask_process` | 1.0000 | `student_id_process` | **PASS** |
| SSP-03 | Baseline ID Validation (`nlu.yml`) | How do I validate my student ID every semester? | `ask_process` | `ask_process` | 0.9999 | `id_validation_process` | **PASS** |
| SSP-04 | Lost Student ID Edge | I lost my student ID, what is the process to replace a lost ID? | `ask_process` | `ask_process` | 1.0000 | `lost_student_id_replacement_process` | **PASS** |
| SSP-05 | Campus Entry Without ID | How do I enter the campus if I don't have my physical student ID yet? | `ask_process` | `ask_process` | 0.9993 | `student_id_process` | **PASS** |
| SSP-06 | Baseline Wi-Fi (`nlu.yml`) | How can I access campus Wi-Fi and get my Wi-Fi credentials? | `ask_process` | `ask_process` | 1.0000 | `campus_wifi_access` | **PASS** |
| SSP-07 | Connect to Student Wi-Fi | Can you tell me how students connect to the school Wi-Fi network? | `ask_process` | `ask_process` | 0.9992 | `campus_wifi_access` | **PASS** |
| SSP-08 | Baseline Password Reset (`nlu.yml`) | How can I reset my portal password if I forgot it? | `ask_process` | `ask_process` | 1.0000 | `sias_forgot_password` | **PASS** |
| SSP-09 | Bisaya Forgot Password | Nakalimot ko sa akong BukSU admission account password, unsaon nako pag recover? | `ask_process` | `ask_process` | 0.9995 | `Change_Pass_admission` | **PASS** |
| SSP-10 | SIAS Forgot Password | How do I reset my SIAS password if I forgot my SIAS login credentials? | `ask_process` | `ask_process` | 0.9994 | `sias_forgot_password` | **PASS** |
| SSP-11 | Locked Portal Account | Unsa ang angay buhaton kung ma-lock ang akong BukSU student portal account? | `ask_process` | `ask_process` | 0.8930 | `buksu_official_website` | **PASS** |
| SSP-12 | Portal Login Failure | Ngano dili ko maka-login sa BukSU student portal ug unsa akong angay i-check? | `ask_process` | `ask_process` | 0.6780 | `buksu_official_website` | **PASS** |
| SSP-13 | Update Profile Info | Asa ug unsaon nako pag edit o pag usab sa akong profile details sa student portal? | `ask_process` | `ask_process` | 0.9999 | `__clarification__` | **PASS** |
| SSP-14 | Good Moral Request | How do I request a Good Moral Certificate from the Office of Student Services (OSS)? | `ask_process` / `ask_document` | `ask_document` | 0.7941 | `request_good_moral_certificate_oss` | **BOUNDARY PASS** |
| SSP-15 | Clinic Medical Certificate | What is the process for getting a medical certificate at the University Clinic? | `ask_process` / `ask_document` | `ask_process` | 0.4469 | `clinic_medical_certificate_process` | **PASS** |
| SSP-16 | Baseline Library ID (`nlu.yml`) | Unsaon pagkuha sa library ID card? | `ask_process` | `ask_process` | 1.0000 | `library_id_card_location` | **PASS** |
| SSP-17 | Lost Library Card Edge | What should I do if I lost my library card and need a replacement? | `ask_process` | `ask_requirement` | 0.9993 | `library_id_card_replacement` | **FAIL** |
| SSP-18 | PE Uniform Process | How do I get or buy my PE uniform at BukSU? | `ask_process` | `ask_process` | 0.9999 | `pe_uniform_process` | **PASS** |
| SSP-19 | College Shirt Purchase | How and where can I buy my department college t-shirt? | `ask_process` | `ask_process` | 0.9903 | `campus_dress_code_policy` | **PASS** |
| SSP-20 | Vehicle Gate Pass Process | What is the process of getting a gate pass sticker for my vehicle or motorcycle? | `ask_process` | `ask_process` | 0.9992 | `gate_pass_process` | **PASS** |
| SSP-21 | Join Student Organization | Unsaon pag apil sa mga accredited student organizations o clubs panahon sa Org Fair? | `ask_process` | `ask_process` | 0.9921 | `student_organizations_application_process` | **PASS** |
| ACD-01 | View Grades in SIAS | How do I check and view my semester grades in the SIAS portal? | `ask_process` | `ask_process` | 0.9999 | `access_sias` | **PASS** |
| ACD-02 | Baseline INC Completion (`nlu.yml`) | How do I complete an INC (Incomplete) grade and process the INC form? | `ask_process` | `ask_process` | 0.9999 | `inc_grade_rules` | **PASS** |
| ACD-03 | Bisaya INC Completion | Unsaon pag complete sa akong INC nga grado sa subject? | `ask_process` | `ask_process` | 0.9998 | `inc_grade_rules` | **PASS** |
| ACD-04 | FDA Grade Resolution | What should I do if I receive an FDA (Failure Due to Absences) grade? | `ask_process` | `ask_requirement` | 0.5448 | `fda_meaning` | **FAIL** |
| ACD-05 | Retake Failed Subject | What is the process if I failed a subject for the first time and need to retake it? | `ask_process` | `ask_process` | 0.9984 | `failed_subject_policy` | **PASS** |
| ACD-06 | Baseline Course Shifting (`nlu.yml`) | How do I shift to another course or program next semester? | `ask_process` | `ask_process` | 1.0000 | `course_shifting` | **PASS** |
| ACD-07 | 3rd Year Shifting Edge | Pwede ba ko maka-shift og course bisan 3rd year student na ko sa BukSU, ug unsaon? | `ask_process` | `ask_process` | 0.9997 | `course_shifting` | **PASS** |
| ACD-08 | Change Class Section / Conflict | Can a freshman request to transfer to another section or change class schedules due to conflict? | `ask_process` | `ask_process` | 0.6603 | `change_section_schedule_conflict` | **PASS** |
| ACD-09 | Check / Adjust Schedule | How do I check or adjust my class schedule in my department? | `ask_process` | `ask_schedule` | 0.8940 | `class_schedule_help` | **FAIL** |
| SRV-01 | Baseline Dental Consult (`nlu.yml`) | How do I request a dental consultation at the clinic? | `ask_process` | `ask_process` | 0.9919 | `buksu_medical_dental_services` | **PASS** |
| SRV-02 | Baseline Dental Oral Exam (`nlu.yml`) | How do I request a dental oral examination? | `ask_process` | `ask_process` | 0.9998 | `buksu_medical_dental_services` | **PASS** |
| SRV-03 | Tooth Extraction Process | What is the process to request a tooth extraction at the university dental clinic? | `ask_process` | `ask_process` | 0.9929 | `request_tooth_extraction` | **PASS** |
| SRV-04 | Borrow Library Books | What is the process of borrowing books from the BukSU library? | `ask_process` | `ask_process` | 0.9983 | `library_borrow_books_process` | **PASS** |
| SRV-05 | Return Library Books | How and where do I return borrowed library books? | `ask_process` | `ask_process` | 0.8814 | `library_return_books_process` | **PASS** |
| SRV-06 | Apply for Scholarship | How can I apply for a scholarship at BukSU? | `ask_process` | `ask_process` | 1.0000 | `available_scholarships_buksu` | **PASS** |
| SRV-07 | Apply for TES Grant | Unsaon pag apply sa Tertiary Education Subsidy (TES) scholarship? | `ask_process` | `ask_availability` | 0.9550 | `tes_application_process` | **FAIL** |
| SRV-08 | TES Grantee Selection | How is the selection process of TES grantees done? | `ask_process` | `ask_process` | 0.9998 | `tes_grantee_selection_process` | **PASS** |
