import sys
import os
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
actions_dir = os.path.join(current_dir, "actions")
sys.path.insert(0, actions_dir)

import importlib.util
magical_aliases_dir = os.path.join(actions_dir, "Magical Aliases")
spec = importlib.util.spec_from_file_location("aliases", os.path.join(magical_aliases_dir, "aliases.py"))
aliases_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aliases_module)
LOCATION_ALIASES = aliases_module.LOCATION_ALIASES

from actions import ActionReplyFromJsonHelper
from main_router import MainRouterService

helper = ActionReplyFromJsonHelper()
router = MainRouterService(helper, LOCATION_ALIASES)

test_suites = {
    "1. Admissions & Entrance Exam": {
        "domain": "procedures",
        "questions": [
            "Unsaon pagkahibalo kung nakapasar ko sa BukSU CAT? Asa makita ang rating?",
            "Pila ang cut-off score o required rating para sa Nursing ug BSIT?",
            "Pwede pa ba maka-take ug CAT kung na-miss nako akong schedule sa test permit?",
            "Kung wala ko kapasar sa akong first choice nga course, pwede pa ba ko mo-apply sa lain nga program nga naay slot?",
            "Unsa ang mga bawal ug pwede dalhon sa examination room? Pwede ba mag-calculator?",
            "Unsaon pag-confirm sa Intent to Enroll sa admission portal pagkahuman sa exam?",
            "Naa bay bayad ang entrance exam o application fee sa BukSU?",
            "What should I do if there is an error in my name on the test permit?",
            "Pwede ba mag walk-in application sa BukSU CAT or strictly online lang?",
            "Are incoming first years allowed to take the CAT more than once in a school year?",
            "can i still take admission exam even if i miss my schedule",
        ]
    },
    "2. Freshman Enrollment & Document Submission": {
        "domain": "procedures",
        "questions": [
            "Unsa ang complete list sa requirements nga kinahanglan i-submit sa incoming first year para enrollment?",
            "Kinahanglan ba jud original nga PSA birth certificate or pwede ra certified true copy / photocopy?",
            "Asa dapit i-submit ang Form 138 (report card) ug Good Moral certificate?",
            "Unsaon pag-enroll sa incoming freshmen? Online ba tanan or kinahanglan mo-adto sa campus?",
            "Asa dapit magpa-medical exam ug asa i-pass ang chest X-ray result?",
            "Libre ba gyud tanan tuition under Free Higher Education o naay miscellaneous fee nga bayaran?",
            "Kanus-a ang deadline sa submission sa enrollment requirements para first semester?",
            "Paano po mag-claim ng SIAS account and default password para sa incoming first year?",
            "What happens if late ko makapag-submit ng enrollment documents?",
            "How to enroll if I am a transferee or delayed freshman student?",
        ]
    },
    "3. Campus Navigation & Room Finding": {
        "domain": "location",
        "questions": [
            "Asa dapit ang ComLab 1 ug ComLab 2? Unsa nga building na makita?",
            "Hain dapit ang University Clinic ug Dental Clinic kung magpa-medical checkup?",
            "Asa ang office sa Dean sa College of Technologies (COT) ug CAS?",
            "Asa dapit ang Cashier / Finance Building kung magbayad ug uniform o graduation fee?",
            "Asa ang Registrar Office para magkuha ug Certificate of Registration (COR)?",
            "Naa bay parking area sa motor para sa mga freshmen sulod sa campus?",
            "Asa dapit makit-an ang Guidance and Counseling Office?",
            "Where is the IT / COT Faculty Room located?",
            "How to find the University Library and where is the multimedia section?",
            "Saan po banda ang DXBU and CITL building?",
        ]
    },
    "4. Academic Policies, Grades & Retention": {
        "domain": "academics",
        "questions": [
            "Unsa ang grading system sa BukSU? Pila ang passing grade (75% or 3.0)?",
            "Kung mahagbong ko sa usa ka major subject karong first sem, ma-kick out ba dayon ko?",
            "Pila ka units ang maximum nga pwede kuhaon sa first year first semester?",
            "Unsa ang retention policy ug maintaining grade para sa Board Courses sama sa Nursing ug Accountancy?",
            "Pwede ba mag-shift ug course ang first year pagka-second semester o kinahanglan humanon ang 1 year?",
            "Unsaon pag-qualify sa Dean's List o President's List para sa freshmen?",
            "Ano ang rules kapag may INC (Incomplete) grade ka as a freshman?",
            "What are prerequisites and what happens if I fail a prerequisite subject?",
            "Pwede ba mag-drop ng subject ang first-year student kapag nahihirapan?",
        ]
    },
    "5. Uniform, Dress Code, Dormitory & Campus Life": {
        "domain": "services",
        "questions": [
            "Unsa ang dress code policy sa BukSU? Pwede ba mag-civilian clothes sa first week sa klase?",
            "Asa dapit makapalit ug official school uniform ug PE uniform?",
            "Bawal ba ang colored hair o naay strict haircut policy para sa mga lalaki?",
            "Unsaon pagkuha ug pag-process sa student ID card? Asa magpa-picture?",
            "Unsaon pag-apply sa university dorm sulod sa campus sama sa Mahogany ug Rubia Dorm?",
            "Pila ang binuwan nga bayad ug curfew sa student dormitory sa sulod sa BukSU?",
            "Unsaon pag-connect sa campus Wi-Fi sa BukSU para sa mga estudyante?",
            "Pwede ba makasulod sa library bisan wala pay physical student ID card?",
        ]
    },
    "6. Other Services & Facility Availability": {
        "domain": "others",
        "questions": [
            "Does BukSU have an ATM machine on campus?",
            "Is there a gym in BukSU for student sports?",
            "Does BukSU have a student cafeteria or canteen?",
            "Is there a sports oval or running track in BukSU?",
            "Does BukSU have a museum on campus?",
            "Naa bay dental clinic o dental services sa BukSU?",
            "Does BukSU have an auditorium facility for university events?",
        ]
    }
}

print("="*80)
print("TESTING ALL QUESTIONS THROUGH MAIN ROUTER")
print("="*80)

for suite_name, suite_data in test_suites.items():
    domain = suite_data["domain"]
    print(f"\n\n### {suite_name} (Default Domain: {domain})")
    print("-" * 80)
    for q in suite_data["questions"]:
        latest_message = {
            "text": q,
            "entities": [],
            "intent": {"name": "ask_general_info"}
        }
        slots = {"active_category": domain}
        resp, context = router.route_with_context(
            intent="ask_general_info",
            latest_message=latest_message,
            user_message=q,
            slots=slots
        )
        
        # Format response summary
        resp_text = ""
        if isinstance(resp, dict):
            resp_text = resp.get("text", "")
            if not resp_text and "custom" in resp:
                resp_text = f"[Custom map/choice payload: {resp.get('custom', {}).keys()}]"
        elif isinstance(resp, str):
            resp_text = resp
        elif isinstance(resp, list):
            resp_text = " | ".join(str(r) for r in resp)
        else:
            resp_text = str(resp)
            
        first_line = resp_text.split("\n")[0] if resp_text else "[NO RESPONSE]"
        intent_matched = router.knowledge_router.last_selected_intent or context.get("last_intent") or context.get("last_topic") or "[None]"
        print(f"Q: {q}")
        print(f"   Intent: {intent_matched}")
        print(f"   Resp: {first_line[:120]}...")
        print()
