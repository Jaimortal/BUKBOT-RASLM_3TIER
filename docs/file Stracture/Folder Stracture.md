# BukSU AI Campus Assistant - Project Directory & Folder Structure

> **Document Type:** Architectural Reference & Repository Blueprint  
> **Location:** `docs/file Stracture/Folder Stracture.md`  
> **Source Companion:** Extracted and expanded from [README.md](file:///c:/School%20Related%20File/3rd%20year/Capstone%20dev/Chatbot/CHATBOT%20V5%20merged%20versions/Capstone_Project_Artificial_Intelligence_Chatbot/README.md) (preserved for defense and system documentation).

---

## 1. High-Level Core Architecture Tree

```
BukSU-Chatbot/
├── 📁 client/                     # Frontend Application (React + Vite + TS)
│   ├── 📁 src/
│   │   ├── 📁 components/         # Chat UI, GIS Leaflet maps, Category Drawers
│   │   ├── 📁 pages/              # Main Chat page, Map View, Admin Dashboard
│   │   └── 📁 lib/                # API communication & state management
│   └── 📁 public/                 # Static branding assets and campus media
├── 📁 server/                     # Node.js Express REST Backend
│   ├── 📁 controllers/            # Knowledge base management & audit trails
│   ├── 📁 routes/                 # Express API endpoints
│   └── 📄 index.ts                # Server entry point
├── 📁 rasa/                       # AI & Natural Language Engine
│   ├── 📁 actions/                # Cascade Routing & Scoring Algorithms
│   │   ├── 📄 knowledge_router.py # Central Multi-Tier Router
│   │   ├── 📄 retrieval_scorer.py # Statistical BM25 & Heuristic Matcher
│   │   ├── 📄 llm_reranker.py     # Neural Semantic Arbiter & Domain Cache
│   │   ├── 📄 llm_api_client.py   # Multi-Key Failover Client
│   │   ├── 📄 main_router.py      # Conversation Memory & Context Manager
│   │   ├── 📄 query_interpreter.py# Bilingual Tokenizer & Normalizer
│   │   └── 📁 knowledge/          # Curated Knowledge Base
│   │       ├── 📁 academics/      # Curricula, grading, retention policies
│   │       ├── 📁 procedures/     # Enrollment, clearance, admission steps
│   │       ├── 📁 services/       # Clinic, library, ICT, dorms, registrar
│   │       ├── 📁 university/     # History, administration, vision, mission
│   │       └── 📁 location/       # Building coordinates, floor directories
│   ├── 📄 domain.yml              # Rasa domain definitions
│   └── 📄 config.yml              # Rasa NLU pipeline configuration
├── 📁 docs/                       # Capstone Defense Guides & Audit Reports
└── 📄 README.md                   # Master System Documentation
```

---

## 2. Comprehensive Repository Layout

Below is the complete, full-depth directory tree detailing all runtime, data, documentation, and tooling modules across the repository:

```
BukSU-Chatbot-Root/
│
├── 📁 client/                                 # Frontend Web Client
│   ├── 📁 public/                             # Public static assets, icons, BukSU seal, favicon
│   ├── 📁 src/                                # Frontend TypeScript Source Code
│   │   ├── 📁 assets/                         # SVG icons, images, styling tokens
│   │   ├── 📁 components/                     # Reusable UI widgets
│   │   │   ├── 📁 admin/                      # Knowledge Base Editor & Audit Trail components
│   │   │   ├── 📁 chat/                       # Chat bubbles, message stream, suggestions drawer
│   │   │   ├── 📁 map/                        # Leaflet GIS 2D interactive campus map & navigation
│   │   │   └── 📁 ui/                         # Radix/Shadcn UI primitives (buttons, modals, tooltips)
│   │   ├── 📁 hooks/                          # Custom React hooks (speech recognition, dark mode)
│   │   ├── 📁 lib/                            # API client, WebSocket connections, query client
│   │   ├── 📁 pages/                          # Primary view routes (Home Chat, GIS Map, Admin)
│   │   ├── App.tsx                            # Root application component with routing
│   │   └── main.tsx                           # React DOM mount point
│   ├── package.json                           # Frontend dependencies & scripts
│   ├── tailwind.config.ts                     # Tailwind CSS theme & styling configuration
│   └── vite.config.ts                         # Vite build pipeline & proxy definitions
│
├── 📁 server/                                 # Backend Web API Server
│   ├── 📁 controllers/                        # Business logic controllers
│   │   ├── adminController.ts                 # Knowledge base CRUD, backup trigger & audit logging
│   │   ├── chatController.ts                  # Query normalization, Rasa proxy & fallback router
│   │   └── mapController.ts                   # Campus GIS spatial data & building routes
│   ├── 📁 routes/                             # Express REST API routing endpoints
│   ├── 📁 services/                           # Background helpers (analytics, logging, file watchers)
│   ├── index.ts                               # Node.js Express server entry point (Port 5000)
│   └── tsconfig.json                          # Backend TypeScript compilation configuration
│
├── 📁 shared/                                 # Shared Full-Stack Contracts
│   └── schema.ts                              # Drizzle/TypeScript shared types, interfaces & schemas
│
├── 📁 rasa/                                   # Natural Language Processing & Routing Engine
│   ├── 📁 actions/                            # Python Custom Action Server (Port 5055)
│   │   ├── 📁 knowledge/                      # Structured Knowledge Base (Curated Multi-Tier Data)
│   │   │   ├── 📁 academics/                  # Colleges, departments, curricula, retention
│   │   │   ├── 📁 procedures/                 # Admission, enrollment, clearance, graduation
│   │   │   ├── 📁 services/                   # Medical clinic, library, ICT, dormitory, registrar
│   │   │   ├── 📁 university/                 # History, administration, campus leadership, seal
│   │   │   └── 📁 location/                   # Building geo-coordinates, floor directories, facilities
│   │   ├── 📁 Magical Aliases/                # Aliases & bilingual keyword dictionary mappers
│   │   ├── data_loader.py                     # High-performance JSON loader with file-watcher hot reload
│   │   ├── knowledge_router.py                # Multi-tier deterministic & statistical router
│   │   ├── retrieval_scorer.py                # BM25 statistical scoring & token overlap analyzer
│   │   ├── llm_reranker.py                    # Neural semantic verification & domain boundary cache
│   │   ├── llm_api_client.py                  # Resilient multi-key LLM failover client
│   │   ├── main_router.py                     # Context management & session conversation memory
│   │   └── query_interpreter.py               # English-Cebuano bilingual tokenizer & normalizer
│   ├── 📁 data/                               # Rasa Training Datasets
│   │   ├── nlu.yml                            # Intent training samples & entity annotations
│   │   ├── rules.yml                          # Deterministic conversation rules
│   │   └── stories.yml                        # Multi-turn conversational flows
│   ├── 📁 models/                             # Active compressed Rasa models (.tar.gz)
│   ├── config.yml                             # Dual-Intent NLU pipeline & fallback thresholds
│   ├── domain.yml                             # Bot utterances, slots, intents & actions
│   └── endpoints.yml                          # Action server endpoint specifications
│
├── 📁 data/                                   # Runtime Persistent JSON Stores
│   ├── knowledge_base.json                    # Active production runtime knowledge store
│   ├── audit_logs.json                        # Administrator modification history & audit trails
│   └── chat_feedback.json                     # End-user thumbs up/down ratings & feedback log
│
├── 📁 rulebaseTranslation/                    # Bilingual Translation Utilities
│   └── (Translation rule files)               # Live English-Cebuano dictionary & keyword maps
│
├── 📁 deployment/                             # Production Deployment Configs
│   ├── Dockerfile                             # Container build recipes
│   ├── docker-compose.yml                     # Multi-service orchestration (Node, Rasa, Nginx)
│   └── nginx.conf                             # Reverse proxy & SSL termination configuration
│
├── 📁 dist/                                   # Compiled Production Artifacts
│   ├── 📁 public/                             # Production-bundled React frontend
│   └── 📁 server/                             # Transpiled Node.js backend JavaScript
│
├── 📁 docs/                                   # Documentation & Research Reports
│   ├── 📁 aliases new/                        # Detailed alias maps & normalization benchmarks
│   ├── 📁 Architecture/                       # Technical architecture diagrams & cascade specs
│   ├── 📁 Exp/                                # Experimental records & ablation studies
│   ├── 📁 file Stracture/                     # Directory blueprints (this documentation)
│   │   └── Folder Stracture.md                # Full project folder layout & component guide
│   ├── 📁 Testing/                            # Comprehensive accuracy reports & regression suites
│   ├── PILOT_DEPLOYMENT.md                    # BukSU campus pilot deployment checklist
│   ├── PRODUCTION_SETUP.md                    # Self-hosting setup guide & server instructions
│   └── README_PRODUCTION.md                   # Production runtime operations manual
│
├── 📁 tools/                                  # Developer Test Harnesses & Tooling
│   ├── preflight_check.py                     # Pre-training and deployment validation script
│   ├── batch_test_runner.py                   # Automated accuracy benchmark runner
│   └── benchmark_evaluator.py                 # Latency, precision & recall evaluator
│
├── 📁 test/                                   # Automated Test Suites
│   ├── test_query_normalization.py           # Bilingual tokenization unit tests
│   └── test_knowledge_router.py               # Zero-collision intent routing test suite
│
├── 📁 reports/                                # QA & Accuracy Benchmark Logs
│   ├── accuracy_summary.md                    # Benchmark precision and recall matrices
│   └── regression_test_log.txt                # Automated regression test execution outputs
│
├── 📁 scripts/                                # Maintenance & Setup Scripts
│   ├── build.ts                               # Production build pipeline runner
│   └── check-env.js                           # Node environment & dependency validator
│
├── 📁 experimental_llm_layer/                 # Experimental LLM Research Prototypes
│   └── (Ollama / Local LLM sandbox files)     # Isolated research layer (non-production)
│
├── 📁 backups/                                # Development Snapshots (Dev Only)
│   └── (Historic data & JSON checkpoints)     # Safe snapshots prior to major schema updates
│
├── 📁 OLD DATA/                               # Deprecated Datasets (Dev Only)
│   └── (Archived NLU YAMLs & legacy models)   # Preserved legacy references
│
├── 📁 scratch/                                # Temporary Scratchpad (Dev Only)
├── 📁 tmp/                                    # Ephemeral Runtime Workspace (Dev Only)
├── package.json                               # Workspace-wide npm package registry
├── tsconfig.json                              # TypeScript project configuration
└── README.md                                  # Master Documentation & Defense Presentation
```

---

## 3. Directory Responsibilities & Production Role

| Directory | Role in Production | Description |
|:---|:---:|:---|
| `client/` | **Required** (Built into `dist/public`) | React frontend user interface, Leaflet GIS campus map, and administrator portal. |
| `server/` | **Required** (Transpiled into `dist/`) | Express REST API server orchestrating user queries, admin updates, and Rasa dispatch. |
| `shared/` | **Required** (Compile-time) | Shared data schemas ensuring type-safety across frontend and backend. |
| `rasa/actions/` | **Required** | Action Server hosting the Cascade Routing Engine, BM25 statistical retriever, and JSON knowledge base. |
| `rasa/models/` | **Required** | Current active trained Rasa model archive (`.tar.gz`) used by the Rasa core engine. |
| `data/` | **Required** | Runtime persistent storage for knowledge updates, audit logs, and user feedback. |
| `rulebaseTranslation/` | **Required** | Active translation maps used by `adminController.ts` for real-time phrase normalization. |
| `deployment/` | **Required** | Docker and Nginx reverse proxy configurations for live hosting. |
| `docs/` | Reference / Capstone Defense | Comprehensive guides, thesis architecture explanations, and test methodologies. |
| `tools/` & `test/` | Dev / QA Testing | Validation scripts and automated test suites ensuring 100% routing accuracy. |
| `reports/` | Audit / Verification | Generated accuracy logs and QA benchmarks. |
| `backups/`, `OLD DATA/`, `scratch/`, `tmp/` | Dev Only (Exclude from Prod) | Developer scratchpads and historical archives not loaded during production runtime. |

---

> [!NOTE]
> This document serves as a dedicated, versioned guide under `docs/file Stracture/Folder Stracture.md` and does **not** replace or alter the directory overview located in [README.md](file:///c:/School%20Related%20File/3rd%20year/Capstone%20dev/Chatbot/CHATBOT%20V5%20merged%20versions/Capstone_Project_Artificial_Intelligence_Chatbot/README.md).

