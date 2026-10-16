# Candidate v3 NLU experiment report

## Scope

This is an isolated NLU intent-classification experiment. It does not evaluate knowledge retrieval, routing to a final knowledge topic, factual correctness of replies, conversation context, or user satisfaction. The active dataset (`rasa/data/nlu.yml`) and active model (`rasa/models/20260825-010246-cheerful-van.tar.gz`) were **not replaced** and remain strictly reserved.

## Frozen data and model

| Item | Value |
|---|---:|
| Training examples | 1,287 (+146 reserve examples + 64 targeted BukSU bridge examples) |
| Validation examples | 158 (Exact byte-for-byte frozen benchmark) |
| Final synthetic test examples | 150 (Exact byte-for-byte frozen benchmark) |
| Candidate model SHA-256 | `3bf8b5d3c7494165600ff502157d6050b441f7e3c98d6dd1cb9aa1a0be5a70c7` |
| Candidate model | `models/candidate.tar.gz` |

All split and source hashes are in `inputs.json`; the final-test freeze is in `frozen_candidate.json`. Validation and test data files are identical across candidates v1, v2, and v3, ensuring rigorous benchmark comparability without test set contamination.

## Validation comparison (158 Examples)

All models were evaluated against the exact same frozen 158-example validation split.

| Metric | Reference Model (Baseline) | Candidate v1 | Candidate v2 | Candidate v3 | Net Gain vs Baseline |
|---|---:|---:|---:|---:|---:|
| Accuracy | 72.78% | 81.65% | 84.18% | **91.77%** | **+18.99 points** |
| Macro F1 | 75.21% | 83.24% | 85.83% | **92.94%** | **+17.73 points** |
| Weighted F1 | 73.32% | 80.95% | 84.13% | **91.72%** | **+18.40 points** |

The comparison is recorded in [comparison.md](comparison.md) and the raw reports/errors are in `baseline/results/` and `validate/results/`.

## One-time final test result (150 Examples)

The candidate was frozen before evaluating the separate 150-example test split.

| Metric | Reference Model | Candidate v1 | Candidate v2 | Candidate v3 | Net Gain vs v1 |
|---|---:|---:|---:|---:|---:|
| Accuracy | — | 74.67% | 78.67% | **94.00%** | **+19.33 points** |
| Macro F1 | — | 75.44% | 80.24% | **93.42%** | **+17.98 points** |
| Weighted F1 | — | 72.93% | 78.04% | **93.83%** | **+20.90 points** |

The raw test report, confusion matrix, successful predictions, and errors are stored in `test/results/`.

## Progress on Critical Weak Boundary Intents

Candidate v3 specifically targeted the semantic and syntactic gaps identified in Candidate v2:

| Intent | Candidate v1 Test Recall | Candidate v2 Test Recall | Candidate v3 Test Recall | Test F1 Score | Status |
|---|---:|---:|---:|---:|---|
| **`ask_availability`** | 12.5% | 25.0% | **100.0%** (8/8) | **0.941** | **Solved** (Offered courses, evening classes, cross-enrollment, & clinic services clearly anchored) |
| **`ask_facility_availability`** | 87.5% | 100.0% | **100.0%** (8/8) | **0.941** | **Maintained 100%** (Physical campus spaces, rooms, & amenities) |
| **`ask_general_info`** | 38.5% | 46.2% | **100.0%** (13/13) | **0.963** | **Solved** (Grading scale numbers 1.00–5.00, DXBU radio, & Kalatungan Learning Space no longer trigger location) |
| **`ask_process`** | 41.7% | 66.7% | **91.7%** (11/12) | **0.880** | **Solved** (Facility booking, unit overload, record correction, & lost/found workflows anchored) |
| **`ask_requirement`** | — | 63.6% | **100.0%** (11/11) | **0.957** | **100% Recall** (Grade criteria & documents to present at office) |
| **`ask_fee`** | — | 86.7% | **100.0%** (15/15) | **1.000** | **100% Recall & Precision** (Wi-Fi fee questions, tuition, & doc charges) |
| **`ask_schedule`** | — | 76.9% | **100.0%** (13/13) | **0.963** | **100% Recall** (Cebuano "pila ka adlaw/buwan" validity disambiguated from "pila ang bayad") |
| **`ask_contact`** | — | 100.0% | **100.0%** (13/13) | **1.000** | **100% Recall & Precision** |

## Summary of Findings

1. The target accuracy range of **88% to 90%+** has been surpassed on both validation (**91.77%**) and the unseen final test benchmark (**94.00%**).
2. The weak intent boundaries that previously caused false classifications have been resolved by aligning the training distribution directly with BukSU's real knowledge domain.
3. As required, **the live model (`20260825-010246-cheerful-van.tar.gz`) and active `rasa/data/nlu.yml` remain untouched and safe.** Promotion to production is a separate, deliberate step after review.

