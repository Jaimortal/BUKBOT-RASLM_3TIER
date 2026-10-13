"""Isolated Rasa experiment stages; never replaces the active model or NLU file.

Run with rasa/venv/Scripts/python.exe from the project root. All model paths are
explicit; validation and test data are never included in training input paths.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs/datasets/nlu_review"
RUNS = ROOT / "reports/nlu-experiments"


def digest(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def load(file):
    return json.loads(Path(file).read_text(encoding="utf-8"))


def save(file, value):
    Path(file).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def stamp():
    return datetime.now(timezone.utc).isoformat()


def run_command(command, folder):
    folder.mkdir(parents=True, exist_ok=False)
    save(folder / "command.json", {"argv": command, "cwd": str(ROOT), "started_utc": stamp()})
    with (folder / "console.log").open("w", encoding="utf-8") as log:
        process = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        for line in process.stdout:
            log.write(line)
            log.flush()
            print(line, end="", flush=True)
        code = process.wait()
    save(folder / "completion.json", {"exit_code": code, "finished_utc": stamp()})
    if code:
        raise RuntimeError(f"Command failed ({code}); see {folder / 'console.log'}")


def check_inputs(run):
    record = load(run / "inputs.json")
    for relative, expected in record["sha256"].items():
        if digest(run / relative) != expected:
            raise ValueError(f"Frozen input changed: {relative}. Prepare a new run.")
    return record


def prepare(run, data):
    if run.exists():
        raise ValueError(f"Run already exists: {run}. Use a new --run name.")
    # Read source files only. Do not silently regenerate/change a split here.
    manifest = load(data / "manifest.json")
    records = manifest["items"]
    for split in ("train", "validation", "test"):
        selected = [r for r in records if r["partition"] == split]
        if not selected:
            raise ValueError(f"Empty {split} split")
        if split != "train" and any(r["provenance"] == "existing_nlu" or r.get("development_exposed") for r in selected):
            raise ValueError("Development-exposed data in evaluation split")
    seen = {}
    for r in records:
        if r["partition"] not in ("train", "validation", "test"):
            continue
        if r["group_id"] in seen and seen[r["group_id"]] != r["partition"]:
            raise ValueError("A paraphrase group crosses splits")
        seen[r["group_id"]] = r["partition"]
    run.mkdir(parents=True)
    mapping = {
        "input/nlu.yml": data / "train.yml",
        "input/rules.yml": ROOT / "rasa/data/rules.yml",
        "input/stories.yml": ROOT / "rasa/data/stories.yml",
        "config.yml": ROOT / "rasa/config.yml",
        "domain.yml": ROOT / "rasa/domain.yml",
        "validation.yml": data / "validation.yml",
        "test.yml": data / "test.yml",
        "dataset_manifest.json": data / "manifest.json",
        "dataset_verification.json": data / "verification.json",
    }
    for relative, source in mapping.items():
        target = run / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    save(run / "inputs.json", {"prepared_utc": stamp(), "dataset_dir": str(data), "sha256": {p: digest(run / p) for p in mapping},
                              "scope": "Synthetic NLU experiment; not independent student end-to-end accuracy",
                              "python": sys.executable})
    run_command([sys.executable, "-m", "rasa", "data", "validate", "--domain", str(run / "domain.yml"),
                 "--data", str(run / "input"), "--config", str(run / "config.yml")], run / "preflight")
    print(f"Prepared {run}. Next: baseline --model <your baseline model.tar.gz>, then train.")


def model_file(value):
    if not value:
        raise ValueError("Provide --model with an explicit .tar.gz model path")
    file = Path(value).resolve()
    if not file.is_file() or not file.name.endswith(".tar.gz"):
        raise ValueError("Model must be an existing .tar.gz file, not a directory")
    return file


def evaluation(run, stage, model):
    check_inputs(run)
    split = "test" if stage == "test" else "validation"
    folder = run / stage
    if stage == "test":
        frozen = load(run / "frozen_candidate.json")
        if digest(model) != frozen["model_sha256"]:
            raise ValueError("Test model differs from frozen validated candidate")
    run_command([sys.executable, "-m", "rasa", "test", "nlu", "--model", str(model),
                 "--nlu", str(run / f"{split}.yml"), "--domain", str(run / "domain.yml"),
                 "--out", str(folder / "results"), "--successes"], folder)
    save(folder / "model.json", {"path": str(model), "sha256": digest(model), "split": split,
                                "input_sha256": digest(run / f"{split}.yml")})


def compare(run):
    check_inputs(run)
    metrics = {}
    for stage in ("baseline", "validate"):
        folder = run / stage
        if load(folder / "completion.json")["exit_code"] != 0:
            raise ValueError(f"{stage} did not succeed")
        report = load(folder / "results/intent_report.json")
        metrics[stage] = {"accuracy": report.get("accuracy"), "macro_f1": report.get("macro avg", {}).get("f1-score"),
                          "weighted_f1": report.get("weighted avg", {}).get("f1-score"),
                          "support": report.get("macro avg", {}).get("support"), "model": load(folder / "model.json")}
    if metrics["baseline"]["model"]["input_sha256"] != metrics["validate"]["model"]["input_sha256"]:
        raise ValueError("Evaluation datasets differ")
    save(run / "comparison.json", {"scope": "NLU classification only, not chatbot answer correctness", "metrics": metrics})
    lines = ["# Validation comparison", "", "NLU classification only; no claim of final-answer accuracy.", "",
             "| Metric | Baseline | Candidate |", "|---|---:|---:|"]
    for name in ("accuracy", "macro_f1", "weighted_f1", "support"):
        lines.append(f"| {name} | {metrics['baseline'][name]} | {metrics['validate'][name]} |")
    lines += ["", "Inspect per-intent and entity reports, confusion matrices and individual errors in both results folders.",
              "Before freezing, run the separate full-chatbot acceptance checks. No automatic promotion occurs."]
    (run / "comparison.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(run / "comparison.md")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=["prepare", "baseline", "train", "validate", "compare", "freeze", "test"])
    parser.add_argument("--run", default="candidate-v1")
    parser.add_argument("--model")
    parser.add_argument("--dataset-dir", default=str(DATA),
                        help="Prepared review dataset directory; defaults to docs/datasets/nlu_review")
    args = parser.parse_args()
    if not args.run or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in args.run):
        parser.error("--run must contain only letters, digits, hyphens or underscores")
    run = RUNS / args.run
    data = Path(args.dataset_dir).resolve()
    if not data.is_dir():
        parser.error("--dataset-dir must be an existing prepared dataset directory")
    if args.stage == "prepare":
        prepare(run, data)
        return
    check_inputs(run)
    if args.stage == "train":
        if load(run / "preflight/completion.json")["exit_code"] != 0:
            raise ValueError("Preflight must pass first")
        if not (run / "baseline/model.json").exists():
            raise ValueError("Run baseline evaluation first")
        run_command([sys.executable, "-m", "rasa", "train", "--config", str(run / "config.yml"),
                     "--domain", str(run / "domain.yml"), "--data", str(run / "input"),
                     "--out", str(run / "models"), "--fixed-model-name", "candidate", "--persist-nlu-data"], run / "training")
    elif args.stage in ("baseline", "validate", "test"):
        evaluation(run, args.stage, model_file(args.model))
    elif args.stage == "compare":
        compare(run)
    elif args.stage == "freeze":
        model = model_file(args.model)
        if (run / "frozen_candidate.json").exists():
            raise ValueError("Candidate already frozen. Use a new run for a new experiment.")
        validated = load(run / "validate/model.json")
        if digest(model) != validated["sha256"]:
            raise ValueError("Freeze the same model used for validation")
        if not (run / "comparison.json").exists():
            raise ValueError("Run compare and review its results before freezing")
        save(run / "frozen_candidate.json", {"model": str(model), "model_sha256": digest(model), "frozen_utc": stamp(),
                                           "note": "Explicit freeze command records the selected candidate; it does not certify accuracy."})
        print("Frozen. Next: test --model <same model>. The test stage refuses to overwrite an existing run.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
