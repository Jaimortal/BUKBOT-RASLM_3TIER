# LLM Chatbot Rebuild Prompt

Use this prompt to recreate the BukSU assistance chatbot as a simpler LLM-based system. Do not use Rasa, NLU pipelines, or Rasa stories/rules. Use a local LLM, preferably `gemma3:1b`, as the language understanding layer, while all final answers must still come from official JSON data.

---

## Main Goal

Build a lightweight university assistance chatbot that answers student questions using structured JSON data. The chatbot must support:

- Text responses
- Multiple response bubbles from response arrays
- Choice buttons / suggestion buttons
- Image display
- Campus map display
- Pins and routes on map
- Basic admin editing for response text, images, map pins, and routes
- Local LLM understanding using `gemma3:1b`
- JSON-first knowledge base so I can add my own data files later

The LLM must not invent final answers. The LLM should only help interpret the user query, normalize messy wording, choose the best JSON record, and decide if clarification is needed.

---

## Required Tech Stack

Use a simple full-stack setup:

- Frontend: React + TypeScript
- Backend: Node.js/Express or Python/FastAPI
- Local LLM: Ollama with `gemma3:1b`
- Data storage: JSON files first
- Optional later database: SQLite/PostgreSQL
- Map display: Leaflet or a custom image-map viewer

Do not use Rasa. Do not mention Rasa in the implementation.

---

## Folder Structure

Create a clean structure like this:

```text
project-root/
  client/
    src/
      components/
        chat/
        map/
        admin/
      lib/
      pages/
  server/
    routes/
    services/
    utils/
  knowledge/
    responses.json
    locations.json
    admissions.json
    enrollment.json
    courses.json
    facilities.json
    library.json
    clinic.json
    ict.json
    oss_services.json
    custom/
  uploads/
    images/
    maps/
  docs/
```

`knowledge/custom/` must allow me to add new JSON files without editing core code.

---

## JSON Knowledge Format

All knowledge files should use one consistent structure. Support both parent topics and child rows.

Example:

```json
{
  "category": "Facilities Info",
  "records": [
    {
      "id": "library_facility_availability",
      "display_name": "Library Availability",
      "type": "answer",
      "language": ["en", "ceb"],
      "phrases": [
        "does BukSU have a library",
        "is there a library in BukSU",
        "naa bay library sa BukSU"
      ],
      "strong_keywords": ["library", "facility", "available", "naa"],
      "weak_keywords": ["BukSU", "campus", "student"],
      "responses": {
        "en": [
          "Yes, BukSU has a university library where students can study, access learning materials, and use library services.",
          "You can click the location button below if you want to know where the library is."
        ],
        "ceb": [
          "Oo, naa ang BukSU og university library para sa study area, learning materials, ug library services.",
          "Pwede nimo i-click ang location button sa ubos kung gusto nimo mahibaloan asa dapit ang library."
        ]
      },
      "buttons": [
        {
          "label": "Library location",
          "payload": "where is Library"
        }
      ],
      "images": [],
      "map": null,
      "children": []
    }
  ]
}
```

---

## Location JSON Format

Use this format for map/location data:

```json
{
  "category": "Locations",
  "records": [
    {
      "id": "library_location",
      "display_name": "Library Location",
      "aliases": ["library", "university library", "BukSU library"],
      "phrases": [
        "where is the library",
        "asa ang library",
        "how do I go to the library"
      ],
      "responses": {
        "en": [
          "The Library is located near the museum area. I will provide a map for your navigation."
        ],
        "ceb": [
          "Ang Library naa duol sa museum area. Maghatag ko og map para sa imong navigation."
        ]
      },
      "map": {
        "map_id": "main_map",
        "pins": [
          {
            "name": "You are here",
            "coordinates": [893, 632],
            "type": "start"
          },
          {
            "name": "Library",
            "coordinates": [500, 420],
            "type": "destination"
          }
        ],
        "routes": [
          {
            "name": "Route 1",
            "route_order": 1,
            "route_label": "Route 1",
            "color": "#ff1744",
            "points": [[893, 632], [700, 600], [500, 420]]
          }
        ]
      },
      "buttons": []
    }
  ]
}
```

---

## Child Row Format

Use child rows when one record contains searchable sub-data, such as course slots.

Example:

```json
{
  "id": "course_slots",
  "display_name": "Course Slots",
  "phrases": [
    "course slots",
    "slot left for courses",
    "available slots"
  ],
  "responses": {
    "en": ["Here are the current course slots available by college:"],
    "ceb": ["Mao ni ang current course slots nga available by college:"]
  },
  "children": [
    {
      "id": "bsit_slots",
      "display_name": "BSIT Slots",
      "aliases": ["bsit", "information technology", "IT"],
      "value": "Bachelor of Science in Information Technology: 2 slots"
    },
    {
      "id": "bsn_slots",
      "display_name": "BS Nursing Slots",
      "aliases": ["bsn", "nursing"],
      "value": "Bachelor of Science in Nursing: Please refer to the College of Nursing for slot information."
    }
  ]
}
```

If the user asks about the parent topic, show all children. If the user asks about a specific child, show only that child.

---

## LLM Role

The LLM must act as an interpreter and reranker only.

The LLM can:

- Correct typos
- Normalize Bisaya and English mixed questions
- Detect intent meaning
- Choose the best JSON record from candidates
- Ask for clarification when two or more records are genuinely close
- Select response language: English or Cebuano/Bisaya

The LLM must not:

- Create unsupported answers
- Invent dates, costs, office policies, or names
- Replace official JSON response text
- Ignore maps, images, or buttons from the selected JSON record

---

## Query Flow

Implement the message flow like this:

1. Receive user message.
2. Normalize text:
   - Lowercase for search only
   - Fix common typos
   - Normalize aliases like `buksu`, `BukSU`, `sias`, `COR`, `CAT`
   - Normalize common Bisaya words:
     - `asa`, `aha`, `hain`, `diin` -> where
     - `unsaon` -> how/process
     - `kanusa` -> when
     - `pila` -> how much
     - `naa bay` -> does it have / is there
3. Retrieve candidate records from all JSON files:
   - Match phrases
   - Match aliases
   - Match strong keywords
   - Match weak keywords
   - Match child rows
   - Match previous conversation context
4. Score candidates.
5. If one candidate is clearly best, use it.
6. If candidates are close, ask `gemma3:1b` to choose from the candidate list only.
7. If still ambiguous, send choice buttons.
8. Build final response from JSON only:
   - Text bubbles
   - Buttons
   - Images
   - Map pins/routes
9. Save short conversation memory:
   - Last selected topic
   - Last facility/location/course/service
   - Expire memory after a few minutes

---

## Retrieval Scoring Rules

Use deterministic scoring before asking the LLM.

Suggested scoring:

- Exact phrase match: +100
- Strong keyword match: +20 each
- Alias match: +40
- Child alias match: +50
- Weak keyword match: +5 each
- Context match: +15
- Wrong-purpose penalty: -50

Examples:

- `does BukSU have a library` should match facility availability, not location.
- `where is library` should match location, not facility availability.
- `how do I get library ID` should match library ID process, not student ID.
- `what if I did not pass CAT` should match affirmative action, not exam result.

---

## LLM Candidate Prompt

When using `gemma3:1b`, send a small prompt like this:

```text
You are a retrieval decision helper.
Choose the best official JSON record for the user question.
You must not create an answer.
Return only JSON.

User question:
{user_message}

Conversation context:
{last_topic}

Candidates:
1. id: library_facility_availability
   display_name: Library Availability
   category: Facilities Info
   matched_terms: library, have

2. id: library_location
   display_name: Library Location
   category: Locations
   matched_terms: library

Return:
{
  "selected_id": "id_here_or_null",
  "confidence": "high|medium|low",
  "needs_clarification": true_or_false,
  "clarification_labels": []
}
```

If the LLM returns anything unsupported, ignore it and fall back to deterministic retrieval.

---

## Chat UI Requirements

Build a chatbox with:

- User messages on the right
- Bot messages on the left
- Multiple bot response lines as separate bubbles
- Choice buttons outside the bubble
- Images outside the bubble
- Maps outside the bubble
- Timestamp below message group
- Optional report icon
- Optional audio icon

For multiple bot bubbles in one response:

- First bubble: rounded top-left, smaller lower-left
- Middle bubbles: less rounded on left side
- Last bubble: rounded bottom-left
- Keep small spacing between bot bubbles

Maps:

- Render map as a separate card, not inside a text bubble
- Show pins and routes
- Support route colors
- Show route labels in fullscreen
- Pause or simplify old map messages to reduce memory usage

Images:

- Render image attachments outside the text bubble
- Do not duplicate images below map

---

## Admin UI Requirements

Build a basic admin panel with:

- Knowledge Manager
- Locations / Map & Pins
- Settings

Knowledge Manager:

- Show all JSON records from `knowledge/`
- Show records by category
- Allow editing:
  - English responses
  - Cebuano responses
  - Buttons
  - Images
  - Map references
  - Pins/routes if the record has map data
- Do not expose critical internal fields by default:
  - `id`
  - scoring internals
  - route logic
- Admin should mostly edit existing data, not create complex new logic.

Allow custom JSON:

- Any JSON file added to `knowledge/custom/` should be loaded automatically.
- It must follow the same `category` + `records` format.
- Invalid JSON should not crash the server.
- Keep last good data if a JSON file is broken.

Image upload:

- Allow admin to upload image for a record.
- Store image path in the JSON record.
- Display it in the chatbot response.

Map editing:

- Allow admin to place pins.
- Allow admin to draw routes between pins.
- Save route color and route order.
- Pins should support types:
  - start
  - destination
  - staircase
  - elevator
  - office
  - facility

---

## API Endpoints

Create these backend endpoints:

```text
POST /api/chat
GET /api/knowledge
GET /api/knowledge/:id
PUT /api/knowledge/:id
POST /api/images/upload
GET /api/images/:id
GET /api/maps
PUT /api/maps/:id
GET /api/settings
PUT /api/settings
```

`POST /api/chat` input:

```json
{
  "message": "does BukSU have a library",
  "session_id": "user-session-id"
}
```

`POST /api/chat` output:

```json
{
  "messages": [
    {
      "type": "text",
      "text": "Yes, BukSU has a university library."
    },
    {
      "type": "text",
      "text": "You can click the location button below if you want to know where the library is."
    }
  ],
  "buttons": [
    {
      "label": "Library location",
      "payload": "where is Library"
    }
  ],
  "images": [],
  "map": null,
  "debug": {
    "selected_id": "library_facility_availability",
    "source_file": "facilities.json",
    "confidence": "high"
  }
}
```

Hide `debug` in production unless admin/debug mode is enabled.

---

## Basic Data To Include

Create starter JSON files for these data categories:

1. Admissions
   - Admission login
   - Admission forgot password
   - Admission result
   - CAT result checking
   - Affirmative Action Program
   - Change preferred course

2. Enrollment
   - Enrollment process
   - Enrollment requirements
   - COR download
   - COR validation
   - School year start

3. Courses
   - All courses
   - Board courses
   - Non-board courses
   - Course slots with child rows
   - Course cut-off / CAT percentage guidance

4. Student Services
   - Student ID
   - ID validation
   - PE uniform
   - Institutional email
   - SIAS login
   - SIAS forgot password

5. Facilities
   - Library availability
   - Museum availability
   - Clinic availability
   - Dental clinic availability
   - Gym availability
   - Cafeteria/canteen availability
   - ATM availability
   - Parking availability
   - Dormitory availability
   - Oval availability
   - Auditorium availability
   - Guidance office availability
   - Registrar office availability
   - Finance/cashier availability
   - ICT office availability
   - Admission office availability
   - Guard house availability

6. Locations
   - Library
   - Museum
   - Registrar
   - Admission office
   - Finance building
   - ICT office
   - Clinic
   - Dental clinic
   - DIU
   - OVPCASSS
   - University Press
   - Main buildings
   - Parking areas

---

## Custom JSON Support

I must be able to add a new JSON file like:

```text
knowledge/custom/my_new_data.json
```

Example:

```json
{
  "category": "My Custom Data",
  "records": [
    {
      "id": "custom_test_answer",
      "display_name": "Custom Test Answer",
      "phrases": [
        "sample question",
        "test custom data"
      ],
      "strong_keywords": ["sample", "custom"],
      "weak_keywords": ["test"],
      "responses": {
        "en": ["This is my custom answer."],
        "ceb": ["Kini ang akong custom answer."]
      },
      "buttons": [],
      "images": [],
      "map": null,
      "children": []
    }
  ]
}
```

The chatbot should load this automatically after restart or hot reload.

---

## Testing Requirements

Create test tools:

1. Retrieval QA tester
   - Generates natural messy questions from JSON phrases
   - Tests whether the selected record is correct
   - Produces Markdown and CSV reports

2. Gorilla chat tester
   - Sends many chat requests
   - Supports concurrency
   - Measures latency
   - Logs failures

3. Manual smoke test
   - Facility availability:
     - `does BukSU have a library?`
     - `is there a museum in BukSU?`
     - `naa bay clinic sa BukSU?`
   - Location:
     - `where is library?`
     - `asa ang museum?`
   - Ambiguous:
     - `how to validate?`
     - `student portal password`

---

## Important Rules

- The LLM is only a helper, not the source of truth.
- Final answers must come from JSON.
- If JSON has no answer, say the bot does not have data yet.
- Do not hallucinate school policies.
- Do not invent dates or requirements.
- Buttons must use payloads that the chatbot can route.
- Maps and images must follow the selected JSON record.
- Admin edits must not break the server.
- Invalid JSON must be safely rejected or ignored.

---

## Final Deliverable

Build a working chatbot system where:

- The user can ask messy English, Bisaya, or mixed questions.
- The LLM helps select the best official JSON answer.
- The response can include text, buttons, images, and map routes.
- The admin can edit response text, images, maps, pins, and routes.
- I can add more JSON files later without rewriting the system.

