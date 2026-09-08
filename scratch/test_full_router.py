import os
import sys
import importlib.util

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

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

    queries = [
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
        "pe unifrom not available yet what to wear",
        "unsay suoton kung walay pe uniform",
        "pwede ba mag t-shirt sa PE",
        "what to wear if no pe uniform yet"
    ]

    print("=" * 70)
    print("TESTING FULL ROUTING ENGINE WITH PE UNIFORM QUERIES")
    print("=" * 70)

    for q in queries:
        resp, _ = router.route_with_context("ask_general_info", {"text": q}, q, {})
        text_resp = ""
        if isinstance(resp, dict):
            text_resp = resp.get("text") or str(resp.get("response")) or str(resp)
        else:
            text_resp = str(resp)

        clean_text = text_resp.encode('ascii', 'replace').decode('ascii')
        route_label = "[OTHER/FALLBACK]"
        if "walay gipahayag nga gidili" in text_resp or "no rule prohibiting" in text_resp:
            route_label = "[OLD PE POLICY]"
        elif "white shirt" in text_resp.lower() or "jogging pants" in text_resp.lower():
            route_label = "[TEMPORARY PE ATTIRE]"

        print(f"\n[QUERY]: '{q}'")
        print(f"  -> ROUTED TO: {route_label}")
        print(f"  -> PREVIEW: {clean_text[:120]}...")

    print("\n" + "=" * 70)
    print("PE UNIFORM ROUTING TEST COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()
