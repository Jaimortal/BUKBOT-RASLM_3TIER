# Knowledge Manager Day 4 Phase 7-8 Map Integration

## Phase 7 - Knowledge Manager Map Integration

Knowledge Manager records now use the shared visual `AdminMapPinsEditor`.

Admins can now edit structured knowledge record maps without touching raw JSON:

- enable map editing for an answer
- add normal pins
- add staircase/elevator indicator pins
- rename pins
- move pins
- delete pins
- connect pins into routes
- draw/edit routes

The backend now reads map data from both supported formats:

- top-level `pins` and `routes`
- nested `mapData.pins` and `mapData.routes`

When saving, the backend updates top-level pins/routes and mirrors them into `mapData` when the older nested format already exists. This keeps old and new data formats compatible.

## Phase 8 - Admin Label Cleanup

Admin-facing wording now favors beginner-friendly labels:

- `Knowledge Categories`
- `Topic Group`
- `Answer Topic`

Normal admins still cannot edit protected routing fields in Knowledge Manager:

- topic machine ID
- intent
- context topic
- subject key
- subject type

These fields remain visible only as read-only Developer Details.

## Manual Testing Checklist

- Open Knowledge Manager.
- Search for a known answer with map data, such as a student services or admission record.
- Open the record.
- Go to `Map & Pins`.
- Confirm existing pins/routes load if available.
- Add a normal pin.
- Add a route.
- Save.
- Reopen the record and confirm the map data remains.
- Ask the chatbot for that answer and confirm the map still displays.

## Notes

The shared map editor remains the single map editing surface used across:

- Locations
- General Responses
- Super Intent topic editor
- Knowledge Manager

## Debugging and Testing

Completed after implementation:

- Targeted TypeScript check for touched Day 4 files: passed.
- JSON validation: passed.
  - Files checked: 16
- Static wiring check: passed.
  - Knowledge Manager imports and renders `AdminMapPinsEditor`.
  - Backend exposes nested `mapData` pins/routes through Knowledge Manager.
  - Admin-facing `Knowledge Categories` label is present.
- Knowledge Manager backend smoke test: passed.
  - Records listed: 353
  - Category files listed: 14
  - Map-enabled records returned with pin/route counts.
  - Example: `Student ID Process` returned 4 pins and 3 routes.
- Context-aware retrieval unit tests: passed.
  - Tests run: 81
- Rasa data validation: passed.
- Full `npm.cmd run check`: still blocked by known unrelated TypeScript errors in:
  - `client/src/pages/MapPage.tsx`
  - `server/admin-db.ts`
  - `server/db.ts`
  - `server/storage.ts`

No Day 4 Knowledge Manager or map editor files appeared in the full TypeScript error list.

## Fresh Regression Pass

Re-run before proceeding to the next phase:

- Targeted TypeScript check for Day 4 Knowledge Manager/map files: passed.
- JSON validation: passed.
  - Files checked: 16
- Static wiring check: passed.
  - `AdminMapPinsEditor` is wired into Knowledge Manager.
  - `mapDataObject`, `pinsForTopic`, and `routesForTopic` are present in the backend.
  - `Knowledge Categories`, `Map & Pins`, and `Developer Details` labels are present.
- Knowledge Manager backend smoke test: passed.
  - Records listed: 353
  - Category files listed: 14
  - Map-enabled records found: 10
  - `Student ID Process` returned 4 pins and 3 routes.
- Context-aware retrieval unit tests: passed.
  - Tests run: 81
- Rasa data validation: passed.
- Full `npm.cmd run check`: still blocked only by the same known unrelated TypeScript errors listed above.
