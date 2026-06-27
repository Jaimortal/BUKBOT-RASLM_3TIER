# Day 3 Structured Retrieval Scoring and Child Rows

## Phase 1 - Structured Retrieval Scoring Cleanup

Implemented focused scoring cleanup in the local retrieval layer.

Changes:
- Added `display_name`, `child_terms`, and `alias_terms` to retrieval candidates.
- Indexed admin-friendly display names separately from intent names.
- Indexed child row fields separately from parent answer text.
- Added named scoring reasons:
  - `display_exact` / `display_partial`
  - `subject_exact` / `subject_partial`
  - `phrase_exact` / `phrase_partial`
  - `child_exact` / `child_partial`
  - `alias_exact` / `alias_partial`
  - `context_exact` / `context_partial`
  - `purpose`
- Reduced weak token-overlap weight so broad words cannot dominate exact records.
- Added exact boundary matching for short terms like `id`, `it`, and `cor`.
- Added ambiguity protection for broad terms such as `id`, `validation`, `services`, `courses`, `office`, `dean`, and `head`.
- Tightened confidence logic so high confidence now needs exact evidence or a clear margin.
- Routed generic `validation` and `services` questions to existing clarification/menu responses before retrieval guesses.

## Phase 2 - Searchable Child Row Support

Child rows are now treated as first-class search targets.

Supported child row fields:
- `key`
- `name`
- `display_name`
- `value`
- `text`
- `aliases`
- `search_terms`
- `searchTerms`

The existing course slot record can now answer:
- Parent/group questions, such as `slot left for CAS courses`
- Specific row questions, such as `slot left for BA Philosophy`

Admin behavior:
- Knowledge Manager remains edit-focused.
- Child row creation/deletion was not added.
- Optional `search_terms` are preserved if already present in JSON, but admins are not required to edit them.

## Verification

Python compile passed:

```text
python -m py_compile retrieval_result.py retrieval_index.py retrieval_scorer.py data_loader.py knowledge_router.py
```

Targeted router smoke tests passed:
- `slot left for Bachelor of Arts in Philosophy` -> `course_slots`, single BA Philosophy row
- `slot left for nursing` -> `course_slots`, single Nursing row/message
- `slot left for CAS courses` -> `course_slots`, full CAS group
- `available slots for BSET` -> `course_slots`, single BSET row
- `course slots for COT` -> `course_slots`, full COT group
- `what cut off scores for bachelor of science in electronic technology?` -> `program_cutoff_scores`
- `unsay course na available diris buksu` -> Bisaya course-list choices
- `can you help me for my enrollment` -> `enrollment_general_process`
- `is late enrol allowed` -> `late_enrollment`
- `am i allowed to use civilian` -> `wear_civilian_attire`
- `Is buksu accept transfered students` -> `transferee_admission_requirements`
- `how validate?` -> validation choices
- `services` -> services choices

Full TypeScript check was attempted with:

```text
npx.cmd tsc --noEmit --pretty false
```

It still reports pre-existing unrelated project errors in `client/src/pages/MapPage.tsx`, `server/admin-db.ts`, `server/db.ts`, and `server/storage.ts`.

## Before Day 4

Test at least:
- 10 ambiguous questions using `id`, `validation`, `services`, `courses`, `office`, `dean`, and `head`
- 10 parent-list child-row questions
- 10 specific child-row questions

