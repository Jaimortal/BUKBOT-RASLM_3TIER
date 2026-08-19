# Rasa Folder — Full Architecture & Data Flow

## Folder Structure Overview

```
rasa/
├── config.yml                    # Rasa NLU/Core pipeline config
├── domain.yml                    # Intents, entities, slots, actions declared to Rasa
├── endpoints.yml                 # Action server connection (localhost:5055)
├── data/
│   ├── nlu.yml                   # NLU training examples (intents + entity labels)
│   ├── rules.yml                 # Static routing rules (intent → action)
│   └── stories.yml               # Multi-turn conversation training stories
├── models/                       # Trained Rasa model binaries (auto-generated)
└── actions/
    ├── actions.py                # Main Rasa action entrypoint + JSON helper
    ├── main_router.py            # Central request dispatcher
    ├── knowledge_router.py       # Topic/subject routing logic
    ├── data_loader.py            # Adapter that unifies all JSON knowledge sources
    ├── retrieval_scorer.py       # Keyword scoring against knowledge records
    ├── retrieval_index.py        # In-memory index of all searchable records
    ├── retrieval_result.py       # RetrievalCandidate / RetrievalResult data classes
    ├── llm_reranker.py           # Groq LLM reranker for ambiguous results
    ├── context_manager.py        # Short-term conversation memory / follow-up logic
    ├── entity_resolver.py        # Resolves raw entity strings to canonical names
    ├── query_interpreter.py      # Tokenizer / normalizer
    ├── query_normalizer.py       # Deep text normalization rules
    ├── normalization_rules.json  # Text normalization rule definitions
    ├── language_detector.py      # Detects English vs Cebuano
    ├── response_builder.py       # Formats final response payloads to frontend
    ├── api_client.py             # Startup warm-cache from DB/JSON on boot
    ├── llm_api_client.py         # Groq API HTTP client
    ├── responses.json            # Legacy flat key-value responses (smalltalk, etc.)
    ├── responses_location.json   # All campus location data (pins, routes, map)
    ├── Magical Aliases/
    │   └── aliases.py            # All location name aliases → canonical names
    ├── Supper Saiyan/            # Structured knowledge JSON files (15 topics)
    │   ├── Academic_policy.json
    │   ├── Administrators.json
    │   ├── Admissions_info.json
    │   ├── Classroom_policy.json
    │   ├── Clinic_info.json
    │   ├── Courses_info.json
    │   ├── Departamentals_facultystaff.json
    │   ├── Department_info.json
    │   ├── Dormitory_info.json
    │   ├── Enrollment_info.json
    │   ├── Facilities_info.json
    │   ├── Ict_info.json
    │   ├── Library_info.json
    │   ├── Oss_services.json
    │   └── University_info.json
    └── Topic Router/             # Per-JSON topic routing functions (14 files)
        ├── Academic_policy_topicroute.py
        ├── Admissions_topicroute.py
        └── ... (one per Supper Saiyan JSON)
```

---

## Complete Request Flow (Step by Step)

```
User types a message
        │
        ▼
[1] RASA NLU MODEL (trained from nlu.yml)
    - Classifies broad intent: ask_location / ask_general_info / ask_process / etc.
    - Extracts entities: [ComLab 1](location_name), [enrollment](service), etc.
    - Intent + entities are passed forward
        │
        ▼
[2] rules.yml
    - Maps every intent → action_main_router
    - (only goodbye and bot_challenge use built-in utter_ responses)
        │
        ▼
[3] ActionMainRouter.run()  ← actions.py
    - Thin Rasa wrapper
    - Checks if the query is multi-question (if so splits and routes each)
    - Calls MainRouterService.route_with_context()
        │
        ▼
[4] MainRouterService.route_with_context()  ← main_router.py
    A waterfall of checks, in priority order:

    4a. Bot creator check (hardcoded shortcut)
    4b. Uniform/dress code shortcut
    4c. Smalltalk shortcut
    4d. ID clarification (ambiguous "id" follow-up)
    4e. Follow-up intent resolution (ContextManager) — handles "tell me more"
    4f. Ambiguous ID question prompt
    4g. Admission clarification prompt
    4h. Building directory request check
    4i. Faculty office menu (generic "faculty office" → suggestions)
    4j. Dean's office menu (generic "dean's office" → suggestions)
    4k. Services list prompt
    4l. Course clarification prompt
    4m. Validation clarification prompt
    4n. PE uniform clarification prompt
    4o. Facility availability route (does BukSU have X?)
    4p. Location priority check → _route_locations() if clearly a "where is X" query
    4q. Direct intent override (KnowledgeRouter specific keyword match)
    4r. ask_location fallback (location slot set but step 4p was skipped)
    4s. Unresolved location request error message
    4t. ★ MAIN KNOWLEDGE RETRIEVAL (find_best_response)
        │
        ▼
[5] EntityResolver.resolve()  ← entity_resolver.py
    - Takes Rasa entities + raw user text
    - Normalizes location names against LOCATION_ALIASES (aliases.py)
    - Scans user message text for alias substrings
    - Returns ResolvedEntities: { locations: [...], values: [...] }
        │
        ▼
[6] KnowledgeRouter.find_best_response()  ← knowledge_router.py
    - Calls RetrievalScorer.search() to score all knowledge records
    - Picks top candidate(s)
    - If score is ambiguous → calls LLMReranker (Groq)
    - Returns best matching response dict
        │
        ▼
[7] RetrievalScorer.search()  ← retrieval_scorer.py
    - Loads all records from RetrievalIndex (built from KnowledgeDataLoader)
    - Scores each record: keyword overlap, exact phrase match, entity match, etc.
    - Applies synonym expansion
    - Returns RetrievalResult with best candidate + confidence tier
        │
        ▼
[8] KnowledgeDataLoader  ← data_loader.py
    - Flattens ALL Supper Saiyan JSON files into a unified list of records
    - Each record has: intent, category, sub_category, responses, metadata
    - Also exposes: get_location_response(), get_response(intent), fallback()
        │
        ▼
[9] LLMReranker (optional)  ← llm_reranker.py
    - Only called when top candidates are too close in score (ambiguous)
    - Sends candidates to Groq API for final selection
    - Caches decisions for 1 hour (_decision_cache) to save tokens
        │
        ▼
[10] ResponseBuilder.emit_response()  ← response_builder.py
    - Formats final response for frontend: text, map data, images, buttons, etc.
    - Sends via Rasa dispatcher.utter_message()
        │
        ▼
[11] ContextManager.build_memory()  ← context_manager.py
    - Stores conversation subject, category, last_topic into slots
    - Used for follow-up resolution in the next turn
```

---

## Knowledge Data Flow (How JSON becomes answers)

```
Supper Saiyan/*.json
    │  Each JSON has: { "intent": "...", "topics": [...] }
    │  Each topic has: topic, display_name, responses, follow_up, metadata
    ▼
KnowledgeDataLoader._flatten_structured_sources()
    │  Converts all topics into flat records with intent keys like:
    │  "enrollment_info_enrollment_process", "academic_policy_inc_grade", etc.
    ▼
RetrievalIndex
    │  Builds searchable index over all records
    │  Each record has: tokens, phrases, display names, metadata tags
    ▼
RetrievalScorer
    │  Scores user query against each record
    │  Uses: token overlap, exact phrase, entity match, purpose-term match
    ▼
Best matching record → response sent to user
```

---

## Location Data Flow (How locations are resolved)

```
User: "where is ComLab 1"
    │
    ▼
[NLU] → intent: ask_location, entity: [ComLab 1](location_name)
    │
    ▼
[EntityResolver]
    → checks LOCATION_ALIASES["comlab 1"] → "ComLab 1" (canonical name)
    → also scans raw text for any alias substring as a fallback
    │
    ▼
[MainRouter._should_prioritize_location()] → True (has "where" keyword)
    │
    ▼
[MainRouter._route_locations()]
    → checks _response_cache first
    → calls KnowledgeRouter.location_responses(["ComLab 1"], user_msg)
    → looks up "ComLab 1" in responses_location.json
    → returns: { text, pins, routes, coordinates, map_id }
    │
    ▼
[ResponseBuilder] → sends map + directions to frontend
```

---

## Caching Layers

| Layer | Location | What is cached | TTL |
|---|---|---|---|
| Browser RAM | `rasaApi.ts` queryCache | Exact user queries → full response | Until page reload |
| Server RAM (location/facility) | `main_router.py` _response_cache | Location & facility responses | Until server restart |
| Server RAM (knowledge) | `main_router.py` _response_cache | Knowledge query responses | Until server restart |
| LLM Decision | `llm_reranker.py` _decision_cache | Groq reranking decisions | 1 hour |

---

## Files You Touch for Common Tasks

| Task | Files |
|---|---|
| Add a new location | `responses_location.json` + `aliases.py` |
| Add a new knowledge topic | `Supper Saiyan/<relevant>.json` |
| Add a new knowledge category | New `Supper Saiyan/NewTopic.json` + register in `actions.py` + `data_loader.py` |
| Add a location alias | `aliases.py` only |
| Change a bot response | Edit the relevant `Supper Saiyan/*.json` topic's `responses` |
| Add new intent type | `nlu.yml` + `domain.yml` + `rules.yml` + handler in `main_router.py` → requires `rasa train` |
| Add synonym for scoring | `retrieval_scorer.py` SYNONYMS dict |
| Add clarification prompt | `knowledge_router.py` or `main_router.py` |

---

## When Rasa Retraining is Required

Only needed when you modify these files:
- `nlu.yml` — new intents or training examples
- `domain.yml` — new intents, entities, slots, or actions declared
- `rules.yml` — new routing rules
- `stories.yml` — new conversation flows
- `config.yml` — pipeline changes

**No retraining needed** when editing JSON knowledge files, `aliases.py`, or any Python action code.
