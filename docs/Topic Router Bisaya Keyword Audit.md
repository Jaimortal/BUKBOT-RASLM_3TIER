# Topic Router Bisaya Keyword Audit

Source folder: `rasa/actions/Topic Router`

The old topic-router files were reviewed as a phrase source only. The old keyword scoring architecture was not restored.

## What Was Safe To Reuse

- `phrases` from topic-router records whose key exactly matched a current JSON `intent`.
- A small set of reusable Bisaya language concepts such as `mogawas`, `bakante`, `puno`, `sabado`, `domingo`, `dapit`, and `moadto`.

## What Was Not Reused Directly

- Old `strong_keywords` and `weak_keywords` were not copied into JSON scoring fields because many are broad words like `student`, `office`, `process`, `what`, `unsa`, `buksu`, and can cause overlap.
- Topic-router keys without an exact current JSON intent match were skipped.

## Phrase Additions By File

- `rasa\actions\Supper Saiyan\Academic_policy.json`: 56 phrase additions
- `rasa\actions\Supper Saiyan\Administrators.json`: 12 phrase additions
- `rasa\actions\Supper Saiyan\Admissions_info.json`: 224 phrase additions
- `rasa\actions\Supper Saiyan\Classroom_policy.json`: 19 phrase additions
- `rasa\actions\Supper Saiyan\Clinic_info.json`: 31 phrase additions
- `rasa\actions\Supper Saiyan\Courses_info.json`: 150 phrase additions
- `rasa\actions\Supper Saiyan\Departamentals_facultystaff.json`: 29 phrase additions
- `rasa\actions\Supper Saiyan\Department_info.json`: 30 phrase additions
- `rasa\actions\Supper Saiyan\Dormitory_info.json`: 28 phrase additions
- `rasa\actions\Supper Saiyan\Enrollment_info.json`: 19 phrase additions
- `rasa\actions\Supper Saiyan\Ict_info.json`: 1 phrase additions
- `rasa\actions\Supper Saiyan\Library_info.json`: 15 phrase additions
- `rasa\actions\Supper Saiyan\Oss_services.json`: 24 phrase additions
- `rasa\actions\Supper Saiyan\University_info.json`: 43 phrase additions

## Top Matched Intents

- `affirmative_action`: 20
- `about_pe`: 7
- `course_shifting`: 7
- `course_shifting_later_years`: 7
- `evening_classes_working_students`: 7
- `female_dorm`: 7
- `male_dorm`: 7
- `minor_subject`: 7
- `prerequisite_subjects_purpose`: 7
- `program_shifting_policy`: 7
- `rotc_meaning`: 7
- `about_nstp`: 6
- `buksu_medical_dental_services`: 6
- `dental_oral_examination_requirement`: 6
- `freshman_admission_requirements`: 6
- `internship_requirement`: 6
- `on_the_job_training`: 6
- `requirement_for_dental_consultation`: 6
- `Change_info_admission`: 5
- `Find_Institutional_Account`: 5
- `additional_slots`: 5
- `admission_application_deadline`: 5
- `all_office_schedule`: 5
- `application_next_step`: 5
- `apply_cat_using_mobile_phone`: 5
- `buksu_academic_colleges`: 5
- `buksu_cat_calculator_policy`: 5
- `cat_exam_result`: 5
- `denied_applications`: 5
- `eating_in_classroom`: 5
- `exam_fees`: 5
- `exam_requirements`: 5
- `exam_results`: 5
- `law_admission_requirements`: 5
- `licensure_examination`: 5
- `main_campus_full`: 5
- `masters_degree_admission_requirements`: 5
- `medic_clinic`: 5
- `missed_buksu_cat_schedule`: 5
- `mock_board_exam`: 5
- `no_slots`: 5
- `online_application_schedule`: 5
- `phone_use_in_class`: 5
- `program_cutoff_scores`: 5
- `reschedule_entrance_exam`: 5
- `second_courser_cat_application`: 5
- `second_courser_requirements`: 5
- `status_application`: 5
- `submit_assignments_online`: 5
- `take_exam`: 5
- `transferee_admission_requirements`: 5
- `Campus_tour`: 4
- `Cat_score_for_nonboard`: 4
- `Change_Pass_admission`: 4
- `Find_Sias_Account`: 4
- `admission_contact_help`: 4
- `als_graduate_buksu_cat_application`: 4
- `board_exam_review`: 4
- `buksu_admission_facebook_page`: 4
- `buksu_board_courses`: 4
- `buksu_cat_definition`: 4
- `buksu_study_place`: 4
- `campus_dormitories`: 4
- `cat_requirement_nursing_program`: 4
- `class_concerns`: 4
- `contact_atu`: 4
- `contact_registrar`: 4
- `contact_scholarship_unit`: 4
- `course_offer_CAS`: 4
- `course_offer_COB`: 4
- `course_offer_CON`: 4
- `course_offer_COT`: 4
- `exam_location_vs_campus`: 4
- `gpat_admission_requirements`: 4
- `library_id_card_requirements`: 4
- `lost_student_id_replacement_process`: 4
- `med_mission`: 4
- `med_vision`: 4
- `number_of_dormitories`: 4
- `request_good_moral_certificate_oss`: 4

## Skipped Router Topics Without Exact JSON Intent Match

- `Requirement_get_id`: 6 phrase candidates
- `available_books`: 10 phrase candidates
- `borrow_books`: 7 phrase candidates
- `borrowing_rules`: 12 phrase candidates
- `dental_consultation_process`: 10 phrase candidates
- `dental_oral_examination_process`: 10 phrase candidates
- `late_return_penalty`: 11 phrase candidates
- `return_books`: 6 phrase candidates

## Safe Normalization Rules Added

- Phrase rules: 25 reviewed rules
- Token rules: 23 reviewed rules
- Root rules: 9 reviewed rules

## Validation Results

Checks completed after applying the safe harvest:

- JSON validation passed for all files in `rasa/actions/Supper Saiyan`, `rasa/actions/responses.json`, and `rasa/actions/normalization_rules.json`.
- Python compile passed for `knowledge_router.py`.
- Direct router smoke tests passed for:
  - `kanus a mogawas ang result sa exam` -> `exam_results`
  - `wala na bay bakante sa admission` -> `no_slots`
  - `puno na ang main campus` -> `main_campus_full`
  - `pwede mag gamit ug cellphone sa klase` -> `phone_use_in_class`
  - `maka enroll ba ko kung wala ko nakapasar sa cat` -> `affirmative_action`

Observation:

- `open ba ang registrar sa sabado` returns the correct office-hours answer, but the route slot did not expose `conversation_last_intent`. This is a non-blocking slot-label issue, not a wrong-answer issue from the harvest.
