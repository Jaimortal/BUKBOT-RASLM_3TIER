import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSuperIntents,
  fetchSuperIntentTopics,
  updateSuperIntentTopic,
  type SuperIntentMeta,
  type TopicData,
  type TopicPin,
  type TopicRoute,
} from "@/lib/adminApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminMapPinsEditor, type AdminPin } from "@/components/admin/AdminMapPinsEditor";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor";
import {
  Save,
  Loader2,
  ImagePlus,
  Trash2,
  MapPin,
  Tag,
  MessageSquareText,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function guessIcon(key: string): string {
  const l = key.toLowerCase();
  if (l.includes("location") || l.includes("map") || l.includes("building") || l.includes("where")) return "📍";
  if (l.includes("exam") || l.includes("test") || l.includes("quiz")) return "📝";
  if (l.includes("enrollment") || l.includes("admission") || l.includes("apply")) return "📋";
  if (l.includes("policy") || l.includes("rule") || l.includes("guideline")) return "⚖️";
  if (l.includes("fee") || l.includes("payment") || l.includes("cashier")) return "💸";
  if (l.includes("course") || l.includes("class") || l.includes("subject")) return "📚";
  if (l.includes("dorm") || l.includes("housing") || l.includes("room")) return "🏠";
  if (l.includes("clinic") || l.includes("health") || l.includes("medical")) return "🏥";
  if (l.includes("library") || l.includes("book")) return "📖";
  if (l.includes("ict") || l.includes("wifi") || l.includes("computer") || l.includes("tech")) return "💻";
  if (l.includes("sports") || l.includes("gym") || l.includes("oval")) return "🏅";
  if (l.includes("contact") || l.includes("email") || l.includes("phone")) return "📞";
  if (l.includes("schedule") || l.includes("date") || l.includes("time")) return "📅";
  if (l.includes("scholar") || l.includes("grant")) return "🎓";
  if (l.includes("staff") || l.includes("faculty") || l.includes("admin")) return "👨‍🏫";
  if (l.includes("password") || l.includes("account") || l.includes("login")) return "🔐";
  if (l.includes("grade") || l.includes("result") || l.includes("score")) return "📊";
  if (l.includes("wifi") || l.includes("network") || l.includes("internet")) return "📡";
  return "💡";
}

function previewText(responses: { en: string[] }): string {
  const first = responses.en.find((s) => s.trim());
  if (!first) return "No response yet";
  const plain = first.replace(/<[^>]+>/g, "");
  return plain.length > 90 ? plain.slice(0, 90) + "…" : plain;
}

// Ctrl+B in a textarea → wrap selection with <b></b>
function applyBold(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (v: string) => void
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = value.slice(start, end);
  const newVal = value.slice(0, start) + `<b>${selected}</b>` + value.slice(end);
  onChange(newVal);
  requestAnimationFrame(() => {
    el.selectionStart = start + 3;
    el.selectionEnd = end + 3;
    el.focus();
  });
}

// ─── Topic Modal ──────────────────────────────────────────────────────────────

interface TopicModalProps {
  file: string;
  topic: TopicData;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function TopicModal({ file, topic, open, onClose, onSaved }: TopicModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── local state mirroring the topic ──────────────────────────
  const [uiName, setUiName] = useState(topic.ui_name || "");
  const [enLines, setEnLines] = useState<string[]>(topic.responses.en.length ? topic.responses.en : [""]);
  const [cebLines, setCebLines] = useState<string[]>(topic.responses.ceb.length ? topic.responses.ceb : [""]);
  const [images, setImages] = useState<string[]>(topic.images || []);
  const [mapCoords, setMapCoords] = useState<[number, number]>(
    topic.map ? ([topic.map.lat ?? 500, topic.map.lng ?? 500] as [number, number]) : [500, 500]
  );
  const [hasMap, setHasMap] = useState(!!topic.map);
  // Convert TopicPin[] { lat, lng } → AdminPin[] { coordinates: [y, x] }
  const [pins, setPins] = useState<AdminPin[]>(
    (topic.pins || []).map(p => ({ name: p.name, coordinates: [p.lat ?? 500, p.lng ?? 500] as [number, number] }))
  );
  const [mapRoutes, setMapRoutes] = useState<any[]>([]);
  const [deleteImageTarget, setDeleteImageTarget] = useState<number | null>(null);

  // Reset when topic changes
  useEffect(() => {
    setUiName(topic.ui_name || "");
    setEnLines(topic.responses.en.length ? topic.responses.en : [""]);
    setCebLines(topic.responses.ceb.length ? topic.responses.ceb : [""]);
    setImages(topic.images || []);
    setMapCoords(topic.map ? [topic.map.lat ?? 500, topic.map.lng ?? 500] : [500, 500]);
    setHasMap(!!topic.map);
    setPins((topic.pins || []).map(p => ({ name: p.name, coordinates: [p.lat ?? 500, p.lng ?? 500] as [number, number] })));
    // Load routes from topic - convert to AdminRoute format
    setMapRoutes((topic.routes || []).map((r: any, idx: number) => ({
      id: idx,
      name: r.name || "Route",
      points: r.points || [],
      color: r.color || "#dc2626",
    })));
  }, [topic]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSuperIntentTopic(file, {
        topic: topic.topic,
        ui_name: uiName || undefined,
        responses: {
          en: enLines.filter((l) => l.trim()),
          ceb: cebLines.filter((l) => l.trim()),
        },
        images: images.filter((u) => u.trim()),
        map: hasMap ? { lat: mapCoords[0], lng: mapCoords[1] } : null,
        // Convert AdminPin back to TopicPin format
        pins: pins.filter(p => p.name.trim()).map(p => ({ name: p.name, lat: p.coordinates[0], lng: p.coordinates[1] })),
        // Include routes - convert from AdminRoute format
        routes: mapRoutes.map(r => ({
          name: r.name,
          points: r.points,
          color: r.color || "#dc2626",
        })),
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Topic Saved", description: `"${topic.displayName}" has been updated.` });
        queryClient.invalidateQueries({ queryKey: ["superIntentTopics", file] });
        onSaved();
        onClose();
      } else {
        toast({ title: "Save Failed", description: result.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-4 pb-3 border-b bg-gradient-to-r from-[#001C38] to-[#0356a9] rounded-t-lg">
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle className="text-white text-lg font-bold leading-tight">
                  {topic.ui_name || topic.displayName}
                </DialogTitle>
                <p className="text-blue-200 text-xs mt-0.5 font-mono">{topic.topic}</p>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="responses" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-gray-50 justify-start gap-1 px-4 h-10">
                <TabsTrigger value="responses" className="text-xs gap-1.5"><MessageSquareText className="h-3.5 w-3.5" />Responses</TabsTrigger>
                <TabsTrigger value="images" className="text-xs gap-1.5"><ImagePlus className="h-3.5 w-3.5" />Images</TabsTrigger>
                <TabsTrigger value="map" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" />Map & Pins</TabsTrigger>
                <TabsTrigger value="uiname" className="text-xs gap-1.5"><Tag className="h-3.5 w-3.5" />UI Name</TabsTrigger>
              </TabsList>

              {/* ── Responses tab ── */}
              <TabsContent value="responses" className="p-3 space-y-4 mt-0">
                {/* EN */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-sm flex items-center gap-2"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-mono">EN</span>English</Label>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEnLines([...enLines, ""])}>+ Add message</Button>
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
                        <button onClick={() => setEnLines(enLines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>

                {/* CEB */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-sm flex items-center gap-2"><span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-mono">CEB</span>Cebuano</Label>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCebLines([...cebLines, ""])}>+ Add message</Button>
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
                        <button onClick={() => setCebLines(cebLines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── Images tab ── */}
              <TabsContent value="images" className="p-3 space-y-3 mt-0">
                <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />

                {images.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <ImagePlus className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    No images yet. Paste a URL above to add one.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border shadow-sm">
                        <img
                          src={url}
                          alt={`Image ${i + 1}`}
                          className="w-full h-28 object-cover"
                          onError={(e) => { (e.currentTarget as any).src = ""; e.currentTarget.style.background = "#f3f4f6"; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <button
                            onClick={() => setDeleteImageTarget(i)}
                            className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1.5 transition-opacity shadow-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 px-1.5 py-1 truncate">{url}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Map & Pins merged tab ── */}
              <TabsContent value="map" className="p-3 mt-0">
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={hasMap} onChange={(e) => setHasMap(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm font-medium">Enable map location for this topic</span>
                  </label>
                </div>
                {hasMap ? (
                  <AdminMapPinsEditor
                    pins={pins}
                    routes={mapRoutes}
                    onPinsChange={setPins}
                    onRoutesChange={setMapRoutes}
                    mapSize={420}
                  />
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Enable the checkbox above to attach a map location.
                  </div>
                )}
              </TabsContent>

              {/* ── UI Name tab ── */}
              <TabsContent value="uiname" className="p-4 space-y-3 mt-0">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Display Name Only</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      This is the admin-facing label. The internal topic key is preserved and never changed.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm">UI Display Name</Label>
                  <Input
                    value={uiName}
                    onChange={(e) => setUiName(e.target.value)}
                    placeholder={`e.g. ${topic.displayName}`}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the auto-formatted topic key as the label.
                  </p>
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

          {/* Footer save */}
          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between rounded-b-lg">
            <p className="text-xs text-muted-foreground">Saves only this topic — other topics are untouched.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="text-white"
                style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Save Topic</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete image confirmation */}
      <AlertDialog open={deleteImageTarget !== null} onOpenChange={(v) => !v && setDeleteImageTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white text-gray-800 hover:bg-gray-100 border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={() => {
                if (deleteImageTarget !== null) {
                  setImages(images.filter((_, j) => j !== deleteImageTarget));
                  setDeleteImageTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Topic Card ───────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicData;
  onClick: () => void;
}

function TopicCard({ topic, onClick }: TopicCardProps) {
  const icon = guessIcon(topic.topic);
  const name = topic.ui_name || topic.displayName;
  const preview = previewText(topic.responses);
  const hasImages = topic.images.length > 0;
  const hasMap = !!topic.map;
  const hasPins = topic.pins.length > 0;
  const hasRoutes = (topic.routes || []).length > 0;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 p-4 flex flex-col gap-2 relative overflow-hidden"
    >
      {/* subtle gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/60 group-hover:to-blue-50/20 transition-all duration-300 pointer-events-none" />

      <div className="flex items-start justify-between gap-2 relative">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{icon}</span>
          <div>
            <p className="font-semibold text-sm text-gray-800 leading-tight">{name}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{topic.topic}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
      </div>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 relative">{preview}</p>

      {/* badges */}
      {(hasImages || hasMap || hasPins || hasRoutes) && (
        <div className="flex gap-1 flex-wrap relative">
          {hasImages && (
            <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2 py-0.5">
              🖼 {topic.images.length} image{topic.images.length > 1 ? "s" : ""}
            </span>
          )}
          {hasMap && (
            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">
              📍 Map
            </span>
          )}
          {hasPins && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5">
              📌 {topic.pins.length} pin{topic.pins.length > 1 ? "s" : ""}
            </span>
          )}
          {hasRoutes && (
            <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">
              🛣️ {(topic.routes || []).length} route{(topic.routes || []).length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Intent Tab Panel ─────────────────────────────────────────────────────────

interface IntentPanelProps {
  intentMeta: SuperIntentMeta;
}

function IntentPanel({ intentMeta }: IntentPanelProps) {
  const [selectedTopic, setSelectedTopic] = useState<TopicData | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["superIntentTopics", intentMeta.file],
    queryFn: () => fetchSuperIntentTopics(intentMeta.file),
    enabled: true,
    staleTime: 30000,
  });

  const topics = data?.topics || [];
  const filtered = search
    ? topics.filter(
        (t) =>
          (t.ui_name || t.displayName || t.topic)
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          t.topic.toLowerCase().includes(search.toLowerCase())
      )
    : topics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span className="text-muted-foreground text-sm">Loading topics…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-16 text-sm text-red-500">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        Failed to load topics for {intentMeta.displayName}.
        <br />
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{intentMeta.displayName}</h2>
          <p className="text-xs text-muted-foreground font-mono">{intentMeta.intent}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1">
            {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
          </span>
          <Input
            placeholder="Search topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 h-8 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
          {search ? `No topics match "${search}"` : "No topics found in this Super Intent."}
        </div>
      ) : (
        // Fixed-height scrollable grid — shows 3 rows (≈500px), rest scroll
        <div className="overflow-y-auto max-h-[500px] pr-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((topic) => (
              <TopicCard
                key={topic.topic}
                topic={topic}
                onClick={() => setSelectedTopic(topic)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedTopic && (
        <TopicModal
          file={intentMeta.file}
          topic={selectedTopic}
          open={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          onSaved={() => {
            // Refresh the topic list so the card reflects new ui_name
            refetch();
            setSelectedTopic(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function AdminSuperIntents() {
  const { data: superIntents = [], isLoading } = useQuery({
    queryKey: ["superIntents"],
    queryFn: fetchSuperIntents,
    staleTime: 60000,
  });

  const [activeIntent, setActiveIntent] = useState<string>("");

  // Set default tab once data arrives
  useEffect(() => {
    if (superIntents.length > 0 && !activeIntent) {
      setActiveIntent(superIntents[0].file);
    }
  }, [superIntents, activeIntent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500 mr-3" />
        <span className="text-muted-foreground">Loading Super Intents…</span>
      </div>
    );
  }

  if (superIntents.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
        No Super Intent JSON files found in <code className="font-mono">rasa/actions/Supper Saiyan/</code>.
      </div>
    );
  }

  const activeIntentMeta = superIntents.find((s) => s.file === activeIntent);

  return (
    // Fixed height 640px — left & right panels scroll independently
    <div className="flex gap-0 h-[640px] rounded-xl border bg-white overflow-hidden shadow-sm">
      {/* ── LEFT: Super Intent vertical nav ── */}
      <div className="w-56 shrink-0 border-r bg-gray-50 flex flex-col">
        <div
          className="px-4 py-3 border-b shrink-0"
          style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
        >
          <p className="text-white font-semibold text-xs uppercase tracking-wider">Super Intents</p>
          <p className="text-blue-200 text-[10px] mt-0.5">{superIntents.length} categories</p>
        </div>

        {/* Nav scrolls: each item ~44px, 9 visible = ~396px, then scroll */}
        <nav
          className="flex-1 overflow-y-auto py-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
        >
          {superIntents.map((intent) => {
            const isActive = intent.file === activeIntent;
            return (
              <button
                key={intent.file}
                onClick={() => setActiveIntent(intent.file)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center justify-between gap-2 ${
                  isActive
                    ? "text-white font-semibold shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                style={
                  isActive
                    ? { background: "linear-gradient(to right, #001C38, #0356a9ff)" }
                    : undefined
                }
              >
                <span className="leading-tight">{intent.displayName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {intent.topicCount}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── RIGHT: Topic panel — scrolls independently ── */}
      <div
        className="flex-1 min-w-0 p-6 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
      >
        {activeIntentMeta ? (
          <IntentPanel intentMeta={activeIntentMeta} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a Super Intent from the left panel.
          </div>
        )}
      </div>
    </div>
  );
}
