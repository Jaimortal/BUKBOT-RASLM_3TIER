import argparse
import asyncio
import csv
import ctypes
import json
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib import request, error


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ROOT / "docs" / "Structured Retrieval QA Baseline Dataset.md"
DEFAULT_OUT_DIR = ROOT / "reports" / "gorilla-tests"

FALLBACK_MARKERS = [
    "i cannot understand",
    "not sure i fully understand",
    "not sure i understand",
    "could you rephrase",
    "try rephrasing",
    "sorry, i don't have",
    "sorry, i'm having trouble",
    "internal server error",
]


def one_line(value: object, limit: int = 180) -> str:
    text = str(value or "").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def console_response_status(result: Dict[str, object]) -> str:
    if result.get("error"):
        return "no (request error)"
    if result.get("fallback"):
        return "no (fallback/no data)"
    if result.get("map_mismatch"):
        return "no (missing expected map)"
    if not result.get("answer_preview") and not result.get("has_map") and not result.get("suggestions_count"):
        return "no (empty response)"
    if result.get("ok"):
        return "yes (bot did respond)"
    return "yes (needs review)"


def format_console_result(result: Dict[str, object]) -> str:
    answer = one_line(result.get("answer_preview")) or "no text returned"
    user_label = f" | user: {result['virtual_user']}" if result.get("virtual_user") else ""
    return "\n".join([
        f"{result['index']}{user_label}",
        f"question: {result['question']}",
        f"response: {console_response_status(result)}",
        f"preview: {answer}",
        "",
    ])


@dataclass
class TestQuestion:
    number: str
    category: str
    question: str
    expected: str
    expected_map: str
    follow_up: str
    source: str


@dataclass
class MemorySample:
    elapsed_s: float
    memory_load_percent: int
    total_mb: int
    available_mb: int
    used_mb: int


class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]


def sample_system_memory(elapsed_s: float) -> Optional[MemorySample]:
    try:
        status = MEMORYSTATUSEX()
        status.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
        total_mb = int(status.ullTotalPhys / (1024 * 1024))
        available_mb = int(status.ullAvailPhys / (1024 * 1024))
        return MemorySample(
            elapsed_s=round(elapsed_s, 2),
            memory_load_percent=int(status.dwMemoryLoad),
            total_mb=total_mb,
            available_mb=available_mb,
            used_mb=max(0, total_mb - available_mb),
        )
    except Exception:
        return None


async def sample_memory_until_stopped(
    samples: List[MemorySample],
    stop_event: asyncio.Event,
    started: float,
    interval_s: float,
) -> None:
    while not stop_event.is_set():
        sample = sample_system_memory(time.perf_counter() - started)
        if sample:
            samples.append(sample)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=max(0.5, interval_s))
        except asyncio.TimeoutError:
            continue
    sample = sample_system_memory(time.perf_counter() - started)
    if sample:
        samples.append(sample)


def clean_cell(value: str) -> str:
    value = value.strip()
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value)
    return value


def load_markdown_questions(path: Path) -> List[TestQuestion]:
    questions: List[TestQuestion] = []
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    current_section = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("### "):
            current_section = stripped.replace("### ", "").strip()
            continue
        if not stripped.startswith("|") or "---" in stripped or "Question" in stripped:
            continue

        parts = [clean_cell(part) for part in stripped.strip("|").split("|")]
        if len(parts) == 6:
            number, category, question, expected, expected_map, follow_up = parts
        elif len(parts) == 5:
            number, question, expected, expected_map, follow_up = parts
            category = current_section or "General"
        else:
            continue

        if not number or not question or not number[0].isdigit():
            continue
        questions.append(TestQuestion(number, category, question, expected, expected_map, follow_up, current_section))
    return questions


def build_run_items(base_questions: List[TestQuestion], total: int, shuffle: bool) -> List[TestQuestion]:
    if not base_questions:
        raise ValueError("No questions loaded from dataset.")

    items: List[TestQuestion] = []
    while len(items) < total:
        batch = list(base_questions)
        if shuffle:
            random.shuffle(batch)
        items.extend(batch)
    return items[:total]


def post_json(url: str, payload: Dict[str, str], timeout: float) -> Dict[str, object]:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="replace")
        return {
            "status": response.status,
            "body": json.loads(body) if body else {},
        }


async def send_one(
    index: int,
    question: TestQuestion,
    url: str,
    timeout: float,
    session_prefix: str,
    keep_context: bool,
    session_id_override: Optional[str] = None,
    virtual_user: str = "",
    scheduled_at_s: Optional[float] = None,
) -> Dict[str, object]:
    session_id = session_id_override or (f"{session_prefix}_context" if keep_context else f"{session_prefix}_{index:04d}")
    started = time.perf_counter()
    try:
        response = await asyncio.to_thread(
            post_json,
            url,
            {"intent": question.question, "language": "", "sessionId": session_id},
            timeout,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)
        body = response.get("body") or {}
        answer = str(body.get("answer") or "")
        lowered = answer.lower()
        has_fallback = any(marker in lowered for marker in FALLBACK_MARKERS)
        has_map = bool(body.get("mapData") or body.get("mapDataList"))
        has_image = bool(body.get("imageUrl") or body.get("imageUrls"))
        suggestions_count = len(body.get("suggestions") or [])
        choice_groups_count = len(body.get("choiceGroups") or [])
        expected_map = question.expected_map.lower()
        map_mismatch = expected_map == "yes" and not has_map

        return {
            "index": index,
            "virtual_user": virtual_user,
            "scheduled_at_s": round(scheduled_at_s, 3) if scheduled_at_s is not None else "",
            "completed_at_s": round(time.perf_counter(), 3),
            "status": response.get("status"),
            "ok": response.get("status") == 200 and not has_fallback and not map_mismatch,
            "fallback": has_fallback,
            "map_mismatch": map_mismatch,
            "latency_ms": latency_ms,
            "category": question.category,
            "question": question.question,
            "expected": question.expected,
            "expected_map": question.expected_map,
            "follow_up": question.follow_up,
            "session_id": session_id,
            "answer_preview": answer[:500].replace("\n", " "),
            "has_map": has_map,
            "has_image": has_image,
            "suggestions_count": suggestions_count,
            "choice_groups_count": choice_groups_count,
            "error": "",
        }
    except error.HTTPError as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return error_result(index, question, session_id, latency_ms, f"HTTP {exc.code}: {exc.reason}", virtual_user, scheduled_at_s)
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return error_result(index, question, session_id, latency_ms, repr(exc), virtual_user, scheduled_at_s)


def error_result(
    index: int,
    question: TestQuestion,
    session_id: str,
    latency_ms: int,
    message: str,
    virtual_user: str = "",
    scheduled_at_s: Optional[float] = None,
) -> Dict[str, object]:
    return {
        "index": index,
        "virtual_user": virtual_user,
        "scheduled_at_s": round(scheduled_at_s, 3) if scheduled_at_s is not None else "",
        "completed_at_s": round(time.perf_counter(), 3),
        "status": "error",
        "ok": False,
        "fallback": False,
        "map_mismatch": False,
        "latency_ms": latency_ms,
        "category": question.category,
        "question": question.question,
        "expected": question.expected,
        "expected_map": question.expected_map,
        "follow_up": question.follow_up,
        "session_id": session_id,
        "answer_preview": "",
        "has_map": False,
        "has_image": False,
        "suggestions_count": 0,
        "choice_groups_count": 0,
        "error": message,
    }


async def run_test(args: argparse.Namespace) -> List[Dict[str, object]]:
    base_questions = load_markdown_questions(Path(args.dataset))
    items = build_run_items(base_questions, args.total, args.shuffle)
    session_prefix = f"gorilla_{int(time.time())}"
    semaphore = asyncio.Semaphore(args.concurrency)
    print_lock = asyncio.Lock()
    results: List[Dict[str, object]] = []

    async def guarded_send(index: int, question: TestQuestion) -> None:
        async with semaphore:
            result = await send_one(
                index,
                question,
                args.url,
                args.timeout,
                session_prefix,
                args.keep_context,
            )
            results.append(result)
            async with print_lock:
                if args.log_each:
                    print(format_console_result(result))
                if index % args.progress_every == 0 or index == len(items):
                    print(f"sent {index}/{len(items)}")

    await asyncio.gather(*(guarded_send(index, question) for index, question in enumerate(items, start=1)))
    return sorted(results, key=lambda row: int(row["index"]))


def build_arrival_schedule(duration_s: float, start_rate: float, end_rate: float) -> List[float]:
    if duration_s <= 0:
        raise ValueError("--duration-seconds must be greater than 0")
    if start_rate <= 0 or end_rate <= 0:
        raise ValueError("--start-rate and --end-rate must be greater than 0")

    schedule: List[float] = []
    current = 0.0
    while current < duration_s:
        progress = min(1.0, current / duration_s)
        rate = start_rate + ((end_rate - start_rate) * progress)
        schedule.append(current)
        current += 1.0 / max(0.01, rate)
    return schedule


def print_arrival_rate_warning(args: argparse.Namespace, scheduled_messages: int) -> None:
    if scheduled_messages < 1000 and args.concurrency < 20 and args.end_rate < 15:
        return

    print("")
    print("WARNING: This is a heavy arrival-rate test.")
    print(f"It will schedule about {scheduled_messages} messages across {args.users} virtual users.")
    print(f"Peak configured arrival rate: {args.end_rate:g} req/sec; max in-flight requests: {args.concurrency}.")
    print("Manual chat messages may become very slow while this test is running.")
    print("Use Ctrl+C to stop if the laptop becomes unstable.")
    print("")


async def run_arrival_rate_test(args: argparse.Namespace) -> List[Dict[str, object]]:
    base_questions = load_markdown_questions(Path(args.dataset))
    schedule = build_arrival_schedule(args.duration_seconds, args.start_rate, args.end_rate)
    items = build_run_items(base_questions, len(schedule), args.shuffle)
    session_prefix = f"ramp_{int(time.time())}"
    semaphore = asyncio.Semaphore(args.concurrency)
    print_lock = asyncio.Lock()
    results: List[Dict[str, object]] = []
    started = time.perf_counter()

    print_arrival_rate_warning(args, len(items))
    print(
        "arrival-rate test: "
        f"{len(items)} scheduled messages, {args.users} virtual users, "
        f"{args.start_rate:g}->{args.end_rate:g} req/sec over {args.duration_seconds:g}s"
    )

    async def scheduled_send(index: int, question: TestQuestion, scheduled_at_s: float) -> None:
        delay = scheduled_at_s - (time.perf_counter() - started)
        if delay > 0:
            await asyncio.sleep(delay)
        virtual_user_number = ((index - 1) % args.users) + 1
        virtual_user = f"user_{virtual_user_number:03d}"
        session_id = f"{session_prefix}_{virtual_user}"
        async with semaphore:
            result = await send_one(
                index,
                question,
                args.url,
                args.timeout,
                session_prefix,
                keep_context=False,
                session_id_override=session_id,
                virtual_user=virtual_user,
                scheduled_at_s=scheduled_at_s,
            )
            results.append(result)
            async with print_lock:
                if args.log_each:
                    print(format_console_result(result))
                if index % args.progress_every == 0 or index == len(items):
                    print(f"sent {index}/{len(items)}")

    await asyncio.gather(
        *(scheduled_send(index, question, scheduled_at_s) for index, (question, scheduled_at_s) in enumerate(zip(items, schedule), start=1))
    )
    return sorted(results, key=lambda row: int(row["index"]))


def percentile(values: List[int], pct: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    position = min(len(ordered) - 1, int(round((pct / 100) * (len(ordered) - 1))))
    return ordered[position]


def user_latency_summary(results: List[Dict[str, object]]) -> List[Dict[str, object]]:
    grouped: Dict[str, List[Dict[str, object]]] = {}
    for row in results:
        user = str(row.get("virtual_user") or row.get("session_id") or "unknown")
        grouped.setdefault(user, []).append(row)

    rows: List[Dict[str, object]] = []
    for user, user_rows in grouped.items():
        latencies = [int(row["latency_ms"]) for row in user_rows]
        failures = sum(1 for row in user_rows if not row["ok"])
        rows.append({
            "virtual_user": user,
            "requests": len(user_rows),
            "failures": failures,
            "avg_latency_ms": int(sum(latencies) / len(latencies)) if latencies else 0,
            "p95_latency_ms": percentile(latencies, 95),
            "max_latency_ms": max(latencies) if latencies else 0,
        })
    return sorted(rows, key=lambda row: str(row["virtual_user"]))


def write_reports(results: List[Dict[str, object]], out_dir: Path, memory_samples: Optional[List[MemorySample]] = None) -> Dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    csv_path = out_dir / f"gorilla-chat-{stamp}.csv"
    md_path = out_dir / f"gorilla-chat-{stamp}.md"
    memory_csv_path = out_dir / f"gorilla-chat-{stamp}-memory.csv"

    fieldnames = list(results[0].keys()) if results else []
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    total = len(results)
    failures = [row for row in results if not row["ok"]]
    fallbacks = [row for row in results if row["fallback"]]
    errors = [row for row in results if row["error"]]
    map_mismatches = [row for row in results if row["map_mismatch"]]
    latencies = [int(row["latency_ms"]) for row in results]
    memory_samples = memory_samples or []
    peak_memory = max(memory_samples, key=lambda sample: sample.used_mb, default=None)
    peak_memory_percent = max((sample.memory_load_percent for sample in memory_samples), default=0)
    user_summaries = user_latency_summary(results)

    if memory_samples:
        with memory_csv_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["elapsed_s", "memory_load_percent", "total_mb", "available_mb", "used_mb"],
            )
            writer.writeheader()
            writer.writerows(sample.__dict__ for sample in memory_samples)

    lines = [
        "# Gorilla Chat Test Report",
        "",
        f"- Total requests: {total}",
        f"- Passed heuristic checks: {total - len(failures)}",
        f"- Failed heuristic checks: {len(failures)}",
        f"- Fallback-like answers: {len(fallbacks)}",
        f"- HTTP/runtime errors: {len(errors)}",
        f"- Expected-map missing: {len(map_mismatches)}",
        f"- Average latency: {int(sum(latencies) / len(latencies)) if latencies else 0} ms",
        f"- P50 latency: {percentile(latencies, 50)} ms",
        f"- P95 latency: {percentile(latencies, 95)} ms",
        f"- Max latency: {max(latencies) if latencies else 0} ms",
        f"- Memory samples: {len(memory_samples)}",
        f"- Peak RAM usage: {peak_memory.used_mb if peak_memory else 0} MB ({peak_memory_percent}%)",
        f"- Memory CSV: {memory_csv_path if memory_samples else 'not captured'}",
        "",
        "## Virtual User Latency Summary",
        "",
        "| User | Requests | Failures | Avg latency | P95 latency | Max latency |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in user_summaries[:120]:
        lines.append(
            f"| {row['virtual_user']} | {row['requests']} | {row['failures']} | "
            f"{row['avg_latency_ms']} ms | {row['p95_latency_ms']} ms | {row['max_latency_ms']} ms |"
        )

    lines.extend([
        "",
        "## First 30 Failures",
        "",
    ])
    for row in failures[:30]:
        lines.extend([
            f"### #{row['index']} {row['question']}",
            "",
            f"- Category: {row['category']}",
            f"- Expected: {row['expected']}",
            f"- Status: {row['status']}",
            f"- Latency: {row['latency_ms']} ms",
            f"- Fallback: {row['fallback']}",
            f"- Map mismatch: {row['map_mismatch']}",
            f"- Error: {row['error'] or 'none'}",
            f"- Answer preview: {row['answer_preview']}",
            "",
        ])

    md_path.write_text("\n".join(lines), encoding="utf-8")
    paths = {"csv": csv_path, "md": md_path}
    if memory_samples:
        paths["memory_csv"] = memory_csv_path
    return paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local gorilla/stress tests against /api/chat.")
    parser.add_argument("--url", default="http://127.0.0.1:5000/api/chat", help="Express chat endpoint URL.")
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET), help="Markdown QA dataset path.")
    parser.add_argument("--total", type=int, default=1000, help="Total messages to send.")
    parser.add_argument("--concurrency", type=int, default=5, help="Parallel requests. Use 1-5 for laptop-safe testing.")
    parser.add_argument("--timeout", type=float, default=30.0, help="Request timeout in seconds.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Report output folder.")
    parser.add_argument("--shuffle", action="store_true", help="Shuffle question order before repeating.")
    parser.add_argument("--keep-context", action="store_true", help="Use one session for all messages to stress memory.")
    parser.add_argument("--progress-every", type=int, default=25, help="Print progress every N requests.")
    parser.add_argument("--arrival-rate-test", action="store_true", help="Run a ramp/arrival-rate test instead of the fixed total/concurrency test.")
    parser.add_argument("--users", type=int, default=100, help="Virtual users/session IDs for arrival-rate testing.")
    parser.add_argument("--duration-seconds", type=float, default=60.0, help="Arrival-rate test duration.")
    parser.add_argument("--start-rate", type=float, default=1.0, help="Starting request arrival rate per second.")
    parser.add_argument("--end-rate", type=float, default=10.0, help="Ending request arrival rate per second.")
    parser.add_argument("--memory-sample-every", type=float, default=2.0, help="Seconds between RAM samples.")
    parser.add_argument(
        "--no-log-each",
        action="store_false",
        dest="log_each",
        help="Disable per-request console question/response logs.",
    )
    parser.set_defaults(log_each=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.concurrency < 1:
        raise ValueError("--concurrency must be at least 1")
    if args.total < 1:
        raise ValueError("--total must be at least 1")
    if args.users < 1:
        raise ValueError("--users must be at least 1")

    started = time.perf_counter()
    memory_samples: List[MemorySample] = []

    async def run_with_memory_sampling() -> List[Dict[str, object]]:
        stop_event = asyncio.Event()
        sampler = asyncio.create_task(
            sample_memory_until_stopped(memory_samples, stop_event, started, args.memory_sample_every)
        )
        try:
            if args.arrival_rate_test:
                return await run_arrival_rate_test(args)
            return await run_test(args)
        finally:
            stop_event.set()
            await sampler

    results = asyncio.run(run_with_memory_sampling())
    paths = write_reports(results, Path(args.out_dir), memory_samples)
    elapsed = time.perf_counter() - started
    failures = sum(1 for row in results if not row["ok"])
    peak_memory = max(memory_samples, key=lambda sample: sample.used_mb, default=None)
    print("")
    print(f"Done in {elapsed:.1f}s")
    print(f"Total: {len(results)}")
    print(f"Heuristic failures: {failures}")
    if peak_memory:
        print(f"Peak RAM usage: {peak_memory.used_mb} MB ({peak_memory.memory_load_percent}%)")
    print(f"CSV: {paths['csv']}")
    if paths.get("memory_csv"):
        print(f"Memory CSV: {paths['memory_csv']}")
    print(f"Report: {paths['md']}")


if __name__ == "__main__":
    main()
