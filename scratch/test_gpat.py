import sys
import os

actions_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rasa", "actions")
if actions_dir not in sys.path:
    sys.path.insert(0, actions_dir)
from main_router import MainRouterService

router = MainRouterService()

test_queries = [
    ('tell me what do i need for admission testing graduate program', 'ask_requirement'),
    ('what do i need for the admission testing for graduate program', 'ask_requirement'),
    ('How do I apply for the Graduate Program Admission Test (GPAT) at Bukidnon State University?', 'ask_process'),
    ('What are the application requirements for BukSU graduate school admissions?', 'ask_requirement'),
    ('How much is the admission testing fee for BukSU graduate studies?', 'ask_fee'),
    ('unsa may mga kinahanglan sa pag apply sa admission testing graduate program', 'ask_requirement'),
    ('what do i need for admission testing application graduate program', 'ask_requirement'),
    ('gpat admission requirements', 'ask_requirement'),
    ('unsa requirements for gpat', 'ask_requirement'),
    ('unsa kailangan sa gpat', 'ask_requirement'),
    ('what are the requirements for graduate admission test', 'ask_requirement'),
    ('how much is gpat fee', 'ask_fee'),
    ('pila bayad sa gpat', 'ask_fee'),
    ('unsaon pag apply sa gpat', 'ask_process'),
    ('when is the graduate admission exam schedule', 'ask_schedule')
]

print("=" * 80)
print("TESTING GPAT ADMISSION REQUIREMENT QUERIES")
print("=" * 80)
all_pass = True
for q, intent in test_queries:
    res, slots = router.route_with_context(intent, {}, q, {})
    matched = router.knowledge_router.last_selected_intent
    text_snippet = (res.get('text', '') if isinstance(res, dict) else str(res))[:100].replace('\n', ' ')
    is_ok = matched == 'gpat_admission_requirements'
    status = 'PASS' if is_ok else 'FAIL'
    if not is_ok:
        all_pass = False
    print(f"[{status}] Query ({intent}): '{q}'")
    print(f"       Matched Intent: {matched}")
    print(f"       Response Preview: {text_snippet}...")
    print()

if all_pass:
    print("=" * 80)
    print("ALL 15/15 GPAT TESTS PASSED WITH 100% ACCURACY!")
    print("=" * 80)
else:
    print("SOME TESTS FAILED!")
    sys.exit(1)

