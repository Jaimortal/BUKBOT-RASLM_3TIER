import os
import sys
import importlib.util

sys.path.insert(0, os.path.join(os.getcwd(), "rasa", "actions"))

from main_router import MainRouterService
from actions import ActionReplyFromJsonHelper

actions_dir = os.path.join(os.getcwd(), "rasa", "actions")
magical_aliases_dir = os.path.join(actions_dir, "Magical Aliases")
spec = importlib.util.spec_from_file_location("aliases", os.path.join(magical_aliases_dir, "aliases.py"))
aliases_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aliases_module)
LOCATION_ALIASES = aliases_module.LOCATION_ALIASES

def main():
    helper = ActionReplyFromJsonHelper()
    router = MainRouterService(helper, LOCATION_ALIASES)

    tests = [
        ("where can i see the cob faculty room", "COB Faculty Room Location"),
        ("where is COT faculty room", "COT Faculty Room Location"),
        ("location of registrar office", "Registrar Location"),
        ("who to talk to about class concerns", "Classroom Concerns"),
        ("can i eat inside classroom", "Eating in Classroom"),
        ("is cellphone allowed in class", "Phone in Class"),
        ("how to get student id", "Student ID Process"),
    ]

    print("=" * 70)
    print("VERIFYING ROUTING PRECISION ACROSS LOCATIONS & POLICIES")
    print("=" * 70)

    for query, expected in tests:
        response, _ = router.route_with_context("ask_general_info", {"text": query}, query, {})
        text_resp = ""
        if isinstance(response, dict):
            text_resp = response.get("text") or str(response.get("response")) or str(response)
        else:
            text_resp = str(response)

        print(f"\n[QUERY]: '{query}' (Expect: {expected})")
        print(f"  -> OUTPUT: {text_resp[:120]}...")

if __name__ == "__main__":
    main()
