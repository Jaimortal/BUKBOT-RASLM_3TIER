# candidate-v2 training-only iteration

This dataset adds 134 reviewed reserve examples from 57 whole groups to training for four documented weak intent boundaries. 120 of those records originated in the synthetic training source; the remaining group-mates move with them to prevent paraphrase leakage. Validation and test data are unchanged, so results remain comparable to candidate-v1.

| Split | Count |
|---|---:|
| Training | 1077 |
| Validation | 158 |
| Test | 150 |

Run the isolated workflow with:

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py prepare --run candidate-v2 --dataset-dir docs\datasets\nlu_review\iterations\candidate-v2`

Do not copy this file to `rasa/data/nlu.yml`.
