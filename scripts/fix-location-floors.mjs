/**
 * Script to add floor information to all canonical location pins.
 * Converts floor descriptions (e.g., "3rd Floor") to short codes (e.g., "3F")
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to convert floor description to short code
function floorToShortCode(floorDesc) {
  if (!floorDesc) return "";
  
  const normalized = floorDesc.toLowerCase().trim();
  
  // Handle "Ground Floor" variations
  if (normalized.includes("ground")) return "GF";
  
  // Handle "Basement" variations
  if (normalized.includes("basement")) return "BS";
  
  // Handle "First Floor" / "First" variations
  if (normalized.includes("first")) return "1F";
  
  // Handle "Second Floor" / "Second" variations
  if (normalized.includes("second")) return "2F";
  
  // Handle "Third Floor" / "Third" variations
  if (normalized.includes("third")) return "3F";
  
  // Handle "Fourth Floor" / "Fourth" variations
  if (normalized.includes("fourth")) return "4F";
  
  // Handle "Fifth Floor" / "Fifth" variations
  if (normalized.includes("fifth")) return "5F";
  
  // Handle numeric patterns like "2nd floor", "3rd floor", etc.
  if (normalized === "2nd floor" || normalized === "2") return "2F";
  if (normalized === "3rd floor" || normalized === "3") return "3F";
  if (normalized === "4th floor" || normalized === "4") return "4F";
  if (normalized === "5th floor" || normalized === "5") return "5F";
  
  // Try to extract number from patterns like "2nd", "3rd", "4th", "5th"
  const match = floorDesc.match(/(\d+)(st|nd|rd|th)?/);
  if (match) {
    return match[1] + "F";
  }
  
  return "";
}

// Main function
async function fixLocationFloors() {
  try {
    const filePath = path.join(__dirname, "../rasa/actions/knowledge/location/responses_location_core.json");

    console.log(`Reading ${filePath}...`);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    let updatedCount = 0;
    let locationCount = 0;

    // Iterate through all locations
    for (const [locationName, location] of Object.entries(data.locations)) {
      locationCount++;
      const floorDesc = location.floor;
      
      if (!floorDesc) {
        console.log(`⚠️  Skipping "${locationName}" - no floor property`);
        continue;
      }

      const shortFloorCode = floorToShortCode(floorDesc);
      if (!shortFloorCode) {
        console.log(
          `⚠️  Could not convert floor code for "${locationName}": ${floorDesc}`
        );
        continue;
      }

      // Add floor to pins
      const pins = location.pins;
      if (Array.isArray(pins)) {
        let addedFloorCount = 0;
        for (const pin of pins) {
          // Only add if the pin doesn't already have floor info
          if (pin && !pin.floor) {
            pin.floor = shortFloorCode;
            addedFloorCount++;
          }
        }

        if (addedFloorCount > 0) {
          console.log(
            `✅  "${locationName}" - Added floor "${shortFloorCode}" to ${addedFloorCount} pin(s)`
          );
          updatedCount++;
        }
      }
    }

    // Write updated JSON back
    console.log(`\nWriting updated file...`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${locationCount} locations`);
    console.log(`   Updated: ${updatedCount} locations`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixLocationFloors();
