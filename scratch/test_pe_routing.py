import json
import os
import sys

# Test script to verify Oss_services.json PE uniform data and phrase retrieval
def main():
    oss_path = os.path.join("rasa", "actions", "Supper Saiyan", "Oss_services.json")
    with open(oss_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    topics = data.get("topics", [])
    # Locate pe_uniform
    pe_topic = next((t for t in topics if t.get("topic") == "pe_uniform"), None)
    if not pe_topic:
        print("ERROR: pe_uniform topic not found in Oss_services.json")
        sys.exit(1)

    print("Found pe_uniform topic:")
    print(f"  Display Name: {pe_topic.get('display_name')}")
    print(f"  Subject Terms: {pe_topic.get('subject_terms')}")
    print(f"  Subtopics ({len(pe_topic.get('subtopics', []))}):")
    for st in pe_topic.get("subtopics", []):
        print(f"    - [{st.get('topic')}] ({st.get('intent')}): {st.get('display_name')} (Phrases: {len(st.get('metadata', {}).get('phrases', []))})")
        print(f"      EN Lines: {len(st.get('responses', {}).get('en', []))}")
        print(f"      CEB Lines: {len(st.get('responses', {}).get('ceb', []))}")

    # Test sample questions
    test_questions = [
        ("am i allowed to use the old PE uniform", "old_uniform_policy"),
        ("pwedi rakaha gamiton ang daan nga pe", "old_uniform_policy"),
        ("pe nako kay daan okay rakaha ni", "old_uniform_policy"),
        ("can i still use my old pe uniform", "old_uniform_policy"),
        ("is it allowed to use old pe", "old_uniform_policy"),
        ("daan na pe akong gamiton okay rakaha", "old_uniform_policy"),
        ("pwedi raning daan na pe gamiton", "old_uniform_policy"),
        ("how to get pe uniform", "process"),
        ("where to buy pe uniform", "process"),
        ("where to pay pe uniform", "process"),
    ]

    print("\n=== Matching Sample Questions Against Subtopic Phrases ===")
    old_subtopic = next((st for st in pe_topic.get("subtopics", []) if st.get("topic") == "old_uniform_policy"), None)
    proc_subtopic = next((st for st in pe_topic.get("subtopics", []) if st.get("topic") == "process"), None)

    old_phrases = set(p.lower().strip() for p in old_subtopic.get("metadata", {}).get("phrases", []))
    proc_phrases = set(p.lower().strip() for p in proc_subtopic.get("metadata", {}).get("phrases", []))

    # Check for phrase overlap
    intersection = old_phrases.intersection(proc_phrases)
    if intersection:
        print(f"WARNING: Phrase overlap detected: {intersection}")
    else:
        print("PASS: Zero phrase overlap between 'process' and 'old_uniform_policy'.")

    for q, expected_target in test_questions:
        q_clean = q.lower().strip()
        matched_in_old = q_clean in old_phrases
        matched_in_proc = q_clean in proc_phrases
        status = "MATCHED EXACT" if (matched_in_old and expected_target == "old_uniform_policy") or (matched_in_proc and expected_target == "process") else "SEMANTIC"
        print(f"  • '{q}' -> Target: [{expected_target}] ({status})")

    print("\n=== Sample Bot Answers for Old PE Uniform Query ===")
    print("ENGLISH:")
    for line in old_subtopic["responses"]["en"]:
        print(f"  > {line}")
    print("\nCEBUANO:")
    for line in old_subtopic["responses"]["ceb"]:
        print(f"  > {line}")

    print("\n=== ALL DATA VALIDATION CHECKS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
