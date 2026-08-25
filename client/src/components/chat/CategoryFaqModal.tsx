import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_DEFINITIONS, type CategoryId, type CategoryFaqItem } from "@/lib/categoryConfig";
import { CategoryIcon } from "./CategoryIcon";

interface CategoryFaqModalProps {
  activeCategory: CategoryId;
  onSelectTopic: (topic: CategoryFaqItem) => void;
  onClose: () => void;
}

export function CategoryFaqModal({
  activeCategory,
  onSelectTopic,
  onClose,
}: CategoryFaqModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const category = CATEGORY_DEFINITIONS[activeCategory];

  useEffect(() => {
    // Focus search on open
    setTimeout(() => searchInputRef.current?.focus(), 120);
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!category) return [];
    if (!searchQuery.trim()) return category.faqs;
    const query = searchQuery.toLowerCase();
    return category.faqs.filter(
      (f) =>
        f.label.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query)) ||
        (f.subCategory && f.subCategory.toLowerCase().includes(query))
    );
  }, [category, searchQuery]);

  if (!category) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[88%] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 text-white shrink-0 shadow-sm"
          style={{ backgroundColor: "#001C38" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20">
              <CategoryIcon id={activeCategory} className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">FAQs & Topics</h3>
              <p className="text-[10.5px] text-blue-200">{category.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${category.shortTitle} topics...`}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Topics List (Displays 6 at a time, scrollable for the rest) */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-2 text-xs divide-y divide-slate-100"
          style={{ maxHeight: "330px", scrollbarWidth: "thin" }}
        >
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <button
                key={faq.id}
                type="button"
                onClick={() => {
                  onSelectTopic(faq);
                  onClose();
                }}
                className="w-full text-left pt-2 first:pt-0 group flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/80 transition-all duration-150 border border-transparent hover:border-blue-100"
              >
                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-900 group-hover:text-blue-900 text-xs truncate">
                      {faq.label}
                    </span>
                    {faq.subCategory && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-600">
                        {faq.subCategory}
                      </span>
                    )}
                  </div>
                  {faq.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {faq.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 shrink-0 transition-colors" />
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <HelpCircle className="h-6 w-6 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No topics found matching "{searchQuery}"</p>
              <p className="text-[11px]">Try searching with a broader keyword.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 text-[11px] text-slate-500">
          <span>{filteredFaqs.length} available topics</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-xs text-slate-600 hover:text-slate-900"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
