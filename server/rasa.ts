import fs from "fs";
import path from "path";
import * as dbResponses from "./db/responses.js";
import * as dbLocations from "./db/locations.js";
import * as dbSuperIntents from "./db/superIntents.js";

const responsesPath = path.join(process.cwd(), "rasa", "actions", "responses.json");
const RASA_BASE_URL = (process.env.RASA_BASE_URL || "http://127.0.0.1:5005").replace(/\/$/, "");
const RASA_API_URL = `${RASA_BASE_URL}/webhooks/rest/webhook`;

// Query responses from database (primary source)
export async function loadResponses(): Promise<any[]> {
  try {
    const responses = await dbResponses.getAllResponses();
    // Transform database format to JSON-compatible format for Rasa
    return responses.map(row => ({
      intent: row.intent,
      category: row.category,
      sub_category: row.subCategory,
      responses: {
        answer: row.answerEn?.length ? { en: row.answerEn, ceb: row.answerCeb || [] } : row.answer || [],
        follow_up: row.followUp || [],
        context_slots: row.contextSlots || {},
        imageUrl: row.imageUrl || undefined,
        imageUrls: row.imageUrls || undefined,
        mapData: row.mapData || undefined,
      },
      metadata: row.metadata || {},
    }));
  } catch (error) {
    console.error("[Rasa] Error loading responses from database:", error);
    return [];
  }
}

// Find intent by querying database
export async function findIntent(intent: string): Promise<any | null> {
  try {
    const response = await dbResponses.getResponseByIntent(intent);
    if (!response) return null;
    
    return {
      intent: response.intent,
      category: response.category,
      sub_category: response.subCategory,
      responses: {
        answer: response.answerEn?.length ? { en: response.answerEn, ceb: response.answerCeb || [] } : response.answer || [],
        follow_up: response.followUp || [],
        context_slots: response.contextSlots || {},
        imageUrl: response.imageUrl || undefined,
        imageUrls: response.imageUrls || undefined,
        mapData: response.mapData || undefined,
      },
      metadata: response.metadata || {},
    };
  } catch (error) {
    console.error("[Rasa] Error finding intent in database:", error);
    return null;
  }
}

// Call actual Rasa API
export async function callRasaAPI(message: string, language?: string, sessionId?: string, activeCategory?: string | null) {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Rasa] Calling Rasa API: "${message}" (Category: ${activeCategory || "all"})`);
    }
    
    const sender = sessionId || "user";

    // Synchronize active_category slot to Rasa tracker
    if (activeCategory !== undefined) {
      try {
        await fetch(`${RASA_BASE_URL}/conversations/${encodeURIComponent(sender)}/tracker/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{
            event: "slot",
            name: "active_category",
            value: activeCategory || null,
            timestamp: Date.now() / 1000
          }]),
        });
      } catch (trackerErr) {
        // Tracker endpoint silent fallback
      }
    }

    const response = await fetch(RASA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender,
        message,
        language,
        sessionId,
        active_category: activeCategory,
        category: activeCategory,
        metadata: {
          active_category: activeCategory,
          category: activeCategory
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Rasa API returned status ${response.status}`);
    }

    const data = await response.json();
    if (process.env.NODE_ENV !== "production") console.log(`[Rasa] Rasa response:`, data);
    return data;
  } catch (error) {
    console.error("[Rasa] Error calling Rasa API:", error);
    // Fallback to database responses
    console.log("[Rasa] Falling back to database responses");
    let localResult: any = null;

    // Query all responses from database
    try {
      const allResponses = await loadResponses();
      localResult = allResponses.find((item: any) => item.intent === message);
    } catch (dbError) {
      console.error("[Rasa] Error fetching responses from database:", dbError);
    }

    if (localResult) {
      const answer = Array.isArray(localResult.responses.answer) 
        ? localResult.responses.answer.join("\n")
        : localResult.responses.answer || "I found a local response.";
      
      return [{
        text: answer,
        custom: {
          ...localResult.responses,
          mapData: localResult.responses.mapData // Keep original coordinate format
        }
      }];
    }
    return [{ text: "Sorry, I'm having trouble connecting to the AI service." }];
  }
}
