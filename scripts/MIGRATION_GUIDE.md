# Database Migration Guide for Chatbot Responses

This guide explains how to migrate data from `responses.json` and `rasa/actions/knowledge/location/responses_location_core.json` to PostgreSQL.

## Files Created

1. **shared/schema.ts** - Updated with new tables:
   - `bot_responses` - Stores data from `responses.json`
   - `location_responses` - Stores data from `responses_location_core.json`

2. **scripts/create_response_tables.sql** - SQL file to create tables directly in pgAdmin

3. **scripts/migrate-responses-to-pg.ts** - TypeScript migration script to import JSON data

---

## Option 1: Using Drizzle Kit (Recommended)

### Step 1: Set Execution Policy (if needed)
If you get PowerShell execution policy errors, run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 2: Push Schema Changes
Run this command to push the schema changes to your database:
```bash
npm run db:push
```

Or with cross-env:
```bash
cross-env NODE_ENV=development drizzle-kit push
```

### Step 3: Run Migration Script
After the tables are created, run the migration script:
```bash
npx tsx scripts/migrate-responses-to-pg.ts
```

---

## Option 2: Using pgAdmin Directly (Alternative)

If Drizzle Kit doesn't work, you can create tables manually:

### Step 1: Open pgAdmin
1. Connect to your PostgreSQL server
2. Navigate to your database (e.g., `chatbot`)
3. Open Query Tool

### Step 2: Run SQL Script
1. Open `scripts/create_response_tables.sql`
2. Copy the entire content
3. Paste into pgAdmin Query Tool
4. Execute (F5 or click Execute button)

### Step 3: Verify Tables Created
Check that these tables exist:
- `bot_responses`
- `location_responses`

---

## Option 3: Using Command Prompt (cmd.exe)

If PowerShell is blocked, use Command Prompt:

```cmd
cd "c:\School Related File\3rd year\Capstone dev\Chatbot\Chatbot-v4-BUKSU"
npx drizzle-kit generate
npx drizzle-kit push
npx tsx scripts/migrate-responses-to-pg.ts
```

---

## Verification in pgAdmin

After migration, you should see:

### Tables:
1. **bot_responses** - Contains all responses from responses.json
   - Columns: id, intent, category, sub_category, answer_en, answer_ceb, answer, follow_up, context_slots, image_url, image_urls, map_data, metadata, created_at, updated_at

2. **location_responses** - Contains all locations from responses_location_core.json
   - Columns: id, name, type, building, floor, coordinates, map_id, responses_en, responses_ceb, pins, image_urls, created_at, updated_at

### Views (Optional):
- `vw_bot_responses_summary` - Quick summary of bot_responses
- `vw_location_responses_summary` - Quick summary of location_responses

---

## Sample Queries for Verification

### Count records:
```sql
SELECT COUNT(*) as total_responses FROM bot_responses;
SELECT COUNT(*) as total_locations FROM location_responses;
```

### View sample bot responses:
```sql
SELECT intent, category, sub_category, 
       jsonb_array_length(answer_en) as en_count,
       jsonb_array_length(answer_ceb) as ceb_count
FROM bot_responses 
LIMIT 10;
```

### View sample location responses:
```sql
SELECT name, type, building, floor, coordinates
FROM location_responses
LIMIT 10;
```

### Search by intent:
```sql
SELECT * FROM bot_responses WHERE intent = 'about_ict';
```

### Search by location name:
```sql
SELECT * FROM location_responses WHERE name = 'ComLab 1';
```

---

## Troubleshooting

### Issue: PowerShell execution policy
**Solution:** Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Database connection error
**Solution:** Check your `.env` file has correct DATABASE_URL:
```
DATABASE_URL=postgresql://username:password@localhost:5432/chatbot
```

### Issue: Table already exists
**Solution:** The SQL script uses `IF NOT EXISTS`, but if you need to recreate:
```sql
DROP TABLE IF EXISTS bot_responses CASCADE;
DROP TABLE IF EXISTS location_responses CASCADE;
```
Then re-run the SQL script.

### Issue: JSON parsing errors
**Solution:** Check that responses.json and responses_location_core.json are valid JSON files.

---

## Data Structure Reference

### bot_responses table:
| Column | Type | Description |
|--------|------|-------------|
| intent | TEXT | Unique identifier (e.g., about_ict, buksu_IT) |
| category | TEXT | Category like 'comlab', 'courses', 'FAQ' |
| sub_category | TEXT | Sub-category like 'general', 'information_technology' |
| answer_en | JSONB | English answers as JSON array |
| answer_ceb | JSONB | Cebuano answers as JSON array |
| answer | JSONB | Simple answers (non-multilingual) |
| follow_up | JSONB | Follow-up messages |
| context_slots | JSONB | Context data like last_topic |
| image_url | TEXT | Single image URL |
| image_urls | JSONB | Multiple image URLs |
| map_data | JSONB | Map location data with coordinates |
| metadata | JSONB | Source/author info |

### location_responses table:
| Column | Type | Description |
|--------|------|-------------|
| name | TEXT | Location name (e.g., ComLab 1, Registrar Office) |
| type | TEXT | Type like 'comlab', 'office', 'facility' |
| building | TEXT | Building name |
| floor | TEXT | Floor information |
| coordinates | JSONB | [y, x] coordinates on map |
| map_id | TEXT | Map identifier (default: main_map) |
| responses_en | JSONB | English responses |
| responses_ceb | JSONB | Cebuano responses |
| pins | JSONB | Additional map pins with coordinates |
| image_urls | JSONB | Associated images |

---

## Re-migrating After JSON Changes

If you modify `responses.json` or `responses_location_core.json` and want to update the database:

### Quick Re-migration Command

Run this to reload all data from the JSON files:

```cmd
cmd.exe /c "cd /d \"c:\School Related File\3rd year\Capstone dev\Chatbot\Chatbot-v4-BUKSU\" && npx tsx scripts/migrate-responses-to-pg.ts"
```

**What happens:**
- Existing data in both tables is **cleared**
- Updated JSON files are **re-imported** completely
- Verification count shows the new totals

### Important Notes

- **Backup first** if you've made changes directly to the database that you want to keep
- The script imports **both files together** (cannot do just one)
- Unique constraints on `intent` and `name` columns prevent duplicates if you modify the script for incremental updates

### Alternative: Incremental Update (Keep Existing Data)

To **add only new entries** without clearing existing data:

1. Edit `scripts/migrate-responses-to-pg.ts`
2. Comment out or remove these lines:
   ```typescript
   // await db.delete(botResponses);
   // await db.delete(locationResponses);
   ```
3. Run the migration script again

This will insert new intents/locations while keeping existing ones. Duplicate `intent` or `name` values will be skipped due to unique constraints.

---

## Notes

- The migration script clears existing data before importing (optional - you can modify the script to keep existing data)
- All JSON fields are stored as JSONB for efficient querying
- Indexes are created on commonly searched fields (intent, category, name, type, building)
- Timestamps are automatically set to current time on creation and update
