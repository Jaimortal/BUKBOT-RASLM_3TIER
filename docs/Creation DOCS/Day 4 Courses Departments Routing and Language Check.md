# Day 4 Courses and Departments Routing Check

Scope followed from `docs/Day-by-Day Full Chatbot Build Prompt.txt`.

## Phase 1 - Courses + Departments

Reviewed:
- `rasa/actions/Supper Saiyan/Courses_info.json`
- `rasa/actions/Supper Saiyan/Department_info.json`
- `rasa/actions/Supper Saiyan/Departamentals_facultystaff.json`

The course and department data is already in the newer structured topic/subtopic format:
- Program records use course/program-level `subject_key` and `subject_type`.
- Course catalog records cover all courses, board courses, non-board courses, masters courses, board/non-board meaning, evening class guidance, NSTP, ROTC, PE, prerequisites, shifting, internship, and OJT.
- Department records cover CAS, COT, COB, CON, COE, LAW, and COA/CPAG course lists.
- Course slots are already represented as searchable child rows.

No major data restructure was needed in this pass.

## Phase 2 - Department/College Routing

Verified college acronym routing:
- CAS
- COT
- COB
- CON
- COE
- CPAG
- LAW
- COA

Also verified course-vs-location separation:
- `cpag building` -> location/map response
- `where is CAS building` -> location/map response
- `courses in CPAG` -> course data, no map
- `courses in CAS` -> course data, no map

## Updates Made

Improved Bisaya recognition and response quality:
- Added common lower-case Bisaya variants to `rasa/actions/language_detector.py`
- Fixed Cebuano response text in `Department_info.json` for:
  - COB course list
  - COT course list
  - COA/CPAG course list

No NLU examples were added because the routing tests passed without changing Rasa NLU files.

## Smoke Tests

Passed:
- `do buksu has masters` -> `buksu_masters_courses`
- `what courses are offered` -> course-list clarification choices
- `does buksu have IT` -> `buksu_bsit_program`
- `what courses in CAS` -> `course_offer_CAS`
- `what is board course` -> `meaning_of_board_course`
- `can i shift course` -> `course_shifting`
- `what is prerequisite` -> `prerequisite_subjects_purpose`
- `courses in COT` -> `course_offer_COT`
- `courses in COB` -> `course_offer_COB`
- `courses in CPAG` -> `course_offer_COA`
- `unsay mga kurso sa COT` -> `course_offer_COT` with Cebuano response
- `unsa nga course sa COB` -> `course_offer_COB` with Cebuano response
- `unsa nga course sa CPAG` -> `course_offer_COA` with Cebuano response

## Validation

Passed:
- Python compile check for touched Python modules
- JSON parse check for `Department_info.json` and `Courses_info.json`

Rasa retraining is not required for this pass because no NLU/domain/rules files were changed.

