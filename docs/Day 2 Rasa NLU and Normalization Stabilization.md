# Day 2 Rasa NLU and Normalization Stabilization

## Phase 1 - Broad Intent Cleanup

The Rasa NLU layer was kept focused on broad user purpose instead of topic-specific super intents.

Updated files:

- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/nlu.yml`

Changes made:

- Added `out_of_scope` to the active domain intents.
- Added an `out_of_scope` rule that routes to `action_main_router`.
- Added focused broad-intent examples for:
  - campus location and parking questions
  - admission and enrollment schedules
  - transferee, returning, online, and walk-in process questions
  - missing documents and enrollment document questions
  - admission result/pass notice questions
- No old super-intent routing was restored.
- No topic-specific intent explosion was added.

## Phase 2 - Query Normalization Hardening

The normalization layer was strengthened so messy student wording reaches structured retrieval in a cleaner form.

Updated file:

- `rasa/actions/query_normalizer.py`

Normalization coverage added:

- English typos:
  - `admision`, `admissiont`
  - `enrollmen`, `enrollmnt`, `enrolmen`
  - `vallidate`, `validte`, `validtion`
- Bisaya/search wording:
  - course availability questions using `unsa`, `pwedi`, `diris`, `enrollan`
  - admission result questions using `resulta`, `makita`, `lantaw`
- Acronyms and spaced acronyms:
  - `OVPCASSS`
  - `OSAS`
  - `CPAG`
  - `COT`, `CAS`, `COB`, `COE`, `CON`
  - `COA` normalized conservatively toward CPAG/Public Administration context

## Debugging Results

Python compile check passed:

```bash
python -m py_compile rasa/actions/query_normalizer.py rasa/actions/query_interpreter.py rasa/actions/knowledge_router.py
```

Normalizer behavior checks passed for:

- `transfered student enrollment`
- `admision application sched`
- `enrollmen process`
- `vallidate my id`
- `unsaon nako pag lantaws akong admissiont test result`
- `aha manako na makita akong result sa examination`
- `pwedi ko mangutanag unsa nga course pwedi ma enrollan diris buksu`
- `asa dapit ang COT`
- `where is OVPCASSS`

Rasa validation passed:

```bash
rasa data validate --config rasa/config.yml --domain rasa/domain.yml --data rasa/data
```

Validation showed dependency deprecation warnings from Rasa/TensorFlow packages, but no story structure conflicts were found.

## Before Day 3

Because Rasa NLU/domain/rules files changed, run:

```bash
rasa train
```

Then restart both:

```bash
rasa run actions
rasa run --enable-api --cors "*"
```

Recommended manual tests before Day 3:

- `admision application sched`
- `enrollmen process`
- `vallidate my id`
- `unsaon nako pag lantaws akong admissiont test result`
- `aha manako na makita akong result sa examination`
- `pwedi ko mangutanag unsa nga course pwedi ma enrollan diris buksu`
- `asa dapit ang COT`
- `where is OVPCASSS`
- `where can I park my motorcycle`
- `what is the weather today`
