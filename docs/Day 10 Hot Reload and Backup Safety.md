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

## Phase 1 Safety Update

Hot reload now validates changed JSON files before swapping the in-memory knowledge cache.

If an admin save creates invalid JSON, the action server:

- logs the broken file
- skips the reload
- keeps the previous good in-memory data
- tries again on the next message after the JSON is fixed

This protects the chatbot from losing a whole knowledge source because of one malformed edit.

The main router also checks for JSON changes before follow-up handling, so follow-up questions can see recent admin edits too.

## Phase 2 Backup Coverage Update

Backup-before-save now covers both current and older admin JSON write paths:

- Knowledge Manager structured JSON writes: `backups/json/knowledge/`
- Legacy Super Intents writes: `backups/json/super-intents/`
- `responses.json` writes: `backups/json/responses/`
- `responses_location.json` writes: `backups/json/locations/`
- map/settings JSON writes: `backups/json/map-settings/` and `backups/json/settings/`

If a file does not exist yet, the backup helper skips the backup for that first write instead of blocking the save.

## Phase 3 Restart and Retrain Guidance

Retrain Rasa when these files change:

- `rasa/data/nlu.yml`
- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/stories.yml`
- Rasa pipeline or policy configuration

Restart the Rasa action server when Python logic changes:

- `rasa/actions/*.py`
- query normalization Python files
- retrieval/scoring/router Python files

Hot reload is enough when only JSON knowledge data changes:

- answer text
- English/Bisaya response lines
- phrases and subject terms
- maps, pins, routes, and images saved inside JSON data
- structured child rows

Rollback steps:

1. Open `backups/json/<category>/`.
2. Choose the timestamped backup created before the bad save.
3. Copy it over the original JSON file.
4. Ask the bot again, or restart the action server if the file was restored while the server was busy.
5. Retrain only if the rollback involved Rasa training files, not ordinary JSON knowledge data.
