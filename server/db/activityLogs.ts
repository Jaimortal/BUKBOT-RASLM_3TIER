import { desc, eq, and, or, sql, like } from "drizzle-orm";
import { db, query } from "../db.js";
import { activityLogs, type InsertActivityLog, type ActivityLog } from "../../shared/schema.js";

let tableEnsured = false;

// Auto-create activity_logs table if not exists in PostgreSQL
export async function ensureActivityLogsTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT DEFAULT 'co-admin' NOT NULL,
        action_type TEXT NOT NULL,
        module TEXT NOT NULL,
        summary TEXT NOT NULL,
        target_title TEXT DEFAULT '',
        target_id TEXT DEFAULT '',
        changes JSONB DEFAULT '[]'::jsonb,
        ip_address TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs (module);
    `);
    tableEnsured = true;
  } catch (error) {
    console.error("[DB] Could not ensure activity_logs table:", error);
  }
}

// Insert an activity log into database
export async function insertDbActivityLog(data: InsertActivityLog): Promise<ActivityLog | null> {
  try {
    await ensureActivityLogsTable();
    const result = await db.insert(activityLogs).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error("[DB] Error inserting activity log:", error);
    return null;
  }
}

// Get activity logs from database with optional filters
export async function getDbActivityLogs(filters?: {
  module?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: ActivityLog[]; total: number }> {
  try {
    await ensureActivityLogsTable();

    const conditions = [];

    if (filters?.module && filters.module !== "all") {
      conditions.push(eq(activityLogs.module, filters.module));
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          like(activityLogs.userName, term),
          like(activityLogs.userEmail, term),
          like(activityLogs.summary, term),
          like(activityLogs.targetTitle, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(activityLogs)
        .where(whereClause)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(activityLogs)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return { logs, total };
  } catch (error) {
    console.error("[DB] Error fetching activity logs from database:", error);
    return { logs: [], total: 0 };
  }
}

// Delete an activity log by ID
export async function deleteDbActivityLog(id: string): Promise<boolean> {
  try {
    await ensureActivityLogsTable();
    await db.delete(activityLogs).where(eq(activityLogs.id, id));
    return true;
  } catch (error) {
    console.error("[DB] Error deleting activity log:", error);
    return false;
  }
}

// Clear all activity logs
export async function clearAllDbActivityLogs(): Promise<boolean> {
  try {
    await ensureActivityLogsTable();
    await db.delete(activityLogs);
    return true;
  } catch (error) {
    console.error("[DB] Error clearing activity logs:", error);
    return false;
  }
}
