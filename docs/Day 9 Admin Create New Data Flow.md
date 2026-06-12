# Day 9 Admin Create New Data Flow

## Phase 1: Create Parent Subject

Implemented parent subject creation inside the admin Knowledge Manager.

Admins can now create a new grouped parent record in an existing `rasa/actions/Supper Saiyan/*.json` file.

Created fields:

- `topic`
- `subject_key`
- `subject_type`
- `subject_terms`
- empty `subtopics` array

Backend route:

- `POST /api/admin/knowledge/:file/parent`

Safety rules:

- Only safe `.json` filenames inside `rasa/actions/Supper Saiyan` are accepted.
- Topic keys must use lowercase letters, numbers, and underscores.
- Subject keys must use lowercase letters, numbers, and underscores.
- Duplicate topic keys in the same file are rejected.
- Duplicate subject keys in the same file are rejected.

## Phase 2: Create Subtopic

Implemented subtopic creation inside the admin Knowledge Manager.

Admins can now create a child record under an existing parent subject.

Created fields:

- `topic`
- optional `intent`
- optional `context_topic`
- `responses.en`
- `responses.ceb`
- optional `metadata.phrases`
- optional `images`
- optional `mapRef`
- optional `map`
- optional `mapData`
- optional `pins`
- optional `routes`

Backend route:

- `POST /api/admin/knowledge/:file/subtopic`

Safety rules:

- Subtopics are added by nested parent path.
- Existing grouped data is not flattened.
- Duplicate subtopic keys under the same parent are rejected.
- Optional JSON map fields are parsed before save.

Frontend files:

- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/lib/adminApi.ts`

Backend files:

- `server/controllers/adminKnowledgeController.ts`
- `server/routes.ts`

## Debugging Results

Passed:

- `npm.cmd run build`
- `python -m unittest discover -s test`
- JSON parse smoke check for all Supper Saiyan JSON files
- Temporary parent/subtopic creation fixture test

Fixture test confirmed:

- Parent creation returned path `[0]`
- Duplicate parent topic was rejected
- Subtopic creation returned path `[0, 0]`
- Duplicate subtopic key under the same parent was rejected
- List endpoint loaded the new parent and child records
- Map reference and pins were saved on the child
- Parent/subtopic grouping stayed intact
- Temporary test file was deleted after verification

Additional edge-case debug pass:

- Unsafe filenames are rejected.
- Invalid topic keys are rejected.
- Duplicate subject keys are rejected.
- Invalid parent paths are rejected.
- Missing response arrays are rejected.
- Duplicate subtopic keys are rejected.
- Topic rename attempts are rejected.
- Existing subtopics can still be updated after creation.
- Empty `mapRef` clears the existing map reference.
- Focused TypeScript scan showed no Day 9 errors in the Knowledge Manager files.

Known project-wide check issue:

- `npm.cmd run check` still fails because of existing unrelated TypeScript errors in `MapPage.tsx`, `server/admin-db.ts`, `server/db.ts`, and `server/storage.ts`.

## Notes

Creating pure JSON knowledge does not require Rasa retraining unless new NLU examples, domain entries, stories, or rules are added.

Day 9 Phase 3 validation warnings are not implemented yet. That phase should add softer admin warnings for generic terms, duplicate phrases, missing responses, and invalid `mapRef` targets.
