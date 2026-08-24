import json
import os
import glob

supper_dir = os.path.join("rasa", "actions", "Supper Saiyan")
files = sorted(glob.glob(os.path.join(supper_dir, "*.json")))

summary = {}

for f in files:
    filename = os.path.basename(f)
    with open(f, "r", encoding="utf-8") as fp:
        data = json.load(fp)
    topics = data.get("topics", [])
    topic_list = []
    for t in topics:
        subtopics = [s.get("topic") for s in t.get("subtopics", [])]
        topic_list.append({
            "topic": t.get("topic"),
            "display_name": t.get("display_name"),
            "subtopics": subtopics
        })
    summary[filename] = {
        "intent": data.get("intent"),
        "category": data.get("category"),
        "topics": topic_list
    }

with open("scratch/supper_saiyan_inventory.json", "w", encoding="utf-8") as fp:
    json.dump(summary, fp, indent=2)

print(f"Inventoried {len(files)} files.")
for f, info in summary.items():
    print(f"=== {f} ===")
    for t in info["topics"]:
        sub_str = f" ({len(t['subtopics'])} subtopics: {', '.join(t['subtopics'][:3])}...)" if t["subtopics"] else ""
        print(f"  * {t['topic']}{sub_str}")
