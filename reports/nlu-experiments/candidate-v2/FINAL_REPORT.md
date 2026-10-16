# Candidate v2 NLU experiment report

## Scope

This is an isolated NLU intent-classification experiment. It does not evaluate knowledge retrieval, routing to a final knowledge topic, factual correctness of replies, conversation context, or user satisfaction. The active dataset and active model were not replaced.

## Frozen data and model

| Item | Value |
|---|---:|
| Training examples | 1,077 (+134 whole-group examples targeting weak boundaries) |
| Validation examples | 158 (Exact match to Candidate v1) |
| Final synthetic test examples | 150 (Exact match to Candidate v1) |
| Candidate model SHA-256 | `ad3f48f23e08f7608de7190acc83c6f6af94f624caccda3b0c065ce0936e0224` |
| Candidate model | `models/candidate.tar.gz` |

All split and source hashes are in `inputs.json`; the final-test freeze is in `frozen_candidate.json`. Validation and test data files are identical to Candidate v1, ensuring direct comparability without data leakage.

## Validation comparison

All models were evaluated against the exact same frozen 158-example validation split.

| Metric | Reference Model (Baseline) | Candidate v1 | Candidate v2 | Difference vs Baseline | Difference vs v1 |
|---|---:|---:|---:|---:|---:|
| Accuracy | 72.78% | 81.65% | **84.18%** | +11.40 points | +2.53 points |
| Macro F1 | 75.21% | 83.24% | **85.83%** | +10.62 points | +2.59 points |
| Weighted F1 | 73.32% | 80.95% | **84.13%** | +10.81 points | +3.18 points |

The comparison is recorded in [comparison.md](comparison.md) and the raw reports/errors are in `baseline/results/` and `validate/results/`.

## One-time final test result

The candidate was frozen before evaluating the separate 150-example test split.

| Metric | Reference Model | Candidate v1 | Candidate v2 | Difference vs v1 |
|---|---:|---:|---:|---:|
| Accuracy | — | 74.67% | **78.67%** | +4.00 points |
| Macro F1 | — | 75.44% | **80.24%** | +4.80 points |
| Weighted F1 | — | 72.93% | **78.04%** | +5.11 points |

The raw test report, confusion matrix, successful predictions, and errors are stored in `test/results/`.

## Boundary Analysis & Progress on Critical Intents

Candidate v2 specifically added training examples for the 4 weak boundaries identified in v1:

1. **`ask_process`**:
   - Validation Recall: improved from 42.9% to **57.1%** (F1: 0.52 -> **0.62**)
   - Final Test Recall: improved from 41.7% (5/12) to **66.7%** (8/12, F1: **0.67**)
2. **`ask_facility_availability`**:
   - Validation Recall: 44.4% (confused with location and availability)
   - Final Test Recall: improved from 87.5% to **100.0%** (8 of 8 correct, F1: **0.73**)
3. **`ask_general_info`**:
   - Validation Recall: improved from 54.5% to **81.8%** (F1: 0.71 -> **0.82**)
   - Final Test Recall: improved from 38.5% (5/13) to **46.2%** (6/13, F1: **0.57**)
4. **`ask_availability`**:
   - Validation Recall: 72.7% (F1: 0.67)
   - Final Test Recall: improved from 12.5% (1/8) to **25.0%** (2/8, F1: **0.33**)
   - *Finding*: While doubled, `ask_availability` remains the weakest intent on final test due to semantic overlap with `ask_facility_availability` (offered courses/services vs physical facilities).

5. **Other Intents**:
   - `ask_schedule`: 100% Validation F1, 80.0% Test F1
   - `ask_contact`: 96.0% Validation F1, 89.7% Test F1
   - `ask_document`: 78.6% Validation F1, 82.8% Test F1
   - `ask_fee`: 84.6% Validation F1, 86.7% Test F1
   - `ask_requirement`: 92.9% Validation F1, 66.7% Test F1
   - `set_category`, `reset_category`, `goodbye`, `ask_follow_up`: 100% Precision & Recall across validation and test.

## Status Before Any Production Adoption

Candidate v2 demonstrates substantial, measurable progress (+4.0% final test accuracy, +4.8% Macro F1, +25.0% process recall, 100% facility-availability recall). 

However, per deployment safeguards:
- **The live dataset (`rasa/data/nlu.yml`) and live active model (`rasa/models/20260825-010246-cheerful-van.tar.gz`) remain untouched and protected.**
- `ask_availability` (courses/services) vs `ask_facility_availability` (physical facilities) still shows boundary leakage on unseen data.
- Final test evaluation should be confirmed against fresh, independently collected student questions (outside synthetic candidate generation).
- Complete the full-chatbot acceptance check (action server routing, factual accuracy verification by school-data owners, multi-turn dialogue) prior to promoting any candidate to production.

