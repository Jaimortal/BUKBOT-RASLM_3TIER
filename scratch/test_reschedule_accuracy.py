import sys, os
sys.path.insert(0, os.path.abspath('rasa/actions'))
from main_router import MainRouterService
from actions import ActionReplyFromJsonHelper
import importlib.util

spec = importlib.util.spec_from_file_location('aliases', 'rasa/actions/Magical Aliases/aliases.py')
aliases_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aliases_module)

helper = ActionReplyFromJsonHelper()
router = MainRouterService(helper, aliases_module.LOCATION_ALIASES)

tests = [
    # 1. Target queries from user
    ('can i still change my testing site even though its approved?', 'reschedule_entrance_exam'),
    ('pwedi bakaha nako ni i change akong schedule sa admission?', 'reschedule_entrance_exam'),
    ('am i allowed to modify my schedule for examination testing date?', 'reschedule_entrance_exam'),
    ('gusto nako i modify ning akoang mga schedule sa admission, pwedi pa kaha ni?', 'reschedule_entrance_exam'),
    ('allowed ba i change atong testing date kong wala nahumana kog approved?', 'reschedule_entrance_exam'),
    
    # 2. Additional testing site and reschedule patterns
    ('can i change my testing center after approval?', 'reschedule_entrance_exam'),
    ('pwede pa ba usbon akong testing site?', 'reschedule_entrance_exam'),
    ('pwede ba ilisan ang testing center kung approved na?', 'reschedule_entrance_exam'),
    ('change testing venue once approved', 'reschedule_entrance_exam'),
    ('unsaon pag reschedule sa entrance exam', 'reschedule_entrance_exam'),
    ('how to change my entrance exam schedule', 'reschedule_entrance_exam'),
    
    # 3. Potentially overlapping intents verification
    ('admission schedule', '__admission_schedule_clarification__'),
    ('schedule sa admission', '__admission_schedule_clarification__'),
    ('when is the actual examination date', 'admission_examination_date'),
    ('where can i see my exam date', 'admission_examination_date'),
    ('start date of BukSU CAT application', 'online_application_schedule'),
    ('can i change my program after submitting the buksu cat application', 'change_program_after_application'),
    ('how to change my admission password', 'Change_Pass_admission'),
    ('what if i missed my buksu cat exam schedule', 'missed_buksu_cat_schedule'),
    ('can i still enroll on the main campus even though i take an entrance exam on satellite campus', 'exam_location_vs_campus'),
]

passed = 0
failed = 0
results = []

for q, expected in tests:
    direct = router.knowledge_router.direct_intent_override('', q, [])
    res, slots = router.route_with_context('', {'text': q, 'intent': {'name': 'ask_schedule'}}, q, {})
    selected = getattr(router.knowledge_router, 'last_selected_intent', None) or direct
    
    ok = (selected == expected) or (expected == '__admission_schedule_clarification__' and (direct == expected or (isinstance(res, dict) and ('Unsang admission schedule' in str(res.get('text', '')) or 'Which admission schedule' in str(res.get('text', ''))))))
    if ok:
        passed += 1
        status = 'PASS'
    else:
        failed += 1
        status = f'FAIL (expected {expected}, got {selected})'
    results.append((status, q, selected, expected))
    print(f'[{status}] "{q}" -> {selected}')

print(f'\n==================================================')
print(f'TOTAL: {len(tests)} | PASSED: {passed} | FAILED: {failed} | ACCURACY: {(passed/len(tests))*100:.1f}%')
print(f'==================================================')

