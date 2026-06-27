import argparse
import csv
import random
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
RASA_ACTIONS = ROOT / "rasa" / "actions"
DEFAULT_OUT_DIR = ROOT / "reports" / "retrieval-qa"

sys.path.insert(0, str(RASA_ACTIONS))

from actions import ActionReplyFromJsonHelper, LOCATION_ALIASES  # noqa: E402
from main_router import MainRouterService  # noqa: E402


BROAD_INTENTS = [
    "ask_process",
    "ask_general_info",
    "ask_location",
    "ask_requirement",
    "ask_schedule",
    "ask_fee",
    "ask_availability",
    "ask_document",
    "ask_contact",
    "nlu_fallback",
]

SKIP_EXPECTED_INTENTS = {
    "nlu_fallback",
    "out_of_scope",
    "smalltalk",
    "goodbye",
    "bot_challenge",
    "session_start",
    "restart",
    "back",
}

EQUIVALENT_INTENTS = {
    "change_portal_password_buksu": {
        "reset_portal_password_buksu",
        "Change_Pass_admission",
    },
}

FALLBACK_MARKERS = [
    "i cannot understand",
    "not sure i fully understand",
    "not sure i understand",
    "could you rephrase",
    "try rephrasing",
    "sorry, i don't have",
    "sorry, i'm having trouble",
]


@dataclass
class QaCase:
    expected_intent: str
    query: str
    source: str
    display_name: str
    broad_intent: str


@dataclass
class QaResult:
    index: int
    expected_intent: str
    actual_intent: str
    broad_intent: str
    query: str
    source: str
    display_name: str
    status: str
    response_preview: str
    suggestions: str


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def one_line(value: Any, limit: int = 220) -> str:
    text = normalize_space(str(value or "").replace("\n", " "))
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def clean_query(value: Any) -> str:
    text = normalize_space(value)
    text = text.strip(" -:|")
    return text


def is_unrealistic_generated_query(value: str) -> bool:
    text = value.lower().strip()
    bad_patterns = [
        r"\basa\s+how\b",
        r"\basa\s+what\b",
        r"\bhow to\s+where\b",
        r"\bhow to\s+what are\b",
        r"\bhow to\s+what should\b",
        r"\bhow to\s+how\b",
        r"\bwhat is\s+where\b",
        r"\bwhat is\s+how\b",
        r"\bwhere is\s+where\b",
        r"\bwhere can i find\s+where\b",
        r"\bwhat are the requirements for\s+what are\b",
        r"\bwhat should i bring for\s+what should\b",
        r"\bunsaon pag$",
        r"\bunsaon pag\?$",
        r"\bmaka apply$",
        r"\bmaka apply\?$",
        r"\bmag apply$",
        r"\bmag apply\?$",
    ]
    return any(re.search(pattern, text) for pattern in bad_patterns)


def words(value: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9']+", value.lower())


def is_fallback_text(value: str) -> bool:
    text = value.lower()
    return any(marker in text for marker in FALLBACK_MARKERS)


def guess_broad_intent(query: str, expected_intent: str = "") -> str:
    text = query.lower()
    expected = expected_intent.lower()

    if any(term in text for term in ["where", "location", "located", "room", "office", "building", "gate", "asa", "hain", "diin"]):
        return "ask_location"
    if any(term in text for term in ["how much", "fee", "fees", "cost", "payment", "pay", "pila", "bayad", "tagpila"]):
        return "ask_fee"
    if any(term in text for term in ["requirement", "requirements", "need", "bring", "document", "documents", "dad", "kinahanglan", "kailangan"]):
        return "ask_requirement"
    if any(term in text for term in ["when", "schedule", "time", "deadline", "date", "hours", "kanus", "oras"]):
        return "ask_schedule"
    if any(term in text for term in ["offer", "available", "availability", "courses", "course", "program", "naa", "available"]):
        return "ask_availability"
    if any(term in text for term in ["contact", "email", "phone", "number", "call"]):
        return "ask_contact"
    if any(term in text for term in ["form", "cor", "permit", "certificate", "download"]):
        return "ask_document"
    if any(term in text for term in ["how", "process", "step", "steps", "apply", "request", "get", "reset", "login", "forgot", "change", "validate", "enroll", "unsaon", "pagkuha"]):
        return "ask_process"

    if any(term in expected for term in ["location", "office", "room"]):
        return "ask_location"
    if any(term in expected for term in ["fee", "payment", "cost"]):
        return "ask_fee"
    if any(term in expected for term in ["requirement", "requirements"]):
        return "ask_requirement"
    if any(term in expected for term in ["schedule", "time", "day"]):
        return "ask_schedule"
    if any(term in expected for term in ["contact"]):
        return "ask_contact"
    if any(term in expected for term in ["process", "login", "password", "validation"]):
        return "ask_process"
    return "ask_general_info"


def typo_variant(text: str) -> Optional[str]:
    source = clean_query(text)
    if len(source) < 8:
        return None
    replacements = [
        ("password", "passwrd"),
        ("portal", "poral"),
        ("student", "studnt"),
        ("admission", "admisson"),
        ("enrollment", "enrollmnt"),
        ("requirements", "requirments"),
        ("validation", "validaton"),
        ("library", "libary"),
        ("available", "avalilable"),
    ]
    changed = source
    for old, new in replacements:
        changed = re.sub(rf"\b{re.escape(old)}\b", new, changed, flags=re.IGNORECASE)
    return changed if changed != source else None


def short_variant(text: str) -> Optional[str]:
    tokens = words(text)
    stop = {
        "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "my", "your",
        "how", "what", "where", "when", "do", "does", "can", "i", "me", "is", "are",
    }
    kept = [token for token in tokens if token not in stop]
    if 1 < len(kept) <= 7:
        return " ".join(kept)
    if len(kept) > 7:
        return " ".join(kept[:7])
    return None


def looks_like_location_seed(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in ["where", "location", "located", "room", "office", "building", "asa", "hain", "diin", "dapit"])


def looks_like_process_seed(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in ["how", "process", "steps", "apply", "request", "get", "login", "reset", "change", "unsaon", "pagkuha"])


def looks_like_fee_seed(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in ["how much", "fee", "cost", "payment", "pay", "pila", "bayad", "tagpila"])


def looks_like_requirement_seed(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in ["requirement", "requirements", "need", "bring", "document", "cor", "kinahanglan", "dad"])


def looks_like_definition_seed(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in [
        "meaning", "mean", "what is", "definition", "stands for",
        "tba", "acronym", "abbreviation", "pasabot",
    ])


def looks_like_question_seed(text: str) -> bool:
    lower = text.lower().strip()
    return lower.startswith((
        "what ", "who ", "where ", "when ", "why ", "how ",
        "can ", "do ", "does ", "is ", "are ", "will ",
        "unsa ", "unsay ", "kinsa ", "asa ", "kanus",
    )) or "what should i do" in lower


def generate_variants(seed: str, max_variants: int, expected_intent: str = "") -> List[str]:
    base = clean_query(seed)
    if not base:
        return []

    broad = guess_broad_intent(base, expected_intent)
    is_location = broad == "ask_location" or looks_like_location_seed(base)
    is_process = broad == "ask_process" or looks_like_process_seed(base)
    is_fee = broad == "ask_fee" or looks_like_fee_seed(base)
    is_requirement = broad == "ask_requirement" or looks_like_requirement_seed(base)
    is_definition = looks_like_definition_seed(base)
    is_question = looks_like_question_seed(base)

    variants = [base, base.lower(), f"{base}?"]

    lower = base.lower()
    if is_question:
        pass
    elif is_location:
        variants.extend([
            f"where is {base}",
            f"where can i find {base}",
            f"asa dapit ang {base}",
        ])
    elif is_fee:
        variants.extend([
            f"how much {base}",
            f"how much is {base}",
            f"pila ang {base}",
        ])
    elif is_requirement:
        variants.extend([
            f"what are the requirements for {base}",
            f"what should i bring for {base}",
            f"unsa requirements sa {base}",
        ])
    elif is_process:
        variants.extend([
            f"how to {base}",
            f"what is the process for {base}",
            f"unsaon {base}",
        ])
    else:
        variants.extend([
            f"what is {base}",
            f"tell me about {base}",
            f"unsa ang {base}",
        ])
        if is_definition:
            variants.append(f"unsay pasabot sa {base}")

    if is_process and not lower.startswith(("how", "unsaon", "what is the process")):
        variants.extend([f"how to {base}", f"unsaon {base}"])
    if is_location and not lower.startswith(("where", "asa", "hain", "diin")):
        variants.append(f"asa {base}")
    if "password" in lower or "portal" in lower or "account" in lower:
        variants.extend([f"i forgot my {base}", f"how to forgot my {base}"])
    if "course" in lower or "program" in lower:
        variants.extend([f"unsay {base} diris buksu", f"{base} available?"])

    short = short_variant(base)
    if short:
        variants.append(short)
    typo = typo_variant(base.lower())
    if typo:
        variants.append(typo)

    seen = set()
    output = []
    for variant in variants:
        cleaned = clean_query(variant)
        key = cleaned.lower()
        if cleaned and key not in seen and not is_unrealistic_generated_query(cleaned):
            output.append(cleaned)
            seen.add(key)
        if len(output) >= max_variants:
            break
    return output


def extract_answer_text(response: Any) -> str:
    if isinstance(response, dict):
        parts = []
        if response.get("text"):
            parts.append(str(response.get("text")))
        if response.get("response"):
            parts.append(str(response.get("response")))
        custom = response.get("custom") or {}
        if isinstance(custom, dict) and custom.get("suggestions"):
            labels = [str(item.get("label")) for item in custom.get("suggestions") or [] if isinstance(item, dict)]
            if labels:
                parts.append("Suggestions: " + ", ".join(labels))
        return "\n".join(parts)
    return str(response or "")


def extract_suggestions(response: Any) -> str:
    if not isinstance(response, dict):
        return ""
    custom = response.get("custom") or {}
    suggestions = custom.get("suggestions") if isinstance(custom, dict) else []
    if not isinstance(suggestions, list):
        return ""
    labels = [str(item.get("label") or "").strip() for item in suggestions if isinstance(item, dict)]
    return ", ".join(label for label in labels if label)


def suggestion_matches_expected(suggestions: str, case: QaCase) -> bool:
    if not suggestions:
        return False
    suggestion_text = suggestions.lower()
    expected_label = case.display_name.lower()
    expected_words = [word for word in words(expected_label) if len(word) > 2]
    if expected_label and expected_label in suggestion_text:
        return True
    if expected_words and all(word in suggestion_text for word in expected_words[:3]):
        return True
    return False


def is_pass_status(status: str) -> bool:
    return status.startswith("PASS")


def actual_matches_expected(actual: str, expected: str) -> bool:
    if actual == expected:
        return True
    return actual in EQUIVALENT_INTENTS.get(expected, set())


def record_seed_texts(entry: Dict[str, Any], max_phrases: int) -> List[str]:
    metadata = entry.get("metadata") or {}
    responses = entry.get("responses") or {}
    seeds: List[str] = []

    for phrase in metadata.get("phrases") or []:
        if isinstance(phrase, str):
            seeds.append(phrase)

    for term in metadata.get("subject_terms") or []:
        if isinstance(term, str):
            seeds.append(term)

    for value in [entry.get("display_name"), entry.get("sub_category"), entry.get("intent")]:
        text = clean_query(str(value or "").replace("_", " "))
        if text:
            seeds.append(text)

    for suggestion in responses.get("suggestions") or []:
        if isinstance(suggestion, dict):
            label = clean_query(suggestion.get("label"))
            payload = clean_query(suggestion.get("payload"))
            if label:
                seeds.append(label)
            if payload:
                seeds.append(payload)

    seen = set()
    unique = []
    for seed in seeds:
        cleaned = clean_query(seed)
        key = cleaned.lower()
        if cleaned and key not in seen:
            unique.append(cleaned)
            seen.add(key)
        if len(unique) >= max_phrases:
            break
    return unique


def build_cases(
    router: MainRouterService,
    max_records: int,
    max_tests: int,
    max_phrases_per_record: int,
    variants_per_phrase: int,
    only: str,
    include_legacy: bool,
) -> List[QaCase]:
    records = router.data_loader.responses
    cases: List[QaCase] = []
    record_count = 0
    only_lower = only.lower().strip()

    for entry in records:
        expected = str(entry.get("intent") or "").strip()
        if not expected or expected in SKIP_EXPECTED_INTENTS:
            continue

        metadata = entry.get("metadata") or {}
        is_structured = bool(metadata.get("structured_source"))
        if not include_legacy and not is_structured:
            continue

        display_name = clean_query(entry.get("display_name") or entry.get("sub_category") or expected)
        source = clean_query(metadata.get("source") or entry.get("category") or "unknown")
        searchable = " ".join([expected, display_name, source, clean_query(entry.get("sub_category"))]).lower()
        if only_lower and only_lower not in searchable:
            continue

        seeds = record_seed_texts(entry, max_phrases_per_record)
        if not seeds:
            continue

        record_count += 1
        for seed in seeds:
            for query in generate_variants(seed, variants_per_phrase, expected):
                cases.append(QaCase(
                    expected_intent=expected,
                    query=query,
                    source=source,
                    display_name=display_name,
                    broad_intent=guess_broad_intent(query, expected),
                ))
                if max_tests and len(cases) >= max_tests:
                    return cases

        if max_records and record_count >= max_records:
            break

    return cases


def route_case(
    router: MainRouterService,
    case: QaCase,
    intent_mode: str,
) -> Tuple[str, str, str, str]:
    intents = BROAD_INTENTS if intent_mode == "all" else [case.broad_intent]
    best_actual = ""
    best_text = ""
    best_suggestions = ""
    best_broad = case.broad_intent

    for broad_intent in intents:
        response, slots = router.route_with_context(
            broad_intent,
            {"text": case.query, "entities": []},
            case.query,
            {},
        )
        actual = str(slots.get("conversation_last_intent") or "").strip()
        text = extract_answer_text(response)
        suggestions = extract_suggestions(response)

        if actual == case.expected_intent:
            return actual, text, suggestions, broad_intent

        if not best_actual and not is_fallback_text(text):
            best_actual = actual
            best_text = text
            best_suggestions = suggestions
            best_broad = broad_intent
        elif not best_text:
            best_actual = actual
            best_text = text
            best_suggestions = suggestions
            best_broad = broad_intent

    return best_actual, best_text, best_suggestions, best_broad


def run_cases(router: MainRouterService, cases: List[QaCase], intent_mode: str, progress_every: int, debug_each: bool = False) -> List[QaResult]:
    results: List[QaResult] = []
    total = len(cases)
    for index, case in enumerate(cases, start=1):
        if debug_each:
            print(f"running {index}/{total}: [{case.broad_intent}] {case.query} -> {case.expected_intent}", flush=True)
        actual, text, suggestions, used_broad = route_case(router, case, intent_mode)
        if actual_matches_expected(actual, case.expected_intent):
            status = "PASS"
        elif suggestion_matches_expected(suggestions, case):
            status = "PASS_SUGGESTION"
        elif is_fallback_text(text) or not text:
            status = "FALLBACK"
        elif suggestions:
            status = "SUGGESTION"
        else:
            status = "WRONG"

        result = QaResult(
            index=index,
            expected_intent=case.expected_intent,
            actual_intent=actual or "(none)",
            broad_intent=used_broad,
            query=case.query,
            source=case.source,
            display_name=case.display_name,
            status=status,
            response_preview=one_line(text),
            suggestions=suggestions,
        )
        results.append(result)

        if progress_every and index % progress_every == 0:
            print(f"tested {index}/{total} | pass={sum(1 for r in results if is_pass_status(r.status))} fail={sum(1 for r in results if not is_pass_status(r.status))}", flush=True)
    return results


def write_reports(results: List[QaResult], out_dir: Path, prefix: str) -> Tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    csv_path = out_dir / f"{prefix}-{timestamp}.csv"
    md_path = out_dir / f"{prefix}-{timestamp}.md"

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "index",
            "status",
            "expected_intent",
            "actual_intent",
            "broad_intent",
            "query",
            "source",
            "display_name",
            "suggestions",
            "response_preview",
        ])
        writer.writeheader()
        for result in results:
            writer.writerow(result.__dict__)

    total = len(results)
    passes = sum(1 for result in results if is_pass_status(result.status))
    failures = [result for result in results if not is_pass_status(result.status)]
    wrong = sum(1 for result in failures if result.status == "WRONG")
    fallback = sum(1 for result in failures if result.status == "FALLBACK")
    suggestion = sum(1 for result in failures if result.status == "SUGGESTION")

    by_expected: Dict[str, int] = {}
    for result in failures:
        by_expected[result.expected_intent] = by_expected.get(result.expected_intent, 0) + 1
    top_failures = sorted(by_expected.items(), key=lambda item: item[1], reverse=True)[:15]

    lines = [
        "# Retrieval QA Harness Report",
        "",
        f"- Total: {total}",
        f"- Passed: {passes}",
        f"- Failed: {len(failures)}",
        f"- Wrong answer: {wrong}",
        f"- Fallback/empty: {fallback}",
        f"- Returned suggestions instead: {suggestion}",
        f"- Pass rate: {(passes / total * 100):.1f}%" if total else "- Pass rate: 0.0%",
        "",
        "## Top Failing Expected Intents",
        "",
    ]
    if top_failures:
        lines.extend([f"- `{intent}`: {count}" for intent, count in top_failures])
    else:
        lines.append("- None")

    lines.extend(["", "## Failure Samples", ""])
    for result in failures[:80]:
        lines.extend([
            f"### {result.index}. {result.status}",
            "",
            f"- Query: `{result.query}`",
            f"- Expected: `{result.expected_intent}`",
            f"- Actual: `{result.actual_intent}`",
            f"- Broad intent: `{result.broad_intent}`",
            f"- Source: `{result.source}` / {result.display_name}",
            f"- Suggestions: {result.suggestions or '(none)'}",
            f"- Preview: {result.response_preview or '(empty)'}",
            "",
        ])

    md_path.write_text("\n".join(lines), encoding="utf-8")
    return csv_path, md_path


def sample_results(results: Iterable[QaResult], limit: int) -> None:
    for result in list(results)[:limit]:
        print(f"{result.index}. {result.status}")
        print(f"question: {result.query}")
        print(f"expected: {result.expected_intent}")
        print(f"actual: {result.actual_intent}")
        print(f"response: {result.response_preview or '(empty)'}")
        print("")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate and run local retrieval QA tests from chatbot JSON records.")
    parser.add_argument("--max-records", type=int, default=0, help="Limit number of knowledge records. 0 means all.")
    parser.add_argument("--max-phrases-per-record", type=int, default=4, help="Seed phrases to use from each record.")
    parser.add_argument("--variants-per-phrase", type=int, default=6, help="Generated query variants per seed phrase.")
    parser.add_argument("--max-tests", type=int, default=0, help="Limit total generated tests after shuffling/filtering. 0 means all.")
    parser.add_argument("--only", default="", help="Only test records whose intent/source/display name contains this text.")
    parser.add_argument("--include-legacy", action="store_true", help="Include legacy responses.json records.")
    parser.add_argument("--intent-mode", choices=["auto", "all"], default="auto", help="auto uses one guessed broad intent; all tries every broad intent and passes if any route works.")
    parser.add_argument("--shuffle", action="store_true", help="Shuffle generated cases before running.")
    parser.add_argument("--seed", type=int, default=7, help="Random seed for deterministic shuffling.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Report output directory.")
    parser.add_argument("--prefix", default="retrieval-qa", help="Report file prefix.")
    parser.add_argument("--progress-every", type=int, default=100, help="Console progress interval. 0 disables progress.")
    parser.add_argument("--show-failures", type=int, default=20, help="Print this many failure samples at the end.")
    parser.add_argument("--debug-each", action="store_true", help="Print every case before routing it. Useful for finding slow/stuck cases.")
    args = parser.parse_args()

    random.seed(args.seed)
    helper = ActionReplyFromJsonHelper(str(RASA_ACTIONS / "responses.json"))
    router = MainRouterService(helper, LOCATION_ALIASES)

    cases = build_cases(
        router=router,
        max_records=args.max_records,
        max_tests=args.max_tests,
        max_phrases_per_record=args.max_phrases_per_record,
        variants_per_phrase=args.variants_per_phrase,
        only=args.only,
        include_legacy=args.include_legacy,
    )

    if args.shuffle:
        random.shuffle(cases)
    if args.max_tests:
        cases = cases[: args.max_tests]

    print(f"Generated {len(cases)} retrieval QA cases.", flush=True)
    print(f"Mode: intent-mode={args.intent_mode}, include-legacy={args.include_legacy}, only={args.only or '(none)'}", flush=True)
    if not cases:
        print("No cases generated. Try removing --only or adding --include-legacy.")
        return 1

    results = run_cases(router, cases, args.intent_mode, args.progress_every, args.debug_each)
    csv_path, md_path = write_reports(results, Path(args.out_dir), args.prefix)

    total = len(results)
    passes = sum(1 for result in results if is_pass_status(result.status))
    failures = [result for result in results if not is_pass_status(result.status)]
    print("")
    print(f"Done. Total: {total}")
    print(f"Passed: {passes}")
    print(f"Failed: {len(failures)}")
    print(f"Pass rate: {(passes / total * 100):.1f}%" if total else "Pass rate: 0.0%")
    print(f"CSV: {csv_path}")
    print(f"Report: {md_path}")

    if args.show_failures and failures:
        print("")
        print("Failure samples:")
        sample_results(failures, args.show_failures)

    return 0 if not failures else 2


if __name__ == "__main__":
    raise SystemExit(main())
