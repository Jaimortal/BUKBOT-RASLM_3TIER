import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Polyline, 
  useMapEvents, 
  Popup, 
  useMap 
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Save, 
  Map as MapIcon, 
  Navigation,
  Layers,
  Download,
  Upload
} from "lucide-react";
import { toast } from "sonner";

// Fix leaflet default icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Point {
  lat: number;
  lng: number;
}

interface InteractiveMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  initialStyleUrl?: string;
  onSave?: (data: any) => void;
  isAdmin?: boolean;
  initialMarkers?: any[];
  initialRoutes?: any[];
}

// Route color palette - cycles through: red, green, yellow, orange, blue
const ROUTE_COLORS = ["#dc2626", "#16a34a", "#eab308", "#f97316", "#2563eb"];

const getNextRouteColor = (existingRoutes: any[]): string => {
  const colorIndex = existingRoutes.length % ROUTE_COLORS.length;
  return ROUTE_COLORS[colorIndex];
};

const MapEvents = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

export default function InteractiveMap({
  initialCenter = [10.3157, 123.8854],
  initialZoom = 13,
  initialStyleUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  onSave,
  isAdmin = false,
  initialMarkers = [],
  initialRoutes = []
}: InteractiveMapProps) {
  const [markers, setMarkers] = useState<any[]>(initialMarkers);
  const [routes, setRoutes] = useState<any[]>(initialRoutes);
  const [activeRoutePoints, setActiveRoutePoints] = useState<Point[]>([]);
  const [mode, setMode] = useState<'view' | 'add-marker' | 'draw-route'>('view');
  const [styleUrl, setStyleUrl] = useState(initialStyleUrl);
  
  // Update state when initial values changed
  useEffect(() => {
    setMarkers(initialMarkers);
    setRoutes(initialRoutes);
  }, [initialMarkers, initialRoutes]);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    let clickedPoint = { lat: e.latlng.lat, lng: e.latlng.lng };

    // Snap to nearest marker if close enough (simple distance check)
    // Threshold can be adjusted based on zoom for better UX
    const snapThreshold = 0.001; 
    const nearestMarker = markers.find(m => {
      const mLat = parseFloat(m.lat);
      const mLng = parseFloat(m.lng);
      const dist = Math.sqrt(Math.pow(mLat - clickedPoint.lat, 2) + Math.pow(mLng - clickedPoint.lng, 2));
      return dist < snapThreshold;
    });

    if (nearestMarker && mode === 'draw-route') {
      clickedPoint = { lat: parseFloat(nearestMarker.lat), lng: parseFloat(nearestMarker.lng) };
    }

    if (mode === 'add-marker') {
      const name = prompt("Enter location name:");
      if (name) {
        setMarkers([...markers, {
          name,
          lat: e.latlng.lat.toString(),
          lng: e.latlng.lng.toString(),
          id: Date.now() // temporary ID
        }]);
        toast.success(`Marker added: ${name}`);
      }
      setMode('view');
    } else if (mode === 'draw-route') {
      setActiveRoutePoints([...activeRoutePoints, clickedPoint]);
      if (nearestMarker) {
        toast.info(`Connected to: ${nearestMarker.name}`, { duration: 1500 });
      }
    }
  };

  const finishRoute = () => {
    if (activeRoutePoints.length < 2) {
      toast.error("Add at least 2 points for a route");
      return;
    }
    const name = prompt("Enter route name:");
    if (name) {
      const newColor = getNextRouteColor(routes);
      setRoutes([...routes, {
        name,
        points: activeRoutePoints,
        color: newColor,
        weight: 5,
        id: Date.now()
      }]);
      toast.success(`Route added: ${name}`);
    }
    setActiveRoutePoints([]);
    setMode('view');
  };

  const connectTwoPins = (startId: string, endId: string) => {
    const startM = markers.find(m => m.id.toString() === startId);
    const endM = markers.find(m => m.id.toString() === endId);
    
    if (startM && endM) {
      const startPoint = { lat: parseFloat(startM.lat), lng: parseFloat(startM.lng) };
      const endPoint = { lat: parseFloat(endM.lat), lng: parseFloat(endM.lng) };
      
      const name = prompt("Enter connection name (e.g., 'Entrance to Registrar'):", `${startM.name} to ${endM.name}`);
      if (name) {
        const newColor = getNextRouteColor(routes);
        setRoutes([...routes, {
          name,
          points: [startPoint, endPoint],
          color: newColor,
          weight: 6,
          id: Date.now()
        }]);
        toast.success(`Connected ${startM.name} to ${endM.name}`);
      }
    } else {
      toast.error("Please select both pins");
    }
  };

  const deleteMarker = (id: number) => {
    setMarkers(markers.filter(m => m.id !== id));
  };

  const deleteRoute = (id: number) => {
    setRoutes(routes.filter(r => r.id !== id));
  };

  const exportData = () => {
    const data = {
      map: { name: "Custom Map", styleUrl, center: initialCenter, zoom: initialZoom },
      markers,
      routes
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map_data.json';
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.markers) setMarkers(data.markers);
        if (data.routes) setRoutes(data.routes);
        if (data.map?.styleUrl) setStyleUrl(data.map.styleUrl);
        toast.success("Map data imported successfully");
      } catch (err) {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-xl border-blue-100 flex flex-col gap-3 w-64">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800">Map Controls</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Button 
              size="sm" 
              variant={mode === 'add-marker' ? "default" : "outline"}
              onClick={() => setMode(mode === 'add-marker' ? 'view' : 'add-marker')}
              className="justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Marker
            </Button>
            
            <Button 
              size="sm" 
              variant={mode === 'draw-route' ? "default" : "outline"}
              onClick={() => {
                if (mode === 'draw-route') {
                  finishRoute();
                } else {
                  setMode('draw-route');
                  setActiveRoutePoints([]);
                }
              }}
              className="justify-start"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {mode === 'draw-route' ? 'Finish Route' : 'Draw Route'}
            </Button>
            
            {mode === 'draw-route' && activeRoutePoints.length > 0 && (
              <Button size="sm" variant="destructive" onClick={() => setActiveRoutePoints([])}>
                Cancel Route
              </Button>
            )}
          </div>

          <div className="border-t pt-3 mt-1 flex flex-col gap-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Connect</Label>
            <div className="flex flex-col gap-2">
              <select 
                className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white"
                onChange={(e) => {
                  const m = markers.find(m => m.id.toString() === e.target.value);
                  if (m) {
                    const point = { lat: parseFloat(m.lat), lng: parseFloat(m.lng) };
                    setActiveRoutePoints([...activeRoutePoints, point]);
                    toast.info(`Point added: ${m.name}`);
                  }
                }}
                value=""
              >
                <option value="" disabled>Select a Pin to add...</option>
                {markers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t pt-3 mt-1 flex flex-col gap-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connect Two Pins</Label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold">START</span>
                <select id="start-pin" className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white">
                  <option value="" disabled selected>Select start...</option>
                  {markers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold">END</span>
                <select id="end-pin" className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white">
                  <option value="" disabled selected>Select end...</option>
                  {markers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <Button 
                size="sm" 
                variant="secondary"
                className="w-full mt-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                onClick={() => {
                  const start = (document.getElementById('start-pin') as HTMLSelectElement).value;
                  const end = (document.getElementById('end-pin') as HTMLSelectElement).value;
                  connectTwoPins(start, end);
                }}
              >
                Create Line Connection
              </Button>
            </div>
          </div>

          <div className="border-t pt-3 mt-1 flex flex-col gap-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Map Background</Label>
            <div className="flex gap-1 overflow-x-auto pb-1">
              <Button size="sm" variant="outline" className="text-[10px] px-2 h-7" onClick={() => setStyleUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")}>Default</Button>
              <Button size="sm" variant="outline" className="text-[10px] px-2 h-7" onClick={() => setStyleUrl("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png")}>Topo</Button>
              <Button size="sm" variant="outline" className="text-[10px] px-2 h-7" onClick={() => setStyleUrl("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")}>Satellite</Button>
            </div>
          </div>

          <div className="border-t pt-3 mt-1 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="relative flex-1">
              <Input 
                type="file" 
                className="hidden" 
                id="import-map" 
                accept=".json"
                onChange={importData}
              />
              <Button size="sm" variant="outline" className="w-full" onClick={() => document.getElementById('import-map')?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
            onClick={() => onSave?.({ markers, routes, styleUrl })}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </Card>

        {/* Legend / Status */}
        {mode !== 'view' && (
          <Card className={`${mode === 'draw-route' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} p-3 animate-in fade-in slide-in-from-right-4`}>
            <p className="text-sm font-medium">
              {mode === 'add-marker' ? 'Click anywhere to place a pin' : 'Click points on the map to draw route'}
            </p>
          </Card>
        )}
      </div>

      <div 
        className="flex-1 rounded-xl overflow-hidden shadow-inner border border-gray-200"
        onWheel={(e) => e.stopPropagation()}
      >
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          className="w-full h-full"
          style={{ background: '#f8fafc' }}
          scrollWheelZoom={true}
        >
          <TileLayer url={styleUrl} />
          
          <MapEvents onMapClick={handleMapClick} />
          
          {markers.map((marker) => (
            <Marker 
              key={marker.id} 
              position={[parseFloat(marker.lat), parseFloat(marker.lng)]}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold">{marker.name}</h4>
                  <p className="text-xs text-gray-500">{marker.description}</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 mt-2 h-6"
                    onClick={() => deleteMarker(marker.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}

          {routes.map((route) => (
            <Polyline 
              key={route.id} 
              positions={route.points} 
              color={route.color || "#3b82f6"} 
              weight={route.weight || 5}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold">{route.name}</h4>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 mt-2 h-6"
                    onClick={() => deleteRoute(route.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </Popup>
            </Polyline>
          ))}

          {activeRoutePoints.length > 0 && (
            <Polyline 
              positions={activeRoutePoints} 
              color="#fb923c" 
              dashArray="5, 10" 
            />
          )}

          {/* Show temporary markers for active route points */}
          {activeRoutePoints.map((p, i) => (
            <Marker 
              key={`active-${i}`} 
              position={[p.lat, p.lng]} 
              icon={L.divIcon({ className: 'bg-orange-500 w-2 h-2 rounded-full border-2 border-white' })}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
