import json
import os
import copy

supper_dir = os.path.join("rasa", "actions", "Supper Saiyan")
knowledge_dir = os.path.join("rasa", "actions", "knowledge")

# Load all source files
source_data = {}
for filename in os.listdir(supper_dir):
    if filename.endswith(".json"):
        filepath = os.path.join(supper_dir, filename)
        with open(filepath, "r", encoding="utf-8") as fp:
            source_data[filename] = json.load(fp)

def get_topics(source_file, topic_names):
    """Extract full topic objects from a source file by their topic names."""
    data = source_data.get(source_file, {})
    topics = data.get("topics", [])
    extracted = []
    for t in topics:
        if t.get("topic") in topic_names:
            extracted.append(copy.deepcopy(t))
    return extracted

def get_all_topics_except(source_file, excluded_topic_names):
    """Extract all topic objects from a source file except excluded ones."""
    data = source_data.get(source_file, {})
    topics = data.get("topics", [])
    extracted = []
    for t in topics:
        if t.get("topic") not in excluded_topic_names:
            extracted.append(copy.deepcopy(t))
    return extracted

def create_domain_file(category_dir, filename, intent, category_name, topics, entities=None):
    """Write a cleanly formatted domain JSON file."""
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
    print(f"Created: {category_dir}/{filename} ({len(topics)} top-level topics)")

# ==========================================
# 1. PROCEDURES (Step-by-step guides)
# ==========================================
# Enrollment procedures
enrollment_topics = get_topics("Enrollment_info.json", [
    "enrollment_process",
    "enrollment_requirements",
    "enrollment_fees",
    "sias_access",
    "transfer_and_enrollment_policy"
])
create_domain_file(
    "procedures", "enrollment_procedures.json",
    "ask_enrollment_procedures", "Enrollment Procedures",
    enrollment_topics
)

# Admission procedures
admission_proc_topics = get_topics("Admissions_info.json", [
    "college_admission_test",
    "admission_application",
    "admission_requirements",
    "admission_accounts_and_documents",
    "affirmative_action_program_admission"
])
create_domain_file(
    "procedures", "admission_procedures.json",
    "ask_admission_procedures", "Admission Procedures",
    admission_proc_topics
)

# Academic transactions / document requests
academic_trans_topics = get_topics("Academic_policy.json", [
    "add_drop_subject",
    "withdrawal",
    "registrar_documents",
    "cor_validation",
    "graduation_clearance"
])
create_domain_file(
    "procedures", "academic_transactions.json",
    "ask_academic_transactions", "Academic Transactions & Requests",
    academic_trans_topics
)

# Student service procedures (ID, Uniform, Good Moral, Medical Cert, Library Card/Borrowing, WiFi)
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
create_domain_file(
    "procedures", "student_service_procedures.json",
    "ask_student_service_procedures", "Student Service Procedures",
    service_proc_topics
)

# ==========================================
# 2. ACADEMICS (Policies, Grading & Programs)
# ==========================================
# Grading & Retention Policies
grading_topics = get_topics("Academic_policy.json", [
    "grading_system",
    "academic_standing",
    "inc_grade",
    "attendance_fda",
    "subject_overload",
    "academic_honors",
    "thesis_capstone"
])
create_domain_file(
    "academics", "grading_and_retention.json",
    "ask_grading_and_retention", "Grading & Academic Policies",
    grading_topics
)

# Classroom policies
classroom_topics = get_topics("Classroom_policy.json", [
    "classroom_policies"
])
create_domain_file(
    "academics", "classroom_policies.json",
    "ask_classroom_policies", "Classroom Policies & Conduct",
    classroom_topics
)

# Degree programs and catalog
degree_topics = get_all_topics_except("Courses_info.json", [])
# Also include admission score criteria & board exam info
degree_topics.extend(get_topics("Admissions_info.json", [
    "program_qualification_scores",
    "board_exam_information"
]))
create_domain_file(
    "academics", "degree_programs.json",
    "ask_degree_programs", "Degree Programs & Curriculums",
    degree_topics
)

# ==========================================
# 3. SERVICES (Health, Library, Dorm, OSS)
# ==========================================
# Clinic services
clinic_topics = get_topics("Clinic_info.json", [
    "university_clinic",
    "dental_services"
])
create_domain_file(
    "services", "clinic_services.json",
    "ask_clinic_services", "Medical & Dental Services",
    clinic_topics
)

# Library services
library_topics = get_topics("Library_info.json", [
    "library_hours",
    "library_borrowing"
])
create_domain_file(
    "services", "library_services.json",
    "ask_library_services", "Library Services & Guidelines",
    library_topics
)

# Dormitory services
dorm_topics = get_topics("Dormitory_info.json", [
    "campus_dormitories"
])
create_domain_file(
    "services", "dormitory_services.json",
    "ask_dormitory_services", "Dormitory Services & Rules",
    dorm_topics
)

# OSS & Student Organizations
oss_topics = get_topics("Oss_services.json", [
    "student_organizations"
])
create_domain_file(
    "services", "oss_student_services.json",
    "ask_oss_services", "Office of Student Services",
    oss_topics
)

# Facility Availability
facility_topics = get_all_topics_except("Facilities_info.json", [])
create_domain_file(
    "services", "facility_availability.json",
    "ask_facility_availability", "Campus Facility Availability",
    facility_topics
)

# ==========================================
# 4. UNIVERSITY (Identity, Officials, Directory)
# ==========================================
# University Identity & Profile
univ_topics = get_topics("University_info.json", [
    "university_profile",
    "university_identity",
    "university_history",
    "university_ranking",
    "university_leadership",
    "student_handbook",
    "gate_pass_policy"
])
create_domain_file(
    "university", "university_identity.json",
    "ask_university_identity", "University Identity & Profile",
    univ_topics
)

# Administrators
admin_topics = get_topics("Administrators.json", [
    "university_administrators"
])
create_domain_file(
    "university", "administrators.json",
    "ask_university_administrators", "University Administrators",
    admin_topics
)

# Faculty and Deans & Academic Colleges
faculty_topics = []
faculty_topics.extend(get_all_topics_except("Departamentals_facultystaff.json", []))
faculty_topics.extend(get_all_topics_except("Department_info.json", []))
create_domain_file(
    "university", "faculty_and_deans.json",
    "ask_faculty_and_deans", "Colleges, Deans & Faculty Directory",
    faculty_topics
)

# Admission directory
admission_dir_topics = get_topics("Admissions_info.json", [
    "admission_contacts"
])
create_domain_file(
    "university", "admission_directory.json",
    "ask_admission_directory", "Admission Office & Contacts",
    admission_dir_topics
)

# Location knowledge is maintained directly in
# knowledge/location/responses_location_core.json. Do not overwrite it from a
# legacy duplicate when redistributing the other knowledge domains.

print("\nAll knowledge files successfully generated!")
