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
export type MessageType = "text" | "map" | "faq_carousel";


export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  type: MessageType;
  timestamp: Date;
  imageUrl?: string;
  imageUrls?: string[];
  mapData?: {
    locationName: string;
    coordinates: { lat: number; lng: number }; // Changed from [number, number]
    mapId?: string;
    pins?: Array<{ name: string; coordinates: { lat: number; lng: number } }>;
    routes?: Array<{ name: string; points: [number, number][]; color?: string }>;
  };
  faqs?: import("../types/admin").FaqConfig[];
}

// Interface for the response format expected by ChatWindow
interface BackendResponse {
  answer?: string | string[];
  imageUrl?: string;
  imageUrls?: string[];
  mapData?: {
    locationName: string;
    coordinates: { lat: number; lng: number };
    mapId?: string;
    pins?: Array<{ name: string; coordinates: { lat: number; lng: number } }>;
    routes?: Array<{ name: string; points: [number, number][]; color?: string }>;
  };
  mapDataList?: Array<{
    locationName: string;
    coordinates: { lat: number; lng: number };
    mapId?: string;
    pins?: Array<{ name: string; coordinates: { lat: number; lng: number } }>;
    routes?: Array<{ name: string; points: [number, number][]; color?: string }>;
  }>;
}

// --- Backend Adapter for Rasa ---
class RasaBackend {
  private lastTopic: string | null = null;

  // This method now returns a BackendResponse object instead of ChatMessage[]
  async sendMessage(text: string, sessionId?: string): Promise<BackendResponse> {
    try {
      const session = getSessionData();
      const preferredLanguage = session.userPreferences?.language;
      const responses = await sendMessageToRasa(text, preferredLanguage, sessionId);
      
      // Combine all text responses
      let combinedText = "";
      const imageUrls: string[] = [];
      let mapData: any = null;
      const mapDataList: any[] = [];

      responses.forEach((r: any) => {
        // Extract text
        if (typeof r.text === "string" && r.text.trim()) {
          combinedText += r.text.trim() + "\n";
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

          if (r.custom.follow_up) {
            combinedText += "\n" + r.custom.follow_up.join("\n") + "\n";
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
                            if (Array.isArray(c) && c.length === 2) {
                              return {
                                name: String(p?.name || "").trim() || "Pin",
                                coordinates: { lat: c[0], lng: c[1] },
                              };
                            }
                            if (c && typeof c === "object" && ("lat" in c || "lng" in c)) {
                              return {
                                name: String(p?.name || "").trim() || "Pin",
                                coordinates: c,
                              };
                            }
                            return null;
                          })
                          .filter(Boolean)
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
                      if (Array.isArray(c) && c.length === 2) {
                        return {
                          name: String(p?.name || "").trim() || "Pin",
                          coordinates: { lat: c[0], lng: c[1] },
                        };
                      }
                      if (c && typeof c === "object" && ("lat" in c || "lng" in c)) {
                        return {
                          name: String(p?.name || "").trim() || "Pin",
                          coordinates: c,
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
                pins,
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

      // Clean up text
      combinedText = combinedText.trim();

      // Deduplicate images while preserving order
      const uniqueImageUrls = Array.from(new Set(imageUrls));

      // Build response object
      const response: BackendResponse = {
        answer:
          combinedText ||
          (uniqueImageUrls.length > 0 || mapData || mapDataList.length > 0
            ? ""
            : "I received your message but got an empty response.")
      };

      if (uniqueImageUrls.length > 0) {
        response.imageUrls = uniqueImageUrls;
        response.imageUrl = uniqueImageUrls[0];
      }

      // Add map data if available
      if (mapDataList.length > 0) {
        response.mapDataList = mapDataList;
      } else if (mapData) {
        response.mapData = mapData;
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