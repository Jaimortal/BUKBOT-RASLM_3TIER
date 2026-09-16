"""Run the documentation question bank without changing chatbot implementation/data."""

import argparse
import csv
import hashlib
import html
import io
import json
import math
import multiprocessing as mp
import os
import random
import re
import sys
import time
import uuid
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib import request

ROOT = Path(__file__).resolve().parents[1]
BANK_DIR = ROOT / "docs/Testing/FULL TESTING TOPICS"
BANK_FILES = {
    "topics": BANK_DIR / "01 Topic Query Bank.md",
    "gaps": BANK_DIR / "02 Possible First-Year FAQ Gaps.md",
}
MATCHES = {"ROUTE_MATCH", "ANSWER_MATCH"}
FALLBACK_MARKERS = (
    "not sure i fully understand", "cannot understand your question",
    "couldn't find specific information", "could not find specific information",
    "try rephrasing", "wala koy nakit", "dili nako masabtan",
)


@dataclass
class Case:
    id: str
    query: str
    language: str
    section: str
    title: str
    category: str = ""
    source: str = ""
    pointer: str = ""
    expected_intent: str = ""
    expected_topic: str = ""
    bank: str = "topics"
    context: str = "open"
    expected_answers: dict = field(default_factory=dict)
    notes: list = field(default_factory=list)

    @property
    def run_id(self):
        return self.id + ":" + self.context


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True).encode()).hexdigest()


def normalize(text):
    text = html.unescape(re.sub(r"<[^>]*>", " ", str(text))).casefold()
    return " ".join(re.findall(r"\w+", text))


def answer_text(response):
    if isinstance(response, str):
        return response
    if isinstance(response, list):
        return "\n\n".join(filter(None, (answer_text(part) for part in response)))
    if isinstance(response, dict):
        # These are alternative encodings of the same answer, not extra bubbles.
        for key in ("answer", "textParts", "text"):
            if response.get(key):
                return answer_text(response[key])
    return ""


def attachment_summary(response):
    summary = {"suggestions": [], "images": [], "has_map": False}

    def visit(value):
        if isinstance(value, list):
            for item in value:
                visit(item)
        elif isinstance(value, dict):
            for key in ("mapData", "mapDataList"):
                summary["has_map"] |= bool(value.get(key))
            for key in ("image", "imageUrl", "imageUrls", "images"):
                item = value.get(key)
                if isinstance(item, str):
                    summary["images"].append(item)
                elif isinstance(item, list):
                    summary["images"].extend(item)
            for key in ("suggestions", "buttons", "follow_up"):
                if isinstance(value.get(key), list):
                    summary["suggestions"].extend(value[key])
            for group in value.get("choiceGroups") or []:
                if isinstance(group, dict):
                    summary["suggestions"].extend(group.get("items") or [])
            if isinstance(value.get("custom"), dict):
                visit(value["custom"])

    visit(response)
    return summary


def resolve_pointer(document, pointer):
    current = document
    for part in pointer.strip("/").split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def load_bank(path, bank, knowledge_root=None):
    knowledge_root = knowledge_root or ROOT / "rasa/actions/knowledge"
    cases, sections, seen = [], {}, set()
    section = None
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        match = re.match(r"^#{2,3} ([KG]\d+) - (.+)$", line)
        if match:
            section = {"section": match[1], "title": match[2], "bank": bank}
            if match[1] in sections:
                raise ValueError("Repeated section: " + match[1])
            sections[match[1]] = section
            continue
        if section is None:
            continue
        match = re.match(r"^Source: \[([^]]+)\].*pointer `([^`]+)`", line)
        if match:
            section.update(source=match[1], pointer=match[2], category=match[1].split("/")[0])
        match = re.match(r"^Topic: `([^`]+)`\. Intent: `([^`]+)`", line)
        if match:
            section.update(expected_topic=match[1], expected_intent=match[2])
        match = re.match(r"^- ([KG]\d+)-(EN|CEB)-(\d{2}): (.+)$", line)
        if match:
            case_id = "-".join(match.groups()[:3])
            if match[1] != section["section"] or case_id in seen:
                raise ValueError("Invalid/repeated case ID: " + case_id)
            seen.add(case_id)
            cases.append(Case(id=case_id, query=match[4], language=match[2].lower(), **section))
    if not cases:
        raise ValueError("No question-bank cases found in " + str(path))
    counts = Counter((c.section, c.language) for c in cases)
    for section_id in sections:
        for language in ("en", "ceb"):
            if counts[section_id, language] != 10:
                raise ValueError(f"{section_id}: expected 10 {language} queries")

    documents = {}
    for case in cases:
        if bank == "gaps":
            case.notes.append("Missing-detail test: a human must assess the limitation/referral.")
            continue
        if not case.source or not case.pointer or not case.expected_intent:
            raise ValueError("Missing expected metadata for " + case.id)
        target = (knowledge_root / case.source).resolve()
        if not target.is_relative_to(knowledge_root.resolve()) or case.category == "location":
            raise ValueError("Invalid/excluded source: " + case.source)
        if target not in documents:
            documents[target] = json.loads(target.read_text(encoding="utf-8-sig"))
        node = resolve_pointer(documents[target], case.pointer)
        if "/items/" in case.pointer or "/itemGroups/" in case.pointer:
            case.notes.append("Child-row test: verify requested row/group, zero vs unknown, and scope manually.")
            continue
        if node.get("topic") != case.expected_topic or node.get("intent") != case.expected_intent:
            raise ValueError(f"Bank reference changed: {case.id} at {case.source}{case.pointer}")
        case.expected_answers = node.get("responses") or {}
        if not case.expected_answers:
            raise ValueError("Source has no response: " + case.id)
        if node.get("items"):
            case.notes.append("Dynamic list: verify selected rows and available-slot filtering manually.")
    return cases


def select_cases(cases, suite="quick", only="", language="both", context="open", shuffle=False, seed=7, maximum=0):
    selected = []
    for case in cases:
        if suite == "quick" and not case.id.endswith("-01"):
            continue
        if language != "both" and case.language != language:
            continue
        if only and only.casefold() not in " ".join((case.source, case.title, case.section, case.expected_intent)).casefold():
            continue
        for mode in (("open", "category") if context == "both" else (context,)):
            if mode == "category" and not case.category:
                continue
            selected.append(Case(**{**asdict(case), "context": mode}))
    selected.sort(key=lambda c: c.run_id)
    if shuffle:
        random.Random(seed).shuffle(selected)
    return selected[:maximum] if maximum else selected


def job_for(case):
    # Expected topic, answer and test language never enter the router or API request.
    return {"query": case.query, "category": case.category if case.context == "category" else None}


def router_worker(connection, llm_enabled):
    sys.dont_write_bytecode = True
    os.environ["RASA_LLM_RERANKER_ENABLED"] = "true" if llm_enabled else "false"
    sys.path.insert(0, str(ROOT / "rasa/actions"))
    try:
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            from actions import ActionReplyFromJsonHelper, LOCATION_ALIASES
            from main_router import MainRouterService
            router = MainRouterService(ActionReplyFromJsonHelper(), LOCATION_ALIASES)
        connection.send({"ready": True})
    except Exception as exc:
        connection.send({"error": f"Router startup failed: {type(exc).__name__}: {exc}"})
        connection.close()
        return
    while True:
        try:
            job = connection.recv()
        except EOFError:
            break
        if job is None:
            break
        output = io.StringIO()
        started = time.perf_counter()
        try:
            # Reset diagnostic fields only; never carry a previous query's selection into a result.
            router.knowledge_router.last_selected_intent = None
            router.knowledge_router.last_answering_source = None
            slots = {"active_category": job["category"]} if job["category"] else {}
            with redirect_stdout(output), redirect_stderr(output):
                response, updated = router.route_with_context(
                    "ask_knowledge", {"text": job["query"], "entities": []}, job["query"], slots,
                )
            result = {
                "response": response,
                "actual_intent": updated.get("conversation_last_intent") or router.knowledge_router.last_selected_intent or "",
                "resolver": router.knowledge_router.last_answering_source or "unreported",
                "slots": updated,
            }
        except Exception as exc:
            result = {"error": f"{type(exc).__name__}: {exc}"}
        result.update(latency_ms=round((time.perf_counter() - started) * 1000, 2), trace=output.getvalue()[-16000:])
        connection.send(result)
    connection.close()


class LocalRunner:
    def __init__(self, llm_enabled=False, timeout=30, startup_timeout=90):
        self.llm_enabled, self.timeout, self.startup_timeout = llm_enabled, timeout, startup_timeout
        self.process = self.connection = None

    def start(self):
        parent, child = mp.get_context("spawn").Pipe()
        self.connection = parent
        self.process = mp.get_context("spawn").Process(target=router_worker, args=(child, self.llm_enabled))
        self.process.start()
        child.close()
        if not parent.poll(self.startup_timeout):
            self.close()
            raise RuntimeError("Router startup timed out")
        try:
            ready = parent.recv()
        except EOFError as exc:
            self.close()
            raise RuntimeError("Router worker exited during startup") from exc
        if ready.get("error"):
            self.close()
            raise RuntimeError(ready["error"])

    def run(self, job):
        if self.process is None:
            self.start()
        self.connection.send(job)
        if not self.connection.poll(self.timeout):
            self.close()
            return {"error": "Router query timed out", "latency_ms": self.timeout * 1000}
        try:
            return self.connection.recv()
        except EOFError:
            self.close()
            return {"error": "Router worker exited unexpectedly"}

    def close(self):
        if self.process is not None:
            if self.process.is_alive():
                self.process.terminate()
            self.process.join(timeout=5)
            if self.process.is_alive():
                self.process.kill()
                self.process.join()
            self.connection.close()
        self.process = self.connection = None


def call_api(job, url, timeout):
    payload = {"intent": job["query"], "sessionId": "fullqa_" + uuid.uuid4().hex}
    if job["category"]:
        payload["activeCategory"] = job["category"]
    started = time.perf_counter()
    try:
        req = request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
        with request.urlopen(req, timeout=timeout) as result:
            response = json.load(result)
        # The current Express API does not expose a trustworthy selected-topic field.
        return {"response": response, "actual_intent": "", "resolver": "API: topic not exposed",
                "session_id": payload["sessionId"], "latency_ms": round((time.perf_counter() - started) * 1000, 2)}
    except Exception as exc:
        return {"error": f"{type(exc).__name__}: {exc}", "session_id": payload["sessionId"],
                "latency_ms": round((time.perf_counter() - started) * 1000, 2)}


def grade(case, observation):
    text = answer_text(observation.get("response"))
    actual = observation.get("actual_intent") or ""
    norm = normalize(text)
    notes = list(case.notes)
    media = attachment_summary(observation.get("response"))
    expected = {lang: normalize(answer_text(value)) for lang, value in case.expected_answers.items()}
    text_match = bool(norm and norm in expected.values())
    wrong_language = case.language == "ceb" and expected.get("ceb") and expected.get("ceb") != expected.get("en") and norm == expected.get("en")
    if wrong_language:
        notes.append("Exact English source answer returned for a Bisaya case.")
    fallback = actual == "nlu_fallback" or any(normalize(marker) in norm for marker in FALLBACK_MARKERS)
    clarify = "clarification" in actual or any(term in norm for term in ("do you mean", "which student portal", "can you clarify", "unsa nga", "which id do you mean"))
    if observation.get("error"):
        status = "ERROR"
    elif case.bank == "gaps":
        status = "GAP_REVIEW" if text or media["suggestions"] else "EMPTY_RESPONSE"
    elif case.expected_intent == "nlu_fallback":
        status = "FALLBACK_REVIEW"
        notes.append("Ambiguous/noise case: manually assess whether clarification or fallback is appropriate.")
    elif not text:
        status = "CLARIFICATION_REVIEW" if media["suggestions"] else "EMPTY_RESPONSE"
    elif "/items/" in case.pointer or "/itemGroups/" in case.pointer:
        status = "CHILD_ROW_REVIEW"
    elif wrong_language:
        status = "LANGUAGE_MISMATCH"
    elif fallback and not text_match:
        status = "FALLBACK_REVIEW"
    elif clarify and not text_match:
        status = "CLARIFICATION_REVIEW"
    elif text_match:
        status = "ANSWER_MATCH"
    elif actual == case.expected_intent:
        status = "ROUTE_MATCH"
        notes.append("Topic ID matches; answer completeness and factual accuracy still need review.")
    elif actual and not actual.startswith("__"):
        status = "TOPIC_MISMATCH_REVIEW"
        notes.append("Different ID; review possible equivalent records before treating this as a bug.")
    else:
        status = "ANSWER_REVIEW"
    return {"run_id": case.run_id, "case_id": case.id, "section": case.section, "title": case.title,
            "query": case.query, "language": case.language, "category": case.category, "context": case.context,
            "bank": case.bank, "source": case.source, "pointer": case.pointer,
            "expected_intent": case.expected_intent, "expected_answers": case.expected_answers,
            "status": status, "answer": text, "notes": notes, **media, **observation}


def runtime_snapshot():
    paths = list((ROOT / "rasa/actions").rglob("*")) + list((ROOT / "rasa/data").rglob("*"))
    paths += list((ROOT / "rasa").glob("*.yml"))
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)
            if p.is_file() and p.suffix in {".py", ".json", ".yml", ".yaml"} and "__pycache__" not in p.parts}


def read_results(path):
    results = {}
    if not path.exists():
        return results
    with path.open("rb") as handle:
        for index, line in enumerate(handle):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except (json.JSONDecodeError, UnicodeDecodeError):
                if handle.tell() == path.stat().st_size and not line.endswith(b"\n"):
                    print("Ignoring interrupted final journal line; its case will be retried.")
                    break
                raise ValueError("Corrupt result journal at line " + str(index + 1))
            if row["run_id"] in results:
                raise ValueError("Repeated result ID in journal: " + row["run_id"])
            results[row["run_id"]] = compact_result(row)
    return results


def compact_result(row):
    # Full payloads remain on disk; keeping maps/traces for 10,000 cases in RAM is unnecessary.
    return {key: value for key, value in row.items() if key not in {"response", "trace", "expected_answers", "slots"}}


def repair_journal_tail(path):
    if not path.exists():
        return
    with path.open("rb+") as handle:
        while True:
            offset = handle.tell()
            line = handle.readline()
            if not line:
                break
            if not line.endswith(b"\n"):
                try:
                    json.loads(line)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    handle.truncate(offset)
                else:
                    handle.write(b"\n")
                break


def csv_cell(value):
    value = str(value or "")
    return "'" + value if value.startswith(("=", "+", "-", "@")) else value


def write_reports(folder, results, planned, elapsed, changed, interrupted):
    rows = list(results.values())
    fields = ["run_id", "status", "category", "context", "language", "query", "expected_intent", "actual_intent", "answer", "latency_ms", "resolver", "source", "pointer", "notes", "error"]
    with (folder / "results.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: csv_cell(json.dumps(row[key], ensure_ascii=False) if isinstance(row.get(key), (dict, list)) else row.get(key, "")) for key in fields})
    counts = Counter(row["status"] for row in rows)
    by_group = defaultdict(Counter)
    for row in rows:
        by_group[(row["category"] or "gaps", row["language"], row["context"])][row["status"]] += 1
    latencies = sorted(row["latency_ms"] for row in rows if isinstance(row.get("latency_ms"), (int, float)))
    p95 = latencies[math.ceil(len(latencies) * .95) - 1] if latencies else 0
    report = ["# Full Knowledge Test Report", "", f"Completed: {len(rows)} / {planned}",
              f"This invocation: {elapsed:.1f}s. Interrupted: {interrupted}.",
              f"Observed p95 per-query latency: {p95:.1f} ms (router initialization excluded).", "",
              "This is a routing/answer-match audit, NOT a verified semantic accuracy percentage.",
              "ANSWER_MATCH compares full normalized answer text with the source. ROUTE_MATCH checks the selected ID only.",
              "Flags, duplicates, policy conflicts, gap cases, dynamic lists, language and attachments need human review.",
              "API responses do not expose selected topic IDs; no topic is guessed from a button or an echoed query.", "",
              "## Statuses", "", "| Status | Count |", "| --- | ---: |"]
    report += [f"| {status} | {count} |" for status, count in sorted(counts.items())]
    report += ["", "## Category / Language / Context", "", "| Category | Language | Context | Matches | Review/errors |", "| --- | --- | --- | ---: | ---: |"]
    for (category, language, context), counter in sorted(by_group.items()):
        matched = sum(counter[s] for s in MATCHES)
        report.append(f"| {category} | {language} | {context} | {matched} | {sum(counter.values()) - matched} |")
    report += ["", "## File Integrity", "", "Changed runtime/source files: " + (", ".join(changed) if changed else "none detected"),
               "", "## Review Samples", "", "All answers, response payloads and local traces are in results.jsonl. CSV contains all questions and answers.", ""]
    flagged = [row for row in rows if row["status"] not in MATCHES]
    for row in flagged[:30]:
        report += [f"### {row['run_id']} - {row['status']}", "", "Query: " + row["query"],
                   "", f"Expected: `{row['expected_intent'] or 'supported limitation/referral'}`; observed: `{row.get('actual_intent') or 'not exposed'}`.",
                   "", "Response:", ""]
        report += ["> " + line for line in (row["answer"] or row.get("error") or "(empty)").splitlines()]
        report += [""]
    (folder / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    (folder / "flagged_ids.json").write_text(json.dumps([r["run_id"] for r in flagged], indent=2), encoding="utf-8")
    return counts


def arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("router", "api"), default="router")
    parser.add_argument("--bank", choices=("topics", "gaps", "both"), default="topics")
    parser.add_argument("--suite", choices=("quick", "full"), default="quick")
    parser.add_argument("--context", choices=("open", "category", "both"), default="open")
    parser.add_argument("--only", default="", help="Filter by file/category/title/section/expected intent.")
    parser.add_argument("--language", choices=("both", "en", "ceb"), default="both")
    parser.add_argument("--max-tests", type=int, default=0)
    parser.add_argument("--shuffle", action="store_true")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--llm", choices=("off", "on"), default="off", help="Local tester process only; API uses server settings.")
    parser.add_argument("--url", default="http://127.0.0.1:5000/api/chat")
    parser.add_argument("--concurrency", type=int, default=2, help="API only; local router runs sequentially.")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--startup-timeout", type=float, default=90)
    parser.add_argument("--out-dir", type=Path, default=ROOT / "reports/full-knowledge-tests")
    parser.add_argument("--resume", type=Path, help="Resume a run folder with identical configuration and file hashes.")
    parser.add_argument("--rerun-flagged", type=Path, help="Run IDs needing review from an earlier run folder.")
    parser.add_argument("--list-only", action="store_true", help="Validate/count selected cases; no router or API calls.")
    args = parser.parse_args(argv)
    if args.max_tests < 0 or args.concurrency < 1 or args.timeout <= 0 or args.startup_timeout <= 0:
        parser.error("Counts must be nonnegative, concurrency and timeouts positive.")
    if args.resume and args.rerun_flagged:
        parser.error("Use either --resume or --rerun-flagged.")
    if args.bank == "gaps" and args.context == "category":
        parser.error("Gap cases have no assigned category. Use open context.")
    return args


def main(argv=None):
    args = arguments(argv)
    bank_names = ["topics", "gaps"] if args.bank == "both" else [args.bank]
    all_cases = [case for name in bank_names for case in load_bank(BANK_FILES[name], name)]
    # A rerun uses the exact previous case IDs, not just the quick-suite sample.
    selected = select_cases(all_cases, "full" if args.rerun_flagged else args.suite, args.only,
                            args.language, args.context, args.shuffle, args.seed,
                            0 if args.rerun_flagged else args.max_tests)
    if args.rerun_flagged:
        previous = read_results(args.rerun_flagged / "results.jsonl")
        if not previous:
            raise ValueError("No prior results found to rerun")
        flagged = {key for key, row in previous.items() if row["status"] not in MATCHES}
        selected = [case for case in selected if case.run_id in flagged]
        if args.max_tests:
            selected = selected[:args.max_tests]
    if not selected:
        print("No matching cases to run.")
        return 0
    print(f"Selected {len(selected)} cases; {len({c.section for c in selected})} sections; mode={args.mode}, context={args.context}", flush=True)
    print("LLM: " + ("server-controlled (local --llm flag does not affect API)" if args.mode == "api" else args.llm), flush=True)
    if args.list_only:
        print("Bank validation passed. No chatbot calls made.")
        return 0
    before = runtime_snapshot()
    config = {k: v for k, v in vars(args).items() if k not in {"out_dir", "resume", "rerun_flagged", "list_only"}}
    manifest = {"version": 1, "config": config, "case_ids": [c.run_id for c in selected],
                "case_digest": digest([asdict(c) for c in selected]), "runtime_hashes": before,
                "tester_hash": hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    fingerprint = digest(manifest)
    folder = args.resume or args.out_dir / (datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6])
    if args.resume:
        old = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        if old["fingerprint"] != fingerprint:
            raise ValueError("Resume configuration, question bank, tester, or runtime files changed. Start a new run; do not mix baselines.")
    else:
        folder.mkdir(parents=True, exist_ok=False)
        (folder / "manifest.json").write_text(json.dumps({**manifest, "fingerprint": fingerprint, "created_at": datetime.now(timezone.utc).isoformat()}, indent=2), encoding="utf-8")
    journal = folder / "results.jsonl"
    results = read_results(journal)
    pending = [c for c in selected if c.run_id not in results]
    # Repair only this tester's journal if interruption left an incomplete final line.
    if args.resume:
        repair_journal_tail(journal)
    print("Report folder: " + str(folder), flush=True)
    started, interrupted = time.perf_counter(), False
    runner = None

    def record(case, observation, handle):
        row = grade(case, observation)
        results[case.run_id] = compact_result(row)
        handle.write(json.dumps(row, ensure_ascii=True, default=str) + "\n")
        handle.flush()
        print(f"\n[{len(results)}/{len(selected)}] {case.run_id} {row['status']} ({row.get('latency_ms', 0)} ms)\n"
              f"Question: {case.query}\nExpected: {case.expected_intent or 'limitation/referral'} | Observed: {row.get('actual_intent') or 'not exposed'}\n"
              f"Response: {row['answer'] or row.get('error') or '(empty)'}", flush=True)

    try:
        with journal.open("a", encoding="utf-8") as handle:
            if args.mode == "router":
                runner = LocalRunner(args.llm == "on", args.timeout, args.startup_timeout)
                for case in pending:
                    print(f"\nStarting {case.run_id}: {case.query}", flush=True)
                    record(case, runner.run(job_for(case)), handle)
            else:
                with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
                    # Bound outstanding work so Ctrl+C does not leave thousands of queued requests.
                    for offset in range(0, len(pending), args.concurrency):
                        futures = {pool.submit(call_api, job_for(c), args.url, args.timeout): c
                                   for c in pending[offset:offset + args.concurrency]}
                        for future in as_completed(futures):
                            record(futures[future], future.result(), handle)
    except KeyboardInterrupt:
        interrupted = True
        print("\nStopped; completed cases are saved. Resume using the same options.")
    finally:
        if runner:
            runner.close()
        after = runtime_snapshot()
        changed = sorted(k for k in before.keys() | after.keys() if before.get(k) != after.get(k))
        counts = write_reports(folder, results, len(selected), time.perf_counter() - started, changed, interrupted)
        print("\nStatuses: " + json.dumps(dict(counts), sort_keys=True))
        print("Report: " + str(folder / "report.md"))
        print("Runtime/source files changed: " + (", ".join(changed) if changed else "none detected"))
    return 130 if interrupted else 0


if __name__ == "__main__":
    mp.freeze_support()
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, OSError) as exc:
        print("Tester error: " + str(exc), file=sys.stderr)
        raise SystemExit(2)
