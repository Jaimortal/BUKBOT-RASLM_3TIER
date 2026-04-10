import 'dotenv/config';
import { query as executeQuery } from '../server/db.ts';

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS "faq_configs" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "super_intent" text NOT NULL,
      "topic_key" text NOT NULL,
      "display_label" text NOT NULL,
      "subtitle" text,
      "icon" text,
      "payload" text NOT NULL,
      "enabled" boolean DEFAULT true NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp DEFAULT now()
    );
  `;
  try {
    await executeQuery(query);
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR", err);
  } finally {
    process.exit(0);
  }
}

createTable();
