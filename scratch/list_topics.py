import json
import glob

files = sorted(glob.glob('rasa/actions/knowledge/procedures/*.json'))
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        data = json.load(fp)
    print(f"\n=======================================================")
    print(f"File: {f}")
    print(f"Category: {data.get('category')} | Intent: {data.get('intent')}")
    print(f"Total Topics: {len(data.get('topics', []))}")
    print(f"=======================================================")
    for i, t in enumerate(data.get('topics', [])):
        intents = [st.get('intent') for st in t.get('subtopics', [])]
        print(f"  {i+1}. Topic Key: '{t.get('topic')}' | Display: '{t.get('display_name')}' | Intents: {intents}")
