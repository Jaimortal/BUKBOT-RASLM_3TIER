import { db } from "../db.js";
import { botResponses, locationResponses, superIntentResponses, migrationTracking } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Production-ready path resolution
function resolveJsonPath(relativePath: string): string | null {
  if (process.env.RASA_ACTIONS_PATH) {
    const envPath = path.join(process.env.RASA_ACTIONS_PATH, relativePath);
    if (fs.existsSync(envPath)) return envPath;
  }

  const cwdPath = path.join(process.cwd(), "rasa/actions", relativePath);
  if (fs.existsSync(cwdPath)) return cwdPath;

  const possiblePaths = [
    path.join(process.cwd(), "rasa/actions", relativePath),
    path.join("/app", "rasa/actions", relativePath),
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) return testPath;
  }

  return cwdPath;
}

const RESPONSES_JSON_PATH = resolveJsonPath("responses.json");
const LOCATIONS_JSON_PATH = resolveJsonPath("knowledge/location/responses_location_core.json");
const KNOWLEDGE_DIR = resolveJsonPath("knowledge");

export interface MigrationResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
  skipped?: boolean;
}

/**
 * Helper to check if a file should be migrated based on mtime
 */
async function shouldMigrate(filePath: string): Promise<{ should: boolean, currentMtime: number, version: number }> {
  if (!fs.existsSync(filePath)) {
    console.log(`[Migration] File not found: ${filePath}`);
    return { should: false, currentMtime: 0, version: 0 };
  }
  
  const stats = fs.statSync(filePath);
  const currentMtime = Math.round(stats.mtimeMs); // Use round to avoid sub-millisecond drift
  const fileName = path.basename(filePath);
  
  const existing = await db.select().from(migrationTracking).where(eq(migrationTracking.fileName, fileName)).limit(1);
  
  if (existing.length === 0) {
    console.log(`[Migration] First time sync for ${fileName}`);
    return { should: true, currentMtime, version: 1 };
  }
  
  const record = existing[0];
  const should = currentMtime > record.lastMtime;
  console.log(`[Migration] File: ${fileName}, current: ${currentMtime}, last: ${record.lastMtime}, should: ${should}`);
  return { should, currentMtime, version: should ? record.version + 1 : record.version };
}

/**
 * Helper to update migration tracking record
 */
async function updateMigrationRecord(filePath: string, mtime: number, version: number) {
  const fileName = path.basename(filePath);
  await db.insert(migrationTracking).values({
    fileName,
    lastMtime: mtime,
    version,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: migrationTracking.fileName,
    set: {
      lastMtime: mtime,
      version,
      updatedAt: new Date()
    }
  });
}

/**
 * Migrate bot responses from responses.json to PostgreSQL
 */
export async function migrateResponsesFromJSON(force: boolean = false): Promise<MigrationResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    if (!RESPONSES_JSON_PATH || !fs.existsSync(RESPONSES_JSON_PATH)) {
      return { success: false, message: "responses.json not found", imported: 0, errors: ["Missing file"] };
    }

    const check = await shouldMigrate(RESPONSES_JSON_PATH);
    if (!check.should && !force) {
      return { success: true, message: "Responses already up to date", imported: 0, errors: [], skipped: true };
    }

    const rawData = fs.readFileSync(RESPONSES_JSON_PATH, "utf-8");
    const responses = JSON.parse(rawData);

    if (!Array.isArray(responses)) {
      return { success: false, message: "Invalid JSON format: expected array", imported: 0, errors: ["Invalid format"] };
    }

    for (const item of responses) {
      try {
        const answer = item.responses?.answer;
        let answerEn: string[] | null = null;
        let answerCeb: string[] | null = null;
        let simpleAnswer: string[] | null = null;

        if (Array.isArray(answer)) {
          simpleAnswer = answer;
        } else if (answer && typeof answer === "object") {
          answerEn = answer.en || null;
          answerCeb = answer.ceb || null;
        }

        await db
          .insert(botResponses)
          .values({
            intent: item.intent,
            category: item.category || "",
            subCategory: item.sub_category || "",
            answerEn,
            answerCeb,
            answer: simpleAnswer,
            followUp: item.responses?.follow_up || [],
            contextSlots: item.responses?.context_slots || {},
            imageUrl: item.responses?.imageUrl || "",
            imageUrls: item.responses?.imageUrls || [],
            mapData: item.responses?.mapData || null,
            metadata: item.metadata || {},
          } as any)
          .onConflictDoUpdate({
            target: botResponses.intent,
            set: {
              category: item.category || "",
              subCategory: item.sub_category || "",
              answerEn,
              answerCeb,
              answer: simpleAnswer,
              followUp: item.responses?.follow_up || [],
              contextSlots: item.responses?.context_slots || {},
              imageUrl: item.responses?.imageUrl || "",
              imageUrls: item.responses?.imageUrls || [],
              mapData: item.responses?.mapData || null,
              metadata: item.metadata || {},
              updatedAt: new Date(),
            },
          });

        imported++;
      } catch (err) {
        errors.push(`Failed to import ${item.intent}: ${(err as Error).message}`);
      }
    }

    await updateMigrationRecord(RESPONSES_JSON_PATH, check.currentMtime, check.version);
    return { success: errors.length === 0, message: `Migrated ${imported} responses`, imported, errors };
  } catch (err) {
    return { success: false, message: `Migration failed: ${(err as Error).message}`, imported, errors };
  }
}

/**
 * Migrate locations from the canonical location knowledge JSON to PostgreSQL.
 */
export async function migrateLocationsFromJSON(force: boolean = false): Promise<MigrationResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    if (!LOCATIONS_JSON_PATH || !fs.existsSync(LOCATIONS_JSON_PATH)) {
      return { success: false, message: "responses_location_core.json not found", imported: 0, errors: ["Missing file"] };
    }

    const check = await shouldMigrate(LOCATIONS_JSON_PATH);
    if (!check.should && !force) {
      return { success: true, message: "Locations already up to date", imported: 0, errors: [], skipped: true };
    }

    const rawData = fs.readFileSync(LOCATIONS_JSON_PATH, "utf-8");
    const data = JSON.parse(rawData);
    const locationsList = data.locations;

    if (!locationsList || typeof locationsList !== "object") {
      return { success: false, message: "Invalid JSON format: expected locations object", imported: 0, errors: ["Invalid format"] };
    }

    for (const [name, locData] of Object.entries(locationsList)) {
      try {
        const location = locData as any;
        const insertData = {
          name: name,
          type: location.type || "",
          building: location.building || "",
          floor: location.floor || "N/A",
          coordinates: location.coordinates || [0, 0],
          mapId: location.map_id || "main_map",
          responsesEn: location.responses?.en || [],
          responsesCeb: location.responses?.ceb || [],
          pins: location.pins || [],
          imageUrls: location.imageUrls || [],
        };

        await db.delete(locationResponses).where(eq(locationResponses.name, name));
        await db.insert(locationResponses).values(insertData as any);
        imported++;
      } catch (err) {
        errors.push(`Failed to import ${name}: ${(err as Error).message}`);
      }
    }

    await updateMigrationRecord(LOCATIONS_JSON_PATH, check.currentMtime, check.version);
    return { success: errors.length === 0, message: `Migrated ${imported} locations`, imported, errors };
  } catch (err) {
    return { success: false, message: `Migration failed: ${(err as Error).message}`, imported, errors };
  }
}

function getAllJsonFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(filePath));
    } else if (file.endsWith('.json')) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Migrate all Super Intent JSON files to PostgreSQL
 */
export async function migrateSuperIntentsFromJSON(force: boolean = false): Promise<MigrationResult> {
  const errors: string[] = [];
  let imported = 0;
  let filesProcessed = 0;
  let filesSkipped = 0;

  try {
    if (!KNOWLEDGE_DIR || !fs.existsSync(KNOWLEDGE_DIR)) {
      return { success: false, message: "knowledge directory not found", imported: 0, errors: ["Missing directory"] };
    }

    const files = getAllJsonFiles(KNOWLEDGE_DIR);
    
    for (const filePath of files) {
      const file = path.basename(filePath);
      try {
        const check = await shouldMigrate(filePath);
        
        if (!check.should && !force) {
          filesSkipped++;
          continue;
        }

        const rawData = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(rawData);
        const superIntentKey = data.intent || file.replace('.json', '');

        if (Array.isArray(data.topics)) {
          for (const topic of data.topics) {
            if (!topic.topic) continue;

            const insertData = {
              superIntent: superIntentKey,
              topic: topic.topic,
              uiName: topic.ui_name || "",
              responsesEn: topic.responses?.en || [],
              responsesCeb: topic.responses?.ceb || [],
              imageUrls: topic.images || [],
              mapData: topic.map || null,
              pins: topic.pins || [],
              routes: topic.routes || [],
            };

            await db.delete(superIntentResponses).where(
              and(
                eq(superIntentResponses.superIntent, superIntentKey),
                eq(superIntentResponses.topic, topic.topic)
              )
            );
            
            await db.insert(superIntentResponses).values(insertData as any);
            imported++;
          }
        }
        
        await updateMigrationRecord(filePath, check.currentMtime, check.version);
        filesProcessed++;
      } catch (err) {
        errors.push(`File ${file}: ${(err as Error).message}`);
      }
    }

    const message = `Processed ${filesProcessed} files, skipped ${filesSkipped}. Total ${imported} topics imported.`;
    return { success: errors.length === 0, message, imported, errors };
  } catch (err) {
    return { success: false, message: `Super Intent Migration failed: ${(err as Error).message}`, imported, errors };
  }
}

/**
 * Perform full synchronization of all knowledge base files
 */
export async function syncKnowledgeBase(force: boolean = false): Promise<MigrationResult> {
  console.log(`[Migration] Starting sync (force: ${force})`);
  const results = {
    responses: await migrateResponsesFromJSON(force),
    locations: await migrateLocationsFromJSON(force),
    superIntents: await migrateSuperIntentsFromJSON(force),
  };

  const totalImported = results.responses.imported + results.locations.imported + results.superIntents.imported;
  const errors = [...results.responses.errors, ...results.locations.errors, ...results.superIntents.errors];
  
  const success = results.responses.success && results.locations.success && results.superIntents.success;
  
  console.log(`[Migration] Sync Summary: ${totalImported} imported, ${errors.length} errors`);
  
  let message = "Sync completed. ";
  if (totalImported === 0 && errors.length === 0) {
    message += "All data is already up to date.";
  } else {
    message += `Imported ${results.responses.imported} responses, ${results.locations.imported} locations, and ${results.superIntents.imported} super intent topics.`;
  }

  return { success, message, imported: totalImported, errors };
}

/**
 * Get migration status - counts and version info
 */
export async function getMigrationStatus(): Promise<{
  responsesCount: number;
  locationsCount: number;
  superIntentCount: number;
  tracking: any[];
}> {
  const responses = await db.select({ count: botResponses.id }).from(botResponses);
  const locationsList = await db.select({ count: locationResponses.id }).from(locationResponses);
  const superIntents = await db.select().from(superIntentResponses);
  const tracking = await db.select().from(migrationTracking);

  return {
    responsesCount: responses.length,
    locationsCount: locationsList.length,
    superIntentCount: superIntents.length,
    tracking
  };
}
