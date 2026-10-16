# Structured Retrieval QA Baseline Dataset

Date: 2026-06-19

Scope: Day 1 Phase 2 from `docs/Rasa Structured Retrieval Stabilization Prompt.txt`.

Purpose: this file is the baseline test list for future routing changes. It is not a training file. Use it to catch regressions before moving to a new phase.

Scope note: the chatbot should prioritize answers that help incoming first year students and first-year transferees. Questions for returning or continuing students should receive a polite scope notice unless the project already has verified first-year-safe data for that topic.

## How To Use

For every test, record:

- Actual answer
- Actual record/intent if visible in logs
- Pass/fail
- Notes or screenshot if wrong

Expected map:
- `yes` means map payload should appear.
- `no` means no map should appear.
- `optional` means map is helpful if data exists but the test is mainly about routing.

Expected follow-up:
- `none` means no special memory expectation.
- `set` means the answer should establish a context for short follow-ups.
- `use previous` means the question should rely on the previous message context.
- `clarify` means the bot should show choice buttons.

## Smoke Test - 20 Questions

| # | Category | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|---|
| 1 | Location | where is the library? | Library Building/location answer | yes | set |
| 2 | Location | where is AVC? | AVC/location answer | yes | set |
| 3 | Location | COT Dean's Office | COT Dean's Office | yes | set |
| 4 | Enrollment | how to enroll freshman? | Freshman Enrollment Process | no | set |
| 5 | Enrollment | can you help me for my enrollment | Enrollment General Process | no | set |
| 6 | Enrollment | is late enrol allowed | Late Enrollment | no | set |
| 7 | Admission | when is admission? | Admission clarification choices | no | clarify |
| 8 | Courses | unsay course na available diris buksu | Course list clarification choices in Bisaya | no | clarify |
| 9 | Courses | all courses offered by BukSU | All Courses Offered | no | none |
| 10 | Courses | what cut off scores for BSET? | BukSU CAT Cutoff Scores | no | none |
| 11 | Student services | how to get student id? | Student ID process | yes/optional | set |
| 12 | Student services | how to validate id? | ID validation clarification or ID validation process | optional | set |
| 13 | Library | where can i get library id? | Library ID card location | optional | set |
| 14 | Follow-up | what are the requirements? | Library ID requirements if asked after #13 | no | use previous |
| 15 | Clinic | dental services | Dental services menu | no | clarify |
| 16 | Clinic | how to get medical certificate on clinic | Clinic Medical Certificate Process | no | set |
| 17 | Academic policy | how to add and drop subject? | Add Drop Subject | no | none |
| 18 | University | what is tba? | Meaning of TBA | no | none |
| 19 | Services | what services can you provide? | Services clarification or Chatbot/BukSU services menu | no | clarify |
| 20 | Uniform | am i allowed to use civilian | Wear Civilian Attire | no | none |

## Regression Dataset - 120 Questions

### Campus Locations And Facilities

| # | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|
| 1 | Where is the main campus of BukSU located? | BukSU Main Campus Location | no | none |
| 2 | How do I find the university library? | Library Building/location answer | yes | set |
| 3 | Where is the dental clinic? | Dental/clinic location answer | yes | set |
| 4 | Is there a gym on campus? | Gym/location or availability answer | optional | none |
| 5 | Where can I find the guidance counselor's office? | Guidance Office/location answer | yes | set |
| 6 | Where is the registrar's office located? | Registrar/location answer | yes | set |
| 7 | Is there an ATM inside the campus? | ATM/location answer | yes | set |
| 8 | Where is the nearest cafeteria? | Cafeteria/canteen location answer | yes | set |
| 9 | Where do I apply for a student ID? | Student ID process | yes/optional | set |
| 10 | Where is the clinic located? | Medical Clinic location | yes | set |
| 11 | Where can I park my motorcycle? | Parking/motorcycle parking location | yes | none |
| 12 | Where is the administrative building? | Administrative Building location | yes | set |
| 13 | Where do I submit my missing admission documents? | Missing Admission Documents / Admission guidance | optional | none |
| 14 | location main campus? | BukSU Main Campus Location | no | none |
| 15 | where library? | Library Building/location answer | yes | set |
| 16 | clinic location? | Medical Clinic location | yes | set |
| 17 | finance office where? | Finance Building/location answer | yes | set |
| 18 | registrar room? | Registrar/location answer | yes | set |
| 19 | gym where? | Gym/location answer | yes | set |
| 20 | where canteen? | Canteen/cafeteria location answer | yes | set |
| 21 | guidance office? | Guidance Office/location answer | yes | set |
| 22 | cashiers desk? | Cashier/Finance window location | yes | set |
| 23 | location of pool? | Swimming pool/location answer | yes | set |
| 24 | oval where? | Oval/location answer | yes | set |
| 25 | guard house? | Guard house/location answer | yes | set |
| 26 | where dental? | Dental clinic/location answer | yes | set |
| 27 | main gate location? | Main gate/location answer | yes | set |
| 28 | supply office? | Supply Office/location answer | yes | set |
| 29 | Location of the FTC? | Food Technology Center/location answer | yes | set |
| 30 | Where is the ICT office? | ICT office/location answer | yes | set |

### Enrollment And Admission

| # | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|
| 31 | What are the general requirements for incoming freshmen? | Freshman Admission Requirements or Freshman Enrollment Process | no | set |
| 32 | How do I apply for admission at BukSU? | Admission application process | no | set |
| 33 | What is the process for returning students? | Returning/continuing students enrollment process | no | set |
| 34 | How can a transferee enroll? | Transferee Enrollment | no | set |
| 35 | What documents do I need to bring on enrollment day? | Enrollment Documents | no | set |
| 36 | Is there an entrance exam fee? | Exam Fees | no | none |
| 37 | How do I know if I passed the admission screening? | Exam Results | no | none |
| 38 | Can I enroll online? | Online Enrollment Steps | no | set |
| 39 | What are the requirements for a second degree applicant? | Second Courser Requirements | no | none |
| 40 | How do I track my enrollment status? | Enrollment status/SIAS/admissions portal answer | no | none |
| 41 | What should I do if I missed the enrollment deadline? | Late Enrollment | no | none |
| 42 | How do I register for the summer term? | Summer/midyear enrollment if data exists | no | none |
| 43 | Is the medical exam required before enrollment? | Enrollment medical certificate requirement | no | none |
| 44 | Where can I get the enrollment physical form? | Downloadable forms/enrollment physical form | no | none |
| 45 | enrollment when? | Enrollment Time Schedule | no | none |
| 46 | admission requirements? | Admission requirements clarification or exam requirements | no | clarify |
| 47 | freshman enroll how? | Freshman Enrollment Process | no | set |
| 48 | transferee step? | Transferee Enrollment | no | set |
| 49 | online enrollment link? | Online Enrollment Steps | no | set |
| 50 | schedule of enrollment? | Enrollment Time Schedule | no | none |
| 51 | entrance exam when? | Online Application Schedule or admission testing schedule | no | none |
| 52 | pass notice how? | Exam Results | no | none |
| 53 | enrollment document list? | Enrollment Documents | no | set |
| 54 | late enrollment allowed? | Late Enrollment | no | none |
| 55 | can you help me for my enrollment | Enrollment General Process | no | set |
| 56 | can you help me to enroll btw im first incoming first year student taking the bachelor of arts in philosopy | Freshman Enrollment Process | no | set |
| 57 | Help me enroll BS Biology. | Freshman Enrollment Process | no | set |
| 58 | Do you know how to enroll? I am first year student taking Bachelor of Science in Tourism Management. | Freshman Enrollment Process | no | set |
| 59 | is late enrol allowed | Late Enrollment | no | none |
| 60 | what is paying student and non paying student | Paying and Non-Paying Students | no | none |

### Courses, Programs, And Departments

| # | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|
| 61 | What undergraduate courses are offered in BukSU? | Course list clarification choices | no | clarify |
| 62 | Does BukSU offer a master's degree program? | BukSU Masters Courses | no | none |
| 63 | Is there a law school program available? | Law/Juris Doctor program | no | none |
| 64 | What are the major fields under the College of Information Technology? | COT/BSIT course info if data exists | no | none |
| 65 | Does the university offer short-term certificate courses? | Certificate/short-term courses if data exists | no | none |
| 66 | How long does the nursing program take? | Nursing program info | no | none |
| 67 | What engineering courses can I take here? | Course availability/fallback if no engineering data | no | none |
| 68 | Are there evening classes for working students? | Evening classes availability if data exists | no | none |
| 69 | What is the official website for course descriptions? | Courses website/admissions courses link | no | none |
| 70 | Do you offer teacher education programs? | COE/education course list | no | none |
| 71 | courses offered? | Course list clarification choices | no | clarify |
| 72 | bsit available? | BukSU BSIT Program | no | none |
| 73 | law school requirements? | Law Admission Requirements | no | none |
| 74 | masteral programs? | BukSU Masters Courses | no | none |
| 75 | phd courses? | Doctoral/graduate programs if data exists | no | none |
| 76 | architecture course available? | Course availability/fallback if no architecture data | no | none |
| 77 | major in English program? | BA English or BSED English depending wording | no | none |
| 78 | list of colleges? | BukSU Academic Colleges | no | none |
| 79 | nursing program check? | BukSU BSN Program | no | none |
| 80 | do buksu offer BA philo | BukSU BA Philosophy Program | no | none |
| 81 | how about bset? | BukSU BSET Program if previous context is course availability | no | use previous |
| 82 | what cut off scores for bachelor of science in electronic technology? | BukSU CAT Cutoff Scores | no | none |
| 83 | unsay course na available diris buksu | Course list clarification choices in Bisaya | no | clarify |
| 84 | pwedi ko mangutanag unsa nga course pwedi ma enrollan diris buksu | Course list clarification choices in Bisaya | no | clarify |
| 85 | unsa may mga course diris buksu na pwedi nako enrollan? | Course list clarification choices in Bisaya | no | clarify |

### Student Services, Library, And ICT

| # | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|
| 86 | how to get student id? | Student ID Process | yes/optional | set |
| 87 | how much is student id? | Student ID Fee | no | none |
| 88 | how to validate ID | ID Validation Process | optional | set |
| 89 | when is ID validation | ID Validation Day | no | none |
| 90 | how to validate COR | COR Validation Steps | no | set |
| 91 | when is COR validation | COR Validation Day | no | set |
| 92 | where can i get library id | Library ID Card Location | optional | set |
| 93 | and whats the requirements? | Library ID requirements after #92 | no | use previous |
| 94 | how much? | Library ID payment after #92 | no | use previous |
| 95 | how to borrow books | Borrow Books | no | set |
| 96 | library services | Library services menu | no | clarify |
| 97 | how to get wifi access | Get Wi-Fi Access | no | none |
| 98 | where do i get my official student email login? | Institutional Email Account | no | none |
| 99 | admission password help | Admission Password Help | no | none |
| 100 | what are the student services | BukSU Student Services menu | no | clarify |

### Clinic, Dental, Health, And Campus Life

| # | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|
| 101 | dental services | Dental Services Menu | no | clarify |
| 102 | request for dental oral examination | Request Dental Oral Examination | no | set |
| 103 | request for tooth extraction | Request Tooth Extraction | no | set |
| 104 | request for referral dispensing of medicine | Request Referral/Dispensing of Medicine | no | set |
| 105 | how to get medical certificate on clinic | Clinic Medical Certificate Process | no | set |
| 106 | medical certificate cost | Clinic Medical Certificate Cost | no | none |
| 107 | duration for getting medical certificate | Clinic Medical Certificate Duration | no | none |
| 108 | clinic services | Clinic services menu | no | clarify |
| 109 | dormitory services | Dormitory services menu | no | clarify |
| 110 | how many dormitories does buksu have | Number of Dormitories | no | none |

### Academic Policy, General Info, Ambiguity, Bisaya, And Typos

| # | Question | Expected record/display | Map | Follow-up |
|---|---|---|---|---|
| 111 | how to add and drop subject? | Add Drop Subject | no | none |
| 112 | how to apply for graduation | Graduation Application Process | no | set |
| 113 | inc grade process | INC Grade Solution | no | set |
| 114 | where can i get inc form | Get INC Form | no | none |
| 115 | who created you? | Bot Creator | no | none |
| 116 | who create you | Bot Creator | no | none |
| 117 | what is tba | Meaning of TBA | no | none |
| 118 | how to get id? | ID clarification choices | no | clarify |
| 119 | how to validate? | Validation clarification choices | no | clarify |
| 120 | services | Services clarification choices | no | clarify |

## User Approval Checklist Before Day 2

Before proceeding to Day 2 Phase 1, the user should:

1. Read `docs/Day 1 Structured Retrieval Flow Audit.md`.
2. Confirm the active files and legacy files look correct.
3. Run the 20-question smoke test against the live bot.
4. Send any wrong answer logs or screenshots.
5. Approve moving to Day 2.

## Codex Local Validation

Completed on 2026-06-19:

- Python compile check passed for:
  - `rasa/actions/knowledge_router.py`
  - `rasa/actions/query_normalizer.py`
  - `rasa/actions/query_interpreter.py`
  - `rasa/actions/retrieval_index.py`
  - `rasa/actions/retrieval_scorer.py`
- Direct routing checks passed:
  - `unsay course na available diris buksu` routes to Bisaya course-list clarification.
  - `unsay course na avalilable diris buksu pwedi nako ma sudlan` routes to Bisaya course-list clarification.
  - `pwedi ko mangutanag unsa nga course pwedi ma enrollan diris buksu` routes to Bisaya course-list clarification.
  - `unsa may mga course diris buksu na pwedi nako enrollan?` routes to Bisaya course-list clarification.
  - `how to enroll BS Biology` routes to `freshman_enrollment_process`.
  - `can you help me for my enrollment` routes to `enrollment_general_process`.
  - `is late enrol allowed` routes to `late_enrollment`.
