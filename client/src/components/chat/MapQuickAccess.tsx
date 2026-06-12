import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, X, ChevronDown, Building2, Map as MapIcon, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MapMessage from "./MapMessage";
import { cn } from "@/lib/utils";

interface MapLocation {
  name: string;
  coordinates: [number, number];
  building: string;
  pins: Array<{ name: string; coordinates: [number, number]; floor?: string; access?: string; pinType?: string }>;
  routes: Array<{ name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string }>;
}

// Group locations by building
function groupByBuilding(locations: MapLocation[]): Record<string, MapLocation[]> {
  const groups: Record<string, MapLocation[]> = {};
  for (const loc of locations) {
    const building = loc.building?.trim() || "Other";
    if (!groups[building]) groups[building] = [];
    groups[building].push(loc);
  }
  // Sort locations within each building alphabetically
  for (const building of Object.keys(groups)) {
    groups[building].sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
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
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
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

  // Group locations by building
  const groupedByBuilding = useMemo(() => groupByBuilding(locations), [locations]);
  const buildings = useMemo(() => Object.keys(groupedByBuilding).sort(), [groupedByBuilding]);

  // Filter locations and buildings based on search query
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return buildings;
    const query = searchQuery.toLowerCase();
    return buildings.filter(building => {
      // Include building if its name matches
      if (building.toLowerCase().includes(query)) return true;
      // Include building if any location within it matches
      return groupedByBuilding[building].some(loc => loc.name.toLowerCase().includes(query));
    });
  }, [buildings, groupedByBuilding, searchQuery]);

  const getFilteredLocationsForBuilding = (building: string) => {
    if (!searchQuery.trim()) return groupedByBuilding[building] || [];
    const query = searchQuery.toLowerCase();
    return (groupedByBuilding[building] || []).filter(loc =>
      loc.name.toLowerCase().includes(query) || building.toLowerCase().includes(query)
    );
  };

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
      <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground shadow-sm shrink-0" style={{ backgroundColor: '#001C38' }}>
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
              className="flex items-center gap-2 bg-white/75 backdrop-blur-md hover:bg-white/90 text-gray-800 px-4 py-2.5 rounded-xl text-sm shadow-lg border border-white/40 transition-colors"
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-medium max-w-[140px] truncate">
                {selectedLocation || "All Buildings"}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", showDropdown && "rotate-180")} />
            </button>

            {showDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-white/75 backdrop-blur-md rounded-xl shadow-xl border border-white/40 overflow-hidden z-50">
                <div className="p-2 border-b border-gray-100/50 bg-gray-50/30">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/60 border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                {/* "All Buildings" option - resets to clean map */}
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setSelectedBuilding(null);
                    setShowDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-white/50 transition-colors flex items-center gap-2 border-b border-gray-100/50",
                    !selectedLocation ? "bg-blue-50/60 text-blue-600" : "bg-transparent"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-medium">All Buildings</span>
                  <span className="ml-auto text-xs text-gray-400">{locations.length}</span>
                </button>
                {/* Building groups */}
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                  {filteredBuildings.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      No locations found
                    </div>
                  ) : (
                    filteredBuildings.map((building) => {
                      const isExpanded = expandedBuildings.has(building) || searchQuery.trim().length > 0;
                      const buildingLocs = getFilteredLocationsForBuilding(building);
                      const isActiveBuilding = selectedBuilding === building && !selectedLocation;

                      return (
                        <div key={building} className="border-b border-gray-50 last:border-b-0">
                          {/* Building header */}
                          <button
                            onClick={() => {
                              if (buildingLocs.length === 1 && !searchQuery.trim()) {
                                // Only auto-select if there's exactly one location AND no active search
                                setSelectedLocation(buildingLocs[0].name);
                                setSelectedBuilding(building);
                                setShowDropdown(false);
                              } else {
                                // Toggle expansion
                                const newExpanded = new Set(expandedBuildings);
                                if (newExpanded.has(building)) {
                                  newExpanded.delete(building);
                                } else {
                                  newExpanded.add(building);
                                }
                                setExpandedBuildings(newExpanded);
                              }
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2",
                              isActiveBuilding
                                ? "bg-blue-50/60 text-blue-700"
                                : "hover:bg-white/50 text-gray-800 bg-transparent"
                            )}
                          >
                            <Building2 className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isActiveBuilding ? "text-blue-500" : "text-blue-600"
                            )} />
                            <span className="font-semibold truncate flex-1">{building}</span>
                            {(buildingLocs.length > 1 || searchQuery.trim()) && (
                              <>
                                <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded-full">
                                  {buildingLocs.length}
                                </span>
                                <ChevronRight className={cn(
                                  "h-3.5 w-3.5 text-gray-400 transition-transform",
                                  isExpanded && "rotate-90"
                                )} />
                              </>
                            )}
                          </button>
                          {/* Locations under this building */}
                          {isExpanded && (buildingLocs.length > 1 || searchQuery.trim()) && (
                            <div className="bg-gray-50/30">
                              {buildingLocs.map((loc) => {
                                const isActive = selectedLocation === loc.name;
                                const floorTag = loc.pins?.find((p: any) => p.floor)?.floor;
                                return (
                                  <button
                                    key={loc.name}
                                    onClick={() => {
                                      setSelectedLocation(loc.name);
                                      setSelectedBuilding(building);
                                      setShowDropdown(false);
                                    }}
                                    className={cn(
                                      "w-full text-left pl-10 pr-4 py-2 text-sm transition-colors flex items-center gap-2",
                                      isActive
                                        ? "bg-blue-50/60 text-blue-700"
                                        : "hover:bg-white/50 text-gray-600 bg-transparent"
                                    )}
                                  >
                                    <MapPin className={cn(
                                      "h-3 w-3 shrink-0",
                                      isActive ? "text-blue-500" : "text-gray-400"
                                    )} />
                                    <span className="truncate flex-1">{loc.name}</span>
                                    {floorTag && (
                                      <span className="ml-auto text-[10px] font-black text-gray-900 bg-yellow-400/65 backdrop-blur-sm border border-yellow-500/50 px-1.5 py-0.5 rounded">
                                        [{floorTag}]
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
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
        </div>


      </div>
    </div>
  );
}
