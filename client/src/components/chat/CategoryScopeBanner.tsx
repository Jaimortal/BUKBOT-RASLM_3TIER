import { CATEGORY_DEFINITIONS, type CategoryId } from "@/lib/categoryConfig";
import { CategoryIcon } from "./CategoryIcon";
import { Info } from "lucide-react";

interface CategoryScopeBannerProps {
  categoryId: CategoryId;
  onTopicClick?: (payload: string, label: string) => void;
}

export function CategoryScopeBanner({ categoryId, onTopicClick }: CategoryScopeBannerProps) {
  const category = CATEGORY_DEFINITIONS[categoryId];
  if (!category) return null;

  return (
    <div className="my-3 mx-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3.5 shadow-xs">
      {/* Category Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/80 text-blue-900 shadow-2xs">
            <CategoryIcon id={categoryId} className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 leading-tight">
              {category.title}
            </h4>
            <p className="text-[10.5px] text-slate-500 font-normal">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Topic Scope Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
        {category.scopeGroups.map((group, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex flex-col justify-start"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200/60 block">
              {group.title}
            </span>
            <ul className="mt-1.5 space-y-1">
              {group.items.slice(0, 4).map((item, itemIdx) => (
                <li key={itemIdx}>
                  <button
                    type="button"
                    onClick={() => onTopicClick?.(item.payload, item.label)}
                    className="text-left w-full text-[11px] text-slate-600 hover:text-blue-700 hover:underline transition-colors truncate block cursor-pointer"
                    title={`Ask: ${item.label}`}
                  >
                    • {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Guide Note */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 pt-1">
        <Info className="h-3 w-3 text-slate-400 shrink-0" />
        <span>
          Click any topic above or type your direct question below.
        </span>
      </div>
    </div>
  );
}
