# Knowledge Manager UX Audit

Date: 2026-06-12

## Scope

Audited the current admin editing flow before the Knowledge Manager UX upgrade.

Files inspected:
- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/components/admin/AdminSuperIntents.tsx`
- `client/src/components/admin/AdminLocations.tsx`
- `client/src/components/admin/AdminGeneralResponses.tsx`
- `client/src/components/admin/AdminMapPinsEditor.tsx`
- `server/controllers/adminKnowledgeController.ts`
- `server/controllers/adminBotTopicsController.ts`
- `client/src/lib/adminApi.ts`

## Current File/API Flow

Knowledge Manager reads structured JSON files from:

```text
rasa/actions/Supper Saiyan/*.json
```

The list endpoint is:

```text
GET /api/admin/knowledge
```

The update endpoint is:

```text
PUT /api/admin/knowledge/:file
```

The server recursively collects parent topics and nested `subtopics[]` using a numeric path, for example:

```text
Oss_services.json / 2.0 / process
```

The current display label is derived from:

```ts
topic.ui_name || formatLabel(topic.topic)
```

It does not yet prefer `display_name`.

## Visible Data Sources

Knowledge Manager currently lists all JSON files under `rasa/actions/Supper Saiyan/`:

- `Academic_policy.json`
- `Administrators.json`
- `Admissions_info.json`
- `Classroom_policy.json`
- `Clinic_info.json`
- `Courses_info.json`
- `Departamentals_facultystaff.json`
- `Department_info.json`
- `Dormitory_info.json`
- `Enrollment_info.json`
- `Ict_info.json`
- `Library_info.json`
- `Oss_services.json`
- `University_info.json`

`responses.json` is not part of the Knowledge Manager list because it is outside `Supper Saiyan/`. It is managed by the older General Responses editor.

## Current Knowledge Manager Visibility

Knowledge Manager already collects:

- Parent topic records
- Nested subtopic records
- Response-bearing records
- Map-bearing records

However, the UI presents many subtopics by generic machine names such as:

- `process`
- `requirements`
- `payment`
- `location`
- `schedule`

This is confusing for admins because many unrelated records share the same visible topic name.

## Current Editable Fields

Knowledge Manager currently allows editing:

- English response lines
- Cebuano response lines
- subject terms
- subject type
- metadata phrases
- images as text URLs
- mapRef
- raw `map` JSON
- raw `mapData` JSON
- raw `pins` JSON
- raw `routes` JSON

The controller protects direct renaming of `topic`, but other technical fields are still visible/editable through the UI.

## Dangerous Fields

These should not be editable in the normal admin UI:

- `intent`
- `context_topic`
- `subject_key`
- `subject_type`
- `topic`
- raw map JSON
- raw pins JSON
- raw routes JSON
- internal response object structure

Reason: a small typo in these fields can break routing, memory, retrieval, or map display.

## Existing Editor Comparison

### Super Intents Editor

The legacy Super Intents editor provides a friendlier modal with tabs:

- Responses
- Images
- Map & Pins
- UI Name

It already uses `AdminMapPinsEditor`, which is more admin-friendly than raw JSON fields.

### Locations Editor

The Locations editor provides:

- Response editing
- Image editing
- Map & Pins editing

It also uses `AdminMapPinsEditor` and is the best current model for the Knowledge Manager edit experience.

### General Responses Editor

The General Responses editor manages `responses.json`.

It provides:

- Answer editing
- Image editing
- Map & Pins editing
- UI Name

This means `responses.json` has similar edit support, but it is not visible inside Knowledge Manager today.

### AdminMapPinsEditor

The reusable map editor supports:

- Pins
- Staircase indicator
- Elevator indicator
- Routes
- Route editing
- Pin editing

Known gap for later phase:

- The requested normal pin placement should be restored/promoted with a pin icon below the elevator icon.
- Multiple route color coding and fullscreen legends still need implementation.

## Known Gaps

1. Knowledge Manager displays generic subtopic names instead of clear admin names.
2. Knowledge Manager does not yet prefer `display_name`.
3. Knowledge Manager exposes technical fields that normal admins should not edit.
4. Knowledge Manager edits map/pins/routes as raw JSON instead of using the shared map editor.
5. `responses.json` is not listed inside Knowledge Manager.
6. Super Intents wording is still visible in some admin areas; this should eventually become "Knowledge Category".
7. The map editor pin placement UX needs restoration/standardization.

## Recommended Implementation Order

1. Add `display_name` to all Supper Saiyan records and `responses.json`.
2. Update APIs to prefer `display_name || ui_name || formatted intent || formatted topic`.
3. Redesign Knowledge Manager navigation around:
   - Knowledge Category
   - Topic Group
   - Answer Topic
4. Hide critical fields from normal edit mode.
5. Replace raw map/pins/routes JSON editing with `AdminMapPinsEditor`.
6. Standardize map editor behavior across Locations, General Responses, Super Intents, and Knowledge Manager.
7. Add route color coding and fullscreen route legend.

## Phase 1 Result

Audit complete. It is safe to proceed with Phase 2 because adding `display_name` fields does not change chatbot routing keys.
