# Day 9 Admin Create New Data Flow

## Phase 1: Create Parent Subject

Added a `New Parent` flow inside the admin Knowledge Manager.

Admins can create a new parent subject group with:

- Source knowledge category JSON file
- `topic`
- `subject_key`
- `subject_type`
- `subject_terms`
- Display name

Safety behavior:

- Topic and subject keys must use lowercase letters, numbers, and underscores.
- Subject terms are required so the retrieval layer has a usable trigger surface.
- Backend still validates duplicate `topic` and duplicate `subject_key`.
- Newly created parent groups start with an empty `subtopics` list.

## Phase 2: Create Subtopic

Added an `Add subtopic` flow from parent/topic-group rows in the Knowledge Manager.

Admins can create a new answer subtopic with:

- `topic`
- `intent`
- `context_topic`
- Display name
- `responses.en`
- `responses.ceb`
- `metadata.phrases`
- Images
- `mapRef`
- Optional pins and routes through the visual map editor

Safety behavior:

- Topic keys are required and validated.
- Intent and context topic are optional, but if provided they must use machine-key format.
- At least one English or Cebuano response line is required.
- At least one example question is required to improve retrieval accuracy.
- Optional map pins/routes reuse the same validation used by existing record editing.
- Backend still validates duplicate subtopic keys under the selected parent.

## Phase 3: Validation Warnings

Added pre-save warning panels in the Knowledge Manager create dialogs.

Parent subject warnings:

- Warns when `topic` already exists inside the selected JSON file.
- Warns when `subject_key` already exists in any knowledge record.
- Warns when `subject_terms` are empty.
- Warns when `subject_terms` are too generic, such as `id`, `process`, `requirements`, `student`, or `office`.
- Warns when subject terms are very short and likely to overlap.

Subtopic warnings:

- Warns when English and Cebuano responses are both empty.
- Warns when example question phrases are empty.
- Warns when a subtopic key already exists under the selected parent.
- Warns when the same topic key exists elsewhere in the same JSON file.
- Warns when `mapRef` does not match an existing topic, intent, subject key, context topic, or display name.
- Warns when a phrase heavily overlaps with an existing topic phrase.

These are warnings for accuracy and maintainability. Required fields and machine-key format are still enforced before save.

## Files Updated

- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/lib/adminApi.ts`
- `server/controllers/adminKnowledgeController.ts`

## Checks

Passed:

- Focused esbuild bundle check for `client/src/components/admin/AdminKnowledgeManager.tsx`
- Focused esbuild bundle check for `server/controllers/adminKnowledgeController.ts`
- JSON parse smoke check for `rasa/actions/Supper Saiyan/*.json`
- Validation warning logic is client-side and uses the loaded Knowledge Manager records, so no Rasa retrain is needed.

Notes:

- No Rasa retrain is needed for pure JSON parent/subtopic additions.
- Rasa action server or data loader reload is still needed until the Day 10 hot reload phase is completed.
