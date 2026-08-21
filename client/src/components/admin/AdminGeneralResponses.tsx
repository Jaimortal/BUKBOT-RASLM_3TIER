import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchResponses, saveResponse } from "@/lib/adminApi";
import type { ResponseData } from "@/types/admin";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import InteractiveMap from "@/components/InteractiveMap";
import { AdminMapPinsEditor, type AdminPin } from "@/components/admin/AdminMapPinsEditor";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor";
import {
  Save, Loader2, ImagePlus, Trash2, MapPin,
  Tag, MessageSquareText, ChevronRight, AlertCircle,
} from "lucide-react";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatLabel(key: string): string {
  return key.replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeAnswer(answer: any): { en: string[]; ceb: string[] } {
  if (!answer) return { en: [""], ceb: [""] };
  if (Array.isArray(answer)) return { en: answer.length ? answer : [""], ceb: [""] };
  return {
    en: Array.isArray(answer.en) && answer.en.length ? answer.en : [""],
    ceb: Array.isArray(answer.ceb) && answer.ceb.length ? answer.ceb : [""],
  };
}

function previewText(r: ResponseData): string {
  const ans = r.responses?.answer;
  const lines: string[] = Array.isArray(ans)
    ? ans
    : (Array.isArray((ans as any)?.en) ? (ans as any).en : []);
  const first = lines.find(l => l.trim());
  if (!first) return "No response yet";
  const plain = first.replace(/<[^>]+>/g, "");
  return plain.length > 85 ? plain.slice(0, 85) + "…" : plain;
}

function groupByCategory(responses: ResponseData[]): Record<string, ResponseData[]> {
  const groups: Record<string, ResponseData[]> = {};
  for (const r of responses) {
    const cat = r.category?.trim() || "Uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  }
  return groups;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface GeneralModalProps {
  response: ResponseData;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function GeneralModal({ response, open, onClose, onSaved }: GeneralModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Normalise stored answer
  const initAnswer = normalizeAnswer(response.responses?.answer);
  const initImages: string[] = Array.isArray(response.responses?.imageUrls)
    ? response.responses.imageUrls
    : (response.responses?.imageUrl ? [response.responses.imageUrl] : []);
  const initMap = (() => {
    const md = response.responses?.mapData;
    if (!md) return null;
    const first = Array.isArray(md) ? md[0] : md;
    return first ?? null;
  })();

  const [enLines, setEnLines] = useState<string[]>(initAnswer.en);
  const [cebLines, setCebLines] = useState<string[]>(initAnswer.ceb);
  const [images, setImages] = useState<string[]>(initImages);
  const [hasMap, setHasMap] = useState(!!initMap);
  const [mapPins, setMapPins] = useState<AdminPin[]>(initMap?.pins ?? []);
  const [mapRoutes, setMapRoutes] = useState<any[]>(initMap?.routes ?? []);
  const [mapCoords, setMapCoords] = useState<[number, number]>(
    initMap?.coordinates ? [initMap.coordinates[0], initMap.coordinates[1]] : [500, 500]
  );
  const [mapLocName, setMapLocName] = useState(initMap?.locationName || response.intent);
  const [uiName, setUiName] = useState((response as any).ui_name || "");
  const [deleteImg, setDeleteImg] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const ans = normalizeAnswer(response.responses?.answer);
    setEnLines(ans.en);
    setCebLines(ans.ceb);
    const imgs: string[] = Array.isArray(response.responses?.imageUrls)
      ? response.responses.imageUrls
      : (response.responses?.imageUrl ? [response.responses.imageUrl] : []);
    setImages(imgs);
    const md = response.responses?.mapData;
    const first = md ? (Array.isArray(md) ? md[0] : md) : null;
    setHasMap(!!first);
    setMapCoords(first?.coordinates ? [first.coordinates[0], first.coordinates[1]] : [500, 500]);
    setMapLocName(first?.locationName || response.intent);
    setMapRoutes(first?.routes ?? []);
    setMapPins(first?.pins ?? []);
    setUiName((response as any).ui_name || "");
  }, [open, response]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...response,
        ui_name: uiName || undefined,
        responses: {
          ...response.responses,
          answer: {
            en: enLines.filter(l => l.trim()),
            ceb: cebLines.filter(l => l.trim()),
          },
          imageUrls: images.filter(u => u.trim()),
          imageUrl: images[0] || "",
          mapData: hasMap
            ? { locationName: mapLocName || response.intent, coordinates: mapCoords, pins: mapPins, routes: mapRoutes, mapId: "main_map" }
            : undefined,
        },
      };
      if (!payload.ui_name) delete payload.ui_name;
      return saveResponse(payload);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Saved", description: `"${response.intent}" updated.` });
        queryClient.invalidateQueries({ queryKey: ["responses"] });
        onSaved();
        onClose();
      } else {
        toast({ title: "Save Failed", description: result.message, variant: "destructive" });
      }
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-4 pb-3 border-b bg-gradient-to-r from-[#001C38] to-[#0356a9] rounded-t-lg">
            <div>
              <DialogTitle className="text-white text-lg font-bold leading-tight">
                {(response as any).ui_name || formatLabel(response.intent)}
              </DialogTitle>
              <p className="text-blue-200 text-xs mt-0.5 font-mono">{response.intent}</p>
              {response.category && (
                <span className="inline-block mt-1 text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">
                  {response.category}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="responses" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-gray-50 justify-start gap-1 px-4 h-10">
                <TabsTrigger value="responses" className="text-xs gap-1.5"><MessageSquareText className="h-3.5 w-3.5" />Responses</TabsTrigger>
                <TabsTrigger value="images" className="text-xs gap-1.5"><ImagePlus className="h-3.5 w-3.5" />Images</TabsTrigger>
                <TabsTrigger value="map" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" />Map & Pins</TabsTrigger>
                <TabsTrigger value="uiname" className="text-xs gap-1.5"><Tag className="h-3.5 w-3.5" />UI Name</TabsTrigger>
              </TabsList>

              {/* Responses */}
              <TabsContent value="responses" className="p-3 space-y-4 mt-0">
                {/* EN */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-sm flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-mono">EN</span>English
                    </Label>
                    <AdminTooltip title="Add English Message" description="Add a new conversational response bubble in English" side="top">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEnLines([...enLines, ""])}>+ Add message</Button>
                    </AdminTooltip>
                  </div>
                  {enLines.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <AdminRichTextEditor 
                          value={l} 
                          onChange={(v) => { const n = [...enLines]; n[i] = v; setEnLines(n); }} 
                          placeholder={`Bubble ${i + 1}…`} 
                        />
                      </div>
                      {enLines.length > 1 && (
                        <AdminTooltip title="Remove Message" description="Delete this response bubble" side="left">
                          <button onClick={() => setEnLines(enLines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><Trash2 className="h-4 w-4" /></button>
                        </AdminTooltip>
                      )}
                    </div>
                  ))}
                </div>

                {/* CEB */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-sm flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-mono">CEB</span>Cebuano
                    </Label>
                    <AdminTooltip title="Add Cebuano Message" description="Add a new conversational response bubble in Cebuano" side="top">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCebLines([...cebLines, ""])}>+ Add message</Button>
                    </AdminTooltip>
                  </div>
                  {cebLines.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <AdminRichTextEditor 
                          value={l} 
                          onChange={(v) => { const n = [...cebLines]; n[i] = v; setCebLines(n); }} 
                          placeholder={`Bubble ${i + 1}…`} 
                        />
                      </div>
                      {cebLines.length > 1 && (
                        <AdminTooltip title="Remove Message" description="Delete this response bubble" side="left">
                          <button onClick={() => setCebLines(cebLines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><Trash2 className="h-4 w-4" /></button>
                        </AdminTooltip>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Images */}
              <TabsContent value="images" className="p-3 space-y-4 mt-0">
                <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />
                
                {images.length === 0
                  ? <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg"><ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-30" />No images yet.</div>
                  : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border shadow-sm">
                        <img src={url} alt="" className="w-full h-32 object-cover" onError={e => { (e.currentTarget as any).src = ""; e.currentTarget.style.background = "#f3f4f6"; }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <button onClick={() => setDeleteImg(i)} className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1.5 shadow-lg">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 px-1.5 py-1 truncate">{url}</p>
                      </div>
                    ))}
                  </div>}
              </TabsContent>

              {/* Map */}
              <TabsContent value="map" className="p-3 mt-0">
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={hasMap} onChange={e => setHasMap(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm font-medium">Enable map for this response</span>
                  </label>
                  {hasMap && (
                    <Input value={mapLocName} onChange={e => setMapLocName(e.target.value)} placeholder="Map pin label" className="h-7 text-xs w-44" />
                  )}
                </div>
                {hasMap ? (
                  <AdminMapPinsEditor
                    pins={mapPins}
                    routes={mapRoutes}
                    onPinsChange={setMapPins}
                    onRoutesChange={setMapRoutes}
                    mapSize={420}
                  />
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />Enable checkbox above to attach a map.
                  </div>
                )}
              </TabsContent>

              {/* UI Name */}
              <TabsContent value="uiname" className="p-4 space-y-3 mt-0">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Display Name Only</p>
                    <p className="text-amber-700 text-xs mt-0.5">This label is shown to admins only. The internal intent key is never modified.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">UI Display Name</Label>
                  <Input value={uiName} onChange={e => setUiName(e.target.value)} placeholder={formatLabel(response.intent)} className="text-sm" />
                  <p className="text-xs text-muted-foreground">Leave blank to use the auto-formatted intent name.</p>
                </div>
                {uiName && (
                  <div className="border rounded-lg p-3 bg-blue-50 flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <span className="text-blue-700">Will display as: <strong>{uiName}</strong></span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between rounded-b-lg">
            <p className="text-xs text-muted-foreground">Saves to <code className="font-mono">responses.json</code></p>
            <div className="flex gap-2">
              <AdminTooltip title="Cancel" description="Discard unsaved edits and close modal" side="top">
                <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Cancel</Button>
              </AdminTooltip>
              <AdminTooltip title="Save Response" description="Persist answers, images, maps, and UI display name" side="top">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="text-white" style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}>
                  {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                </Button>
              </AdminTooltip>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteImg !== null} onOpenChange={v => !v && setDeleteImg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this image? This action is permanent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border-0">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border-0" onClick={() => { if (deleteImg !== null) { setImages(images.filter((_, j) => j !== deleteImg)); setDeleteImg(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ResponseCard({ response, onClick }: { response: ResponseData; onClick: () => void }) {
  const name = (response as any).ui_name || formatLabel(response.intent);
  const preview = previewText(response);
  const hasImg = !!(response.responses?.imageUrls?.length || response.responses?.imageUrl);
  const hasMap = !!response.responses?.mapData;

  return (
    <AdminTooltip title={name} description="Click to edit response bubbles, maps, and images" side="top">
      <button onClick={onClick} className="group w-full text-left rounded-xl border bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 p-4 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 group-hover:from-blue-50/40 transition-all duration-300 pointer-events-none" />
        <div className="flex items-start justify-between gap-2 relative">
          <div>
            <p className="font-semibold text-sm text-gray-800 leading-tight">{name}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{response.intent}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 relative">{preview}</p>
        {(hasImg || hasMap) && (
          <div className="flex gap-1 flex-wrap relative">
            {hasImg && <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2 py-0.5">🖼 Images</span>}
            {hasMap && <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">📍 Map</span>}
          </div>
        )}
      </button>
    </AdminTooltip>
  );
}

// ─── Category Panel ───────────────────────────────────────────────────────────

function CategoryPanel({ category, responses }: { category: string; responses: ResponseData[] }) {
  const [selected, setSelected] = useState<ResponseData | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const filtered = search
    ? responses.filter(r =>
      r.intent.toLowerCase().includes(search.toLowerCase()) ||
      ((r as any).ui_name || "").toLowerCase().includes(search.toLowerCase())
    )
    : responses;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{category}</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} intent{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Input placeholder="Search intents…" value={search} onChange={e => setSearch(e.target.value)} className="w-44 h-8 text-sm" />
      </div>

      {filtered.length === 0
        ? <div className="text-center py-16 text-sm text-muted-foreground border-2 border-dashed rounded-xl">{search ? `No intents match "${search}"` : "No intents found."}</div>
        : <div className="overflow-y-auto max-h-[420px] pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(r => <ResponseCard key={r.intent} response={r} onClick={() => setSelected(r)} />)}
          </div>
        </div>}

      {selected && (
        <GeneralModal response={selected} open={!!selected} onClose={() => setSelected(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["responses"] }); setSelected(null); }} />
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function AdminGeneralResponses() {
  const { data: allResponses = [], isLoading } = useQuery({
    queryKey: ["responses"],
    queryFn: fetchResponses,
    staleTime: 30000,
  });

  const grouped = groupByCategory(allResponses);
  const categories = Object.keys(grouped).sort();
  const [activeCategory, setActiveCategory] = useState<string>("");

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]);
  }, [categories.join(",")]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-7 w-7 animate-spin text-blue-500 mr-3" />
      <span className="text-muted-foreground">Loading responses…</span>
    </div>
  );

  if (allResponses.length === 0) return (
    <div className="text-center py-20 text-muted-foreground text-sm">
      <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
      No responses found in <code className="font-mono">responses.json</code>.
    </div>
  );

  return (
    <div className="flex h-[540px] rounded-xl border bg-white overflow-hidden shadow-sm">
      {/* LEFT: Category nav */}
      <div className="w-56 shrink-0 border-r bg-gray-50 flex flex-col">
        <div className="px-4 py-3 border-b shrink-0" style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}>
          <p className="text-white font-semibold text-xs uppercase tracking-wider">Categories</p>
          <p className="text-blue-200 text-[10px] mt-0.5">{categories.length} groups</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
          {categories.map(cat => {
            const isActive = cat === activeCategory;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center justify-between gap-2 ${isActive ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-100"}`}
                style={isActive ? { background: "linear-gradient(to right, #001C38, #0356a9ff)" } : undefined}>
                <span className="leading-tight truncate">{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {grouped[cat]?.length ?? 0}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* RIGHT: Cards */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
        {activeCategory && grouped[activeCategory]
          ? <CategoryPanel category={activeCategory} responses={grouped[activeCategory]} />
          : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Select a category from the left.</div>}
      </div>
    </div>
  );
}
