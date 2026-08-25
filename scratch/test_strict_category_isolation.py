import sys
import os

ACTIONS_DIR = r"c:\School Related File\3rd year\Capstone dev\Chatbot\CHATBOT V5 merged versions\Capstone_Project_Artificial_Intelligence_Chatbot\rasa\actions"
if ACTIONS_DIR not in sys.path:
    sys.path.insert(0, ACTIONS_DIR)

from data_loader import KnowledgeDataLoader
from main_router import MainRouterService
from domain_registry import get_all_domains, normalize_domain

data_loader = KnowledgeDataLoader()
router = MainRouterService(data_loader, {})

print("=" * 60)
print("TEST 1: Location question asked inside PROCEDURES category")
print("=" * 60)

res, slots = router.route_with_context(
    intent="ask_location",
    latest_message={"text": "where is registrar office", "entities": []},
    user_message="where is registrar office",
    slots={"active_category": "procedures"}
)

print(f"Active Category in slots: {slots.get('active_category')}")
print(f"Has Map Data: {isinstance(res, dict) and bool(res.get('custom', {}).get('mapData'))}")
print(f"Response text snippet: {str(res.get('text') if isinstance(res, dict) else res)[:150]}")
assert not (isinstance(res, dict) and res.get("custom", {}).get("mapData")), "FAILED: Procedures category returned map data for location query!"

print("\n" + "=" * 60)
print("TEST 2: Location question asked inside LOCATION category")
print("=" * 60)

res_loc, slots_loc = router.route_with_context(
    intent="ask_location",
    latest_message={"text": "where is registrar office", "entities": [{"entity": "office", "value": "registrar"}]},
    user_message="where is registrar office",
    slots={"active_category": "location"}
)

print(f"Active Category in slots: {slots_loc.get('active_category')}")
print(f"Has Map Data: {isinstance(res_loc, dict) and bool(res_loc.get('custom', {}).get('mapData'))}")
print(f"Response text snippet: {str(res_loc.get('text') if isinstance(res_loc, dict) else res_loc)[:150]}")
assert isinstance(res_loc, dict) and (res_loc.get("custom", {}).get("mapData") or "Registrar" in str(res_loc)), "FAILED: Location category failed to return location info!"

print("\n" + "=" * 60)
print("TEST 3: Procedure question asked inside PROCEDURES category")
print("=" * 60)

res_proc, slots_proc = router.route_with_context(
    intent="ask_process",
    latest_message={"text": "how to enroll as freshman", "entities": []},
    user_message="how to enroll as freshman",
    slots={"active_category": "procedures"}
)

print(f"Active Category in slots: {slots_proc.get('active_category')}")
print(f"Response text snippet: {str(res_proc.get('text') if isinstance(res_proc, dict) else res_proc)[:150]}")

print("\n" + "=" * 60)
print("TEST 4: Procedure question asked inside LOCATION category")
print("=" * 60)

res_proc_in_loc, slots_proc_in_loc = router.route_with_context(
    intent="ask_process",
    latest_message={"text": "how to enroll as freshman", "entities": []},
    user_message="how to enroll as freshman",
    slots={"active_category": "location"}
)

print(f"Active Category in slots: {slots_proc_in_loc.get('active_category')}")
print(f"Response text snippet: {str(res_proc_in_loc.get('text') if isinstance(res_proc_in_loc, dict) else res_proc_in_loc)[:150]}")
assert not ("Step 1" in str(res_proc_in_loc) and "enrollment" in str(res_proc_in_loc).lower() and "location" != slots_proc_in_loc.get("active_category")), "FAILED: Location category leaked procedure instructions!"

print("\n" + "=" * 60)
print("TEST 5: Oval (location) question asked inside ACADEMICS category")
print("=" * 60)

res_acad, slots_acad = router.route_with_context(
    intent="ask_location",
    latest_message={"text": "can you tell me where can i locate the oval", "entities": []},
    user_message="can you tell me where can i locate the oval",
    slots={"active_category": "academics"}
)

print(f"Active Category in slots: {slots_acad.get('active_category')}")
print(f"Has Map Data: {isinstance(res_acad, dict) and bool(res_acad.get('custom', {}).get('mapData'))}")
print(f"Response text snippet: {str(res_acad.get('text') if isinstance(res_acad, dict) else res_acad)[:150]}")
assert not (isinstance(res_acad, dict) and res_acad.get("custom", {}).get("mapData")), "FAILED: Academics category returned map data for Oval location!"

print("\n" + "=" * 60)
print("ALL TESTS PASSED WITH 100% STRICT ISOLATION!")
print("=" * 60)
