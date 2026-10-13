# Docker deployment (single Linux AMD64 host)

This replaces the legacy Docker configuration. It is a prepared deployment path,
not a claim that the images have passed a real deployment test. Docker was not
available in the development session that created these files. Build and smoke-test
on a Docker host before using this for student evaluation. A 4 GB host is still
unvalidated. These Rasa dependencies target AMD64; this is not an Oracle ARM recipe.

## What stays on your laptop

Nothing is deleted. `.dockerignore` excludes everything by default and admits only
the inputs explicitly required by the Dockerfile. Local secrets, accounts, models,
knowledge data, backups, tests, training data, virtual environments and debugging
folders are excluded from the image build context. New root folders stay excluded.
Review new files added inside the allowed source folders before building.

The multi-stage Node build keeps compilers and frontend source out of the final web
image. Python action code and the alias module belong only in the actions image.
The approved model, selected knowledge/settings, and accounts are staged separately
as runtime data. The app never mounts your original source folders.

Four services run: `web`, `rasa`, `actions`, `db`. The optional `migrate` service runs
database setup only when explicitly invoked. Core Rasa, TensorFlow and SDK versions
match local package metadata; Python dependencies are not yet fully transitively
locked. Record tested image digests and model hashes for each release.

## 1. Prepare once

Install Docker Engine with the Compose plugin on the server (or Docker Desktop with
Linux containers locally). Python 3 is needed only for the staging helper; Node,
Rasa and PostgreSQL are installed inside images, not manually on the host.

From the repository root, choose a tested model and a production admin JSON file:

```sh
python deployment/prepare.py --model rasa/models/YOUR-TESTED-MODEL.tar.gz --admin-file /path/to/production-admin-users.json --dry-run
python deployment/prepare.py --model rasa/models/YOUR-TESTED-MODEL.tar.gz --admin-file /path/to/production-admin-users.json
```

On Linux the command may be `python3`. The admin JSON must have a `development.users` array,
bcrypt password hashes and an enabled `main-admin`. It uses the same structure as
`server/account/admin-users.json`; reuse that file only if you intentionally want
those accounts in production. No existing accounts are copied automatically.

The helper copies only selected runtime files to `deployment/runtime`, starts a new
empty JSON activity log, and generates separate database/JWT secrets in
`deployment/.env`. It validates JSON before copying. Re-running it keeps every
existing runtime file, model and secret: it is not an update/synchronization tool.
Optional SMTP, Google login, and LLM settings go in `deployment/.env`; the original
development `.env` is not used. The LLM starts disabled unless you change this.

On Linux, after confirming you are in this repository root and that runtime is not
a symlink, give the unprivileged container user ownership of staged runtime data:

```sh
sudo chown -R 1000:1000 ./deployment/runtime
```

Docker Desktop handles bind permissions differently; verify account-file access
there before startup. Do not make credentials world-writable to fix permissions.

## 2. Build, provision the database, start

Always pass this env file; Compose otherwise reads the unrelated root `.env`.
Use `config --quiet` to validate without printing resolved secrets.

```sh
docker compose --env-file deployment/.env config --quiet
docker compose --env-file deployment/.env build web actions rasa migrate
docker compose --env-file deployment/.env up -d db
docker compose --env-file deployment/.env run --rm migrate
docker compose --env-file deployment/.env up -d web
docker compose --env-file deployment/.env ps
```

`migrate` runs the project's `npm run db:push`; review any proposed changes. No
automatic `--force` schema changes run during startup. For an existing project,
restore a tested PostgreSQL backup into the container database or migrate the
needed records before evaluation: schema creation alone does not transfer images,
maps, FAQs, conversation logs, or other existing database records.

The first image build downloads dependencies and can take considerable time and
disk/RAM. Later builds reuse unchanged layers. Build on a stronger AMD64 machine
and transfer images if the VPS cannot handle the build. Containers do not reduce
Rasa's inference memory requirement.

Only the web service is published, on `127.0.0.1:5000` by default. Test it on the
server or through SSH port forwarding. Put the existing HTTPS reverse proxy or
tunnel in front of it for public access. TLS/domain provisioning is not included.
Rasa, actions and PostgreSQL have no published host ports.

## 3. Validate before release

- Check `/api/health` returns 200 with database and Rasa ready.
- Ask English/Bisaya, follow-up and map questions; check the action server too.
- Test admin login, editing knowledge, phrase translation, images, FAQ gap report.
- Restart containers and confirm knowledge/settings/accounts and database logs
  persist. Test backup restoration on a separate deployment.
- Test expected simultaneous users and measure memory before buying a long plan.

The FAQ gap report is staged only when its source JSON exists; otherwise its admin
endpoint returns the existing "not generated yet" response. The performance panel
works but per-process metrics inside the web container cannot see Rasa/PostgreSQL
in other containers. Use `docker stats` for deployment-wide resource measurement.
Conversation tracker/in-memory sessions are not made persistent by this setup.

## Persistent data and updates

- PostgreSQL is in the named `postgres-data` volume.
- Knowledge, rules, responses, settings, accounts, JSON backups and performance
  logs live under `deployment/runtime`. Web writes them; actions reads the same
  knowledge/rules. Rebuilding images does not overwrite this data.
- Back up PostgreSQL with `pg_dump` and copy runtime data to another location.
  Stop writers or otherwise coordinate a consistent snapshot. Local JSON backups
  alone do not protect against a lost VPS. Add retention for JSON backup growth.
- For code updates, rebuild and run `up -d web` again. Apply schema changes only
  after reviewing them and taking a backup.
- For a model update, stop Rasa, retain the old model elsewhere, replace
  `deployment/runtime/model.tar.gz`, then **recreate** the Rasa container. For
  host-side replacement of bind-mounted JSON files, recreate their consumers too.
  Update production knowledge deliberately; the prepare helper will not overwrite
  administrator edits with a new checkout's defaults.
- `docker compose ... down` preserves named volumes and staged files. Do not use
  `down -v` unless you intend to delete the PostgreSQL volume.
- `restart: unless-stopped` restarts exited containers and starts them after the
  Docker daemon restarts (unless explicitly stopped). Enable Docker at host boot.
  Health checks report unhealthy processes; they do not themselves restart hangs.

## Guardrail verification

Run `python -B -m unittest discover -s deployment/tests` for staging safety tests.
Before deployment, additionally run a real Docker build and inspect the resulting
images. `.dockerignore` is a build-context rule, not a rule controlling runtime bind
mounts; Compose deliberately mounts only staged production paths, never `.:/app`.
