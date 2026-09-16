/**
 * Migration script to import responses and canonical location knowledge to PostgreSQL.
 * 
 * Usage:
 *   npx tsx scripts/migrate-responses-to-pg.ts
 * 
 * This script will:
 * 1. Read responses.json and import to bot_responses table
 * 2. Read responses_location_core.json and import to location_responses table
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { botResponses, locationResponses } from "../shared/schema";

// Load environment variables
dotenv.config();

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/chatbot",
});

const db = drizzle(pool);

// Types based on JSON structure
interface ResponseItem {
  intent: string;
  category?: string;
  sub_category?: string;
  responses: {
    answer?: string[] | { en?: string[]; ceb?: string[] };
    follow_up?: string[];
    context_slots?: Record<string, string>;
    imageUrl?: string;
    imageUrls?: string[];
    mapData?: {
      locationName?: string;
      coordinates?: number[];
      mapId?: string;
    };
  };
  metadata?: {
    source?: string;
    author?: string;
  };
}

interface LocationItem {
  type: string;
  building: string;
  floor: string;
  coordinates: number[];
  map_id: string;
  responses: {
    en?: string[];
    ceb?: string[];
  };
  pins?: { name: string; coordinates: number[] }[];
  imageUrls?: string[];
}

interface LocationData {
  locations: Record<string, LocationItem>;
}

async function migrateResponses() {
  console.log("🚀 Starting migration...");

  try {
    // Read responses.json
    const responsesPath = path.join(__dirname, "../rasa/actions/responses.json");
    console.log(`Reading from: ${responsesPath}`);
    
    if (!fs.existsSync(responsesPath)) {
      console.error(`File not found: ${responsesPath}`);
      return;
    }
    
    const responsesData: ResponseItem[] = JSON.parse(fs.readFileSync(responsesPath, "utf-8"));
    console.log(`📄 Loaded ${responsesData.length} responses from responses.json`);

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log("Clearing existing bot_responses data...");
    await db.delete(botResponses);
    console.log("🧹 Cleared existing bot_responses data");

    // Insert responses
    let insertedCount = 0;
    for (const item of responsesData) {
      console.log(`Inserting: ${item.intent}`);
      
      const answer = item.responses?.answer;
      let answerEn: string[] = [];
      let answerCeb: string[] = [];
      let simpleAnswer: string[] = [];

      if (Array.isArray(answer)) {
        // Simple array format
        simpleAnswer = answer;
      } else if (typeof answer === "object" && answer !== null) {
        // Multilingual format
        answerEn = answer.en || [];
        answerCeb = answer.ceb || [];
      }

      await db.insert(botResponses).values({
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
      });
      insertedCount++;
      
      if (insertedCount % 10 === 0) {
        console.log(`  Progress: ${insertedCount}/${responsesData.length}`);
      }
    }

    console.log(`✅ Inserted ${insertedCount} responses into bot_responses table`);

  } catch (error) {
    console.error("❌ Error migrating responses:", error);
    throw error;
  }
}

async function migrateLocationResponses() {
  console.log("🚀 Starting location migration...");
  
  try {
    // Read the canonical location knowledge source.
    const locationsPath = path.join(__dirname, "../rasa/actions/knowledge/location/responses_location_core.json");
    console.log(`Reading from: ${locationsPath}`);
    
    if (!fs.existsSync(locationsPath)) {
      console.error(`File not found: ${locationsPath}`);
      return;
    }
    
    const locationData: LocationData = JSON.parse(fs.readFileSync(locationsPath, "utf-8"));

    const locations = locationData.locations;
    const locationNames = Object.keys(locations);

    console.log(`📄 Loaded ${locationNames.length} locations from responses_location_core.json`);

    // Clear existing data
    console.log("Clearing existing location_responses data...");
    await db.delete(locationResponses);
    console.log("🧹 Cleared existing location_responses data");

    // Insert location responses
    let insertedCount = 0;
    for (const [name, data] of Object.entries(locations)) {
      await db.insert(locationResponses).values({
        name,
        type: data.type,
        building: data.building,
        floor: data.floor,
        coordinates: data.coordinates,
        mapId: data.map_id,
        responsesEn: data.responses?.en || [],
        responsesCeb: data.responses?.ceb || [],
        pins: data.pins || [],
        imageUrls: data.imageUrls || [],
      });
      insertedCount++;
    }

    console.log(`✅ Inserted ${insertedCount} locations into location_responses table`);

  } catch (error) {
    console.error("❌ Error migrating location responses:", error);
    throw error;
  }
}

async function verifyMigration() {
  console.log("\n📊 Verification:");

  // Count bot_responses
  const botResponseCount = await db.select({ count: botResponses.id }).from(botResponses);
  console.log(`   - bot_responses table: ${botResponseCount.length} rows`);

  // Count location_responses
  const locationResponseCount = await db.select({ count: locationResponses.id }).from(locationResponses);
  console.log(`   - location_responses table: ${locationResponseCount.length} rows`);
}

async function main() {
  try {
    console.log("🔄 Connecting to database...");
    await pool.query("SELECT 1"); // Test connection
    console.log("✅ Database connected\n");

    // Run migrations
    await migrateResponses();
    console.log("");
    await migrateLocationResponses();

    // Verify
    await verifyMigration();

    console.log("\n🎉 Migration completed successfully!");
    console.log("\nYou can now view the data in pgAdmin:");
    console.log("  - Table: bot_responses (data from responses.json)");
    console.log("  - Table: location_responses (data from responses_location_core.json)");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly (ES module detection)
try {
  const modulePath = import.meta.url.replace('file:///', '').replace(/\//g, '\\');
  const isMainModule = process.argv[1].includes('migrate-responses-to-pg');
  
  if (isMainModule) {
    console.log("Script starting...");
    main().catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
  }
} catch (e) {
  // Not main module
}

export { migrateResponses, migrateLocationResponses };
