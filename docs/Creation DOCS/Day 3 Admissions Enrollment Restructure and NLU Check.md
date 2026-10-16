# Day 3 Admissions and Enrollment Restructure + NLU Check

Scope followed from `docs/Day-by-Day Full Chatbot Build Prompt.txt`.

## Phase 1 - Admissions + Enrollment

Reviewed the current structured data in:
- `rasa/actions/Supper Saiyan/Admissions_info.json`
- `rasa/actions/Supper Saiyan/Enrollment_info.json`

Current structure already covers the required Day 3 groups:
- CAT definition, process, requirements, fees, schedule/deadline, result, reschedule, and test permit issues
- Admission application status, missing documents, deadlines, no slots, and main campus full cases
- Freshman, transferee, second courser, GPAT, master's, and law admission requirements
- Admission contact and ATU contact records
- Enrollment process, time/schedule, online enrollment, late enrollment, COR download, validation/payment, student fees, SIAS access, and transferee enrollment
- Nursing enrollment support records for incoming CON students

No broad data merge was needed in this pass because the records are already in the newer structured topic/subtopic format and are being routed by the current structured retrieval layer.

## Phase 2 - NLU Check

No NLU examples were added in this pass.

Reason:
- The Day 3 Admissions/Enrollment smoke tests passed through the router.
- Adding NLU examples without a failing intent case would require `rasa train` without a clear accuracy gain.
- Current broad intents already include the needed admission/enrollment purpose coverage.

## Router Smoke Tests

Passed:
- `enrollment when` -> `enrollment_time_schedule`
- `fees?` -> fee clarification choices
- `masters?` -> `buksu_masters_courses`
- `requirements for CAT` -> `exam_requirements`
- `how to apply for admission` -> `take_exam`
- `when is admission deadline` -> `admission_application_deadline`
- `what is GPAT` -> `gpat_admission_requirements`
- `where to get COR` -> `where_get_cor`
- `freshman admission requirements` -> `freshman_admission_requirements`
- `transferee requirements` -> `transferee_admission_requirements`
- `CAT fee` -> `exam_fees`
- `admission result` -> `exam_results`
- `late enrollment allowed?` -> `late_enrollment`
- `online enrollment link` -> `online_enrollment_steps`
- `student fees` -> `student_fees`
- `how to access SIAS` -> `access_sias`
- `unsaon pag apply sa admission` -> `take_exam`
- `kanus-a ang enrollment` -> `enrollment_time_schedule`
- `unsay requirements sa CAT` -> `exam_requirements`
- `unsa ang GPAT` -> `gpat_admission_requirements`

## Validation

JSON parse check:
- 16 JSON files checked
- Result: passed

Rasa validation:
- Command: `rasa data validate`
- Result: passed
- Notes: only dependency deprecation warnings appeared from Rasa/TensorFlow/SQLAlchemy packages.

## Before Day 4

Recommended manual tests:
- Admission schedule/deadline questions
- Admission result questions
- Freshman/transferee requirement questions
- Enrollment process and late enrollment questions
- COR download and SIAS access questions
- Bisaya variants for the same categories

