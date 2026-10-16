# Day 8 Admin Knowledge Manager UI

## Phase 1: Read-Only Knowledge Browser

Implemented or upgraded the admin `Knowledge Manager` under the existing `Responses` section.

The browser reads structured JSON records from `rasa/actions/Supper Saiyan/*.json` and displays nested parent/subtopic records without flattening or rewriting the files.

Displayed fields:

- Source JSON file
- Parent topic
- Topic key
- Subject key
- Subject type
- Effective subject terms count
- English/Cebuano response status
- Metadata phrase count
- Image status
- Map status
- mapRef status
- Subtopic count

Protected developer details remain read-only:

- File
- JSON path
- Topic machine ID
- Intent
- Context topic
- Subject key
- Subject type
- Subject terms
- Map payload status
- Map reference
- Image count
- Example question count

Backend route:

- `GET /api/admin/knowledge`

Frontend files:

- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/lib/adminApi.ts`
- `client/src/pages/admin/AdminDashboard.tsx`

Backend files:

- `server/controllers/adminKnowledgeController.ts`
- `server/routes.ts`

## Phase 2: Edit Existing Structured Data

Added or tightened the editor dialog for existing nested knowledge records.

Editable fields:

- English responses
- Cebuano/Bisaya responses
- `subject_terms`
- `metadata.phrases`
- Images
- `mapRef`
- Pins
- Routes
- Existing searchable child-row display values
- Existing searchable child-row aliases/search terms

Protected routing fields remain read-only:

- `topic`
- `intent`
- `context_topic`
- `subject_key`
- `subject_type`
- source file
- JSON path

Backend route:

- `POST /api/admin/knowledge/:file/topic`

## Safety Rules

- Saves by source file plus nested path, so grouped data stays grouped.
- Rejects accidental topic key rename.
- Preserves unknown JSON fields by updating only selected fields on the located topic.
- Restricts writes to safe `.json` filenames inside `rasa/actions/Supper Saiyan`.
- Validates array fields before saving.
- Save validation now checks blank display names, invalid terms, blank images, and broken map pins/routes.
- Parent topic groups are allowed to save without direct response text.
- Answer topics still require at least one English or Cebuano response line.
- Map pins/routes are only sent when map editing is enabled, preventing accidental clearing of existing map payloads.
- Child records edit their own `subject_terms`; inherited parent terms are still shown in the browser but are not copied into every child on save.
- Searchable child rows remain edit-only. Creation and deletion stay developer-controlled.

## Phase 3: Safe Text Formatting

Implemented safe bold formatting across the admin editor, backend response builder, and chat frontend.

Behavior:

- Admin Ctrl+B still shows real bold text while editing.
- Saved bold text is stored as markdown: `**text**`.
- Existing safe `<b>` and `<strong>` tags are converted to markdown before saving or emitting.
- The chat frontend escapes message text first, then renders only markdown bold and links.
- Raw HTML is not trusted as rendered chat content.

Files updated:

- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/components/chat/ChatWindow.tsx`
- `rasa/actions/response_builder.py`

## Debugging Results

Passed:

- JSON parse smoke check for `rasa/actions/Supper Saiyan/*.json`
- Focused esbuild bundle check for `server/controllers/adminKnowledgeController.ts`
- Focused esbuild bundle check for `client/src/components/admin/AdminKnowledgeManager.tsx`
- Focused esbuild bundle check for `client/src/components/chat/ChatWindow.tsx`
- Python compile check for `rasa/actions/response_builder.py`
- Response builder smoke test confirmed `<b>` and `<strong>` become markdown bold.

Previous Day 8 smoke coverage remains relevant:

- Structured/nested records load from all source JSON files.
- Nested child updates are saved by path.
- Temporary fixture tests confirmed parent/subtopic grouping was preserved.
- Topic rename guard rejects accidental key rename.
- Unknown child fields and metadata fields are preserved.

TypeScript check:

- `npm.cmd run check` still fails because of existing unrelated project-wide TypeScript errors in:
  - `client/src/pages/MapPage.tsx`
  - `server/admin-db.ts`
  - `server/db.ts`
  - `server/storage.ts`
- No new Knowledge Manager TypeScript errors appeared in the full check output.

## Notes

This does not create new knowledge records. New parent subject and subtopic creation belongs to the later admin creation phase.

Safe bold formatting is handled separately by the response builder and chat UI. Stored safe bold text should continue to render as formatted text without exposing raw routing fields to admins.
