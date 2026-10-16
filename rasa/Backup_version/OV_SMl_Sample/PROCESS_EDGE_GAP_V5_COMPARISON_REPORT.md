# BukSU Chatbot — Before vs. After (`Candidate v5`) Process Edge-Gap Comparison Report

## 1. Executive Summary: Pre-Update Ready-Production vs. Candidate v5 Production

- **Pre-Update Model (Baseline)**: `20260825-010246-cheerful-van.tar.gz` (`55` training examples in `ask_process`)
- **Updated Production Model (Candidate v5)**: `20261015-125505-candidate-v5.tar.gz` (`88` production-grounded training examples in `ask_process`)
- **Benchmark Test Set**: [`PROCESS_EDGE_GAP_TEST_QUESTIONS.md`](PROCESS_EDGE_GAP_TEST_QUESTIONS.md) (**116 production-grounded questions**)

| Accuracy Metric | Pre-Update (`cheerful-van`) | **Updated (`Candidate v5`)** | **Net Change / Improvement** |
|:---|:---:|:---:|:---:|
| **Strict `ask_process` NLU Accuracy** | 87/116 (**75.00%**) | **80/116 (68.97%)** | **-6.03%** (`-7` questions) |
| **Acceptable Boundary NLU Accuracy** | 90/116 (**77.59%**) | **84/116 (72.41%)** | **-5.17%** (`-6` questions) |
| **Knowledge Topic Match (`KnowledgeRouter`)** | 68/116 (**58.62%**) | **63/116 (54.31%)** | **-4.31%** (`-5` questions) |
| **Downstream `action_main_router` Reach Rate** | 113/116 (**97.41%**) | **112/116 (96.55%)** | **-0.86%** (`-1` questions) |
| **Mean NLU Prediction Confidence** | 89.16% | **94.29%** | **+5.13%** |

---

## 2. Category-by-Category Accuracy Comparison (Before vs. After)

| Category | Questions | Pre-Update Strict NLU | **Candidate v5 Strict NLU** | **Strict Change** | Pre-Update Acceptable | **Candidate v5 Acceptable** |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| Category 1: Enrollment Procedures (`procedures/enrollment_procedures.json` & `nlu.yml`) | 28 | 23/28 (82.14%) | **22/28 (78.57%)** | **-3.57%** | 23/28 (82.14%) | **22/28 (78.57%)** |
| Category 2: Admission & BukSU-CAT Procedures (`procedures/admission_procedures.json` & `nlu.yml`) | 31 | 19/31 (61.29%) | **20/31 (64.52%)** | **+3.23%** | 20/31 (64.52%) | **21/31 (67.74%)** |
| Category 3: Academic Transactions & Registrar Procedures (`procedures/academic_transactions.json` & `enrollment_procedures.json`) | 19 | 12/19 (63.16%) | **7/19 (36.84%)** | **-26.32%** | 13/19 (68.42%) | **9/19 (47.37%)** |
| Category 4: Student Service & ICT Procedures (`procedures/student_service_procedures.json` & `nlu.yml`) | 21 | 19/21 (90.48%) | **15/21 (71.43%)** | **-19.05%** | 20/21 (95.24%) | **16/21 (76.19%)** |
| Category 5: Academic Policies, Grading, Shifting & Clinic/Library/OSS Workflows (Other Production JSONs) | 17 | 14/17 (82.35%) | **16/17 (94.12%)** | **+11.76%** | 14/17 (82.35%) | **16/17 (94.12%)** |

---

## 3. Candidate v5 Predicted NLU Intent Distribution

| Predicted NLU Intent | Pre-Update Count | **Candidate v5 Count** | **Candidate v5 Share (%)** |
|:---|:---:|:---:|:---:|
| `ask_process` | 87 | **80** | 68.97% |
| `ask_document` | 5 | **16** | 13.79% |
| `ask_contact` | 1 | **3** | 2.59% |
| `ask_general_info` | 4 | **3** | 2.59% |
| `ask_location` | 4 | **3** | 2.59% |
| `ask_requirement` | 4 | **3** | 2.59% |
| `ask_follow_up` | 0 | **2** | 1.72% |
| `ask_schedule` | 4 | **2** | 1.72% |
| `nlu_fallback` | 2 | **2** | 1.72% |
| `ask_availability` | 2 | **1** | 0.86% |
| `ask_fee` | 0 | **1** | 0.86% |
| `ask_facility_availability` | 2 | **0** | 0.00% |
| `smalltalk` | 1 | **0** | 0.00% |

---

## 4. Complete Question-by-Question Comparison (All 116 Questions)

| ID | Test Question | Expected NLU | Pre-Update Pred (`Conf`) | **Candidate v5 Pred (`Conf`)** | Pre-Update Status | **Candidate v5 Status** |
|:---|:---|:---|:---|:---|:---:|:---:|
| ENR-01 | What is the process of enrollment at BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-02 | I want to enroll in BukSU but I have no idea where to start, what is step 1? | `ask_process` | `ask_location` (`0.64`) | **`ask_process`** (`1.00`) | FAIL | **PASS** |
| ENR-03 | Unsaon pag enroll sa BukSU kung magsugod pa lang ko ug wala ko kabalo asa mag una? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-04 | How does the mixed or face-to-face onsite enrollment process work? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-05 | Giunsa ang face to face nga proseso sa pag enroll sa campus? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-06 | enrolmnt process step by step | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-07 | What is the process for online enrollment? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-08 | Can I enroll online through a specific BukSU enrollment website? | `ask_process` | `ask_process` (`1.00`) | **`ask_contact`** (`0.97`) | PASS | **FAIL** |
| ENR-09 | What are the exact steps to submit my online enrollment application? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-10 | Unsaon nako pag check sa akong enrollment status ug subjects sa BukSU portal? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-11 | How do I verify if my enrollment is already successful in the student portal dashboard? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-12 | Asa nga section sa portal nako ma-confirm kung enrolled na ba ko ug makita akong schedule? | `ask_process` | `ask_process` (`0.63`) | **`ask_process`** (`0.46`) | PASS | **PASS** |
| ENR-13 | How can a freshman enroll at BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-14 | How do continuing students enroll through the admissions portal using account migration? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-15 | Unsa ang enrollment process para sa continuing students ig login sa admissions portal? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-16 | What is the enrollment process for returning students who stopped for a semester? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-17 | How can a transferee student enroll in BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-18 | Unsa ang proseso sa pag enroll kung transferee gikan sa laing school? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-19 | Am I allowed to enroll even if it is late, and how do I do late enrollment? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-20 | What happens if I submit my enrollment documents late after the schedule? | `ask_process` | `ask_document` (`0.65`) | **`ask_general_info`** (`1.00`) | FAIL | **FAIL** |
| ENR-21 | How do I know my enrollment application is approved and how do I download my COR? | `ask_process` | `ask_process` (`1.00`) | **`ask_document`** (`1.00`) | PASS | **FAIL** |
| ENR-22 | How do I validate my enrollment and settle payment at Finance? | `ask_process` | `ask_process` (`0.88`) | **`ask_process`** (`0.96`) | PASS | **PASS** |
| ENR-23 | How do I apply for senior academic overload of units in my final year? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-24 | Pwede ba ko mobalhin gikan sa satellite campus padulong sa lain nga campus sa BukSU? | `ask_process` | `ask_facility_availability` (`1.00`) | **`ask_follow_up`** (`0.41`) | FAIL | **FAIL** |
| ENR-25 | Pwede ba ko maka enroll sa BukSU samtang nag eskwela pa ko sa lain nga unibersidad? | `ask_process` | `ask_process` (`0.54`) | **`ask_follow_up`** (`0.83`) | PASS | **FAIL** |
| ENR-26 | Paano po mag-claim ng SIAS account at default password para sa incoming first year? | `ask_process` | `ask_general_info` (`0.72`) | **`ask_process`** (`0.64`) | FAIL | **PASS** |
| ENR-27 | Unsaon nako pag access ug pag login sa akong BukSU SIAS account? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ENR-28 | What is the process of passing and submitting nursing enrollment requirements in CON? | `ask_process` | `ask_requirement` (`0.66`) | **`ask_requirement`** (`1.00`) | FAIL | **FAIL** |
| ADM-01 | How do I apply for admission and take the BukSU-CAT examination? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-02 | Is walk-in entrance exam application allowed or is BukSU-CAT strictly online? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-03 | Pwede ba mag walk-in application sa BukSU CAT o online ra jud tanan? | `ask_process` | `ask_process` (`0.60`) | **`ask_process`** (`0.98`) | PASS | **PASS** |
| ADM-04 | Pwede ba mag apply sa BukSU CAT gamit lang ang cellphone? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`0.50`) | PASS | **PASS** |
| ADM-05 | How can an ALS graduate or second courser apply for the BukSU-CAT? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-06 | Nahuman na nako ang online admission application, unsa na ang sunod buhaton? | `ask_process` | `ask_process` (`0.99`) | **`ask_document`** (`0.54`) | PASS | **FAIL** |
| ADM-07 | Unsaon nako pagkahibalo kung na-accept na ba akong admission application? | `ask_process` | `ask_process` (`1.00`) | **`ask_document`** (`0.94`) | PASS | **FAIL** |
| ADM-08 | Ngano pending gihapon ang akong admission application status ug unsay buhaton? | `ask_process` | `ask_process` (`0.45`) | **`ask_process`** (`0.59`) | PASS | **PASS** |
| ADM-09 | Why is my admission application always denied or rejected in the portal? | `ask_process` | `ask_schedule` (`0.81`) | **`ask_schedule`** (`1.00`) | FAIL | **FAIL** |
| ADM-10 | Ngano gi-deny akong admission application sa testing site? | `ask_process` | `ask_schedule` (`0.99`) | **`ask_schedule`** (`0.99`) | FAIL | **FAIL** |
| ADM-11 | How do I confirm my intent to enroll in the admission portal after passing? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-12 | How do I know if I passed the BukSU-CAT admission exam? | `ask_process` | `ask_general_info` (`1.00`) | **`ask_general_info`** (`1.00`) | FAIL | **FAIL** |
| ADM-13 | Can I still reschedule my entrance exam or change my testing site after approval? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-14 | Na-miss nako ang akong BukSU CAT exam schedule, unsa akong pwede buhaton? | `ask_process` | `ask_process` (`0.95`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-15 | Can I retake the BukSU-CAT examination more than once if I failed? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-16 | What should I do if there are no available slots for the BukSU-CAT exam? | `ask_process` | `ask_requirement` (`0.67`) | **`ask_requirement`** (`0.98`) | FAIL | **FAIL** |
| ADM-17 | Unsa akong buhaton kung puno na ang slots sa Main Campus? | `ask_process` | `smalltalk` (`0.34`) | **`ask_process`** (`1.00`) | FAIL | **PASS** |
| ADM-18 | Pwede ba usbon ang akong program choice human sa pag submit sa BukSU CAT application? | `ask_process` | `ask_general_info` (`0.60`) | **`ask_process`** (`1.00`) | FAIL | **PASS** |
| ADM-19 | Can I still change my preferred course even after passing the BukSU-CAT? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-20 | Dili ma-open ang akong test permit sa akong cellphone kay corrupted, unsaon ni? | `ask_process` | `ask_process` (`0.98`) | **`ask_document`** (`0.99`) | PASS | **FAIL** |
| ADM-21 | What should I do if there is a wrong spelling or error in my name on the test permit? | `ask_process` | `ask_facility_availability` (`0.33`) | **`ask_document`** (`0.89`) | FAIL | **FAIL** |
| ADM-22 | Dili nako ma-upload ang akong 2x2 nga profile picture sa admission portal, unsay buhaton? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-23 | Ngano nag system error ang admission website samtang nag fill up ko? | `ask_process` | `ask_general_info` (`0.83`) | **`ask_contact`** (`1.00`) | FAIL | **FAIL** |
| ADM-24 | Where and how do I submit my missing admission documents? | `ask_process` / `ask_document` | `ask_document` (`0.99`) | **`ask_document`** (`1.00`) | BOUNDARY PASS | **BOUNDARY PASS** |
| ADM-25 | How do I create and register a new BukSU admission account? | `ask_process` | `nlu_fallback` (`0.30`) | **`ask_process`** (`1.00`) | FAIL | **PASS** |
| ADM-26 | Unsaon pag change sa akong personal info sa admission account? | `ask_process` | `ask_process` (`0.94`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-27 | Unsaon pag usab sa akong password sa admission portal? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-28 | How do I apply for the Affirmative Action Program (AAP) at BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ADM-29 | Pwede pa ba ko mo-enroll pinaagi sa Affirmative Action bisan ubos akong score sa cutoff? | `ask_process` | `nlu_fallback` (`0.30`) | **`ask_process`** (`0.97`) | FAIL | **PASS** |
| ADM-30 | What if I stopped studying at BukSU years ago, what is the process to come back and readmit? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`0.99`) | PASS | **PASS** |
| ADM-31 | Unsa ang proseso ug asa i-submit ang application para mahimong Student Assistant? | `ask_process` | `ask_location` (`0.68`) | **`ask_document`** (`0.89`) | FAIL | **FAIL** |
| ACT-01 | What is the adding and dropping subject process at the Registrar? | `ask_process` | `ask_process` (`0.98`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-02 | Unsaon pag add o pag drop ug subject ug kinsay mopirma sa form? | `ask_process` | `ask_schedule` (`0.40`) | **`ask_document`** (`1.00`) | FAIL | **FAIL** |
| ACT-03 | What is the process for voluntary withdrawal of enrollment? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-04 | Unsaon pag withdraw o pag cancel sa akong enrollment sa Registrar? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-05 | How do I request and download my Certificate of Registration (COR)? | `ask_process` / `ask_document` | `ask_document` (`1.00`) | **`ask_document`** (`1.00`) | BOUNDARY PASS | **BOUNDARY PASS** |
| ACT-06 | Unsaon nako pag request og COR sa Registrar o online? | `ask_process` | `ask_process` (`1.00`) | **`ask_document`** (`1.00`) | PASS | **FAIL** |
| ACT-07 | What are the step-by-step procedures for COR validation? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-08 | Naka-print na ko sa akong COR gikan sa admission portal, unsay sunod buhaton para ma-validate? | `ask_process` | `ask_process` (`0.99`) | **`ask_document`** (`0.98`) | PASS | **FAIL** |
| ACT-09 | Tabangi ko unsaon pag validate sa akong COR didto sa Finance Window 7 ug Registrar. | `ask_process` | `ask_location` (`0.88`) | **`ask_location`** (`0.94`) | FAIL | **FAIL** |
| ACT-10 | How do graduates request their Transcript of Records (TOR) at the Registrar? | `ask_process` / `ask_document` | `ask_availability` (`0.56`) | **`ask_document`** (`1.00`) | FAIL | **BOUNDARY PASS** |
| ACT-11 | What is the step-by-step process to get my TOR from Registrar Window 1-6, Accounting, and Cashier? | `ask_process` | `ask_process` (`0.56`) | **`ask_location`** (`0.76`) | PASS | **FAIL** |
| ACT-12 | Unsaon pag request ug TOR sa Registrar ug unsay proseso sa pagbayad sa Cashier? | `ask_process` | `ask_process` (`0.85`) | **`ask_fee`** (`0.87`) | PASS | **FAIL** |
| ACT-13 | Pwede ba mag-request ug documents o TOR sa Registrar bisan wala pa ko ka-graduate? | `ask_process` | `ask_document` (`0.91`) | **`ask_document`** (`0.89`) | FAIL | **FAIL** |
| ACT-14 | How do I apply for graduation and file my application in my final semester? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-15 | Unsaon pag apply para sa graduation sa BukSU? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-16 | How do I process my University Clearance online at clearance.buksu.edu.ph? | `ask_process` / `ask_requirement` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACT-17 | Obligado ba ko moadto ug mo-attend sa graduation rehearsal? | `ask_process` | `ask_location` (`0.76`) | **`ask_location`** (`0.70`) | FAIL | **FAIL** |
| ACT-18 | Pwede ba mo-attend ang mga ginikanan ug bisita sa graduation ceremony? | `ask_process` | `ask_contact` (`0.43`) | **`ask_document`** (`0.73`) | FAIL | **FAIL** |
| ACT-19 | Unsa man ang tracer study para sa mga graduates ug unsaon pag apil? | `ask_process` | `ask_process` (`0.99`) | **`nlu_fallback`** (`0.30`) | PASS | **FAIL** |
| SSP-01 | How do I get my student ID and what is the process? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-02 | Unsaon pagkuha sa student ID sa BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-03 | How do I validate my student ID every semester? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-04 | I lost my student ID, what is the process to replace a lost ID? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-05 | How do I enter the campus if I don't have my physical student ID yet? | `ask_process` | `ask_process` (`1.00`) | **`ask_availability`** (`0.91`) | PASS | **FAIL** |
| SSP-06 | How can I access campus Wi-Fi and get my Wi-Fi credentials? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-07 | Can you tell me how students connect to the school Wi-Fi network? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-08 | How can I reset my portal password if I forgot it? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-09 | Nakalimot ko sa akong BukSU admission account password, unsaon nako pag recover? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-10 | How do I reset my SIAS password if I forgot my SIAS login credentials? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-11 | Unsa ang angay buhaton kung ma-lock ang akong BukSU student portal account? | `ask_process` | `ask_process` (`0.89`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-12 | Ngano dili ko maka-login sa BukSU student portal ug unsa akong angay i-check? | `ask_process` | `ask_process` (`0.68`) | **`ask_contact`** (`0.81`) | PASS | **FAIL** |
| SSP-13 | Asa ug unsaon nako pag edit o pag usab sa akong profile details sa student portal? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-14 | How do I request a Good Moral Certificate from the Office of Student Services (OSS)? | `ask_process` / `ask_document` | `ask_document` (`0.79`) | **`ask_document`** (`1.00`) | BOUNDARY PASS | **BOUNDARY PASS** |
| SSP-15 | What is the process for getting a medical certificate at the University Clinic? | `ask_process` / `ask_document` | `ask_process` (`0.45`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-16 | Unsaon pagkuha sa library ID card? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-17 | What should I do if I lost my library card and need a replacement? | `ask_process` | `ask_requirement` (`1.00`) | **`ask_requirement`** (`1.00`) | FAIL | **FAIL** |
| SSP-18 | How do I get or buy my PE uniform at BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_document`** (`0.73`) | PASS | **FAIL** |
| SSP-19 | How and where can I buy my department college t-shirt? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SSP-20 | What is the process of getting a gate pass sticker for my vehicle or motorcycle? | `ask_process` | `ask_process` (`1.00`) | **`nlu_fallback`** (`0.30`) | PASS | **FAIL** |
| SSP-21 | Unsaon pag apil sa mga accredited student organizations o clubs panahon sa Org Fair? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`0.98`) | PASS | **PASS** |
| ACD-01 | How do I check and view my semester grades in the SIAS portal? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACD-02 | How do I complete an INC (Incomplete) grade and process the INC form? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`0.98`) | PASS | **PASS** |
| ACD-03 | Unsaon pag complete sa akong INC nga grado sa subject? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACD-04 | What should I do if I receive an FDA (Failure Due to Absences) grade? | `ask_process` | `ask_requirement` (`0.54`) | **`ask_general_info`** (`1.00`) | FAIL | **FAIL** |
| ACD-05 | What is the process if I failed a subject for the first time and need to retake it? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACD-06 | How do I shift to another course or program next semester? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACD-07 | Pwede ba ko maka-shift og course bisan 3rd year student na ko sa BukSU, ug unsaon? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACD-08 | Can a freshman request to transfer to another section or change class schedules due to conflict? | `ask_process` | `ask_process` (`0.66`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| ACD-09 | How do I check or adjust my class schedule in my department? | `ask_process` | `ask_schedule` (`0.89`) | **`ask_process`** (`1.00`) | FAIL | **PASS** |
| SRV-01 | How do I request a dental consultation at the clinic? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SRV-02 | How do I request a dental oral examination? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SRV-03 | What is the process to request a tooth extraction at the university dental clinic? | `ask_process` | `ask_process` (`0.99`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SRV-04 | What is the process of borrowing books from the BukSU library? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SRV-05 | How and where do I return borrowed library books? | `ask_process` | `ask_process` (`0.88`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SRV-06 | How can I apply for a scholarship at BukSU? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
| SRV-07 | Unsaon pag apply sa Tertiary Education Subsidy (TES) scholarship? | `ask_process` | `ask_availability` (`0.95`) | **`ask_process`** (`1.00`) | FAIL | **PASS** |
| SRV-08 | How is the selection process of TES grantees done? | `ask_process` | `ask_process` (`1.00`) | **`ask_process`** (`1.00`) | PASS | **PASS** |
