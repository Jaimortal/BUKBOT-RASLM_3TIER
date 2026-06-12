# Remaining Supper Saiyan Data Restructure

Date: 2026-06-06

Scope: restructure the remaining requested `Supper Saiyan` JSON files into the newer grouped data model.

## Files Restructured

### `Ict_info.json`

Grouped into:

- `ict_services`
  - `about_ict`
  - `get_wifi_access`
  - `ict_mission`

The old `get_wifi_access` map payload from `responses.json` was preserved in the structured subtopic.

### `Department_info.json`

Grouped into:

- `academic_colleges`
  - `buksu_academic_colleges`
  - `course_offer_CAS`
  - `course_offer_COB`
  - `course_offer_COT`
  - `course_offer_CON`
  - `course_offer_COE`
  - `course_offer_LAW`
  - `course_offer_COA`

### `Departamentals_facultystaff.json`

Grouped into:

- `college_deans`
- `department_heads`

### `Courses_info.json`

Grouped into:

- `undergraduate_program_overviews`
- `program_availability`
- `course_catalog`
- `general_curriculum_subjects`
- `course_shifting_and_training`

All 73 original course topics were preserved.

### `Clinic_info.json`

Grouped into:

- `university_clinic`
- `dental_services`

### `Classroom_policy.json`

Grouped into:

- `classroom_policies`

### `Administrators.json`

Grouped into:

- `university_administrators`

The empty blank topic was removed.

## Legacy Duplicate Cleanup

Removed 32 exact duplicate legacy records from `responses.json` after the structured subtopics became the owning source.

Examples:

- `about_ict`
- `get_wifi_access`
- `ict_mission`
- `buksu_academic_colleges`
- `buksu_courses_offered`
- `buksu_masters_courses`
- `course_shifting`
- `internship_requirement`
- `medic_clinic`
- `buksu_medical_dental_services`
- `phone_use_in_class`
- `eating_in_classroom`
- `submit_assignments_online`

## Router Compatibility Fixes

Updated `knowledge_router.py` with narrow high-confidence routes for:

- ICT and WiFi
- college/course offerings by acronym
- course catalog, masters, board/non-board course meaning
- course shifting, internship, OJT, NSTP, ROTC, PE
- clinic and dental service questions
- dean/head questions
- vice president and secretary questions
- classroom policy questions

Updated `context_manager.py` so mixed-case intent names such as `Head_of_BSIT`, `Dean_0f_COT`, and `course_offer_CAS` correctly map back to their parent subject.

## Regression Tests Added

Added tests for:

- ICT WiFi map payload
- college overview and CAS course offerings
- BSIT, courses offered, masters, board course meaning
- course shifting and internship
- clinic map, medical/dental services, dental requirements
- COT dean, BSIT head, vice presidents
- classroom phone/eating policy

## Retraining

No Rasa retraining is required because no NLU/domain/rules/stories files changed.

Restart the Rasa action server so Python action changes and JSON changes are loaded.

