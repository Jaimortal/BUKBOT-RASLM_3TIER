"""Combine saved FAQ-gap API batches into a reviewable report without calling the bot."""

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import median


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "reports" / "full-knowledge-tests"
OUTPUT = ROOT / "docs" / "Testing" / "FULL TESTING TOPICS" / "result"
FALLBACK_MARKERS = (
    "i'm not sure i fully understand",
    "i’m not sure i fully understand",
    "sorry, i don't have",
    "sorry, i don’t have",
    "i don't have information",
    "i do not have information",
    "pasensya, wala koy",
    "pasensya, wala pa koy",
)


def percentile(values, percent):
    if not values:
        return 0
    ordered = sorted(values)
    index = (len(ordered) - 1) * percent / 100
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    return round(ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower), 2)


def load_batches(day):
    batches = {}
    for folder in sorted(RUNS.iterdir()):
        if not folder.is_dir() or not folder.name.startswith(day):
            continue
        manifest_file = folder / "manifest.json"
        if not manifest_file.exists():
            continue
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        config = manifest.get("config", {})
        section = config.get("only", "")
        if config.get("bank") == "gaps" and config.get("mode") == "api" and section.startswith("G"):
            batches[section] = folder
    return batches


def load_assessments():
    file = OUTPUT / "02FAQ_1.1_Assessments.json"
    if not file.exists():
        return {}
    return json.loads(file.read_text(encoding="utf-8"))


def assess(row, assessments):
    case_id = row["case_id"]
    if case_id in assessments:
        item = assessments[case_id]
        return item["outcome"], item.get("note", "")
    if row.get("status") in ("ERROR", "TIMEOUT", "API_ERROR") or not row.get("answer"):
        return "Error", "; ".join(row.get("notes") or []) or "No usable answer."
    answer = row["answer"].lower()
    if any(marker in answer for marker in FALLBACK_MARKERS):
        return "Fallback", "Generic or no-data fallback; verify whether a more useful referral was available."
    return "Needs review", "Substantive answer; verify against supported data before calling it correct."


def telemetry(start, end):
    samples = []
    performance_dir = ROOT / "reports" / "performance"
    for file in sorted(performance_dir.glob("resources-*.jsonl")):
        for line in file.read_text(encoding="utf-8").splitlines():
            try:
                item = json.loads(line)
                timestamp = datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")).timestamp()
            except (ValueError, KeyError):
                continue
            if start <= timestamp <= end:
                samples.append(item)
    if not samples:
        return {"samples": 0}
    def maximum(key):
        return max((item.get(key, 0) or 0 for item in samples), default=0)
    def process_peak(name, key):
        return round(max((item.get("processes", {}).get(name, {}).get(key, 0) or 0 for item in samples), default=0), 1)
    return {
        "samples": len(samples),
        "system_cpu_peak_percent": maximum("cpuPercent"),
        "system_ram_peak_mb": maximum("usedRamMb"),
        "system_ram_total_mb": maximum("totalRamMb"),
        "in_progress_peak": maximum("activeRequests"),
        "node_ram_peak_mb": process_peak("node", "ramMb"),
        "rasa_ram_peak_mb": process_peak("rasa", "ramMb"),
        "actions_ram_peak_mb": process_peak("actions", "ramMb"),
        "postgres_ram_peak_mb": process_peak("postgres", "ramMb"),
        "actions_cpu_peak_percent": process_peak("actions", "cpuPercent"),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", default=datetime.now().strftime("%Y%m%d"), help="Run folder date, YYYYMMDD")
    args = parser.parse_args()
    batches = load_batches(args.day)
    assessments = load_assessments()
    cases = []
    starts = []
    ends = []
    for index in range(1, 11):
        section = f"G{index:02d}"
        folder = batches.get(section)
        if not folder:
            continue
        journal = folder / "results.jsonl"
        if not journal.exists():
            continue
        starts.append(folder.stat().st_ctime)
        ends.append(journal.stat().st_mtime)
        for line in journal.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
            except ValueError:
                continue
            outcome, note = assess(row, assessments)
            cases.append({
                "case_id": row["case_id"], "section": section, "title": row.get("title", ""),
                "language": row.get("language", ""), "query": row["query"],
                "answer": row.get("answer", ""), "outcome": outcome,
                "source": "Rasa API delivered; LLM reranker use not observable per response",
                "latency_ms": row.get("latency_ms", 0), "note": note,
                "raw_status": row.get("status", ""), "run_folder": folder.name,
            })
    cases.sort(key=lambda row: row["case_id"])
    latencies = [row["latency_ms"] for row in cases]
    counts = Counter(row["outcome"] for row in cases)
    for outcome in ("Correct data", "Correct limitation/referral", "Partially supported", "Wrong data", "Fallback", "Error", "Needs review"):
        counts.setdefault(outcome, 0)
    start = min(starts) if starts else 0
    end = max(ends) if ends else 0
    summary = {
        "total": 200, "completed": len(cases), "batches": len(batches),
        "duration_seconds": round(end - start, 1) if starts else 0,
        "throughput_per_minute": round(len(cases) * 60 / (end - start), 2) if end > start else 0,
        "p50_ms": round(median(latencies), 2) if latencies else 0,
        "p95_ms": percentile(latencies, 95),
        "max_ms": max(latencies, default=0),
        "outcomes": dict(sorted(counts.items())),
        "resources": telemetry(start, end) if starts else {"samples": 0},
    }
    caveat = ("Rasa is the API delivery path, but this API does not expose whether the LLM "
              "reranker was used for a specific answer. Correctness is not inferred from "
              "HTTP 200 or the harness GAP_REVIEW status; unverified answers remain Needs review. "
              "Manual labels apply to this captured run and must be re-reviewed after a rerun.")
    report = {
        "title": "02 FAQ gaps live evaluation", "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "summary": summary, "caveat": caveat, "cases": cases,
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "02FAQ_1.1_Report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# 02FAQ 1.1 Report", "", f"Generated: {report['generated_at']}", "",
             "## Scope and results", "", f"- Completed: {len(cases)}/200, in {len(batches)}/10 batches",
             f"- Elapsed wall time: {summary['duration_seconds']} s",
             f"- Throughput: {summary['throughput_per_minute']} questions/minute across this sequential-batch run",
             f"- Response latency: median {summary['p50_ms']} ms; p95 {summary['p95_ms']} ms; max {summary['max_ms']} ms",
             "- Outcomes: " + ", ".join(f"{name} {count}" for name, count in summary["outcomes"].items()),
             "", "## Resource samples", "", "System RAM is whole-machine usage, not chatbot-only usage.", ""]
    resources = summary["resources"]
    for label, key in (("Samples", "samples"), ("Peak system CPU %", "system_cpu_peak_percent"),
                       ("Peak system RAM MB", "system_ram_peak_mb"), ("Peak active requests", "in_progress_peak"),
                       ("Peak Node RAM MB", "node_ram_peak_mb"), ("Peak Rasa RAM MB", "rasa_ram_peak_mb"),
                       ("Peak Actions RAM MB", "actions_ram_peak_mb"), ("Peak Postgres RAM MB", "postgres_ram_peak_mb")):
        lines.append(f"- {label}: {resources.get(key, 'not sampled')}")
    lines += ["", "## Attribution and assessment", "", caveat, "",
              "`Correct limitation/referral` means a useful supported limitation or referral, not an answer to an unknown policy.",
              "`Needs review` is deliberately not counted as correct or wrong.", "", "## Per-question results", ""]
    for row in cases:
        lines += [f"### {row['case_id']} | {row['outcome']} | {row['latency_ms']:.0f} ms", "",
                  f"- Section: {row['section']} - {row['title']}", f"- Query: {row['query']}",
                  f"- Response source: {row['source']}", f"- Assessment: {row['note']}",
                  "- Response:", "", "> " + (row["answer"] or "[No response]").replace("\n", "\n> "), ""]
    (OUTPUT / "02FAQ_1.1_Report.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(cases)} cases to {OUTPUT / '02FAQ_1.1_Report.md'}")


if __name__ == "__main__":
    main()
