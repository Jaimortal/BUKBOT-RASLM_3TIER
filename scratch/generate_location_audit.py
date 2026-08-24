import json
import os

fac_path = os.path.join("rasa", "actions", "knowledge", "location", "facility_locations.json")
loc_path = os.path.join("rasa", "actions", "knowledge", "location", "responses_location_core.json")

with open(fac_path, "r", encoding="utf-8") as fp:
    fac_data = json.load(fp)

with open(loc_path, "r", encoding="utf-8") as fp:
    loc_data = json.load(fp)

loc_dict = loc_data.get("locations", {})

lines = []
lines.append("# Location Category: Facility Audit & Cross-Reference Document\n\n")
lines.append("This document records the audit of all 17 topics from `Facilities_info.json` (`facility_locations.json`) against `responses_location_core.json`.\n\n")
lines.append("## 📊 Cross-Reference Matrix\n\n")
lines.append("| Facility Topic | Subject Terms | Status in `responses_location_core.json` | Coordinates / Map Pin |\n")
lines.append("| :--- | :--- | :--- | :--- |\n")

topics = fac_data.get("topics", [])
audit_details = []

for t in topics:
    topic_name = t.get("topic")
    display_name = t.get("display_name", topic_name)
    subject_terms = t.get("subject_terms", [])
    responses = t.get("responses", {})
    
    # Search for matching keys in loc_dict
    matched_keys = []
    for k, v in loc_dict.items():
        term_matched = any(st.lower() in k.lower() for st in subject_terms)
        building_matched = any(st.lower() in str(v.get("building", "")).lower() for st in subject_terms)
        if term_matched or building_matched:
            matched_keys.append(k)
    
    if matched_keys:
        primary_match = matched_keys[0]
        match_info = loc_dict[primary_match]
        coords = match_info.get("coordinates")
        building = match_info.get("building")
        floor = match_info.get("floor")
        status = f"✅ Exists as `{primary_match}` ({building}, {floor})"
        coord_str = f"`{coords}` (Pins: {len(match_info.get('pins', []))})"
    else:
        status = "⚠️ Textual Only (No Map Pin in Core)"
        coord_str = "None"
    
    terms_str = ", ".join(subject_terms[:3])
    lines.append(f"| **{display_name}** (`{topic_name}`) | {terms_str} | {status} | {coord_str} |\n")
    
    audit_details.append({
        "topic": topic_name,
        "display_name": display_name,
        "subject_terms": subject_terms,
        "responses": responses,
        "matched_location_keys": matched_keys,
        "has_map_pin": bool(matched_keys)
    })

lines.append("\n---\n\n## 📝 Preserved Archive of Facility Topics & Full Responses\n\n")
for item in audit_details:
    lines.append(f"### {item['display_name']} (`{item['topic']}`)\n\n")
    lines.append(f"* **Subject Terms**: {', '.join(item['subject_terms'])}\n")
    lines.append(f"* **Matched Map Locations**: {item['matched_location_keys'] or ['None']}\n")
    lines.append("* **English Response**:\n")
    for r in item['responses'].get('en', []):
        lines.append(f"  > {r}\n")
    lines.append("* **Cebuano Response**:\n")
    for r in item['responses'].get('ceb', []):
        lines.append(f"  > {r}\n")
    lines.append("\n")

out_file = os.path.join("rasa", "actions", "knowledge", "location", "LOCATION_FACILITIES_AUDIT.md")
with open(out_file, "w", encoding="utf-8") as fp:
    fp.writelines(lines)

print("Generated LOCATION_FACILITIES_AUDIT.md successfully!")
