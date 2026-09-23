import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, ImageOverlay, Marker, Popup, useMap, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpDown, Maximize2, Minimize2, X, MapPin } from "lucide-react";
import { useMapSettings } from "@/hooks/useMapSettings";

// Fix for default marker icon in React Leaflet
// @ts-ignore
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
// @ts-ignore
import markerIcon from "leaflet/dist/images/marker-icon.png";
// @ts-ignore
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type CoordArray = [number, number];
type CoordObject = { lat: number; lng: number } | { latitude?: number; longitude?: number } | { x?: number; y?: number };
type RoutePayload = { name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string };

interface MapMessageProps {
  locationName: string;
  coordinates: CoordArray | CoordObject | null | undefined;
  pins?: Array<{
    name: string;
    coordinates: CoordArray | CoordObject;
    floor?: string;
    access?: string;
    pinType?: string;
    pinImageUrl?: string;
    pinImageAlt?: string;
  }>;
  imageBounds?: L.LatLngBoundsExpression;
  maxClamp?: number;
  // fullscreen props
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  routes?: RoutePayload[];
  onOpenLightbox?: (data: { url: string; title: string; alt?: string }) => void;
  primaryColor?: string;
}

const DefaultBounds: L.LatLngBoundsExpression = [
  [0, 0],
  [1000, 1000],
];

type IndicatorKind = "staircase" | "elevator";

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

function normalizeIndicatorKind(pin: { name?: string; access?: string; pinType?: string }): IndicatorKind | null {
  const pinType = String(pin.pinType || "").trim().toLowerCase();
  if (pinType === "staircase") return "staircase";
  if (pinType === "elevator") return "elevator";

  const access = String(pin.access || "").trim().toLowerCase();
  if (access === "staircase" || access === "staircase_indicator") return "staircase";
  if (access === "elevator" || access === "elevator_staircase" || access === "elevator_with_staircase") return "elevator";

  const name = String(pin.name || "").trim().toLowerCase();
  if (!name) return null;
  if (name.includes("elevator")) return "elevator";
  if (name.includes("staircase indecator pin") || name.includes("staircase indicator pin") || name.includes("staircase")) {
    return "staircase";
  }
  return null;
}

// controller to recenter when coords change
const MapController = ({ coords }: { coords: CoordArray }) => {
  const map = useMap();
  useEffect(() => {
    if (!coords || coords.length !== 2) return;
    try {
      map.flyTo(coords, map.getZoom(), { duration: 1.2 });
    } catch (err) {
      map.setView(coords, map.getZoom());
    }
  }, [coords, map]);
  return null;
};

// Hook to track zoom level for dynamic styling
function useMapZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoom', handleZoom);
    return () => { map.off('zoom', handleZoom); };
  }, [map]);
  return zoom;
}

// Component that renders route with zoom-based styling
const ROUTE_COLORS = ["#ff1744", "#ffea00", "#00b0ff", "#00e676", "#d500f9", "#ff9100", "#00e5ff", "#76ff03"];

function RouteWithZoom({ route, index }: { route: { points: CoordArray[]; color?: string; name?: string; route_label?: string; route_order?: number }; index: number }) {
  const zoom = useMapZoom();
  const isZoomedOut = zoom < 0;
  const routeColor = route.color || ROUTE_COLORS[index % ROUTE_COLORS.length];

  // Mobile-friendly route style: a paper-thin route over a subtle same-color glow.
  const weight = isZoomedOut ? 1.4 : 2.2;
  const glowWeight = weight + 6.2;
  const dashArray = isZoomedOut ? "5, 7" : "7, 9";
  const animationDuration = isZoomedOut ? "0.5s" : "1s";

  return (
    <>
      <Polyline
        positions={route.points}
        pathOptions={{
          color: routeColor,
          weight: glowWeight,
          opacity: 0.70,
          lineJoin: "round",
          lineCap: "round",
        }}
        interactive={false}
      />
      <Polyline
        positions={route.points}
        pathOptions={{
          color: routeColor,
          weight,
          opacity: 0.98,
          dashArray,
          lineJoin: "round",
          lineCap: "round",
        }}
        eventHandlers={{
          add: (e) => {
            const path = e.target.getElement();
            if (path) {
              path.classList.add('animated-route');
              path.style.strokeDasharray = dashArray;
              path.style.animation = `marchingAnts ${animationDuration} linear infinite`;
            }
          }
        }}
      />
    </>
  );
}

// Component that animates a pulsing dot traveling along the route
function AnimatedRouteDot({ route, speed = 3000 }: { route: { points: CoordArray[]; color?: string }; speed?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (route.points.length < 2) return;

    const totalSegments = route.points.length - 1;
    const segmentDuration = speed / totalSegments;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 0.005; // Slower: 0.5% progress per tick
        if (newProgress >= 1) {
          // Move to next segment or loop back to start
          setCurrentIndex(idx => {
            if (idx >= totalSegments - 1) {
              return 0; // Loop back to start
            }
            return idx + 1;
          });
          return 0;
        }
        return newProgress;
      });
    }, segmentDuration / 50);

    return () => clearInterval(interval);
  }, [route.points, speed]);

  // Calculate current position based on segment index and progress
  const position = useMemo(() => {
    if (route.points.length < 2) return route.points[0] || [0, 0];

    const start = route.points[currentIndex];
    const end = route.points[currentIndex + 1] || route.points[0];

    // Safety check to prevent undefined errors
    if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
      return route.points[0] || [0, 0];
    }

    const lat = start[0] + (end[0] - start[0]) * progress;
    const lng = start[1] + (end[1] - start[1]) * progress;

    return [lat, lng] as CoordArray;
  }, [route.points, currentIndex, progress]);

  return (
    <CircleMarker
      center={position}
      radius={4.5}
      pathOptions={{
        color: "#ffffff",
        weight: 1.5,
        fillColor: route.color || "#dc2626",
        fillOpacity: 1,
        opacity: 1,
      }}
      interactive={false}
    />
  );
}

function normalizeToTuple(raw: any, maxClamp = 3000): CoordArray | null {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length >= 2) {
    const a = Number(raw[0]);
    const b = Number(raw[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return [clamp(a, 0, maxClamp), clamp(b, 0, maxClamp)];
    }
  }
  if (typeof raw === "object") {
    const lat = Number((raw.lat ?? raw.latitude ?? raw.y) as any);
    const lng = Number((raw.lng ?? raw.longitude ?? raw.x) as any);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [clamp(lat, 0, maxClamp), clamp(lng, 0, maxClamp)];
    }
  }
  if (typeof raw === "string" && raw.includes(",")) {
    const parts = raw.split(",").map((s) => Number(s.trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      return [clamp(parts[0], 0, maxClamp), clamp(parts[1], 0, maxClamp)];
    }
  }
  return null;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function MapMessage({
  locationName,
  coordinates,
  pins,
  imageBounds = DefaultBounds,
  maxClamp = 3000,
  isFullscreen = false,
  onToggleFullscreen,
  routes,
  onOpenLightbox,
  primaryColor = "#001C38",
}: MapMessageProps) {
  // Extract dynamic image height from bounds (Default: 1000)
  const imageHeight = useMemo(() => {
    try {
      const b = imageBounds as any;
      if (Array.isArray(b) && b.length >= 2) {
        // [ [y0, x0], [y1, x1] ]
        const y0 = Number(b[0][0]);
        const y1 = Number(b[1][0]);
        return Math.max(y0, y1) || 1000;
      }
    } catch (e) {
      console.error("[MapMessage] Error parsing imageBounds for height:", e);
    }
    return 1000;
  }, [imageBounds]);

  const [activeLightbox, setActiveLightbox] = useState<{ url: string; title: string; alt?: string } | null>(null);

  const normalizedPins = useMemo(() => {
    if (Array.isArray(pins) && pins.length > 0) {
      const result = pins
        .map((p) => {
          const tuple = normalizeToTuple((p as any)?.coordinates, maxClamp);
          const name = String((p as any)?.name || "").trim() || "Pin";
          const floor = (p as any)?.floor;
          const pinType = normalizeIndicatorKind({ name, access: (p as any)?.access, pinType: (p as any)?.pinType });
          const pinImageUrl = (p as any)?.pinImageUrl || (p as any)?.altImageUrl;
          const pinImageAlt = (p as any)?.pinImageAlt;
          return tuple ? { name, coordinates: tuple as CoordArray, floor, pinType, pinImageUrl, pinImageAlt } : null;
        })
        .filter(Boolean) as Array<{
          name: string;
          coordinates: CoordArray;
          floor?: string;
          pinType?: IndicatorKind | null;
          pinImageUrl?: string;
          pinImageAlt?: string;
        }>;
      return result;
    }
    const tuple = normalizeToTuple(coordinates, maxClamp);
    return tuple ? [{ name: locationName, coordinates: tuple }] : [];
  }, [pins, coordinates, maxClamp, locationName]);

  const flippedMarkers = useMemo(() => {
    const markers = normalizedPins.map((p) => ({
      name: p.name,
      coordinates: [imageHeight - p.coordinates[0], p.coordinates[1]] as CoordArray,
      floor: p.floor,
      pinType: p.pinType,
      pinImageUrl: p.pinImageUrl,
      pinImageAlt: p.pinImageAlt,
    })).filter((p) => Array.isArray(p.coordinates) && p.coordinates.length === 2);

    return markers;
  }, [normalizedPins, imageHeight]);

  const normalizedRoutes = useMemo(() => {
    if (!Array.isArray(routes)) return [];

    const offsetX = 4; // Small shift to the right
    const processed = routes.map((r, index) => {
      const validPoints = (r.points || [])
        .map(p => normalizeToTuple(p, maxClamp))
        .filter((p): p is CoordArray => !!p && p.length === 2)
        // Flip vertically and shift right slightly
        .map(p => [imageHeight - p[0], p[1] + offsetX] as CoordArray);

      return {
        ...r,
        points: validPoints,
        color: ROUTE_COLORS[index % ROUTE_COLORS.length],
        route_order: r.route_order || index + 1,
        route_label: r.route_label || `Route ${index + 1}`,
      };
    }).filter(r => r.points.length >= 2);

    return processed;
  }, [routes, imageHeight, maxClamp]);

  // Fallback center if coords invalid — choose center of image bounds
  const fallbackCenter: CoordArray = useMemo(() => {
    try {
      const b = imageBounds as any;
      if (Array.isArray(b) && b.length >= 2) {
        const y0 = Number(b[0][0]);
        const x0 = Number(b[0][1]);
        const y1 = Number(b[1][0]);
        const x1 = Number(b[1][1]);
        return [(y0 + y1) / 2, (x0 + x1) / 2];
      }
    } catch (err) { }
    return [imageHeight / 2, 500];
  }, [imageBounds, imageHeight]);

  const center = flippedMarkers[0]?.coordinates ?? fallbackCenter;

  const labeledIcon = (label: string, pinType?: IndicatorKind | null) => {
    const isStaircase = pinType === "staircase";
    const isElevator = pinType === "elevator";
    const markerColor = isStaircase ? "#7c3aed" : isElevator ? "#0f766e" : "#2563eb";
    const indicatorIconHtml = isStaircase
      ? `
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style="display:block;">
          <path d="M5 18h4v-4h4v-4h4V6h2v6h-4v4h-4v4H5z" fill="#ffffff"/>
          <path d="M5 18h14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `
      : isElevator
        ? `
          <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" style="display:block;">
            <path d="M12 3 7.4 7.6h3.1v8.8H7.4L12 21l4.6-4.6h-3.1V7.6h3.1L12 3Z" fill="#ffffff"/>
          </svg>
        `
      : "";
    const iconOffset = isStaircase ? "translateX(-1.5px) translateY(-3.5px) rotate(45deg)" : "rotate(45deg)";
    const textHtml = indicatorIconHtml
      ? `<span style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;transform:${iconOffset};">${indicatorIconHtml}</span>`
      : "";
    const labelHtml = pinType
      ? ""
      : `
          <div style="
            position:absolute;
            top:-18px;
            left:50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.75);
            color: #fff;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            line-height: 1;
            white-space: nowrap;
          ">${escapeHtml(label)}</div>
        `;
    return (
    L.divIcon({
      className: "",
      html: `
        <div style="position:relative; transform: translate(-50%, -100%);">
          ${labelHtml}
          <div style="
            width: 16px;
            height: 16px;
            background: ${markerColor};
            border: 2px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          ">${textHtml}</div>
        </div>
      `,
      iconSize: [1, 1],
      iconAnchor: [0, 0],
    })
    );
  };

  const [activeMapUrl, setActiveMapUrl] = useState<string>('/nobackHD.png');
  const { data: mapSettings } = useMapSettings();

  const mapInstanceKey = useMemo(() => {
    const routeKey = normalizedRoutes
      .map((route) => `${route.route_label || route.name || "route"}:${route.points.length}`)
      .join("|");
    const markerKey = flippedMarkers
      .map((marker) => `${marker.name}:${marker.coordinates[0]},${marker.coordinates[1]}`)
      .join("|");
    return `${activeMapUrl}|${locationName}|${isFullscreen ? "full" : "inline"}|${markerKey}|${routeKey}`;
  }, [activeMapUrl, locationName, isFullscreen, flippedMarkers, normalizedRoutes]);

  useEffect(() => {
    if (mapSettings?.maps && mapSettings.maps.length > 0) {
      const active = mapSettings.maps.find((m: { active?: boolean }) => m.active) || mapSettings.maps[0];
      if (active?.url) {
        setActiveMapUrl(active.url);
      }
    }
  }, [mapSettings]);

  const handleWheel = (e: React.WheelEvent) => {
    // Prevent wheel events from propagating to parent modal/scrollable containers
    // This allows map zooming without scrolling the entire modal
    e.stopPropagation();
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl relative z-2 ${isFullscreen ? 'w-full h-full' : 'w-full h-48'}`}
      onWheel={handleWheel}
    >
      {/* Map guidance indicators - shown only inside this map */}
      {(() => {
        const markerWithFloor = flippedMarkers?.find(m => m.floor);
        const indicatorKinds = Array.from(
          new Set(flippedMarkers.map(m => m.pinType).filter(Boolean))
        ) as IndicatorKind[];
        if (!markerWithFloor && indicatorKinds.length === 0) return null;
        const floorLabel = markerWithFloor?.floor === 'GF' ? 'Ground Floor' :
          markerWithFloor?.floor === '2F' ? '2nd Floor' :
            markerWithFloor?.floor === '3F' ? '3rd Floor' :
              markerWithFloor?.floor === '4F' ? '4th Floor' :
                markerWithFloor?.floor === '5F' ? '5th Floor' :
                  markerWithFloor?.floor === '1F' ? '1st Floor' :
                    markerWithFloor?.floor === 'BS' ? 'Basement' : '';

        return (
          <div className={`absolute z-[1000] flex flex-col items-start gap-1 transition-all ${
            isFullscreen
              ? "top-2 left-12 text-[10px] sm:text-sm"
              : "bottom-2 left-2 text-[9px] sm:text-[10px]"
          }`}>
            {markerWithFloor && (
              <div className={`bg-yellow-400/70 backdrop-blur-md text-gray-900 border border-yellow-500/80 rounded shadow-md flex items-center gap-1.5 sm:gap-2 ${
                isFullscreen ? "px-2 py-1 sm:px-3 sm:py-1.5" : "px-2 py-0.5 sm:px-2.5 sm:py-1"
              }`}>
                <span className="font-black">[{markerWithFloor.floor}]</span>
                <span className="font-semibold">{floorLabel}</span>
              </div>
            )}
            {indicatorKinds.map(kind => (
              <div
                key={kind}
                className={`bg-white/80 backdrop-blur-md text-gray-900 border border-gray-200/80 rounded shadow-md flex items-center gap-1.5 font-semibold ${
                  isFullscreen ? "px-2 py-1 sm:px-3 sm:py-1.5" : "px-2 py-0.5 sm:py-1"
                }`}
              >
                {kind === "staircase" ? (
                  <>
                    <StairIcon className={isFullscreen ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-3 w-3"} />
                    <span>Staircase</span>
                  </>
                ) : (
                  <>
                    <ArrowUpDown className={isFullscreen ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-3 w-3"} />
                    <span>Elevator</span>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })()}
      {!isFullscreen && onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-2 right-2 z-[1000] bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-md shadow-md transition-all duration-200 backdrop-blur-sm"
          title="Enter Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
      {isFullscreen && normalizedRoutes.length > 0 && (
        <div className="absolute top-2 right-2 z-[1000] max-w-[150px] rounded-lg border border-white/50 bg-white/85 p-1.5 text-[10px] text-slate-800 shadow-md backdrop-blur sm:max-w-[180px] sm:p-2 sm:text-xs">
          <div className="mb-1 font-bold">Routes</div>
          <div className="space-y-1">
            {normalizedRoutes.map((route, index) => (
              <div key={`legend-${index}`} className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-1.5 w-4 rounded-full shadow-sm sm:h-2 sm:w-6" style={{ backgroundColor: route.color || ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
                <span className="truncate">{route.route_label || `Route ${index + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`
        @keyframes marchingAnts {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 20; }
        }
        .animated-route {
          animation: marchingAnts 1s linear infinite;
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        .traveling-dot {
          pointer-events: none;
        }
        .leaflet-container {
          background: #ffffff !important;
        }
      `}</style>
      <MapContainer
        key={mapInstanceKey}
        crs={L.CRS.Simple}
        bounds={imageBounds}
        center={center}
        zoom={-1}
        minZoom={-2}
        maxZoom={4}
        scrollWheelZoom={true}
        className="w-full h-full bg-white"
        attributionControl={false}
      >
        <ImageOverlay url={activeMapUrl} bounds={imageBounds} />

        {normalizedRoutes.map((route, idx) => (
          <RouteWithZoom key={`route-${idx}`} route={route} index={idx} />
        ))}
        {normalizedRoutes.map((route, idx) => (
          <AnimatedRouteDot key={`dot-${idx}`} route={route} speed={3000} />
        ))}

        {flippedMarkers.map((p, idx) => (
          <Marker key={`pin-${idx}`} position={p.coordinates} icon={labeledIcon(p.name, p.pinType)}>
            <Popup className="custom-pin-popup" minWidth={180} maxWidth={260}>
              <div className="flex flex-col gap-1.5 p-1 text-slate-800">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                  <span className="font-bold text-xs text-[#003B63] truncate">{p.name}</span>
                  {p.floor && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shadow-xs">
                      {p.floor}
                    </span>
                  )}
                </div>

                {p.pinImageUrl ? (
                  <div 
                    className="relative group mt-1 cursor-pointer overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-slate-50 transition-all hover:border-sky-500 hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenLightbox) {
                        onOpenLightbox({ url: p.pinImageUrl!, title: p.name, alt: p.pinImageAlt });
                      } else {
                        setActiveLightbox({ url: p.pinImageUrl!, title: p.name, alt: p.pinImageAlt });
                      }
                    }}
                  >
                    <img 
                      src={p.pinImageUrl} 
                      alt={p.pinImageAlt || p.name} 
                      className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <span className="flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md">
                        <Maximize2 className="h-3 w-3" /> View Full Image
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 my-0.5">
                    {p.floor ? `Located on ${p.floor}` : "Location Pinpoint"}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        <MapController coords={center} />
      </MapContainer>

      {/* Pin Photo Lightbox Modal - Contained within Chatbox Area */}
      {activeLightbox && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveLightbox(null)}
        >
          <div 
            className="relative max-h-[92%] max-w-[94%] overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-white/15 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2 text-white min-w-0">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="font-bold text-xs sm:text-sm tracking-wide truncate">{activeLightbox.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightbox(null)}
                className="rounded-full p-1 text-slate-300 hover:text-white hover:bg-white/20 transition-colors ml-2"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Photo Container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-black/70">
              <img 
                src={activeLightbox.url} 
                alt={activeLightbox.alt || activeLightbox.title} 
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-xl"
              />
            </div>

            {/* Optional Footer Caption */}
            {activeLightbox.alt && (
              <div className="px-3 py-1.5 bg-black/50 text-center text-[11px] text-slate-300 border-t border-white/10">
                {activeLightbox.alt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
