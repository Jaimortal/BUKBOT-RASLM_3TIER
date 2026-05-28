/**
 * Script to add floor information to all location pins in responses_location.json
 * Converts floor descriptions (e.g., "3rd Floor") to short codes (e.g., "3F")
 */

import * as fs from "fs";
import * as path from "path";

// Helper function to convert floor description to short code
function floorToShortCode(floorDesc: string): string {
  if (!floorDesc) return "";
  
  const normalized = floorDesc.toLowerCase().trim();
  
  if (normalized.includes("ground")) return "GF";
  if (normalized.includes("basement")) return "BS";
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
    const filePath = path.join(
      process.cwd(),
      "rasa/actions/responses_location.json"
    );

    console.log(`Reading ${filePath}...`);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    let updatedCount = 0;
    let locationCount = 0;

    // Iterate through all locations
    for (const [locationName, location] of Object.entries(data.locations)) {
      locationCount++;
      const floorDesc = (location as any).floor;
      
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
      const pins = (location as any).pins;
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
