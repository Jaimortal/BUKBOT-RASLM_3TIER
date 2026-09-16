-- SQL Schema for Chatbot Responses Migration
-- Run this in pgAdmin to create the tables before migrating data

-- Table for responses.json data
CREATE TABLE IF NOT EXISTS bot_responses (
    id SERIAL PRIMARY KEY,
    intent TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT '',
    sub_category TEXT DEFAULT '',
    answer_en JSONB DEFAULT '[]'::jsonb,
    answer_ceb JSONB DEFAULT '[]'::jsonb,
    answer JSONB DEFAULT '[]'::jsonb,
    follow_up JSONB DEFAULT '[]'::jsonb,
    context_slots JSONB DEFAULT '{}'::jsonb,
    image_url TEXT DEFAULT '',
    image_urls JSONB DEFAULT '[]'::jsonb,
    map_data JSONB DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for canonical responses_location_core.json data
CREATE TABLE IF NOT EXISTS location_responses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    building TEXT NOT NULL,
    floor TEXT DEFAULT 'N/A',
    coordinates JSONB NOT NULL, -- [y, x] format
    map_id TEXT DEFAULT 'main_map',
    responses_en JSONB DEFAULT '[]'::jsonb,
    responses_ceb JSONB DEFAULT '[]'::jsonb,
    pins JSONB DEFAULT '[]'::jsonb,
    image_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bot_responses_intent ON bot_responses(intent);
CREATE INDEX IF NOT EXISTS idx_bot_responses_category ON bot_responses(category);
CREATE INDEX IF NOT EXISTS idx_location_responses_name ON location_responses(name);
CREATE INDEX IF NOT EXISTS idx_location_responses_type ON location_responses(type);
CREATE INDEX IF NOT EXISTS idx_location_responses_building ON location_responses(building);

-- Optional: Create a view for easy data viewing
CREATE OR REPLACE VIEW vw_bot_responses_summary AS
SELECT 
    id,
    intent,
    category,
    sub_category,
    jsonb_array_length(answer_en) as en_answer_count,
    jsonb_array_length(answer_ceb) as ceb_answer_count,
    jsonb_array_length(answer) as simple_answer_count,
    jsonb_array_length(follow_up) as follow_up_count,
    image_url,
    jsonb_array_length(image_urls) as image_urls_count,
    map_data IS NOT NULL as has_map_data,
    created_at,
    updated_at
FROM bot_responses;

CREATE OR REPLACE VIEW vw_location_responses_summary AS
SELECT 
    id,
    name,
    type,
    building,
    floor,
    coordinates,
    map_id,
    jsonb_array_length(responses_en) as en_response_count,
    jsonb_array_length(responses_ceb) as ceb_response_count,
    jsonb_array_length(pins) as pins_count,
    jsonb_array_length(image_urls) as image_urls_count,
    created_at,
    updated_at
FROM location_responses;

-- Comments for documentation
COMMENT ON TABLE bot_responses IS 'Stores chatbot responses data migrated from rasa/actions/responses.json';
COMMENT ON TABLE location_responses IS 'Stores location-based responses migrated from rasa/actions/knowledge/location/responses_location_core.json';
COMMENT ON COLUMN bot_responses.intent IS 'The intent identifier for the response (e.g., about_ict, buksu_IT)';
COMMENT ON COLUMN bot_responses.answer_en IS 'English answers stored as JSON array';
COMMENT ON COLUMN bot_responses.answer_ceb IS 'Cebuano answers stored as JSON array';
COMMENT ON COLUMN location_responses.coordinates IS 'Map coordinates in [y, x] format';
COMMENT ON COLUMN location_responses.pins IS 'Additional map pins with name and coordinates';

-- Table for Super Intent module topics (Supper Saiyan/*.json)
CREATE TABLE IF NOT EXISTS super_intent_responses (
    id SERIAL PRIMARY KEY,
    super_intent TEXT NOT NULL, -- The source file identifier (e.g. "University_info")
    topic TEXT NOT NULL,        -- The technical topic key (e.g. "mission_vision")
    ui_name TEXT DEFAULT '',    -- Display name
    responses_en JSONB DEFAULT '[]'::jsonb,
    responses_ceb JSONB DEFAULT '[]'::jsonb,
    image_urls JSONB DEFAULT '[]'::jsonb,
    map_data JSONB DEFAULT NULL,
    pins JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint to prevent duplicate topics per super intent
CREATE UNIQUE INDEX IF NOT EXISTS idx_super_intent_topic ON super_intent_responses(super_intent, topic);
CREATE INDEX IF NOT EXISTS idx_super_intent_responses_super_intent ON super_intent_responses(super_intent);
CREATE INDEX IF NOT EXISTS idx_super_intent_responses_topic ON super_intent_responses(topic);

COMMENT ON TABLE super_intent_responses IS 'Stores Super Intent module topics migrated from Supper Saiyan/*.json files';

-- Table for tracking JSON file migrations
CREATE TABLE IF NOT EXISTS migration_tracking (
    file_name TEXT PRIMARY KEY,
    last_mtime BIGINT NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE migration_tracking IS 'Tracks JSON file modification times for versioning/migration purposes';
