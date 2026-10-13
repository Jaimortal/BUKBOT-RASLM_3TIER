# Training and test procedure

This procedure protects the active project files and keeps final-test data out of training. The automated commands are implemented in `tools/nlu_experiment.py`.

## Completed preparation

The prepared data contains 943 training, 158 validation, and 150 synthetic test examples. This is a deterministic grouped split, not a random 70/15/15 claim. [verification.json](verification.json) records the checks and input hashes.

## Isolated experiment steps

Run these commands from the project root in PowerShell. Replace `RUN_NAME` for each new experiment.

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py prepare --run RUN_NAME`

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py baseline --run RUN_NAME --model rasa\models\YOUR_REFERENCE_MODEL.tar.gz`

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py train --run RUN_NAME`

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py validate --run RUN_NAME --model reports\nlu-experiments\RUN_NAME\models\candidate.tar.gz`

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py compare --run RUN_NAME`

Inspect `comparison.md`, both `intent_report.json` files, entity reports, and the individual intent errors. The validation comparison may support a candidate only when its improvement is meaningful overall and there is no unacceptable regression in critical intents. It is still NLU classification evidence, not answer-correctness evidence.

After recording the validation decision, freeze the candidate and run its one-time final test:

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py freeze --run RUN_NAME --model reports\nlu-experiments\RUN_NAME\models\candidate.tar.gz`

`& .\rasa\venv\Scripts\python.exe -B tools\nlu_experiment.py test --run RUN_NAME --model reports\nlu-experiments\RUN_NAME\models\candidate.tar.gz`

The test command rejects a changed model, changed split, or a second test run. Report final-test accuracy, macro F1, weighted F1, per-intent support, confusion/errors, and the data limitations stated in the README.

## Before any production adoption

Run a separate end-to-end acceptance sheet through the Rasa action server and the normal client. Include at least: routing to the intended knowledge topic, factual answer checked against the cited source, entity/alias resolution, multi-turn clarification, fallback for unsupported questions, and category/reset commands. Have an authorized school-data owner validate factual answers.

The candidate model remains at `reports/nlu-experiments/RUN_NAME/models/candidate.tar.gz`. Do not overwrite the active model or `rasa/data/nlu.yml` merely because the offline metrics improve. Promotion requires a deliberate deployment decision after the final test and acceptance checks.
