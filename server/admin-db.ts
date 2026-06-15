/**
 * Admin service using PostgreSQL as data source
 * Replaces JSON file operations with database queries
 */

import type { ResponseData, Location, ApiResponse, UserPrivileges } from '../client/src/types/admin.js';
import * as dbResponses from './db/responses.js';
import * as dbLocations from './db/locations.js';
import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const PRIVILEGES_FILE = path.join(DATA_DIR, 'user_privileges.json');

const DEFAULT_PRIVILEGES: UserPrivileges = {
  chatEnabled: true,
  audioInputEnabled: true,
  mapAccessEnabled: true,
  autoTranslateEnabled: true
};

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Get all responses from database
export async function getResponses(): Promise<ResponseData[]> {
  try {
    const dbResults = await dbResponses.getAllResponses();
    
    // Transform database format to ResponseData format
    return dbResults.map(row => ({
      intent: row.intent,
      category: row.category || '',
      sub_category: row.subCategory || '',
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
    console.error('Error fetching responses from database:', error);
    return [];
  }
}

// Save responses to database
export async function saveResponses(responses: ResponseData[]): Promise<boolean> {
  try {
    for (const response of responses) {
      await upsertResponse(response);
    }
    return true;
  } catch (error) {
    console.error('Error saving responses to database:', error);
    return false;
  }
}

// Get all locations from database
export async function getLocations(): Promise<Location[]> {
  try {
    const dbResults = await dbLocations.getAllLocations();
    
    // Transform database format to Location format
    return dbResults.map(row => ({
      id: row.name,
      name: row.name,
      coordinates: row.coordinates as [number, number],
      mapImage: row.mapId || 'main_map',
      type: row.type,
      building: row.building,
      floor: row.floor,
      pins: (row.pins || []).map((p: any) => ({
        name: p.name,
        coordinates: p.coordinates as [number, number],
      })),
      responses: {
        en: row.responsesEn || [],
        ceb: row.responsesCeb || [],
      },
      imageUrls: row.imageUrls || [],
    }));
  } catch (error) {
    console.error('Error fetching locations from database:', error);
    return [];
  }
}

// User privileges still use JSON file (separate from responses data)
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

// Add or update a response in JSON file
export async function upsertResponse(responseData: ResponseData): Promise<ApiResponse> {
  try {
    // Read current responses from JSON file
    const responses = await getResponses();
    
    // Find if response already exists
    const idx = responses.findIndex(r => r.intent === responseData.intent);
    
    if (idx >= 0) {
      // Update existing response
      responses[idx] = responseData;
    } else {
      // Add new response
      responses.push(responseData);
    }
    
    // Write back to JSON file
    await saveResponsesToFile(responses);

    return {
      success: true,
      message: 'Response saved successfully',
      data: responseData
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error saving response: ' + error
    };
  }
}

// Write responses directly to JSON file
async function saveResponsesToFile(responses: ResponseData[]): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const RESPONSES_FILE = path.join(PROJECT_ROOT, 'rasa', 'actions', 'responses.json');
  
  await fs.writeFile(RESPONSES_FILE, JSON.stringify(responses, null, 2), 'utf-8');
}

// Delete a response from database
export async function deleteResponse(intent: string): Promise<ApiResponse> {
  try {
    // Note: dbResponses.deleteResponse doesn't exist yet - we can add it if needed
    // For now, return disabled message
    return {
      success: false,
      message: 'Deleting intents is disabled.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error deleting response: ' + error
    };
  }
}

// Add or update a location in database
export async function upsertLocation(location: Location): Promise<ApiResponse> {
  try {
    const key = String(location?.id || location?.name || '').trim();
    if (!key) {
      return { success: false, message: 'Location id/name is required' };
    }

    const dbData = {
      name: key,
      type: location.type || '',
      building: location.building || '',
      floor: location.floor || 'N/A',
      coordinates: location.coordinates || [500, 500],
      mapId: location.mapImage || 'main_map',
      responsesEn: location.responses?.en || [],
      responsesCeb: location.responses?.ceb || [],
      pins: (location.pins || []).map(p => ({
        name: p.name,
        coordinates: p.coordinates,
      })),
      imageUrls: location.imageUrls || [],
    };

    await dbLocations.upsertLocation(dbData);

    return {
      success: true,
      message: 'Location saved successfully',
      data: location
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error saving location: ' + error
    };
  }
}

// Delete a location from database
export async function deleteLocation(id: string): Promise<ApiResponse> {
  try {
    const success = await dbLocations.deleteLocation(id);
    return {
      success,
      message: success ? 'Location deleted successfully' : 'Location not found'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error deleting location: ' + error
    };
  }
}

// Export database services for direct use
export { dbResponses, dbLocations };
