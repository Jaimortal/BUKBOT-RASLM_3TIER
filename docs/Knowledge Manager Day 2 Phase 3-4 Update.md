# Knowledge Manager Day 2 Phase 3-4 Update

## Phase 3 - Navigation Redesign

The Knowledge Manager now displays structured chatbot data using the admin-facing hierarchy:

- Knowledge Category: the JSON file, such as `Oss_services.json`
- Topic Group: a parent topic inside `topics[]`
- Answer Topic: a nested subtopic inside `subtopics[]`

The UI now prioritizes `display_name` instead of generic machine topics such as `process`, `requirements`, or `location`. Each row shows breadcrumbs in the format:

`Knowledge Category > Topic Group > Answer Topic`

Search was expanded to include:

- display name
- category/file name
- topic machine ID
- intent
- English response text
- Cebuano/Bisaya response text
- subject terms
- example questions/metadata phrases

When a search result matches a child answer topic, its parent group remains visible. When a parent group matches, its child answer topics remain visible.

## Phase 4 - Safe Content Editing

The edit modal now uses a safe admin editing mode. Normal editing focuses on:

- display name
- English response lines
- Cebuano/Bisaya response lines
- example questions
- image URLs
- map reference

Protected routing fields are no longer editable in the normal edit tabs:

- topic machine ID
- intent
- context topic
- subject key
- subject type

These fields are still visible in a read-only Developer Details tab for debugging.

Response text editors now support:

- one chatbot bubble per response line
- add-line helper
- empty-line cleanup
- Ctrl+B shortcut to wrap selected text in `<b>...</b>`

Raw map JSON editing was removed from the safe edit screen. The record still shows a map summary, but visual map/pin editing is reserved for the upcoming map editor phase.

The previous quick-create buttons were also removed from the normal Knowledge Manager toolbar for this phase. Creating new topic groups or answer topics still requires routing fields, so it should be rebuilt later as a guided safe flow instead of exposing machine IDs directly.

## Backend Support

`server/controllers/adminKnowledgeController.ts` now supports saving `display_name` safely. New topic groups and answer topics also receive `display_name` values on creation.

## Notes

The storage layer is unchanged. The chatbot still uses the existing JSON files and routing keys. This update only improves how admins browse and safely edit content.

## Debugging and Testing

Completed after the Day 2 safety cleanup:

- Targeted TypeScript check for Knowledge Manager files: passed.
- Safety grep for editable critical fields/raw map JSON in `AdminKnowledgeManager.tsx`: passed.
- Knowledge Manager controller smoke test: passed.
  - Status: 200
  - Records listed: 353
  - Supper Saiyan category files listed: 14
  - Sample display names returned correctly.
- JSON validation for Supper Saiyan files plus `responses.json`: passed.
  - Files checked: 15
- Display name coverage check: passed.
  - Missing display names: 0
  - Duplicate display names in the same file: 0
- Context-aware retrieval unit tests: passed.
  - Tests run: 81
- Rasa data validation: passed.
- Full `npm.cmd run check`: still blocked by pre-existing unrelated TypeScript issues in:
  - `client/src/pages/MapPage.tsx`
  - `server/admin-db.ts`
  - `server/db.ts`
  - `server/storage.ts`

No Day 2 Knowledge Manager TypeScript errors were reported.
