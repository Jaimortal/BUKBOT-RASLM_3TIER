# Candidate v1 NLU experiment report

## Scope

This is an isolated NLU intent-classification experiment. It does not evaluate knowledge retrieval, routing to a final knowledge topic, factual correctness of replies, conversation context, or user satisfaction. The active dataset and active model were not replaced.

## Frozen data and model

| Item | Value |
|---|---:|
| Training examples | 943 |
| Validation examples | 158 |
| Final synthetic test examples | 150 |
| Candidate model SHA-256 | `aeea45878246b78b3376ef8b681916a6765396a04e441f3b75cb2628c2892daf` |
| Candidate model | `models/candidate.tar.gz` |

All split and source hashes are in `inputs.json`; the final-test freeze is in `frozen_candidate.json`.

## Validation comparison

Both models were evaluated against the same frozen 158-example validation split.

| Metric | Reference model | Candidate v1 | Difference |
|---|---:|---:|---:|
| Accuracy | 72.78% | 81.65% | +8.86 points |
| Macro F1 | 75.21% | 83.24% | +8.04 points |
| Weighted F1 | 73.32% | 80.95% | +7.63 points |

The comparison is recorded in [comparison.md](comparison.md) and the raw reports/errors are in `baseline/results/` and `validate/results/`.

## One-time final test result

The candidate was frozen before evaluating the separate 150-example test split.

| Metric | Result |
|---|---:|
| Accuracy | 74.67% |
| Macro F1 | 75.44% |
| Weighted F1 | 72.93% |

The final test is lower than validation, which is a useful warning against reporting the validation result as the final accuracy. The raw test report, confusion matrix, successful predictions and errors are in `test/results/`.

## Findings before any adoption

- `ask_availability` is the weakest final-test intent: 12.5% recall (1 of 8 examples).
- `ask_process` is also weak: 41.7% recall (5 of 12 examples).
- `ask_general_info` has 38.5% recall (5 of 13 examples), despite 100% precision for the few predictions made.
- Validation also showed regressions versus the reference model for `ask_facility_availability`, `ask_process`, `ask_fee`, and `ask_location`. These intent boundaries need targeted review.

Candidate v1 is therefore an experiment result, not a production-ready replacement. Its overall validation result improved, but the final synthetic test and weak critical intents do not yet support a strong real-world accuracy claim.

## Next dataset iteration

Use the 280-item development reserve and the validation error lists to add or relabel examples specifically at these boundaries:

1. Offered program/service (`ask_availability`) versus physical facility (`ask_facility_availability`).
2. Procedure (`ask_process`) versus record/form request (`ask_document`), payment (`ask_fee`), location, and contact.
3. Institutional fact/policy (`ask_general_info`) versus the other operational intents.

Keep a new, independently collected student-question test set separate from all development work. Then create a new run name and repeat the procedure in [the dataset runbook](../../../docs/datasets/nlu_review/TRAIN_AND_TEST.md). Before deployment, complete the documented end-to-end acceptance sheet with a school-data owner checking factual answers.
