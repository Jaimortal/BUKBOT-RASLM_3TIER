import { db } from "../db";
import { maps, routes, mapMarkers, type InsertMap, type InsertRoute, type InsertMapMarker } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function getAllMaps() {
  return await db.select().from(maps);
}

export async function getMapById(id: number) {
  const results = await db.select().from(maps).where(eq(maps.id, id));
  return results[0];
}

export async function upsertMap(mapData: any) {
  const { id, ...data } = mapData;
  if (id) {
    const results = await db.update(maps).set(data).where(eq(maps.id, id)).returning();
    return results[0];
  } else {
    const results = await db.insert(maps).values(data).returning();
    return results[0];
  }
}

export async function deleteMap(id: number) {
  await db.delete(routes).where(eq(routes.mapId, id));
  await db.delete(mapMarkers).where(eq(mapMarkers.mapId, id));
  const results = await db.delete(maps).where(eq(maps.id, id)).returning();
  return results.length > 0;
}

export async function getRoutesByMapId(mapId: number) {
  return await db.select().from(routes).where(eq(routes.mapId, mapId));
}

export async function upsertRoute(routeData: any) {
  const { id, ...data } = routeData;
  if (id) {
    const results = await db.update(routes).set(data).where(eq(routes.id, id)).returning();
    return results[0];
  } else {
    const results = await db.insert(routes).values(data).returning();
    return results[0];
  }
}

export async function deleteRoute(id: number) {
  const results = await db.delete(routes).where(eq(routes.id, id)).returning();
  return results.length > 0;
}

export async function getMarkersByMapId(mapId: number) {
  return await db.select().from(mapMarkers).where(eq(mapMarkers.mapId, mapId));
}

export async function upsertMarker(markerData: any) {
  const { id, ...data } = markerData;
  if (id) {
    const results = await db.update(mapMarkers).set(data).where(eq(mapMarkers.id, id)).returning();
    return results[0];
  } else {
    const results = await db.insert(mapMarkers).values(data).returning();
    return results[0];
  }
}

export async function deleteMarker(id: number) {
  const results = await db.delete(mapMarkers).where(eq(mapMarkers.id, id)).returning();
  return results.length > 0;
}
