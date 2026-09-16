# Capstone Objective 1 — System Architecture, Flow, & Design Master Document

**Project Title:** BukSU AI Chatbot — High-Precision Bilingual Campus Conversational Agent & Navigation System  
**Objective:** Objective 1 — System Architecture, Use Case Modeling, Sequence Order, Conversational Flow, and Database/Knowledge Base Design  
**Status:** **100% Finalized & Complete**  
**Target Directory:** `docs/Architecture/Objective/`

---

## 📑 Table of Contents
1. [Objective 1 Executive Summary](#1-objective-1-executive-summary)
2. [System Architecture & Technology Stack](#2-system-architecture--technology-stack)
3. [Use Case Diagram & Actor Specifications](#3-use-case-diagram--actor-specifications)
4. [Sequence Diagram & Execution Pipeline Order](#4-sequence-diagram--execution-pipeline-order)
5. [Conversational & Dialogue Flow Charts](#5-conversational--dialogue-flow-charts)
6. [Database ERD & Knowledge Graph Schema](#6-database-erd--knowledge-graph-schema)
7. [System Design Finality & Defense Statement](#7-system-design-finality--defense-statement)
8. [Production Deployment Topology & Load Balancer Design](#8-production-deployment-topology--load-balancer-design)

---

## 📌 1. Objective 1 Executive Summary

The primary goal of **Objective 1** is to formulate, design, and validate the technical foundation of the BukSU AI Chatbot. The system is engineered around a **High-Precision Multi-Tier Hybrid Architecture** that seamlessly unifies:
* A modern reactive client with an interactive vector canvas campus map.
* A Node.js / Express middleware API gateway.
* A deterministic Python NLP action server with multi-factor semantic retrieval scoring.
* A guarded cloud Large Language Model (LLM) reranking pool for ambiguous queries with zero hallucination.
* A bilingual language processing core (English and Cebuano/Bisaya).
* A PostgreSQL relational database and structured JSON knowledge graph.

---

## 🏗️ 2. System Architecture & Technology Stack

### System Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer["🖥️ Presentation & User Interface Layer"]
        UI_Chat["Web Chat Interface<br/>(React 18 + Vite + TypeScript)"]
        UI_Map["Interactive Campus Map Viewer<br/>(SVG / Canvas / Pan-Zoom Engine)"]
        UI_Admin["Admin Knowledge Manager CMS<br/>(CRUD Knowledge Editor & Analytics)"]
    end

    subgraph GatewayLayer["🌐 Application & Middleware Layer"]
        Server["Node.js / Express API Server"]
        AuthModule["Session & Auth Controller<br/>(JWT + Drizzle ORM)"]
        LogModule["Conversation Logger & Telemetry"]
        SocketServer["WebSocket / REST API Handler"]
    end

    subgraph NLPLayer["🧠 NLP & Routing Engine (Python Custom Engine)"]
        Normalizer["Query Normalizer & Text Sanitizer<br/>(Bilingual Lemmatization & Slang Map)"]
        LangDetect["Language Detector<br/>(Cebuano/Bisaya vs. English Lexicon)"]
        
        subgraph MultiTierPipeline["Multi-Tier Decision Pipeline"]
            Tier0["Tier 0: Direct Point Grab<br/>(/direct_intent & Button Payloads)"]
            Tier1["Tier 1: Deterministic Direct Rule Engine<br/>(Domain-Validated Heuristics & Privacy Guards)"]
            Tier2["Tier 2: Semantic Domain Retrieval Scorer<br/>(Local Multi-Factor Weighted Scoring)"]
            Tier3["Tier 3: Guarded LLM Re-ranker<br/>(Sticky Groq LLaMA 3.3 + Gemini Pool)"]
            TierSafety["Safety Net: Category Fallback<br/>(Dynamic In-Domain Suggested Buttons)"]
        end
    end

    subgraph DataLayer["💾 Knowledge Base & Persistence Layer"]
        JSON_KB["Structured JSON Knowledge Graph<br/>(Domain / Category / Topic / Subtopic)"]
        MapData["Campus Geospatial Database<br/>(Coordinates, Pins, Polyline Routes)"]
        PG_DB["PostgreSQL Database<br/>(Users, Sessions, Logs, Admin Overrides)"]
    end

    subgraph ExternalLayer["☁️ External Cloud AI Services"]
        GroqCloud["Groq Cloud LPU API<br/>(LLaMA 3.3 70B Versatile - 5 Key Pool)"]
        GeminiCloud["Google Gemini Cloud API<br/>(Gemini 1.5 / 2.0 - 3 Key Fallback)"]
    end

    %% Flow Connections
    ClientLayer <-->|HTTP / WebSocket| GatewayLayer
    GatewayLayer <-->|Internal REST API :5005 / :5000| NLPLayer
    
    NLPLayer --> Normalizer --> LangDetect --> Tier0
    Tier0 -->|Typed Message| Tier1
    Tier1 -->|Unresolved| Tier2
    Tier2 -->|Ambiguous Candidate Margin < 8.0| Tier3
    Tier2 -->|Zero Candidates| TierSafety
    Tier3 -->|Declined / Cooldown| TierSafety
    
    Tier3 <-->|Guarded Candidate List Only| ExternalLayer
    
    Tier0 -->|Fetch Knowledge| JSON_KB
    Tier1 -->|Fetch Knowledge| JSON_KB
    Tier2 -->|Fetch Knowledge| JSON_KB
    Tier3 -->|Fetch Knowledge| JSON_KB
    
    NLPLayer -->|Fetch Coordinates & Routes| MapData
    GatewayLayer <-->|Read / Write| PG_DB
```

### Technology Matrix

| Layer | Component | Specific Technology | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | User Chat Widget | React 18, TypeScript, Tailwind CSS, Vite | Responsive conversational interface and quick discovery |
| **Frontend** | Interactive Map | HTML5 Canvas & SVG Vector Engine | Campus building pins, floor details, and walking paths |
| **Frontend** | Admin CMS | React, Radix UI, Lucide Icons | Knowledge base curation, response editing, telemetry |
| **Middleware** | Gateway Server | Node.js, Express.js, TypeScript | Session verification, request routing, rate limiting |
| **Database** | Relational Store | PostgreSQL + Drizzle ORM | Audit logs, session tokens, administrative credentials |
| **NLP Core** | Routing & Action Server | Python 3.10, Rasa Open Source | Normalization, language classification, scoring pipeline |
| **NLP Core** | Semantic Scorer | Custom Multi-Factor Retrieval Scorer | In-domain candidate matching with $+36/+18/+8/-12$ weighting |
| **External AI** | Primary LLM Reranker | Groq LPU (LLaMA 3.3 70B Versatile) | Sub-300ms ambiguous query intent selection |
| **External AI** | Fallback LLM Reranker | Google Gemini 1.5 / 2.0 Flash API | Automated fallback pool for rate limits |
| **Knowledge** | Knowledge Graph | Typed JSON Trees (`knowledge/`) | Single source of truth for official university answers |

---

## 👥 3. Use Case Diagram & Actor Specifications

```mermaid
graph LR
    %% Actors
    Actor_Student["🎓 Student<br/>(Freshman / Continuing)"]
    Actor_Applicant["📝 Prospective Applicant<br/>(SHS / Transferee)"]
    Actor_Faculty["👨‍🏫 Faculty / Staff"]
    Actor_Visitor["🚶 Visitor / Guest"]
    Actor_Admin["🛠️ System Administrator"]

    %% Core Use Cases
    UC_AskGeneral["Inquire University Information<br/>(Colleges, Deans, History, Identity)"]
    UC_AskAdmission["Inquire Admission Procedures & Requirements<br/>(Freshmen, Transferees, Second Coursers, ALS)"]
    UC_AskCutoff["Inquire Program CAT Scores & Cutoffs<br/>(IT, EMC, FT, Nursing, Education, Board/Non-board)"]
    UC_AskEnrollment["Inquire Enrollment Steps & Academic Policies<br/>(COR Validation, Adding/Dropping, INC, Grading)"]
    UC_AskServices["Inquire Student Services & Facilities<br/>(Clinic, Library, OSS, Scholarships, Dormitory)"]
    UC_NavMap["Search Campus Location & Wayfinding<br/>(Offices, Labs, Buildings, ATM, Clinics)"]
    UC_Language["Toggle Language / Auto-Detection<br/>(English & Cebuano/Bisaya)"]
    UC_InteractMap["Interact with Campus Map<br/>(Pinch-to-zoom, Pan, Floor Pin Inspection)"]
    UC_Disambiguate["Disambiguate Query via LLM Reranker"]
    UC_Fallback["Trigger In-Domain Fallback Suggestions"]
    
    %% Admin Use Cases
    UC_Auth["Authenticate / Login to Admin Portal"]
    UC_ManageKB["Manage Knowledge Base & Answers<br/>(Add, Edit, Categorize Topics & Responses)"]
    UC_ViewLogs["View Conversation Telemetry Logs<br/>(Audits, Latency, Intent Classifications)"]
    UC_RunTests["Execute Automated Regression Tests"]

    %% Student Connections
    Actor_Student --> UC_AskGeneral
    Actor_Student --> UC_AskEnrollment
    Actor_Student --> UC_AskServices
    Actor_Student --> UC_NavMap
    Actor_Student --> UC_Language

    %% Applicant Connections
    Actor_Applicant --> UC_AskGeneral
    Actor_Applicant --> UC_AskAdmission
    Actor_Applicant --> UC_AskCutoff
    Actor_Applicant --> UC_NavMap
    Actor_Applicant --> UC_Language

    %% Faculty Connections
    Actor_Faculty --> UC_AskGeneral
    Actor_Faculty --> UC_AskEnrollment
    Actor_Faculty --> UC_NavMap

    %% Visitor Connections
    Actor_Visitor --> UC_AskGeneral
    Actor_Visitor --> UC_NavMap

    %% Admin Connections
    Actor_Admin --> UC_Auth
    Actor_Admin --> UC_ManageKB
    Actor_Admin --> UC_ViewLogs
    Actor_Admin --> UC_RunTests

    %% <<include>> Relationships
    UC_AskGeneral -.->|<<include>>| UC_Language
    UC_AskAdmission -.->|<<include>>| UC_Language
    UC_AskCutoff -.->|<<include>>| UC_Language
    UC_AskEnrollment -.->|<<include>>| UC_Language
    UC_AskServices -.->|<<include>>| UC_Language
    UC_NavMap -.->|<<include>>| UC_Language
    UC_ManageKB -.->|<<include>>| UC_Auth
    UC_ViewLogs -.->|<<include>>| UC_Auth

    %% <<extend>> Relationships
    UC_InteractMap -.->|<<extend>>| UC_NavMap
    UC_Disambiguate -.->|<<extend>>| UC_AskEnrollment
    UC_Disambiguate -.->|<<extend>>| UC_AskAdmission
    UC_Disambiguate -.->|<<extend>>| UC_AskServices
    UC_Fallback -.->|<<extend>>| UC_AskEnrollment
    UC_Fallback -.->|<<extend>>| UC_AskAdmission
    UC_Fallback -.->|<<extend>>| UC_AskGeneral
```

---

## 🔄 4. Sequence Diagram & Execution Pipeline Order

```mermaid
sequenceDiagram
    autonumber
    actor User as 🎓 Student / User
    participant UI as 🖥️ Web UI (React + Canvas Map)
    participant Gateway as 🌐 Node.js Gateway / Express Server
    participant Rasa as 🧠 Python Action Server (MainRouter)
    participant Normalizer as ⚙️ Query Normalizer & LangDetector
    participant Tier1 as 🛡️ Tier 1: Direct Rules
    participant Tier2 as 📊 Tier 2: Semantic Scorer
    participant Tier3 as ☁️ Tier 3: LLM Reranker (Groq/Gemini)
    participant KB as 💾 Knowledge Store (JSON & PostgreSQL)

    %% Step 1: User Input
    User->>UI: Types query ("what is the required cat for IT")
    UI->>Gateway: POST /api/chat {message, activeCategory, sessionId}
    Gateway->>Rasa: Forward request to MainRouterService

    %% Step 2: Preprocessing
    Rasa->>Normalizer: Normalize text & detect language
    Normalizer-->>Rasa: Normalized: "what is the required cat for IT" | Lang: "en"

    %% Step 3: Tier 0 / Tier 1 Evaluation
    Rasa->>Tier1: Evaluate Heuristics & Direct Rule Overrides
    
    alt Tier 1 Match Found (e.g. Program Cutoff Score)
        Tier1-->>Rasa: Matched Intent: "program_cutoff_scores" (Deterministic)
    else No Direct Rule Match
        Rasa->>Tier2: Execute Semantic Retrieval on Active Domain Candidates
        Tier2-->>Rasa: Candidate Scores [Top Intent, RunnerUp, Margin]

        alt High Confidence (Score >= 34.0 & Margin >= 8.0)
            Rasa->>Rasa: Accept Local NLU Top Candidate
        else Ambiguous Contest (Margin < 8.0)
            Rasa->>Tier3: Request Intent Disambiguation (Top 3 Candidates)
            Tier3-->>Rasa: Selected In-Domain Intent: "program_cutoff_scores"
        else Zero Candidates Scored
            Rasa->>Rasa: Set Intent: "category_fallback_safetynet"
        end
    end

    %% Step 4: Knowledge Lookup & Multilingual Resolution
    Rasa->>KB: Retrieve JSON Record for "program_cutoff_scores"
    KB-->>Rasa: Returns {answer: {en, ceb}, suggestions, mapData, pins}

    %% Step 5: Formatting & Logging
    Rasa->>Rasa: Select answer["en"] (based on detected language "en")
    Rasa-->>Gateway: Return Structured Response Payload
    Gateway->>KB: Write Telemetry to PostgreSQL (conversation_logs)

    %% Step 6: Presentation to User
    Gateway-->>UI: Send JSON Response (Text, Buttons, Coordinates)
    UI->>UI: Render Message Bubble + Suggestion Chips
    opt Has Location Coordinates / Pins
        UI->>UI: Pan/Zoom Canvas Map & Highlight Campus Pin
    end
    UI-->>User: Display Formatted Answer & Follow-up Options
```

### Exact Order of Internal Steps:
1. **Client Submission:** React UI captures message, category slot, and session ID.
2. **Gateway Intake:** Node.js Express server validates session and forwards to Python server.
3. **Query Normalization:** `query_normalizer.py` sanitizes text, normalizes contractions, and expands acronyms (IT $\rightarrow$ BSIT, COT $\rightarrow$ College of Technologies).
4. **Language Classification:** `language_detector.py` checks for Cebuano/Bisaya lexicon markers and sets session language to `ceb` or `en`.
5. **Tier 0 Fast Path:** Detects `/direct_intent` or button clicks ($\sim 0\text{ms}$).
6. **Tier 1 Heuristic Rules:** Executes domain-validated regex rules for high-frequency topics ($\sim 1–5\text{ms}$).
7. **Tier 2 Semantic Scoring:** Ranks in-domain candidates using multi-factor scoring. Takes over locally if score $\ge 34.0$ and margin $\ge 8.0$ ($\sim 5–15\text{ms}$).
8. **Tier 3 Guarded LLM Reranking:** If margin $< 8.0$, Groq LLaMA 3.3 selects the best intent from pre-screened candidates without generating text ($\sim 250\text{ms}$).
9. **Knowledge Graph Fetch:** Pulls official response text matching detected language (`en`/`ceb`), suggestion chips, map coordinates, and walking routes.
10. **Telemetry & Client Render:** Logs conversation metrics into PostgreSQL and renders chat message bubble, buttons, and animated campus map pin.

---

## 🌐 5. Conversational & Dialogue Flow Charts

### Bilingual Processing Flow
* **Automatic Detection:** Every message is analyzed per-turn using token matching against a Cebuano stopword lexicon.
* **Persistent Flexibility:** A student can freely switch between English and Bisaya mid-conversation without needing to restart the session or toggle settings manually.

### Map Navigation Flow
* **Spatial Triggers:** Activated by location questions (*"where is"*, *"asa dapit"*), building names (*ComLab 1-12*, *Clinic*, *Registrar*), or clicking location buttons.
* **Interactive Output:** Delivers textual office directions, floor metadata, and triggers animated pan-and-zoom map positioning with waypoint walking routes on the client canvas.

### Multi-Level Fallback & Guardrails
* **Personal Data Guard:** Blocks queries asking for private grades or tuition balances and redirects the student to the official SIAS portal.
* **Out-of-Scope Guard:** Rejects external city weather or general transit inquiries not related to BukSU campus operations.
* **Category Safety Net:** When confidence is zero, outputs a polite domain-scoped message and renders 3 dynamic clickable topic discovery buttons.

---

## 🗄️ 6. Database ERD & Knowledge Graph Schema

```mermaid
erDiagram
    USERS ||--o{ USER_SESSIONS : "authenticates"
    USERS ||--o{ LOGIN_ATTEMPTS : "tracks"
    USER_SESSIONS ||--o{ CONVERSATION_LOGS : "records"
    
    USERS {
        varchar id PK "UUID"
        text username UK "Admin username"
        text password "Argon2/Bcrypt hash"
        text role "admin / editor"
        timestamp created_at
    }

    USER_SESSIONS {
        varchar id PK "UUID"
        text session_id UK "Client session ID"
        text token "JWT token"
        text username
        timestamp expires
        timestamp created_at
    }

    LOGIN_ATTEMPTS {
        varchar id PK "UUID"
        text identifier "IP + Username"
        integer attempt_count "Consecutive failures"
        timestamp last_attempt
        timestamp locked_until
        timestamp created_at
    }

    CONVERSATION_LOGS {
        varchar id PK "UUID"
        text session_id FK "Session reference"
        text user_message "Incoming query text"
        text bot_response "Delivered response"
        text intent "Classified intent key"
        text language "en or ceb"
        integer response_time "Latency in ms"
        timestamp user_message_timestamp
        timestamp bot_response_timestamp
        timestamp created_at
    }

    USER_PRIVILEGES {
        varchar id PK "UUID"
        boolean chat_enabled "Master chat toggle"
        boolean audio_input_enabled "Voice STT toggle"
        boolean map_access_enabled "Map view toggle"
        boolean auto_translate_enabled "Bilingual detection toggle"
        timestamp updated_at
    }

    BOT_RESPONSES {
        serial id PK
        text intent UK "Intent identifier"
        text category "Domain category"
        text sub_category "Sub-domain"
        jsonb answer_en "English response lines"
        jsonb answer_ceb "Bisaya response lines"
        jsonb follow_up "Follow-up prompts"
        jsonb context_slots "Context slot state"
        jsonb map_data "Coordinates [Y, X]"
        jsonb metadata "Search phrases & tags"
        timestamp created_at
        timestamp updated_at
    }

    LOCATION_RESPONSES {
        serial id PK
        text name "Facility/Office name"
        text type "Office / Lab / Clinic / Gate"
        text building "Building name"
        text floor "Floor number / N/A"
        jsonb coordinates "[Y, X] pixel coordinates"
        text map_id "main_map / sub_map"
        jsonb responses_en "English directions"
        jsonb responses_ceb "Bisaya directions"
        jsonb pins "Sub-room pin markers"
        jsonb routes "Walking path vectors"
        timestamp created_at
        timestamp updated_at
    }

    FAQ_CONFIGS {
        varchar id PK "UUID"
        text super_intent "Category identifier"
        text topic_key "Topic identifier"
        text display_label "Button label in UI"
        text subtitle "Short description"
        text icon "Lucide icon key"
        text payload "Direct intent payload"
        boolean enabled "Visibility toggle"
        integer sort_order "Ordering rank"
        timestamp created_at
    }
```

---

## 🔒 7. System Design Finality & Defense Statement

### Panel Question:
> *"Is the system's design (architecture, flow, database schema) finalized, or does it still depend on the data we're collecting?"*

### Capstone Defense Answer & Position:
1. **The Architecture, Decision Flow, and Database Schema are 100% Finalized:**
   * The multi-tier hybrid pipeline, query normalization layer, language detection mechanism, relational PostgreSQL tables, and JSON knowledge graph architecture are fully locked and structurally complete.
2. **Data Scalability Without Structural Changes:**
   * Incoming institutional data (e.g., additional FAQ training phrases, revised department hours, or new program requirements) is populated directly into the dynamic JSON knowledge graph without modifying the underlying database schema or routing logic.
3. **Objective 1 Status:**
   * **Objective 1 can be presented to the Capstone panel as 100% COMPLETE.**

---

## 🚀 8. Production Deployment Topology & Load Balancer Design

### 8.1 Deployment Justification & Traffic Estimation

The BukSU AI Chatbot is designed not only as a capstone prototype but as a system intended for real institutional deployment after the defense. Based on projected usage patterns of the Bukidnon State University student population, the following traffic tiers are anticipated:

| Traffic Scenario | Estimated Concurrent Users | Trigger Event |
| :--- | :---: | :--- |
| **Common Day** | 100 – 300 users | Regular academic day queries |
| **Rush Hour / Exam Week** | 1,000 – 1,500 users | Pre-exam and schedule inquiry surges |
| **Enrollment Day (Peak Load)** | 5,000 – 10,000 users | University-wide enrollment opening |

A single-process Node.js server cannot safely absorb these concurrent loads without risking port exhaustion, unhandled socket timeouts, and memory overflow. The **Nginx Reverse Proxy / Load Balancer** layer is introduced to ensure the chatbot remains reliably available under all three traffic conditions.

---

### 8.2 Production Deployment Architecture Diagram

```mermaid
graph TB
    subgraph Internet["🌐 Public Internet / Student Devices"]
        Student["👤 Student / Faculty Browser\n(Desktop or Mobile)"]
    end

    subgraph NginxLayer["⚖️ Nginx Reverse Proxy & Load Balancer Layer"]
        Nginx["Nginx Web Server\n(SSL Termination · Rate Limiting · Static Cache)"]
        subgraph WorkerPool["Worker Process Pool (PM2 Cluster Mode)"]
            Worker1["Node.js Worker #1\n(Express API — Port 5000)"]
            Worker2["Node.js Worker #2\n(Express API — Port 5000)"]
            WorkerN["Node.js Worker #N\n(Scales to CPU Core Count)"]
        end
    end

    subgraph AppCore["🧠 Application Core (Internal Network)"]
        RasaServer["Python Rasa Action Server\n(NLP Engine — Port 5005)"]
        PG["PostgreSQL Database\n(Persistent Storage)"]
        JSONGraph["JSON Knowledge Graph\n(Domain Knowledge Files)"]
    end

    subgraph ExternalCloud["☁️ External Cloud AI"]
        Groq["Groq Cloud LPU\n(LLaMA 3.3 70B)"]
        Gemini["Google Gemini API\n(Fallback)"]
    end

    Student -->|"HTTPS :443"| Nginx
    Nginx -->|"Round-Robin / Least-Connection"| Worker1
    Nginx -->|"Round-Robin / Least-Connection"| Worker2
    Nginx -->|"Round-Robin / Least-Connection"| WorkerN
    Worker1 <-->|"Internal REST :5005"| RasaServer
    Worker2 <-->|"Internal REST :5005"| RasaServer
    WorkerN <-->|"Internal REST :5005"| RasaServer
    Worker1 <-->|"Read / Write"| PG
    Worker2 <-->|"Read / Write"| PG
    WorkerN <-->|"Read / Write"| PG
    RasaServer -->|"Fetch Knowledge"| JSONGraph
    RasaServer -->|"Guarded LLM Call"| Groq
    RasaServer -->|"Fallback LLM Call"| Gemini
```

---

### 8.3 Nginx Layer — Responsibilities

| Nginx Function | Description |
| :--- | :--- |
| **SSL/TLS Termination** | Handles HTTPS encryption/decryption at the edge so internal workers communicate over plain HTTP, reducing CPU overhead on Node.js processes. |
| **Load Balancing** | Distributes incoming HTTP connections across multiple PM2-managed Node.js worker processes using round-robin or least-connection algorithm. |
| **Static Asset Caching** | Serves the React frontend build (`/dist`) directly from disk without passing requests through Node.js, dramatically reducing server load. |
| **Rate Limiting** | Enforces per-IP request rate limits (e.g., 20 req/sec) to prevent abuse and protect the LLM API key pool from single-source exhaustion. |
| **Connection Buffering** | Buffers slow client uploads so Node.js workers are never blocked waiting for a slow mobile connection to finish sending a request. |
| **Health Check Proxy** | Routes to healthy workers only; if a Node.js worker crashes, PM2 restarts it while Nginx automatically bypasses it during recovery. |

---

### 8.4 PM2 Cluster Mode — Node.js Worker Management

The Node.js API server is managed by **PM2** in cluster mode, which forks one worker process per available CPU core:
- Handle multiple concurrent WebSocket connections simultaneously.
- Avoid blocking the event loop — if one worker is busy on an LLM call, others continue accepting connections.
- Automatically restart crashed workers within milliseconds without taking the service offline.

```
PM2 Cluster: 4–8 Worker Processes (depending on server CPU cores)
Each Worker:  ~512MB RAM allocation | ~250 concurrent connections
Total Capacity: ~1,000–2,000 concurrent connections per server node
```

---

### 8.5 Capacity Justification for BukSU Scale

The anticipated **10,000 peak enrollment-day users** does not mean 10,000 simultaneous open connections. Chatbot queries are short, stateless request-response cycles averaging **2–5 seconds per round trip**. At any given moment, actual concurrent active connections are a fraction of the total daily user count.

- **Common Day (100–300 users):** A single worker process is sufficient; Nginx overhead is negligible.
- **Rush Hour (1,000–1,500 users):** PM2 cluster with 4 workers handles this comfortably with headroom.
- **Enrollment Day (5,000–10,000 users):** Nginx connection buffering + rate limiting prevents overload. PM2 auto-scales within the server's core count. For extreme peaks, a second identical server node can be added behind Nginx with **zero application code changes**.

> **Note:** The current capstone prototype operates in a development configuration (single Node.js process, no Nginx). The production deployment topology described in this section represents the planned post-defense institutional deployment architecture, documented here for completeness and academic defense purposes.
