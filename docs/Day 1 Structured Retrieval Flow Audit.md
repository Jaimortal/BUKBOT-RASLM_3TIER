# Day 1 Structured Retrieval Flow Audit

Date: 2026-06-19

Scope: Day 1 Phase 1 from `docs/Rasa Structured Retrieval Stabilization Prompt.txt`.

## Current Live Message Flow

1. User sends a message in the React chatbox.
   - Main UI: `client/src/components/chat/ChatWindow.tsx`
   - Chat widget shell: `client/src/components/chat/ChatWidget.tsx`
   - Frontend adapter: `client/src/lib/rasaApi.ts`
   - Request helper: `client/src/lib/rasaData.ts`

2. Frontend posts to Express.
   - Endpoint registration: `server/routes.ts`
   - Controller: `server/controllers/chatController.ts`
   - Incoming route: `POST /api/chat`

3. Express calls Rasa REST API.
   - Rasa caller: `server/rasa.ts`
   - Rasa endpoint: `http://127.0.0.1:5005/webhooks/rest/webhook`
   - Sender/session is passed from the frontend session ID.

4. Rasa predicts a broad NLU intent.
   - NLU data: `rasa/data/nlu.yml`
   - Domain: `rasa/domain.yml`
   - Rules: `rasa/data/rules.yml`
   - Stories: `rasa/data/stories.yml`

5. Rasa routes broad intents to `action_main_router`.
   - Confirmed in `rasa/data/rules.yml`.
   - Broad intents include location, schedule, fee, requirement, process, general info, contact, availability, document, follow-up, and smalltalk.

6. `action_main_router` enters the Python routing stack.
   - Entrypoint: `rasa/actions/actions.py`
   - Class: `ActionMainRouter`
   - The old `ActionReplyFromJson` still exists, but most remaining old intent handling delegates back to `ActionMainRouter`.

7. `MainRouterService` coordinates the actual retrieval.
   - File: `rasa/actions/main_router.py`
   - Responsibilities:
     - refresh changed JSON data
     - resolve entities and aliases
     - handle smalltalk and special early guards
     - handle context memory and follow-ups
     - route clear location requests
     - call structured knowledge routing
     - return context slot updates

8. Query normalization runs inside query interpretation.
   - File: `rasa/actions/query_interpreter.py`
   - Normalizer: `rasa/actions/query_normalizer.py`
   - Optional admin-managed rules: `rasa/actions/normalization_rules.json`
   - Responsibilities:
     - basic text cleanup
     - controlled typo expansion
     - Bisaya concept expansion
     - acronym/course/service aliases
     - multi-question splitting

9. Entity and location alias resolution runs.
   - File: `rasa/actions/entity_resolver.py`
   - Alias source: `rasa/actions/Magical Aliases/aliases.py`
   - Responsibilities:
     - collect Rasa entities
     - match location aliases from raw text
     - normalize room/location names
     - remove broad building matches when a more specific room/office exists

10. Structured knowledge routing runs.
    - Main file: `rasa/actions/knowledge_router.py`
    - Retrieval index: `rasa/actions/retrieval_index.py`
    - Retrieval scorer: `rasa/actions/retrieval_scorer.py`
    - Retrieval result model: `rasa/actions/retrieval_result.py`
    - Responsibilities:
      - direct intent overrides for high-risk/common patterns
      - clarification menus and choice payloads
      - structured retrieval scoring
      - child-row searchable data routing
      - safe fallback when confidence is low

11. Data loading flattens JSON records.
    - File: `rasa/actions/data_loader.py`
    - Legacy source: `rasa/actions/responses.json`
    - Location source: `rasa/actions/responses_location.json`
    - Structured source folder: `rasa/actions/Supper Saiyan/*.json`
    - Responsibilities:
      - flatten topics/subtopics into intent-addressable records
      - preserve map data, suggestions, choice groups, image URLs, and child rows
      - normalize map payloads from old and new formats

12. Context memory stores short-lived conversation focus.
    - File: `rasa/actions/context_manager.py`
    - Domain slots:
      - `conversation_subject`
      - `conversation_subject_type`
      - `conversation_category`
      - `conversation_last_topic`
      - `conversation_last_intent`
      - `conversation_turns_remaining`
      - `conversation_context_updated_at`
    - Responsibilities:
      - follow-up routing such as "requirements?", "how much?", "how about COT?"
      - ID clarification memory
      - TTL-like expiry through timestamp checks

13. Response builder emits Rasa-compatible output.
    - File: `rasa/actions/response_builder.py`
    - Responsibilities:
      - clean text
      - split separate response lines into separate bubbles when intended
      - dedupe repeated text
      - attach maps/images/suggestions/choice groups
      - merge multi-question map payloads

14. Express reformats Rasa responses for the frontend.
    - File: `server/controllers/chatController.ts`
    - Responsibilities:
      - combine text answers
      - collect suggestions and choice groups
      - collect image URLs
      - normalize all map routes and route colors
      - return `answer`, `mapData`, `mapDataList`, `imageUrls`, `suggestions`, and `choiceGroups`

15. Frontend renders the final answer.
    - Text and choices: `client/src/components/chat/ChatWindow.tsx`
    - Map message: `client/src/components/chat/MapMessage.tsx`
    - Quick map access: `client/src/components/chat/MapQuickAccess.tsx`
    - FAQ carousel: `client/src/components/chat/FAQCarouselMessage.tsx`

## Active Files By Responsibility

Intent handling:
- `rasa/data/nlu.yml`
- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/stories.yml`
- `rasa/actions/actions.py`
- `rasa/actions/main_router.py`

Query normalization:
- `rasa/actions/query_interpreter.py`
- `rasa/actions/query_normalizer.py`
- `rasa/actions/normalization_rules.json`
- `server/controllers/normalizationRulesController.ts`
- `client/src/components/admin/AdminNormalizationRules.tsx`

Entity and alias handling:
- `rasa/actions/entity_resolver.py`
- `rasa/actions/Magical Aliases/aliases.py`

Structured retrieval:
- `rasa/actions/knowledge_router.py`
- `rasa/actions/retrieval_index.py`
- `rasa/actions/retrieval_scorer.py`
- `rasa/actions/retrieval_result.py`
- `rasa/actions/data_loader.py`

Context memory:
- `rasa/actions/context_manager.py`
- `rasa/domain.yml`

Response building:
- `rasa/actions/response_builder.py`
- `server/controllers/chatController.ts`
- `client/src/lib/rasaApi.ts`
- `client/src/lib/rasaData.ts`
- `client/src/components/chat/ChatWindow.tsx`

Map payload generation and rendering:
- `rasa/actions/data_loader.py`
- `rasa/actions/actions.py`
- `rasa/actions/response_builder.py`
- `server/controllers/chatController.ts`
- `client/src/components/chat/MapMessage.tsx`
- `client/src/components/map/InteractiveMap.tsx`
- `client/src/components/admin/AdminMapPinsEditor.tsx`

Knowledge/admin editing:
- `server/controllers/adminKnowledgeController.ts`
- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/components/admin/AdminRichTextEditor.tsx`
- `client/src/components/admin/AdminImageUploader.tsx`
- `client/src/components/admin/AdminGallery.tsx`

## Safe-To-Edit Files

These files are part of the current architecture and are safe to edit carefully:

- `rasa/actions/knowledge_router.py`
- `rasa/actions/query_normalizer.py`
- `rasa/actions/query_interpreter.py`
- `rasa/actions/retrieval_scorer.py`
- `rasa/actions/retrieval_index.py`
- `rasa/actions/data_loader.py`
- `rasa/actions/context_manager.py`
- `rasa/actions/response_builder.py`
- `rasa/actions/Magical Aliases/aliases.py`
- `rasa/actions/responses.json`
- `rasa/actions/responses_location.json`
- `rasa/actions/Supper Saiyan/*.json`
- `rasa/data/nlu.yml`
- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/stories.yml`
- `server/controllers/chatController.ts`
- `server/controllers/adminKnowledgeController.ts`
- `client/src/components/chat/*.tsx`
- `client/src/components/admin/AdminKnowledgeManager.tsx`
- `client/src/components/admin/AdminMapPinsEditor.tsx`

## Legacy / Reference-Only Files

These should not be used for new logic unless explicitly migrating old data:

- `rasa/actions/Topic Router/*.py`
- `rasa/actions/Old data version/*`
- `rasa/actions/Old data version/OLD nlu.yml`

Current search found no live import/call to the `Topic Router` files from the active routing stack. They are reference data only.

## Current Risk Notes

1. `knowledge_router.py` is doing a lot of direct routing. This is useful for safety but can grow hard to maintain.
2. Some user wording can still be pulled toward the wrong direct route if the route condition is too broad.
3. `course`, `enrollment`, `available`, `inside`, `office`, `ID`, and `validation` remain high-risk ambiguous terms.
4. Rasa fallback predictions can still be handled by Python routing, but only if the corresponding clarification/direct route allows `nlu_fallback`.
5. The admin panel should continue hiding critical internal fields such as `intent`, `context_topic`, and `subject_key`.

## Phase 1 Status

Day 1 Phase 1 is complete as an audit.

Before moving beyond Day 1, the user should test:

- where is the library?
- how to enroll freshman?
- courses offered?
- how to get student id?
- what services can you provide?
