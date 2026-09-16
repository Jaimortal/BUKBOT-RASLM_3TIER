# BukSU Campus Chatbot - Reviewed Alias Expansion List (v1.2)
**Document Path:** `docs/aliases new/aliases1.1s.md`  
**Generated Date:** September 16, 2026  
**Purpose:** Reviewed reference list of safe, conditional, and rejected location aliases for `aliases.py`.

> **Implementation status:** Do not copy the original v1.1 candidate list directly into
> `aliases.py`. Some entries below were already implemented, some point to nonexistent
> map records, and some broad words can redirect academic or service questions to a map.
> Implement only aliases marked **SAFE** after checking that the target still exists in
> `responses_location_core.json`.

---

## 0. September 16, 2026 Implementation Audit

### Decision

The v1.1 list should **not** be implemented as one bulk dictionary. The current production
dictionary already contains more than 2,500 aliases for approximately 239 location records.
Adding every possible sentence or single-word synonym would increase matching time and
create location overlaps. The alias matcher can already find a location phrase anywhere
inside a question, so aliases should describe the **place name**, not the entire question.

For example, adding `campus library` is useful. Adding `where can I find the campus library`
is unnecessary because the resolver will extract `campus library` from that sentence.

### Corrections to the v1.1 Draft

| Draft proposal | Review decision | Reason |
| :--- | :--- | :--- |
| `mahogany girls dorm` | **REJECT** | The core map identifies Mahogany as the male dorm. |
| `rubia boys dorm` | **REJECT** | Existing data identifies Rubia as the female dorm. |
| `gym` -> `Fitness Gym` | **REJECT** | `gym` currently means `Gymnasium`; Fitness Gym is a separate place. |
| `gate 1`, `gate 2`, `gym gate` -> `Guard House` | **REJECT** | The core JSON has no separate numbered-gate records. Do not claim they are the Guard House. |
| Registrar windows 1-5 -> releasing/evaluation targets | **REJECT** | Those proposed Registrar target names do not exist in the current core JSON. |
| Cashier windows 1-5 | **REJECT** | The mapped cashier record is `Window 03 Cashiers Office`; numbered 1-5 aliases would be inaccurate. |
| `coa sbo` -> `COA SBO Office (no data)` | **CONDITIONAL** | Existing aliases intentionally route the former COA name to CPAG SBO. Confirm the official naming before changing it. |
| `campus dorm`, `dormitoryo`, `dorm sa sulod` | **CLARIFY** | There are multiple dormitories; a generic phrase should show choices instead of selecting one. |
| `ict office`, `ict service` | **CLARIFY** | `ICT Service Unit` and `ictu office` are separate core records. |
| `library` -> `Library` | **KEEP CURRENT** | Production currently routes the generic term to `Library Building`, which includes map data. |
| `covered court`, `basketball court` -> `Fitness Gym` | **CONDITIONAL** | Confirm whether these names describe the Gymnasium, Fitness Gym, or another facility. |
| `ssc`, `usg`, `kaugmaon`, `gcu`, `ssu`, `gso` | **NO TARGET YET** | No matching canonical location record exists under those names. Add verified location data first. |

### SAFE: Verified Missing Alias Candidates

The targets in this section exist in the current core location JSON. These phrases are
specific enough to add without intentionally merging two known locations.

```python
SAFE_ALIAS_CANDIDATES = {
    # Library Building
    "campus library": "Library Building",
    "school library": "Library Building",
    "library bldg": "Library Building",
    "buksu library building": "Library Building",
    "university library building": "Library Building",
    "library sa buksu": "Library Building",

    # Museum
    "ip museum building": "Museum",
    "buksu ip museum": "Museum",
    "museum sa buksu": "Museum",
    "museyo sa buksu": "Museum",
    "campus museum building": "Museum",

    # Oval / Track and Field
    "running oval": "Oval",
    "athletic oval": "Oval",
    "sports oval": "Oval",
    "running track": "Oval",
    "track field": "Oval",
    "oval sa buksu": "Oval",

    # Gymnasium (not Fitness Gym)
    "buksu gymnasium": "Gymnasium",
    "main gymnasium": "Gymnasium",
    "gymnasium building": "Gymnasium",
    "gymnasium sa buksu": "Gymnasium",

    # Motorcycle and car parking
    "parkinganan sa motor": "Motorcycle Parking Area",
    "parkingan og motor": "Motorcycle Parking Area",
    "paradahan sa motor": "Motorcycle Parking Area",
    "motorcycle parking lot": "Motorcycle Parking Area",
    "student motorcycle parking": "Motorcycle Parking Area",
    "parkinganan sa sakyanan": "Car Parking Area",
    "butanganan sa sakyanan": "Car Parking Area",
    "paradahan sa sakyanan": "Car Parking Area",
    "car parking lot": "Car Parking Area",

    # Guard House
    "opisina sa gwardya": "Guard House",
    "estasyon sa gwardya": "Guard House",
    "guard station": "Guard House",
    "guard booth": "Guard House",
    "balay sa gwardya": "Guard House",

    # Comfort Room
    "cr lalaki": "Comfort Room",
    "cr babae": "Comfort Room",
    "male restroom": "Comfort Room",
    "female restroom": "Comfort Room",
    "mens restroom": "Comfort Room",
    "womens restroom": "Comfort Room",
    "pwd cr": "Comfort Room",
    "kasilyas sa buksu": "Comfort Room",

    # Cafeteria
    "kan-anan": "Cafeteria",
    "kaonan sa buksu": "Cafeteria",
    "kainan sa buksu": "Cafeteria",
    "palitanan ug pagkaon": "Cafeteria",
    "campus food hall": "Cafeteria",

    # Health services
    "dentista sa buksu": "Dental Clinic",
    "clinic sa dentista": "Dental Clinic",
    "dental office": "Dental Clinic",
    "ibtanan ug ngipon": "Dental Clinic",
    "ibtanay ug ngipon": "Dental Clinic",
    "tambalanan sa buksu": "Buksu Clinic",
    "school medical clinic": "Medical clinic",
    "campus medical clinic": "Medical clinic",

    # College of Nursing
    "cn bldg": "College of Nursing Building",
    "cn building": "College of Nursing Building",
    "nursing department bldg": "College of Nursing Building",
    "con college building": "College of Nursing Building",

    # ComLab abbreviations. Apply the numbered pattern from 1 through 12.
    "cl 1": "ComLab 1",
    "comp lab 1": "ComLab 1",
    "comp laboratory 1": "ComLab 1",
}
```

For ComLab, expand `cl N`, `comp lab N`, and `comp laboratory N` consistently for
numbers 1 through 12. Do not use unnumbered `cl`, `computer lab`, or `laboratory`, because
those terms cannot identify one specific room.

### REVIEWED: Additional Possible Alias Patterns

These patterns were not included in the original v1.1 list but are plausible student wording:

| Canonical target | Additional candidates |
| :--- | :--- |
| `Admission Office` | `admission and testing office`, `atu admission office`, `admissions unit`, `admission office sa buksu` |
| `Registrar Office` | `registrar office sa buksu`, `school registrar office`, `university registrar office`, `records registrar office` |
| `Medical clinic` | `medical clinic sa buksu`, `university health clinic`, `health services medical clinic` |
| `Dental Clinic` | `dental clinic sa buksu`, `university dental office`, `dentist clinic sa buksu` |
| `Motorcycle Parking Area` | `parking area sa motor`, `motor parking lot`, `student motor parking` |
| `Car Parking Area` | `parking area sa kotse`, `parking sa awto`, `car park sa buksu` |
| `Vehicle Parking Area` | `general vehicle parking`, `campus vehicle parking`, `parking for vehicles` |
| `university press` | `printing office sa buksu`, `school printing press`, `uniform claiming office` |
| `Conference Room A` | `admin conference room`, `conference room sa admin`, `meeting room a` |
| `College of Nursing Building` | `nursing college bldg`, `buksu nursing college`, `building sa con` |
| `CPAG building` | `college of pag bldg`, `public administration college building`, `building sa public administration` |

Before implementing an additional candidate, verify the exact canonical spelling in the
core JSON. For example, the live key is lowercase `university press`, while several other
canonical names use title case.

### CONDITIONAL: Requires a Choice or Verified Map Record

- Generic `dorm`, `campus dorm`, and `student dorm` should offer Mahogany, Rubia, and Kilala choices.
- Generic `guidance office` should offer Main Guidance, CAS Guidance, and CPAG Guidance choices.
- Generic `ICT office` should clarify between `ICT Service Unit` and `ictu office`.
- Generic `parking area` should offer motorcycle, car, and general vehicle parking choices.
- `gate 1`, `gate 2`, `Fortich gate`, and `gym gate` need their own verified map records before aliases are added.
- `SSC`, `USG`, `Kaugmaon`, `GCU`, `SSU`, and `GSO` need confirmed canonical records and locations first.
- Building-room phrases such as `CAS room 101` must not be guessed unless the building and room code correspond to a real JSON key.

### Room-Code Recommendation

Do not manually add every dotted room format as an alias. Support formats such as
`B.1.01`, `CPAG.2.01`, and `HS.2.01` in the room-code parser, then validate the generated
canonical code against the location JSON before responding. This provides broader coverage
with less alias-file growth and prevents invented room locations.

### Existing Draft Below

The remaining sections are retained as the original brainstorming inventory. They are not
approved for bulk implementation and must be evaluated using the decisions above.

---

## 1. Summary of Discrepancies & Casing Mismatches

This is the original inventory. Follow the corrected decisions in Section 0 before using any entry.

| Missing / Mismatched Key | Recommended Target in Core | Issue / Note |
| :--- | :--- | :--- |
| `mahogany dorm`, `mahogany dormitory`, `mahogany male dorm` | `Mahogany dorm` | Existing aliases resolve through the case-insensitive location lookup; do not add `girls dorm`. |
| `rubia dorm`, `rubia dormitory`, `rubia female dorm` | `Rubia dorm` | Existing aliases resolve through the case-insensitive location lookup; do not add `boys dorm`. |
| `coa sbo`, `coa sbo office`, `college of administration sbo` | Requires confirmation | Existing aliases map the former COA name to CPAG SBO; do not redirect to the no-data record without confirmation. |
| `library`, `buksu library`, `main library`, `campus library` | `Library Building` | Keep generic library wording on the map-enabled Library Building record. |
| `ictu`, `ictu office`, `ict office`, `ict service` | `ictu office` / `ICT Service Unit` | Duplicate target variants exist (`ICTU Office` vs `ictu office`). |

---

## 2. Administrative Offices, Windows & Service Desks

### Registrar Office & Windows
- `registrar window 1`
- `registrar window 2`
- `registrar window 3`
- `registrar window 4`
- `registrar window 5`
- `registrar window 6`
- `window 1 registrar`
- `window 2 registrar`
- `window 3 registrar`
- `window 4 registrar`
- `window 5 registrar`
- `ro window`
- `ro counter`
- `registrar releasing window`
- `registrar evaluation window`
- `transcript window`
- `tor releasing window`
- `enrollment window`
- `grades inquiry window`
- `records window`

### Cashier & Finance Windows
- `cashier window 1`
- `cashier window 2`
- `cashier window 3`
- `cashier window 4`
- `cashier window 5`
- `finance window 1`
- `finance window 2`
- `finance window 3`
- `finance window 4`
- `finance window 5`
- `bayad tuition`
- `bayadanan sa tuition`
- `bayranan`
- `payment window`
- `tuition payment counter`
- `assessment counter`
- `cashiers office`
- `cashiers booth`
- `finance assessment desk`

### Student Government, Publications & Organizations
- `ssc`
- `ssc office`
- `supreme student council`
- `supreme student council office`
- `usg`
- `usg office`
- `university student government`
- `student council room`
- `kaugmaon`
- `kaugmaon office`
- `kaugmaon publication`
- `student publication office`
- `school paper office`
- `student leadership office`
- `campus student council`

### Guidance, Health & Security Services
- `gcu`
- `guidance and counseling unit`
- `guidance office buksu`
- `counseling center`
- `guidance counselor`
- `ssu`
- `ssu office`
- `security services unit`
- `campus security office`
- `guard station`
- `security post`
- `gso`
- `general services office`
- `motorpool`
- `maintenance office`
- `property and supply office`
- `drrmo`
- `disaster risk reduction office`
- `safety and security unit`
- `alumni affairs`
- `alumni office`
- `alumni relations unit`

### Executive Offices
- `op`
- `office of the president`
- `buksu president office`
- `university president`
- `vpaa`
- `office of the vpaa`
- `vice president for academic affairs`
- `vp academic affairs`
- `vpa`
- `office of the vpa`
- `vice president for administration`
- `vp administration`
- `cao`
- `cao office`
- `chief administrative officer`
- `campus admin office`

---

## 3. Academic Buildings & Colleges (Acronyms & Common Variations)

| Target Building / College | Missing Aliases & Common Variations |
| :--- | :--- |
| **CAS Building / New CAS** | `cas bldg`, `cas building`, `college of arts and sciences building`, `new cas bldg`, `old cas bldg`, `cas main`, `cas complex` |
| **COT Building / New COT** | `cot bldg`, `cot building`, `college of technologies building`, `college of tech`, `cit bldg`, `college of information technology` |
| **COED Building** | `coed bldg`, `coed building`, `college of education building`, `educ bldg`, `education building`, `coe bldg` |
| **COB Building** | `cob bldg`, `cob building`, `college of business building`, `business bldg`, `cba bldg`, `college of business and accountancy` |
| **CON Building** | `con bldg`, `con building`, `college of nursing building`, `nursing bldg`, `cn bldg` |
| **CPAG Building** | `cpag bldg`, `cpag building`, `college of public administration building`, `public admin bldg` |
| **College of Law** | `law bldg`, `col bldg`, `law school building`, `college of law building` |
| **Graduate School** | `grad school bldg`, `gs bldg`, `graduate education bldg`, `postgrad bldg` |
| **Finance Building** | `finance bldg`, `accounting bldg`, `cashier bldg`, `business affairs bldg` |
| **Admin Building** | `admin bldg`, `old admin bldg`, `new admin bldg`, `executive bldg` |

---

## 4. Facilities, Student Spaces, Parking & Gates

### Sports, Recreation & Outdoors
- `gym`
- `buksu gym`
- `university gym`
- `buksu gymnasium`
- `covered court`
- `gym covered court`
- `basketball court`
- `oval`
- `buksu oval`
- `track and field`
- `running oval`
- `athletic oval`
- `sports oval`
- `dulaanan sa buksu`

### Food, Dining & Student Hangouts
- `canteen buksu`
- `main canteen buksu`
- `food court`
- `snack bar`
- `university food hall`
- `tambayan sa buksu`
- `kaonan`
- `kainan`

### Dormitories
- `mahogany male dorm`
- `mahogany dormitory`
- `rubia female dorm`
- `rubia dormitory`
- `campus dorm`
- `dormitoryo`
- `sulod nga boarding house`

### Campus Gates & Entrances
- `gate 1`
- `gate 2`
- `main entrance gate`
- `admin gate`
- `fortich gate`
- `gym gate`
- `exit gate`
- `pultahan sa buksu`
- `gawasang gate`

### Parking Areas
- `motor parking`
- `car parking`
- `faculty parking area`
- `student motorcycle parking`
- `parkingan sa motor`
- `parkingan sa sakyanan`
- `butanganan sa motor`

### Restrooms & Medical
- `cr lalaki` (Men's CR)
- `cr babae` (Women's CR)
- `male restroom`
- `female restroom`
- `pwd cr`
- `kasilyas`
- `kalibangan`
- `tambalanan sa buksu`
- `dentista sa buksu`
- `first aid station`
- `medical station`

---

## 5. Room Numbering, Lab & Dot-Separated Variations

### Standard Room Formats (Dotted & Prefixed)
- **Dotted format:** `b.1.01`, `b.2.04`, `b.3.01`, `c.1.2.01`, `c.2.2.04`, `hs.2.01`, `cpag.2.01`, `cpag.3.06`
- **"Rm" / "Classroom" prefixes:** `rm b-1-01`, `rm b-2-04`, `rm c-1-2-01`, `rm hs-2-01`, `classroom b-2-04`, `classroom c2-2-01`, `room b101`, `rm b101`
- **Building + Room syntax:** `cas rm 101`, `cas rm 204`, `cot rm 101`, `cot rm 201`, `bldg b rm 101`, `bldg c rm 201`

### Computer Laboratories (`ComLab 1` – `ComLab 12`)
- `cl 1`, `cl 2`, `cl 3`, `cl 4`, `cl 5`, `cl 6`, `cl 7`, `cl 8`, `cl 9`, `cl 10`, `cl 11`, `cl 12`
- `comp lab 1`, `comp lab 2`, `comp lab 3`, `comp lab 4`, `comp lab 5`, `comp lab 6`
- `computer lab 1`, `computer lab 2`, `computer lab 3`, `computer lab 4`, `computer lab 5`

### Specialized Laboratories
- `microbio lab`, `biotech lab`, `tissue culture lab`, `foodtech lab`, `food tech lab 1`, `electronics lab 1`, `el1`, `electronics lab 2`, `el2`, `speech lab`, `multimedia lab`

---

## 6. Colloquial Cebuano / Bisaya Campus Queries

| Cebuano / Bisaya Phrase | Corresponding Target Entity |
| :--- | :--- |
| `basahonon`, `tulunghaan sa libro` | `Library` |
| `bayadanan`, `bayad tuition`, `bayranan sa skwela` | `Cashier Window 1-5` / `Finance Building` |
| `enrolan`, `enrollan`, `kuhaan ug grado`, `evaluation sa grado` | `Registrar Office` / `Admission Office` |
| `tambalanan`, `adhaan kung hilanat`, `adhaan kung magsakit` | `Buksu Clinic` |
| `dentista`, `ibtanay ug ngipon` | `Dental Clinic` |
| `kaonan`, `kan-anan`, `palitanan ug pagkaon` | `Cafeteria` |
| `parkinganan sa motor`, `butanganan sa motor` | `Motorcycle Parking Area` |
| `parkinganan sa sakyanan`, `butanganan sa sakyanan` | `Car Parking Area` / `Vehicle Parking Area` |
| `kasilyas`, `kalibangan`, `pangi-an` | `Comfort Room` |
| `opisina sa gwardya`, `guardhouse`, `estasyon sa gwardya` | `Guard House` |
| `dulaanan`, `daganon`, `ovalanan` | `Oval` / `Fitness Gym` |
| `tulogan sa studyante`, `dorm sa sulod` | `Mahogany dorm` / `Rubia dorm` |

---

## 7. Implementation Reference

Use `SAFE_ALIAS_CANDIDATES` in Section 0 as the reviewed source. Do not bulk-copy the
brainstorming sections because they intentionally contain conditional possibilities that
still require location verification or a clarification-button design.
