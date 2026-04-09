import { useEffect, useState } from "react";
import InteractiveMap from "@/components/map/InteractiveMap";
import { fetchAllMaps, fetchMapRoutes, fetchMapMarkers, saveMap, saveRoute, saveMarker, importMap as importMapApi } from "@/lib/adminApi";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Sidebar } from "@/components/admin/Sidebar"; // Assuming there's a sidebar or layout

export default function MapPage() {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    setLoading(true);
    try {
      const allMaps = await fetchAllMaps();
      setMaps(allMaps);
      if (allMaps.length > 0) {
        const defaultMap = allMaps.find((m: any) => m.isDefault) || allMaps[0];
        handleSelectMap(defaultMap);
      } else {
        setLoading(false);
      }
    } catch (err) {
      toast.error("Failed to load maps");
      setLoading(false);
    }
  };

  const handleSelectMap = async (map: any) => {
    setSelectedMap(map);
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        fetchMapMarkers(map.id),
        fetchMapRoutes(map.id)
      ]);
      setMarkers(m);
      setRoutes(r);
    } catch (err) {
      toast.error("Failed to load map data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    if (!selectedMap) {
      toast.error("No map selected");
      return;
    }

    try {
      // Save style URL to map
      await saveMap({ ...selectedMap, styleUrl: data.styleUrl });
      
      // For markers and routes, we'd ideally sync them
      // This is a simplified version:
      for (const m of data.markers) {
        await saveMarker(selectedMap.id, m);
      }
      for (const r of data.routes) {
        await saveRoute(selectedMap.id, r);
      }
      
      toast.success("Changes saved successfully");
    } catch (err) {
      toast.error("Failed to save changes");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar / Map Selection */}
      <div className="w-16 lg:w-64 bg-white border-r border-slate-200 flex flex-col items-center py-6 px-4">
        <h2 className="hidden lg:block font-bold text-xl mb-6 text-slate-800 self-start">Maps</h2>
        <div className="flex flex-col gap-3 w-full">
          {maps.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelectMap(m)}
              className={`p-3 rounded-lg text-left transition-all ${
                selectedMap?.id === m.id 
                  ? 'bg-blue-600 text-white shadow-lg lg:translate-x-2' 
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              } flex items-center justify-center lg:justify-start gap-3`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedMap?.id === m.id ? 'bg-blue-500' : 'bg-slate-100'}`}>
                <span className="text-xs font-bold uppercase">{m.name.charAt(0)}</span>
              </div>
              <span className="hidden lg:block font-medium truncate">{m.name}</span>
            </button>
          ))}
          {maps.length === 0 && !loading && (
             <div className="text-center py-10 text-slate-400">
               <p className="text-sm">No maps found.</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-8 justify-between shadow-sm z-10">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{selectedMap?.name || 'Interactive Map'}</h1>
            <p className="text-xs text-slate-500">Edit locations, routes and background</p>
          </div>
          <div className="flex gap-4 items-center">
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />}
            <span className="text-xs font-medium text-slate-400">
              {markers.length} pinned • {routes.length} routes
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-hidden">
          {selectedMap ? (
            <InteractiveMap 
              initialCenter={selectedMap.center}
              initialZoom={selectedMap.zoom}
              initialStyleUrl={selectedMap.styleUrl}
              initialMarkers={markers}
              initialRoutes={routes}
              onSave={handleSave}
              isAdmin={true}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                 <MapIcon className="w-8 h-8 text-slate-200" />
               </div>
               <p className="text-lg font-medium">Select a map to begin</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const MapIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);
