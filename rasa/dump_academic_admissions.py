import os, json

ss_dir = r'c:\School Related File\3rd year\Capstone dev\Chatbot\CHATBOT V5 merged versions\Capstone_Project_Artificial_Intelligence_Chatbot\rasa\actions\Supper Saiyan'

def dump_file(filename):
    with open(os.path.join(ss_dir, filename), 'r', encoding='utf-8') as fp:
        data = json.load(fp)
    
    def walk(obj):
        if isinstance(obj, dict):
            t = obj.get('topic') or obj.get('intent')
            d = obj.get('display_name', '')
            resps = obj.get('responses', {})
            if resps and isinstance(resps, dict):
                en = resps.get('en', [])
                ceb = resps.get('ceb', [])
                print(f"[{t}] Display: '{d}'")
                if en:
                    print("  EN:", (en[0] if isinstance(en, list) else en)[:120])
                if ceb:
                    print("  CEB:", (ceb[0] if isinstance(ceb, list) else ceb)[:120])
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for i in obj:
                walk(i)
                
    print("="*80)
    print(f"FILE: {filename}")
    print("="*80)
    walk(data)

dump_file("Academic_policy.json")
dump_file("Admissions_info.json")
dump_file("Dormitory_info.json")
