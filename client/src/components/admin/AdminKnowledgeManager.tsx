import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import {
  Braces,
  ChevronRight,
  FileText,
  FolderTree,
  Image,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

function toLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function fromLines(value: string[]): string {
  return (value || []).join("\n");
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

function normalizeRichLine(value: string): string {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = value
    .replace(/<strong\b[^>]*>/gi, "<b>")
    .replace(/<\/strong>/gi, "</b>")
    .replace(/<span\b[^>]*style=["'][^"']*font-weight:\s*(bold|700)[^"']*["'][^>]*>/gi, "<b>")
    .replace(/<\/span>/gi, "</b>");

  wrapper.querySelectorAll("*").forEach((node) => {
    if (node.tagName.toLowerCase() !== "b") {
      node.replaceWith(document.createTextNode(node.textContent || ""));
    }
  });

  return wrapper.innerHTML
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "")
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
          <Button type="button" size="sm" variant="outline" onClick={addLine}>Add line</Button>
          <Button type="button" size="sm" variant="outline" onClick={removeEmptyLines}>Clean empty</Button>
        </div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border bg-slate-50 p-2">
        {lines.map((line, index) => (
          <div key={`${label}-${index}`} className="rounded-md border bg-white p-2 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Line {index + 1}</span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="text-[10px] text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
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
              dangerouslySetInnerHTML={{ __html: line }}
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
              dangerouslySetInnerHTML={{ __html: draft.value || "" }}
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} className="bg-[#001C38] text-white hover:bg-[#032f5d]">Save child row</Button>
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
                  <p className="mt-1 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: item.value || item.text || "" }} />
                  <p className="mt-1 text-[10px] text-muted-foreground">Aliases: {(item.aliases || []).join(", ") || "None"}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => openExisting(index)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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
    mutationFn: () => updateKnowledgeRecord(record.file, {
      path: record.path,
      topic: record.topic,
      displayName,
      responses: {
        en: toLines(en),
        ceb: toLines(ceb),
      },
      phrases: toLines(phrases),
      images: images.filter((url) => url.trim()),
      items,
      itemDisclaimer,
      mapRef,
      pins: hasMapEditor ? serializePins(pins) : [],
      routes: hasMapEditor ? serializeRoutes(routes) : [],
    }),
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
              <TabsTrigger value="examples" className="text-xs">Example Questions</TabsTrigger>
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

            <TabsContent value="examples" className="m-0 p-4">
              <div className="space-y-2">
                <Label>Example questions, one per line</Label>
                <Textarea value={phrases} onChange={(event) => setPhrases(event.target.value)} className="min-h-72 font-mono text-xs" />
                <p className="text-[11px] text-muted-foreground">These examples help retrieval match the right answer. Keep them natural and specific.</p>
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
                  <span>Pins</span><span>{pins.length}</span>
                  <span>Routes</span><span>{routes.length}</span>
                </div>
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
            <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="text-white"
              style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminKnowledgeManager() {
  const [search, setSearch] = useState("");
  const [fileFilter, setFileFilter] = useState("all");
  const [selected, setSelected] = useState<KnowledgeRecord | null>(null);

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
    const term = search.trim().toLowerCase();
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
  }, [fileFilter, records, recordsById, search]);

  const visibleFiles = useMemo(() => {
    const result = files
      .filter((file) => fileFilter === "all" || file.file === fileFilter)
      .filter((file) => records.some((record) => record.file === file.file && visibleIds.has(record.id)));
    return result;
  }, [fileFilter, files, records, visibleIds]);

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
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-600">
            <div className="col-span-4">Knowledge Category / Topic</div>
            <div className="col-span-4">Answer Preview</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-1 text-right">Edit</div>
          </div>
        </div>
        <div className="max-h-[620px] overflow-y-auto">
          {visibleFiles.map((file) => {
            const roots = records.filter((record) => record.file === file.file && record.path.length === 1 && visibleIds.has(record.id));
            return (
              <div key={file.file} className="border-b last:border-b-0">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
                  <FolderTree className="h-4 w-4" />
                  <span>{categoryLabel(file.file)}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700">{file.count} records</span>
                </div>
                {roots.map((root) => {
                  const children = (childrenByParent.get(root.id) || []).filter((child) => visibleIds.has(child.id));
                  return (
                    <div key={root.id}>
                      <KnowledgeRow record={root} recordsById={recordsById} onOpen={setSelected} depth={0} />
                      {children.map((child) => (
                        <KnowledgeRow key={child.id} record={child} recordsById={recordsById} onOpen={setSelected} depth={1} />
                      ))}
                      {children.length === 0 && root.subtopicCount > 0 && (
                        <div className="border-t px-10 py-2 text-xs text-muted-foreground">No answer topics matched your current search.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {visibleFiles.length === 0 && (
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

function KnowledgeRow({
  record,
  recordsById,
  onOpen,
  depth,
}: {
  record: KnowledgeRecord;
  recordsById: Map<string, KnowledgeRecord>;
  onOpen: (record: KnowledgeRecord) => void;
  depth: number;
}) {
  const crumbs = breadcrumb(record, recordsById);

  return (
    <div className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm">
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
        <p className="line-clamp-3">{recordPreview(record)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Braces className="h-3.5 w-3.5" /> {record.phrases.length} example(s)
          <Image className="h-3.5 w-3.5" /> {record.images.length} image(s)
        </div>
      </div>
      <div className="col-span-3 flex flex-wrap content-start gap-1">
        {statusPill("EN", record.responses.en.length > 0)}
        {statusPill("CEB", record.responses.ceb.length > 0)}
        {statusPill("Images", record.images.length > 0)}
        {statusPill("Map", record.hasMap)}
        {record.subtopicCount > 0 && statusPill(`${record.subtopicCount} answers`, true)}
      </div>
      <div className="col-span-1 text-right">
        <Button size="sm" variant="outline" onClick={() => onOpen(record)}>
          Open
        </Button>
      </div>
    </div>
  );
}
