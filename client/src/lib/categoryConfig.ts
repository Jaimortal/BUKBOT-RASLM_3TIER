import extractedCategoryFaqs from "./all_extracted_category_faqs.json";

export type CategoryId = "location" | "procedures" | "academics" | "services" | "university" | "others";

export interface ScopeTopicItem {
  label: string;
  payload: string;
}

export interface CategoryScopeGroup {
  title: string;
  items: ScopeTopicItem[];
}

export interface CategoryFaqItem {
  id: string;
  label: string;
  payload: string;
  subCategory?: string;
  description?: string;
}

export interface CategoryManualGuideItem {
  question: string;
  description: string;
}

export interface CategoryDefinition {
  id: CategoryId;
  title: string;
  shortTitle: string;
  subtitle: string;
  iconName: string;
  emoji: string;
  color: string;
  accentBg: string;
  description: string;
  scopeGroups: CategoryScopeGroup[];
  faqs: CategoryFaqItem[];
  manualGuides: CategoryManualGuideItem[];
}

export const CATEGORY_DEFINITIONS: Record<CategoryId, CategoryDefinition> = {
  location: {
    id: "location",
    title: "Campus Navigation & Locations",
    shortTitle: "Location",
    subtitle: "Where is it?",
    iconName: "MapPin",
    emoji: "📍",
    color: "from-blue-600 to-cyan-600",
    accentBg: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Find classrooms, computer laboratories, campus buildings, offices, and interactive map pins.",
    scopeGroups: [
      {
        title: "Department Locations",
        items: [
          { label: "COT Faculty Room", payload: '/direct_intent{"intent":"location_COT_Faculty_Room"}' },
          { label: "CAS Dean's Office", payload: '/direct_intent{"intent":"location_CAS_Deans_Office"}' },
          { label: "COB Faculty Room", payload: '/direct_intent{"intent":"location_COB_Faculty_Room"}' },
          { label: "BSN / CON Faculty Room", payload: '/direct_intent{"intent":"location_BSN_Faculty_Room"}' },
          { label: "CPAG Faculty Room", payload: '/direct_intent{"intent":"location_CPAG_Faculty_Room"}' },
          { label: "PE Department", payload: '/direct_intent{"intent":"location_pe_department"}' },
        ],
      },
      {
        title: "Computer Laboratories",
        items: [
          { label: "ComLab 1 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_1"}' },
          { label: "ComLab 2 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_2"}' },
          { label: "ComLab 3 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_3"}' },
          { label: "ComLab 4 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_4"}' },
          { label: "ComLab 5 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_5"}' },
          { label: "ComLab 6 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_6"}' },
          { label: "ComLab 7 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_7"}' },
          { label: "ComLab 8 (Finance 3F)", payload: '/direct_intent{"intent":"location_ComLab_8"}' },
        ],
      },
      {
        title: "Offices & Landmarks",
        items: [
          { label: "University Clinic", payload: '/direct_intent{"intent":"location_Buksu_Clinic"}' },
          { label: "Cashier Window", payload: '/direct_intent{"intent":"location_Window_03_Cashiers_Office"}' },
          { label: "Registrar Office", payload: '/direct_intent{"intent":"location_Registrar_Office"}' },
          { label: "University Library", payload: '/direct_intent{"intent":"location_Library"}' },
          { label: "University Gymnasium", payload: '/direct_intent{"intent":"location_Gymnasium"}' },
          { label: "New COT Building", payload: '/direct_intent{"intent":"location_New_COT_Building"}' },
          { label: "Old COT Building", payload: '/direct_intent{"intent":"location_Old_COT_Building"}' },
          { label: "Main Administration", payload: '/direct_intent{"intent":"location_Main_Administration_Building"}' },
        ],
      },
    ],
    faqs: (extractedCategoryFaqs.location || []) as CategoryFaqItem[],
    manualGuides: [
      { question: "Where is ComLab 1?", description: "Pinpoints the exact floor and room coordinates in the Finance Building." },
      { question: "Where is the University Clinic?", description: "Shows the walking route and entrance for health services." },
      { question: "Where is the Cashier's Office?", description: "Navigates to the payment windows for tuition and document fees." },
      { question: "Where is the COT / IT Faculty Room?", description: "Locates instructor desks and program chair offices for IT." },
    ],
  },
  procedures: {
    id: "procedures",
    title: "Step-by-Step Procedures & Guides",
    shortTitle: "Procedures",
    subtitle: "How do I do it?",
    iconName: "ClipboardList",
    emoji: "📋",
    color: "from-emerald-600 to-teal-600",
    accentBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Step-by-step guides for enrollment, admission, add/drop, student IDs, SIAS, and clearances.",
    scopeGroups: [
      {
        title: "Enrollment & Admission",
        items: [
          { label: "Regular Student Enrollment", payload: '/direct_intent{"intent":"enrollment_general_process"}' },
          { label: "Freshman Enrollment Steps", payload: '/direct_intent{"intent":"freshman_enrollment_process"}' },
          { label: "Transferee Enrollment", payload: '/direct_intent{"intent":"transferee_enrollment"}' },
          { label: "Late Enrollment Policy", payload: '/direct_intent{"intent":"late_enrollment"}' },
          { label: "BukSU CAT Application", payload: '/direct_intent{"intent":"online_application_schedule"}' },
          { label: "CAT Testing Schedule", payload: '/direct_intent{"intent":"exam_results"}' },
        ],
      },
      {
        title: "Academic Transactions",
        items: [
          { label: "Add & Drop Subjects", payload: '/direct_intent{"intent":"add_drop_subject"}' },
          { label: "Request COR Online", payload: '/direct_intent{"intent":"request_cor"}' },
          { label: "Validate COR", payload: '/direct_intent{"intent":"cor_validation_steps"}' },
          { label: "Graduation Clearance", payload: '/direct_intent{"intent":"graduating_clearance_requirements"}' },
          { label: "Incomplete (INC) Completion", payload: '/direct_intent{"intent":"inc_grade_solution"}' },
          { label: "Grade Viewing / Portal", payload: '/direct_intent{"intent":"access_grades"}' },
          { label: "Additional Course Slots", payload: '/direct_intent{"intent":"additional_slots"}' },
        ],
      },
      {
        title: "Student IDs & Portal",
        items: [
          { label: "Apply for Student ID", payload: '/direct_intent{"intent":"student_id_requirements"}' },
          { label: "Student ID Fee / Replacement", payload: '/direct_intent{"intent":"Student_id_fee"}' },
          { label: "ID Validation", payload: '/direct_intent{"intent":"id_validation_process"}' },
          { label: "SIAS Password Reset", payload: '/direct_intent{"intent":"sias_forgot_password"}' },
          { label: "Admission Portal Login", payload: '/direct_intent{"intent":"admission_portal_login"}' },
          { label: "Wi-Fi Access Setup", payload: '/direct_intent{"intent":"get_wifi_access"}' },
        ],
      },
    ],
    faqs: (extractedCategoryFaqs.procedures || []) as CategoryFaqItem[],
    manualGuides: [
      { question: "How to enroll online via SIAS?", description: "Step-by-step guide for course selection and section validation." },
      { question: "How to request and download official COR?", description: "Explains how to obtain your Certificate of Registration." },
      { question: "How to apply for or replace a lost Student ID?", description: "Requirements and office steps for ID card processing." },
      { question: "How to add or drop enrolled subjects?", description: "Explains the deadline and approval workflow for course changes." },
    ],
  },
  academics: {
    id: "academics",
    title: "Academic Policies & Courses",
    shortTitle: "Academics",
    subtitle: "What are the rules and programs?",
    iconName: "GraduationCap",
    emoji: "🎓",
    color: "from-amber-600 to-orange-600",
    accentBg: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Grading scales, Latin honors criteria, Dean's list, retention policies, and degree programs.",
    scopeGroups: [
      {
        title: "Grading & Retention",
        items: [
          { label: "BukSU Grading Scale (1.0 - 5.0)", payload: '/direct_intent{"intent":"buksu_grading_system"}' },
          { label: "College Honors GPA", payload: '/direct_intent{"intent":"College_Honors_gpa"}' },
          { label: "University Scholar GPA", payload: '/direct_intent{"intent":"University_Scholar_gpa"}' },
          { label: "Retention & Probation Rules", payload: '/direct_intent{"intent":"academic_probation"}' },
          { label: "INC Grade Solution", payload: '/direct_intent{"intent":"inc_grade_solution"}' },
        ],
      },
      {
        title: "Classroom Policies",
        items: [
          { label: "Mobile Phone Usage Policy", payload: '/direct_intent{"intent":"phone_use_in_class"}' },
          { label: "Eating in Classrooms Rule", payload: '/direct_intent{"intent":"eating_in_classroom"}' },
          { label: "Online Assignment Submission", payload: '/direct_intent{"intent":"submit_assignments_online"}' },
          { label: "Student Grievance & Class Concerns", payload: '/direct_intent{"intent":"class_concerns"}' },
        ],
      },
      {
        title: "Degree Programs",
        items: [
          { label: "BukSU Colleges & Departments", payload: '/direct_intent{"intent":"buksu_academic_colleges"}' },
          { label: "Board Courses Cutoff Score", payload: '/direct_intent{"intent":"board_course_cutoff_score"}' },
          { label: "Non-Board Courses CAT Score", payload: '/direct_intent{"intent":"Cat_score_for_nonboard"}' },
        ],
      },
    ],
    faqs: (extractedCategoryFaqs.academics || []) as CategoryFaqItem[],
    manualGuides: [
      { question: "What is the BukSU numerical grading scale?", description: "Explains grade percentage equivalents from 1.0 (99-100) to 5.0 (Failed)." },
      { question: "What are the requirements for Dean's List?", description: "Details GPA thresholds with no grade below 2.5." },
      { question: "What courses and colleges are available?", description: "Overview of undergraduate, law, and graduate programs." },
      { question: "What are the classroom dress code and phone rules?", description: "Official rules regarding student conduct in lecture rooms." },
    ],
  },
  services: {
    id: "services",
    title: "Student Services & Facilities",
    shortTitle: "Services",
    subtitle: "What help and services are available?",
    iconName: "Building2",
    emoji: "🏢",
    color: "from-purple-600 to-indigo-600",
    accentBg: "bg-purple-50 text-purple-700 border-purple-200",
    description: "University clinic health services, library borrowing & hours, dormitories, and OSS support.",
    scopeGroups: [
      {
        title: "Health & Wellness",
        items: [
          { label: "Free Medical Consultations", payload: '/direct_intent{"intent":"buksu_medical_dental_services"}' },
          { label: "Dental Checkup & Extractions", payload: '/direct_intent{"intent":"dental_services_menu"}' },
          { label: "Medical Clinic Overview", payload: '/direct_intent{"intent":"medic_clinic"}' },
          { label: "Clinic Mission & Goals", payload: '/direct_intent{"intent":"med_mission"}' },
          { label: "First Aid & Medicine Dispensing", payload: '/direct_intent{"intent":"request_referral_dispensing_medicine"}' },
        ],
      },
      {
        title: "Library Services",
        items: [
          { label: "Library Operating Hours", payload: '/direct_intent{"intent":"library_hours"}' },
          { label: "Book Borrowing Limits", payload: '/direct_intent{"intent":"library_borrowing_rules"}' },
          { label: "Book Return & Overdue Rules", payload: '/direct_intent{"intent":"library_return_books_process"}' },
          { label: "Late Return Penalties", payload: '/direct_intent{"intent":"library_late_return_penalty"}' },
          { label: "Borrowing Process", payload: '/direct_intent{"intent":"library_borrow_books_process"}' },
        ],
      },
      {
        title: "Dormitories & OSS",
        items: [
          { label: "Campus Dormitories Overview", payload: '/direct_intent{"intent":"buksu_dormitory_information"}' },
          { label: "Monthly Dormitory Rates", payload: '/direct_intent{"intent":"campus_dormitories"}' },
          { label: "Dormitory Curfew & Policies", payload: '/direct_intent{"intent":"dormitory_pros_cons"}' },
          { label: "Accredited Student Orgs", payload: '/direct_intent{"intent":"active_student_organizations_guidance"}' },
          { label: "Scholarships & Financial Grants Unit", payload: '/direct_intent{"intent":"contact_scholarship_unit"}' },
        ],
      },
    ],
    faqs: (extractedCategoryFaqs.services || []) as CategoryFaqItem[],
    manualGuides: [
      { question: "What are the University Library operating hours?", description: "Open Monday to Friday 8:00 AM – 5:00 PM." },
      { question: "What medical and dental services are free?", description: "Basic consultations and medicine dispensing at the Health Services Unit." },
      { question: "How to stay in campus dormitories?", description: "Information on male (Mahogany) and female (Rubia) dormitories." },
      { question: "What financial aid and scholarships are offered?", description: "Guidance on OSS student grants and partner programs." },
    ],
  },
  university: {
    id: "university",
    title: "University Info & Directory",
    shortTitle: "University",
    subtitle: "Who is in charge / What is BukSU?",
    iconName: "Landmark",
    emoji: "🏛️",
    color: "from-rose-600 to-red-600",
    accentBg: "bg-rose-50 text-rose-700 border-rose-200",
    description: "BukSU history, vision, mission, core values, administrators, deans, and contact directory.",
    scopeGroups: [
      {
        title: "University Identity",
        items: [
          { label: "Vision and Mission", payload: '/direct_intent{"intent":"buksu_vision"}' },
          { label: "BukSU Core Values", payload: '/direct_intent{"intent":"buksu_core_values"}' },
          { label: "Historical Background (1924)", payload: '/direct_intent{"intent":"Buksu_age"}' },
          { label: "Why BukSU is Worth It", payload: '/direct_intent{"intent":"Buksu_worth_it"}' },
          { label: "Campus Visitors Tour", payload: '/direct_intent{"intent":"Campus_tour"}' },
        ],
      },
      {
        title: "Leadership & Deans",
        items: [
          { label: "University President (Dr. Joy M. Mirasol)", payload: '/direct_intent{"intent":"Pres_thetime_university"}' },
          { label: "Vice Presidents of BukSU", payload: '/direct_intent{"intent":"Buksu_vice_pres"}' },
          { label: "Deans of 7 Colleges", payload: '/direct_intent{"intent":"deans_of_colleges_list"}' },
          { label: "Dean of COT", payload: '/direct_intent{"intent":"Dean_0f_COT"}' },
          { label: "Dean of COB", payload: '/direct_intent{"intent":"Dean_0f_COB"}' },
          { label: "Dean of CAS", payload: '/direct_intent{"intent":"Dean_0f_CAS"}' },
          { label: "Dean of CON", payload: '/direct_intent{"intent":"Dean_0f_CON"}' },
          { label: "Dean of COE", payload: '/direct_intent{"intent":"Dean_0f_COE"}' },
          { label: "Dean of CPAG", payload: '/direct_intent{"intent":"Dean_0f_CPAG"}' },
          { label: "Dean of Law", payload: '/direct_intent{"intent":"Dean_0f_LAW"}' },
        ],
      },
      {
        title: "Department Chairs",
        items: [
          { label: "Head of BSIT", payload: '/direct_intent{"intent":"Head_of_BSIT"}' },
          { label: "Head of COT", payload: '/direct_intent{"intent":"Head_of_COT"}' },
          { label: "Head of CAS", payload: '/direct_intent{"intent":"Head_of_CAS"}' },
          { label: "Head of COB", payload: '/direct_intent{"intent":"Head_of_COB"}' },
          { label: "Head of COE", payload: '/direct_intent{"intent":"Head_of_COE"}' },
          { label: "Head of CON", payload: '/direct_intent{"intent":"Head_of_CON"}' },
          { label: "Head of CPAG", payload: '/direct_intent{"intent":"Head_of_CPAG"}' },
          { label: "Head of Law", payload: '/direct_intent{"intent":"Head_of_LAW"}' },
        ],
      },
    ],
    faqs: (extractedCategoryFaqs.university || []) as CategoryFaqItem[],
    manualGuides: [
      { question: "What is the BukSU Vision and Mission?", description: "Core educational foundation and institutional objectives." },
      { question: "Who leads Bukidnon State University?", description: "Details on University President Dr. Joy M. Mirasol." },
      { question: "When was BukSU founded and converted to University?", description: "Key historical milestones from 1924 to 2007." },
      { question: "How to contact official university offices?", description: "Phone numbers and email directory for university inquiries." },
    ],
  },
  others: {
    id: "others",
    title: "Other Services & Campus Inquiries",
    shortTitle: "Others",
    subtitle: "Facility Availability & Inquiries",
    iconName: "LayoutGrid",
    emoji: "✨",
    color: "from-purple-600 to-indigo-600",
    accentBg: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Campus facility availability, ATM machine, sports gym, cafeteria, parking, and miscellaneous inquiries.",
    scopeGroups: [
      {
        title: "Campus Facilities & Amenities",
        items: [
          { label: "ATM Machine Availability", payload: '/direct_intent{"intent":"atm_facility_availability"}' },
          { label: "Gymnasium & Fitness Gym", payload: '/direct_intent{"intent":"gym_facility_availability"}' },
          { label: "Cafeteria & Canteen", payload: '/direct_intent{"intent":"cafeteria_facility_availability"}' },
          { label: "Sports Oval & Running Track", payload: '/direct_intent{"intent":"oval_facility_availability"}' },
          { label: "University Museum", payload: '/direct_intent{"intent":"museum_facility_availability"}' },
          { label: "Dental Clinic Services", payload: '/direct_intent{"intent":"dental_clinic_facility_availability"}' },
          { label: "Auditorium & Event Spaces", payload: '/direct_intent{"intent":"auditorium_facility_availability"}' },
          { label: "Vehicle & Motor Parking", payload: '/direct_intent{"intent":"parking_facility_availability"}' },
        ],
      },
      {
        title: "Campus Support Offices",
        items: [
          { label: "Guidance Office Availability", payload: '/direct_intent{"intent":"guidance_office_facility_availability"}' },
          { label: "Medical Clinic Availability", payload: '/direct_intent{"intent":"clinic_facility_availability"}' },
          { label: "Library Facility Availability", payload: '/direct_intent{"intent":"library_facility_availability"}' },
          { label: "ICT Office Availability", payload: '/direct_intent{"intent":"ict_office_facility_availability"}' },
          { label: "Registrar Office Availability", payload: '/direct_intent{"intent":"registrar_office_facility_availability"}' },
          { label: "Finance & Cashier Availability", payload: '/direct_intent{"intent":"finance_cashier_facility_availability"}' },
          { label: "Admission Office Availability", payload: '/direct_intent{"intent":"admission_office_facility_availability"}' },
          { label: "Dormitory Facility Availability", payload: '/direct_intent{"intent":"dormitory_facility_availability"}' },
          { label: "Guard House & Campus Security", payload: '/direct_intent{"intent":"guard_house_facility_availability"}' },
        ],
      },
    ],
    faqs: (extractedCategoryFaqs.others || []) as CategoryFaqItem[],
    manualGuides: [
      { question: "Does BukSU have an ATM on campus?", description: "Information on ATM banking access near and inside the campus." },
      { question: "Is there a sports gym and oval in BukSU?", description: "Details on sports amenities, gym facilities, and running tracks." },
      { question: "Where are the student cafeterias and canteens?", description: "Food services, dining areas, and campus canteen availability." },
      { question: "What health and dental facilities are available?", description: "Overview of student healthcare, medical consultations, and dental care." },
    ],
  },
};

export const ALL_CATEGORIES = Object.values(CATEGORY_DEFINITIONS);
