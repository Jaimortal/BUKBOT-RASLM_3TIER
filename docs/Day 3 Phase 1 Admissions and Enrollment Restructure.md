# Day 3 Phase 1 Admissions and Enrollment Restructure

Date: 2026-06-06

Scope: restructure `Enrollment_info.json` and `Admissions_info.json`.

## Enrollment Changes

File:

- `rasa/actions/Supper Saiyan/Enrollment_info.json`

The old flat enrollment topics were grouped into:

1. `enrollment_process`
   - `enrollment_general_process`
   - `online_enrollment_steps`
   - `mixed_enrollment_process`
   - `late_enrollment`

2. `enrollment_requirements`
   - `enrollment_documents`

3. `enrollment_fees`
   - `student_fees`

4. `sias_access`
   - `access_sias`

5. `transfer_and_enrollment_policy`
   - `transferee_enrollment`
   - `campus_transfer`
   - `double_enrollment_policy`

## Admissions Changes

File:

- `rasa/actions/Supper Saiyan/Admissions_info.json`

The old flat admissions topics were grouped into:

1. `college_admission_test`
   - CAT meaning, application, requirements, fees, results, schedule-related questions, calculator policy

2. `admission_application`
   - online application, status, deadline, denied applications, no slots, system errors

3. `admission_requirements`
   - freshman, transferee, second courser, GPAT, masters, law, ALS requirements

4. `admission_contacts`
   - ATU, registrar, scholarship, admission Facebook page, office schedule

5. `program_qualification_scores`
   - CAT score/cutoff questions

6. `board_exam_information`
   - board exam, mock board, licensure exam

7. `admission_accounts_and_documents`
   - admission account, password, institutional account, SIAS account, COR

8. `affirmative_action_program_admission`
   - affirmative action / AAP

Maps and images from the old Admissions file were preserved.

## Legacy Duplicate Cleanup

Removed 49 exact duplicate legacy records from `responses.json` after the structured files became the owning source.

Examples:

- `exam_requirements`
- `exam_fees`
- `take_exam`
- `freshman_admission_requirements`
- `masters_degree_admission_requirements`
- `buksu_admission_contact`
- `cat_exam_result`
- `Change_Pass_admission`
- `Find_Institutional_Account`
- `enrollment_general_process`
- `online_enrollment_steps`
- `enrollment_documents`
- `student_fees`

Non-duplicate legacy helpers such as `office_schedule` and `freshmen_application_period` were not deleted.

## Router Compatibility Fixes

Updated `knowledge_router.py` to preserve expected behavior for common short questions:

- `requirements for CAT`
- `cat fees`
- `what is buksu cat`
- `cat exam result`
- `how to apply for admission`
- `when is admission deadline`
- `freshman admission requirements`
- `masters admission requirements`
- `admission contact`
- `contact atu`
- `buksu office hours`
- `change admission password`
- `find institutional account`
- `online enrollment steps`
- `enrollment documents`
- `student fees`
- `transferee enrollment`
- `late enrollment`

Updated `context_manager.py` so response-intent subject matching happens before broad text-term matching. This prevents a response like `affirmative_action` from being stored as `college_admission_test` simply because the answer text mentions CAT.

## Regression Tests Added

Added tests for:

- enrollment process/documents/fees/late enrollment
- CAT requirements/process/fees/definition
- freshman and masters admission requirements
- admission contact map/image payload
- admission password and institutional account images
- office hours
- AAP map response and memory subject

## Retraining

No Rasa retraining is required for this phase because no NLU/domain/rules/stories files changed.

Restart the Rasa action server so Python action changes and JSON data changes are loaded.

