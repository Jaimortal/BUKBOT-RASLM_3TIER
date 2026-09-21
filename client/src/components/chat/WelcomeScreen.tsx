import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_CATEGORIES, type CategoryId } from "@/lib/categoryConfig";
import {
  MapPin,
  ClipboardList,
  GraduationCap,
  Building2,
  Landmark,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowRight,
  MessageSquare,
  Info,
  Compass,
} from "lucide-react";

interface WelcomeScreenProps {
  onSelectCategory: (categoryId: CategoryId) => void;
}

const ICON_MAP: Record<string, any> = {
  MapPin,
  ClipboardList,
  GraduationCap,
  Building2,
  Landmark,
  LayoutGrid,
};

interface TourStepInfo {
  id: CategoryId;
  title: string;
  shortTitle: string;
  badge: string;
  icon: any;
  overview: string;
  sampleQuestions: string[];
  tip: string;
}

const TOUR_STEPS: TourStepInfo[] = [
  {
    id: "location",
    title: "Campus Navigation & Locations",
    shortTitle: "Location",
    badge: "Interactive Map & Wayfinding",
    icon: MapPin,
    overview:
      "Easily locate classrooms, computer laboratories (ComLab 1–8), campus buildings, administrative offices, and view pinpointed routes on the interactive map.",
    sampleQuestions: [
      "Where is ComLab 1?",
      "Where is the University Clinic?",
      "How to go to Registrar Office?",
      "Where is Cashier Window 3?",
    ],
    tip: "You can ask for any room or building in English or Bisaya to see it on the map.",
  },
  {
    id: "procedures",
    title: "Step-by-Step Procedures & Guides",
    shortTitle: "Procedures",
    badge: "Official Transaction Guides",
    icon: ClipboardList,
    overview:
      "Follow official step-by-step transaction instructions for online enrollment, BukSU CAT admission, student IDs, add/drop subjects, and clearances.",
    sampleQuestions: [
      "How to enroll online via SIAS?",
      "How to apply for BukSU CAT?",
      "How to validate my COR?",
      "How to get or replace my Student ID?",
    ],
    tip: "Follow clear numbered steps to complete all your university transactions smoothly.",
  },
  {
    id: "academics",
    title: "Academic Policies & Courses",
    shortTitle: "Academics",
    badge: "Curriculum & Grading Policies",
    icon: GraduationCap,
    overview:
      "Understand university grading policies, degree program offerings, Dean's List requirements, prerequisite courses, and Incomplete (INC) grade removal.",
    sampleQuestions: [
      "What is the GWA for Dean's List?",
      "What happens if I fail a prerequisite subject?",
      "How to clear an Incomplete (INC) grade?",
      "What degree programs are offered in BukSU?",
    ],
    tip: "Quickly verify retention standards, prerequisites, and academic qualifications.",
  },
  {
    id: "services",
    title: "Student Services & Facilities",
    badge: "Campus Support & Amenities",
    icon: Building2,
    overview:
      "Inquire about student clinic checkups, medical certificates, OSAS scholarships, university library borrowing policies, and guidance counseling.",
    sampleQuestions: [
      "How to get a Medical Certificate?",
      "What are the Library borrowing rules?",
      "Where to inquire about OSAS scholarships?",
      "How to request guidance counseling?",
    ],
    tip: "Find student support service requirements, operating hours, and office contacts.",
  },
  {
    id: "university",
    title: "University Info, Offices & Contacts",
    badge: "Directory & Administration",
    icon: Landmark,
    overview:
      "Access the official university directory, campus history, college deans, department chair contacts, and administrative leadership.",
    sampleQuestions: [
      "What is the contact number of Admission Unit?",
      "Who is the current University President?",
      "Official Facebook page of BukSU?",
      "What are the colleges inside BukSU?",
    ],
    tip: "Get verified phone numbers, email addresses, and official social media channels.",
  },
  {
    id: "others",
    title: "Campus Life & General Inquiries",
    badge: "Campus Guidelines & Dress Code",
    icon: LayoutGrid,
    overview:
      "Check daily campus guidelines, campus dress code rules, PE uniform policies, wash day requirements, and campus gate entry protocols.",
    sampleQuestions: [
      "Can I enter campus in civilian clothes / without uniform?",
      "Can I wear my old PE uniform?",
      "Is uniform required on wash day (Wednesdays)?",
      "What are the campus entry gate rules?",
    ],
    tip: "Stay compliant with student handbook rules and general campus regulations.",
  },
];

export function WelcomeScreen({ onSelectCategory }: WelcomeScreenProps) {
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [subPhase, setSubPhase] = useState<0 | 1>(0); // 0 = Overview, 1 = What you can ask
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [showPointingIndicator, setShowPointingIndicator] = useState(true);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const currentTour = TOUR_STEPS[tourStep];
  const StepIcon = currentTour?.icon || Landmark;

  // Auto-dismiss pointing indicator after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPointingIndicator(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const transitionToStep = (stepIdx: number) => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setTourStep(stepIdx);
    setSubPhase(0);
    setIsHighlighting(true);

    const targetCat = TOUR_STEPS[stepIdx];
    if (targetCat && categoryRefs.current[targetCat.id]) {
      categoryRefs.current[targetCat.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    highlightTimerRef.current = setTimeout(() => {
      setIsHighlighting(false);
    }, 1000);
  };

  // Auto-rotate sample questions every 2 seconds when in SubPhase 1 (What you can ask)
  useEffect(() => {
    if (!tourActive || isHighlighting || subPhase !== 1 || !currentTour) return;

    setActiveQuestionIdx(0);
    const interval = setInterval(() => {
      setActiveQuestionIdx((prev) => (prev + 1) % currentTour.sampleQuestions.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [tourActive, isHighlighting, tourStep, subPhase, currentTour]);

  const handleNext = () => {
    if (subPhase === 0) {
      // Advance to Phase 1 (What you can ask) on the SAME category
      setSubPhase(1);
    } else {
      // Advance to Phase 0 of NEXT category with 1-second highlight
      if (tourStep < TOUR_STEPS.length - 1) {
        transitionToStep(tourStep + 1);
      } else {
        handleExitTour();
      }
    }
  };

  const handlePrev = () => {
    if (subPhase === 1) {
      // Go back to Phase 0 of SAME category
      setSubPhase(0);
    } else {
      // Go back to Phase 0 of PREVIOUS category with 1-second highlight
      if (tourStep > 0) {
        transitionToStep(tourStep - 1);
      }
    }
  };

  const handleExitTour = () => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setTourActive(false);
    setTourStep(0);
    setSubPhase(0);
    setIsHighlighting(false);
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  // When tour modal is active, reset scroll to top so there are no bottom gaps
  useEffect(() => {
    if (tourActive && !isHighlighting && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [tourActive, isHighlighting]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-30 flex flex-col items-center justify-between p-3.5 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in-0 duration-300 ${
        tourActive && !isHighlighting ? "overflow-hidden" : "overflow-y-auto"
      }`}
    >
      <div className="w-full max-w-md my-auto flex flex-col items-center gap-3.5 text-center relative pb-2">
        {/* Welcome Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          <img
            src="/LOGO.png"
            alt="BukSU Logo"
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md select-none"
            draggable={false}
          />
        </motion.div>

        {/* Welcoming Typography */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="space-y-1"
        >
          <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl drop-shadow-sm">
            Hello, BukSUan!
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed max-w-xs mx-auto">
            What would you like me to assist you with today?
          </p>
          <p className="text-[11px] text-slate-300 font-light pt-0.5">
            Select a category below or take a quick guided tour:
          </p>
        </motion.div>

        {/* Marketing / Help Banner: "Don't know where to start?" */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.38, delay: 0.08 }}
          className="w-full"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTourActive(true);
              transitionToStep(0);
            }}
            className="relative w-full overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-700 p-3 text-left text-white shadow-lg shadow-orange-500/25 transition-all hover:border-amber-300 hover:shadow-orange-500/40 cursor-pointer group"
          >
            {/* Shimmer Stripe */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="flex items-center justify-between gap-2.5 relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-amber-200 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                  <Compass className="h-5 w-5 text-amber-200" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-black uppercase tracking-wider bg-black/35 text-amber-200 px-2 py-0.5 rounded-full border border-amber-300/40 shadow-xs">
                      Quick Guide
                    </span>
                  </div>
                  <span className="text-xs sm:text-[13px] font-black text-white truncate drop-shadow-sm pt-0.5">
                    Don't know where to start?
                  </span>
                  <span className="text-[10.5px] text-amber-100 font-medium line-clamp-1">
                    Tap here for an interactive step-by-step tour
                  </span>
                </div>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30 group-hover:bg-white group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Standard Category Choice Cards */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full space-y-2 pt-0.5 relative"
        >
          {/* Floating Bouncy Pointing Indicator (Pops up once, larger size, moved upwards, auto-dismisses after 2s) */}
          <AnimatePresence>
            {!tourActive && showPointingIndicator && (
              <motion.div
                key="pointing-indicator"
                initial={{ scale: 0, opacity: 0, y: 20, rotate: -15 }}
                animate={{ scale: [0, 1.25, 0.94, 1], opacity: 1, y: [20, -6, 2, 0], rotate: [-15, 5, -2, 0] }}
                exit={{ scale: 0.5, opacity: 0, y: -10, transition: { duration: 0.35, ease: "easeOut" } }}
                transition={{
                  duration: 0.65,
                  ease: [0.175, 0.885, 0.32, 1.275],
                  delay: 0.25,
                }}
                className="absolute -top-14 sm:-top-16 -left-2 sm:-left-3 z-30 pointer-events-none select-none filter drop-shadow-2xl"
              >
                <img
                  src="/pointing_right2.png"
                  alt="Quick Guide Pointer"
                  className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {ALL_CATEGORIES.map((cat) => {
            const IconComponent = ICON_MAP[cat.iconName] || Landmark;
            const isTourCurrent = tourActive && currentTour?.id === cat.id;

            return (
              <motion.button
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el;
                }}
                type="button"
                whileHover={!tourActive ? { scale: 1.015, y: -1 } : undefined}
                whileTap={!tourActive ? { scale: 0.985 } : undefined}
                onClick={() => onSelectCategory(cat.id)}
                className={`group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border p-3 text-left shadow-md transition-all duration-300 backdrop-blur-sm cursor-pointer ${
                  isTourCurrent
                    ? isHighlighting
                      ? "z-30 bg-white border-amber-400 ring-4 ring-amber-400 shadow-2xl shadow-amber-500/50 scale-[1.03] animate-pulse"
                      : "z-10 bg-white border-amber-400 ring-2 ring-amber-400/60 shadow-xl shadow-amber-500/20 scale-[1.01]"
                    : tourActive
                    ? "opacity-25 blur-[0.6px] border-white/10 bg-white/40 pointer-events-none scale-[0.98]"
                    : "border-white/15 bg-white/90 hover:bg-white hover:border-white hover:shadow-xl hover:shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                }`}
              >
                {/* Left Icon Badge */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-all duration-200 ${
                    isTourCurrent
                      ? "bg-[#001C38] text-amber-300"
                      : "bg-slate-100 text-blue-950 group-hover:bg-[#001C38] group-hover:text-white"
                  }`}
                >
                  <IconComponent className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs sm:text-[13px] font-bold truncate ${
                        isTourCurrent ? "text-blue-950" : "text-slate-900 group-hover:text-blue-950"
                      }`}
                    >
                      {cat.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 group-hover:text-slate-600">
                    {cat.description}
                  </p>
                </div>

                {/* Right Arrow */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                    isTourCurrent
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-100/80 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-0.5"
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="w-full text-center text-[10.5px] text-slate-400 pt-2">
        Bukidnon State University AI Chatbot • Direct FAQ Knowledge
      </div>

      {/* Guided Tour Modal: Copied Category Button Flashed on Top (OUTSIDE) + Instruction Modal Below with Pointer Arrow */}
      <AnimatePresence>
        {tourActive && currentTour && !isHighlighting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md pointer-events-auto overflow-y-auto h-full w-full"
          >
            <div className="w-full max-w-md my-auto flex flex-col items-center gap-2">
              {/* 1. COPIED CATEGORY BUTTON FLASHED OUTSIDE ON TOP (Smooth Gliding-Up Fly Transition) */}
              {(() => {
                const activeCategoryDef = ALL_CATEGORIES.find((c) => c.id === currentTour.id) || ALL_CATEGORIES[0];
                const ActiveIconComponent = ICON_MAP[activeCategoryDef.iconName] || Landmark;

                return (
                  <motion.button
                    key={`flashed-btn-${tourStep}`}
                    initial={{ y: 90, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.96 }}
                    transition={{
                      duration: 0.52,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    type="button"
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSelectCategory(activeCategoryDef.id)}
                    className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-white p-3 text-left shadow-2xl shadow-amber-500/30 transition-all duration-200 hover:bg-white hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer z-10"
                    title="Click to select this category"
                  >
                    {/* Left Icon Badge */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-950 shadow-xs transition-all duration-200 group-hover:bg-[#001C38] group-hover:text-white">
                      <ActiveIconComponent className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-950 truncate">
                          {activeCategoryDef.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 group-hover:text-slate-600">
                        {activeCategoryDef.description}
                      </p>
                    </div>

                    {/* Right Arrow */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-0.5">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </motion.button>
                );
              })()}

              {/* 2. THE FLOATING INSTRUCTION & ACTIONS (Transparent Modal - Text & Buttons Floating) */}
              <motion.div
                key={`tour-instruction-modal-${tourStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.2,
                }}
                className="relative w-full p-2 pt-1 text-white flex flex-col gap-3.5"
              >
                {/* Floating Modal Header */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-400/30">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-300 drop-shadow-sm">
                        Guided Tour • Step {tourStep + 1} of {TOUR_STEPS.length}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 drop-shadow-sm">
                        {subPhase === 0 ? "Part 1: Overview" : "Part 2: What You Can Ask"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Step Dots */}
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15">
                    {TOUR_STEPS.map((_, idx) => (
                      <button
                        key={`step-dot-${idx}`}
                        type="button"
                        onClick={() => {
                          transitionToStep(idx);
                        }}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === tourStep
                            ? "w-4 bg-amber-400 shadow-sm shadow-amber-400/60"
                            : "w-1.5 bg-white/30 hover:bg-white/60"
                        }`}
                        title={`Go to category ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Exit Button */}
                  <button
                    type="button"
                    onClick={handleExitTour}
                    className="rounded-full p-1.5 text-slate-300 bg-white/10 hover:bg-white/20 hover:text-white transition-colors cursor-pointer border border-white/15 backdrop-blur-sm"
                    title="Close Tour"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Floating Content (SubPhase 0: Overview vs SubPhase 1: Rotating Questions) */}
                <div className="relative flex flex-col gap-2.5 text-left py-1">
                  {subPhase === 0 && (
                    <motion.div
                      key={`overview-${tourStep}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 drop-shadow-sm">
                        <Info className="h-3.5 w-3.5 text-sky-400" />
                        <span>About this category:</span>
                      </div>

                      <p className="text-xs sm:text-[13px] text-slate-100 font-medium leading-relaxed drop-shadow-md">
                        {currentTour.overview}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-amber-200 bg-amber-400/15 backdrop-blur-md px-3 py-2 rounded-2xl border border-amber-400/30 shadow-xs">
                        <Info className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                        <span>Click <strong>"See What to Ask"</strong> below to view sample queries.</span>
                      </div>
                    </motion.div>
                  )}

                  {subPhase === 1 && (
                    <motion.div
                      key={`questions-${tourStep}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-sky-300 drop-shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-300" />
                          <span>What you can ask here:</span>
                        </div>
                        <span className="text-[10px] font-normal text-slate-300 lowercase italic">
                          (auto-switching every 2s)
                        </span>
                      </div>

                      {/* Rotating Sample Query Showcase (Floating Glass Card) */}
                      <div className="relative h-13 w-full overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-amber-400/40 px-3.5 py-2 flex items-center shadow-lg shadow-black/20">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`query-${tourStep}-${activeQuestionIdx}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.28 }}
                            className="flex items-center gap-2.5 w-full"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold shadow-xs">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs sm:text-[13px] font-bold text-white tracking-wide truncate drop-shadow-sm">
                              "{currentTour.sampleQuestions[activeQuestionIdx]}"
                            </span>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Mini Query Pills for Instant Tap */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {currentTour.sampleQuestions.map((q, qIdx) => (
                          <button
                            key={`pill-${qIdx}`}
                            type="button"
                            onClick={() => setActiveQuestionIdx(qIdx)}
                            className={`text-[10.5px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer backdrop-blur-sm ${
                              qIdx === activeQuestionIdx
                                ? "bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-400/30"
                                : "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20 hover:text-white"
                            }`}
                          >
                            Q{qIdx + 1}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Floating Navigation & Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  {/* Left: Previous / Skip */}
                  {tourStep > 0 || subPhase > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExitTour}
                      className="text-xs font-medium text-slate-300 hover:text-white px-2 py-1.5 transition-colors cursor-pointer underline underline-offset-4"
                    >
                      Skip Tour
                    </button>
                  )}

                  {/* Right: Direct Select & Next Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCategory(currentTour.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/60 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 backdrop-blur-md transition-all cursor-pointer hover:scale-102 active:scale-98"
                      title={`Open ${currentTour.title}`}
                    >
                      <span>Start Here</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 px-3.5 py-2 text-xs font-black shadow-lg shadow-amber-500/35 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                    >
                      <span>
                        {subPhase === 0
                          ? "See What to Ask"
                          : tourStep === TOUR_STEPS.length - 1
                          ? "Finish Tour"
                          : "Next Category"}
                      </span>
                      <ChevronRight className="h-4 w-4 font-black" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
