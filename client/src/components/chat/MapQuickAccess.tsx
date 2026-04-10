import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, X, ChevronDown, Building2, Map as MapIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import MapMessage from "./MapMessage";
import { cn } from "@/lib/utils";

interface MapLocation {
  name: string;
  coordinates: [number, number];
  pins: Array<{ name: string; coordinates: [number, number] }>;
  routes: Array<{ name: string; points: [number, number][]; color?: string }>;
}

interface MapQuickAccessProps {
  onClose: () => void;
}

// Fetch lightweight location data from public API
async function fetchMapLocations(): Promise<MapLocation[]> {
  try {
    const response = await fetch("/api/map-locations");
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch map locations:", err);
    return [];
  }
}

export function MapQuickAccess({ onClose }: MapQuickAccessProps) {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMapLocations().then(setLocations);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (showDropdown && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery(""); // Clear search when closed
    }
  }, [showDropdown]);

  // Sort location names alphabetically
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return sortedLocations;
    const query = searchQuery.toLowerCase();
    return sortedLocations.filter((loc) => loc.name.toLowerCase().includes(query));
  }, [sortedLocations, searchQuery]);

  // Find selected location data
  const currentLocationData = useMemo(() => {
    if (!selectedLocation) return null;
    return locations.find((loc) => loc.name === selectedLocation) || null;
  }, [selectedLocation, locations]);

  // Prepare map data for MapMessage
  const mapData = useMemo(() => {
    if (!currentLocationData) {
      // Clean map — no pins, no routes
      return {
        locationName: "Campus Map",
        coordinates: null,
        pins: [],
        routes: [],
      };
    }

    return {
      locationName: currentLocationData.name,
      coordinates: currentLocationData.coordinates,
      pins: currentLocationData.pins,
      routes: currentLocationData.routes,
    };
  }, [currentLocationData]);

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col">
      {/* Matched Header */}
      <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground shadow-sm shrink-0" style={{backgroundColor: '#001C38'}}>
        <div className="flex items-center gap-4" >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mt-1" />
          <div className="flex flex-col leading-tight">
            <h3 className="font-semibold text-sm text-white">Buksu Chatbot</h3>
            <p className="text-xs text-white/90 font-light flex items-center gap-1">
              <MapIcon className="h-3 w-3" /> Campus Map
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fullscreen Map */}
      <div className="flex-1 relative bg-slate-100">
        <MapMessage
          locationName={mapData.locationName}
          coordinates={mapData.coordinates as any}
          pins={mapData.pins as any}
          routes={mapData.routes as any}
          isFullscreen={true}
          onToggleFullscreen={onClose}
        />

        {/* Dropdown Button - Bottom Left */}
        <div className="absolute bottom-4 left-4 z-50">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2.5 rounded-xl text-sm shadow-lg border border-gray-200 transition-colors"
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-medium max-w-[140px] truncate">
                {selectedLocation || "All Buildings"}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", showDropdown && "rotate-180")} />
            </button>

            {showDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                {/* "All Buildings" option - resets to clean map */}
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setShowDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100",
                    !selectedLocation && "bg-blue-50 text-blue-600"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-medium">All Buildings</span>
                  <span className="ml-auto text-xs text-gray-400">{sortedLocations.length}</span>
                </button>
                {/* Location list — show 5 visible, rest scrollable */}
                <div className="max-h-[220px] overflow-y-auto overscroll-contain">
                  {filteredLocations.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      No locations found
                    </div>
                  ) : (
                    filteredLocations.map((loc) => {
                      const isActive = selectedLocation === loc.name;
                      return (
                        <button
                          key={loc.name}
                          onClick={() => {
                            setSelectedLocation(loc.name);
                            setShowDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5",
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "hover:bg-gray-50 text-gray-700"
                          )}
                        >
                          <MapPin className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-blue-500" : "text-gray-400"
                          )} />
                          <span className="font-medium truncate">{loc.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
