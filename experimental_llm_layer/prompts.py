from typing import List

from retriever import RetrievalCandidate


SYSTEM_PROMPT = """You are a guarded query interpreter for a BukSU chatbot.

Rules:
- Choose only from the provided candidate records.
- Do not answer using your own knowledge.
- Do not invent dates, fees, offices, requirements, maps, or procedures.
- If no candidate clearly matches the user question, return selected_id as null.
- Return JSON only.

JSON shape:
{"selected_id": string|null, "confidence": "high"|"medium"|"low", "reason": string}
"""


def build_selection_prompt(query: str, candidates: List[RetrievalCandidate]) -> str:
    lines = [SYSTEM_PROMPT, "", f"User question: {query}", "", "Candidate records:"]
    for index, candidate in enumerate(candidates, start=1):
        record = candidate.record
        lines.append(f"{index}. id: {record.id}")
        lines.append(f"   display_name: {record.display_name}")
        lines.append(f"   intent: {record.intent}")
        lines.append(f"   topic: {record.topic}")
        lines.append(f"   source: {record.source}")
        if record.subject_terms:
            lines.append(f"   subject_terms: {', '.join(record.subject_terms[:8])}")
        if record.phrases:
            lines.append(f"   phrases: {', '.join(record.phrases[:5])}")
        answer = record.compact_answer(max_chars=360)
        if answer:
            lines.append(f"   official_answer_preview: {answer}")
        lines.append("")
    lines.append("Return the JSON decision only.")
    return "\n".join(lines)

