import {
  BookOpen,
  X,
  AlertCircle,
  MapPin,
  Map as MapIcon,
  Search,
  Mic,
  Volume2,
  Flag,
  Sparkles,
  ClipboardList,
  GraduationCap,
  Building2,
  Landmark,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_DEFINITIONS, type CategoryId } from "@/lib/categoryConfig";

interface CategoryManualModalProps {
  activeCategory: CategoryId | null;
  onClose: () => void;
}

export function CategoryManualModal({ activeCategory, onClose }: CategoryManualModalProps) {
  const isStartingManual = activeCategory === null;
  const category = activeCategory ? CATEGORY_DEFINITIONS[activeCategory] : null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-in fade-in-0 duration-150">
      <div className="w-full max-w-sm max-h-[92%] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 text-white shrink-0 shadow-sm"
          style={{ backgroundColor: "#001C38" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {isStartingManual ? "Getting Started Manual" : `${category?.shortTitle || "Category"} User Guide`}
              </h3>
              <p className="text-[10px] text-blue-200">
                {isStartingManual ? "Chatbot Quick Start Instructions" : category?.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-700 leading-relaxed" style={{ scrollbarWidth: "thin" }}>
          {isStartingManual ? (
            /* STARTING MANUAL: WELCOMING / CATEGORY SELECTION INSTRUCTIONS */
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-blue-950 space-y-1">
                <p className="font-bold text-xs">Welcome to BukSU Chatbot</p>
                <p className="text-[11.5px] text-blue-900 leading-relaxed">
                  Our chatbot uses a <strong>Domain-Isolated Knowledge Base</strong> to deliver 100% accurate, verified answers for university inquiries.
                </p>
              </div>

              {/* Notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-semibold text-[11.5px] leading-snug">
                    Please be informed that when asking the bot, you should be direct with your questions. Avoid telling lengthy stories so the bot can accurately identify and resolve your inquiry.
                  </p>
                </div>
              </div>

              <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
                How to Start Your Conversation
              </p>

              {/* Step 1 */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">1</span>
                  <span>Select a Knowledge Category</span>
                </div>
                <p className="text-slate-600 pl-7 text-[11.5px]">
                  Choose from one of the 5 categories on the welcome screen:
                </p>
                <div className="pl-7 space-y-2 mt-1 text-[11px] text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span><strong>Campus Navigation:</strong> Rooms, laboratories, and offices.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Procedures:</strong> Enrollment, ID application, and transactions.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span><strong>Academics:</strong> Grading scale, Latin honors, and courses.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span><strong>Services:</strong> Health clinic, library hours, and dormitories.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Landmark className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span><strong>University:</strong> History, leadership, and directories.</span>
                  </div>
                </div>
              </div>

              {/* Universal Map Access */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-sky-950">
                  <MapIcon className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>Universal Campus Map Access</span>
                </div>
                <p className="text-sky-900 text-[11.5px] leading-relaxed">
                  The <strong>Interactive Campus Map</strong> is accessible from every category. Simply click the <strong>Map icon (<MapIcon className="inline h-3.5 w-3.5 text-sky-700" />)</strong> in the top header bar (located right beside this Manual guide icon) to explore campus buildings, ComLabs, offices, and walking routes at any time.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">2</span>
                  <span>Ask Your Inquiry</span>
                </div>
                <p className="text-slate-600 pl-7 text-[11.5px]">
                  Once inside a category, type or speak your direct question. You can switch categories at any time by clicking <strong>"Back to category"</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* CATEGORY-SPECIFIC MANUAL */
            <div className="space-y-3.5">
              {/* Mandatory Prompt Instruction Notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-semibold text-[11.5px] leading-snug">
                    Please be informed that when asking the bot, you should be direct with your questions. Avoid telling lengthy stories so the bot can accurately identify and resolve your inquiry.
                  </p>
                </div>
              </div>

              {/* Universal Map Access Guide */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-sky-950">
                  <MapIcon className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>Universal Campus Map Access</span>
                </div>
                <p className="text-sky-900 text-[11.5px] leading-relaxed">
                  The <strong>Interactive Campus Map</strong> is accessible at any time from every category. Simply click the <strong>Map icon (<MapIcon className="inline h-3.5 w-3.5 text-sky-700" />)</strong> in the top header bar (located right beside this Manual guide icon) to explore campus buildings, ComLabs, offices, and walking routes without leaving your conversation.
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
                  {category?.shortTitle} User Manual & Features
                </p>

                {/* Guide 1: FAQs & Topics */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Search className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Browse & Search All Category Topics</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    If you are unsure of the exact phrasing, click the <strong>"FAQs & Topics ({category?.faqs.length || 0})"</strong> button above the message bar. You can search across all registered topics in this category and click any topic to send it instantly.
                  </p>
                </div>

                {/* Guide 2: Query Formulation */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Direct Query Formulation</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    Use clear keywords specific to {category?.title.toLowerCase()} (e.g., <em>"how to enroll"</em>, <em>"student id requirements"</em>, <em>"grading system"</em>, <em>"clinic services"</em>).
                  </p>
                </div>

                {/* Guide 3: Audio & Reporting */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Volume2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Voice Input & Audio Playback</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    • <strong>Microphone:</strong> Tap the mic icon (<Mic className="inline h-3 w-3 text-slate-700" />) on the bottom right to dictate your question.<br />
                    • <strong>Speaker:</strong> Toggle the speaker icon (<Volume2 className="inline h-3 w-3 text-slate-700" />) in the header for automated speech readout.<br />
                    • <strong>Report Issue:</strong> Tap the flag icon (<Flag className="inline h-3 w-3 text-slate-700" />) on any bot response to report inaccuracies.
                  </p>
                </div>

                {/* Guide 4: Switching Categories */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <ArrowLeft className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Switching Categories</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    To inquire about another domain, click <strong>"Back to category"</strong> at the top of the chat to select a new category.
                  </p>
                </div>
              </div>

              {/* Bottom Guide Questions & Explanations */}
              {category?.manualGuides && category.manualGuides.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
                    Example Questions for {category.shortTitle}
                  </p>
                  <div className="space-y-2">
                    {category.manualGuides.map((guide, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 space-y-1"
                      >
                        <p className="font-bold text-[11.5px] text-slate-900">
                          Q: {guide.question}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-normal">
                          {guide.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Close button */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <Button
            type="button"
            onClick={onClose}
            className="w-full text-white text-xs font-semibold h-9 shadow-xs cursor-pointer"
            style={{ backgroundColor: "#001C38" }}
          >
            Close Guide
          </Button>
        </div>
      </div>
    </div>
  );
}
