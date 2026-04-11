/**
 * Database service for super intent responses
 * Provides CRUD operations for the super_intent_responses table
 */

import { db } from "../db.js";
import { superIntentResponses } from "../../shared/schema.js";
import { eq, and, or, like } from "drizzle-orm";
import type { InsertSuperIntentResponse, SuperIntentResponse } from "../../shared/schema.js";

// Get all super intent responses
export async function getAllSuperIntents(): Promise<SuperIntentResponse[]> {
  return await db.select().from(superIntentResponses);
}

// Get super intent responses by super_intent (e.g., "University_info")
export async function getSuperIntentByName(superIntent: string): Promise<SuperIntentResponse[]> {
  return await db
    .select()
    .from(superIntentResponses)
    .where(eq(superIntentResponses.superIntent, superIntent));
}

// Get a specific topic by super_intent and topic
export async function getSuperIntentTopic(
  superIntent: string,
  topic: string
): Promise<SuperIntentResponse | null> {
  const results = await db
    .select()
    .from(superIntentResponses)
    .where(
      and(
        eq(superIntentResponses.superIntent, superIntent),
        eq(superIntentResponses.topic, topic)
      )
    )
    .limit(1);
  return results[0] || null;
}

// Create new super intent response
export async function createSuperIntent(
  data: InsertSuperIntentResponse
): Promise<SuperIntentResponse> {
  const results = await db
    .insert(superIntentResponses)
    .values(data as any)
    .returning();
  return results[0];
}

// Update super intent response
export async function updateSuperIntent(
  id: number,
  data: Partial<InsertSuperIntentResponse>
): Promise<SuperIntentResponse | null> {
  const results = await db
    .update(superIntentResponses)
    .set({
      ...data,
      updatedAt: new Date(),
    } as any)
    .where(eq(superIntentResponses.id, id))
    .returning();
  return results[0] || null;
}

// Delete super intent response
export async function deleteSuperIntent(id: number): Promise<boolean> {
  const results = await db
    .delete(superIntentResponses)
    .where(eq(superIntentResponses.id, id))
    .returning();
  return results.length > 0;
}

// Delete all topics for a super_intent
export async function deleteSuperIntentByName(superIntent: string): Promise<boolean> {
  const results = await db
    .delete(superIntentResponses)
    .where(eq(superIntentResponses.superIntent, superIntent))
    .returning();
  return results.length > 0;
}

// Upsert super intent response (insert if not exists, update if exists)
export async function upsertSuperIntent(
  data: InsertSuperIntentResponse
): Promise<SuperIntentResponse> {
  const existing = await db
    .select()
    .from(superIntentResponses)
    .where(
      and(
        eq(superIntentResponses.superIntent, data.superIntent),
        eq(superIntentResponses.topic, data.topic)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update
    const results = await db
      .update(superIntentResponses)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(eq(superIntentResponses.id, existing[0].id))
      .returning();
    return results[0];
  } else {
    // Insert
    const results = await db
      .insert(superIntentResponses)
      .values(data as any)
      .returning();
    return results[0];
  }
}

// Search super intents by topic or ui_name
export async function searchSuperIntents(query: string): Promise<SuperIntentResponse[]> {
  return await db
    .select()
    .from(superIntentResponses)
    .where(
      or(
        like(superIntentResponses.topic, `%${query}%`),
        like(superIntentResponses.uiName, `%${query}%`),
        like(superIntentResponses.superIntent, `%${query}%`)
      )
    );
}

// Get responses with language support
export async function getSuperIntentWithLanguage(
  superIntent: string,
  topic: string,
  language: "en" | "ceb" = "en"
): Promise<{ text: string; imageUrls: string[]; mapData?: any; pins?: any[]; routes?: any[] } | null> {
  const response = await getSuperIntentTopic(superIntent, topic);
  if (!response) return null;

  const texts = language === "ceb" ? response.responsesCeb : response.responsesEn;
  const text = texts?.join("\n") || "";

  return {
    text,
    imageUrls: (response.imageUrls || []).filter(url => url && url.trim()),
    mapData: response.mapData,
    pins: response.pins || [],
    routes: response.routes || [],
  };
}
