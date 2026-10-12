# Corrected NLU review dataset

Prepared 2026-10-12. These files supersede the Gemini proposal, not the active chatbot. No retraining was performed.

## Where the splits are

- [train.yml](train.yml): proposed NLU training examples.
- [validation.yml](validation.yml): synthetic validation candidates.
- [test.yml](test.yml): synthetic test candidates; NOT an independent final student test.
- Matching JSON files contain IDs, provenance, context, grouping and review notes.
- [manifest.csv](manifest.csv) / [manifest.json](manifest.json): every original and retained generated record, including exclusions.
- [source/original_nlu.yml](source/original_nlu.yml): byte-for-byte original snapshot, all 410 examples preserved.
- [review_queue.json](review_queue.json): boundary conflicts, duplicates and whole groups exceeding targets.
- [challenge_cases.json](challenge_cases.json), [conversation_cases.json](conversation_cases.json), [functional_cases.json](functional_cases.json): separate development suites, excluded from NLU percentages.
- [verification.json](verification.json): automated checks, hashes, counts and limitations.

## Actual distribution

The intended ratio is 70/15/15; it is NOT claimed as achieved. Preserving source history and preventing group leakage take priority over filling quotas.

| Split | Count | Share |
|---|---:|---:|
| Training | 885 | 76.36% |
| Validation | 142 | 12.25% |
| Synthetic test | 132 | 11.39% |
| Total | 1159 | 100% |

| Intent | Planning target | Train | Validation | Test | Actual total | Shortfall |
|---|---:|---:|---:|---:|---:|---:|
| ask_location | 100 | 70 | 7 | 6 | 83 | 17 |
| ask_schedule | 100 | 70 | 14 | 12 | 96 | 4 |
| ask_fee | 100 | 70 | 12 | 14 | 96 | 4 |
| ask_requirement | 100 | 70 | 13 | 10 | 93 | 7 |
| ask_process | 100 | 70 | 14 | 12 | 96 | 4 |
| ask_general_info | 100 | 70 | 12 | 13 | 95 | 5 |
| ask_contact | 100 | 70 | 12 | 12 | 94 | 6 |
| ask_availability | 100 | 95 | 10 | 7 | 112 | 0 |
| ask_facility_availability | 100 | 94 | 8 | 7 | 109 | 0 |
| ask_document | 100 | 44 | 7 | 7 | 58 | 42 |
| ask_follow_up | 60 | 8 | 0 | 0 | 8 | 52 |
| smalltalk | 60 | 42 | 9 | 9 | 60 | 0 |
| goodbye | 40 | 28 | 6 | 6 | 40 | 0 |
| bot_challenge | 40 | 28 | 6 | 6 | 40 | 0 |
| set_category | 40 | 28 | 6 | 6 | 40 | 0 |
| reset_category | 40 | 28 | 6 | 5 | 39 | 1 |

These are planning shortfalls, not an instruction to pad examples. Collect new independently worded questions, especially for underrepresented validation/test intents. Report the real counts until sufficient reviewed data exists.

## Corrections made

- Imported the actual original YAML rather than Gemini's handwritten reconstruction. All 410 original rows are accounted for in the manifest/snapshot. Their dispositions: {"train":355,"review":42,"duplicate":4,"challenge":3,"functional":6}.
- Corrected 324 unmatched records falsely tagged existing_nlu to synthetic candidates. The original claim is retained for audit.
- Quarantined unresolved intent boundaries rather than silently applying a new taxonomy. No existing labels were silently rewritten. Excluded originals remain in the manifest.
- Moved fallback challenges and slash commands out of proposed NLU training. The original fallback/slash rows remain in their separate suites and baseline snapshot.
- Removed exact normalized duplicates from candidate splits and grouped shared source families, exact entity-masked templates and token-Jaccard matches >= 0.8 before splitting. This heuristic does not prove all semantic paraphrases are separated.
- Locked original, prior-training and exact knowledge-phrase groups to development/training. Source order is deterministic; no random seed is used. Whole groups over target go to reserve.
- Removed unverified expected-answer claims: claimed topics are retained as provenance, exact references checked against knowledge, but expected_topic_id is null until answer correctness is independently reviewed. Unknown location references are quarantined.
- Context-dependent cases are separated from standalone NLU cases. Language tags from Gemini are provisional; original language labels are not guessed.

## Review boundaries

Read review_queue.json reasons before approving training. Main unresolved boundaries are program availability versus general info, document requests versus procedures/requirements, and facility existence versus location/availability. Existing creator/capability questions retain their original labels; greetings are not silently reassigned to bot_challenge. Approval should follow the router's behavior, not just a keyword.

The NLU YAML evaluates broad intent/entity labels only. It does not establish final-answer accuracy or routing compatibility. Verify proposed labels and entity spans, have a fluent speaker review Cebuano/mixed wording, and independently approve expected answers for full-chatbot evaluation. Nothing here records a successful chatbot test.

## Reproduce and use safely

From the project root: `node tools/prepare_nlu_review.cjs`. This rebuilds only this review directory from source snapshots and current knowledge/domain files. Check verification.json hashes if inputs change. Do not run the old Gemini generator over the corrected artifacts.

Keep this folder outside Rasa training inputs. Do not pass the entire repository or this folder as training data: it also contains validation/test/source files. When a separate experiment is approved, pass only the chosen training file plus the intended rules/stories/domain/config. Do not overwrite rasa/data/nlu.yml until labels and integration regressions have been reviewed.
