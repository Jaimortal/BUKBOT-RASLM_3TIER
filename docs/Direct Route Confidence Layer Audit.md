# Direct Route Confidence Layer Audit

Date: 2026-07-12

## Goal

Prevent broad direct routes from returning a final answer before structured retrieval and the optional LLM reranker can challenge them.

The LLM reranker is already guarded: it only chooses from official JSON-backed candidates and the final response still comes from JSON. The current weakness is earlier than the LLM layer: some direct routes return immediately, so retrieval and LLM never run.

## Current Routing Order

Live flow in `rasa/actions/main_router.py`:

1. Reload JSON if changed.
2. Resolve entities and normalize the user message.
3. Early protected responses:
   - bot creator
   - uniform/civilian attire
   - smalltalk
   - context clarification/follow-up memory
   - ambiguous ID clarification
   - admission clarification
   - building directory/follow-up
   - generic faculty/dean office menus
   - services menu
   - course clarification
   - validation clarification
   - PE uniform clarification
   - facility availability
   - location priority
4. `knowledge_router.direct_intent_override(...)`
   - If it returns an intent, the router immediately returns that JSON response.
   - If it returns a special `__...__` marker, `find_best_response(...)` builds a clarification/menu.
5. If no direct route applies, location fallback may run.
6. `knowledge_router.find_best_response(...)`
   - direct override is checked again
   - validation/services/subject clarification checks run
   - structured retrieval scorer runs
   - LLM reranker may run only here
   - final local answer, clarification, or fallback is returned

Important consequence: any wrong answer returned in steps 3 or 4 cannot be corrected by the LLM reranker.

## Hard Direct Route Candidates

These are usually safe to return immediately because they are exact, UI-driven, or strongly protected:

- `smalltalk`
- bot creator questions
- exact button payload clarification choices already stored in memory
- follow-up intent resolved from active context memory
- exact known location requests after entity resolver confirms a location
- building directory menu and building directory follow-up
- generic faculty/dean office menu when intentionally broad
- service menu requests such as general services or chatbot help menu
- explicit validation clarification menu
- explicit ID clarification menu
- exact facility availability routes
- exact campus/facility location routes
- very specific payload-like records:
  - `cor_validation_steps`
  - `id_validation_process`
  - `pe_uniform_process` when the question explicitly says PE uniform
  - `campus_entry_without_student_id`
  - `student_id_process` for exact `student id` / `school id`
  - `library_id_card_location` for exact library ID process/location wording

These can remain hard routes in Phase 2 unless testing shows overlap.

## Soft Direct Route Candidates

These should be challengeable because they are based on broad words that often overlap:

- Admission/CAT/result routes:
  - `take_exam`
  - `exam_results`
  - `cat_exam_result`
  - `exam_requirements`
  - `exam_fees`
  - `admission_application_deadline`
  - `online_application_schedule`
  - `missing_admission_documents`
  - `test_permit_issue`
  - `reschedule_entrance_exam`
  - `non_passer_enrollment_affirmative_action`
  - `affirmative_action`
- Admission account/password/portal routes:
  - `reset_portal_password_buksu`
  - `Change_Pass_admission`
  - `admission_portal_login`
  - `admission_account_registration`
  - `Change_info_admission`
- Course routes:
  - course offer records such as `buksu_IT`, `buksu_AB_PHILO`, etc.
  - college course list routes
  - `course_slots`
  - `program_cutoff_scores`
  - `board_course_cutoff_score`
  - `non_board_cutoff_score`
  - `buksu_masters_courses`
- Enrollment routes:
  - `enrollment_general_process`
  - `freshman_enrollment_process`
  - `online_enrollment_steps`
  - `late_enrollment`
  - `enrollment_time_schedule`
  - `enrollment_documents`
  - `enrollment_validation_payment`
  - `transferee_enrollment`
  - `graduate_law_enrollment_requirements`
  - `medicine_enrollment_requirements`
- Library/book routes:
  - `library_borrow_books_process`
  - `library_available_books`
  - `library_return_books_process`
  - `library_borrowing_rules`
  - `library_late_return_penalty`
- Classroom/academic policy routes:
  - `change_section_schedule_conflict`
  - `class_schedule_help`
  - `phone_use_in_class`
  - `change_class_schedule`
  - `shift_to_another_course_next_school_year`
  - `failed_subject_policy`
  - `inc_grade_solution`
  - `get_inc_form`
- Clinic/dental routes:
  - `medic_clinic`
  - `buksu_medical_dental_services`
  - `dental_services_menu`
  - `request_dental_consult`
  - `request_dental_oral_examination`
  - `request_tooth_extraction`
- University/admin/person routes:
  - college dean/head/person routes
  - vice president/admin routes
  - `Buksu_worth_it`
  - `buksu_study_place`
  - `bukus_location`
  - `buksu_contact_number`

These do not mean the data is wrong. They mean the match should be treated as a strong candidate, not always the final answer.

## Risky Overlap Examples

Known or likely failures:

- `unsaon nako pag reset sa akong password sa admission?`
  - Previously returned `take_exam` before retrieval/LLM.
  - A narrow patch now sends it to `reset_portal_password_buksu`.
  - Architecture risk remains for other broad routes.
- `tell me whats the process of getting books`
  - Can overlap with admission/enrollment process if `process/getting` wins too early.
- `CAT requirement for IT`
  - Can overlap between CAT requirements, course cutoff scores, and IT course info.
- `buksu percentage examination`
  - Can overlap with About BukSU, CAT result, and cutoff score records.
- `how do i change my class section?`
  - Can overlap with generic class concerns.
- `is using phone during the class allowed?`
  - Can overlap with admission mobile phone application.
- `what do i do if i did not pass the admission?`
  - Can overlap with exam result checking vs affirmative action.
- `how do i know if i did not pass the admission?`
  - Should route to exam result checking, not affirmative action.
- `pwedi maka sulod sa buksu biskan way id`
  - Can overlap with BukSU location when `buksu` is treated as a place.
- `unsay course nga naapay bakanti`
  - Can overlap with general course offer/category clarification.
- `where can i find the CAS SBO office`
  - Can overlap with CAS building general response plus CAS SBO office.

## Proposed Phase 2 Design

Add a route decision layer:

```python
{
    "intent": "take_exam",
    "confidence": "hard" | "soft",
    "reason": "matched broad admission exam wording"
}
```

Suggested implementation:

1. Keep `direct_intent_override(...)` temporarily for compatibility.
2. Add `direct_intent_decision(...)` or `classify_direct_intent(...)`.
3. Use a allowlist for hard routes.
4. Treat all other direct routes as soft unless explicitly listed as hard.
5. In `MainRouterService.route_with_context(...)`:
   - hard direct route: return immediately
   - soft direct route: run structured retrieval
   - if retrieval agrees strongly with soft intent, return soft intent
   - if retrieval disagrees or is close, allow LLM reranker to choose
   - if LLM unavailable, use local confidence/clarification
6. Preserve all response metadata by still calling `data_loader.get_response(...)` on the selected intent.

## Important Safety Constraints For Phase 2

- Do not let LLM generate final text.
- Do not expose API errors to users.
- Do not break exact button payloads.
- Do not break location maps or mapData.
- Do not remove existing special-case logic yet.
- Keep rollback easy: soft-route challenge layer should be isolated.

## Suggested Phase 2 Scope

To reduce risk, convert only the highest-risk groups first:

1. Admission password/account/portal.
2. Admission CAT/result/requirements/cutoff.
3. Course offer/course slots/course cutoff.
4. Library book process/availability.
5. Classroom phone/section/schedule.

Leave lower-risk direct routes hard until the first batch passes regression.

## Phase 1 Test Queries

Use these for tracing before Phase 2:

- `unsaon nako pag reset sa akong password sa admission?`
- `tell me whats the process of getting books?`
- `CAT requirement for IT`
- `buksu percentage examination`
- `how do i change my class section?`
- `is using phone during class allowed?`
- `what do i do if i did not pass the admission?`
- `how do i know if i did not pass the admission?`
- `pwedi maka sulod sa buksu biskan way id`
- `unsay course nga naapay bakanti`
- `where can i find the CAS SBO office`

## Phase 1 Conclusion

The LLM reranker is correctly guarded, but it is only reachable after the current direct route layer. The main architecture issue is not the LLM; it is that broad direct routes are final too early.

Phase 2 is needed to make soft direct routes challengeable.
