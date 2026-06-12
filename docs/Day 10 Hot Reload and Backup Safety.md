# Day 10 Hot Reload and Backup Safety

## Phase 1: JSON Hot Reload

Implemented modified-time based JSON hot reload for the Rasa action server.

The action helper now tracks the modified time of these JSON sources:

- `rasa/actions/responses.json`
- `rasa/actions/responses_location.json`
- structured files in `rasa/actions/Supper Saiyan/`

The watcher scans all `.json` files in `Supper Saiyan`, so newly added JSON files are detected by modified time too.

When a tracked file changes, the helper reloads the JSON files and the router rebuilds:

- structured response cache
- intent lookup
- context memory index
- local retrieval index
- retrieval scorer

This means admin JSON edits can be reflected by the running action server without retraining Rasa.

Retraining is still required when changing:

- `rasa/data/nlu.yml`
- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/stories.yml`

## Phase 2: Backup Before Save

Implemented backup-before-save for admin JSON writes.

Backup utility:

- `server/utils/jsonBackup.ts`

Backup folder:

- `backups/json/knowledge/`
- `backups/json/super-intents/`

Covered admin write paths:

- Knowledge Manager edit existing record
- Knowledge Manager create parent subject
- Knowledge Manager create subtopic
- Legacy Super Intents topic editor

Backups are timestamped copies of the JSON file before the write is applied.

## Debugging Results

Passed:

- `python -m unittest discover -s test`
- all `Supper Saiyan/*.json` files parsed successfully
- `npm.cmd run build`
- hot reload mtime smoke test
- backup-before-save smoke test

Hot reload test confirmed:

- no reload when nothing changed
- reload triggers after a tracked JSON file mtime changes
- no repeated reload when the mtime stays the same
- all `.json` files in `Supper Saiyan` are watched, not only the original known files
- context index is rebuilt after reload

Backup test confirmed:

- saving through the Knowledge Manager creates a timestamped backup
- the JSON write still succeeds after backup creation
- temporary test backup and temporary test JSON were removed after verification

## Notes

The action server checks modified times during router handling. It does not reread every JSON file on every message unless a changed mtime is detected.

If a JSON file is saved with invalid JSON, the safe loader logs the invalid file and returns an empty source for that file until the JSON is fixed.
