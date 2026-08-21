import "dotenv/config";
import { Pool, type QueryResultRow } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: String(process.env.PGPASSWORD ?? "postgres"),
  database: process.env.PGDATABASE || "ChatbotVersion",
});

// Drizzle ORM instance for typed queries
export const db = drizzle(pool);

// Raw SQL query helpers (for backward compatibility)
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  return pool.query<T>(text, params);
}

export async function getOne<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query<T>(text, params);
  return result.rows[0] || null;
}
