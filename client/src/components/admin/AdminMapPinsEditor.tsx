/**
 * AdminMapPinsEditor
 * ──────────────────
 * A reusable map+pins editor component for admin modals.
 * Supports placing pins, drawing routes, and EDITING everything interactively.
 *
 * Coordinates use [y, x] format in 0–1000 scale.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  PlusCircle, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Navigation,
  Move,
  Check,
  Edit2
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminPin {
  name: string;
  /** [y, x] format */
  coordinates: [number, number];
}

export interface AdminRoute {
  name: string;
  points: [number, number][];
  color?: string;
  isDefault?: boolean;
  id: string | number;
}

interface AdminMapPinsEditorProps {
  pins: AdminPin[];
  routes?: AdminRoute[];
  onPinsChange: (pins: AdminPin[]) => void;
  onRoutesChange?: (routes: AdminRoute[]) => void;
  mapSize?: number;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const PIN_COLOURS = ["#2563eb","#dc2626","#16a34a","#ea580c","#9333ea","#0891b2","#be185d","#ca8a04","#4f46e5","#0f766e"];

function pinColour(idx: number) {
  return PIN_COLOURS[idx % PIN_COLOURS.length];
}

function drawPin(ctx: CanvasRenderingContext2D, sx: number, sy: number, colour: string, label?: string) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(sx + 1, sy + 13, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(sx, sy - 7, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 9, sy - 7); ctx.lineTo(sx, sy + 12); ctx.lineTo(sx + 9, sy - 7);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(sx, sy - 7, 3, 0, Math.PI * 2); ctx.fill();
  if (label) {
    ctx.font = "bold 9px system-ui";
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    const w = ctx.measureText(label).width + 8;
    ctx.beginPath(); ctx.roundRect(sx + 10, sy - 14, w, 12, 3); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(label, sx + 14, sy - 5);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminMapPinsEditor({
  pins,
  routes = [],
  onPinsChange,
  onRoutesChange,
  mapSize = 420,
}: AdminMapPinsEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  
  // Interaction State
  const [mode, setMode] = useState<"view" | "place-pin" | "draw-route" | "edit-route" | "edit-pin">("view");
  const [pendingPinName, setPendingPinName] = useState("");
  const [activeRoutePoints, setActiveRoutePoints] = useState<[number, number][]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | number | null>(null);
  const [selectedPinIdx, setSelectedPinIdx] = useState<number | null>(null);
  
  // Dragging state
  const isDraggingMap = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const [draggingPinIdx, setDraggingPinIdx] = useState<number | null>(null);

  // Connection selection
  const [connStart, setConnStart] = useState("");
  const [connEnd, setConnEnd] = useState("");

  useEffect(() => {
    const img = new Image();
    img.onload = () => { mapImgRef.current = img; setImgLoaded(true); };
    img.src = "/nobackHD.png";
  }, []);

  const toScreen = useCallback((coords: [number, number]) => ({
    sx: tx + (coords[1] / 1000) * mapSize * zoom,
    sy: ty + (coords[0] / 1000) * mapSize * zoom,
  }), [tx, ty, zoom, mapSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, mapSize, mapSize);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);
    if (mapImgRef.current) { ctx.drawImage(mapImgRef.current, 0, 0, mapSize, mapSize); }
    ctx.restore();

    // Draw Routes
    routes.forEach(route => {
      const isSelected = selectedRouteId === route.id;
      const isMain = route.isDefault;
      ctx.beginPath();
      ctx.strokeStyle = isMain ? "#2563eb" : (isSelected ? "#3b82f6" : (route.color || "#10b981"));
      ctx.lineWidth = (isSelected || isMain ? 6 : 4) * zoom;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      
      route.points.forEach((p, i) => {
        const { sx, sy } = toScreen(p);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      if (isSelected && mode === "edit-route") {
        route.points.forEach((p, i) => {
          const { sx, sy } = toScreen(p);
          ctx.fillStyle = draggingPointIdx === i ? "#ef4444" : "#ffffff";
          ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      }
    });

    // Draw Active Drawing Route
    if (activeRoutePoints.length > 0) {
      ctx.beginPath(); ctx.strokeStyle = "#fb923c"; ctx.setLineDash([5, 5]); ctx.lineWidth = 3 * zoom;
      activeRoutePoints.forEach((p, i) => {
        const { sx, sy } = toScreen(p);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Draw Pins
    pins.forEach((pin, i) => {
      const { sx, sy } = toScreen(pin.coordinates);
      const isDragging = draggingPinIdx === i;
      const isSelected = selectedPinIdx === i;
      drawPin(ctx, sx, sy, (isDragging || isSelected) ? "#ef4444" : pinColour(i + 1), pin.name);
      
      if (isDragging || isSelected) {
        ctx.strokeStyle = isSelected ? "#3b82f6" : "#ffffff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy - 7, 12, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }, [pins, routes, zoom, tx, ty, imgLoaded, mapSize, activeRoutePoints, toScreen, selectedRouteId, mode, draggingPointIdx, draggingPinIdx, selectedPinIdx]);

  useEffect(() => { draw(); }, [draw]);

  const toMapCoords = (clientX: number, clientY: number): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [
      Math.round(Math.max(0, Math.min(1000, (clientY - rect.top - ty) / zoom / mapSize * 1000))),
      Math.round(Math.max(0, Math.min(1000, (clientX - rect.left - tx) / zoom / mapSize * 1000)))
    ];
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = toMapCoords(e.clientX, e.clientY);
    
    const clickedPinIdx = pins.findIndex(p => {
      const dist = Math.sqrt(Math.pow(p.coordinates[0] - coords[0], 2) + Math.pow(p.coordinates[1] - coords[1], 2));
      return dist < (25 / zoom);
    });

    if (clickedPinIdx !== -1 && (mode === "view" || (mode === "edit-pin" && selectedPinIdx === clickedPinIdx))) {
      setDraggingPinIdx(clickedPinIdx);
      if (mode !== "edit-pin") setSelectedPinIdx(clickedPinIdx);
      return;
    }

    if (mode === "edit-route" && selectedRouteId !== null) {
      const route = routes.find(r => r.id === selectedRouteId);
      if (route) {
        const pointIdx = route.points.findIndex(p => {
          const dist = Math.sqrt(Math.pow(p[0] - coords[0], 2) + Math.pow(p[1] - coords[1], 2));
          return dist < (15 / zoom);
        });
        if (pointIdx !== -1) { setDraggingPointIdx(pointIdx); return; }
      }
    }

    if (mode === "view") { isDraggingMap.current = true; dragOrigin.current = { x: e.clientX, y: e.clientY, tx, ty }; }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = toMapCoords(e.clientX, e.clientY);

    if (draggingPinIdx !== null && onPinsChange) {
      const nextPins = [...pins];
      nextPins[draggingPinIdx].coordinates = coords;
      onPinsChange(nextPins);
      return;
    }

    if (draggingPointIdx !== null && selectedRouteId !== null && onRoutesChange) {
      const nextRoutes = [...routes];
      const rIdx = nextRoutes.findIndex(r => r.id === selectedRouteId);
      if (rIdx !== -1) { nextRoutes[rIdx].points[draggingPointIdx] = coords; onRoutesChange(nextRoutes); }
      return;
    }

    if (isDraggingMap.current) {
      setTx(dragOrigin.current.tx + e.clientX - dragOrigin.current.x);
      setTy(dragOrigin.current.ty + e.clientY - dragOrigin.current.y);
    }
  };

  const handleMouseUp = () => { isDraggingMap.current = false; setDraggingPointIdx(null); setDraggingPinIdx(null); };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = toMapCoords(e.clientX, e.clientY);
    if (mode === "place-pin") {
      onPinsChange([...pins, { name: pendingPinName || `Pin ${pins.length + 1}`, coordinates: coords }]);
      setPendingPinName(""); setMode("view");
    } else if (mode === "edit-pin" && selectedPinIdx !== null && onPinsChange) {
      const nextPins = [...pins]; nextPins[selectedPinIdx].coordinates = coords; onPinsChange(nextPins);
      toast.success("Pin relocated!");
    } else if (mode === "draw-route") {
      setActiveRoutePoints([...activeRoutePoints, coords]);
    } else if (mode === "view" || mode === "edit-route") {
      const nearRoute = routes.find(r => {
        return r.points.some((p, i) => {
           if (i === 0) return false;
           const p1 = r.points[i-1]; const p2 = p;
           const dx = p2[1] - p1[1]; const dy = p2[0] - p1[0];
           const l2 = dx*dx + dy*dy; if (l2 === 0) return false;
           let t = ((coords[1] - p1[1]) * dx + (coords[0] - p1[0]) * dy) / l2;
           t = Math.max(0, Math.min(1, t));
           const dist = Math.sqrt(Math.pow(coords[1] - (p1[1] + t * dx), 2) + Math.pow(coords[0] - (p1[0] + t * dy), 2));
           return dist < (10 / zoom);
        });
      });
      if (nearRoute) { setSelectedRouteId(nearRoute.id); setMode("edit-route"); }
      else { setSelectedRouteId(null); setMode("view"); }
    }
  };

  const addWaypoint = () => {
    if (selectedRouteId === null || !onRoutesChange) return;
    const rIdx = routes.findIndex(r => r.id === selectedRouteId);
    if (rIdx !== -1) {
      const nextRoutes = [...routes]; const pts = nextRoutes[rIdx].points;
      if (pts.length >= 2) {
        const last = pts[pts.length-1]; const prev = pts[pts.length-2];
        const newPt: [number, number] = [Math.round((last[0]+prev[0])/2), Math.round((last[1]+prev[1])/2)];
        pts.splice(pts.length-1, 0, newPt); onRoutesChange(nextRoutes);
        toast.success("Waypoint added!");
      }
    }
  };

  const quickConnect = () => {
    const p1 = pins.find(p => p.name === connStart);
    const p2 = pins.find(p => p.name === connEnd);
    if (p1 && p2 && onRoutesChange) {
      onRoutesChange([...routes, { name: `${p1.name} to ${p2.name}`, points: [p1.coordinates, p2.coordinates], id: Date.now() }]);
      toast.success("Connected!");
    } else toast.error("Select both pins");
  };

  const setAsMain = (id: string | number) => {
    if (!onRoutesChange) return;
    const nextRoutes = routes.map(r => ({ ...r, isDefault: r.id === id, color: r.id === id ? "#2563eb" : "#10b981" }));
    onRoutesChange(nextRoutes);
    toast.success("Set as Main Route");
  };

  return (
    <div className="flex gap-4 h-full">
      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0 shadow-lg" style={{ width: mapSize, height: mapSize }}>
        <canvas
          ref={canvasRef}
          width={mapSize} height={mapSize}
          className="block touch-none"
          style={{ cursor: mode === "draw-route" || mode === "place-pin" ? "crosshair" : mode === "edit-route" || mode === "edit-pin" ? "move" : "grab" }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        <div className="absolute left-2 top-2 flex flex-col gap-1.5 HUD">
          <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow" onClick={() => {setZoom(z => Math.min(8, z*1.2))}}><ZoomIn className="h-4 w-4" /></Button>
          <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow" onClick={() => {setZoom(z => Math.max(0.2, z/1.2))}}><ZoomOut className="h-4 w-4" /></Button>
          <div className="h-px bg-gray-300 mx-1" />
          <Button size="icon" variant={mode === "place-pin" ? "default" : "secondary"} className="w-8 h-8 rounded-full shadow" onClick={() => setMode(mode === "place-pin" ? "view" : "place-pin")}>📌</Button>
          <Button size="icon" variant={mode === "draw-route" ? "default" : "secondary"} className="w-8 h-8 rounded-full shadow" onClick={() => {
            if (mode === "draw-route") { if (activeRoutePoints.length >= 2) { const name = prompt("Name:"); if(name && onRoutesChange) onRoutesChange([...routes, {name, points: activeRoutePoints, id: Date.now()}]); } setActiveRoutePoints([]); setMode("view"); }
            else setMode("draw-route");
          }}>
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        <button onClick={() => { setZoom(1); setTx(0); setTy(0); }} className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full border shadow hover:bg-white"><RotateCcw className="h-3.5 w-3.5" /></button>

        {(mode === "edit-route" || mode === "edit-pin") && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-600 text-white text-[10px] px-4 py-2 rounded-full shadow-xl font-bold">
            <Edit2 className="w-3 h-3" /> {mode === "edit-route" ? "Editing Route: DRAG waypoints" : `Relocating: ${pins[selectedPinIdx!]?.name}`}
            <button onClick={() => { setMode("view"); setSelectedPinIdx(null); setSelectedRouteId(null); }} className="ml-2 bg-white/20 p-1 rounded-full"><Check className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden pr-1">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2 shadow-sm">
          <Label className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Connect Two Pins</Label>
          <div className="grid grid-cols-2 gap-2">
            <select className="text-[10px] border p-1 rounded bg-white" value={connStart} onChange={e => setConnStart(e.target.value)}>
              <option value="">Start...</option>
              {pins.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select className="text-[10px] border p-1 rounded bg-white" value={connEnd} onChange={e => setConnEnd(e.target.value)}>
              <option value="">End...</option>
              {pins.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <Button size="sm" className="w-full text-[10px] h-7 bg-emerald-600 hover:bg-emerald-700" onClick={quickConnect}>Create Route</Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4" style={{ scrollbarWidth: "thin" }}>
          <div>
            <Label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 block">Connections ({routes.length})</Label>
            <div className="space-y-1.5">
              {routes.map((r, i) => (
                <div key={r.id} className={`flex flex-col gap-1 bg-white border rounded-lg p-2 hover:border-blue-300 transition-all ${selectedRouteId === r.id ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 text-xs font-semibold">
                      <span className="truncate">{r.name}</span>
                      {r.isDefault && <span className="bg-blue-100 text-blue-700 text-[8px] px-1 rounded">MAIN</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setAsMain(r.id)} className={`p-1 rounded ${r.isDefault ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><Check className="h-3 w-3" /></button>
                      <button onClick={() => { setSelectedRouteId(r.id); setMode("edit-route"); }} className="p-1 text-blue-500"><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => onRoutesChange?.(routes.filter((_, j) => j !== i))} className="p-1 text-red-400"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  {selectedRouteId === r.id && <Button variant="outline" size="sm" className="h-6 text-[9px] w-full border-dashed" onClick={addWaypoint}>+ Add Waypoint</Button>}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <Label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 block">Pins ({pins.length})</Label>
            <div className="space-y-1.5">
              {pins.map((pin, i) => (
                <div key={i} className={`bg-gray-50 border rounded-lg p-2 flex flex-col gap-1 ${selectedPinIdx === i ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}>
                  <div className="flex items-center justify-between">
                    <Input value={pin.name} onChange={e => { const n = [...pins]; n[i].name = e.target.value; onPinsChange(n); }} className="h-6 text-xs border-none bg-transparent p-0 font-bold" />
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedPinIdx(i); setMode("edit-pin"); }} className={`p-1 ${selectedPinIdx === i ? 'text-blue-600' : 'text-gray-300'}`}><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => onPinsChange(pins.filter((_, j) => j !== i))} className="p-1 text-red-300"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="flex gap-2 text-[9px] text-gray-400 italic"><span>Y: {pin.coordinates[0]}</span><span>X: {pin.coordinates[1]}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
