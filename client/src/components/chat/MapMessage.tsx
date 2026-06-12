import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, ImageOverlay, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpDown, Footprints, Maximize2, Minimize2 } from "lucide-react";
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
  pins?: Array<{ name: string; coordinates: CoordArray | CoordObject; floor?: string; access?: string; pinType?: string }>;
  imageBounds?: L.LatLngBoundsExpression;
  maxClamp?: number;
  // fullscreen props
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  routes?: RoutePayload[];
}

const DefaultBounds: L.LatLngBoundsExpression = [
  [0, 0],
  [1000, 1000],
];

type IndicatorKind = "staircase" | "elevator";

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

  const dotIcon = useMemo(() =>
    L.divIcon({
      className: "",
      html: `
        <div class="traveling-dot" style="
          width: 9px;
          height: 9px;
          background: ${route.color || "#dc2626"};
          border-radius: 50%;
          border: 1.5px solid white;
          box-shadow: 0 0 5px ${route.color || "#dc2626"}, 0 0 10px ${route.color || "#dc2626"};
          animation: dotPulse 1s ease-in-out infinite;
        "></div>
      `,
      iconSize: [9, 9],
      iconAnchor: [4.5, 4.5],
    }), [route.color]);

  return <Marker position={position} icon={dotIcon} zIndexOffset={1000} />;
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

  const normalizedPins = useMemo(() => {
    if (Array.isArray(pins) && pins.length > 0) {
      const result = pins
        .map((p) => {
          const tuple = normalizeToTuple((p as any)?.coordinates, maxClamp);
          const name = String((p as any)?.name || "").trim() || "Pin";
          const floor = (p as any)?.floor;
          const pinType = normalizeIndicatorKind({ name, access: (p as any)?.access, pinType: (p as any)?.pinType });
          return tuple ? { name, coordinates: tuple as CoordArray, floor, pinType } : null;
        })
        .filter(Boolean) as Array<{ name: string; coordinates: CoordArray; floor?: string; pinType?: IndicatorKind | null }>;
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
    const markerText = isStaircase ? "ST" : isElevator ? "EV" : "";
    const textHtml = markerText
      ? `<span style="color:#fff;font-size:9px;font-weight:900;line-height:16px;display:block;text-align:center;transform:rotate(45deg);">${markerText}</span>`
      : "";
    return (
    L.divIcon({
      className: "",
      html: `
        <div style="position:relative; transform: translate(-50%, -100%);">
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
      className={`rounded-lg overflow-hidden border border-border mt-2 relative z-2 ${isFullscreen ? 'w-full h-full' : 'w-60 h-48'}`}
      onWheel={handleWheel}
    >
      {/* Map guidance indicators - shown only inside this map */}
      {(() => {
        const markerWithFloor = flippedMarkers?.find(m => m.floor);
        const indicatorKinds = Array.from(
          new Set(flippedMarkers.map(m => m.pinType).filter(Boolean))
        ) as IndicatorKind[];
        if (!markerWithFloor && indicatorKinds.length === 0) return null;

        return (
          <div className={`absolute z-[1000] flex flex-col items-start gap-1 transition-all ${
            isFullscreen
              ? "top-2 left-12 text-sm"
              : "bottom-2 left-2 text-[9px]"
          }`}>
            {markerWithFloor && (
              <div className={`bg-yellow-400/70 backdrop-blur-md text-gray-900 border border-yellow-500/80 rounded shadow-md flex items-center gap-2 ${
                isFullscreen ? "px-3 py-1.5" : "px-2.5 py-1"
              }`}>
                <span className="font-black">[{markerWithFloor.floor}]</span>
                <span className="hidden sm:inline font-semibold">
                  {markerWithFloor.floor === 'GF' ? 'Ground Floor' :
                    markerWithFloor.floor === '2F' ? '2nd Floor' :
                      markerWithFloor.floor === '3F' ? '3rd Floor' :
                        markerWithFloor.floor === '4F' ? '4th Floor' :
                          markerWithFloor.floor === '5F' ? '5th Floor' :
                            markerWithFloor.floor === '1F' ? '1st Floor' :
                              markerWithFloor.floor === 'BS' ? 'Basement' : ''}
                </span>
              </div>
            )}
            {indicatorKinds.map(kind => (
              <div
                key={kind}
                className={`bg-white/80 backdrop-blur-md text-gray-900 border border-gray-200/80 rounded shadow-md flex items-center gap-1.5 font-semibold ${
                  isFullscreen ? "px-3 py-1.5" : "px-2 py-1"
                }`}
              >
                {kind === "staircase" ? (
                  <>
                    <Footprints className={isFullscreen ? "h-4 w-4" : "h-3 w-3"} />
                    <span>Staircase</span>
                  </>
                ) : (
                  <>
                    <ArrowUpDown className={isFullscreen ? "h-4 w-4" : "h-3 w-3"} />
                    <span>Elevator</span>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })()}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-2 right-2 z-[1000] bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-md shadow-md transition-all duration-200 backdrop-blur-sm"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}
      {isFullscreen && normalizedRoutes.length > 0 && (
        <div className="absolute top-12 right-2 z-[1000] max-w-[180px] rounded-lg border border-white/50 bg-white/85 p-2 text-xs text-slate-800 shadow-md backdrop-blur">
          <div className="mb-1 font-bold">Routes</div>
          <div className="space-y-1">
            {normalizedRoutes.map((route, index) => (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full shadow-sm" style={{ backgroundColor: route.color || ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
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
            <Popup>{p.name}</Popup>
          </Marker>
        ))}
        <MapController coords={center} />
      </MapContainer>
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
