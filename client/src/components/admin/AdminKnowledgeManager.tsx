import { type KeyboardEvent, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createKnowledgeParent,
  createKnowledgeSubtopic,
  fetchKnowledgeRecord,
  fetchKnowledgeSummaries,
  updateKnowledgeRecord,
  type KnowledgeChildItem,
  type KnowledgeListResult,
  type KnowledgeRecord,
} from "@/lib/adminApi";
import { AdminMapPinsEditor, ROUTE_COLORS, type AdminPin, type AdminRoute } from "@/components/admin/AdminMapPinsEditor";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import {
  AdminResponseBubblesEditor as ResponseBubblesEditor,
  normalizeRichBubble,
} from "@/components/admin/AdminResponseBubblesEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  Globe,
  Compass,
  HelpCircle,
  FolderPlus,
  FilePlus,
  Edit2,
  Sparkles,
  ChevronsUpDown,
  X,
  MessageSquare,
  MessageSquareText,
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
  if (record.preview?.trim()) {
    const cleanPreview = record.preview.replace(/<[^>]+>/g, "");
    return cleanPreview.length > 155 ? `${cleanPreview.slice(0, 155)}...` : cleanPreview;
  }
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
  en: string[];
  ceb: string[];
  phrases?: string;
  subjectTerms?: string;
  images: string[];
  hasMapEditor: boolean;
  pins: AdminPin[];
  routes: AdminRoute[];
  requiresResponse: boolean;
}): string[] {
  const errors: string[] = [];

  if (!displayName.trim()) errors.push("Display name is required.");
  if (requiresResponse && en.filter((b) => b.trim()).length === 0 && ceb.filter((b) => b.trim()).length === 0) {
    errors.push("At least one English or Cebuano response bubble is required.");
  }
  if (phrases && toLines(phrases).some((phrase) => phrase.length < 2)) {
    errors.push("Example questions must contain readable text.");
  }
  if (subjectTerms && toLines(subjectTerms).some((term) => term.length < 2)) {
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
  if (record.searchIndex) return record.searchIndex;
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

function summarizeKnowledgeRecord(record: KnowledgeRecord): KnowledgeRecord {
  const preview = record.responses.en.find(Boolean) || record.responses.ceb.find(Boolean) || "";
  const searchIndex = [
    record.displayName,
    record.file,
    record.parentTopic,
    record.topic,
    record.intent,
    record.contextTopic,
    record.subjectKey,
    record.subjectType,
    preview.slice(0, 240),
  ].filter(Boolean).join(" ").toLowerCase();
  return {
    ...record,
    responses: { en: [], ceb: [] },
    phrases: [],
    images: [],
    map: null,
    mapData: null,
    pins: [],
    routes: [],
    items: [],
    itemGroups: {},
    itemDisclaimer: "",
    ownSubjectTerms: [],
    subjectTerms: [],
    preview: preview.slice(0, 240),
    searchIndex,
    phraseCount: record.phrases.length,
    imageCount: record.images.length,
    subjectTermCount: record.subjectTerms.length,
    isSummary: true,
  };
}

function statusPill(label: string, active: boolean, icon?: React.ReactNode) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
        active ? "border-blue-200 bg-blue-50/90 text-blue-900" : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

function statusValue(label: string, value: string | number | null | undefined, icon?: React.ReactNode) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  const hasValue = text !== "" && text !== "0";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
        hasValue ? "border-blue-200 bg-blue-50/90 text-blue-900" : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {icon}
      <span>{label}: {hasValue ? text : "None"}</span>
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
  const [en, setEn] = useState<string[]>(record.responses?.en?.length ? record.responses.en : [""]);
  const [ceb, setCeb] = useState<string[]>(record.responses?.ceb?.length ? record.responses.ceb : [""]);
  const [images, setImages] = useState<string[]>(record.images || []);
  const [mapRef, setMapRef] = useState(record.mapRef || "");
  const [hasMapEditor, setHasMapEditor] = useState(record.hasMap);
  const [pins, setPins] = useState<AdminPin[]>(normalizePins(record.pins));
  const [routes, setRoutes] = useState<AdminRoute[]>(normalizeRoutes(record.routes));
  const [activeModalTab, setActiveModalTab] = useState<"responses" | "images" | "map">("responses");

  useEffect(() => {
    setDisplayName(record.displayName || "");
    setEn(record.responses?.en?.length ? record.responses.en : [""]);
    setCeb(record.responses?.ceb?.length ? record.responses.ceb : [""]);
    setImages(record.images || []);
    setMapRef(record.mapRef || "");
    setHasMapEditor(record.hasMap);
    setPins(normalizePins(record.pins));
    setRoutes(normalizeRoutes(record.routes));
    setActiveModalTab("responses");
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<ApiResponse> => {
      const cleanEn = en.map(normalizeRichBubble).filter((b) => b.trim().length > 0);
      const cleanCeb = ceb.map(normalizeRichBubble).filter((b) => b.trim().length > 0);

      const errors = validateEditorDraft({
        displayName,
        en: cleanEn,
        ceb: cleanCeb,
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
          en: cleanEn.length ? cleanEn : [""],
          ceb: cleanCeb.length ? cleanCeb : [""],
        },
        subjectTerms: record.ownSubjectTerms ?? record.subjectTerms ?? [],
        phrases: record.phrases ?? [],
        images: images.map((url) => url.trim()).filter(Boolean),
        items: record.items ?? [],
        itemDisclaimer: record.itemDisclaimer ?? "",
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
      const savedRecord = result.data as KnowledgeRecord | undefined;
      if (savedRecord?.id) {
        queryClient.setQueryData(["knowledgeRecord", savedRecord.id], savedRecord);
        queryClient.setQueryData<KnowledgeListResult>(["knowledgeSummaries"], (current) => current ? {
          ...current,
          records: current.records.map((item) => item.id === savedRecord.id ? summarizeKnowledgeRecord(savedRecord) : item),
        } : current);
        queryClient.setQueryData<KnowledgeListResult>(["knowledgeRecords"], (current) => current ? {
          ...current,
          records: current.records.map((item) => item.id === savedRecord.id ? savedRecord : item),
        } : current);
      } else {
        queryClient.invalidateQueries({ queryKey: ["knowledgeSummaries"] });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error?.message || "Invalid data", variant: "destructive" });
    },
  });

  const crumbs = breadcrumb(record, recordsById);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[94vw] max-w-6xl xl:max-w-7xl h-[88vh] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-slate-200/80 shadow-2xl [&>button.absolute]:hidden">
        <DialogHeader className="border-b bg-gradient-to-r from-[#001C38] via-[#002b54] to-[#0356a9] px-6 py-3.5 sm:py-4 rounded-t-2xl text-white shrink-0">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium truncate">
                <span className="text-blue-100 font-semibold">{crumbs.join(" > ")}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-white/15 text-white hover:bg-white/20 border-white/25 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
                  {record.subjectType || "Topic Answer"}
                </Badge>
                <Badge className="bg-amber-400/20 text-amber-300 hover:bg-amber-400/25 border-amber-400/30 text-[10px] font-semibold px-2 py-0.5">
                  {categoryLabel(record.file)}
                </Badge>
                {record.topic && (
                  <span className="text-[10px] font-mono text-blue-200/80 bg-white/10 px-2 py-0.5 rounded border border-white/15 truncate max-w-[200px]" title={record.topic}>
                    {record.topic}
                  </span>
                )}
              </div>
              <DialogTitle className="sr-only">{record.displayName}</DialogTitle>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 shrink-0"
              title="Close"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogHeader>

        {/* Modal Body with Left Navigation Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-60 sm:w-64 shrink-0 border-r border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col">
            <div className="space-y-3">
              {/* Data Title at top of navigation bar (ONLY the title/name) */}
              <div className="pb-3 border-b border-slate-200/80">
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={record.displayName}>
                  {record.displayName}
                </h3>
              </div>

              <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </div>

              <button
                type="button"
                onClick={() => setActiveModalTab("responses")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeModalTab === "responses"
                    ? "bg-[#001C38] text-white shadow-sm ring-1 ring-[#001C38]/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquareText className={`h-4 w-4 ${activeModalTab === "responses" ? "text-amber-400" : "text-blue-600"}`} />
                  <span>Responses</span>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 ${activeModalTab === "responses" ? "bg-white/20 text-white border-transparent" : "bg-slate-200 text-slate-700"}`}>
                  {en.filter(b => b.trim()).length + ceb.filter(b => b.trim()).length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("images")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeModalTab === "images"
                    ? "bg-[#001C38] text-white shadow-sm ring-1 ring-[#001C38]/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Image className={`h-4 w-4 ${activeModalTab === "images" ? "text-amber-400" : "text-amber-600"}`} />
                  <span>Images</span>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 ${activeModalTab === "images" ? "bg-white/20 text-white border-transparent" : "bg-slate-200 text-slate-700"}`}>
                  {images.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("map")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeModalTab === "map"
                    ? "bg-[#001C38] text-white shadow-sm ring-1 ring-[#001C38]/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className={`h-4 w-4 ${activeModalTab === "map" ? "text-amber-400" : "text-purple-600"}`} />
                  <span>Map & Navigation</span>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 ${activeModalTab === "map" ? "bg-white/20 text-white border-transparent" : "bg-slate-200 text-slate-700"}`}>
                  {hasMapEditor ? `${pins.length} Pins` : "Off"}
                </Badge>
              </button>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            {activeModalTab === "responses" && (
              <div className="space-y-4 w-full">
                {/* Display name */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                  <Label className="text-xs font-bold text-slate-800">Display name</Label>
                  <Input 
                    value={displayName} 
                    onChange={(event) => setDisplayName(event.target.value)} 
                    className="bg-white border-slate-200 text-sm font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">This label helps admins find the answer. It does not change chatbot routing.</p>
                </div>

                {/* English & Bisaya side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                  {/* English Responses Column */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">English Responses</h4>
                          <p className="text-[11px] text-slate-500">Primary bot answer in English</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-semibold">
                        {en.filter(b => b.trim()).length} Bubbles
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <ResponseBubblesEditor label="" bubbles={en} onChange={setEn} />
                    </div>
                  </div>

                  {/* Bisaya / Cebuano Responses Column */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Bisaya / Cebuano Responses</h4>
                          <p className="text-[11px] text-slate-500">Localized answer in Sinugbuanong Binisaya</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                        {ceb.filter(b => b.trim()).length} Bubbles
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <ResponseBubblesEditor label="" bubbles={ceb} onChange={setCeb} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModalTab === "images" && (
              <div className="space-y-4 w-full">
                <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />
                {images.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-muted-foreground bg-white/70">
                    <Image className="mx-auto mb-2 h-8 w-8 opacity-30 text-slate-400" />
                    No images yet. Upload an image or paste a URL above.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((url, index) => (
                      <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <img
                          src={url}
                          alt={`Knowledge image ${index + 1}`}
                          className="h-32 w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.background = "#f3f4f6";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
                          <button
                            type="button"
                            onClick={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}
                            className="rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:bg-red-600"
                            title="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="truncate px-2 py-1 text-[10px] text-slate-400 font-mono">{url}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeModalTab === "map" && (
              <div className="space-y-4 w-full">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xs">
                  <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Current Map Configuration
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>Map Payload: <strong className="text-slate-900">{record.hasMap ? "Configured" : "None"}</strong></span>
                    <span>Map Reference: <strong className="text-slate-900">{mapRef || "None"}</strong></span>
                    <span>Pins: <strong className="text-slate-900">{pins.length}</strong></span>
                    <span>Routes: <strong className="text-slate-900">{routes.length}</strong></span>
                  </div>
                </div>
                <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <Label className="text-xs font-bold text-slate-800">Map reference key</Label>
                  <Input value={mapRef} onChange={(event) => setMapRef(event.target.value)} placeholder="Optional map reference key" className="bg-white border-slate-200" />
                  <p className="text-[11px] text-muted-foreground">Use this only when this record should reuse a known map reference. Leave blank if pins and routes are stored directly.</p>
                </div>
                <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs">
                  <input
                    type="checkbox"
                    checked={hasMapEditor}
                    onChange={(event) => setHasMapEditor(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#001C38]"
                  />
                  Enable interactive campus map & routes for this response
                </label>
                {hasMapEditor ? (
                  <div className="rounded-xl border border-slate-200 p-2 bg-white shadow-xs">
                    <AdminMapPinsEditor
                      pins={pins}
                      routes={routes}
                      onPinsChange={setPins}
                      onRoutesChange={setRoutes}
                      mapSize={440}
                      mapImage={(record as any).mapImage || (typeof (record as any).map === 'string' ? (record as any).map : undefined)}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground bg-white/70">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400 opacity-40" />
                    Enable map editing above to add pins and walkable routes. Existing map references are preserved.
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Tip docked at bottom above footer line */}
            {activeModalTab === "responses" && (
              <div className="px-5 sm:px-6 pb-3 pt-1 bg-slate-50/40 shrink-0">
                <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-900 shadow-xs">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    <strong>Tip:</strong> Each box represents <strong>1 chatbot bubble</strong>. Press <strong>Enter</strong> to add a line break inside the bubble. Click <strong>+ Add Bubble</strong> for another bubble. Select text and press <strong>Ctrl + B</strong> to bold.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 rounded-b-2xl shrink-0">
          <div className="text-xs text-muted-foreground">
            Saves this topic record only. Other responses remain untouched.
          </div>
          <div className="flex gap-2.5">
            <AdminTooltip title="Cancel" description="Discard all unsaved edits and close editor" side="top">
              <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending} className="border-slate-300">
                Cancel
              </Button>
            </AdminTooltip>
            <AdminTooltip title="Save Changes" description="Save all responses, maps, pins, and retrieval terms" side="top">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-[#001C38] hover:bg-[#032f5d] text-white font-semibold shadow-sm"
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" /> : <Save className="mr-2 h-4 w-4 text-amber-400" />}
                Save Record
              </Button>
            </AdminTooltip>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KnowledgeEditorLoader({
  summary,
  onClose,
  recordsById,
}: {
  summary: KnowledgeRecord;
  onClose: () => void;
  recordsById: Map<string, KnowledgeRecord>;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["knowledgeRecord", summary.id],
    queryFn: () => fetchKnowledgeRecord(summary.file, summary.path),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || isError || !data) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{summary.displayName}</DialogTitle></DialogHeader>
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Loading record...</> : <div className="space-y-3 text-center"><p>Could not load this record.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <KnowledgeEditor record={data} open onClose={onClose} recordsById={recordsById} />;
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
      queryClient.invalidateQueries({ queryKey: ["knowledgeSummaries"] });
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
  const [en, setEn] = useState<string[]>([""]);
  const [ceb, setCeb] = useState<string[]>([""]);
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
    setEn([""]);
    setCeb([""]);
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
    const hasResponse = en.some((b) => b.trim()) || ceb.some((b) => b.trim());

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
      const cleanEn = en.map(normalizeRichBubble).filter((b) => b.trim().length > 0);
      const cleanCeb = ceb.map(normalizeRichBubble).filter((b) => b.trim().length > 0);
      if (cleanEn.length === 0 && cleanCeb.length === 0) {
        return Promise.resolve({ success: false, message: "Add at least one English or Cebuano response bubble." });
      }
      if (toLines(phrases).length === 0) {
        return Promise.resolve({ success: false, message: "Add at least one example question for retrieval accuracy." });
      }
      const mapErrors = validateEditorDraft({
        displayName: displayName || topic,
        en: cleanEn,
        ceb: cleanCeb,
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
        responses: { en: cleanEn.length ? cleanEn : [""], ceb: cleanCeb.length ? cleanCeb : [""] },
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
      queryClient.invalidateQueries({ queryKey: ["knowledgeSummaries"] });
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
                <ResponseBubblesEditor label="English Responses" bubbles={en} onChange={setEn} />
                <ResponseBubblesEditor label="Cebuano/Bisaya Responses" bubbles={ceb} onChange={setCeb} />
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [fileFilter, setFileFilter] = useState("all");
  const [selected, setSelected] = useState<KnowledgeRecord | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const initializedCollapse = useRef(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["knowledgeSummaries"],
    queryFn: fetchKnowledgeSummaries,
    staleTime: 5 * 60 * 1000,
  });

  const records = data?.records || [];
  const files = data?.files || [];

  useEffect(() => {
    if (initializedCollapse.current || files.length === 0) return;
    initializedCollapse.current = true;
    setCollapsedFiles(new Set(files.map((file) => file.file)));
  }, [files]);

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
    if (!term) {
      return new Set(records.filter(matchesFile).map((record) => record.id));
    }
    const directMatches = new Set<string>();

    records.forEach((record) => {
      if (!matchesFile(record)) return;
      if (searchText(record).includes(term)) directMatches.add(record.id);
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

  const refreshKnowledge = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["knowledgeRecord"] });
    await refetch();
  }, [queryClient, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
        Loading knowledge records...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Knowledge Manager Tab</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
              {records.length} Topics · {files.length} Categories
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search labels, answers, phrases..."
              className="w-full pl-8 pr-8 sm:w-72 h-8.5 text-xs bg-white border-slate-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select value={fileFilter} onValueChange={setFileFilter}>
            <SelectTrigger className="w-full sm:w-56 h-8.5 text-xs bg-white border-slate-200">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Knowledge Categories ({records.length})</SelectItem>
              {files.map((file) => (
                <SelectItem key={file.file} value={file.file}>
                  {categoryLabel(file.file)} ({file.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Expand / Collapse All */}
          <AdminTooltip
            title={collapsedFiles.size > 0 ? "Expand All Categories" : "Collapse All Categories"}
            description="Toggle expand state for all category dropdown sections"
            side="bottom"
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleAllCollapse} 
              className="h-8.5 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
            >
              <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              {collapsedFiles.size > 0 ? "Expand All" : "Collapse All"}
            </Button>
          </AdminTooltip>
        </div>
      </div>

      {/* Main Category Accordion Table */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <div className="col-span-4">Topic & Path</div>
            <div className="col-span-4">Answer Preview</div>
            <div className="col-span-3">Coverage Badges</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100" style={{ scrollbarWidth: "thin" }}>
          {fileTreeData.map(({ file, rootsWithChildren }) => {
            const isCollapsed = collapsedFiles.has(file.file);
            return (
              <div key={file.file} className="border-b border-slate-200/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleFileCollapse(file.file)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors px-4 py-2.5 text-sm font-bold text-slate-900 select-none text-left border-l-4 border-l-[#001C38]"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-[#001C38] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#001C38] shrink-0" />
                    )}
                    <FolderTree className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{categoryLabel(file.file)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#001C38] shadow-xs">
                      {file.count} records
                    </span>
                  </div>
                </button>

                {!isCollapsed && rootsWithChildren.map(({ root, crumbs: rootCrumbs, children }) => (
                  <div key={root.id}>
                    <KnowledgeRow 
                      record={root} 
                      crumbs={rootCrumbs} 
                      onOpen={handleOpen} 
                      depth={0} 
                    />
                    {children.map(({ child, crumbs: childCrumbs }) => (
                      <KnowledgeRow 
                        key={child.id} 
                        record={child} 
                        crumbs={childCrumbs} 
                        onOpen={handleOpen} 
                        depth={1} 
                      />
                    ))}
                    {children.length === 0 && root.subtopicCount > 0 && (
                      <div className="border-t border-slate-100 px-10 py-2.5 text-xs text-muted-foreground bg-slate-50/50">
                        No answer topics matched your current search in this group.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {fileTreeData.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No knowledge records matched your search or category filter.
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Detail & Edit Modal */}
      {selected && (
        <KnowledgeEditorLoader summary={selected} onClose={() => setSelected(null)} recordsById={recordsById} />
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
    <div className="grid grid-cols-12 gap-2 border-t border-slate-100 px-4 py-3 text-sm hover:bg-slate-50/70 transition-colors group">
      {/* Col 1: Topic Name & Breadcrumb */}
      <div className="col-span-4 min-w-0">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 shrink-0 ${depth ? "ml-6" : ""}`}>
            {depth ? (
              <FileText className="h-4 w-4 text-emerald-600" />
            ) : (
              <Layers className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                {record.displayName}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200">
                {technicalLabel(record)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              {crumbs.map((crumb, index) => (
                <span key={`${record.id}-${crumb}-${index}`} className="inline-flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                  <span>{crumb}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Col 2: Answer Preview & Metadata */}
      <div className="col-span-4 min-w-0 text-xs text-slate-600">
        <p className="line-clamp-2 leading-relaxed text-slate-700 italic">
          "{preview}"
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Braces className="h-3 w-3 text-blue-500" />
            <span>{record.phraseCount ?? record.phrases.length} training phrases</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Image className="h-3 w-3 text-amber-500" />
            <span>{record.imageCount ?? record.images.length} image(s)</span>
          </span>
        </div>
        <div className="mt-0.5 text-[10.5px] text-muted-foreground font-mono">
          <span>{record.file}</span>
          {record.parentTopic && <> · parent: {record.parentTopic}</>}
        </div>
      </div>

      {/* Col 3: Status & Coverage Badges with Lucide Icons */}
      <div className="col-span-3 flex flex-wrap content-start gap-1">
        {statusPill("EN", record.responses.en.length > 0, <Globe className="h-3 w-3 text-blue-600" />)}
        {statusPill("CEB", record.responses.ceb.length > 0, <Globe className="h-3 w-3 text-emerald-600" />)}
        {record.images.length > 0 && statusPill(`${record.images.length} Images`, true, <Image className="h-3 w-3 text-amber-600" />)}
        {statusPill("Map", record.hasMap, <MapPin className="h-3 w-3 text-purple-600" />)}
        {record.hasMapRef && statusPill("MapRef", true, <Compass className="h-3 w-3 text-sky-600" />)}
        {record.subtopicCount > 0 && statusPill(`${record.subtopicCount} subtopics`, true, <Layers className="h-3 w-3 text-indigo-600" />)}
        {statusValue("Terms", record.subjectTermCount ?? record.subjectTerms.length)}
      </div>

      {/* Col 4: Action Buttons */}
      <div className="col-span-1 text-right">
        <div className="flex justify-end gap-1.5">
          {isTopicGroup ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
              <FolderTree className="h-3 w-3 text-blue-600" /> Group
            </span>
          ) : (
            <AdminTooltip
              title="Edit Knowledge Record"
              description="Open topic editor to modify responses, maps, pins, and images"
              side="left"
            >
              <Button
                size="sm"
                onClick={() => onOpen(record)}
                className="h-7 px-2.5 text-xs bg-[#001C38] hover:bg-[#032f5d] text-white font-semibold shadow-xs flex items-center gap-1 transition-all"
              >
                <Edit2 className="h-3 w-3 text-amber-400" />
                <span>Edit</span>
              </Button>
            </AdminTooltip>
          )}
        </div>
      </div>
    </div>
  );
});
