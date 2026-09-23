/**
 * AdminMapPinsEditor
 * ──────────────────
 * A modern, user-friendly interactive map+pins editor component for admin modals.
 * Supports placing pins, drawing routes with live waypoints, quick connecting,
 * floor assignment, door photo attachments, and interactive waypoint editing.
 *
 * Coordinates use [y, x] format in 0–1000 scale.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  Camera,
  Layers,
  Sparkles,
  MousePointer,
  HelpCircle,
  ChevronRight,
  Search,
  CheckCircle2,
  Compass
} from "lucide-react";
import { toast } from "sonner";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { useMapSettings } from "@/hooks/useMapSettings";

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
  mapImage?: string;
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
  mapImage,
}: AdminMapPinsEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Fetch active map settings from server
  const { data: mapSettings } = useMapSettings();
  const activeMapUrl = mapImage || mapSettings?.maps?.find(m => m.active)?.url || mapSettings?.maps?.[0]?.url || "/nobackHD.png";

  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Sub-panel navigation state
  const [panelTab, setPanelTab] = useState<"pins" | "routes">("pins");
  const [pinSearch, setPinSearch] = useState("");

  // Interaction State
  const [mode, setMode] = useState<"view" | "place-pin" | "place-staircase" | "place-elevator" | "draw-route" | "edit-route" | "edit-pin">("view");
  const [pendingPinName, setPendingPinName] = useState("");
  const [activeRoutePoints, setActiveRoutePoints] = useState<[number, number][]>([]);
  const [newRouteName, setNewRouteName] = useState("");
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
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image");
      }

      const nextPins = [...pins];
      nextPins[pinIdx] = {
        ...nextPins[pinIdx],
        pinImageUrl: data.imageUrl,
        pinImageAlt: nextPins[pinIdx].pinImageAlt || `${nextPins[pinIdx].name} door photo`,
      };
      onPinsChange(nextPins);
      toast.success("Door/room photo attached successfully!");
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploadingPinIdx(null);
      if (e.target) e.target.value = "";
    }
  };

  const emitRoutes = useCallback((nextRoutes: AdminRoute[]) => {
    if (!onRoutesChange) return;
    onRoutesChange(withRouteMetadata(nextRoutes));
  }, [onRoutesChange]);

  // Load map background image dynamically from active map settings or fallback
  useEffect(() => {
    if (!activeMapUrl) return;
    const img = new Image();
    img.onload = () => {
      mapImgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => {
      // If active URL fails, try fallback to /nobackHD.png
      if (activeMapUrl !== "/nobackHD.png") {
        const fb = new Image();
        fb.onload = () => {
          mapImgRef.current = fb;
          setImgLoaded(true);
        };
        fb.src = "/nobackHD.png";
      }
    };
    img.src = activeMapUrl;
  }, [activeMapUrl]);

  const toScreen = useCallback((coords: [number, number]): { sx: number; sy: number } => {
    return {
      sx: (coords[1] / 1000) * mapSize * zoom + tx,
      sy: (coords[0] / 1000) * mapSize * zoom + ty,
    };
  }, [mapSize, zoom, tx, ty]);

  // Animation loop for route dash offset
  const [dashOffset, setDashOffset] = useState(0);
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setDashOffset(prev => (prev + 0.35) % 30);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Main Canvas Render
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, mapSize, mapSize);

    // Draw Map Image
    if (mapImgRef.current && imgLoaded) {
      ctx.save();
      ctx.drawImage(mapImgRef.current, tx, ty, mapSize * zoom, mapSize * zoom);
      ctx.restore();
    } else {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, mapSize, mapSize);
    }

    // Draw Routes
    routes.forEach((route, index) => {
      if (route.points.length < 2) return;
      const routeColor = getRouteColor(route, index);
      const isSelected = selectedRouteId === route.id;
      const isZoomedOut = zoom < 0.5;
      const lineWidth = (isZoomedOut ? 1.6 : 2.5) * zoom;
      const glowWidth = lineWidth + (isZoomedOut ? 3.5 : 5.5 * zoom);
      const dashPattern = isZoomedOut ? [4, 6] : [6, 8];

      const drawRoutePath = () => {
        route.points.forEach((p, i) => {
          const { sx, sy } = toScreen(p);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
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
          ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2;
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
        ctx.strokeStyle = isSelected ? "#0284c7" : "#ffffff"; ctx.lineWidth = 2;
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
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    const mapXBefore = (mouseScreenX - tx) / zoom / mapSize;
    const mapYBefore = (mouseScreenY - ty) / zoom / mapSize;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.2, Math.min(8, zoom * zoomFactor));

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
      toast.success("Pin placed on map!");
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
      if (nearRoute) { setSelectedRouteId(nearRoute.id); setMode("edit-route"); setPanelTab("routes"); }
      else { setSelectedRouteId(null); setMode("view"); }
    }
  };

  const handleSaveDrawnRoute = () => {
    if (activeRoutePoints.length < 2 || !onRoutesChange) {
      toast.error("Please place at least 2 points on the map");
      return;
    }
    const finalName = newRouteName.trim() || `Route ${routes.length + 1}`;
    emitRoutes([...routes, {
      name: finalName,
      points: activeRoutePoints,
      color: getNextRouteColor(routes),
      id: Date.now()
    }]);
    setActiveRoutePoints([]);
    setNewRouteName("");
    setMode("view");
    setPanelTab("routes");
    toast.success(`Route "${finalName}" created!`);
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
      setConnStart("");
      setConnEnd("");
      toast.success("Direct route path connected!");
    } else {
      toast.error("Select both start and end pins to connect");
    }
  };

  const setAsMain = (id: string | number) => {
    if (!onRoutesChange) return;
    const nextRoutes = routes.map((r, index) => ({ ...r, isDefault: r.id === id, color: getRouteColor(r, index) }));
    emitRoutes(nextRoutes);
    toast.success("Set as primary default route");
  };

  const filteredPins = useMemo(() => {
    if (!pinSearch.trim()) return pins;
    return pins.filter(p => p.name.toLowerCase().includes(pinSearch.toLowerCase()) || p.floor?.toLowerCase().includes(pinSearch.toLowerCase()));
  }, [pins, pinSearch]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ── Left Map Canvas Container ── */}
      <div 
        className="relative rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-950/5 shrink-0 shadow-md group select-none" 
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Helper bottom overlay */}
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-20 rounded-md bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/10">
          Scroll to zoom · Drag map to pan
        </div>

        {/* Floating Glassmorphic HUD Toolbar */}
        <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200">
          <AdminTooltip title="Pan & Select Mode" description="Click pins or routes to select, or drag canvas to navigate" side="bottom">
            <button
              type="button"
              onClick={() => setMode("view")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                mode === "view" ? "bg-[#001C38] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Move className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <AdminTooltip title="Drop Room Pin" description="Click to drop a room or location pin on the map" side="bottom">
            <button
              type="button"
              onClick={() => setMode(mode === "place-pin" ? "view" : "place-pin")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                mode === "place-pin" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MapPin className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <AdminTooltip title="Drop Staircase Node" description="Click to mark a staircase indicator node on the map" side="bottom">
            <button
              type="button"
              onClick={() => setMode(mode === "place-staircase" ? "view" : "place-staircase")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                mode === "place-staircase" ? "bg-purple-600 text-white shadow-xs" : "text-purple-700 hover:bg-purple-50"
              }`}
            >
              <StairIcon className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <AdminTooltip title="Drop Elevator Node" description="Click to mark an elevator indicator node on the map" side="bottom">
            <button
              type="button"
              onClick={() => setMode(mode === "place-elevator" ? "view" : "place-elevator")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                mode === "place-elevator" ? "bg-teal-600 text-white shadow-xs" : "text-teal-700 hover:bg-teal-50"
              }`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <AdminTooltip title="Draw Route" description="Click points on map to draw a walkable path" side="bottom">
            <button
              type="button"
              onClick={() => {
                if (mode === "draw-route") {
                  setActiveRoutePoints([]);
                  setMode("view");
                } else {
                  setMode("draw-route");
                }
              }}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                mode === "draw-route" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Navigation className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <AdminTooltip title="Zoom In" description="Zoom closer into map" side="bottom">
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(8, z * 1.25))}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <AdminTooltip title="Zoom Out" description="Zoom out of map" side="bottom">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.2, z / 1.25))}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </AdminTooltip>

          <AdminTooltip title="Reset Map" description="Reset zoom and center position" side="bottom">
            <button
              type="button"
              onClick={() => { setZoom(1); setTx(0); setTy(0); }}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </AdminTooltip>
        </div>

        {/* Dynamic Contextual Action Banners */}
        {mode === "draw-route" && (
          <div className="absolute top-14 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2 bg-[#001C38]/95 text-white text-xs p-2 rounded-xl shadow-xl border border-blue-400/40 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-semibold truncate">
                Drawing Route: {activeRoutePoints.length} pt{activeRoutePoints.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Input
                value={newRouteName}
                onChange={e => setNewRouteName(e.target.value)}
                placeholder={`Route ${routes.length + 1}`}
                className="h-6 w-24 sm:w-32 text-[11px] bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
              <Button
                size="sm"
                disabled={activeRoutePoints.length < 2}
                onClick={handleSaveDrawnRoute}
                className="h-6 px-2 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <button
                type="button"
                onClick={() => { setActiveRoutePoints([]); setNewRouteName(""); setMode("view"); }}
                className="p-1 text-slate-300 hover:text-white rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {mode === "place-pin" && (
          <div className="absolute top-14 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2 bg-blue-900/95 text-white text-xs p-2 rounded-xl shadow-xl border border-blue-400/40 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-amber-300" />
              <span className="font-semibold text-[11px]">Click anywhere on map to drop pin</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setMode("view")} className="h-6 px-2 text-[11px] text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
        )}

        {mode === "place-staircase" && (
          <div className="absolute top-14 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2 bg-purple-900/95 text-white text-xs p-2 rounded-xl shadow-xl border border-purple-400/40 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <StairIcon className="h-3.5 w-3.5 text-purple-300" />
              <span className="font-semibold text-[11px]">Click map to place staircase node</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setMode("view")} className="h-6 px-2 text-[11px] text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
        )}

        {mode === "place-elevator" && (
          <div className="absolute top-14 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2 bg-teal-900/95 text-white text-xs p-2 rounded-xl shadow-xl border border-teal-400/40 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-teal-300" />
              <span className="font-semibold text-[11px]">Click map to place elevator node</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setMode("view")} className="h-6 px-2 text-[11px] text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
        )}

        {(mode === "edit-route" || mode === "edit-pin") && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#001C38] text-white text-[11px] px-3.5 py-1.5 rounded-full shadow-2xl font-bold border border-blue-400/40">
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{mode === "edit-route" ? "Drag waypoints to adjust route" : `Repositioning: ${pins[selectedPinIdx!]?.name}`}</span>
            <button 
              onClick={() => { setMode("view"); setSelectedPinIdx(null); setSelectedRouteId(null); }} 
              className="ml-1 bg-white/20 hover:bg-white/30 p-1 rounded-full text-white"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Map Canvas */}
        <canvas
          ref={canvasRef}
          width={mapSize}
          height={mapSize}
          className="block touch-none"
          style={{ 
            cursor: mode === "draw-route" || mode === "place-pin" || mode === "place-staircase" || mode === "place-elevator" 
              ? "crosshair" 
              : mode === "edit-route" || mode === "edit-pin" 
              ? "move" 
              : "grab" 
          }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleMouseWheel}
        />
      </div>

      {/* ── Right Workspace Panel ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden pr-0.5">
        {/* Workspace Segmented Sub-Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPanelTab("pins")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              panelTab === "pins"
                ? "bg-[#001C38] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <MapPin className={`h-3.5 w-3.5 ${panelTab === "pins" ? "text-amber-400" : "text-slate-500"}`} />
            <span>Pins & Markers ({pins.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPanelTab("routes")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              panelTab === "routes"
                ? "bg-[#001C38] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Navigation className={`h-3.5 w-3.5 ${panelTab === "routes" ? "text-amber-400" : "text-slate-500"}`} />
            <span>Routes & Paths ({routes.length})</span>
          </button>
        </div>

        {/* Tab 1: Pins & Markers */}
        {panelTab === "pins" && (
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={pinSearch}
                  onChange={e => setPinSearch(e.target.value)}
                  placeholder="Filter pins by name or floor..."
                  className="h-8 pl-8 text-xs bg-white border-slate-200"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setMode("place-pin")}
                className="h-8 text-xs bg-[#001C38] hover:bg-[#032f5d] text-white font-medium shrink-0"
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5 text-amber-400" />
                Add Pin
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: "thin" }}>
              {filteredPins.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed rounded-xl bg-slate-50/50">
                  <MapPin className="h-6 w-6 mx-auto mb-1.5 text-slate-400" />
                  {pinSearch ? "No pins match your search filter." : "No pins added yet. Click 'Add Pin' above to drop one on the map."}
                </div>
              ) : (
                filteredPins.map((pin, i) => {
                  const actualIdx = pins.findIndex(p => p === pin);
                  const isSelected = selectedPinIdx === actualIdx;
                  return (
                    <div
                      key={actualIdx}
                      className={`bg-white border rounded-xl p-3 flex flex-col gap-2 transition-all shadow-xs ${
                        isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span 
                            className="h-3 w-3 rounded-full shrink-0 shadow-xs border border-white"
                            style={{ backgroundColor: pinColour(actualIdx + 1) }}
                          />
                          <Input
                            value={pin.name}
                            onChange={e => {
                              const n = [...pins];
                              n[actualIdx].name = e.target.value;
                              onPinsChange(n);
                            }}
                            className="h-7 text-xs font-bold border-transparent hover:border-slate-200 focus:border-blue-500 bg-transparent px-1.5"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <AdminTooltip title="Reposition on Map" description="Drag this pin on the canvas to update its position" side="top">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPinIdx(actualIdx);
                                setMode("edit-pin");
                              }}
                              className={`p-1.5 rounded-md text-xs transition-colors ${
                                isSelected ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                              }`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </AdminTooltip>

                          <AdminTooltip title="Delete Pin" description="Remove this pin from the map" side="top">
                            <button
                              type="button"
                              onClick={() => {
                                onPinsChange(pins.filter((_, j) => j !== actualIdx));
                                if (selectedPinIdx === actualIdx) setSelectedPinIdx(null);
                                toast.success("Pin removed.");
                              }}
                              className="p-1.5 rounded-md text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AdminTooltip>
                        </div>
                      </div>

                      {/* Floor & Coordinates row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">Floor:</span>
                          <select
                            value={pin.floor || ""}
                            onChange={e => {
                              const n = [...pins];
                              n[actualIdx].floor = (e.target.value as any) || undefined;
                              onPinsChange(n);
                            }}
                            className="h-5 text-[11px] px-1.5 py-0 border border-slate-200 rounded-md bg-white text-slate-700 font-medium"
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
                          {pin.floor && (
                            <span className="rounded bg-amber-100 text-amber-800 px-1 py-0.2 text-[9px] font-bold">
                              {pin.floor}
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-slate-400">
                          [{pin.coordinates[0]}, {pin.coordinates[1]}]
                        </span>
                      </div>

                      {/* Pin Door Photo Upload & Lightbox Preview */}
                      {pin.pinType !== "staircase" && pin.pinType !== "elevator" && (
                        <div className="mt-1 pt-1.5 border-t border-slate-100 flex flex-col gap-1.5">
                          {pin.pinImageUrl ? (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <img
                                src={pin.pinImageUrl}
                                alt={pin.name}
                                className="h-10 w-10 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-85 transition-opacity"
                                onClick={() => setAdminPreviewUrl({ url: pin.pinImageUrl!, title: pin.name })}
                              />
                              <div className="flex-1 min-w-0">
                                <Input
                                  placeholder="Door photo caption / description..."
                                  value={pin.pinImageAlt || ""}
                                  onChange={e => {
                                    const n = [...pins];
                                    n[actualIdx].pinImageAlt = e.target.value;
                                    onPinsChange(n);
                                  }}
                                  className="h-6 text-[10px] px-1.5 py-0 border-slate-200 bg-white"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAdminPreviewUrl({ url: pin.pinImageUrl!, title: pin.name })}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="View photo"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const n = [...pins];
                                    delete n[actualIdx].pinImageUrl;
                                    delete n[actualIdx].pinImageAlt;
                                    onPinsChange(n);
                                    toast.success("Photo removed");
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Remove photo"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={el => { pinFileInputRefs.current[actualIdx] = el; }}
                                onChange={e => handlePinFileUpload(e, actualIdx)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingPinIdx === actualIdx}
                                onClick={() => pinFileInputRefs.current[actualIdx]?.click()}
                                className="h-6 text-[10px] w-full border-dashed border-sky-300 text-sky-700 bg-sky-50/50 hover:bg-sky-100 flex items-center justify-center gap-1.5"
                              >
                                {uploadingPinIdx === actualIdx ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-sky-600" /> Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="h-3 w-3 text-sky-600" /> Attach Door / Room Photo
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Routes & Paths */}
        {panelTab === "routes" && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* BukSU Styled Quick Route Connector */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#001C38] uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-blue-600" /> Quick Route Connector
                </span>
                <span className="text-[10px] text-slate-400">Direct pin-to-pin</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[9.5px] text-slate-500 font-semibold mb-0.5 block">Start Pin</Label>
                  <select
                    className="w-full text-xs border border-slate-200 p-1.5 rounded-lg bg-white font-medium"
                    value={connStart}
                    onChange={e => setConnStart(e.target.value)}
                  >
                    <option value="">Select start pin...</option>
                    {pins.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[9.5px] text-slate-500 font-semibold mb-0.5 block">End Pin</Label>
                  <select
                    className="w-full text-xs border border-slate-200 p-1.5 rounded-lg bg-white font-medium"
                    value={connEnd}
                    onChange={e => setConnEnd(e.target.value)}
                  >
                    <option value="">Select destination...</option>
                    {pins.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full text-xs h-7.5 bg-[#001C38] hover:bg-[#032f5d] text-white font-semibold shadow-xs"
                onClick={quickConnect}
              >
                <Navigation className="h-3.5 w-3.5 mr-1.5 text-amber-400" /> Connect Direct Path
              </Button>
            </div>

            {/* Routes List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: "thin" }}>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Configured Routes ({routes.length})
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("draw-route")}
                  className="h-6 text-[10.5px] border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
                >
                  <PlusCircle className="h-3 w-3 mr-1" /> Draw Route
                </Button>
              </div>

              {routes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed rounded-xl bg-slate-50/50">
                  <Navigation className="h-6 w-6 mx-auto mb-1.5 text-slate-400" />
                  No routes configured. Connect pins above or click 'Draw Route' to trace paths on the canvas.
                </div>
              ) : (
                routes.map((r, i) => {
                  const isSelected = selectedRouteId === r.id;
                  return (
                    <div
                      key={r.id}
                      className={`bg-white border rounded-xl p-2.5 flex flex-col gap-2 transition-all shadow-xs ${
                        isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="h-3 w-3 rounded-full shrink-0 shadow-xs border border-white"
                            style={{ backgroundColor: getRouteColor(r, i) }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {r.route_label || `Route ${i + 1}`}: {r.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {r.points.length} waypoints
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {r.isDefault ? (
                            <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                              DEFAULT
                            </span>
                          ) : (
                            <AdminTooltip title="Set as Default Route" description="Make this route the primary path shown to students" side="top">
                              <button
                                type="button"
                                onClick={() => setAsMain(r.id)}
                                className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </AdminTooltip>
                          )}

                          <AdminTooltip title="Edit Waypoints on Map" description="Reposition points by dragging on the canvas" side="top">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRouteId(r.id);
                                setMode("edit-route");
                              }}
                              className={`p-1 rounded ${isSelected ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600"}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </AdminTooltip>

                          <AdminTooltip title="Delete Route" description="Remove this route from the map" side="top">
                            <button
                              type="button"
                              onClick={() => {
                                emitRoutes(routes.filter((_, j) => j !== i));
                                if (selectedRouteId === r.id) setSelectedRouteId(null);
                                toast.success("Route removed.");
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AdminTooltip>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] flex-1 border-dashed border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
                            onClick={addWaypoint}
                          >
                            + Add Waypoint In-Between
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] bg-slate-800 text-white hover:bg-slate-900"
                            onClick={() => {
                              setSelectedRouteId(null);
                              setMode("view");
                            }}
                          >
                            Done
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Photo Preview Modal */}
      {adminPreviewUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setAdminPreviewUrl(null)}
        >
          <div 
            className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-white/20 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-white/10 text-white">
              <span className="font-bold text-xs">{adminPreviewUrl.title} - Door Photo Preview</span>
              <button 
                onClick={() => setAdminPreviewUrl(null)} 
                className="p-1 rounded hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-black/60">
              <img src={adminPreviewUrl.url} alt={adminPreviewUrl.title} className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
