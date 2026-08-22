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

    user_query = "where can i see the cob faculty room"

    # Test with different Rasa predicted intents
    intents = [
        "ask_location",
        "ask_general_info",
        "ask_process",
        "ask_facility_availability",
        "nlu_fallback",
        "out_of_scope",
        "default_ask",
        "affirm",
    ]

    print("=" * 70)
    print(f"TESTING QUERY: '{user_query}'")
    print("=" * 70)

    # 1. Check Entity Resolver
    resolved = router.entity_resolver.resolve({"text": user_query}, user_query)
    print(f"Entity Resolver Resolved Locations: {resolved.locations}")
    print(f"Entity Resolver Resolved Values: {resolved.values}")

    # 2. Check each intent routing
    for intent in intents:
        response, slots = router.route_with_context(intent, {"text": user_query}, user_query, {})
        text_resp = ""
        if isinstance(response, dict):
            text_resp = response.get("text") or str(response.get("response")) or str(response)
        else:
            text_resp = str(response)

        print(f"\n--- Intent: [{intent}] ---")
        print(f"Response: {text_resp[:180]}...")
        if isinstance(response, dict) and "mapData" in response:
            print(f"Map Attached: {response['mapData']['locationName']}")

if __name__ == "__main__":
    main()
