import { type KeyboardEvent, useEffect, useRef } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeRichBubble(value: string): string {
  if (!value) return "";
  const wrapper = document.createElement("div");
  wrapper.innerHTML = value;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";

    const tag = node.nodeName.toLowerCase();
    if (tag === "br") return "\n";

    const children = Array.from(node.childNodes).map(walk).join("");
    const isBold =
      tag === "b" ||
      tag === "strong" ||
      (node instanceof HTMLElement && (
        node.style?.fontWeight === "bold" ||
        parseInt(node.style?.fontWeight || "0", 10) >= 700 ||
        node.classList?.contains("font-bold")
      ));

    if (isBold) {
      const leadingSpace = /^\s+/.test(children) ? " " : "";
      const trailingSpace = /\s+$/.test(children) ? " " : "";
      const content = children.trim();
      if (!content) return leadingSpace || trailingSpace;
      if (/^\*\*([^*]+)\*\*$/.test(content)) {
        return `${leadingSpace}${content}${trailingSpace}`;
      }
      return `${leadingSpace}**${content}**${trailingSpace}`;
    }

    if (tag === "div" || tag === "p") {
      return children ? `${children}\n` : "\n";
    }

    return children;
  }

  return Array.from(wrapper.childNodes)
    .map(walk)
    .join("")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderBubbleHtml(value: string): string {
  const normalized = normalizeRichBubble(value || "");
  return escapeHtml(normalized)
    .replace(/\*\*([^*\n]+?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}

function SingleBubbleBox({
  initialValue,
  index,
  canRemove,
  onRemove,
  onChange,
}: {
  initialValue: string;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (normalizedContent: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      contentRef.current.innerHTML = renderBubbleHtml(initialValue);
    }
  }, [initialValue]);

  function syncChanges() {
    if (!contentRef.current) return;
    onChange(normalizeRichBubble(contentRef.current.innerHTML));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      document.execCommand("bold");
      syncChanges();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      document.execCommand("insertLineBreak");
      syncChanges();
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-slate-300">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#001C38] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 shadow-xs">
            Bubble {index + 1}
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline-flex items-center gap-1">
            <kbd className="rounded border bg-slate-100 px-1 py-0.2 font-mono text-[9px] text-slate-500">Ctrl+B</kbd> bold
          </span>
        </div>
        {canRemove && (
          <AdminTooltip title="Remove Bubble" description="Delete this response bubble" side="left">
            <button
              type="button"
              onClick={onRemove}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </AdminTooltip>
        )}
      </div>
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-16 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm leading-relaxed outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all [&_b]:font-bold"
        onInput={syncChanges}
        onBlur={syncChanges}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          syncChanges();
        }}
      />
    </div>
  );
}

export function AdminResponseBubblesEditor({
  label,
  bubbles,
  onChange,
}: {
  label: string;
  bubbles: string[];
  onChange: (bubbles: string[]) => void;
}) {
  const safeBubbles = bubbles.length > 0 ? bubbles : [""];

  function updateBubble(index: number, nextContent: string) {
    const next = [...safeBubbles];
    next[index] = nextContent;
    onChange(next);
  }

  function addBubble() {
    onChange([...safeBubbles, ""]);
  }

  function removeBubble(index: number) {
    const next = safeBubbles.filter((_, currentIndex) => currentIndex !== index);
    onChange(next.length ? next : [""]);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold text-slate-800 tracking-tight">{label}</Label>
          <span className="text-[10px] text-slate-400">({safeBubbles.length} bubble{safeBubbles.length > 1 ? "s" : ""})</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addBubble}
          className="h-7 border-blue-200 bg-blue-50/70 text-xs font-semibold text-blue-800 hover:bg-blue-100 hover:text-blue-900 transition-colors shadow-xs"
        >
          <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
          Add Bubble
        </Button>
      </div>

      <div className="max-h-84 space-y-2.5 overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-100/70 p-2.5" style={{ scrollbarWidth: "thin" }}>
        {safeBubbles.map((bubble, index) => (
          <SingleBubbleBox
            key={`${label}-bubble-${index}`}
            initialValue={bubble}
            index={index}
            canRemove={safeBubbles.length > 1}
            onRemove={() => removeBubble(index)}
            onChange={(content) => updateBubble(index, content)}
          />
        ))}
      </div>
    </div>
  );
}
