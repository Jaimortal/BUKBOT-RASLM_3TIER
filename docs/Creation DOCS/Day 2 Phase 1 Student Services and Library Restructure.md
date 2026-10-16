# Day 2 Phase 1 Student Services and Library Restructure

Date: 2026-06-06

Scope: restructure `Library_info.json` and `Oss_services.json` only.

## What Changed

### Library

File:

- `rasa/actions/Supper Saiyan/Library_info.json`

The old flat library topics were grouped into structured subjects:

1. `library_id_card`
   - `location` -> `library_id_card_location`
   - `requirements` -> `library_id_card_requirements`
   - `payment` -> `library_id_card_payment`

2. `library_borrowing`
   - `policy` -> `library_borrowing_rules`
   - `process` -> `library_borrow_books_process`
   - `return_process` -> `library_return_books_process`
   - `late_return_penalty` -> `library_late_return_penalty`
   - `availability` -> `library_available_books`
   - `access_resources` -> `access_buksu_library_resources`

3. `library_hours`
   - `schedule` -> `library_hours`

Risky global `strong_keywords` were removed from the library ID metadata. The new structure uses `subject_terms` and `metadata.phrases` instead.

### OSS Services

File:

- `rasa/actions/Supper Saiyan/Oss_services.json`

The old flat OSS topics were grouped into structured subjects:

1. `student_id`
   - `process` -> `student_id_process`
   - `requirements` -> `student_id_requirements`
   - `payment` -> `Student_id_fee`
   - `replacement` -> `lost_student_id_replacement_process`

2. `good_moral_certificate`
   - `process` -> `request_good_moral_certificate_oss`

3. `affirmative_action_program`
   - `process` -> `affirmative_action`

Existing student ID, good moral, and affirmative action map pins/routes were preserved.

## Legacy Duplicate Cleanup

Removed from `rasa/actions/responses.json` because structured JSON now owns these answers:

- `library_id_card_location`
- `library_id_card_payment`
- `library_id_card_requirements`
- `access_buksu_library_resources`
- `request_good_moral_certificate_oss`
- `lost_student_id_replacement_process`
- `good_moral_certificate_request`

These removals reduce duplicate-answer risk and make structured memory/map behavior more predictable.

## Compatibility Notes

- `responses_location.json` was not changed.
- No Rasa NLU/domain/rules/stories changes were made.
- No retraining should be required for this phase because only JSON knowledge data and tests changed.
- Existing direct routes in `knowledge_router.py` still resolve student ID and library ID.
- Dynamic routes from `data_loader.py` now provide follow-up support for the new subjects.

## Focused Test Cases Covered

- `where can i get library id`
- `what are the requirements?`
- `how much?`
- `how to get id?`
- `student id`
- `how to get student id?`
- `how to borrow books`
- `library hours`
- `how to request good moral certificate`
- `where to get good moral`
- `how to apply for affirmative action`

## Next Safe Step

Proceed to Day 2 Phase 2 only after user approval.

Recommended Day 2 Phase 2 focus:

- Router compatibility cleanup for the new library/OSS structure.
- Add any missing direct-intent overrides only if the tests reveal real ambiguity.
- Do not start Admissions/Enrollment restructuring until Day 3.

