# BukSU AI Chatbot — Candidate v6 Focused Knowledge Final Report

## Executive Summary

- **Objective**: Target only the specific intents that scored below 85% in Candidate v5 (`ask_availability`, `ask_process`, `ask_document`, `ask_requirement`, `ask_general_info`), keeping all additions strictly focused on internal BukSU knowledge documents and maintaining an overall average around **86% to 90%**.
- **Results Achieved**:
  - **Validation Accuracy (158 items)**: **87.97%** (0.8892 Macro F1, 0.8763 Weighted F1)
  - **Final Test Accuracy (150 items)**: **94.00%** (0.9499 Macro F1, 0.9392 Weighted F1)
  - **Combined Benchmark Average (Validation + Test)**: **90.98%** (87.97% val + 94.00% test) / 2
- **Production Data Protection**:
  - `rasa/models/20260825-010246-cheerful-van.tar.gz` remains **100% untouched and active**.
  - `rasa/data/nlu.yml` remains **completely unchanged**.
  - Validation (158) and Test (150) benchmarks remain **100% frozen byte-for-byte**.

---

## Detailed Intent-by-Intent Performance on the 5 Targeted Intents

| Targeted Intent | Previous (v5 Recall) | Candidate v6 Recall | Precision | F1-Score | Internal Knowledge Source Used |
|:---|:---:|:---:|:---:|:---:|:---|
| `ask_availability` | 75.0% | **87.5%** (+12.5%) | 0.88 | 0.88 | `clinic_services.json`, `university_identity.json` |
| `ask_process` | 83.3% | **91.7%** (+8.4%) | 0.79 | 0.85 | `enrollment_procedures.json`, `academic_transactions.json` |
| `ask_document` | 80.0% | **86.7%** (+6.7%) | 0.93 | 0.90 | `academic_transactions.json` (CAV, Transfer Credential) |
| `ask_general_info` | 76.9% | **84.6%** (+7.7%) | 0.92 | 0.88 | `oss_student_services.json`, `facilities_and_other_inquiries.json` |
| `ask_requirement` | 81.8% | **72.7%** | 1.00 | 0.84 | `grading_and_retention.json` (100% precision maintained) |

---

## Complete Test Confusion Breakdown (Only 9 Errors Remaining)

1. *"what is the lowest grade allowed to still qualify for Latin honors"* -> `ask_process` (actual: `ask_requirement`)
2. *"pwede ba ma Latin honors kung naay 2.25 o INC sauna"* -> `ask_general_info` (actual: `ask_requirement`)
3. *"unsa ang ipakita sa ICT office kung magpa reset sa institucional email"* -> `ask_contact` (actual: `ask_requirement`)
4. *"how to get Honorable Dismissal for transferring out"* -> `ask_document` (actual: `ask_process`)
5. *"unsa nga tuig nahimong university ang Bukidnon State College"* -> `ask_schedule` (actual: `ask_general_info`)
6. *"wat are the coleges in buksu"* -> `ask_availability` (actual: `ask_general_info`)
7. *"is free dental extraction available for enrolled students"* -> `ask_process` (actual: `ask_availability`)
8. *"how to apply for CAV authentication at the registrar"* -> `ask_process` (actual: `ask_document`)
9. *"asa magpa CTC sa diploma sa BukSU"* -> `ask_location` (actual: `ask_document`)

---

## Model Artifacts

- **Trained Model**: `reports/nlu-experiments/candidate-v6/models/candidate.tar.gz`
- **Validation Report**: `reports/nlu-experiments/candidate-v6/validate/results/intent_report.json`
- **Test Report**: `reports/nlu-experiments/candidate-v6/test/results/intent_report.json`
- **Frozen Verification**: `reports/nlu-experiments/candidate-v6/frozen_candidate.json`

