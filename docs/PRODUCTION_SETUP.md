# Production Setup Guide - PostgreSQL as Primary Data Source

This guide explains how to switch the chatbot from JSON files to PostgreSQL as the main data source in production.

## Overview

In production, the chatbot uses PostgreSQL instead of `responses.json` and `responses_location.json` files. The Rasa actions call the main application API to fetch responses.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Rasa      │────▶│  API         │────▶│  PostgreSQL │
│  Actions    │     │  (/api/rasa) │     │   Database  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Admin      │
                    │   Panel      │
                    └──────────────┘
```

## Prerequisites

1. PostgreSQL database with tables created (`bot_responses`, `location_responses`)
2. JSON data migrated to PostgreSQL
3. Main application server running

## Step 1: Database Setup

### 1.1 Ensure Tables Exist

The tables should already be created from `shared/schema.ts`. Verify they exist:

```sql
\dt
-- Should show: bot_responses, location_responses
```

### 1.2 Migrate Data (if not already done)

```bash
cmd.exe /c "cd /d \"c:\School Related File\3rd year\Capstone dev\Chatbot\Chatbot-v4-BUKSU\" && npx tsx scripts/migrate-responses-to-pg.ts"
```

## Step 2: Server Configuration

### 2.1 Update Environment Variables

Create or update `.env` file in the project root:

```env
# Database Configuration
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=ChatbotVersion

# Or use DATABASE_URL
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ChatbotVersion

# Server Configuration
NODE_ENV=production
PORT=5000
```

### 2.2 Register Rasa API Routes

In `server/index.ts`, add the Rasa API routes:

```typescript
import rasaApiRoutes from "./routes/rasa-api.js";

// ... existing code ...

// Register routes
app.use("/api/rasa", rasaApiRoutes);
```

### 2.3 Update Admin Panel (Optional)

If you want the admin panel to use the database instead of JSON files:

In your admin controller/routes, import from `admin-db.ts` instead of `admin.ts`:

```typescript
// Old: import { getResponses, upsertResponse } from "../admin.js";
// New:
import { getResponses, upsertResponse } from "../admin-db.js";
```

## Step 3: Rasa Configuration

### 3.1 Install requests library

If not already installed:

```bash
cd rasa/actions
pip install requests
```

### 3.2 Update Rasa Actions

In `rasa/actions/actions.py`, update the action classes to use the API client:

**Option A: Use Hybrid Helper (Recommended)**

```python
# Add to top of actions.py
import os
from api_client import HybridResponseHelper

# In your action class
class ActionMyAction(Action):
    def __init__(self):
        api_url = os.environ.get("CHATBOT_API_URL", "http://localhost:5000/api/rasa")
        self.helper = HybridResponseHelper(api_base_url=api_url)
        self.helper.api_client.warm_cache()  # Pre-load all data
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        intent = "my_intent"
        user_message = tracker.latest_message.get("text", "")
        
        response = self.helper.get_response(intent, user_message=user_message)
        
        if isinstance(response, dict):
            if "text" in response:
                dispatcher.utter_message(text=response["text"])
            if "image" in response:
                dispatcher.utter_message(image=response["image"])
            if "custom" in response:
                dispatcher.utter_message(json_message=response["custom"])
        else:
            dispatcher.utter_message(text=response)
        
        return []
```

**Option B: Keep JSON as Fallback**

Set environment variable to use API:

```bash
export USE_API_RESPONSES=true
export CHATBOT_API_URL=http://localhost:5000/api/rasa
```

If API fails, it automatically falls back to JSON files.

### 3.3 Rasa Environment Variables

Set in your production environment:

```bash
# Rasa Action Server
export CHATBOT_API_URL=http://your-server:5000/api/rasa
export USE_API_RESPONSES=true

# Optional: Increase cache time for production
export RESPONSE_CACHE_TTL=300  # 5 minutes
```

## Step 4: Production Deployment

### 4.1 Deploy Main Application

```bash
# Build the application
npm run build

# Start production server
npm start
```

### 4.2 Verify API is Working

Test the API endpoints:

```bash
# Health check
curl http://localhost:5000/api/rasa/health

# Get all responses
curl http://localhost:5000/api/rasa/responses

# Get specific response
curl http://localhost:5000/api/rasa/responses/about_ict

# Get all locations
curl http://localhost:5000/api/rasa/locations
```

### 4.3 Start Rasa

```bash
# Start Rasa server
rasa run --enable-api --cors "*"

# Start Action Server
rasa run actions
```

## Step 5: Verification

### 5.1 Check API Health

```bash
curl http://localhost:5000/api/rasa/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "responses_count": 178,
    "locations_count": 101
  }
}
```

### 5.2 Test Chatbot

Send a test message and verify responses are coming from the database.

### 5.3 Check Logs

Watch for any errors in:
- Main application logs
- Rasa action server logs

## Database Maintenance

### Backup Data

```bash
# Backup PostgreSQL
pg_dump -U postgres ChatbotVersion > chatbot_backup.sql
```

### Update Responses in Production

1. Use the admin panel to edit responses (uses database)
2. Or use SQL directly:

```sql
UPDATE bot_responses 
SET answer_en = '["New English response"]',
    answer_ceb = '["New Cebuano response"]',
    updated_at = CURRENT_TIMESTAMP
WHERE intent = 'about_ict';
```

### Re-migrate from JSON (if needed)

```bash
cmd.exe /c "cd /d \"c:\School Related File\3rd year\Capstone dev\Chatbot\Chatbot-v4-BUKSU\" && npx tsx scripts/migrate-responses-to-pg.ts"
```

## Troubleshooting

### Issue: Rasa can't connect to API

**Solution:**
1. Check API URL is correct in environment
2. Verify server is running
3. Check firewall/network settings

### Issue: Database connection errors

**Solution:**
1. Check PostgreSQL is running
2. Verify connection string in `.env`
3. Check database credentials

### Issue: Missing data after migration

**Solution:**
1. Check migration script ran successfully
2. Verify tables have data:
   ```sql
   SELECT COUNT(*) FROM bot_responses;
   SELECT COUNT(*) FROM location_responses;
   ```

### Issue: Admin panel shows old data

**Solution:**
Update admin routes to use `admin-db.ts` instead of `admin.ts`.

## Performance Considerations

1. **API Caching**: Rasa API client caches all responses on startup
2. **Database Indexes**: Tables have indexes on `intent` and `name` columns
3. **Connection Pooling**: Uses PostgreSQL connection pooling

## Security Considerations

1. **API Rate Limiting**: Consider adding rate limiting to `/api/rasa/*`
2. **Authentication**: Add authentication if API is exposed externally
3. **Database Credentials**: Use environment variables, never hardcode

## Rollback Plan

If you need to switch back to JSON files:

1. Set environment variable: `USE_API_RESPONSES=false`
2. Restart Rasa action server
3. Ensure JSON files are up-to-date

## Files Reference

| File | Description |
|------|-------------|
| `server/db/responses.ts` | Database service for bot responses |
| `server/db/locations.ts` | Database service for locations |
| `server/admin-db.ts` | Admin panel using database |
| `server/routes/rasa-api.ts` | API endpoints for Rasa |
| `rasa/actions/api_client.py` | Python client for API |
| `shared/schema.ts` | Database schema definitions |

## Support

For issues:
1. Check server logs
2. Verify database connection
3. Test API endpoints directly
4. Check Rasa action server logs
