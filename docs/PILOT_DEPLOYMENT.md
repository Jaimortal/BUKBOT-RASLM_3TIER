# First-Year Pilot Deployment (Single Host)

This is the supported pilot path for the **current** code: Node/Express + React, Rasa API, Rasa action server, PostgreSQL, and the JSON knowledge tree in `rasa/actions/knowledge`. The older `docs/PRODUCTION_SETUP.md`, `docs/README_PRODUCTION.md`, `Dockerfile`, `docker-compose.yml`, and `scripts/deploy.py` describe an earlier architecture. **Do not use those as deployment commands for this pilot.**

Use a host with enough memory for Node, PostgreSQL, Rasa and the action server. A 4 GB host has not been validated for this stack. Keep Rasa (5005), actions (5055), and PostgreSQL private; expose only HTTPS through a reverse proxy to Node (5000). Ask the host operator to set TLS and backups. Never commit `.env`.

## Before the pilot

1. Install Node.js, Python 3.10 with a Rasa-compatible environment, PostgreSQL, and the project's dependencies. Run `npm ci` from the project root. Install the same Python/Rasa packages used by the working development environment; this repo does **not** currently contain a lockfile for those packages. Do not assume a fresh `pip install rasa` will reproduce the trained setup.
2. Copy `.env.example` to `.env` in the project root. Set `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=5000`, `RASA_BASE_URL=http://127.0.0.1:5005`, real `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`, and a unique random `JWT_SECRET` (32+ characters). Both the Node app and `db:push` use these `PG*` variables. Leave `RASA_LLM_RERANKER_ENABLED=false` unless the exact LLM configuration has been tested on this host; when enabled, set provider keys and document which version each cohort used.
3. Provision the PostgreSQL schema with `npm run db:push` after reviewing the proposed schema changes. Confirm `conversation_logs` exists. The pilot Node process writes logs there in production; development still uses in-memory logs. Back up PostgreSQL, the JSON knowledge files, and uploaded images before changing versions.
4. Put a trained model in `rasa/models/`. Keep the entire `rasa/actions/knowledge` tree, `rasa/actions/responses.json`, map data, and uploaded image storage accessible. Record a git commit and the model filename for the cohort.
5. Run `python tools/deployment_preflight.py`, `npm run check`, and `npm run build` from the project root. Preflight checks files/settings only; it does not prove that the services can connect.

## Start (three terminals or managed services)

On Windows, use `python -m rasa` if Device Guard blocks `rasa.exe`. From `rasa/`:

```powershell
python -m rasa run actions --port 5055
```

In another terminal, also from `rasa/`:

```powershell
python -m rasa run --enable-api --cors "*" --host 127.0.0.1 --port 5005
```

Start the Node app from the **project root** so its JSON and `dist/public` paths resolve:

```powershell
node dist/index.cjs
```

Do not run these as disposable terminals for the actual student sessions. Use the hosting provider's supervised service manager, configure automatic restarts, and restrict direct access to the private ports. Restrict the Rasa CORS setting to the intended origin if external browsers ever access Rasa directly; the preferred topology is browser -> Node -> Rasa on localhost.

## Smoke check before releasing each cohort

1. Check `GET http://127.0.0.1:5000/api/health`: it must return HTTP 200 and both `database` and `rasa` as `ready`. A 503 means do not begin the cohort.
2. Visit the **public HTTPS URL** on a phone using mobile data. Ask an enrollment question, a Bisaya variant, a location question with map, and a follow-up button question. Check images and admin login as well.
3. Check that a new conversation row appears in PostgreSQL `conversation_logs`. Restart Node and confirm that row remains. If this fails, do not rely on chat logs for the study.
4. Ask an intentionally unsupported question and confirm the bot does not invent a confident policy answer. Test what users see if the action server or LLM is unavailable.
5. Record the version, model, date/time, enabled LLM provider, and questionnaire cohort. Keep the questionnaire identical across cohorts and report version-specific results separately.

## Updating between clusters

Classify COT failures before editing. Apply only confirmed fixes, run `python rasa/test_knowledge_eval.py` and the relevant first-year test bank, rebuild if Node/client changed, and repeat the smoke check. Back up data before updating and keep the previous version/model ready for rollback. Do not overwrite or omit earlier cohort logs. Pause the next cluster for repeated confident wrong answers on admission/enrollment or if health/logging fails.

## Known deployment limits

- Docker and the old production guides are **not** validated with the present Rasa + Node architecture.
- No pinned Python dependency file exists, so reproducing a new server environment is a remaining deployment risk.
- The health endpoint checks Rasa API and the PostgreSQL conversation log table. It does not verify every map image, action response, or the exact deployed Rasa model.
- Uploaded images and some admin data use PostgreSQL. Test backup and restore before relying on the pilot for evaluation data.
