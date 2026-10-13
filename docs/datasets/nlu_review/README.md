# NLU experiment dataset

Dataset preparation and boundary review completed on 2026-10-12. Ready for an isolated training experiment; no claim that model training, final testing or production adoption has occurred.

**Start with [TRAIN_AND_TEST.md](TRAIN_AND_TEST.md).** Do not replace the active rasa/data/nlu.yml.

## Prepared files

- [train.yml](train.yml): experiment training examples.
- [validation.yml](validation.yml): synthetic validation set.
- [test.yml](test.yml): synthetic test set, not independent student evaluation.
- Matching JSON files retain context, provenance, grouping and decisions.
- [manifest.csv](manifest.csv) / [manifest.json](manifest.json): every source record and its final disposition.
- [source/original_nlu.yml](source/original_nlu.yml): all 410 original examples, byte-for-byte.
- [LABEL_POLICY.md](LABEL_POLICY.md) and [REVIEW_NOTES.md](REVIEW_NOTES.md): applied labeling decisions and exclusions.
- challenge_cases.json, conversation_cases.json and functional_cases.json: separate development suites.
- [verification.json](verification.json): hashes, structural checks and counts.

## Actual distribution

70/15/15 remains a planning target, not an achieved result. Related groups and existing development exposure take priority over forcing percentages.

| Split | Count | Share |
|---|---:|---:|
| Training | 943 | 75.38% |
| Validation | 158 | 12.63% |
| Synthetic testing | 150 | 11.99% |
| Total | 1251 | 100% |

| Intent | Planning target | Training | Validation | Test | Actual total |
|---|---:|---:|---:|---:|---:|
| ask_location | 100 | 70 | 9 | 7 | 86 |
| ask_schedule | 100 | 70 | 15 | 13 | 98 |
| ask_fee | 100 | 70 | 13 | 15 | 98 |
| ask_requirement | 100 | 70 | 14 | 11 | 95 |
| ask_process | 100 | 70 | 14 | 12 | 96 |
| ask_general_info | 100 | 70 | 11 | 13 | 94 |
| ask_contact | 100 | 70 | 13 | 13 | 96 |
| ask_availability | 100 | 107 | 11 | 8 | 126 |
| ask_facility_availability | 100 | 99 | 9 | 8 | 116 |
| ask_document | 100 | 70 | 13 | 15 | 98 |
| ask_follow_up | 60 | 23 | 3 | 3 | 29 |
| smalltalk | 60 | 42 | 9 | 9 | 60 |
| goodbye | 40 | 28 | 6 | 6 | 40 |
| bot_challenge | 40 | 28 | 6 | 6 | 40 |
| set_category | 40 | 28 | 6 | 6 | 40 |
| reset_category | 40 | 28 | 6 | 5 | 39 |

Small per-intent sets provide imprecise estimates. Report support counts, macro F1, per-intent errors and entity results; do not claim that these counts establish real-world accuracy.

## Corrections and verification

- All originals accounted for: {"train":396,"duplicate":5,"challenge":3,"functional":6}. No source records silently lost.
- 324 unmatched Gemini source claims corrected to synthetic provenance.
- Explicit boundary decisions replace the initial blanket quarantine. The active dataset/router are unchanged.
- Slash commands, fallback challenges and ambiguous contextual cases are separate.
- Exact normalized duplicates, supplied families, entity-masked templates and Jaccard >= 0.8 groups are isolated. This is not proof that every semantic paraphrase has been identified.
- Original and prior-development groups are never treated as unseen evaluation data.
- Unresolved location references excluded. Other topic references are provenance, not verified answer ground truth.
- English/Cebuano/mixed examples were reviewed as engineering candidates, not independently certified language data.

## Rebuild

Run `node tools/prepare_nlu_review.cjs` from the project root. The inputs are source snapshots, current knowledge/domain files and tools/nlu_label_policy.cjs. No random split seed is used: selection follows deterministic source order and whole groups. Start a new experiment after any rebuild; existing experiment input hashes remain frozen.

Keep this folder outside Rasa's training paths. It contains validation/test/source files. Only the isolated experiment input folder should be passed to rasa train. Never run Gemini's old generator over these corrections.
