import os
import sys

# Add rasa/actions to python path
sys.path.insert(0, os.path.join(os.getcwd(), "rasa", "actions"))

import importlib.util

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

    test_queries = [
        # User's exact queries from prompt
        "pwedi rakaha gamiton ang daan nga PE uniform",
        "am i allowed to use the old pe uniform",
        "can i still use my old pe uniform",
        "pe nako kay daan okay rakaha ni",
        "is it allowed to use old pe",
        "daan na pe akong gamiton okay rakaha",
        "pwedi raning daan na pe gamiton",
        "pwede ba daan nga PE unifrom",
        "uniform PE daan okay ra ba",
        "Buksu PE uniform old pwede ba",
        "what if i wear jogging pants in pe class",
        "white upper for physical education",
        # Control queries to make sure buying/requesting PE uniform still routes to process
        "how to get pe uniform",
        "where to buy pe uniform",
        "where to pay pe uniform",
        "unsaon pagkuha og pe uniform",
    ]

    print("=" * 70)
    print("TESTING FULL ROUTING ENGINE WITH PE UNIFORM QUERIES")
    print("=" * 70)

    for query in test_queries:
        response, _ = router.route_with_context("ask_process", {"text": query}, query, {})
        text_resp = ""
        if isinstance(response, dict):
            # Check for structured or text responses
            if "text" in response:
                text_resp = response["text"]
            elif "response" in response:
                text_resp = str(response["response"])
            else:
                text_resp = str(response)
        elif isinstance(response, str):
            text_resp = response
        else:
            text_resp = str(response)

        is_old_pe = "Under BukSU guidelines" in text_resp or "Ubos sa mga lagda sa BukSU" in text_resp or "jogging pants" in text_resp or "daan nga PE" in text_resp
        is_process = "University Press" in text_resp or "Finance Office" in text_resp

        category = "OLD PE POLICY" if is_old_pe else ("BUY/PROCESS" if is_process else "OTHER/FALLBACK")
        print(f"\n[QUERY]: '{query}'")
        print(f"  -> ROUTED TO: [{category}]")
        print(f"  -> PREVIEW: {text_resp[:160]}...")

    print("\n" + "=" * 70)
    print("ROUTING TEST FINISHED")
    print("=" * 70)

if __name__ == "__main__":
    main()
