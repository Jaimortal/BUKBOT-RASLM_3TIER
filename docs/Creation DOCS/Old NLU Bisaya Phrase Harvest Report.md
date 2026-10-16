# Old NLU Bisaya Phrase Harvest Report

Source file: `OLD DATA/nlu_old_version.yml`

This harvest keeps the current structured retrieval architecture. The old super-intents were not restored.

## What Was Added

- Specific old intent examples were copied only when the old intent name exactly matched a current JSON record intent.
- Old `ask_*` super-intent blocks were skipped to avoid reintroducing broad topic confusion.
- Bisaya examples were preferred. A few English examples were added only for exact specific-intent matching.
- Reusable Bisaya phrases and tokens were added to `rasa/actions/normalization_rules.json`.

## JSON Phrase Additions by File

- `rasa\actions\Supper Saiyan\Academic_policy.json`: 11 phrase additions
- `rasa\actions\responses.json`: 636 phrase additions

## Top Intent Additions

- `cor_validation_steps`: 22
- `about_intramurals`: 11
- `accounting_office_location`: 11
- `application_always_denied`: 11
- `application_pending`: 11
- `buksu_gymnasium_facility`: 11
- `buksu_mandates`: 11
- `buksu_official_anthem`: 11
- `campus_dress_code_policy`: 11
- `campus_safety`: 11
- `cancel_tabuk_assistance`: 11
- `cannot_upload_2x2_picture`: 11
- `change_portal_password_buksu`: 11
- `change_program_after_application`: 11
- `check_portal_enrollment_status`: 11
- `college_shirt_allowed`: 11
- `cor_validation_location`: 11
- `early_document_request`: 11
- `free_tuition_undergraduate_buksu`: 11
- `freshmen_application_period`: 11
- `freshmen_intramurals`: 11
- `graduation_attendance`: 11
- `graduation_rehearsal_attendance`: 11
- `guidance_counseling_services_buksu`: 11
- `inactive_group_member`: 11
- `institutional_email_info`: 11
- `intramurals_week_classes`: 11
- `join_student_organizations_process`: 11
- `lost_on_campus`: 11
- `new_student_orientation_purpose`: 11
- `no_noon_break_policy`: 11
- `peer_mentoring`: 11
- `portal_account_locked_issue`: 11
- `portal_login_problem`: 11
- `previous_name_buksu_college`: 11
- `shorts_on_campus`: 11
- `significance_year_1924_buksu`: 11
- `student_organizations`: 11
- `student_stress_support`: 11
- `tes_release_delay`: 11
- `tes_with_other_scholarships`: 11
- `test_permit_corrupted`: 11
- `tracer_study`: 11
- `visitor_campus_access`: 11
- `wear_civilian_attire`: 11
- `buksu_establishment_year`: 10
- `buksu_satellite_campuses`: 10
- `continuing_students_enrollment_process`: 10
- `lost_and_found_buksu`: 10
- `pwd_student_assistance_services`: 10
- `reset_portal_password_buksu`: 10
- `student_assistant_application`: 10
- `student_assistant_application_process`: 10
- `university_code_definition`: 10
- `dasig_spirit_animal_buksu`: 9
- `smart_buksu_vision`: 8
- `sports_facilities_for_students`: 8
- `update_student_portal_information`: 8
- `buksu_alumni_association`: 7
- `Bot_creator`: 6

## Safety Notes

- Existing English phrases and responses were not removed or replaced.
- This does not add old Rasa super-intents back into `domain.yml`.
- Because JSON data and normalization rules changed, restart the Rasa action server before testing.
- Rasa training is not required for the JSON phrase additions alone, but it is still needed if `nlu.yml`, `domain.yml`, or rules changed earlier and were not trained yet.

## Super-Intent Group Harvest

A second pass harvested obvious grouped examples from old broad blocks and attached them to current specific records.

- `rasa\actions\Supper Saiyan\Admissions_info.json`: 97 grouped phrase additions
- `rasa\actions\Supper Saiyan\Courses_info.json`: 140 grouped phrase additions
- `rasa\actions\Supper Saiyan\Enrollment_info.json`: 77 grouped phrase additions

Grouped target intents:

- `access_sias`: 9 candidate phrases
- `application_next_step`: 6 candidate phrases
- `buksu_AB SocSci_program`: 4 candidate phrases
- `buksu_AB-ECON_program`: 4 candidate phrases
- `buksu_AB-ENG_program`: 4 candidate phrases
- `buksu_AB-PHILO_program`: 4 candidate phrases
- `buksu_AB-SOCIO_program`: 4 candidate phrases
- `buksu_BECED_program`: 4 candidate phrases
- `buksu_BEED_program`: 2 candidate phrases
- `buksu_BPA_program`: 6 candidate phrases
- `buksu_BPED_program`: 8 candidate phrases
- `buksu_BS COMDEV_program`: 4 candidate phrases
- `buksu_BS-BIO_program`: 4 candidate phrases
- `buksu_BS-ES_program`: 4 candidate phrases
- `buksu_BS-MATH_program`: 6 candidate phrases
- `buksu_BSAT_program`: 4 candidate phrases
- `buksu_BSA_program`: 4 candidate phrases
- `buksu_BSBA-FM_program`: 4 candidate phrases
- `buksu_BSDC_program`: 4 candidate phrases
- `buksu_BSED-ENG_program`: 2 candidate phrases
- `buksu_BSED-FIL_program`: 2 candidate phrases
- `buksu_BSED-MATH_program`: 2 candidate phrases
- `buksu_BSED-SCI_program`: 2 candidate phrases
- `buksu_BSEMC-DAT_program`: 4 candidate phrases
- `buksu_BSET_program`: 4 candidate phrases
- `buksu_BSFT_program`: 4 candidate phrases
- `buksu_BSHM_program`: 4 candidate phrases
- `buksu_BSIT_program`: 4 candidate phrases
- `buksu_BSN_program`: 4 candidate phrases
- `buksu_board_courses`: 10 candidate phrases
- `buksu_courses_offered`: 6 candidate phrases
- `buksu_masters_courses`: 14 candidate phrases
- `buksu_non_board_courses`: 8 candidate phrases
- `campus_transfer`: 7 candidate phrases
- `contact_atu`: 11 candidate phrases
- `contact_registrar`: 8 candidate phrases
- `denied_applications`: 9 candidate phrases
- `double_enrollment_policy`: 8 candidate phrases
- `enrollment_documents`: 8 candidate phrases
- `enrollment_general_process`: 7 candidate phrases
- `exam_fees`: 10 candidate phrases
- `exam_requirements`: 6 candidate phrases
- `exam_results`: 12 candidate phrases
- `main_campus_full`: 7 candidate phrases
- `mixed_enrollment_process`: 10 candidate phrases
- `no_slots`: 8 candidate phrases
- `online_application_schedule`: 7 candidate phrases
- `online_enrollment_steps`: 9 candidate phrases
- `status_application`: 6 candidate phrases
- `student_fees`: 11 candidate phrases
- `take_exam`: 7 candidate phrases
- `transferee_enrollment`: 9 candidate phrases

## Validation Results

Checks completed after the harvest:

- JSON validation passed for:
  - `rasa/actions/responses.json`
  - `rasa/actions/normalization_rules.json`
  - `rasa/actions/Supper Saiyan/Academic_policy.json`
  - `rasa/actions/Supper Saiyan/Admissions_info.json`
  - `rasa/actions/Supper Saiyan/Courses_info.json`
  - `rasa/actions/Supper Saiyan/Enrollment_info.json`
- Python compile passed for:
  - `query_normalizer.py`
  - `query_interpreter.py`
  - `knowledge_router.py`
  - `main_router.py`
- Direct router smoke tests passed for:
  - `unsaon nako pag enroll sa buksu` -> `enrollment_general_process`
  - `unsa nga mga dokumento ang kinahanglan nako dalhon para sa enrollment` -> `enrollment_documents`
  - `asa nako makita ang resulta sa exam` -> `exam_results`
  - `pila ang bayad sa admission test` -> `exam_fees`
  - `unsa nga mga courses ang gina offer sa bukidnon state university` -> `buksu_courses_offered`
  - `naa bay masters courses ang buksu` -> `buksu_masters_courses`
  - `gusto ko makabalo kung nag offer ba ang BukSU og Bachelor of Arts in Philosophy` -> `buksu_AB-PHILO_program`
  - `pwede nimo ihatag ang listahan sa mga board courses` -> `buksu_board_courses`

`pytest` was not available in the local Python environment, so the project pytest suite could not be run from this shell.
