# Server Backend — File Reference

## Admin Panel files (edit chatbot responses, locations, super intents)

| File | Purpose |
|------|---------|
| `server/controllers/adminController.ts` | All admin REST handlers (responses, locations, privileges, auto-translate, password) |
| `server/controllers/adminBotTopicsController.ts` | Super Intents CRUD — reads/writes `rasa/actions/Supper Saiyan/*.json` |
| `server/admin.ts` | Low-level JSON file operations: `getResponses`, `upsertResponse`, `getLocations`, `upsertLocation`, `getUserPrivileges` |
| `server/admin-db.ts` | Database-backed versions of admin operations (used when DB migration is active) |

## Auth

| File | Purpose |
|------|---------|
| `server/controllers/authController.ts` | Login / JWT token issue |
| `server/account/admin-users.json` | Admin credentials (hashed passwords) |

## Chat / Rasa

| File | Purpose |
|------|---------|
| `server/controllers/chatController.ts` | Proxies chat messages to Rasa |
| `server/rasa.ts` | Rasa connection utilities |

## FAQs

| File | Purpose |
|------|---------|
| `server/controllers/faqController.ts` | FAQ config CRUD |

## Routing

| File | Purpose |
|------|---------|
| `server/routes.ts` | **Main router** — all `/api/admin/*`, `/api/auth/*`, `/api/chat/*` routes |
| `server/routes/emailRoutes.ts` | Email notification routes |
| `server/routes/admin-migration.ts` | JSON → DB migration endpoint |
| `server/routes/rasa-api.ts` | Direct Rasa API passthrough |

## Data Files (JSON sources of truth)

| File | Written by |
|------|-----------|
| `rasa/data/responses.json` | `adminController → upsertResponse` |
| `rasa/actions/knowledge/location/responses_location_core.json` | `adminController -> upsertLocation` |
| `rasa/actions/Supper Saiyan/*.json` | `adminBotTopicsController → updateTopic` |
| `rasa/data/faq_configs.json` | `faqController` |
| `rasa/data/user_privileges.json` | `adminController.updateUserPrivileges` |

## Debugging Tips

- **Response not saving?** → Check `adminController.ts → createOrUpdateResponse` and `admin.ts → upsertResponse`
- **Super Intent topic not updating?** → Check `adminBotTopicsController.ts → updateTopic`
- **Location coordinates wrong?** → Format must be `[y, x]` (0-1000 scale) — check `admin.ts → upsertLocation`
- **Auth failing?** → Check `authController.ts` and `account/admin-users.json`
