# BukSU AI Chatbot — Conversational & Dialogue Flow Charts

---

## 📌 1. Conversational Flow Overview

The dialogue system is structured around three primary branching flows:
1. **Bilingual Processing Flow:** Seamless automatic detection and routing between English and Cebuano/Bisaya.
2. **Campus Map Navigation Flow:** Spatial intent parsing, coordinate extraction, and interactive visual map rendering.
3. **Multi-Level Fallback & Guardrail Flow:** Graceful handling of out-of-domain, low-confidence, or private record inquiries.

---

## 🌐 2. Language Handling Flow (Bisaya vs. English)

### Mechanism: Automated Dynamic Language Detection
* The system does **not force manual language selection** via a dropdown, ensuring natural, fluid conversations.
* Every incoming message is dynamically analyzed by `language_detector.py` using token matching against a comprehensive Cebuano/Bisaya institutional lexicon (e.g., *asa, unsa, kinsa, kanus-a, pila, kinahanglan, makasulod, buhaton, adto, diri, nako*).
* If Cebuano tokens are detected, the session language is set to `ceb`; otherwise, it defaults to `en`.
* The final response generator selects the corresponding language string from the verified knowledge record (`responses["ceb"]` or `responses["en"]`).

```mermaid
flowchart TD
    StartMsg["User Submits Query"] --> ParseTokens["Tokenize & Extract Words"]
    ParseTokens --> CheckLexicon{"Contains Cebuano/Bisaya<br/>Lexicon Tokens?"}
    
    CheckLexicon -->|Yes| SetCeb["Set Session Language = 'ceb'<br/>(Cebuano / Bisaya)"]
    CheckLexicon -->|No| SetEn["Set Session Language = 'en'<br/>(English Default)"]
    
    SetCeb --> ExecutePipeline["Execute Multi-Tier Routing Pipeline"]
    SetEn --> ExecutePipeline
    
    ExecutePipeline --> FetchRecord["Fetch Knowledge Entry from Database"]
    FetchRecord --> SelectLang{"Session Language?"}
    
    SelectLang -->|'ceb'| DeliverCeb["Deliver response['ceb'] Text<br/>(e.g., 'Para sa BukSU-CAT qualification...')"]
    SelectLang -->|'en'| DeliverEn["Deliver response['en'] Text<br/>(e.g., 'For BukSU-CAT qualification...')"]
```

---

## 🗺️ 3. Campus Map Navigation Request Flow

### Triggering Conditions:
1. **Spatial Keywords / Wh-Questions:** Queries containing *where is*, *asa dapit*, *location of*, *how to go to*, *directions to*.
2. **Facility / Office / Landmark Aliases:** Mention of specific campus rooms (e.g., *ComLab 1 to 12*, *Registrar Office*, *ATU*, *Clinic*, *Gymnasium*, *Library*, *Finance Building*, *ATM*).
3. **UI Quick-Reply Buttons:** Clicking `/direct_intent{"intent":"location_<Target>"}`.

```mermaid
flowchart TD
    UserNav["User Asks Location / Clicks Map Button<br/>(e.g., 'where is the University Clinic')"] --> ClassifyLoc{"Is Location Query / Payload?"}
    
    ClassifyLoc -->|Yes| ResolveAlias["Resolve Facility Name via aliases.py<br/>('clinic' -> 'Medical Clinic')"]
    ResolveAlias --> LookupCoords["Extract Coordinates [Y, X], Building, & Floor<br/>(e.g., [281, 654], Health Services Bldg, Ground Floor)"]
    
    LookupCoords --> GenRoutes{"Does Facility Have<br/>Defined Walking Route?"}
    GenRoutes -->|Yes| AttachRoute["Attach Polyline Waypoint Array [ [y1,x1], [y2,x2]... ]"]
    GenRoutes -->|No| AttachPin["Attach Static Point Pin [Y, X]"]
    
    AttachRoute --> BuildPayload["Build JSON Map Payload<br/>{mapId: 'main_map', coordinates: [281, 654], pins: [...], routes: [...]}"]
    AttachPin --> BuildPayload
    
    BuildPayload --> ClientRender["Frontend Map Engine (HTML5 Canvas / SVG)"]
    ClientRender --> PanZoom["1. Smooth Pan & Zoom to Target Building Coordinates"]
    PanZoom --> DropPin["2. Drop Animated Pulsing Pin Marker on Exact Room"]
    DropPin --> DrawPath["3. (If Route Present) Animate Glowing Wayfinding Path"]
    DrawPath --> DisplayText["4. Render Accompanying Office Hours & Text Guide in Chat"]
```

---

## 🛡️ 4. Multi-Level Fallback & Guardrail Flow

When a user query cannot be decisively answered or touches protected information, the system routes through multi-tier safety nets rather than hallucinating.

```mermaid
flowchart TD
    InQuery["Incoming User Query"] --> PrivacyCheck{"Personal Record Query?<br/>(My Grades, GPA, GWA, Tuition Balance)"}
    
    PrivacyCheck -->|Yes & Personal Pronoun| PrivacyGuard["🛡️ Privacy Guardrail Triggered<br/>'I cannot access personal student records or GPA. Please log in to your official SIAS student portal.'"]
    
    PrivacyCheck -->|No| ScopeCheck{"Out-of-Scope Query?<br/>(Malaybalay Weather, External Jeepney)"}
    ScopeCheck -->|Yes| OutOfScope["🚫 Out-of-Scope Notice<br/>'I only provide BukSU campus information. For city transit or weather, check official local advisories.'"]
    
    ScopeCheck -->|No| RunPipeline["Execute Tiers 1, 2, and 3"]
    RunPipeline --> RouteDecision{"Decision Result?"}
    
    RouteDecision -->|Matched In-Domain Intent| ReturnAnswer["Deliver Official Answer & Next Steps"]
    
    RouteDecision -->|Low Confidence / Zero Score| CategoryFallback["⚠️ Category Safety Net Fallback<br/>1. State: 'I couldn't find a matching answer in [Active Category].'<br/>2. Dynamically render Top 3 Related Topic Suggestion Buttons."]
    
    CategoryFallback --> UserSelects{"User Clicks a<br/>Suggested Topic?"}
    UserSelects -->|Clicks Button| DirectFulfill["Execute Tier 0 Direct Point Grab (0ms)"]
    UserSelects -->|Types Rephrase| InQuery
```

---

## 📊 5. Summary of Conversational Policies

| Flow Scenario | Trigger / Condition | System Behavior | User Output |
| :--- | :--- | :--- | :--- |
| **Bilingual Query (English)** | English grammar / tokens | Sets `lang = 'en'` | English response text & English button labels |
| **Bilingual Query (Bisaya)** | Cebuano keywords (`asa`, `unsa`, etc.) | Sets `lang = 'ceb'` | Natural Cebuano response text |
| **Location Query** | Spatial tokens or building alias | Extracts `[Y, X]` coords + route | Text directions + animated canvas map pin/path |
| **Ambiguous Query** | Margin $< 8.0$ between candidates | Groq LLaMA 3.3 selects intent | Exact official response for the chosen intent |
| **Out-of-Category Query** | Zero score in active domain | Category fallback safety net | In-domain notice + 3 dynamic suggestion chips |
| **Personal Data Query** | *"what is my grade / balance"* | Privacy guardrail regex | Advises student to check SIAS portal directly |
| **Out-of-Scope Query** | City weather, jeepney routes | External guardrail regex | Advises student that bot is campus-specific |
