import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { sendMessageToRasa } from "./rasaData"; // Your live Rasa API
import { getSessionData } from "./sessionStore";

// --- Utilities ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple ID generator
export const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Types ---
export type MessageType = "text" | "map" | "image" | "faq_carousel";

export interface ChatSuggestion {
  label: string;
  payload: string;
}

export interface ChatChoiceGroup {
  title: string;
  items: ChatSuggestion[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  type: MessageType;
  timestamp: Date;
  hideTimestamp?: boolean; // Controls timestamp visibility
  imageUrl?: string;
  imageUrls?: string[];
  mapData?: {
    locationName: string;
    coordinates: { lat: number; lng: number };
    mapId?: string;
    pins?: Array<{ name: string; coordinates: { lat: number; lng: number }; floor?: string; access?: string; pinType?: string }>;
    routes?: Array<{ name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string }>;
  };
  faqs?: import("../types/admin").FaqConfig[];
  suggestions?: ChatSuggestion[];
  choiceGroups?: ChatChoiceGroup[];
}

// Interface for the response format expected by ChatWindow
interface BackendResponse {
  answer?: string[]; // Always an array of strings
  imageUrl?: string;
  imageUrls?: string[];
  mapData?: {
    locationName: string;
    coordinates: { lat: number; lng: number };
    mapId?: string;
    pins?: Array<{ name: string; coordinates: { lat: number; lng: number }; floor?: string; access?: string; pinType?: string }>;
    routes?: Array<{ name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string }>;
  };
  mapDataList?: Array<{
    locationName: string;
    coordinates: { lat: number; lng: number };
    mapId?: string;
    pins?: Array<{ name: string; coordinates: { lat: number; lng: number }; floor?: string; access?: string; pinType?: string }>;
    routes?: Array<{ name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string }>;
  }>;
  suggestions?: ChatSuggestion[];
  choiceGroups?: ChatChoiceGroup[];
}

// --- Backend Adapter for Rasa ---
class RasaBackend {
  private lastTopic: string | null = null;
  private queryCache = new Map<string, { timestamp: number; response: BackendResponse }>();

  clearCache() {
    this.queryCache.clear();
    console.log("[RasaBackend] Query cache cleared.");
  }

  // This method now returns a BackendResponse object instead of ChatMessage[]
  async sendMessage(text: string, sessionId?: string, category?: string | null): Promise<BackendResponse> {
    const catPrefix = category || "general";
    const cacheKey = `${catPrefix}:${(text || "").trim().toLowerCase().replace(/[?!.,:-_]/g, "")}`;
    if (cacheKey && !text.startsWith("/") && text !== "test") {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
        console.log(`[RasaBackend Cache] Serving cached response for [${catPrefix}]: "${text}" (0 network calls)`);
        return cached.response;
      }
    }

    try {
      const session = getSessionData();
      const preferredLanguage = session.userPreferences?.language;
      const responses = await sendMessageToRasa(text, preferredLanguage, sessionId, category);

      // Collect text parts separately
      const textParts: string[] = [];
      const imageUrls: string[] = [];
      const suggestions: ChatSuggestion[] = [];
      const choiceGroups: ChatChoiceGroup[] = [];
      let mapData: any = null;
      const mapDataList: any[] = [];

      responses.forEach((r: any) => {
        // Extract text while preserving single-bubble multi-line strings
        if (typeof r.text === "string" && r.text.trim().length > 0) {
          textParts.push(r.text.trim());
        }

        // Extract image (standard Rasa REST field)
        if (typeof r.image === "string" && r.image.trim()) {
          imageUrls.push(r.image.trim());
        }

        // Extract custom data (follow_up, map, etc.)
        if (r.custom) {
          // Extract custom images
          if (typeof r.custom.imageUrl === "string" && r.custom.imageUrl.trim()) {
            imageUrls.push(r.custom.imageUrl.trim());
          }
          if (Array.isArray(r.custom.imageUrls)) {
            r.custom.imageUrls.forEach((img: unknown) => {
              if (typeof img === "string" && img.trim()) imageUrls.push(img.trim());
            });
          }
          if (typeof r.custom.image === "string" && r.custom.image.trim()) {
            imageUrls.push(r.custom.image.trim());
          }
          if (Array.isArray(r.custom.images)) {
            r.custom.images.forEach((img: unknown) => {
              if (typeof img === "string" && img.trim()) imageUrls.push(img.trim());
            });
          }

          if (r.custom.follow_up && Array.isArray(r.custom.follow_up)) {
            r.custom.follow_up.forEach((part: string) => {
              if (typeof part === "string") textParts.push(part);
            });
          }

          if (Array.isArray(r.custom.suggestions)) {
            r.custom.suggestions.forEach((suggestion: any) => {
              const label = typeof suggestion?.label === "string" ? suggestion.label.trim() : "";
              const payload = typeof suggestion?.payload === "string" ? suggestion.payload.trim() : label;
              if (label) {
                suggestions.push({ label, payload });
              }
            });
          }

          if (Array.isArray(r.custom.choiceGroups)) {
            r.custom.choiceGroups.forEach((group: any) => {
              const title = typeof group?.title === "string" ? group.title.trim() : "";
              const items = Array.isArray(group?.items)
                ? group.items
                    .map((item: any) => {
                      const label = typeof item?.label === "string" ? item.label.trim() : "";
                      const payload = typeof item?.payload === "string" ? item.payload.trim() : label;
                      return label ? { label, payload } : null;
                    })
                    .filter(Boolean)
                : [];
              if (title && items.length > 0) {
                choiceGroups.push({ title, items });
              }
            });
          }

          // Check for map data in custom response
          if (r.custom.mapData) {
            if (Array.isArray(r.custom.mapData)) {
              const extracted = r.custom.mapData
                .map((item: any) => {
                  const coords = item?.coordinates;
                  return {
                    locationName: item?.locationName || "Location",
                    coordinates: Array.isArray(coords)
                      ? { lat: coords[0], lng: coords[1] }
                      : coords,
                    mapId: item?.mapId,
                    pins: Array.isArray(item?.pins)
                      ? item.pins
                        .map((p: any) => {
                          const c = p?.coordinates;
                          const floor = p?.floor;
                          const access = p?.access;
                          const pinType = p?.pinType;
                          if (Array.isArray(c) && c.length === 2) {
                            return {
                              name: String(p?.name || "").trim() || "Pin",
                              coordinates: { lat: c[0], lng: c[1] },
                              floor,
                              access,
                              pinType
                            };
                          }
                          if (c && typeof c === "object" && ("lat" in c || "lng" in c)) {
                            return {
                              name: String(p?.name || "").trim() || "Pin",
                              coordinates: c,
                              floor,
                              access,
                              pinType
                            };
                          }
                          return null;
                        })
                        .filter(Boolean)
                      : (item?.floor || item?.access || item?.pinType) && coords
                        ? [{
                          name: item?.locationName || "Location",
                          coordinates: Array.isArray(coords)
                            ? { lat: coords[0], lng: coords[1] }
                            : coords,
                          floor: item.floor,
                          access: item.access,
                          pinType: item.pinType
                        }]
                        : undefined,
                    routes: Array.isArray(item?.routes) ? item.routes : undefined,
                  };
                })
                .filter((item: any) => item?.coordinates);

              extracted.forEach((item: any) => mapDataList.push(item));
            } else {
              const pins = Array.isArray(r.custom.mapData.pins)
                ? r.custom.mapData.pins
                  .map((p: any) => {
                    const c = p?.coordinates;
                    const floor = p?.floor;
                    const access = p?.access;
                    const pinType = p?.pinType;
                    if (Array.isArray(c) && c.length === 2) {
                      return {
                        name: String(p?.name || "").trim() || "Pin",
                        coordinates: { lat: c[0], lng: c[1] },
                        floor,
                        access,
                        pinType
                      };
                    }
                    if (c && typeof c === "object" && ("lat" in c || "lng" in c)) {
                      return {
                        name: String(p?.name || "").trim() || "Pin",
                        coordinates: c,
                        floor,
                        access,
                        pinType
                      };
                    }
                    return null;
                  })
                  .filter(Boolean)
                : undefined;

              mapData = {
                locationName: r.custom.mapData.locationName || "Location",
                coordinates: r.custom.mapData.coordinates,
                mapId: r.custom.mapData.mapId,
                pins: pins ?? ((r.custom.mapData.floor || r.custom.mapData.access || r.custom.mapData.pinType) && r.custom.mapData.coordinates
                  ? [{
                    name: r.custom.mapData.locationName || "Location",
                    coordinates: Array.isArray(r.custom.mapData.coordinates)
                      ? { lat: r.custom.mapData.coordinates[0], lng: r.custom.mapData.coordinates[1] }
                      : r.custom.mapData.coordinates,
                    floor: r.custom.mapData.floor,
                    access: r.custom.mapData.access,
                    pinType: r.custom.mapData.pinType
                  }]
                  : undefined),
                routes: r.custom.mapData.routes,
              };
            }
          }

          // Also check for direct map property
          if (r.custom.map) {
            mapData = {
              locationName: r.custom.map.locationName || "Location",
              coordinates: Array.isArray(r.custom.map.coordinates)
                ? { lat: r.custom.map.coordinates[0], lng: r.custom.map.coordinates[1] }
                : r.custom.map.coordinates
            };
          }
        }

        // Check for buttons that might contain location info
        if (r.buttons && Array.isArray(r.buttons)) {
          r.buttons.forEach((btn: any) => {
            if (btn.payload && btn.payload.includes("location")) {
              // Extract location from button payload
              // You can customize this based on your Rasa button structure
            }
          });
        }
      });

      // Deduplicate images while preserving order
      const uniqueImageUrls = Array.from(new Set(imageUrls));

      // Build response object
      const response: BackendResponse = {
        answer: textParts.length > 0 ? textParts :
          (uniqueImageUrls.length > 0 || mapData || mapDataList.length > 0
            ? []
            : ["I received your message but got an empty response."])
      };

      if (uniqueImageUrls.length > 0) {
        response.imageUrls = uniqueImageUrls;
        response.imageUrl = uniqueImageUrls[0];
      }

      if (suggestions.length > 0) {
        response.suggestions = suggestions;
      }

      if (choiceGroups.length > 0) {
        response.choiceGroups = choiceGroups;
      }

      // Add map data if available
      if (mapDataList.length > 0) {
        response.mapDataList = mapDataList;
      } else if (mapData) {
        response.mapData = mapData;
      }

      if (cacheKey && cacheKey !== "test" && response.answer && response.answer.length > 0) {
        this.queryCache.set(cacheKey, { timestamp: Date.now(), response });
      }

      return response;

    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // Helper to detect location-related queries
  private isLocationQuery(text: string): boolean {
    const locationKeywords = [
      'where', 'location', 'map', 'directions', 'find', 'locate',
      'near', 'close to', 'around', 'place', 'spot', 'area',
      'shop', 'store', 'mall', 'restaurant', 'food', 'eat',
      'restroom', 'toilet', 'cr', 'bathroom', 'washroom',
      'entrance', 'exit', 'gate', 'door', 'elevator', 'escalator',
      'parking', 'car', 'vehicle', 'atm', 'bank', 'money',
      'information', 'help desk', 'concierge', 'security'
    ];

    const lowerText = text.toLowerCase();
    return locationKeywords.some(keyword => lowerText.includes(keyword));
  }
}

// --- Export instance and utility ---
export const rasaBackend = new RasaBackend();

// Helper function for ChatWindow to convert responses
export function convertRasaResponseToMessages(rasaResponses: any[]): ChatMessage[] {
  const messages: ChatMessage[] = [];

  rasaResponses.forEach((response) => {
    let text = response.text || "";

    if (response.custom?.follow_up) {
      text += "\n\n" + response.custom.follow_up.join("\n");
    }

    messages.push({
      id: generateId(),
      text: text,
      sender: "bot",
      type: "text",
      timestamp: new Date()
    });

    // Handle map data if present
    if (response.custom?.map) {
      messages.push({
        id: generateId(),
        text: "",
        sender: "bot",
        type: "map",
        timestamp: new Date(),
        mapData: {
          locationName: response.custom.map.locationName || "Location",
          coordinates: Array.isArray(response.custom.map.coordinates)
            ? { lat: response.custom.map.coordinates[0], lng: response.custom.map.coordinates[1] }
            : response.custom.map.coordinates || { lat: 0, lng: 0 }
        }
      });
    }
  });

  return messages;
}

