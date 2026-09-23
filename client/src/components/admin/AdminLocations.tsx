import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef, memo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminMapPinsEditor, type AdminPin } from "@/components/admin/AdminMapPinsEditor";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import {
  AdminResponseBubblesEditor,
  normalizeRichBubble,
} from "@/components/admin/AdminResponseBubblesEditor";
import {
  Save,
  Loader2,
  ImagePlus,
  Trash2,
  MapPin,
  MessageSquareText,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  Building2,
  Image as ImageIcon,
  Navigation,
  Sparkles,
  Search,
  X,
  Edit2,
  Globe,
  Layers,
  Compass,
} from "lucide-react";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

// ─── helpers ─────────────────────────────────────────────────────────────────

function groupByBuilding(locations: Location[]): Record<string, Location[]> {
  const groups: Record<string, Location[]> = {};
  for (const l of locations) {
    const b = l.building?.trim() || "General Campus";
    if (!groups[b]) groups[b] = [];
    groups[b].push(l);
  }
  return groups;
}

function previewText(loc: Location): string {
  if (loc.responsePreview) return loc.responsePreview;
  const lines = loc.responses?.en ?? [];
  const first = lines.find(l => l.trim());
  if (!first) return "No response content configured yet.";
  const plain = first.replace(/<[^>]+>/g, "");
  return plain.length > 150 ? plain.slice(0, 150) + "…" : plain;
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

// ─── Location Edit Modal ──────────────────────────────────────────────────────

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
  const [mapEnabled, setMapEnabled] = useState<boolean>(isCoordsPresent || !!location.pins?.length || !!location.routes?.length);
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
    setMapEnabled(hasCoordinates || !!location.pins?.length || !!location.routes?.length);
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
        toast({ title: "Saved successfully", description: `"${location.name}" has been updated.` });
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
      toast({ title: "Error", description: err?.message || "Failed to save location", variant: "destructive" }),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="w-[94vw] max-w-6xl xl:max-w-7xl h-[88vh] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-slate-200/80 shadow-2xl [&>button.absolute]:hidden">
          <DialogHeader className="border-b bg-gradient-to-r from-[#001C38] via-[#002b54] to-[#0356a9] px-6 py-3.5 sm:py-4 rounded-t-2xl text-white shrink-0">
            <div className="flex items-center justify-between w-full gap-4">
              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium truncate">
                  <span className="text-blue-100 font-semibold">{location.building || "Campus Locations"}</span>
                  {location.floor && (
                    <>
                      <span className="text-blue-300/60">&gt;</span>
                      <span>Floor {location.floor}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {location.type && (
                    <Badge className="bg-white/15 text-white hover:bg-white/20 border-white/25 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
                      {location.type}
                    </Badge>
                  )}
                  {location.building && (
                    <Badge className="bg-amber-400/20 text-amber-300 hover:bg-amber-400/25 border-amber-400/30 text-[10px] font-semibold px-2 py-0.5">
                      {location.building}
                    </Badge>
                  )}
                  <Badge className="bg-blue-400/20 text-blue-200 hover:bg-blue-400/25 border-blue-400/30 text-[10px] font-semibold px-2 py-0.5">
                    {location.floor ? `Floor ${location.floor}` : "Floor N/A"}
                  </Badge>
                </div>
                <DialogTitle className="sr-only">{location.name}</DialogTitle>
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
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={location.name}>
                    {location.name}
                  </h3>
                </div>

                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("responses")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "responses"
                      ? "bg-[#001C38] text-white shadow-sm ring-1 ring-[#001C38]/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquareText className={`h-4 w-4 ${activeTab === "responses" ? "text-amber-400" : "text-blue-600"}`} />
                    <span>Responses</span>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 ${activeTab === "responses" ? "bg-white/20 text-white border-transparent" : "bg-slate-200 text-slate-700"}`}>
                    {enLines.filter(l => l.trim()).length + cebLines.filter(l => l.trim()).length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("images")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "images"
                      ? "bg-[#001C38] text-white shadow-sm ring-1 ring-[#001C38]/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ImageIcon className={`h-4 w-4 ${activeTab === "images" ? "text-amber-400" : "text-amber-600"}`} />
                    <span>Images</span>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 ${activeTab === "images" ? "bg-white/20 text-white border-transparent" : "bg-slate-200 text-slate-700"}`}>
                    {images.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("map")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "map"
                      ? "bg-[#001C38] text-white shadow-sm ring-1 ring-[#001C38]/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className={`h-4 w-4 ${activeTab === "map" ? "text-amber-400" : "text-purple-600"}`} />
                    <span>Map & Navigation</span>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 ${activeTab === "map" ? "bg-white/20 text-white border-transparent" : "bg-slate-200 text-slate-700"}`}>
                    {mapEnabled ? `${pins.length} Pins` : "Off"}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Right Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {activeTab === "responses" && (
                <div className="space-y-4 w-full">
                  {/* English & Bisaya side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                    {/* Row 1 / Column 1: English Responses */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <Globe className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">English Responses</h4>
                            <p className="text-[11px] text-slate-500">Location directions in English</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-semibold">
                          {enLines.filter(l => l.trim()).length} Bubbles
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <AdminResponseBubblesEditor
                          label=""
                          bubbles={enLines}
                          onChange={setEnLines}
                        />
                      </div>
                    </div>

                    {/* Row 2 / Column 2: Bisaya / Cebuano Responses */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                            <Globe className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Bisaya / Cebuano Responses</h4>
                            <p className="text-[11px] text-slate-500">Location directions in Sinugbuanong Binisaya</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                          {cebLines.filter(l => l.trim()).length} Bubbles
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <AdminResponseBubblesEditor
                          label=""
                          bubbles={cebLines}
                          onChange={setCebLines}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "images" && (
                <div className="space-y-4 w-full">
                  <AdminImageUploader onAddImage={(url) => setImages([...images, url])} />

                  {images.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white/70">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-400 opacity-40" />
                      No photos attached yet. Upload photos of this room or building entrance above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                          <img 
                            src={url} 
                            alt="" 
                            className="w-full h-32 object-cover" 
                            onError={e => { (e.currentTarget as any).src = ""; e.currentTarget.style.background = "#f3f4f6"; }} 
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => setDeleteImg(i)} 
                              className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all"
                              title="Delete image"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 px-2 py-1 truncate font-mono">{url}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "map" && (
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Map & Pins Status</h4>
                        <p className="text-[11px] text-slate-500">
                          {mapEnabled ? "Interactive campus coordinates and pins are active" : "Map navigation is disabled for this location"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="map-enable-toggle"
                        checked={mapEnabled}
                        onCheckedChange={setMapEnabled}
                      />
                      <Label
                        htmlFor="map-enable-toggle"
                        className="text-xs cursor-pointer select-none font-semibold text-slate-700"
                      >
                        {mapEnabled ? "Active" : "Disabled"}
                      </Label>
                    </div>
                  </div>

                  {!mapEnabled ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/70">
                      <MapPin className="h-10 w-10 text-slate-400 mb-3 opacity-40" />
                      <h4 className="text-sm font-bold text-slate-800">Map & Pins Currently Disabled</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        This location does not currently display a map pin or route in chatbot responses. Enable it to place pins and draw walkable paths on the campus map.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4 text-xs font-semibold bg-[#001C38] hover:bg-[#032f5d] text-white"
                        onClick={() => setMapEnabled(true)}
                      >
                        <Navigation className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                        Enable Interactive Map & Pins
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 p-2 bg-white shadow-xs">
                      <AdminMapPinsEditor
                        pins={pins}
                        routes={routes}
                        onPinsChange={setPins}
                        onRoutesChange={setRoutes}
                        mapSize={440}
                        mapImage={location.mapImage}
                      />
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Tip docked at bottom above footer line */}
              {activeTab === "responses" && (
                <div className="px-5 sm:px-6 pb-3 pt-1 bg-slate-50/40 shrink-0">
                  <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-900 shadow-xs">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>
                      <strong>Tip:</strong> Each box represents <strong>1 chatbot bubble</strong>. Press <strong>Enter</strong> to add a line break inside the bubble. Select text and press <strong>Ctrl + B</strong> to bold.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl shrink-0">
            <p className="text-xs text-muted-foreground">
              Source file: <code className="font-mono text-slate-700 font-semibold">responses_location_core.json</code>
            </p>
            <div className="flex items-center gap-2.5">
              <AdminTooltip title="Cancel" description="Discard edits and close location modal" side="top">
                <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending} className="border-slate-300">
                  Cancel
                </Button>
              </AdminTooltip>
              <AdminTooltip title="Save Location" description="Save responses, coordinates, pins, and images for this location" side="top">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  disabled={saveMutation.isPending} 
                  className="bg-[#001C38] hover:bg-[#032f5d] text-white font-semibold shadow-sm"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-400" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2 text-amber-400" />
                      Save Location
                    </>
                  )}
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
            <AlertDialogDescription>Are you sure you want to remove this photo from the location gallery?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => { 
                if (deleteImg !== null) { 
                  setImages(images.filter((_, j) => j !== deleteImg)); 
                  setDeleteImg(null); 
                } 
              }}
            >
              Delete Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Location Row Item ────────────────────────────────────────────────────────

const LocationRow = memo(function LocationRow({
  location,
  onOpen,
}: {
  location: Location;
  onOpen: (location: Location) => void;
}) {
  const preview = previewText(location);
  const hasImg = !!location.imageUrls?.length;
  const hasPins = !!location.pins?.length;
  const hasCoordinates = !!(location.coordinates?.length === 2);
  const hasMapData = location.hasMap ?? (hasPins || hasCoordinates);

  return (
    <div className="grid grid-cols-12 gap-2 border-t border-slate-100 px-4 py-3 text-sm hover:bg-slate-50/70 transition-colors group">
      {/* Col 1: Location Name, Type & Floor */}
      <div className="col-span-4 min-w-0">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                {location.name}
              </span>
              {location.type && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200">
                  {location.type}
                </span>
              )}
              {location.floor && (
                <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold">
                  {location.floor.startsWith("Floor") ? location.floor : `Floor ${location.floor}`}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>{location.building || "General Campus"}</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="truncate">{location.name}</span>
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
          {location.pins && location.pins.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-500" />
              <span>{location.pins.length} pin(s) placed</span>
            </span>
          )}
          {location.routes && location.routes.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Navigation className="h-3 w-3 text-emerald-500" />
              <span>{location.routes.length} navigation route(s)</span>
            </span>
          )}
          {hasImg && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3 w-3 text-purple-500" />
              <span>{location.imageUrls!.length} photo(s)</span>
            </span>
          )}
        </div>
      </div>

      {/* Col 3: Coverage Badges with Lucide Icons (Zero emojis) */}
      <div className="col-span-3 flex flex-wrap content-start gap-1">
        {statusPill("EN", (location.responses?.en?.length ?? 0) > 0, <Globe className="h-3 w-3 text-blue-600" />)}
        {statusPill("CEB", (location.responses?.ceb?.length ?? 0) > 0, <Globe className="h-3 w-3 text-emerald-600" />)}
        {hasImg && statusPill(`${location.imageUrls!.length} Photos`, true, <ImageIcon className="h-3 w-3 text-amber-600" />)}
        {hasMapData && statusPill("Map Ready", true, <Navigation className="h-3 w-3 text-emerald-600" />)}
        {hasPins && statusPill(`${location.pins!.length} Pins`, true, <MapPin className="h-3 w-3 text-purple-600" />)}
      </div>

      {/* Col 4: Action Button */}
      <div className="col-span-1 text-right">
        <div className="flex justify-end">
          <AdminTooltip
            title="Edit Location"
            description="Open editor to modify responses, map pins, coordinates, and photos"
            side="left"
          >
            <Button
              size="sm"
              onClick={() => onOpen(location)}
              className="h-7 px-2.5 text-xs bg-[#001C38] hover:bg-[#032f5d] text-white font-semibold shadow-xs flex items-center gap-1 transition-all"
            >
              <Edit2 className="h-3 w-3 text-amber-400" />
              <span>Edit</span>
            </Button>
          </AdminTooltip>
        </div>
      </div>
    </div>
  );
});

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
            {isLoading ? <><Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Loading location...</> : (
              <div className="space-y-3 text-center">
                <p>Could not load location details.</p>
                <Button variant="outline" onClick={() => refetch()}>Try again</Button>
              </div>
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
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [selected, setSelected] = useState<Location | null>(null);
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());
  const initializedCollapse = useRef(false);

  const { data: allLocations = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["locationSummaries"],
    queryFn: fetchLocationSummaries,
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => groupByBuilding(allLocations), [allLocations]);
  const buildings = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // Collapse by default on first load for clean browsing
  useEffect(() => {
    if (initializedCollapse.current || buildings.length === 0) return;
    initializedCollapse.current = true;
    setCollapsedBuildings(new Set(buildings));
  }, [buildings]);

  const toggleBuildingCollapse = useCallback((buildingName: string) => {
    setCollapsedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(buildingName)) next.delete(buildingName);
      else next.add(buildingName);
      return next;
    });
  }, []);

  const toggleAllCollapse = useCallback(() => {
    if (collapsedBuildings.size > 0) {
      setCollapsedBuildings(new Set());
    } else {
      setCollapsedBuildings(new Set(buildings));
    }
  }, [collapsedBuildings.size, buildings]);

  const refreshLocations = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["location"] });
    await refetch();
  }, [queryClient, refetch]);

  // Filtered grouped data
  const filteredBuildingData = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return buildings
      .filter((b) => buildingFilter === "all" || b === buildingFilter)
      .map((b) => {
        const locations = grouped[b] || [];
        const matchingLocations = q
          ? locations.filter(
              (l) =>
                l.name.toLowerCase().includes(q) ||
                (l.building && l.building.toLowerCase().includes(q)) ||
                (l.type && l.type.toLowerCase().includes(q)) ||
                (l.floor && l.floor.toLowerCase().includes(q)) ||
                previewText(l).toLowerCase().includes(q)
            )
          : locations;
        return {
          building: b,
          count: locations.length,
          matchingLocations,
        };
      })
      .filter((group) => group.matchingLocations.length > 0 || !q);
  }, [buildings, grouped, buildingFilter, deferredSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
        Loading campus locations...
      </div>
    );
  }

  if (allLocations.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        <MapPin className="h-8 w-8 mx-auto mb-3 opacity-40 text-slate-400" />
        No locations found in <code className="font-mono text-slate-700">responses_location_core.json</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Campus Locations & Maps</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
              {allLocations.length} Locations · {buildings.length} Buildings
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
              placeholder="Search locations, floors, answers..."
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

          {/* Building Category Filter */}
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-full sm:w-56 h-8.5 text-xs bg-white border-slate-200">
              <SelectValue placeholder="Filter building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campus Buildings ({allLocations.length})</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b} value={b}>
                  {b} ({grouped[b]?.length ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Expand / Collapse All */}
          <AdminTooltip
            title={collapsedBuildings.size > 0 ? "Expand All Buildings" : "Collapse All Buildings"}
            description="Toggle expand state for all building dropdown sections"
            side="bottom"
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleAllCollapse} 
              className="h-8.5 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
            >
              <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              {collapsedBuildings.size > 0 ? "Expand All" : "Collapse All"}
            </Button>
          </AdminTooltip>
        </div>
      </div>

      {/* Main Categorized Accordion Table (Exact same layout & style as Knowledge Manager) */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <div className="col-span-4">Location & Floor</div>
            <div className="col-span-4">Answer Preview</div>
            <div className="col-span-3">Coverage Badges</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100" style={{ scrollbarWidth: "thin" }}>
          {filteredBuildingData.map(({ building, count, matchingLocations }) => {
            const isCollapsed = collapsedBuildings.has(building);
            return (
              <div key={building} className="border-b border-slate-200/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleBuildingCollapse(building)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors px-4 py-2.5 text-sm font-bold text-slate-900 select-none text-left border-l-4 border-l-[#001C38]"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-[#001C38] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#001C38] shrink-0" />
                    )}
                    <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{building}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#001C38] shadow-xs">
                      {count} location{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div>
                    {matchingLocations.map((loc) => (
                      <LocationRow
                        key={loc.id}
                        location={loc}
                        onOpen={(l) => setSelected(l)}
                      />
                    ))}
                    {matchingLocations.length === 0 && (
                      <div className="border-t border-slate-100 px-10 py-2.5 text-xs text-muted-foreground bg-slate-50/50">
                        No locations matched your current search in this building.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredBuildingData.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No campus locations matched your search or building filter.
            </div>
          )}
        </div>
      </div>

      {/* Location Detail & Edit Modal */}
      {selected && (
        <LocationEditorLoader summary={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
