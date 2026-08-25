import os
from typing import Dict, List, Optional, Any

DOMAIN_REGISTRY: Dict[str, Dict[str, Any]] = {
    "location": {
        "id": "location",
        "title": "Campus Navigation & Locations",
        "icon": "map-pin",
        "description": "Find classrooms, comlabs, campus buildings, offices, and interactive map pins.",
        "folder": "location",
        "suggested_questions": [
            "Where is ComLab 1?",
            "Where is the CAS Building?",
            "How to get to the University Clinic?",
            "Where is the Cashier's Office?",
            "Asa dapit ang Library?",
            "Where is Room C2-2-04?",
        ],
    },
    "procedures": {
        "id": "procedures",
        "title": "Procedures & Guides",
        "icon": "clipboard-list",
        "description": "Step-by-step guides for enrollment, admission, add/drop, student ID, and clearance.",
        "folder": "procedures",
        "suggested_questions": [
            "How to enroll as a regular student?",
            "What are the steps for BukSU CAT admission?",
            "How to add and drop subjects?",
            "How to apply for a Student ID?",
            "How to reset my Student Portal password?",
            "Unsaon pagkuha og Certificate of Registration (COR)?",
        ],
    },
    "academics": {
        "id": "academics",
        "title": "Academic Policies & Courses",
        "icon": "graduation-cap",
        "description": "Grading scale, Dean's List requirements, retention policies, classroom rules, and degree programs.",
        "folder": "academics",
        "suggested_questions": [
            "What are the requirements for Dean's List?",
            "What is the passing grade for BSIT?",
            "What is the policy for INC grades?",
            "What are the classroom rules for mobile phone use?",
            "What courses are offered in BukSU?",
            "Unsa ang policy sa retention ug probation?",
        ],
    },
    "services": {
        "id": "services",
        "title": "Student Services & Facilities",
        "icon": "building",
        "description": "Medical and dental clinic, library hours & borrowing, dormitory rules, and OSS scholarships.",
        "folder": "services",
        "suggested_questions": [
            "What are the library operating hours?",
            "How many books can I borrow from the library?",
            "What services does the University Clinic offer?",
            "What are the dormitory curfew rules and monthly fees?",
            "What scholarships are available in OSS?",
            "Pila ka libro pwede mahulam sa library?",
        ],
    },
    "university": {
        "id": "university",
        "title": "University Info & Directory",
        "icon": "landmark",
        "description": "BukSU history, vision/mission, core values, administrators, deans, and contact directory.",
        "folder": "university",
        "suggested_questions": [
            "What is the Vision and Mission of BukSU?",
            "Who is the University President?",
            "Who is the Dean of the College of Technologies?",
            "What are the BukSU Core Values?",
            "What is the history of Bukidnon State University?",
            "Kinsa ang mga opisyal sa unibersidad?",
        ],
    },
}

def get_all_domains() -> List[Dict[str, Any]]:
    """Return list of all domain definitions."""
    return list(DOMAIN_REGISTRY.values())

def is_valid_domain(domain_id: Optional[str]) -> bool:
    """Check if given domain_id is valid."""
    if not domain_id:
        return False
    return str(domain_id).strip().lower() in DOMAIN_REGISTRY

def normalize_domain(domain_id: Optional[str]) -> Optional[str]:
    """Normalize domain identifier string."""
    if not domain_id:
        return None
    val = str(domain_id).strip().lower()
    # Normalize potential alias inputs and full titles
    alias_map = {
        "location": "location",
        "locations": "location",
        "map": "location",
        "maps": "location",
        "navigation": "location",
        "campus navigation & locations": "location",
        "campus navigation": "location",
        "procedure": "procedures",
        "procedures": "procedures",
        "process": "procedures",
        "processes": "procedures",
        "guide": "procedures",
        "guides": "procedures",
        "procedures & guides": "procedures",
        "step-by-step procedures": "procedures",
        "academic": "academics",
        "academics": "academics",
        "policy": "academics",
        "policies": "academics",
        "course": "academics",
        "courses": "academics",
        "academic policies & courses": "academics",
        "service": "services",
        "services": "services",
        "facility": "services",
        "facilities": "services",
        "student services & facilities": "services",
        "univ": "university",
        "university": "university",
        "about": "university",
        "directory": "university",
        "university info & directory": "university",
    }
    return alias_map.get(val, val if val in DOMAIN_REGISTRY else None)

def get_domain_info(domain_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Get metadata for a normalized domain ID."""
    norm = normalize_domain(domain_id)
    if norm and norm in DOMAIN_REGISTRY:
        return DOMAIN_REGISTRY[norm]
    return None

def get_domain_suggestions(domain_id: Optional[str]) -> List[str]:
    """Get starter suggestions for a domain."""
    info = get_domain_info(domain_id)
    if info:
        return info.get("suggested_questions", [])
    return []
