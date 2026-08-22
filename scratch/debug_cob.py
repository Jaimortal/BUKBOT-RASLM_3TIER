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
    kr = router.knowledge_router

    query = "where can i see the cob faculty room"
    norm = kr.interpreter.normalize(query)
    print(f"Query: {query}")
    print(f"Normalized: {norm}")

    direct = kr.direct_intent_override("ask_general_info", query, [])
    print(f"direct_intent_override('ask_general_info', ...): {direct}")

    best = kr.find_best_response("ask_general_info", query, [])
    print(f"find_best_response('ask_general_info', ...): {best}")

    # Check retrieval scorer matches
    results = kr.retrieval_scorer.score_query(norm, intent="ask_general_info")
    print(f"\nTop 5 Scorer Results for '{norm}':")
    for r in results[:5]:
        print(f"  - Intent: {r.intent}, Score: {r.score}, Matched Phrase: {r.matched_phrase}")

if __name__ == "__main__":
    main()
