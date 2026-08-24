import json
import os
import glob

supper_dir = os.path.join("rasa", "actions", "Supper Saiyan")
knowledge_dir = os.path.join("rasa", "actions", "knowledge")

def harvest_hierarchy(data):
    """Harvest all nodes with their full path (file, parent, topic) -> responses."""
    nodes = {}
    for t in data.get("topics", []):
        t_key = t.get("topic")
        if t.get("responses"):
            nodes[t_key] = t.get("responses")
        for sub in t.get("subtopics", []):
            sub_key = f"{t_key} -> {sub.get('topic')}"
            if sub.get("responses"):
                nodes[sub_key] = sub.get("responses")
    return nodes

# 1. Harvest from Supper Saiyan
orig_nodes = {}
for f in sorted(glob.glob(os.path.join(supper_dir, "*.json"))):
    fname = os.path.basename(f)
    with open(f, "r", encoding="utf-8") as fp:
        data = json.load(fp)
    file_nodes = harvest_hierarchy(data)
    for k, resp in file_nodes.items():
        orig_nodes[f"{fname} :: {k}"] = resp

# 2. Harvest from new knowledge folder
dist_nodes = {}
for cat in sorted(os.listdir(knowledge_dir)):
    cat_path = os.path.join(knowledge_dir, cat)
    if os.path.isdir(cat_path):
        for jf in sorted(glob.glob(os.path.join(cat_path, "*.json"))):
            jfname = os.path.basename(jf)
            if jfname == "responses_location_core.json":
                continue
            with open(jf, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            file_nodes = harvest_hierarchy(data)
            for k, resp in file_nodes.items():
                dist_nodes[k] = resp

print(f"Total original unique topic nodes with responses: {len(orig_nodes)}")
print(f"Total distributed unique topic nodes with responses: {len(dist_nodes)}")

# Check each original node exists with EXACT matching English and Cebuano responses in distribution
mismatches = 0
for orig_full_key, orig_resp in orig_nodes.items():
    # extract topic path without file prefix
    topic_path = orig_full_key.split(" :: ")[1]
    dist_resp = dist_nodes.get(topic_path)
    if not dist_resp:
        print(f"[MISSING] {orig_full_key}")
        mismatches += 1
        continue
    
    if orig_resp.get("en", []) != dist_resp.get("en", []):
        print(f"[EN MISMATCH] {orig_full_key}")
        mismatches += 1
    if orig_resp.get("ceb", []) != dist_resp.get("ceb", []):
        print(f"[CEB MISMATCH] {orig_full_key}")
        mismatches += 1

if mismatches == 0:
    print(f"\n[PERFECT VERBATIM MATCH] All {len(orig_nodes)} topic and subtopic nodes have 100% exact English and Cebuano responses with ZERO dropped or truncated text!")
else:
    print(f"\n[WARNING] Found {mismatches} mismatches.")
