import json
import os
import copy

knowledge_dir = os.path.join("rasa", "actions", "knowledge")
supper_dir = os.path.join("rasa", "actions", "Supper Saiyan")

# Load source files for safe extraction
source_data = {}
for filename in os.listdir(supper_dir):
    if filename.endswith(".json"):
        filepath = os.path.join(supper_dir, filename)
        with open(filepath, "r", encoding="utf-8") as fp:
            source_data[filename] = json.load(fp)

def get_topics(source_file, topic_names):
    data = source_data.get(source_file, {})
    topics = data.get("topics", [])
    extracted = []
    for t in topics:
        if t.get("topic") in topic_names:
            extracted.append(copy.deepcopy(t))
    return extracted

def get_all_topics_except(source_file, excluded_topic_names):
    data = source_data.get(source_file, {})
    topics = data.get("topics", [])
    extracted = []
    for t in topics:
        if t.get("topic") not in excluded_topic_names:
            extracted.append(copy.deepcopy(t))
    return extracted

def write_json(category_dir, filename, intent, category_name, topics, entities=None):
    target_path = os.path.join(knowledge_dir, category_dir, filename)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    payload = {
        "intent": intent,
        "category": category_name,
        "entities": entities or ["topic"],
        "topics": topics
    }
    with open(target_path, "w", encoding="utf-8") as fp:
        json.dump(payload, fp, indent=2, ensure_ascii=False)
    print(f"Updated: {category_dir}/{filename} ({len(topics)} topics)")

# ==============================================================
# 1. PROCEDURES: Add Gate Pass, Add CAT Cut-off Scores, Keep How-To
# ==============================================================
# A. admission_procedures.json: Include cut-off scores
admission_proc_topics = get_topics("Admissions_info.json", [
    "college_admission_test",
    "admission_application",
    "admission_requirements",
    "admission_accounts_and_documents",
    "affirmative_action_program_admission",
    "program_qualification_scores" # Moved here for admission applicant clarity
])
write_json(
    "procedures", "admission_procedures.json",
    "ask_admission_procedures", "Admission Procedures & Requirements",
    admission_proc_topics
)

# B. student_service_procedures.json: Add Gate Pass Policy, Keep ID & process steps
service_proc_topics = []
# From OSS
service_proc_topics.extend(get_topics("Oss_services.json", [
    "student_id",
    "pe_uniform",
    "good_moral_certificate"
]))
# From Clinic
service_proc_topics.extend(get_topics("Clinic_info.json", [
    "medical_certificate"
]))
# From Library
service_proc_topics.extend(get_topics("Library_info.json", [
    "library_id_card",
    "library_borrowing"
]))
# From ICT
service_proc_topics.extend(get_topics("Ict_info.json", [
    "ict_services"
]))
# From University (Gate pass application moved to procedures)
service_proc_topics.extend(get_topics("University_info.json", [
    "gate_pass_policy"
]))
write_json(
    "procedures", "student_service_procedures.json",
    "ask_student_service_procedures", "Student Service Procedures & Requests",
    service_proc_topics
)

# ==============================================================
# 2. UNIVERSITY: Remove Gate Pass, Keep Identity & Personnel
# ==============================================================
univ_identity_topics = get_topics("University_info.json", [
    "university_profile",
    "university_identity",
    "university_history",
    "university_ranking",
    "university_leadership",
    "student_handbook"
    # gate_pass_policy removed from here and moved to procedures
])
write_json(
    "university", "university_identity.json",
    "ask_university_identity", "University Identity & Profile",
    univ_identity_topics
)

# ==============================================================
# 3. LOCATION: Move facility availability (ATM, parking, gym, etc.) here
# ==============================================================
facility_topics = get_all_topics_except("Facilities_info.json", [])
write_json(
    "location", "facility_locations.json",
    "ask_facility_locations", "Campus Facilities & Physical Amenities",
    facility_topics
)

# Remove old facility_availability.json from services/ if present
old_serv_facility = os.path.join(knowledge_dir, "services", "facility_availability.json")
if os.path.exists(old_serv_facility):
    os.remove(old_serv_facility)
    print("Removed services/facility_availability.json (moved to location/)")

# ==============================================================
# 4. SERVICES: Cleaned up (Clinic, Library, Dorm, OSS)
# ==============================================================
# Library services: schedule & borrowing rules
library_topics = get_topics("Library_info.json", [
    "library_hours",
    "library_borrowing"
])
write_json(
    "services", "library_services.json",
    "ask_library_services", "Library Services & Guidelines",
    library_topics
)

print("\nRefinements successfully applied!")
