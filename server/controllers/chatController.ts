import { Request, Response } from "express";
import { callRasaAPI } from "../rasa";
import { storage } from "../storage";
import type { InsertConversationLog } from "@shared/schema";

type AnswerValue = string | string[] | Record<string, unknown> | undefined;
const ROUTE_COLORS = ["#ff1744", "#ffea00", "#00b0ff", "#00e676", "#d500f9", "#ff9100", "#00e5ff", "#76ff03"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeRoutes = (routes: unknown) =>
  Array.isArray(routes)
    ? routes.map((route: any, index: number) => ({
        name: String(route?.name || `Route ${index + 1}`),
        points: Array.isArray(route?.points) ? route.points : [],
        color: ROUTE_COLORS[index % ROUTE_COLORS.length],
        route_order: Number(route?.route_order) || index + 1,
        route_label: String(route?.route_label || `Route ${index + 1}`),
      }))
    : [];

const pickStringFromValue = (
  value: unknown,
  options: { randomize?: boolean } = {}
): string => {
  const { randomize = false } = options;

  if (Array.isArray(value)) {
    if (value.length === 0) return "";

    if (randomize) {
      const chosen = value[Math.floor(Math.random() * value.length)];
      if (Array.isArray(chosen)) {
        return chosen.filter((item): item is string => typeof item === "string").join("\n");
      }
      return typeof chosen === "string" ? chosen : "";
    }

    return value.filter((item): item is string => typeof item === "string").join("\n");
  }

  return typeof value === "string" ? value : "";
};

const selectAnswerText = (answer: AnswerValue, preferredLanguage?: string): string => {
  if (isRecord(answer)) {
    const normalizedLang = preferredLanguage?.toLowerCase();
    const languageKeys = [
      normalizedLang,
      "en"
    ].filter(Boolean) as string[];

    let selected: unknown;
    for (const key of languageKeys) {
      if (answer[key] !== undefined) {
        selected = answer[key];
        break;
      }
    }

    if (selected === undefined) {
      const [firstKey] = Object.keys(answer);
      selected = firstKey ? answer[firstKey] : undefined;
    }

    return pickStringFromValue(selected, { randomize: true });
  }

  return pickStringFromValue(answer, { randomize: false });
};

export class ChatController {
  static async handleChat(req: Request, res: Response) {
    const startTime = Date.now();
    const userMessageTimestamp = new Date();
    
    try {
      const { intent, language, lang, sessionId = "default", activeCategory, category } = req.body;
      const preferredLanguage: string | undefined = language || lang;
      const domainCategory = activeCategory || category;

      const result = await callRasaAPI(intent, preferredLanguage, sessionId, domainCategory);

      let answerText = "I cannot understand your question.";
      let answerParts: string[] = ["I cannot understand your question."];
      let detectedIntent = null;
      let mapDataFromRasa = null;
      const allAnswers: string[] = [];
      
      // Extract text from ALL responses, not just the first
      if (result && result.length > 0) {
        for (const response of result) {
          if (response.text) {
            allAnswers.push(response.text);
          }
        }
        
        if (allAnswers.length > 0) {
          answerParts = allAnswers.flatMap((answer) =>
            String(answer)
              .split(/\r?\n/)
              .map((part) => part.trim())
              .filter(Boolean)
          );
          if (answerParts.length === 0) {
            answerParts = allAnswers.map((answer) => String(answer).trim()).filter(Boolean);
          }
          answerText = answerParts.join("\n\n");  // Keep joined text for logs/fallback checks
          detectedIntent = intent;
        }
      }
      
      // Check if this is a fallback response
      const isFallback = answerText.includes("I'm not sure I understand") || 
                         answerText.includes("I cannot understand your question") ||
                         answerText.includes("Could you rephrase") ||
                         answerText.includes("cannot understand") ||
                         answerText.includes("try again");
      
      // Extract ALL mapData from all responses (not just the first one)
      const allMapDataFromRasa: any[] = [];
      
      // Extract ALL images from all responses
      const allImageUrls: string[] = [];
      const allSuggestions: Array<{ label: string; payload: string }> = [];
      const allChoiceGroups: Array<{ title: string; items: Array<{ label: string; payload: string }> }> = [];
      
      for (const response of result) {
        if (!isFallback && response.custom?.mapData) {
          allMapDataFromRasa.push(response.custom.mapData);
        }
        if (Array.isArray(response.custom?.suggestions)) {
          response.custom.suggestions.forEach((suggestion: any) => {
            const label = typeof suggestion?.label === "string" ? suggestion.label.trim() : "";
            const payload = typeof suggestion?.payload === "string" ? suggestion.payload.trim() : label;
            if (label) {
              allSuggestions.push({ label, payload });
            }
          });
        }
        if (Array.isArray(response.custom?.choiceGroups)) {
          response.custom.choiceGroups.forEach((group: any) => {
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
              allChoiceGroups.push({ title, items });
            }
          });
        }
        // Extract images from response
        if (response.image) {
          allImageUrls.push(response.image);
        }
      }

      const botResponseTimestamp = new Date();
      const responseTime = Date.now() - startTime;

      // Log the conversation with timestamps
      const conversationLog: Omit<InsertConversationLog, 'id' | 'createdAt'> = {
        sessionId,
        userMessage: intent,
        botResponse: answerText,
        userMessageTimestamp,
        botResponseTimestamp,
        intent: detectedIntent,
        language: preferredLanguage || "en",
        responseTime,
      };

      // Store the conversation log asynchronously (don't wait for it)
      storage.createConversationLog(conversationLog).catch(error => {
        console.error("Failed to log conversation:", error);
      });

      // Format ALL mapData entries
      const formattedMapDataList: any[] = [];
      for (const mapDataFromRasa of allMapDataFromRasa) {
        const raw: any = mapDataFromRasa;

        const pins = Array.isArray(raw.pins)
          ? raw.pins
              .map((p: any, idx: number) => {
                const coords = p?.coordinates;
                const tuple = Array.isArray(coords) && coords.length === 2
                  ? [Number(coords[0]), Number(coords[1])]
                  : null;
                if (!tuple) return null;
                const name = String(p?.name || "").trim() || `Pin ${idx + 1}`;
                const floor = typeof p?.floor === "string" ? p.floor.trim() : "";
                const access = typeof p?.access === "string" ? p.access.trim() : "";
                const pinType = typeof p?.pinType === "string" ? p.pinType.trim() : "";
                return { name, coordinates: tuple, ...(floor ? { floor } : {}), ...(access ? { access } : {}), ...(pinType ? { pinType } : {}) };
              })
              .filter(Boolean)
          : null;

        const coordFromPins = Array.isArray(pins) && pins.length > 0 ? pins[0].coordinates : null;
        const rawCoords = raw.coordinates;
        const coords = Array.isArray(rawCoords) && rawCoords.length === 2
          ? [Number(rawCoords[0]), Number(rawCoords[1])]
          : coordFromPins;

        formattedMapDataList.push({
          locationName: raw.locationName || "Location",
          ...(coords ? { coordinates: coords } : {}),
          ...(raw.mapId ? { mapId: raw.mapId } : {}),
          ...(Array.isArray(pins) ? { pins } : {}),
          ...(Array.isArray(raw.routes) ? { routes: normalizeRoutes(raw.routes) } : {}),
        });
      }

      // Use first map for backward compatibility, but include all maps
      const formattedMapData = formattedMapDataList.length > 0 ? formattedMapDataList[0] : null;

      return res.json({
        answer: answerParts,
        follow_up: result?.[0]?.custom?.follow_up ?? [],
        mapData: formattedMapData,
        mapDataList: formattedMapDataList.length > 0 ? formattedMapDataList : undefined,
        imageUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
        imageUrl: allImageUrls.length > 0 ? allImageUrls[0] : undefined,
        suggestions: allSuggestions.length > 0 ? allSuggestions : undefined,
        choiceGroups: allChoiceGroups.length > 0 ? allChoiceGroups : undefined
      });
    } catch (error) {
      console.error("Chat controller error:", error);
      
      // Log the error conversation
      const conversationLog: Omit<InsertConversationLog, 'id' | 'createdAt'> = {
        sessionId: req.body.sessionId || "default",
        userMessage: req.body.intent || "unknown",
        botResponse: "Error: Failed to process message",
        userMessageTimestamp,
        botResponseTimestamp: new Date(),
        intent: null,
        language: req.body.language || req.body.lang || "en",
        responseTime: Date.now() - startTime,
      };

      storage.createConversationLog(conversationLog).catch(error => {
        console.error("Failed to log conversation error:", error);
      });

      res.status(500).json({ 
        success: false, 
        message: "Internal server error in chat processing" 
      });
    }
  }
}
