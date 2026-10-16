# Day 1 Phase 1 Project Audit

Date: 2026-06-06

Scope: audit only. No data restructuring was performed in this phase.

## Summary

The project is already partially moved away from the old super-intent/topic-router architecture. Rasa rules and stories now route the major user-purpose intents into `action_main_router`, and the action layer has the newer modular files:

- `main_router.py`
- `query_interpreter.py`
- `entity_resolver.py`
- `knowledge_router.py`
- `response_builder.py`
- `data_loader.py`
- `context_manager.py`

The data layer is not fully migrated yet. `Academic_policy.json` is fully grouped into the new subject/subtopic structure, while `Library_info.json` and `Oss_services.json` are only partially grouped. Most other `Supper Saiyan` JSON files are still flat topic lists.

## Current Architecture State

Active Rasa routing:

- `rasa/domain.yml` declares `action_main_router`.
- `rasa/data/rules.yml` routes broad intents to `action_main_router`.
- `rasa/data/stories.yml` routes broad intents to `action_main_router`.
- `rasa/actions/actions.py` defines `ActionMainRouter` and delegates to `MainRouterService`.

Legacy compatibility still exists:

- `rasa/actions/Topic Router/*.py` still contains old keyword pattern dictionaries.
- `rasa/actions/actions.py` still contains wrapper methods such as `get_library_response`, `get_academic_policy_response`, and other `get_structured_response` wrappers that mention topic patterns.
- These old wrappers should be treated as legacy compatibility. New work should go through `main_router.py`, `knowledge_router.py`, and `data_loader.py`.

## File Classification

| File | Type | Topics/Records | Structured Parent Topics | Subtopics | Map Sensitive | Image Sensitive | Status |
|---|---:|---:|---:|---:|---|---|---|
| `responses.json` | legacy list | 218 | 0 | 0 | Yes, 8 mapData records | No detected image records | Legacy fallback / duplicate risk |
| `responses_location.json` | location map KB | 191 locations | 0 | 0 | Yes, 187 mapped locations | Yes, 1 image-sensitive location | Keep separate, do not restructure into Supper Saiyan |
| `Academic_policy.json` | Supper Saiyan | 11 | 11 | 27 | No | No | Already structured |
| `Library_info.json` | Supper Saiyan | 8 | 1 | 3 | No direct maps found | No | Partially structured |
| `Oss_services.json` | Supper Saiyan | 6 | 2 | 0 | Yes, map/mapRef records | No | Partially structured |
| `Admissions_info.json` | Supper Saiyan | 48 | 0 | 0 | Yes | Yes | Old flat format |
| `Courses_info.json` | Supper Saiyan | 73 | 0 | 0 | No | No | Old flat format |
| `Enrollment_info.json` | Supper Saiyan | 10 | 0 | 0 | No | No | Old flat format |
| `University_info.json` | Supper Saiyan | 20 | 0 | 0 | No | Yes | Old flat format |
| `Administrators.json` | Supper Saiyan | 7 | 0 | 0 | No | No | Old flat format, has 1 blank topic |
| `Departamentals_facultystaff.json` | Supper Saiyan | 14 | 0 | 0 | No | No | Old flat format |
| `Department_info.json` | Supper Saiyan | 8 | 0 | 0 | No | No | Old flat format |
| `Dormitory_info.json` | Supper Saiyan | 6 | 0 | 0 | No | No | Old flat format |
| `Clinic_info.json` | Supper Saiyan | 8 | 0 | 0 | No | No | Old flat format |
| `Classroom_policy.json` | Supper Saiyan | 4 | 0 | 0 | No | No | Old flat format |
| `Ict_info.json` | Supper Saiyan | 3 | 0 | 0 | No direct maps in Supper Saiyan file | No | Old flat format |

## Duplicate And Outdated Data Risk

Many `Supper Saiyan` topic keys or intents also exist in `responses.json`. This creates duplicate-answer risk because the loader currently merges legacy and structured sources.

Detected overlaps:

- `Academic_policy.json`: 24 overlaps with `responses.json`
- `Admissions_info.json`: 40 overlaps
- `Classroom_policy.json`: 4 overlaps
- `Clinic_info.json`: 4 overlaps
- `Courses_info.json`: 20 overlaps
- `Department_info.json`: 1 overlap
- `Dormitory_info.json`: 4 overlaps
- `Enrollment_info.json`: 9 overlaps
- `Ict_info.json`: 3 overlaps
- `Library_info.json`: 4 overlaps
- `Oss_services.json`: 2 overlaps
- `University_info.json`: 9 overlaps

Important note: duplicates should not be deleted blindly. During restructuring, keep the better source, verify map/image payloads, then remove or demote the duplicate only after tests pass.

## Map Format Audit

Current map formats in use:

1. `responses.json` uses `responses.mapData`.
2. `responses_location.json` uses location records with `map`, `pins`, and `routes`.
3. `Supper Saiyan` files use a mix of:
   - `map`
   - `pins`
   - `routes`
   - `mapRef`
   - images beside mapped topics

Map-sensitive legacy records in `responses.json`:

- `get_wifi_access`
- `buksu_med_loc`
- `add_drop_subject`
- `student_id_replacement`
- `application_always_denied`
- `join_student_organizations_process`
- `lost_student_id_replacement_process`
- `cor_validation_steps`

Map-sensitive `Supper Saiyan` records:

- `Admissions_info.json`
  - `buksu_admission_contact`
  - `affirmative_action`
- `Oss_services.json`
  - `Requirement_get_id` via `mapRef`
  - `request_good_moral_certificate_oss`
  - `student_id_process`
  - `affirmative_action`

Image-sensitive `Supper Saiyan` records:

- `Admissions_info.json`
  - `buksu_admission_contact`
  - `cat_exam_result`
  - `Change_Pass_admission`
  - `Find_Institutional_Account`
- `University_info.json`
  - `buksu_president`
  - `buksu_seal_significance`

## Admin Panel Risk

The current admin Super Intent editor reads and updates flat topics. It does not fully understand grouped parent topics with `subtopics`.

Current admin limitation:

- It reads only top-level `topic.responses.en` and `topic.responses.ceb`.
- It does not expose or safely edit:
  - `subject_key`
  - `subject_type`
  - `subject_terms`
  - `subtopics`
  - subtopic responses
  - `metadata.phrases`
  - `mapRef`

Risk:

- If an admin edits a grouped file through the old editor, the parent topic may appear empty or incomplete.
- Subtopic data may be invisible in the UI.
- Future admin saves could preserve unknown fields, but the admin cannot intentionally manage the new structure yet.

Recommendation:

- Build a new `Knowledge Manager` admin section before asking admins to manage large structured data.
- Keep `AdminLocations` separate for `responses_location.json`.
- Keep `AdminGeneralResponses` for legacy `responses.json` until duplicates are cleaned.

## Files To Convert First

Recommended conversion order:

1. `Library_info.json`
   - Small file, already partially structured.
   - Good for testing follow-up memory and library ID ambiguity.

2. `Oss_services.json`
   - Small file, partially structured.
   - Important because student ID and library ID conflict if handled poorly.
   - Contains map-sensitive student service data.

3. `Admissions_info.json`
   - Large duplicate-heavy file.
   - High value for real student questions.
   - Contains requirements, fees, schedules, contacts, images, and maps.

4. `Enrollment_info.json`
   - Small and highly connected to common questions.
   - Should be grouped around process, documents, schedule, fees, and SIAS.

5. `Courses_info.json`
   - Largest flat file.
   - Needs careful grouping by program/course category.
   - Should be converted after the retrieval layer rules are clearer.

## Files To Avoid Touching Until Later

Do not restructure these in the first conversion batch:

- `responses_location.json`
  - It is the dedicated location/map knowledge base.
  - It already powers map replies and admin location editing.

- `Academic_policy.json`
  - Already structured.
  - Only adjust after the retrieval layer is ready or when fixing a reported bug.

- `Administrators.json`
  - Has one blank topic that should be cleaned later.
  - Better converted together with `Departamentals_facultystaff.json`.

- `Courses_info.json`
  - Very large and duplicate-prone.
  - Better handled after smaller conversion batches prove the pattern.

## Main Risks Found

1. Duplicate data can produce stale or wrong answers if legacy and structured records disagree.
2. Admin Super Intent editor is not ready for grouped subject/subtopic editing.
3. Old topic-router files still exist, so future work must avoid accidentally adding new logic there.
4. Map payloads are spread across old and new formats.
5. Generic terms like `id`, `requirements`, `fee`, `apply`, and `schedule` can still create false positives if used as strong keywords.
6. `Administrators.json` contains one blank topic record.

## Day 1 Phase 1 Decision

No data should be restructured yet. The safest next step is Day 1 Phase 2: confirm the final architecture rules and data model before converting more files.

After Phase 2 is confirmed, Day 2 should begin with `Library_info.json` and `Oss_services.json`.

