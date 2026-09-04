import sys
import os

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "rasa", "actions"))
from data_loader import KnowledgeDataLoader
from entity_resolver import EntityResolver
import importlib.util

spec = importlib.util.spec_from_file_location("aliases", os.path.join(os.path.dirname(__file__), "..", "rasa", "actions", "Magical Aliases", "aliases.py"))
aliases_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aliases_mod)
LOCATION_ALIASES = aliases_mod.LOCATION_ALIASES

def test_enrollment_schedule():
    print("--- Testing Enrollment Schedule ---")
    loader = KnowledgeDataLoader()
    
    # Check English response
    en_resp = loader.get_response("enrollment_time_schedule", "when is enrollment schedule")
    print("\nEnglish Response:\n", en_resp.get("text"))
    full_en = "\n".join(en_resp["text"]) if isinstance(en_resp["text"], list) else str(en_resp["text"])
    
    assert "Enrollment Schedule for SY 2026-2027" in full_en
    assert "July 1 - 31, 2026" in full_en
    assert "https://www.facebook.com/BSURegistrar" in full_en
    
    # Check Cebuano response
    ceb_resp = loader.get_response("enrollment_time_schedule", "kanus-a ang schedule sa enrollment")
    print("\nCebuano Response:\n", ceb_resp.get("text"))
    full_ceb = "\n".join(ceb_resp["text"]) if isinstance(ceb_resp["text"], list) else str(ceb_resp["text"])
        
    assert "Enrollment Schedule para sa SY 2026-2027" in full_ceb
    assert "July 1 - 31, 2026" in full_ceb
    assert "https://www.facebook.com/BSURegistrar" in full_ceb
    print("\n[PASSED] Enrollment schedule tests passed!")

def test_cpag_sbo():
    print("\n--- Testing CPAG SBO Resolution & Response ---")
    resolver = EntityResolver(LOCATION_ALIASES)
    loader = KnowledgeDataLoader()
    
    test_queries = [
        "where is cpag sbo",
        "where is the cpag sbo office",
        "coa sbo",
        "coa sbo office",
        "sbo cpag",
        "cpag student body organization",
        "where is cpag sbo in cpag building"
    ]
    
    for q in test_queries:
        locs = resolver.locations_from_text(q)
        filtered = resolver._filter_conflicting_locations(locs)
        print(f"Query: '{q}' -> Resolved: {locs} -> Filtered: {filtered}")
        assert "CPAG SBO Office" in filtered or "CPAG SBO Office" in locs, f"Failed for query '{q}'"
        
    # Check location data
    loc_data = loader.get_location_response("CPAG SBO Office", "en")
    assert loc_data is not None, "Location data for CPAG SBO Office not found!"
    print("\nCPAG SBO Office data:", loc_data["text"][:2])
    print("Pin 2 image:", loc_data.get("pins", {}).get("pin2", {}).get("image"))
    print("Route image:", loc_data.get("routes", {}).get("route_0", {}).get("image"))
    print("\n[PASSED] CPAG SBO tests passed!")

if __name__ == "__main__":
    test_enrollment_schedule()
    test_cpag_sbo()
