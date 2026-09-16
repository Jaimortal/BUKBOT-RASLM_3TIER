# BukSU AI Chatbot — Use Case Diagram & Actor Specifications

---

## 👥 1. Actors Specification

The BukSU AI Chatbot system recognizes five primary user actors and administrative roles interacting with the platform:

| Actor | Category | Description | Primary Goals |
| :--- | :--- | :--- | :--- |
| **🎓 Enrolled Student** | Primary End-User | Currently enrolled undergraduate or graduate students at BukSU (Freshmen, Continuing, Transferee, Graduating). | Inquire about grades, retention policies, enrollment schedules, ID replacement, clearance procedures, classroom locations, and student organizations. |
| **📝 Prospective Applicant** | Primary End-User | Senior High School (SHS) graduating students, ALS passers, second-coursers, or applicants inquiring from outside BukSU. | Learn about BukSU-CAT entrance exams, application requirements, program cut-off scores (IT, Nursing, Education, etc.), and admission dates. |
| **👨‍🏫 Faculty & Staff** | Secondary User | University professors, instructors, department chairpersons, and administrative office personnel. | Quickly check institutional policies, calendar dates, office directory contacts, room allocations, and student referral steps. |
| **🚶 Visitor / Campus Guest** | Secondary User | Parents, alumni, guests, contractors, and visiting researchers on the BukSU Main Campus. | Find office locations, navigation walking directions, campus landmarks, visitor guidelines, and parking areas. |
| **🛠️ System Administrator** | Administrative User | Capstone developers, university IT administrators, or designated knowledge management personnel. | Manage knowledge graph topics, edit bilingual response data, test query accuracy, review conversation telemetry logs, and manage user privileges. |

---

## 🎨 2. Use Case Diagram

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

## 📋 3. Detailed Use Case Specifications & Relationships

### Use Case 1: Inquire Program CAT Scores & Cutoffs
* **Primary Actor:** Prospective Applicant / Student
* **Description:** User asks about minimum entrance exam ratings or cutoff criteria for specific academic programs (e.g., BSIT, BSEMC, BSFT, BSN Nursing, BSEd Education, Accountancy).
* **Includes:** `Language Detection` (Detects if question is English or Bisaya, e.g., *"unsa ang required cat sa it"* vs. *"what is the required cat for IT"*).
* **Postconditions:** System delivers official percentage ranges or ATU contact guidance, with interactive buttons for ATU location and department inquiries.

---

### Use Case 2: Search Campus Location & Request Map Wayfinding
* **Primary Actor:** Student / Visitor / Faculty
* **Description:** User asks where a university facility, laboratory, clinic, or office is situated (e.g., *"where is ComLab 3"*, *"asa dapit ang clinic"*).
* **Includes:** `Language Detection`.
* **Extends:** `Interact with Campus Map` (When a location response is triggered, the system automatically sends coordinate matrices `[Y, X]`, floor metadata, access points, and walking routes to the visual map canvas).

---

### Use Case 3: Process Ambiguous Query (LLM Disambiguation)
* **Primary Actor:** System (Automated Internal Mechanism)
* **Trigger:** A student types an informal or slang query where Tier 2 semantic scoring produces candidates with $< 8.0$ points margin.
* **Extends:** Extends all inquiry use cases (`Ask Admission`, `Ask Enrollment`, `Ask Services`).
* **Postconditions:** The guarded cloud LLM selects the correct intent from the approved candidate pool without modifying or hallucinating response text.

---

### Use Case 4: Category-Isolated Fallback
* **Primary Actor:** System (Automated Safety Mechanism)
* **Trigger:** A user asks a question with zero semantic score in the active category, or an out-of-domain query.
* **Extends:** Extends all inquiry use cases.
* **Postconditions:** Delivers a polite category-specific message and renders 3 dynamic clickable topic discovery buttons.

---

### Use Case 5: Manage Knowledge Base (Admin CMS)
* **Primary Actor:** System Administrator
* **Description:** Administrator logs into the web CMS to create, edit, or categorize university topics, update bilingual answers, configure metadata trigger phrases, and attach map pins.
* **Includes:** `Authenticate / Login to Admin Portal` (Requires valid administrator credentials and JWT session).
