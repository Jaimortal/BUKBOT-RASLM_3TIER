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
  ArrowUpDown,
  Trash2,
  PlusCircle,
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Move,
  Check,
  Edit2,
  ImagePlus,
  Upload,
  Eye,
  Loader2,
  X,
  Camera
} from "lucide-react";
import { toast } from "sonner";

function StairIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M4 18h5v-4h5v-4h5V6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 18h16"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminPin {
  name: string;
  /** [y, x] format */
  coordinates: [number, number];
  floor?: string;
  access?: "staircase" | "elevator_staircase" | string;
  pinType?: "normal" | "staircase" | "elevator" | string;
  pinImageUrl?: string;
  pinImageAlt?: string;
}

export interface AdminRoute {
  name: string;
  points: [number, number][];
  color?: string;
  isDefault?: boolean;
  id: string | number;
  route_order?: number;
  route_label?: string;
}

interface AdminMapPinsEditorProps {
  pins: AdminPin[];
  routes?: AdminRoute[];
  onPinsChange: (pins: AdminPin[]) => void;
  onRoutesChange?: (routes: AdminRoute[]) => void;
  mapSize?: number;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const PIN_COLOURS = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#be185d", "#ca8a04", "#4f46e5", "#0f766e"];

// Neon route palette: red, yellow, blue, green, purple, then bright accents.
export const ROUTE_COLORS = ["#ff1744", "#ffea00", "#00b0ff", "#00e676", "#d500f9", "#ff9100", "#00e5ff", "#76ff03"];

const getNextRouteColor = (existingRoutes: AdminRoute[]): string => {
  const colorIndex = existingRoutes.length % ROUTE_COLORS.length;
  return ROUTE_COLORS[colorIndex];
};

const getRouteColor = (route: AdminRoute, index: number): string => {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
};

const withRouteMetadata = (routes: AdminRoute[]): AdminRoute[] => {
  return routes.map((route, index) => ({
    ...route,
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    route_order: index + 1,
    route_label: route.route_label || `Route ${index + 1}`,
  }));
};

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

function drawIndicatorPin(ctx: CanvasRenderingContext2D, sx: number, sy: number, type: string, label?: string) {
  const isElevator = type === "elevator";
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(sx + 1, sy + 13, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isElevator ? "#0f766e" : "#7c3aed";
  ctx.beginPath();
  ctx.arc(sx, sy - 7, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 9, sy - 2); ctx.lineTo(sx, sy + 13); ctx.lineTo(sx + 9, sy - 2);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = "#ffffff";
  if (isElevator) {
    ctx.beginPath();
    ctx.moveTo(sx, sy - 15);
    ctx.lineTo(sx - 4, sy - 11);
    ctx.lineTo(sx - 1.5, sy - 11);
    ctx.lineTo(sx - 1.5, sy - 4);
    ctx.lineTo(sx - 4, sy - 4);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + 4, sy - 4);
    ctx.lineTo(sx + 1.5, sy - 4);
    ctx.lineTo(sx + 1.5, sy - 11);
    ctx.lineTo(sx + 4, sy - 11);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(0, -2.5);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 1);
    ctx.lineTo(sx - 1.8, sy - 1);
    ctx.lineTo(sx - 1.8, sy - 4.3);
    ctx.lineTo(sx + 1.8, sy - 4.3);
    ctx.lineTo(sx + 1.8, sy - 7.6);
    ctx.lineTo(sx + 5, sy - 7.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy + 1);
    ctx.lineTo(sx + 5, sy + 1);
    ctx.stroke();
    ctx.restore();
  }

  if (label) {
    ctx.textAlign = "start";
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
  const [mode, setMode] = useState<"view" | "place-pin" | "place-staircase" | "place-elevator" | "draw-route" | "edit-route" | "edit-pin">("view");
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

  // Pin photo upload & preview states
  const [uploadingPinIdx, setUploadingPinIdx] = useState<number | null>(null);
  const [adminPreviewUrl, setAdminPreviewUrl] = useState<{ url: string; title: string } | null>(null);
  const pinFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, pinIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      toast.error("Image must be under 10MB.");
      return;
    }

    setUploadingPinIdx(pinIdx);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.url) {
        const nextPins = [...pins];
        nextPins[pinIdx] = {
          ...nextPins[pinIdx],
          pinImageUrl: data.url,
        };
        onPinsChange(nextPins);
        toast.success(`Photo attached to ${nextPins[pinIdx].name || "Pin"}!`);
      } else {
        toast.error(data.message || "Failed to upload image.");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload error occurred.");
    } finally {
      setUploadingPinIdx(null);
      if (e.target) e.target.value = "";
    }
  };

  const emitRoutes = (nextRoutes: AdminRoute[]) => {
    onRoutesChange?.(withRouteMetadata(nextRoutes));
  };

  useEffect(() => {
    const img = new Image();
    img.onload = () => { mapImgRef.current = img; setImgLoaded(true); };
    img.src = "/nobackHD.png";
  }, []);

  const toScreen = useCallback((coords: [number, number]) => ({
    sx: tx + (coords[1] / 1000) * mapSize * zoom,
    sy: ty + (coords[0] / 1000) * mapSize * zoom,
  }), [tx, ty, zoom, mapSize]);

  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      setDashOffset(prev => (prev - 0.5) % 20);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

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
      if (!route.points || route.points.length < 2) return;
      const isSelected = selectedRouteId === route.id;

      // Mobile-friendly route styling: thin foreground with a subtle transparent glow.
      const isZoomedOut = zoom < 0.5;
      const lineWidth = (isSelected ? (isZoomedOut ? 1.6 : 2.4) : (isZoomedOut ? 1.4 : 2.2)) * zoom;
      const glowWidth = lineWidth + (6.2 * zoom);
      const dashPattern = isZoomedOut ? [5, 7] : [7, 9];
      const routeColor = getRouteColor(route, routes.indexOf(route));
      const pts = route.points.map(p => toScreen(p));
      const radius = 1 * zoom;

      const drawRoutePath = () => {
        if (pts.length < 2) return;
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          ctx.arcTo(p1.sx, p1.sy, p2.sx, p2.sy, radius);
        }
        ctx.lineTo(pts[pts.length - 1].sx, pts[pts.length - 1].sy);
      };

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = routeColor;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = glowWidth;
      ctx.setLineDash([]);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      drawRoutePath();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = routeColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dashPattern);
      ctx.lineDashOffset = dashOffset * (isZoomedOut ? 2 : 1);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      drawRoutePath();
      ctx.stroke();
      ctx.restore();

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
      const isZoomedOut = zoom < 0.5;
      const previewColor = getNextRouteColor(routes);
      const previewLineWidth = (isZoomedOut ? 1.4 : 2.2) * zoom;
      const previewGlowWidth = previewLineWidth + (6.2 * zoom);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = previewColor;
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([]);
      ctx.lineWidth = previewGlowWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      activeRoutePoints.forEach((p, i) => {
        const { sx, sy } = toScreen(p);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.strokeStyle = previewColor; ctx.setLineDash(isZoomedOut ? [5, 7] : [7, 9]); ctx.lineWidth = previewLineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      activeRoutePoints.forEach((p, i) => {
        const { sx, sy } = toScreen(p);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Draw Pins
    pins.forEach((pin, i) => {
      const { sx, sy } = toScreen(pin.coordinates);
      const isDragging = draggingPinIdx === i;
      const isSelected = selectedPinIdx === i;
      if (pin.pinType === "staircase" || pin.pinType === "elevator") {
        drawIndicatorPin(ctx, sx, sy, pin.pinType, pin.name);
      } else {
        drawPin(ctx, sx, sy, (isDragging || isSelected) ? "#ef4444" : pinColour(i + 1), pin.name);
      }

      if (isDragging || isSelected) {
        ctx.strokeStyle = isSelected ? "#3b82f6" : "#ffffff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy - 7, 12, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }, [pins, routes, zoom, tx, ty, imgLoaded, mapSize, activeRoutePoints, toScreen, selectedRouteId, mode, draggingPointIdx, draggingPinIdx, selectedPinIdx, dashOffset]);

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
      if (rIdx !== -1) { nextRoutes[rIdx].points[draggingPointIdx] = coords; emitRoutes(nextRoutes); }
      return;
    }

    if (isDraggingMap.current) {
      setTx(dragOrigin.current.tx + e.clientX - dragOrigin.current.x);
      setTy(dragOrigin.current.ty + e.clientY - dragOrigin.current.y);
    }
  };

  const handleMouseUp = () => { isDraggingMap.current = false; setDraggingPointIdx(null); setDraggingPinIdx(null); };

  const handleMouseWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent wheel events from bubbling to parent modal
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;
    
    // Calculate map coordinates before zoom
    const mapXBefore = (mouseScreenX - tx) / zoom / mapSize;
    const mapYBefore = (mouseScreenY - ty) / zoom / mapSize;
    
    // Apply zoom (deltaY < 0 means scroll up = zoom in)
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.2, Math.min(8, zoom * zoomFactor));
    
    // Calculate new translation to keep cursor in same position
    const newTx = mouseScreenX - mapXBefore * newZoom * mapSize;
    const newTy = mouseScreenY - mapYBefore * newZoom * mapSize;
    
    setZoom(newZoom);
    setTx(newTx);
    setTy(newTy);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = toMapCoords(e.clientX, e.clientY);
    if (mode === "place-pin") {
      onPinsChange([...pins, { name: pendingPinName || `Pin ${pins.length + 1}`, coordinates: coords }]);
      setPendingPinName(""); setMode("view");
    } else if (mode === "place-staircase") {
      onPinsChange([...pins, { name: "Staircase", coordinates: coords, pinType: "staircase" }]);
      setMode("view");
      toast.success("Staircase indicator placed");
    } else if (mode === "place-elevator") {
      onPinsChange([...pins, { name: "Elevator", coordinates: coords, pinType: "elevator" }]);
      setMode("view");
      toast.success("Elevator indicator placed");
    } else if (mode === "edit-pin" && selectedPinIdx !== null && onPinsChange) {
      const nextPins = [...pins]; nextPins[selectedPinIdx].coordinates = coords; onPinsChange(nextPins);
      toast.success("Pin relocated!");
    } else if (mode === "draw-route") {
      setActiveRoutePoints([...activeRoutePoints, coords]);
    } else if (mode === "view" || mode === "edit-route") {
      const nearRoute = routes.find(r => {
        return r.points.some((p, i) => {
          if (i === 0) return false;
          const p1 = r.points[i - 1]; const p2 = p;
          const dx = p2[1] - p1[1]; const dy = p2[0] - p1[0];
          const l2 = dx * dx + dy * dy; if (l2 === 0) return false;
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
        const last = pts[pts.length - 1]; const prev = pts[pts.length - 2];
        const newPt: [number, number] = [Math.round((last[0] + prev[0]) / 2), Math.round((last[1] + prev[1]) / 2)];
        pts.splice(pts.length - 1, 0, newPt); emitRoutes(nextRoutes);
        toast.success("Waypoint added!");
      }
    }
  };

  const quickConnect = () => {
    const p1 = pins.find(p => p.name === connStart);
    const p2 = pins.find(p => p.name === connEnd);
    if (p1 && p2 && onRoutesChange) {
      const newColor = getNextRouteColor(routes);
      emitRoutes([...routes, { 
        name: `${p1.name} to ${p2.name}`, 
        points: [p1.coordinates, p2.coordinates], 
        color: newColor,
        id: Date.now() 
      }]);
      toast.success("Connected!");
    } else toast.error("Select both pins");
  };

  const setAsMain = (id: string | number) => {
    if (!onRoutesChange) return;
    const nextRoutes = routes.map((r, index) => ({ ...r, isDefault: r.id === id, color: getRouteColor(r, index) }));
    emitRoutes(nextRoutes);
    toast.success("Set as Main Route");
  };

  return (
    <div className="flex gap-4 h-full">
      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0 shadow-lg" style={{ width: mapSize, height: mapSize }}>
        <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-blue-700 shadow-sm ring-1 ring-black/10">
          Hold Shift + Scroll to zoom in & out
        </div>
        <canvas
          ref={canvasRef}
          width={mapSize} height={mapSize}
          className="block touch-none"
          style={{ cursor: mode === "draw-route" || mode === "place-pin" || mode === "place-staircase" || mode === "place-elevator" ? "crosshair" : mode === "edit-route" || mode === "edit-pin" ? "move" : "grab" }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleMouseWheel}
        />

        <div className="absolute left-2 top-2 flex flex-col gap-1.5 HUD">
          <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow" onClick={() => { setZoom(z => Math.min(8, z * 1.2)) }}><ZoomIn className="h-4 w-4" /></Button>
          <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow" onClick={() => { setZoom(z => Math.max(0.2, z / 1.2)) }}><ZoomOut className="h-4 w-4" /></Button>
          <div className="h-px bg-gray-300 mx-1" />
          <button
            type="button"
            title="Place staircase indicator"
            className={`w-8 h-8 rounded-full shadow border text-[10px] font-black ${mode === "place-staircase" ? "bg-purple-600 text-white border-purple-700" : "bg-white/90 text-purple-700 border-purple-200 hover:bg-purple-50"}`}
            onClick={() => setMode(mode === "place-staircase" ? "view" : "place-staircase")}
          >
            <StairIcon className="h-4 w-4 mx-auto" />
          </button>
          <button
            type="button"
            title="Place elevator indicator"
            className={`w-8 h-8 rounded-full shadow border text-[10px] font-black ${mode === "place-elevator" ? "bg-teal-600 text-white border-teal-700" : "bg-white/90 text-teal-700 border-teal-200 hover:bg-teal-50"}`}
            onClick={() => setMode(mode === "place-elevator" ? "view" : "place-elevator")}
          >
            <ArrowUpDown className="h-4 w-4 mx-auto" />
          </button>
          <Button
            size="icon"
            variant={mode === "place-pin" ? "default" : "secondary"}
            className="w-8 h-8 rounded-full shadow"
            title="Place normal pin"
            onClick={() => setMode(mode === "place-pin" ? "view" : "place-pin")}
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button size="icon" variant={mode === "draw-route" ? "default" : "secondary"} className="w-8 h-8 rounded-full shadow" onClick={() => {
            if (mode === "draw-route") { if (activeRoutePoints.length >= 2) { const name = prompt("Name:"); if (name && onRoutesChange) emitRoutes([...routes, { name, points: activeRoutePoints, color: getNextRouteColor(routes), id: Date.now() }]); } setActiveRoutePoints([]); setMode("view"); }
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
                      <span className="h-2.5 w-2.5 rounded-full border border-white shadow" style={{ backgroundColor: getRouteColor(r, i) }} />
                      <span className="truncate">{r.route_label || `Route ${i + 1}`}: {r.name}</span>
                      {r.isDefault && <span className="bg-blue-100 text-blue-700 text-[8px] px-1 rounded">MAIN</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setAsMain(r.id)} className={`p-1 rounded ${r.isDefault ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><Check className="h-3 w-3" /></button>
                      <button onClick={() => { setSelectedRouteId(r.id); setMode("edit-route"); }} className="p-1 text-blue-500"><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => emitRoutes(routes.filter((_, j) => j !== i))} className="p-1 text-red-400"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  {selectedRouteId === r.id && <Button variant="outline" size="sm" className="h-6 text-[9px] w-full border-dashed" onClick={addWaypoint}>+ Add Waypoint</Button>}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <Label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 block">Pins ({pins.length})</Label>
            <div className="space-y-2">
              {pins.map((pin, i) => (
                <div key={i} className={`bg-gray-50 border rounded-lg p-2.5 flex flex-col gap-1.5 ${selectedPinIdx === i ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}>
                  <div className="flex items-center justify-between">
                    <Input value={pin.name} onChange={e => { const n = [...pins]; n[i].name = e.target.value; onPinsChange(n); }} className="h-6 text-xs border-none bg-transparent p-0 font-bold" />
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedPinIdx(i); setMode("edit-pin"); }} className={`p-1 ${selectedPinIdx === i ? 'text-blue-600' : 'text-gray-300'}`}><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => onPinsChange(pins.filter((_, j) => j !== i))} className="p-1 text-red-300"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="flex gap-2 text-[9px] text-gray-400 italic"><span>Y: {pin.coordinates[0]}</span><span>X: {pin.coordinates[1]}</span></div>
                  
                  {pin.pinType !== "staircase" && pin.pinType !== "elevator" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold text-gray-500">Floor:</span>
                      <select 
                        value={pin.floor || ""} 
                        onChange={e => { const n = [...pins]; n[i].floor = (e.target.value as any) || undefined; onPinsChange(n); }}
                        className="h-5 text-xs px-2 py-0.5 border border-gray-300 rounded bg-white"
                      >
                        <option value="">None</option>
                        <option value="GF">Ground Floor (GF)</option>
                        <option value="1F">1st Floor (1F)</option>
                        <option value="2F">2nd Floor (2F)</option>
                        <option value="3F">3rd Floor (3F)</option>
                        <option value="4F">4th Floor (4F)</option>
                        <option value="5F">5th Floor (5F)</option>
                        <option value="BS">Basement (BS)</option>
                      </select>
                      {pin.floor && <span className="ml-auto text-[10px] font-bold text-white bg-yellow-500 px-1.5 py-0.5 rounded">{pin.floor}</span>}
                    </div>
                  )}

                  {(pin.pinType === "staircase" || pin.pinType === "elevator") && (
                    <div className="text-[10px] font-bold text-gray-600">
                      {pin.pinType === "staircase" ? "Staircase indicator pin" : "Elevator indicator pin"}
                    </div>
                  )}

                  {/* Pin Detail Photo Upload & Preview Section */}
                  {pin.pinType !== "staircase" && pin.pinType !== "elevator" && (
                    <div className="mt-1 pt-1.5 border-t border-gray-200/70 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Camera className="h-3 w-3 text-sky-600" /> Pin Detail Photo
                        </span>
                        {pin.pinImageUrl && (
                          <span className="text-[8px] font-semibold bg-sky-100 text-sky-700 px-1 py-0.2 rounded">Attached</span>
                        )}
                      </div>

                      {pin.pinImageUrl ? (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-md border border-slate-200 shadow-xs">
                          <img 
                            src={pin.pinImageUrl} 
                            alt={pin.name} 
                            className="h-10 w-10 rounded object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setAdminPreviewUrl({ url: pin.pinImageUrl!, title: pin.name })}
                          />
                          <div className="flex-1 min-w-0">
                            <Input 
                              placeholder="Photo description/caption..." 
                              value={pin.pinImageAlt || ""} 
                              onChange={e => {
                                const n = [...pins];
                                n[i].pinImageAlt = e.target.value;
                                onPinsChange(n);
                              }} 
                              className="h-5 text-[10px] px-1.5 py-0 border-gray-200 placeholder:text-gray-300"
                            />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setAdminPreviewUrl({ url: pin.pinImageUrl!, title: pin.name })}
                              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                              title="Preview Photo"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const n = [...pins];
                                delete n[i].pinImageUrl;
                                delete n[i].pinImageAlt;
                                onPinsChange(n);
                                toast.success("Pin photo removed.");
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove Photo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={el => { pinFileInputRefs.current[i] = el; }} 
                            onChange={e => handlePinFileUpload(e, i)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingPinIdx === i}
                            onClick={() => pinFileInputRefs.current[i]?.click()}
                            className="h-6 text-[9px] w-full border-dashed border-sky-300 text-sky-700 bg-sky-50/50 hover:bg-sky-100 flex items-center justify-center gap-1"
                          >
                            {uploadingPinIdx === i ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-sky-600" /> Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3" /> Upload Door / Room Photo
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Photo Preview Modal */}
      {adminPreviewUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setAdminPreviewUrl(null)}
        >
          <div 
            className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-xl bg-slate-900 shadow-2xl border border-white/20 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-black/50 border-b border-white/10 text-white">
              <span className="font-bold text-xs">{adminPreviewUrl.title} - Pin Photo Preview</span>
              <button 
                onClick={() => setAdminPreviewUrl(null)} 
                className="p-1 rounded hover:bg-white/20 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60">
              <img src={adminPreviewUrl.url} alt={adminPreviewUrl.title} className="max-h-[70vh] w-auto max-w-full rounded object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
