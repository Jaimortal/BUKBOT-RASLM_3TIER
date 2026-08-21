import { type KeyboardEvent, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createKnowledgeParent,
  createKnowledgeSubtopic,
  fetchKnowledgeRecords,
  updateKnowledgeRecord,
  type KnowledgeChildItem,
  type KnowledgeRecord,
} from "@/lib/adminApi";
import { AdminMapPinsEditor, ROUTE_COLORS, type AdminPin, type AdminRoute } from "@/components/admin/AdminMapPinsEditor";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ApiResponse } from "@/types/admin";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import {
  Braces,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderTree,
  Image,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  PlusCircle,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from "lucide-react";

function toLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function fromLines(value: string[]): string {
  return (value || []).join("\n");
}

function isMachineKey(value: string): boolean {
  return /^[a-z0-9][a-z0-9_]*$/.test(value.trim());
}

function keyHint(value: string): string | null {
  if (!value.trim()) return "Required.";
  if (!isMachineKey(value)) return "Use lowercase letters, numbers, and underscores only. Example: library_id_card.";
  return null;
}

function formatLabel(value: string): string {
  return String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper.length <= 4 && /^[A-Z0-9]+$/.test(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function categoryLabel(file: string): string {
  return formatLabel(file.replace(/\.json$/i, ""));
}

function pathKey(file: string, path: number[]): string {
  return `${file}:${path.join(".")}`;
}

function parentPath(path: number[]): number[] {
  return path.slice(0, -1);
}

function recordPreview(record: KnowledgeRecord): string {
  const first = record.responses.en.find((line) => line.trim()) || record.responses.ceb.find((line) => line.trim());
  if (!first) return "No response content yet.";
  const clean = first.replace(/<[^>]+>/g, "");
  return clean.length > 155 ? `${clean.slice(0, 155)}...` : clean;
}

function normalizePins(value: any[]): AdminPin[] {
  return (Array.isArray(value) ? value : [])
    .map((pin) => {
      const coords = (pin as any)?.coordinates;
      let tuple = Array.isArray(coords) && coords.length >= 2 ? [Number(coords[0]), Number(coords[1])] : null;
      if (!tuple) {
        const lat = Number((pin as any)?.lat ?? (pin as any)?.y);
        const lng = Number((pin as any)?.lng ?? (pin as any)?.x);
        tuple = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
      }
      if (!tuple || !Number.isFinite(tuple[0]) || !Number.isFinite(tuple[1])) return null;
      return {
        name: String((pin as any)?.name || "Pin"),
        coordinates: tuple as [number, number],
        floor: (pin as any)?.floor,
        access: (pin as any)?.access,
        pinType: (pin as any)?.pinType,
      };
    })
    .filter(Boolean) as AdminPin[];
}

function normalizeRoutes(value: any[]): AdminRoute[] {
  return (Array.isArray(value) ? value : [])
    .map((route, index) => ({
      id: (route as any)?.id ?? index,
      name: String((route as any)?.name || `Route ${index + 1}`),
      points: Array.isArray((route as any)?.points) ? (route as any).points : [],
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
      isDefault: Boolean((route as any)?.isDefault),
      route_order: (route as any)?.route_order || index + 1,
      route_label: (route as any)?.route_label || `Route ${index + 1}`,
    }))
    .filter((route) => route.points.length >= 0);
}

function serializePins(pins: AdminPin[]) {
  return pins.filter((pin) => pin.name.trim()).map((pin) => ({
    name: pin.name,
    coordinates: pin.coordinates,
    ...(pin.floor && { floor: pin.floor }),
    ...(pin.access && { access: pin.access }),
    ...(pin.pinType && { pinType: pin.pinType }),
  }));
}

function serializeRoutes(routes: AdminRoute[]) {
  return routes.filter((route) => route.name.trim() && Array.isArray(route.points)).map((route, index) => ({
    name: route.name,
    points: route.points,
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    route_order: route.route_order || index + 1,
    route_label: route.route_label || `Route ${index + 1}`,
  }));
}

function validateEditorDraft({
  displayName,
  en,
  ceb,
  phrases,
  subjectTerms,
  images,
  hasMapEditor,
  pins,
  routes,
  requiresResponse,
}: {
  displayName: string;
  en: string;
  ceb: string;
  phrases: string;
  subjectTerms: string;
  images: string[];
  hasMapEditor: boolean;
  pins: AdminPin[];
  routes: AdminRoute[];
  requiresResponse: boolean;
}): string[] {
  const errors: string[] = [];

  if (!displayName.trim()) errors.push("Display name is required.");
  if (requiresResponse && toLines(en).length === 0 && toLines(ceb).length === 0) {
    errors.push("At least one English or Cebuano response line is required.");
  }
  if (toLines(phrases).some((phrase) => phrase.length < 2)) {
    errors.push("Example questions must contain readable text.");
  }
  if (toLines(subjectTerms).some((term) => term.length < 2)) {
    errors.push("Subject terms must contain readable text.");
  }
  if (images.some((url) => !String(url || "").trim())) {
    errors.push("Image entries cannot be blank.");
  }
  if (hasMapEditor) {
    pins.forEach((pin, index) => {
      if (!pin.name.trim()) errors.push(`Pin ${index + 1} needs a name.`);
      if (!Array.isArray(pin.coordinates) || pin.coordinates.length < 2 || pin.coordinates.some((coord) => !Number.isFinite(Number(coord)))) {
        errors.push(`Pin ${index + 1} has invalid coordinates.`);
      }
    });
    routes.forEach((route, index) => {
      if (!route.name.trim()) errors.push(`Route ${index + 1} needs a name.`);
      if (!Array.isArray(route.points) || route.points.length < 2) {
        errors.push(`Route ${index + 1} needs at least two points.`);
      }
    });
  }

  return errors;
}

const GENERIC_SUBJECT_TERMS = new Set([
  "admission",
  "application",
  "buksu",
  "document",
  "fee",
  "general",
  "help",
  "id",
  "info",
  "information",
  "location",
  "office",
  "payment",
  "process",
  "requirement",
  "requirements",
  "schedule",
  "school",
  "service",
  "student",
  "time",
  "where",
]);

function normalizeWarningText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function warningTokens(value: string): Set<string> {
  return new Set(
    normalizeWarningText(value)
      .split(" ")
      .filter((token) => token.length > 2)
  );
}

function overlapScore(left: string, right: string): number {
  const a = warningTokens(left);
  const b = warningTokens(right);
  if (!a.size || !b.size) return 0;
  const shared = Array.from(a).filter((token) => b.has(token)).length;
  return shared / Math.max(a.size, b.size);
}

function keyEquivalent(value: string): string {
  return normalizeWarningText(value).replace(/\s+/g, "_");
}

function recordMatchesMapRef(record: KnowledgeRecord, mapRef: string): boolean {
  const target = keyEquivalent(mapRef);
  if (!target) return false;
  return [
    record.topic,
    record.intent || "",
    record.contextTopic || "",
    record.subjectKey || "",
    record.displayName,
  ].some((value) => keyEquivalent(value) === target);
}

function duplicatePhrases(records: KnowledgeRecord[], phrases: string[], currentRecordId?: string): string[] {
  const warnings: string[] = [];
  const cleanPhrases = phrases.map(normalizeWarningText).filter(Boolean);
  if (!cleanPhrases.length) return warnings;

  for (const phrase of cleanPhrases) {
    for (const record of records) {
      if (currentRecordId && record.id === currentRecordId) continue;
      for (const existing of record.phrases || []) {
        const normalizedExisting = normalizeWarningText(existing);
        if (!normalizedExisting) continue;
        const isExact = phrase === normalizedExisting;
        const isHeavyOverlap = overlapScore(phrase, normalizedExisting) >= 0.75;
        if (isExact || isHeavyOverlap) {
          warnings.push(`"${phrase}" is very similar to "${existing}" in ${record.displayName}.`);
          if (warnings.length >= 3) return warnings;
        }
      }
    }
  }

  return warnings;
}

function genericSubjectTermWarnings(subjectTerms: string[]): string[] {
  const warnings: string[] = [];
  const genericTerms = subjectTerms.filter((term) => GENERIC_SUBJECT_TERMS.has(normalizeWarningText(term)));
  if (genericTerms.length) {
    warnings.push(`Generic subject term(s): ${genericTerms.join(", ")}. Add a specific noun like "library id", "COR validation", or "student ID".`);
  }
  const shortTerms = subjectTerms.filter((term) => normalizeWarningText(term).length <= 2);
  if (shortTerms.length) {
    warnings.push(`Very short subject term(s): ${shortTerms.join(", ")}. Short terms can overlap with many records.`);
  }
  return warnings;
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        Accuracy warnings
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {warnings.map((warning, index) => (
          <li key={`${warning}-${index}`}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function searchText(record: KnowledgeRecord): string {
  return [
    record.displayName,
    record.file,
    categoryLabel(record.file),
    record.parentTopic || "",
    record.topic,
    record.intent || "",
    record.contextTopic || "",
    record.subjectKey || "",
    record.subjectType || "",
    record.subjectTerms.join(" "),
    record.phrases.join(" "),
    record.responses.en.join(" "),
    record.responses.ceb.join(" "),
    (record.items || []).map((item) => [
      item.key,
      item.group,
      item.name,
      item.value,
      item.text,
      (item.aliases || []).join(" "),
    ].join(" ")).join(" "),
  ].join(" ").toLowerCase();
}

function statusPill(label: string, active: boolean) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {label}
    </span>
  );
}

function statusValue(label: string, value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  const hasValue = text !== "" && text !== "0";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${hasValue ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {label}: {hasValue ? text : "None"}
    </span>
  );
}

function technicalLabel(record: KnowledgeRecord): string {
  if (record.path.length === 1 && record.subtopicCount > 0) return "Topic Group";
  if (record.path.length > 1) return "Answer Topic";
  return record.hasResponses ? "Answer Topic" : "Topic Group";
}

function breadcrumb(record: KnowledgeRecord, byId: Map<string, KnowledgeRecord>): string[] {
  const crumbs = [categoryLabel(record.file)];
  const parent = byId.get(pathKey(record.file, parentPath(record.path)));
  if (parent) crumbs.push(parent.displayName);
  crumbs.push(record.displayName);
  return crumbs;
}

function splitEditableLines(value: string): string[] {
  const lines = value.split("\n");
  return lines.length ? lines : [""];
}

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHtmlBoldToMarkdown(value: string): string {
  return String(value || "")
    .replace(/<\s*(b|strong)\s*>/gi, "**")
    .replace(/<\s*\/\s*(b|strong)\s*>/gi, "**");
}

function renderMarkdownBoldHtml(value: string): string {
  const markdown = safeHtmlBoldToMarkdown(value);
  const escaped = escapeHtml(markdown);
  return escaped.replace(/\*\*([^*\n]+?)\*\*/g, "<b>$1</b>");
}

function normalizeRichLine(value: string): string {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = value
    .replace(/<strong\b[^>]*>/gi, "<b>")
    .replace(/<\/strong>/gi, "</b>")
    .replace(/<span\b[^>]*style=["'][^"']*font-weight:\s*(bold|700)[^"']*["'][^>]*>/gi, "<b>")
    .replace(/<\/span>/gi, "</b>");

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeName.toLowerCase() === "br") {
      return "\n";
    }
    const children = Array.from(node.childNodes).map(walk).join("");
    const tag = node.nodeName.toLowerCase();
    if (tag === "b" || tag === "strong") {
      const content = children.trim();
      return content ? `**${content}**` : "";
    }
    return children;
  }

  return Array.from(wrapper.childNodes)
    .map(walk)
    .join("")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+\*\*/g, "**")
    .replace(/\*\*\s+/g, "**")
    .trim();
}

function ResponseLinesEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lines = splitEditableLines(value);

  function updateLine(index: number, nextLine: string) {
    const next = [...lines];
    next[index] = normalizeRichLine(nextLine);
    onChange(next.join("\n"));
  }

  function addLine() {
    const next = [...lines, ""];
    onChange(next.join("\n"));
    window.requestAnimationFrame(() => editorRefs.current[next.length - 1]?.focus());
  }

  function removeLine(index: number) {
    const next = lines.filter((_, lineIndex) => lineIndex !== index);
    onChange((next.length ? next : [""]).join("\n"));
  }

  function removeEmptyLines() {
    const next = lines.map((line) => normalizeRichLine(line)).filter(Boolean);
    onChange((next.length ? next : [""]).join("\n"));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.ctrlKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      document.execCommand("bold");
      updateLine(index, event.currentTarget.innerHTML);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      addLine();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <AdminTooltip
            title="Add Line"
            description="Insert a new paragraph or alternate response line bubble"
            side="top"
          >
            <Button type="button" size="sm" variant="outline" onClick={addLine}>Add line</Button>
          </AdminTooltip>
          <AdminTooltip
            title="Clean Empty"
            description="Automatically remove all blank or whitespace-only response lines"
            side="top"
          >
            <Button type="button" size="sm" variant="outline" onClick={removeEmptyLines}>Clean empty</Button>
          </AdminTooltip>
        </div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border bg-slate-50 p-2">
        {lines.map((line, index) => (
          <div key={`${label}-${index}`} className="rounded-md border bg-white p-2 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Line {index + 1}</span>
              {lines.length > 1 && (
                <AdminTooltip
                  title="Remove Line"
                  description="Delete this response line bubble"
                  side="left"
                >
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="text-[10px] text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </AdminTooltip>
              )}
            </div>
            <div
              ref={(node) => { editorRefs.current[index] = node; }}
              contentEditable
              suppressContentEditableWarning
              className="min-h-16 rounded border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 [&_b]:font-bold"
              onBlur={(event) => updateLine(index, event.currentTarget.innerHTML)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onPaste={(event) => {
                event.preventDefault();
                const text = event.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
                updateLine(index, event.currentTarget.innerHTML);
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownBoldHtml(line) }}
            />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Each box becomes one chatbot bubble. Select text and press Ctrl+B to bold or unbold it.</p>
    </div>
  );
}

function aliasesText(item: KnowledgeChildItem): string {
  return (item.aliases || []).join("\n");
}

function ChildItemEditorModal({
  item,
  open,
  onClose,
  onSave,
}: {
  item: KnowledgeChildItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (item: KnowledgeChildItem) => void;
}) {
  const [draft, setDraft] = useState<KnowledgeChildItem>(item || {});
  const valueRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft(item || {});
  }, [item]);

  function update<K extends keyof KnowledgeChildItem>(key: K, value: KnowledgeChildItem[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    onSave({
      ...draft,
      key: String(draft.key || "").trim(),
      group: String(draft.group || "").trim().toUpperCase(),
      name: String(draft.name || "").trim(),
      value: normalizeRichLine(String(draft.value || "")),
      text: normalizeRichLine(String(draft.text || "")),
      aliases: toLines(aliasesText(draft)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-[#001C38] to-[#0356a9] px-5 pb-3 pt-4 rounded-t-lg">
          <DialogTitle className="text-white">Edit child row</DialogTitle>
          <p className="text-xs text-blue-200">Only safe display fields are editable here. Routing logic remains protected.</p>
        </DialogHeader>
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Group</Label>
              <Input value={draft.group || ""} onChange={(event) => update("group", event.target.value)} placeholder="CAS, COT, COB" />
            </div>
            <div className="space-y-2">
              <Label>Admin key</Label>
              <Input value={draft.key || ""} onChange={(event) => update("key", event.target.value)} placeholder="ba_philosophy_slots" />
              <p className="text-[10px] text-muted-foreground">Used only to identify this row in JSON.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={draft.name || ""} onChange={(event) => update("name", event.target.value)} placeholder="Bachelor of Arts in Philosophy" />
          </div>

          <div className="space-y-2">
            <Label>Value / answer detail</Label>
            <div
              ref={valueRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-20 rounded border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 [&_b]:font-bold"
              onBlur={(event) => update("value", normalizeRichLine(event.currentTarget.innerHTML))}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key.toLowerCase() === "b") {
                  event.preventDefault();
                  document.execCommand("bold");
                  update("value", normalizeRichLine(event.currentTarget.innerHTML));
                }
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownBoldHtml(draft.value || "") }}
            />
            <p className="text-[11px] text-muted-foreground">Select text and press Ctrl+B to bold or unbold.</p>
          </div>

          <div className="space-y-2">
            <Label>Aliases, one per line</Label>
            <Textarea
              value={aliasesText(draft)}
              onChange={(event) => update("aliases", toLines(event.target.value))}
              className="min-h-28 font-mono text-xs"
              placeholder={"ba philo\nbaphilo\nphilosophy"}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-3">
          <AdminTooltip title="Cancel" description="Discard changes and close modal" side="top">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </AdminTooltip>
          <AdminTooltip title="Save Child Row" description="Save modified child fields" side="top">
            <Button onClick={save} className="bg-[#001C38] text-white hover:bg-[#032f5d]">Save child row</Button>
          </AdminTooltip>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChildItemsEditor({
  items,
  disclaimer,
  onItemsChange,
  onDisclaimerChange,
}: {
  items: KnowledgeChildItem[];
  disclaimer: string;
  onItemsChange: (items: KnowledgeChildItem[]) => void;
  onDisclaimerChange: (value: string) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const currentItem = editingIndex === null ? null : (items[editingIndex] || null);

  function openExisting(index: number) {
    setEditingIndex(index);
    setModalOpen(true);
  }

  function saveItem(item: KnowledgeChildItem) {
    const next = [...items];
    if (editingIndex !== null) next[editingIndex] = item;
    onItemsChange(next);
    setModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        Child rows allow one parent answer to return the whole list, one matching row, or multiple matching rows. Admins can edit existing rows only; creation and deletion are developer-controlled.
      </div>

      <div className="space-y-2">
        <Label>Shared note / disclaimer</Label>
        <Textarea value={disclaimer} onChange={(event) => onDisclaimerChange(event.target.value)} className="min-h-20 text-sm" />
      </div>

      <div className="flex items-center justify-between">
        <Label>Child rows ({items.length})</Label>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
          No child rows are configured for this record. Child rows are created by the developer to protect routing stability.
        </div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border bg-slate-50 p-2">
          {items.map((item, index) => (
            <div key={`${item.key || item.name || "child"}-${index}`} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{item.group || "GROUP"}</span>
                    <p className="font-semibold text-sm text-slate-800">{item.name || item.text || "Untitled child row"}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: renderMarkdownBoldHtml(item.value || item.text || "") }} />
                  <p className="mt-1 text-[10px] text-muted-foreground">Aliases: {(item.aliases || []).join(", ") || "None"}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <AdminTooltip
                    title="Edit Child Row"
                    description="Modify group, aliases, and detailed answer values"
                    side="left"
                  >
                    <Button type="button" size="sm" variant="outline" onClick={() => openExisting(index)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </AdminTooltip>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ChildItemEditorModal
        item={currentItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveItem}
      />
    </div>
  );
}

function KnowledgeEditor({
  record,
  open,
  onClose,
  recordsById,
}: {
  record: KnowledgeRecord;
  open: boolean;
  onClose: () => void;
  recordsById: Map<string, KnowledgeRecord>;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(record.displayName || "");
  const [en, setEn] = useState(fromLines(record.responses.en));
  const [ceb, setCeb] = useState(fromLines(record.responses.ceb));
  const [subjectTerms, setSubjectTerms] = useState(fromLines(record.ownSubjectTerms ?? record.subjectTerms));
  const [phrases, setPhrases] = useState(fromLines(record.phrases));
  const [images, setImages] = useState<string[]>(record.images || []);
  const [mapRef, setMapRef] = useState(record.mapRef || "");
  const [hasMapEditor, setHasMapEditor] = useState(record.hasMap);
  const [pins, setPins] = useState<AdminPin[]>(normalizePins(record.pins));
  const [routes, setRoutes] = useState<AdminRoute[]>(normalizeRoutes(record.routes));
  const [items, setItems] = useState<KnowledgeChildItem[]>(record.items || []);
  const [itemDisclaimer, setItemDisclaimer] = useState(record.itemDisclaimer || "");

  useEffect(() => {
    setDisplayName(record.displayName || "");
    setEn(fromLines(record.responses.en));
    setCeb(fromLines(record.responses.ceb));
    setSubjectTerms(fromLines(record.ownSubjectTerms ?? record.subjectTerms));
    setPhrases(fromLines(record.phrases));
    setImages(record.images || []);
    setMapRef(record.mapRef || "");
    setHasMapEditor(record.hasMap);
    setPins(normalizePins(record.pins));
    setRoutes(normalizeRoutes(record.routes));
    setItems(record.items || []);
    setItemDisclaimer(record.itemDisclaimer || "");
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<ApiResponse> => {
      const errors = validateEditorDraft({
        displayName,
        en,
        ceb,
        phrases,
        subjectTerms,
        images,
        hasMapEditor,
        pins,
        routes,
        requiresResponse: record.hasResponses || record.path.length > 1,
      });
      if (errors.length) {
        return { success: false, message: errors.join(" ") };
      }

      const payload: Partial<KnowledgeRecord> & { path: number[]; topic: string } = {
        path: record.path,
        topic: record.topic,
        displayName: displayName.trim(),
        responses: {
          en: toLines(en),
          ceb: toLines(ceb),
        },
        subjectTerms: toLines(subjectTerms),
        phrases: toLines(phrases),
        images: images.map((url) => url.trim()).filter(Boolean),
        items,
        itemDisclaimer,
        mapRef,
      };

      if (hasMapEditor) {
        payload.pins = serializePins(pins);
        payload.routes = serializeRoutes(routes);
      }

      return updateKnowledgeRecord(record.file, payload);
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Save failed", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Knowledge record saved", description: displayName || record.displayName });
      queryClient.invalidateQueries({ queryKey: ["knowledgeRecords"] });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error?.message || "Invalid data", variant: "destructive" });
    },
  });

  const crumbs = breadcrumb(record, recordsById);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-[#001C38] to-[#0356a9] px-5 pb-3 pt-4 rounded-t-lg">
          <DialogTitle className="text-lg font-bold leading-tight text-white">{record.displayName}</DialogTitle>
          <div className="flex flex-wrap items-center gap-1 text-xs text-blue-200">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb}
              </span>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="responses" className="w-full">
            <TabsList className="h-10 w-full justify-start gap-1 rounded-none border-b bg-gray-50 px-4">
              <TabsTrigger value="responses" className="text-xs">Responses</TabsTrigger>
              <TabsTrigger value="children" className="text-xs">Child Rows</TabsTrigger>
              <TabsTrigger value="examples" className="text-xs">Retrieval Terms</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Images</TabsTrigger>
              <TabsTrigger value="map" className="text-xs">Map & Pins</TabsTrigger>
              <TabsTrigger value="developer" className="text-xs">Developer Details</TabsTrigger>
            </TabsList>

            <TabsContent value="responses" className="m-0 grid gap-4 p-4">
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Safe editing mode
                </div>
                <p className="mt-1">Edit only the admin label and answer content shown here. Routing fields are protected.</p>
              </div>
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                <p className="text-[11px] text-muted-foreground">This label helps admins find the answer. It does not change chatbot routing.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ResponseLinesEditor label="English response lines" value={en} onChange={setEn} />
                <ResponseLinesEditor label="Cebuano/Bisaya response lines" value={ceb} onChange={setCeb} />
              </div>
            </TabsContent>

            <TabsContent value="children" className="m-0 p-4">
              <ChildItemsEditor
                items={items}
                disclaimer={itemDisclaimer}
                onItemsChange={setItems}
                onDisclaimerChange={setItemDisclaimer}
              />
            </TabsContent>

            <TabsContent value="examples" className="m-0 space-y-4 p-4">
              <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Subject terms and example questions improve retrieval accuracy. Keep them specific to this answer so they do not overlap with unrelated topics.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject terms, one per line</Label>
                  <Textarea value={subjectTerms} onChange={(event) => setSubjectTerms(event.target.value)} className="min-h-72 font-mono text-xs" />
                  <p className="text-[11px] text-muted-foreground">These terms describe the subject, office, service, course, or document for this record.</p>
                </div>
                <div className="space-y-2">
                  <Label>Example questions, one per line</Label>
                  <Textarea value={phrases} onChange={(event) => setPhrases(event.target.value)} className="min-h-72 font-mono text-xs" />
                  <p className="text-[11px] text-muted-foreground">These examples help retrieval match the right answer. Keep them natural and specific.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="m-0 space-y-4 p-5">
              <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />
              {images.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
                  <Image className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  No images yet. Upload an image or paste a URL above.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((url, index) => (
                    <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border bg-white shadow-sm">
                      <img
                        src={url}
                        alt={`Knowledge image ${index + 1}`}
                        className="h-32 w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.background = "#f3f4f6";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}
                          className="rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                          title="Remove image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="truncate px-1.5 py-1 text-[10px] text-gray-400">{url}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="map" className="m-0 space-y-4 p-4">
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Current map data
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Map payload</span><span>{record.hasMap ? "Available" : "None"}</span>
                  <span>Map reference</span><span>{mapRef || "None"}</span>
                  <span>Pins</span><span>{pins.length}</span>
                  <span>Routes</span><span>{routes.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Map reference</Label>
                <Input value={mapRef} onChange={(event) => setMapRef(event.target.value)} placeholder="Optional map reference key" />
                <p className="text-[11px] text-muted-foreground">Use this only when this record should reuse a known map reference. Leave blank if pins and routes are stored directly.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={hasMapEditor}
                  onChange={(event) => setHasMapEditor(event.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Enable editable map pins/routes for this answer
              </label>
              {hasMapEditor ? (
                <AdminMapPinsEditor
                  pins={pins}
                  routes={routes}
                  onPinsChange={setPins}
                  onRoutesChange={setRoutes}
                  mapSize={420}
                />
              ) : (
                <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                  Enable map editing above to add pins and routes. Existing map references are preserved.
                </div>
              )}
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                This editor saves pins and routes without exposing raw JSON. Older map data stays compatible.
              </div>
            </TabsContent>

            <TabsContent value="developer" className="m-0 p-4">
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                  Read-only routing details
                </div>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div><span className="text-muted-foreground">File:</span> <span className="font-mono">{record.file}</span></div>
                  <div><span className="text-muted-foreground">Path:</span> <span className="font-mono">{record.path.join(".")}</span></div>
                  <div><span className="text-muted-foreground">Topic machine ID:</span> <span className="font-mono">{record.topic}</span></div>
                  <div><span className="text-muted-foreground">Intent:</span> <span className="font-mono">{record.intent || "None"}</span></div>
                  <div><span className="text-muted-foreground">Context topic:</span> <span className="font-mono">{record.contextTopic || "None"}</span></div>
                  <div><span className="text-muted-foreground">Subject key:</span> <span className="font-mono">{record.subjectKey || "None"}</span></div>
                  <div><span className="text-muted-foreground">Subject type:</span> <span className="font-mono">{record.subjectType || "None"}</span></div>
                  <div><span className="text-muted-foreground">Subject terms:</span> <span>{record.subjectTerms.join(", ") || "None"}</span></div>
                  <div><span className="text-muted-foreground">Map payload:</span> <span>{record.hasMap ? "Available" : "None"}</span></div>
                  <div><span className="text-muted-foreground">Map reference:</span> <span className="font-mono">{record.mapRef || "None"}</span></div>
                  <div><span className="text-muted-foreground">Images:</span> <span>{record.images.length}</span></div>
                  <div><span className="text-muted-foreground">Example questions:</span> <span>{record.phrases.length}</span></div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-between border-t bg-gray-50 px-5 py-3 rounded-b-lg">
          <div className="text-xs text-muted-foreground">
            Saves this selected record only. Unknown JSON fields are preserved.
          </div>
          <div className="flex gap-2">
            <AdminTooltip title="Cancel" description="Discard all unsaved edits and close editor" side="top">
              <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Cancel</Button>
            </AdminTooltip>
            <AdminTooltip title="Save Changes" description="Save all responses, maps, pins, and retrieval terms" side="top">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="text-white"
                style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </AdminTooltip>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateParentSubjectDialog({
  open,
  onClose,
  files,
  records,
}: {
  open: boolean;
  onClose: () => void;
  files: { file: string; count: number }[];
  records: KnowledgeRecord[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState("");
  const [topic, setTopic] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [subjectType, setSubjectType] = useState("general");
  const [subjectTerms, setSubjectTerms] = useState("");

  useEffect(() => {
    if (!open) return;
    setFile((current) => current || files[0]?.file || "");
  }, [files, open]);

  function resetAndClose() {
    setTopic("");
    setDisplayName("");
    setSubjectKey("");
    setSubjectType("general");
    setSubjectTerms("");
    onClose();
  }

  const warnings = useMemo(() => {
    const result: string[] = [];
    const cleanTopic = topic.trim();
    const cleanSubjectKey = subjectKey.trim();
    const subjectTermLines = toLines(subjectTerms);

    if (file && cleanTopic && records.some((record) => record.file === file && record.topic === cleanTopic)) {
      result.push(`Topic key "${cleanTopic}" already exists inside ${categoryLabel(file)}.`);
    }
    if (cleanSubjectKey && records.some((record) => record.subjectKey === cleanSubjectKey)) {
      result.push(`Subject key "${cleanSubjectKey}" already exists. Reusing it can merge unrelated context memory.`);
    }
    result.push(...genericSubjectTermWarnings(subjectTermLines));
    if (!subjectTermLines.length) {
      result.push("Subject terms are empty. Add specific terms so retrieval can find this group.");
    }

    return result;
  }, [file, records, subjectKey, subjectTerms, topic]);

  const mutation = useMutation({
    mutationFn: () => {
      const topicError = keyHint(topic);
      const subjectKeyError = keyHint(subjectKey);
      if (!file) return Promise.resolve({ success: false, message: "Choose a knowledge category file." });
      if (topicError) return Promise.resolve({ success: false, message: `Topic key: ${topicError}` });
      if (subjectKeyError) return Promise.resolve({ success: false, message: `Subject key: ${subjectKeyError}` });
      if (toLines(subjectTerms).length === 0) {
        return Promise.resolve({ success: false, message: "Add at least one subject term so retrieval can find this group." });
      }

      return createKnowledgeParent(file, {
        topic: topic.trim(),
        displayName: displayName.trim(),
        subjectKey: subjectKey.trim(),
        subjectType: subjectType.trim() || "general",
        subjectTerms: toLines(subjectTerms),
      });
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Create failed", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Parent subject created", description: displayName || topic });
      queryClient.invalidateQueries({ queryKey: ["knowledgeRecords"] });
      resetAndClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && resetAndClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-[#001C38] to-[#0356a9] px-5 pb-3 pt-4 rounded-t-lg">
          <DialogTitle className="text-white">Create parent subject</DialogTitle>
          <p className="text-xs text-blue-200">Use this for a new grouped subject that will contain answer subtopics.</p>
        </DialogHeader>
        <div className="grid gap-4 p-5">
          <div className="space-y-2">
            <Label>Knowledge category</Label>
            <Select value={file} onValueChange={setFile}>
              <SelectTrigger><SelectValue placeholder="Choose JSON file" /></SelectTrigger>
              <SelectContent>
                {files.map((item) => (
                  <SelectItem key={item.file} value={item.file}>{categoryLabel(item.file)} ({item.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Topic key</Label>
              <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="student_clearance" />
              <p className="text-[11px] text-muted-foreground">Machine key. Do not use spaces.</p>
            </div>
            <div className="space-y-2">
              <Label>Subject key</Label>
              <Input value={subjectKey} onChange={(event) => setSubjectKey(event.target.value)} placeholder="student_clearance" />
              <p className="text-[11px] text-muted-foreground">Stable subject identifier for retrieval memory.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Student Clearance" />
            </div>
            <div className="space-y-2">
              <Label>Subject type</Label>
              <Input value={subjectType} onChange={(event) => setSubjectType(event.target.value)} placeholder="service, document, office, course" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject terms, one per line</Label>
            <Textarea value={subjectTerms} onChange={(event) => setSubjectTerms(event.target.value)} className="min-h-36 font-mono text-xs" />
          </div>
          <WarningList warnings={warnings} />
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-3">
          <Button variant="outline" onClick={resetAndClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-[#001C38] text-white hover:bg-[#032f5d]">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Create parent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateSubtopicDialog({
  open,
  onClose,
  parent,
  records,
}: {
  open: boolean;
  onClose: () => void;
  parent: KnowledgeRecord | null;
  records: KnowledgeRecord[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [intent, setIntent] = useState("");
  const [contextTopic, setContextTopic] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [en, setEn] = useState("");
  const [ceb, setCeb] = useState("");
  const [phrases, setPhrases] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [mapRef, setMapRef] = useState("");
  const [hasMapEditor, setHasMapEditor] = useState(false);
  const [pins, setPins] = useState<AdminPin[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);

  useEffect(() => {
    if (!open) return;
    setTopic("");
    setIntent("");
    setContextTopic("");
    setDisplayName("");
    setEn("");
    setCeb("");
    setPhrases("");
    setImages([]);
    setMapRef("");
    setHasMapEditor(false);
    setPins([]);
    setRoutes([]);
  }, [open, parent]);

  function close() {
    onClose();
  }

  const warnings = useMemo(() => {
    const result: string[] = [];
    const cleanTopic = topic.trim();
    const phraseLines = toLines(phrases);
    const hasResponse = toLines(en).length > 0 || toLines(ceb).length > 0;

    if (!hasResponse) {
      result.push("Responses are empty. Add at least one English or Cebuano answer before saving.");
    }
    if (!phraseLines.length) {
      result.push("Example questions are empty. Add phrases so retrieval can match student wording.");
    }
    if (parent && cleanTopic) {
      const siblingExists = records.some((record) => (
        record.file === parent.file &&
        record.topic === cleanTopic &&
        record.path.length === parent.path.length + 1 &&
        parent.path.every((part, index) => record.path[index] === part)
      ));
      if (siblingExists) {
        result.push(`Subtopic key "${cleanTopic}" already exists under ${parent.displayName}.`);
      }

      const fileDuplicate = records.some((record) => record.file === parent.file && record.topic === cleanTopic);
      if (fileDuplicate && !siblingExists) {
        result.push(`Topic key "${cleanTopic}" already exists somewhere in ${categoryLabel(parent.file)}. This can be okay for generic subtopics like requirements, but use a unique key when the topic is specific.`);
      }
    }
    if (mapRef.trim() && !records.some((record) => recordMatchesMapRef(record, mapRef))) {
      result.push(`Map reference "${mapRef.trim()}" does not match an existing topic, intent, subject key, context topic, or display name.`);
    }

    result.push(...duplicatePhrases(records, phraseLines));

    return result;
  }, [ceb, en, mapRef, parent, phrases, records, topic]);

  const mutation = useMutation({
    mutationFn: () => {
      const topicError = keyHint(topic);
      if (!parent) return Promise.resolve({ success: false, message: "Choose a parent subject first." });
      if (topicError) return Promise.resolve({ success: false, message: `Topic key: ${topicError}` });
      if (intent.trim() && !isMachineKey(intent)) {
        return Promise.resolve({ success: false, message: "Intent must use lowercase letters, numbers, and underscores only." });
      }
      if (contextTopic.trim() && !isMachineKey(contextTopic)) {
        return Promise.resolve({ success: false, message: "Context topic must use lowercase letters, numbers, and underscores only." });
      }
      if (toLines(en).length === 0 && toLines(ceb).length === 0) {
        return Promise.resolve({ success: false, message: "Add at least one English or Cebuano response line." });
      }
      if (toLines(phrases).length === 0) {
        return Promise.resolve({ success: false, message: "Add at least one example question for retrieval accuracy." });
      }
      const mapErrors = validateEditorDraft({
        displayName: displayName || topic,
        en,
        ceb,
        phrases,
        subjectTerms: "",
        images,
        hasMapEditor,
        pins,
        routes,
        requiresResponse: true,
      });
      if (mapErrors.length) return Promise.resolve({ success: false, message: mapErrors.join(" ") });

      return createKnowledgeSubtopic(parent.file, {
        parentPath: parent.path,
        topic: topic.trim(),
        displayName: displayName.trim(),
        intent: intent.trim(),
        contextTopic: contextTopic.trim(),
        responses: { en: toLines(en), ceb: toLines(ceb) },
        phrases: toLines(phrases),
        images: images.map((url) => url.trim()).filter(Boolean),
        mapRef: mapRef.trim(),
        pins: hasMapEditor ? serializePins(pins) : undefined,
        routes: hasMapEditor ? serializeRoutes(routes) : undefined,
      });
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Create failed", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Subtopic created", description: displayName || topic });
      queryClient.invalidateQueries({ queryKey: ["knowledgeRecords"] });
      close();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-[#001C38] to-[#0356a9] px-5 pb-3 pt-4 rounded-t-lg">
          <DialogTitle className="text-white">Create answer subtopic</DialogTitle>
          <p className="text-xs text-blue-200">
            Parent: {parent ? `${categoryLabel(parent.file)} > ${parent.displayName}` : "None selected"}
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs defaultValue="content">
            <TabsList className="mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
              <TabsTrigger value="media">Images</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="m-0 space-y-4">
              <WarningList warnings={warnings.filter((warning) => (
                warning.toLowerCase().includes("response") ||
                warning.toLowerCase().includes("subtopic key") ||
                warning.toLowerCase().includes("topic key")
              ))} />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Topic key</Label>
                  <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="requirements" />
                </div>
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Student Clearance Requirements" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Intent</Label>
                  <Input value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="student_clearance_requirements" />
                </div>
                <div className="space-y-2">
                  <Label>Context topic</Label>
                  <Input value={contextTopic} onChange={(event) => setContextTopic(event.target.value)} placeholder="requirements" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ResponseLinesEditor label="English response lines" value={en} onChange={setEn} />
                <ResponseLinesEditor label="Cebuano/Bisaya response lines" value={ceb} onChange={setCeb} />
              </div>
            </TabsContent>
            <TabsContent value="retrieval" className="m-0 space-y-2">
              <Label>Example questions, one per line</Label>
              <Textarea value={phrases} onChange={(event) => setPhrases(event.target.value)} className="min-h-72 font-mono text-xs" />
              <p className="text-[11px] text-muted-foreground">Add English and Bisaya examples when possible. Specific examples improve accuracy.</p>
              <WarningList warnings={warnings} />
            </TabsContent>
            <TabsContent value="media" className="m-0 space-y-4">
              <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((url, index) => (
                    <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border bg-white shadow-sm">
                      <img src={url} alt={`Knowledge image ${index + 1}`} className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg"
                        title="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="map" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label>Map reference</Label>
                <Input value={mapRef} onChange={(event) => setMapRef(event.target.value)} placeholder="Optional map reference key" />
              </div>
              <WarningList warnings={warnings.filter((warning) => warning.toLowerCase().includes("map reference"))} />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={hasMapEditor}
                  onChange={(event) => setHasMapEditor(event.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Add editable map pins/routes now
              </label>
              {hasMapEditor && (
                <AdminMapPinsEditor
                  pins={pins}
                  routes={routes}
                  onPinsChange={setPins}
                  onRoutesChange={setRoutes}
                  mapSize={420}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-3">
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !parent} className="bg-[#001C38] text-white hover:bg-[#032f5d]">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Create subtopic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminKnowledgeManager() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [fileFilter, setFileFilter] = useState("all");
  const [selected, setSelected] = useState<KnowledgeRecord | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["knowledgeRecords"],
    queryFn: fetchKnowledgeRecords,
    staleTime: 30000,
  });

  const records = data?.records || [];
  const files = data?.files || [];

  const recordsById = useMemo(() => {
    const map = new Map<string, KnowledgeRecord>();
    records.forEach((record) => map.set(record.id, record));
    return map;
  }, [records]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, KnowledgeRecord[]>();
    records.forEach((record) => {
      if (record.path.length <= 1) return;
      const key = pathKey(record.file, parentPath(record.path));
      map.set(key, [...(map.get(key) || []), record]);
    });
    return map;
  }, [records]);

  const visibleIds = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const matchesFile = (record: KnowledgeRecord) => fileFilter === "all" || record.file === fileFilter;
    const directMatches = new Set<string>();

    records.forEach((record) => {
      if (!matchesFile(record)) return;
      if (!term || searchText(record).includes(term)) directMatches.add(record.id);
    });

    const visible = new Set<string>(directMatches);
    directMatches.forEach((id) => {
      const record = recordsById.get(id);
      if (!record) return;
      for (let depth = record.path.length - 1; depth >= 1; depth -= 1) {
        visible.add(pathKey(record.file, record.path.slice(0, depth)));
      }
      records.forEach((candidate) => {
        const isDescendant =
          candidate.file === record.file &&
          candidate.path.length > record.path.length &&
          record.path.every((part, index) => candidate.path[index] === part);
        if (isDescendant) visible.add(candidate.id);
      });
    });

    return visible;
  }, [deferredSearch, fileFilter, records, recordsById]);

  const visibleFiles = useMemo(() => {
    return files
      .filter((file) => fileFilter === "all" || file.file === fileFilter)
      .filter((file) => records.some((record) => record.file === file.file && visibleIds.has(record.id)));
  }, [fileFilter, files, records, visibleIds]);

  const fileTreeData = useMemo(() => {
    return visibleFiles.map((file) => {
      const roots = records.filter(
        (record) => record.file === file.file && record.path.length === 1 && visibleIds.has(record.id)
      );
      const rootsWithChildren = roots.map((root) => {
        const children = (childrenByParent.get(root.id) || []).filter((child) => visibleIds.has(child.id));
        return {
          root,
          crumbs: breadcrumb(root, recordsById),
          children: children.map((child) => ({
            child,
            crumbs: breadcrumb(child, recordsById),
          })),
        };
      });
      return {
        file,
        rootsWithChildren,
      };
    });
  }, [visibleFiles, records, visibleIds, childrenByParent, recordsById]);

  const handleOpen = useCallback((record: KnowledgeRecord) => {
    setSelected(record);
  }, []);

  const toggleFileCollapse = useCallback((fileName: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
  }, []);

  const toggleAllCollapse = useCallback(() => {
    if (collapsedFiles.size > 0) {
      setCollapsedFiles(new Set());
    } else {
      setCollapsedFiles(new Set(files.map((f) => f.file)));
    }
  }, [collapsedFiles.size, files]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading knowledge records...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Knowledge Manager</h2>
          <p className="text-xs text-muted-foreground">Browse by Knowledge Category, Topic Group, and Answer Topic. Routing fields are protected.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search label, answer, intent, phrase..."
              className="w-full pl-8 sm:w-80"
            />
          </div>
          <Select value={fileFilter} onValueChange={setFileFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All knowledge categories</SelectItem>
              {files.map((file) => (
                <SelectItem key={file.file} value={file.file}>{categoryLabel(file.file)} ({file.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AdminTooltip
            title={collapsedFiles.size > 0 ? "Expand button" : "Collapse button"}
            description={collapsedFiles.size > 0 ? "Expand all categorized knowledge dropdown data" : "Collapse all in to categorized dropdown data"}
            side="bottom"
          >
            <Button variant="outline" size="sm" onClick={toggleAllCollapse} className="text-xs">
              {collapsedFiles.size > 0 ? "Expand All" : "Collapse All"}
            </Button>
          </AdminTooltip>
          <AdminTooltip
            title="Refresh Knowledge"
            description="Reload all knowledge topics, categories, and answers from server"
            side="bottom"
          >
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">Refresh</Button>
          </AdminTooltip>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-xs">
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-600">
            <div className="col-span-4">Knowledge Category / Topic</div>
            <div className="col-span-4">Answer Preview</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-1 text-right">Edit</div>
          </div>
        </div>
        <div className="max-h-[620px] overflow-y-auto divide-y">
          {fileTreeData.map(({ file, rootsWithChildren }) => {
            const isCollapsed = collapsedFiles.has(file.file);
            return (
              <div key={file.file} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleFileCollapse(file.file)}
                  className="w-full flex items-center justify-between bg-blue-50/80 hover:bg-blue-100/80 transition-colors px-4 py-2.5 text-sm font-semibold text-blue-950 select-none text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="h-4 w-4 text-blue-700 shrink-0" /> : <ChevronDown className="h-4 w-4 text-blue-700 shrink-0" />}
                    <FolderTree className="h-4 w-4 text-blue-700 shrink-0" />
                    <span>{categoryLabel(file.file)}</span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700 shadow-xs">{file.count} records</span>
                </button>
                {!isCollapsed && rootsWithChildren.map(({ root, crumbs: rootCrumbs, children }) => (
                  <div key={root.id}>
                    <KnowledgeRow record={root} crumbs={rootCrumbs} onOpen={handleOpen} depth={0} />
                    {children.map(({ child, crumbs: childCrumbs }) => (
                      <KnowledgeRow key={child.id} record={child} crumbs={childCrumbs} onOpen={handleOpen} depth={1} />
                    ))}
                    {children.length === 0 && root.subtopicCount > 0 && (
                      <div className="border-t px-10 py-2 text-xs text-muted-foreground bg-slate-50/50">No answer topics matched your current search.</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {fileTreeData.length === 0 && (
            <div className="py-14 text-center text-sm text-muted-foreground">No knowledge records matched your filters.</div>
          )}
        </div>
      </div>

      {selected && (
        <KnowledgeEditor record={selected} open={!!selected} onClose={() => setSelected(null)} recordsById={recordsById} />
      )}
    </div>
  );
}

const KnowledgeRow = memo(function KnowledgeRow({
  record,
  crumbs,
  onOpen,
  depth,
}: {
  record: KnowledgeRecord;
  crumbs: string[];
  onOpen: (record: KnowledgeRecord) => void;
  depth: number;
}) {
  const isTopicGroup = record.path.length === 1 && record.subtopicCount > 0;
  const preview = recordPreview(record);

  return (
    <div className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm hover:bg-slate-50/70 transition-colors">
      <div className="col-span-4 min-w-0">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 shrink-0 ${depth ? "ml-6" : ""}`}>
            {depth ? <FileText className="h-4 w-4 text-emerald-600" /> : <Layers className="h-4 w-4 text-blue-600" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{record.displayName}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{technicalLabel(record)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              {crumbs.map((crumb, index) => (
                <span key={`${record.id}-${crumb}-${index}`} className="inline-flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  {crumb}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-4 min-w-0 text-xs text-slate-600">
        <p className="line-clamp-3 leading-relaxed">{preview}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Braces className="h-3.5 w-3.5" /> {record.phrases.length} example(s)
          <Image className="h-3.5 w-3.5" /> {record.images.length} image(s)
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Source: <span className="font-mono">{record.file}</span>
          {record.parentTopic && <> · Parent: <span className="font-mono">{record.parentTopic}</span></>}
        </div>
      </div>
      <div className="col-span-3 flex flex-wrap content-start gap-1">
        {statusPill("EN", record.responses.en.length > 0)}
        {statusPill("CEB", record.responses.ceb.length > 0)}
        {statusPill("Images", record.images.length > 0)}
        {statusPill("Map", record.hasMap)}
        {statusPill("MapRef", record.hasMapRef)}
        {statusValue("Terms", record.subjectTerms.length)}
        {record.subtopicCount > 0 && statusPill(`${record.subtopicCount} answers`, true)}
      </div>
      <div className="col-span-1 text-right">
        <div className="flex justify-end gap-1">
          {isTopicGroup ? (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              Group
            </span>
          ) : (
            <AdminTooltip
              title="Open Knowledge Record"
              description="Open topic editor to modify responses, maps, pins, and images"
              side="left"
            >
              <Button size="sm" variant="outline" onClick={() => onOpen(record)} className="h-7 text-xs">
                Open
              </Button>
            </AdminTooltip>
          )}
        </div>
      </div>
    </div>
  );
});
