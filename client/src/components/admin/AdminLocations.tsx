import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLocation, fetchLocationSummaries, saveLocation } from "@/lib/adminApi";
import type { Location } from "@/types/admin";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminMapPinsEditor, type AdminPin } from "@/components/admin/AdminMapPinsEditor";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import {
  AdminResponseBubblesEditor,
  normalizeRichBubble,
} from "@/components/admin/AdminResponseBubblesEditor";
import {
  Save, Loader2, ImagePlus, Trash2, MapPin,
  MessageSquareText, ChevronRight, RefreshCw,
} from "lucide-react";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

// ─── helpers ─────────────────────────────────────────────────────────────────

function groupByBuilding(locations: Location[]): Record<string, Location[]> {
  const groups: Record<string, Location[]> = {};
  for (const l of locations) {
    const b = l.building?.trim() || "Other";
    if (!groups[b]) groups[b] = [];
    groups[b].push(l);
  }
  return groups;
}

function previewText(loc: Location): string {
  if (loc.responsePreview) return loc.responsePreview;
  const lines = loc.responses?.en ?? [];
  const first = lines.find(l => l.trim());
  if (!first) return "No response yet";
  const plain = first.replace(/<[^>]+>/g, "");
  return plain.length > 85 ? plain.slice(0, 85) + "…" : plain;
}

function summarizeLocation(location: Location): Location {
  return {
    id: location.id,
    name: location.name,
    mapImage: location.mapImage,
    type: location.type,
    building: location.building,
    floor: location.floor,
    responsePreview: previewText(location),
    imageCount: location.imageUrls?.length ?? 0,
    pinCount: location.pins?.length ?? 0,
    routeCount: location.routes?.length ?? 0,
    hasMap: location.coordinates?.length === 2 || !!location.pins?.length || !!location.routes?.length,
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface LocationModalProps {
  location: Location;
  open: boolean;
  onClose: () => void;
  onSaved: (location: Location) => void;
}

function LocationModal({ location, open, onClose, onSaved }: LocationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("responses");
  const isCoordsPresent = Array.isArray(location.coordinates) && location.coordinates.length === 2;
  const [mapEnabled, setMapEnabled] = useState<boolean>(isCoordsPresent);
  const [enLines, setEnLines] = useState<string[]>(location.responses?.en?.length ? location.responses.en : [""]);
  const [cebLines, setCebLines] = useState<string[]>(location.responses?.ceb?.length ? location.responses.ceb : [""]);
  const [images, setImages] = useState<string[]>(location.imageUrls ?? []);
  const [coords, setCoords] = useState<[number, number]>(
    location.coordinates?.length === 2 ? [location.coordinates[0], location.coordinates[1]] : [500, 500]
  );
  // Convert Location pins to AdminPin format
  const [pins, setPins] = useState<AdminPin[]>(
    (location.pins ?? []).map(p => ({
      name: p.name,
      coordinates: (p.coordinates?.length === 2 ? [p.coordinates[0], p.coordinates[1]] : [500, 500]) as [number, number],
      floor: (p as any)?.floor as AdminPin["floor"],
      access: (p as any)?.access as AdminPin["access"],
      pinType: (p as any)?.pinType as AdminPin["pinType"],
      pinImageUrl: (p as any)?.pinImageUrl || (p as any)?.altImageUrl,
      pinImageAlt: (p as any)?.pinImageAlt,
    }))
  );
  const [routes, setRoutes] = useState<any[]>(location.routes ?? []);
  const [deleteImg, setDeleteImg] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab("responses");
    setEnLines(location.responses?.en?.length ? location.responses.en : [""]);
    setCebLines(location.responses?.ceb?.length ? location.responses.ceb : [""]);
    setImages(location.imageUrls ?? []);
    setCoords(location.coordinates?.length === 2 ? [location.coordinates[0], location.coordinates[1]] : [500, 500]);
    setPins((location.pins ?? []).map(p => ({
      name: p.name,
      coordinates: (p.coordinates?.length === 2 ? [p.coordinates[0], p.coordinates[1]] : [500, 500]) as [number, number],
      floor: p.floor as AdminPin["floor"],
      access: (p as any).access as AdminPin["access"],
      pinType: (p as any).pinType as AdminPin["pinType"],
      pinImageUrl: (p as any)?.pinImageUrl || (p as any)?.altImageUrl,
      pinImageAlt: (p as any)?.pinImageAlt,
    })));
    setRoutes(location.routes ?? []);
    const hasCoordinates = Array.isArray(location.coordinates) && location.coordinates.length === 2;
    setMapEnabled(hasCoordinates);
  }, [open, location]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Location = {
        ...location,
        coordinates: mapEnabled ? coords : [],
        // Convert AdminPin back to Location pin format, preserving floor & photo data
        pins: mapEnabled ? pins.filter(p => p.name.trim()).map(p => ({
          name: p.name,
          coordinates: p.coordinates,
          ...(p.floor && { floor: p.floor }),
          ...(p.access && { access: p.access }),
          ...(p.pinType && { pinType: p.pinType }),
          ...(p.pinImageUrl && { pinImageUrl: p.pinImageUrl }),
          ...(p.pinImageAlt && { pinImageAlt: p.pinImageAlt }),
        } as any)) : [],
        routes: mapEnabled ? routes : [],
        responses: {
          en: enLines.map(normalizeRichBubble).filter(l => l.trim()),
          ceb: cebLines.map(normalizeRichBubble).filter(l => l.trim()),
        },
        imageUrls: images.filter(u => u.trim()),
      };
      return saveLocation(payload);
    },
    onSuccess: (result) => {
      if (result.success) {
        const savedLocation = (result.data as Location | undefined) ?? {
          ...location,
          coordinates: mapEnabled ? coords : [],
          pins: mapEnabled ? pins : [],
          routes: mapEnabled ? routes : [],
          responses: {
            en: enLines.map(normalizeRichBubble).filter(l => l.trim()),
            ceb: cebLines.map(normalizeRichBubble).filter(l => l.trim()),
          },
          imageUrls: images.filter(u => u.trim()),
        } as Location;
        toast({ title: "Saved", description: `"${location.name}" updated.` });
        queryClient.setQueryData(["location", savedLocation.id], savedLocation);
        queryClient.setQueryData<Location[]>(["locationSummaries"], (current) =>
          current?.map((item) => item.id === savedLocation.id ? summarizeLocation(savedLocation) : item)
        );
        queryClient.setQueryData<Location[]>(["locations"], (current) =>
          current?.map((item) => item.id === savedLocation.id ? savedLocation : item)
        );
        onSaved(savedLocation);
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
              <DialogTitle className="text-white text-lg font-bold leading-tight">{location.name}</DialogTitle>
              <div className="flex gap-2 mt-1 flex-wrap">
                {location.type && <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">{location.type}</span>}
                {location.building && <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">{location.building}</span>}
                {location.floor && <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">Floor {location.floor}</span>}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full rounded-none border-b bg-gray-50 justify-start gap-1 px-4 h-10">
                <TabsTrigger value="responses" className="text-xs gap-1.5"><MessageSquareText className="h-3.5 w-3.5" />Responses</TabsTrigger>
                <TabsTrigger value="images" className="text-xs gap-1.5"><ImagePlus className="h-3.5 w-3.5" />Images</TabsTrigger>
                <TabsTrigger value="map" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" />Map & Pins</TabsTrigger>
              </TabsList>

              {/* Responses */}
              <TabsContent value="responses" className="p-3 space-y-4 mt-0">
                <AdminResponseBubblesEditor
                  label="English Responses"
                  bubbles={enLines}
                  onChange={setEnLines}
                />
                <AdminResponseBubblesEditor
                  label="Cebuano/Bisaya Responses"
                  bubbles={cebLines}
                  onChange={setCebLines}
                />
                <div className="rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
                  <strong>Tip:</strong> Each box represents <strong>1 chatbot bubble</strong>. Press <strong>Enter</strong> to add a line break inside the bubble. Select text and press <strong>Ctrl + B</strong> to bold.
                </div>
              </TabsContent>

              {/* Images */}
              <TabsContent value="images" className="p-5 space-y-4 mt-0">
                <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />

                {images.length === 0
                  ? <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg"><ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-30" />No images yet.</div>
                  : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border shadow-sm">
                        <img src={url} alt="" className="w-full h-32 object-cover" onError={e => { (e.currentTarget as any).src = ""; e.currentTarget.style.background = "#f3f4f6"; }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <button onClick={() => setDeleteImg(i)} className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1.5 shadow-lg"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <p className="text-[10px] text-gray-400 px-1.5 py-1 truncate">{url}</p>
                      </div>
                    ))}
                  </div>}
              </TabsContent>

              {/* Map & Pins — merged */}
              <TabsContent value="map" className="p-3 mt-0">
                {!mapEnabled ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-gray-50/50 my-2">
                    <MapPin className="h-10 w-10 text-gray-400 mb-3 opacity-40" />
                    <h4 className="text-sm font-semibold text-gray-700">Map & Pins Disabled</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      This location will not display a map route or pin in the chatbot response. Toggle the switch below to configure coordinates, pins, and navigation routes.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 text-xs font-medium"
                      onClick={() => setMapEnabled(true)}
                    >
                      Enable Map & Pins
                    </Button>
                  </div>
                ) : (
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

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between rounded-b-lg">
            <p className="text-xs text-muted-foreground">Saves to <code className="font-mono">responses_location_core.json</code></p>
            <div className="flex items-center gap-2">
              {activeTab === "map" && (
                <div className="flex items-center gap-2 mr-2 px-2.5 py-1 bg-white rounded-md border shadow-xs">
                  <Switch
                    id="map-enable-toggle"
                    checked={mapEnabled}
                    onCheckedChange={setMapEnabled}
                  />
                  <Label
                    htmlFor="map-enable-toggle"
                    className="text-xs cursor-pointer select-none font-medium text-gray-700"
                  >
                    {mapEnabled ? "Map Enabled" : "Map Disabled"}
                  </Label>
                </div>
              )}
              <AdminTooltip title="Cancel" description="Discard edits and close location modal" side="top">
                <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Cancel</Button>
              </AdminTooltip>
              <AdminTooltip title="Save Location" description="Save responses, coordinates, pins, and images for this location" side="top">
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
            <AlertDialogDescription>Permanently delete this image from the list?</AlertDialogDescription>
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

const LocationCard = memo(function LocationCard({ location, onClick }: { location: Location; onClick: () => void }) {
  const preview = previewText(location);
  const hasImg = !!location.imageUrls?.length;
  const hasPins = !!location.pins?.length;
  const hasCoordinates = !!(location.coordinates?.length === 2);
  const hasMapData = location.hasMap ?? (hasPins || hasCoordinates);

  return (
    <AdminTooltip
      title={location.name}
      description="Click to open location editor and modify coordinates, pins, and responses"
      side="top"
    >
      <button
        type="button"
        onClick={onClick}
        className="group w-full text-left rounded-xl border bg-white hover:border-blue-400 hover:shadow-xs transition-colors p-4 flex flex-col gap-2 relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{location.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {[location.type, location.floor && `Floor ${location.floor}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
      </div>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 relative">{preview}</p>
      {(hasImg || hasMapData) && (
        <div className="flex gap-1 flex-wrap relative">
          {hasImg && <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2 py-0.5">🖼 {location.imageUrls!.length} image{location.imageUrls!.length > 1 ? "s" : ""}</span>}
          {hasPins && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5">📌 {location.pins!.length} pin{location.pins!.length > 1 ? "s" : ""}</span>}
          {hasMapData && <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">📍 Map</span>}
        </div>
      )}
    </button>
  </AdminTooltip>
  );
});

// ─── Building Panel ───────────────────────────────────────────────────────────

function BuildingPanel({ building, locations }: { building: string; locations: Location[] }) {
  const [selected, setSelected] = useState<Location | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    return deferredSearch
      ? locations.filter(l => l.name.toLowerCase().includes(deferredSearch.toLowerCase()))
      : locations;
  }, [deferredSearch, locations]);

  const handleSelect = useCallback((l: Location) => {
    setSelected(l);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{building}</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} location{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Input placeholder="Search locations…" value={search} onChange={e => setSearch(e.target.value)} className="w-44 h-8 text-sm" />
      </div>

      {filtered.length === 0
        ? <div className="text-center py-16 text-sm text-muted-foreground border-2 border-dashed rounded-xl">{search ? `No locations match "${search}"` : "No locations found."}</div>
        : <div className="overflow-y-auto max-h-[420px] pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(l => <LocationCard key={l.id} location={l} onClick={() => handleSelect(l)} />)}
          </div>
        </div>}

      {selected && (
        <LocationEditorLoader summary={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function LocationEditorLoader({ summary, onClose }: { summary: Location; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["location", summary.id],
    queryFn: () => fetchLocation(summary.id),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || isError || !data) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{summary.name}</DialogTitle></DialogHeader>
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Loading location...</> : (
              <div className="space-y-3 text-center"><p>Could not load this location.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <LocationModal location={data} open onClose={onClose} onSaved={() => onClose()} />;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function AdminLocations() {
  const queryClient = useQueryClient();
  const { data: allLocations = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["locationSummaries"],
    queryFn: fetchLocationSummaries,
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => groupByBuilding(allLocations), [allLocations]);
  const buildings = useMemo(() => Object.keys(grouped).sort(), [grouped]);
  const [activeBuilding, setActiveBuilding] = useState<string>("");

  useEffect(() => {
    if (buildings.length > 0 && !activeBuilding) setActiveBuilding(buildings[0]);
  }, [buildings, activeBuilding]);

  const refreshLocations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["location"] });
    await refetch();
  }, [queryClient, refetch]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-7 w-7 animate-spin text-blue-500 mr-3" />
      <span className="text-muted-foreground">Loading locations…</span>
    </div>
  );

  if (allLocations.length === 0) return (
    <div className="text-center py-20 text-muted-foreground text-sm">
      <MapPin className="h-8 w-8 mx-auto mb-3 opacity-40" />
      No locations found in <code className="font-mono">responses_location_core.json</code>.
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AdminTooltip title="Refresh Locations" description="Reload location summaries from the server" side="bottom">
          <Button variant="outline" size="sm" onClick={refreshLocations} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </AdminTooltip>
      </div>
      <div className="flex h-[540px] rounded-xl border bg-white overflow-hidden shadow-sm">
      {/* LEFT: Building nav */}
      <div className="w-56 shrink-0 border-r bg-gray-50 flex flex-col">
        <div className="px-4 py-3 border-b shrink-0" style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}>
          <p className="text-white font-semibold text-xs uppercase tracking-wider">Buildings</p>
          <p className="text-blue-200 text-[10px] mt-0.5">{buildings.length} groups</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
          {buildings.map(b => {
            const isActive = b === activeBuilding;
            return (
              <button key={b} onClick={() => setActiveBuilding(b)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center justify-between gap-2 ${isActive ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-100"}`}
                style={isActive ? { background: "linear-gradient(to right, #001C38, #0356a9ff)" } : undefined}>
                <span className="leading-tight truncate">{b}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {grouped[b]?.length ?? 0}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* RIGHT: Cards */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
        {activeBuilding && grouped[activeBuilding]
          ? <BuildingPanel building={activeBuilding} locations={grouped[activeBuilding]} />
          : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Select a building from the left.</div>}
      </div>
      </div>
    </div>
  );
}
