import json
import sys

with open('scratch/phase1_test_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

summary = data['summary']
results = data['results']

print('='*70)
print('OVERALL TEST METRICS')
print('='*70)
print(f"Total Questions Tested:         {summary['total_tests']}")
print(f"Answered with Right Data:       {summary['right_data']} ({summary['right_data']/summary['total_tests']*100:.1f}%)")
print(f"Answered with Wrong Data:       {summary['wrong_data']} ({summary['wrong_data']/summary['total_tests']*100:.1f}%)")
print(f"Answered with Fallback Choices: {summary['fallback_choices']} ({summary['fallback_choices']/summary['total_tests']*100:.1f}%)")
print(f"Answered with No Data Fallback: {summary['no_data_fallback']} ({summary['no_data_fallback']/summary['total_tests']*100:.1f}%)")
print(f"Answered by RASA:               {summary['answered_by_rasa']} ({summary['answered_by_rasa']/summary['total_tests']*100:.1f}%)")
print(f"Answered by LLM (Reranker):     {summary['answered_by_llm']} ({summary['answered_by_llm']/summary['total_tests']*100:.1f}%)")
print(f"English Language Accuracy:      {summary['english_right']}/{summary['english_total']} ({summary['english_right']/summary['english_total']*100:.1f}%)")
print(f"Bisaya Language Accuracy:       {summary['bisaya_right']}/{summary['bisaya_total']} ({summary['bisaya_right']/summary['bisaya_total']*100:.1f}%)")

print('\n' + '='*70)
print('PER-TOPIC BREAKDOWN')
print('='*70)

topics = {}
for r in results:
    tid = r['topic_id']
    if tid not in topics:
        topics[tid] = {
            'name': r['topic_name'],
            'total': 0, 'right': 0, 'wrong': 0, 'choices': 0, 'no_data': 0,
            'rasa': 0, 'llm': 0,
            'en_right': 0, 'ceb_right': 0,
            'wrong_cases': []
        }
    t = topics[tid]
    t['total'] += 1
    if r['outcome'] == 'Answered with Right Data':
        t['right'] += 1
        if r['language'] == 'English':
            t['en_right'] += 1
        else:
            t['ceb_right'] += 1
    elif r['outcome'] == 'Answered with Wrong Data':
        t['wrong'] += 1
        t['wrong_cases'].append(r)
    elif r['outcome'] == 'Answered with Fallback Choices':
        t['choices'] += 1
    elif r['outcome'] == 'Answered with No Data Fallback':
        t['no_data'] += 1
        
    if r['responder'] == 'RASA':
        t['rasa'] += 1
    else:
        t['llm'] += 1

for tid, t in sorted(topics.items()):
    acc = t['right']/t['total']*100
    print(f"Topic {tid:02d}: {t['name'][:48]:<48} | Acc: {acc:5.1f}% ({t['right']}/{t['total']}) | EN: {t['en_right']:02d}/10 | CEB: {t['ceb_right']:02d}/10 | RASA: {t['rasa']:02d} | LLM: {t['llm']:02d}")

print('\n' + '='*70)
print('DETAILED ANALYSIS OF MISROUTED / WRONG DATA CASES:')
print('='*70)
for tid, t in sorted(topics.items()):
    if t['wrong_cases']:
        print(f"\n--- Topic {tid:02d}: {t['name']} ({len(t['wrong_cases'])} cases) ---")
        for idx, wc in enumerate(t['wrong_cases'], 1):
            clean_snippet = wc['response_preview'].encode('ascii', errors='replace').decode('ascii')
            print(f"  [{idx}] ({wc['language']}) Pattern: {wc['pattern']}")
            print(f"      Query: \"{wc['query']}\"")
            print(f"      Matched Intent: {wc['matched_intent']} | Responder: {wc['responder']}")
            print(f"      Snippet: {clean_snippet[:90]}...")
