# Phase 1 Admissions + Enrollment QA Augmentation

Target files:
- `rasa/actions/Supper Saiyan/Admissions_info.json`
- `rasa/actions/Supper Saiyan/Enrollment_info.json`

## Structure Summary

`Admissions_info.json`
- 7 topic groups
- 54 subtopics
- Highest-risk overlaps: CAT result vs exam result, admission account vs institutional account, admission requirements vs enrollment requirements, CAT score vs exam-day requirements.

`Enrollment_info.json`
- 5 topic groups
- 24 subtopics
- Highest-risk overlaps: general enrollment vs late enrollment, online enrollment vs COR download, freshman enrollment vs documentary requirements, transferee enrollment vs transfer/campus transfer.

## Round 1: Linguistic Variations And Synonyms

Representative generated test patterns:
- What is BukSU CAT?
- How do I apply for the entrance exam?
- What should I bring on CAT day?
- Is the entrance exam free?
- Where can I see my admission result?
- How do I reset my admission account password?
- How can I download my COR?
- Can you guide me through enrollment?
- When does enrollment start?
- What documents should I prepare for enrollment?

Gaps found:
- Some direct English variants were missing for CAT application, test permit problems, CAT result viewing, and admission password recovery.
- General enrollment help needed more safe phrases that do not trigger late enrollment.

Fix applied:
- Added narrow phrases to `take_exam`, `exam_requirements`, `test_permit_issue`, `exam_fees`, `exam_results`, `cat_exam_result`, `Change_Pass_admission`, `where_get_cor`, `enrollment_general_process`, `freshman_enrollment_process`, and `enrollment_documents`.

## Round 2: Local And Structural Context

Representative generated test patterns:
- CAT requirement for IT
- BukSU percentage examination
- What CAT score do I need for BSIT?
- Where is Show Exam Result in my admission account?
- Where do I download COR after approval?
- Is BukSU accepting transfer students?
- Nursing waitlisted applicant, what should I do?
- Where do I submit CON requirements?
- How to access SIAS after enrollment?
- What is paying and non-paying student?

Gaps found:
- Program cutoff score terms needed more course-specific wording without exposing exact course score promises.
- Transfer-related wording needed protection against being misread as student ID or generic transfer.
- Nursing enrollment support needed more CON/waitlisted/medical/immunization phrases.

Fix applied:
- Added phrase coverage to `program_cutoff_scores`, `non_board_cutoff_score`, `board_course_cutoff_score`, `transferee_enrollment`, `con_nursing_enrollment_guidance`, `con_nursing_immunization_record`, `con_nursing_medical_requirements`, and `con_nursing_requirements_submission`.

## Round 3: Edge Cases And Rule Violations

Representative generated test patterns:
- My test permit will not open.
- I missed my CAT schedule.
- Can I enroll after the deadline?
- Main campus is full in the admission portal.
- My admission application was denied.
- I forgot to upload an admission requirement.
- I have wrong COR details after approval.
- Can I enroll in two schools?
- Can I transfer from satellite campus to main campus?
- What if I have no immunization record for nursing?

Gaps found:
- Error and exception wording was too thin for system errors, denied applications, no slots, main-campus-full, missed CAT schedule, and wrong COR after approval.
- Late enrollment phrase set needed strict late/deadline wording while avoiding generic enrollment questions.

Fix applied:
- Added phrases to `system_error`, `denied_applications`, `no_slots`, `main_campus_full`, `missed_buksu_cat_schedule`, `enrollment_application_approval`, `late_enrollment`, `campus_transfer`, and `double_enrollment_policy`.

## Payload Summary

Applied phrase additions:
- `Admissions_info.json`: 186 new phrases
- `Enrollment_info.json`: 111 new phrases

No responses, maps, pins, routes, intents, context topics, or display names were changed.

## Important Safety Rule Used

New phrases were added only when they included enough subject context. Broad single-word phrases such as `admission`, `enrollment`, `requirements`, `result`, or `account` were not added as standalone triggers.

## Loop-Back Regression Pass

After the first augmentation pass, a focused adversarial suite found 10 risky routing failures. These were mainly priority issues, not missing-response issues.

Fixed priority gaps:
- `how to schedule my college admission test` now routes to `take_exam`, not college/general info.
- `asa ko mag register para buksu cat` now routes to `take_exam`, not BukSU location.
- `no available buksu cat schedule slots` now routes to `no_slots`.
- `admission portal not working` now routes to `system_error`.
- `my admission application was denied what to do` now routes to `denied_applications`.
- `kulang akong admission requirements asa ipasa` now routes to `missing_admission_documents`.
- `unsa nga requirements para undergraduate enrollment` now routes to `enrollment_documents`, avoiding the old `undergraduate`/`graduate` substring collision.
- `where is apply enrollment button` now routes to `online_enrollment_steps`.
- `how do i know my enrollment application is approved` now routes to `enrollment_application_approval`.
- `difference between paying and non paying student` now routes to `paying_and_non_paying_students`.

Final focused regression:
- 47 high-risk Phase 1 query patterns tested
- 0 failures

Validation:
- `Admissions_info.json` parses successfully.
- `Enrollment_info.json` parses successfully.
- `knowledge_router.py` compiles successfully.
