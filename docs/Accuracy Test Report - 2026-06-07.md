# Accuracy Test Report - 2026-06-07

## Scope

Tested 98 user questions covering:

- campus locations and facilities
- acronyms and office names
- enrollment and admission
- courses and programs
- general university information

## Baseline Live Result

The live Rasa REST endpoint answered all 98 messages with non-empty responses, but several were wrong-topic answers.

Examples found:

- Main campus question returned admission test steps.
- ATM question returned library study-place answer.
- Cashier question returned CAS course offerings.
- FTC/HRMO/PME questions returned CAT-related answers.
- Generic unknown location questions sometimes produced unrelated retrieval results.

## Fixes Applied

Updated routing:

- `rasa/actions/main_router.py`
  - location/map routing can now run when a known location alias is resolved, even if Rasa predicts a broad non-location intent.
  - unknown location-style questions now fallback instead of using weak retrieval guesses.
  - short standalone place names such as `guard house?` can route to map data.

- `rasa/actions/knowledge_router.py`
  - generic BukSU contact, calendar, office-hours, founding-anniversary, and masters questions now win before retrieval.
  - dental location wording can fall through to map data instead of dental consultation process text.
  - weak unresolved location questions are blocked from retrieval guessing.

- `rasa/actions/entity_resolver.py`
  - overlapping aliases now prefer the longest match, so `dental clinic` does not also trigger generic `clinic`.

Updated aliases:

- `rasa/actions/Magical Aliases/aliases.py`
  - added aliases for `dxul`, `main gate`, cashier desk/window wording, HRMO/HRMU, FTC, CBA, OSAS, president office in OB, administrative building, PME, and CIT.

Updated data:

- `rasa/actions/Supper Saiyan/University_info.json`
  - added official-source-backed records for:
    - BukSU contact number
    - university calendar
    - founding anniversary / charter-day style question
    - weekend visitor guidance
    - improved main campus location wording

## Official Sources Used

- BukSU Contact Us: https://buksu.edu.ph/contact-us/
- BukSU University Calendar 2025: https://buksu.edu.ph/university-calendar-2025/
- BukSU 102nd Founding Anniversary article: https://buksu.edu.ph/2026/06/01/buksu-president-mirasol-delivers-anniversary-message-that-celebrates-buksus-rich-102-year-history/
- BukSU HR Management Unit: https://buksu.edu.ph/human-resource-management/

## Validation

Passed:

- `python -m unittest discover -s test`
- `python -m py_compile` for modified action modules
- `python -m json.tool` for modified JSON
- `rasa data validate --config rasa/config.yml --domain rasa/domain.yml --data rasa/data`

Automated unit tests:

- 47 tests passed

## Post-Restart Estimate

Using live Rasa NLU parsing plus the updated local action router:

- Total tested: 98
- Answered: 86
- Honest fallback: 12
- Map payload expected: 31

Remaining fallbacks are mostly missing data/map records:

- ATM inside campus
- pool
- supply office
- COE building
- COM
- SC building
- international student application
- enrollment physical form
- pass notice wording
- change subject wording
- architecture course availability
- major in English wording

## Important Runtime Note

The running action server must be restarted before live REST tests reflect Python and alias changes.

Restart:

```powershell
rasa run actions
```

Then rerun the live batch through:

```powershell
http://localhost:5005/webhooks/rest/webhook
```

