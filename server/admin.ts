import { promises as fs } from 'fs';
import path from 'path';
import type { ResponseData, Location, ApiResponse, UserPrivileges } from '../client/src/types/admin';
import * as dbResponses from './db/responses.js';
import * as dbLocations from './db/locations.js';
import { deleteImage } from './db/images.js';
import { upsertResponse } from './admin-db.js';
import { backupJsonFile } from './utils/jsonBackup.js';

const PROJECT_ROOT = process.cwd();

const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const RESPONSES_FILE = path.join(PROJECT_ROOT, 'rasa', 'actions', 'responses.json');
const RESPONSES_LOCATION_CORE_FILE = path.join(PROJECT_ROOT, 'rasa', 'actions', 'knowledge', 'location', 'responses_location_core.json');
const PRIVILEGES_FILE = path.join(DATA_DIR, 'user_privileges.json');
const MAP_SETTINGS_FILE = path.join(DATA_DIR, 'map_settings.json');
const ROUTE_COLORS = ["#ff1744", "#ffea00", "#00b0ff", "#00e676", "#d500f9", "#ff9100", "#00e5ff", "#76ff03"];
let locationFileCache: { mtimeMs: number; size: number; data: LocationFileShape } | null = null;

export interface MapData {
  id: string;
  url: string;
  active: boolean;
  name?: string;
}

export interface MapSettings {
  maps: MapData[];
}

const DEFAULT_MAP_SETTINGS: MapSettings = {
  maps: [
    {
      id: "default_map",
      url: "/nobackHD.png",
      active: true,
      name: "Default Map (Local)"
    }
  ]
};

export async function getMapSettings(): Promise<MapSettings> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(MAP_SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_MAP_SETTINGS,
      ...(parsed || {})
    };
  } catch (error) {
    return { ...DEFAULT_MAP_SETTINGS };
  }
}

export async function saveMapSettings(settings: MapSettings): Promise<boolean> {
  try {
    await ensureDataDir();
    await backupJsonFile(MAP_SETTINGS_FILE, 'map-settings');
    await fs.writeFile(MAP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving map settings:', error);
    return false;
  }
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

const DEFAULT_PRIVILEGES: UserPrivileges = {
  chatEnabled: true,
  audioInputEnabled: true,
  mapAccessEnabled: true,
  autoTranslateEnabled: true
};

// Read responses from JSON file (primary source)
export async function getResponses(): Promise<ResponseData[]> {
  try {
    const data = await fs.readFile(RESPONSES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error reading responses.json:', error);
    return [];
  }
}

// Write responses to database (primary source)
export async function saveResponses(responses: ResponseData[]): Promise<boolean> {
  try {
    await backupJsonFile(RESPONSES_FILE, 'responses');
    await fs.writeFile(RESPONSES_FILE, JSON.stringify(responses, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving responses.json:', error);
    return false;
  }
}

export type LocationFileShape = {
  locations: Record<
    string,
    {
      type?: string;
      building?: string;
      floor?: string;
      coordinates?: [number, number];
      map_id?: string;
      responses?: {
        en?: string[];
        ceb?: string[];
      };
      pins?: Array<{
        name: string;
        coordinates: [number, number];
        floor?: string;
        access?: string;
        pinType?: string;
        pinImageUrl?: string;
        pinImageAlt?: string;
      }>;
      imageUrls?: string[];
      images?: string[];
      routes?: Array<{
        name: string;
        points: [number, number][];
        color: string;
        route_order: number;
        route_label: string;
      }>;
    }
  >;
};

function normalizeRoutes(routes: any[]): Array<{ name: string; points: [number, number][]; color: string; route_order: number; route_label: string }> {
  return (Array.isArray(routes) ? routes : []).map((r: any, index: number) => ({
    name: String(r?.name || `Route ${index + 1}`),
    points: Array.isArray(r?.points) ? r.points : [],
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    route_order: Number(r?.route_order) || index + 1,
    route_label: String(r?.route_label || `Route ${index + 1}`),
  }));
}

async function readLocationFile(): Promise<LocationFileShape> {
  try {
    const stat = await fs.stat(RESPONSES_LOCATION_CORE_FILE);
    if (locationFileCache?.mtimeMs === stat.mtimeMs && locationFileCache.size === stat.size) {
      return locationFileCache.data;
    }
    const data = await fs.readFile(RESPONSES_LOCATION_CORE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && parsed.locations && typeof parsed.locations === 'object') {
      locationFileCache = { mtimeMs: stat.mtimeMs, size: stat.size, data: parsed as LocationFileShape };
      return locationFileCache.data;
    }
  } catch (error) {
    console.error(`Error reading location file ${RESPONSES_LOCATION_CORE_FILE}:`, error);
  }
  return { locations: {} };
}

async function writeLocationFile(next: LocationFileShape): Promise<boolean> {
  try {
    let base: any = {};
    try {
      const current = await fs.readFile(RESPONSES_LOCATION_CORE_FILE, 'utf-8');
      const parsed = JSON.parse(current);
      if (parsed && typeof parsed === 'object') {
        base = parsed;
      }
    } catch {
      // A valid location payload can initialize the core file if it is missing.
    }

    const merged = {
      ...base,
      locations: next.locations || {},
    };

    await backupJsonFile(RESPONSES_LOCATION_CORE_FILE, 'locations');
    await fs.writeFile(RESPONSES_LOCATION_CORE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    locationFileCache = null;
    return true;
  } catch (error) {
    console.error('Error saving location core file:', error);
    return false;
  }
}

// Read locations from the canonical structured knowledge source.
export async function getLocations(): Promise<Location[]> {
  try {
    const file = await readLocationFile();
    const locationsMap = file.locations || {};
    return Object.entries(locationsMap).map(([name, value]) => {
      const coordsRaw: any = (value as any)?.coordinates;
      const coords: [number, number] | [] =
        Array.isArray(coordsRaw) && coordsRaw.length === 2
          ? [Number(coordsRaw[0]), Number(coordsRaw[1])]
          : (Array.isArray(coordsRaw) && coordsRaw.length === 0 ? [] : [500, 500]);

      const pinsRaw: any = (value as any)?.pins;
      const pins: Array<{
        name: string;
        coordinates: [number, number];
        floor?: string;
        access?: string;
        pinType?: string;
        pinImageUrl?: string;
        pinImageAlt?: string;
      }> = Array.isArray(pinsRaw)
        ? pinsRaw
            .map((p: any, idx: number) => {
              const c: any = p?.coordinates;
              const tuple: [number, number] = Array.isArray(c) && c.length === 2
                ? [Number(c[0]), Number(c[1])]
                : (Array.isArray(coords) && coords.length === 2 ? coords : [500, 500]);
              const n = String(p?.name || "").trim() || `Pin ${idx + 1}`;
              const floor = p?.floor ? String(p.floor) : undefined;
              const access = p?.access ? String(p.access) : undefined;
              const pinType = p?.pinType ? String(p.pinType) : undefined;
              const pinImageUrl = p?.pinImageUrl ? String(p.pinImageUrl) : (p?.altImageUrl ? String(p.altImageUrl) : undefined);
              const pinImageAlt = p?.pinImageAlt ? String(p.pinImageAlt) : undefined;
              return {
                name: n,
                coordinates: tuple,
                ...(floor ? { floor } : {}),
                ...(access ? { access } : {}),
                ...(pinType ? { pinType } : {}),
                ...(pinImageUrl ? { pinImageUrl } : {}),
                ...(pinImageAlt ? { pinImageAlt } : {})
              };
            })
            .filter((p: any) => Array.isArray(p.coordinates) && p.coordinates.length === 2)
        : [];
      const mapId = (value as any)?.map_id || (value as any)?.mapId || 'main_map';

      const imageUrls = Array.isArray((value as any)?.imageUrls)
        ? (value as any).imageUrls.map((s: any) => String(s)).filter(Boolean)
        : [];

      const responsesRaw: any = (value as any)?.responses;
      const responses =
        responsesRaw && typeof responsesRaw === 'object'
          ? {
              en: Array.isArray(responsesRaw?.en) ? responsesRaw.en : [],
              ceb: Array.isArray(responsesRaw?.ceb) ? responsesRaw.ceb : [],
            }
          : { en: [], ceb: [] };

      return {
        id: name,
        name,
        coordinates: coords,
        mapImage: mapId,
        type: (value as any)?.type,
        building: (value as any)?.building,
        floor: (value as any)?.floor,
        pins,
        responses,
        imageUrls,
        routes: normalizeRoutes((value as any)?.routes),
      };
    });
  } catch (error) {
    console.error('Error reading locations:', error);
    return [];
  }
}

export async function getLocationSummaries(): Promise<Array<Location & {
  responsePreview: string;
  imageCount: number;
  pinCount: number;
  routeCount: number;
  hasMap: boolean;
}>> {
  const locations = await getLocations();
  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    mapImage: location.mapImage,
    type: location.type,
    building: location.building,
    floor: location.floor,
    responsePreview: (location.responses?.en?.find(Boolean) || location.responses?.ceb?.find(Boolean) || '').slice(0, 240),
    imageCount: location.imageUrls?.length || 0,
    pinCount: location.pins?.length || 0,
    routeCount: location.routes?.length || 0,
    hasMap: Boolean((location.coordinates?.length === 2) || location.pins?.length || location.routes?.length),
  }));
}

export async function getLocationById(id: string): Promise<Location | null> {
  const locations = await getLocations();
  const normalized = String(id || '').trim().toLowerCase();
  return locations.find((location) => location.id.toLowerCase() === normalized || location.name.toLowerCase() === normalized) || null;
}

// Lightweight public version — returns only name, coordinates, pins, routes, building (no response text)
export async function getMapLocationsList(): Promise<Array<{
  name: string;
  coordinates: [number, number] | [];
  building: string;
  pins: Array<{
    name: string;
    coordinates: [number, number];
    floor?: string;
    access?: string;
    pinType?: string;
    pinImageUrl?: string;
    pinImageAlt?: string;
  }>;
  routes: Array<{ name: string; points: [number, number][]; color?: string }>;
}>> {
  try {
    const file = await readLocationFile();
    const locationsMap = file.locations || {};
    return Object.entries(locationsMap).map(([name, value]) => {
      const coordsRaw: any = (value as any)?.coordinates;
      const coords: [number, number] | [] =
        Array.isArray(coordsRaw) && coordsRaw.length === 2
          ? [Number(coordsRaw[0]), Number(coordsRaw[1])]
          : (Array.isArray(coordsRaw) && coordsRaw.length === 0 ? [] : [500, 500]);

      const pinsRaw: any = (value as any)?.pins;
      const pins = Array.isArray(pinsRaw)
        ? pinsRaw
            .map((p: any, idx: number) => {
              const c: any = p?.coordinates;
              const tuple: [number, number] | null = Array.isArray(c) && c.length === 2
                ? [Number(c[0]), Number(c[1])]
                : null;
              if (!tuple) return null;
              const floor = p?.floor ? String(p.floor) : undefined;
              const access = p?.access ? String(p.access) : undefined;
              const pinType = p?.pinType ? String(p.pinType) : undefined;
              const pinImageUrl = p?.pinImageUrl ? String(p.pinImageUrl) : (p?.altImageUrl ? String(p.altImageUrl) : undefined);
              const pinImageAlt = p?.pinImageAlt ? String(p.pinImageAlt) : undefined;
              return {
                name: String(p?.name || "").trim() || `Pin ${idx + 1}`,
                coordinates: tuple,
                ...(floor ? { floor } : {}),
                ...(access ? { access } : {}),
                ...(pinType ? { pinType } : {}),
                ...(pinImageUrl ? { pinImageUrl } : {}),
                ...(pinImageAlt ? { pinImageAlt } : {})
              };
            })
            .filter(Boolean) as Array<{
              name: string;
              coordinates: [number, number];
              floor?: string;
              access?: string;
              pinType?: string;
              pinImageUrl?: string;
              pinImageAlt?: string;
            }>
        : [];

      const routes = normalizeRoutes((value as any)?.routes);

      const building = String((value as any)?.building || "").trim() || "Other";

      return { name, coordinates: coords, building, pins, routes };
    });
  } catch (error) {
    console.error('Error reading map locations list:', error);
    return [];
  }
}

export async function getUserPrivileges(): Promise<UserPrivileges> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(PRIVILEGES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_PRIVILEGES,
      ...(parsed || {})
    };
  } catch (error) {
    return { ...DEFAULT_PRIVILEGES };
  }
}

export async function saveUserPrivileges(privileges: UserPrivileges): Promise<boolean> {
  try {
    await ensureDataDir();
    await backupJsonFile(PRIVILEGES_FILE, 'settings');
    await fs.writeFile(PRIVILEGES_FILE, JSON.stringify(privileges, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving user privileges:', error);
    return false;
  }
}

export async function upsertUserPrivileges(privileges: UserPrivileges): Promise<ApiResponse> {
  try {
    const success = await saveUserPrivileges(privileges);
    return {
      success,
      message: success ? 'Privileges saved successfully' : 'Failed to save privileges',
      data: privileges
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error saving privileges: ' + error
    };
  }
}

// Add or update a location
export async function upsertLocation(location: Location): Promise<ApiResponse> {
  try {
    const file = await readLocationFile();
    const key = String(location?.id || location?.name || '').trim();
    if (!key) {
      return { success: false, message: 'Location id/name is required' };
    }

    const next = { ...(file.locations || {}) } as any;
    const existing = next[key] || {};

    const nextResponses = {
      en: Array.isArray((location as any)?.responses?.en) ? (location as any).responses.en : (existing.responses?.en || []),
      ceb: Array.isArray((location as any)?.responses?.ceb) ? (location as any).responses.ceb : (existing.responses?.ceb || []),
    };

    const nextImageUrls: string[] = Array.isArray((location as any)?.imageUrls)
      ? (location as any).imageUrls.map((s: any) => String(s).trim()).filter(Boolean)
      : (Array.isArray(existing.imageUrls) ? existing.imageUrls : []);

    // Check if images were removed
    const oldImages = Array.isArray(existing.imageUrls) ? existing.imageUrls : [];
    const removedImages = oldImages.filter((url: any) => !nextImageUrls.includes(url));
    for (const url of removedImages) {
      if (typeof url === 'string' && url.startsWith('/api/images/')) {
        const id = url.split('/').pop();
        if (id) {
          console.log(`[Database Sync] Deleting image ${id} removed from location ${key}`);
          await deleteImage(id).catch(err => console.error("Failed to delete image from DB:", err));
        }
      }
    }

    const pinsRaw: any = (location as any)?.pins;
    const pinsProvided = Object.prototype.hasOwnProperty.call((location as any) || {}, 'pins');
    const nextPins = Array.isArray(pinsRaw)
      ? pinsRaw
          .map((p: any, idx: number) => {
            const name = String(p?.name || "").trim() || `Pin ${idx + 1}`;
            const c: any = p?.coordinates;
            const coords: [number, number] | null = Array.isArray(c) && c.length === 2
              ? [Number(c[0]), Number(c[1])]
              : null;
            if (!coords) return null;
            const floor = p?.floor ? String(p.floor) : undefined;
            const access = p?.access ? String(p.access) : undefined;
            const pinType = p?.pinType ? String(p.pinType) : undefined;
            const pinImageUrl = p?.pinImageUrl ? String(p.pinImageUrl) : (p?.altImageUrl ? String(p.altImageUrl) : undefined);
            const pinImageAlt = p?.pinImageAlt ? String(p.pinImageAlt) : undefined;
            return {
              name,
              coordinates: coords,
              ...(floor ? { floor } : {}),
              ...(access ? { access } : {}),
              ...(pinType ? { pinType } : {}),
              ...(pinImageUrl ? { pinImageUrl } : {}),
              ...(pinImageAlt ? { pinImageAlt } : {})
            };
          })
          .filter(Boolean)
      : (Array.isArray(existing.pins) ? existing.pins : []);

    const coordsProvided = Object.prototype.hasOwnProperty.call((location as any) || {}, 'coordinates');
    const coordsRaw: any = (location as any)?.coordinates;
    const nextCoords: any =
      Array.isArray(coordsRaw) && coordsRaw.length === 2
        ? [Number(coordsRaw[0]), Number(coordsRaw[1])]
        : (coordsProvided && Array.isArray(coordsRaw) && coordsRaw.length === 0
            ? []
            : (Array.isArray(existing.coordinates) && existing.coordinates.length === 2
                ? [Number(existing.coordinates[0]), Number(existing.coordinates[1])]
                : [500, 500]));

    const coordsFromPins: [number, number] | null = Array.isArray(nextPins) && nextPins.length > 0
      ? ([Number(nextPins[0].coordinates[0]), Number(nextPins[0].coordinates[1])] as [number, number])
      : null;

    const nextRoutes = normalizeRoutes(
      Array.isArray((location as any)?.routes)
        ? (location as any).routes
        : (Array.isArray(existing.routes) ? existing.routes : [])
    );

    next[key] = {
      ...existing,
      type: (location as any)?.type || existing.type,
      building: (location as any)?.building || existing.building,
      floor: (location as any)?.floor || existing.floor,
      coordinates: coordsFromPins || nextCoords,
      pins: pinsProvided ? nextPins : (Array.isArray(existing.pins) ? existing.pins : nextPins),
      map_id: location.mapImage || existing.map_id || existing.mapId || 'main_map',
      responses: nextResponses,
      imageUrls: nextImageUrls,
      routes: nextRoutes,
    };

    // Remove old redundant keys if they exist
    delete next[key].coordinate; 

    const success = await writeLocationFile({ locations: next });
    return {
      success,
      message: success ? 'Location saved successfully' : 'Failed to save location',
      data: location
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error saving location: ' + error
    };
  }
}

// Delete a location
export async function deleteLocation(id: string): Promise<ApiResponse> {
  try {
    const file = await readLocationFile();
    const key = String(id || '').trim();
    if (!key) {
      return { success: false, message: 'Location id is required' };
    }

    const next = { ...(file.locations || {}) } as any;
    if (!next[key]) {
      return { success: false, message: 'Location not found' };
    }

    const existing = next[key];
    const imagesToPurge = Array.isArray(existing.imageUrls) ? existing.imageUrls : [];
    
    // Purge images from DB
    for (const url of imagesToPurge) {
      if (typeof url === 'string' && url.startsWith('/api/images/')) {
        const id = url.split('/').pop();
        if (id) {
          console.log(`[Database Sync] Deleting image ${id} associated with deleted location ${key}`);
          await deleteImage(id).catch(err => console.error("Failed to delete image from DB:", err));
        }
      }
    }

    delete next[key];
    const success = await writeLocationFile({ locations: next });
    return {
      success,
      message: success ? 'Location deleted successfully' : 'Failed to delete location'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error deleting location: ' + error
    };
  }
}
