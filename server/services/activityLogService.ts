import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import type { Request } from "express";
import {
  insertDbActivityLog,
  getDbActivityLogs,
  deleteDbActivityLog,
  clearAllDbActivityLogs
} from "../db/activityLogs.js";

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const ACTIVITY_LOGS_FILE = path.join(DATA_DIR, "activity_logs.json");
const ADMIN_USERS_PATH = path.join(PROJECT_ROOT, "server", "account", "admin-users.json");

export interface LogChangeItem {
  field: string;
  changeType: "added" | "modified" | "removed";
  details: string;
  oldValue?: any;
  newValue?: any;
}

export interface ActivityLogEntry {
  id: string;
  userEmail: string;
  userName: string;
  userRole: string; // "main-admin" | "co-admin"
  actionType: "create" | "update" | "delete" | "upload";
  module: "Knowledge Manager" | "Locations" | "Responses" | "Images" | "Settings" | "FAQs";
  summary: string;
  targetTitle?: string;
  targetId?: string;
  changes: LogChangeItem[];
  ipAddress?: string;
  createdAt: string;
}

// Ensure data directory exists
async function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read JSON fallback logs
async function readJsonLogs(): Promise<ActivityLogEntry[]> {
  try {
    await ensureDataDir();
    if (!fs.existsSync(ACTIVITY_LOGS_FILE)) {
      return [];
    }
    const data = await fsPromises.readFile(ACTIVITY_LOGS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[ActivityLog] Error reading JSON logs:", error);
    return [];
  }
}

// Write JSON fallback logs
async function writeJsonLogs(logs: ActivityLogEntry[]): Promise<void> {
  try {
    await ensureDataDir();
    await fsPromises.writeFile(ACTIVITY_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (error) {
    console.error("[ActivityLog] Error writing JSON logs:", error);
  }
}

// Helper to look up admin info from admin-users.json
export function getAdminUserInfo(emailOrUsername?: string): {
  email: string;
  name: string;
  role: string;
} {
  const defaultInfo = {
    email: emailOrUsername || "thepersonaljaime@gmail.com",
    name: "Admin",
    role: emailOrUsername === "thepersonaljaime@gmail.com" ? "main-admin" : "co-admin"
  };

  try {
    if (fs.existsSync(ADMIN_USERS_PATH)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_USERS_PATH, "utf8"));
      const users = data?.development?.users || [];
      const matched = users.find((u: any) => u.email?.toLowerCase() === emailOrUsername?.toLowerCase());
      if (matched) {
        return {
          email: matched.email,
          name: matched.name || "Admin",
          role: matched.role || (matched.email === "thepersonaljaime@gmail.com" ? "main-admin" : "co-admin")
        };
      }
    }
  } catch (err) {
    console.error("[ActivityLog] Error looking up admin user:", err);
  }

  return defaultInfo;
}

// Extract client IP
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string) ||
    req.socket?.remoteAddress ||
    (req as any).connection?.remoteAddress ||
    "127.0.0.1"
  );
}

// Compute diff between Knowledge topic state before and after
export function computeKnowledgeDiff(
  prevTopic: any,
  nextBody: any
): LogChangeItem[] {
  const changes: LogChangeItem[] = [];

  if (!prevTopic) {
    changes.push({
      field: "Topic",
      changeType: "added",
      details: `Created new topic with title: "${nextBody?.displayName || nextBody?.topic || 'Untitled'}"`
    });
    return changes;
  }

  // Check English Responses
  const prevEn: string[] = Array.isArray(prevTopic.responses?.en) ? prevTopic.responses.en : [];
  const nextEn: string[] = Array.isArray(nextBody.responses?.en) ? nextBody.responses.en : [];
  if (JSON.stringify(prevEn) !== JSON.stringify(nextEn)) {
    if (prevEn.length === 0 && nextEn.length > 0) {
      changes.push({
        field: "English Responses",
        changeType: "added",
        details: `Added ${nextEn.length} English response line(s)`
      });
    } else if (nextEn.length === 0 && prevEn.length > 0) {
      changes.push({
        field: "English Responses",
        changeType: "removed",
        details: `Removed all English responses (was ${prevEn.length} line(s))`
      });
    } else {
      changes.push({
        field: "English Responses",
        changeType: "modified",
        details: `Updated English responses (${nextEn.length} line(s))`
      });
    }
  }

  // Check Cebuano Responses
  const prevCeb: string[] = Array.isArray(prevTopic.responses?.ceb) ? prevTopic.responses.ceb : [];
  const nextCeb: string[] = Array.isArray(nextBody.responses?.ceb) ? nextBody.responses.ceb : [];
  if (JSON.stringify(prevCeb) !== JSON.stringify(nextCeb)) {
    if (prevCeb.length === 0 && nextCeb.length > 0) {
      changes.push({
        field: "Cebuano Responses",
        changeType: "added",
        details: `Added ${nextCeb.length} Cebuano response line(s)`
      });
    } else if (nextCeb.length === 0 && prevCeb.length > 0) {
      changes.push({
        field: "Cebuano Responses",
        changeType: "removed",
        details: `Removed all Cebuano responses (was ${prevCeb.length} line(s))`
      });
    } else {
      changes.push({
        field: "Cebuano Responses",
        changeType: "modified",
        details: `Updated Cebuano responses (${nextCeb.length} line(s))`
      });
    }
  }

  // Check Images
  const prevImgs: string[] = Array.isArray(prevTopic.images) ? prevTopic.images : [];
  const nextImgs: string[] = Array.isArray(nextBody.images) ? nextBody.images : [];
  if (JSON.stringify(prevImgs) !== JSON.stringify(nextImgs)) {
    const added = nextImgs.filter((img) => !prevImgs.includes(img));
    const removed = prevImgs.filter((img) => !nextImgs.includes(img));
    if (added.length > 0) {
      changes.push({
        field: "Images",
        changeType: "added",
        details: `Added ${added.length} image(s)`
      });
    }
    if (removed.length > 0) {
      changes.push({
        field: "Images",
        changeType: "removed",
        details: `Removed ${removed.length} image(s)`
      });
    }
  }

  // Check Map / Pins / Routes
  const prevPins = Array.isArray(prevTopic.pins) ? prevTopic.pins : [];
  const nextPins = Array.isArray(nextBody.pins) ? nextBody.pins : [];
  const prevRoutes = Array.isArray(prevTopic.routes) ? prevTopic.routes : [];
  const nextRoutes = Array.isArray(nextBody.routes) ? nextBody.routes : [];

  if (JSON.stringify(prevPins) !== JSON.stringify(nextPins)) {
    changes.push({
      field: "Map Pins",
      changeType: "modified",
      details: `Updated map pins (${nextPins.length} pin(s))`
    });
  }

  if (JSON.stringify(prevRoutes) !== JSON.stringify(nextRoutes)) {
    changes.push({
      field: "Map Routes",
      changeType: "modified",
      details: `Updated map routes (${nextRoutes.length} route(s))`
    });
  }

  // Check Keywords / Subject Terms / Phrases
  const prevTerms = Array.isArray(prevTopic.subject_terms)
    ? prevTopic.subject_terms
    : Array.isArray(prevTopic.metadata?.phrases)
    ? prevTopic.metadata.phrases
    : [];
  const nextTerms = Array.isArray(nextBody.subjectTerms)
    ? nextBody.subjectTerms
    : Array.isArray(nextBody.phrases)
    ? nextBody.phrases
    : [];

  if (nextTerms.length > 0 && JSON.stringify(prevTerms) !== JSON.stringify(nextTerms)) {
    changes.push({
      field: "Keywords / Search Terms",
      changeType: "modified",
      details: `Updated keywords (${nextTerms.length} terms)`
    });
  }

  if (changes.length === 0) {
    changes.push({
      field: "Details",
      changeType: "modified",
      details: "Updated topic properties and metadata"
    });
  }

  return changes;
}

// Compute diff between Location state before and after
export function computeLocationDiff(
  prevLoc: any,
  nextLoc: any
): LogChangeItem[] {
  const changes: LogChangeItem[] = [];

  if (!prevLoc) {
    changes.push({
      field: "Location",
      changeType: "added",
      details: `Created new location "${nextLoc?.name || 'Untitled'}" in building "${nextLoc?.building || 'Main'}"`
    });
    return changes;
  }

  if (prevLoc.name !== nextLoc.name) {
    changes.push({
      field: "Location Name",
      changeType: "modified",
      details: `Renamed from "${prevLoc.name}" to "${nextLoc.name}"`
    });
  }

  if (prevLoc.building !== nextLoc.building || prevLoc.floor !== nextLoc.floor) {
    changes.push({
      field: "Building / Floor",
      changeType: "modified",
      details: `Updated to Building: "${nextLoc.building}", Floor: "${nextLoc.floor || 'N/A'}"`
    });
  }

  const prevCoords = JSON.stringify(prevLoc.coordinates || []);
  const nextCoords = JSON.stringify(nextLoc.coordinates || []);
  if (prevCoords !== nextCoords) {
    changes.push({
      field: "Coordinates",
      changeType: "modified",
      details: `Updated coordinates to [${(nextLoc.coordinates || []).join(", ")}]`
    });
  }

  const prevPins = JSON.stringify(prevLoc.pins || []);
  const nextPins = JSON.stringify(nextLoc.pins || []);
  if (prevPins !== nextPins) {
    changes.push({
      field: "Map Pins",
      changeType: "modified",
      details: `Updated pins (${(nextLoc.pins || []).length} pin(s))`
    });
  }

  const prevRoutes = JSON.stringify(prevLoc.routes || []);
  const nextRoutes = JSON.stringify(nextLoc.routes || []);
  if (prevRoutes !== nextRoutes) {
    changes.push({
      field: "Map Routes",
      changeType: "modified",
      details: `Updated navigation routes (${(nextLoc.routes || []).length} route(s))`
    });
  }

  const prevImgs: string[] = Array.isArray(prevLoc.imageUrls) ? prevLoc.imageUrls : [];
  const nextImgs: string[] = Array.isArray(nextLoc.imageUrls) ? nextLoc.imageUrls : [];
  if (JSON.stringify(prevImgs) !== JSON.stringify(nextImgs)) {
    const added = nextImgs.filter((img) => !prevImgs.includes(img));
    const removed = prevImgs.filter((img) => !nextImgs.includes(img));
    if (added.length > 0) changes.push({ field: "Images", changeType: "added", details: `Added ${added.length} image(s)` });
    if (removed.length > 0) changes.push({ field: "Images", changeType: "removed", details: `Removed ${removed.length} image(s)` });
  }

  const prevResp = JSON.stringify(prevLoc.responses || {});
  const nextResp = JSON.stringify(nextLoc.responses || {});
  if (prevResp !== nextResp) {
    changes.push({
      field: "Location Responses",
      changeType: "modified",
      details: "Updated English/Cebuano descriptions"
    });
  }

  if (changes.length === 0) {
    changes.push({
      field: "Location Details",
      changeType: "modified",
      details: "Updated location settings and metadata"
    });
  }

  return changes;
}

// Primary function to log an activity
export async function logActivity(
  req: Request,
  entry: {
    actionType: "create" | "update" | "delete" | "upload";
    module: "Knowledge Manager" | "Locations" | "Responses" | "Images" | "Settings" | "FAQs";
    summary: string;
    targetTitle?: string;
    targetId?: string;
    changes?: LogChangeItem[];
  }
): Promise<ActivityLogEntry> {
  const userTokenEmail = (req as any).user?.username || (req as any).user?.email;
  const adminInfo = getAdminUserInfo(userTokenEmail);
  const ipAddress = getClientIp(req);
  const timestamp = new Date().toISOString();
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const logRecord: ActivityLogEntry = {
    id,
    userEmail: adminInfo.email,
    userName: adminInfo.name,
    userRole: adminInfo.role,
    actionType: entry.actionType,
    module: entry.module,
    summary: entry.summary,
    targetTitle: entry.targetTitle || "",
    targetId: entry.targetId || "",
    changes: entry.changes && entry.changes.length > 0 ? entry.changes : [
      {
        field: entry.module,
        changeType: entry.actionType === "delete" ? "removed" : entry.actionType === "create" ? "added" : "modified",
        details: entry.summary
      }
    ],
    ipAddress,
    createdAt: timestamp
  };

  // 1. Save to PostgreSQL DB
  try {
    await insertDbActivityLog({
      id: logRecord.id,
      userEmail: logRecord.userEmail,
      userName: logRecord.userName,
      userRole: logRecord.userRole,
      actionType: logRecord.actionType,
      module: logRecord.module,
      summary: logRecord.summary,
      targetTitle: logRecord.targetTitle,
      targetId: logRecord.targetId,
      changes: logRecord.changes as any,
      ipAddress: logRecord.ipAddress,
      createdAt: new Date()
    });
  } catch (dbErr) {
    console.error("[ActivityLog] DB insert error (will fallback to JSON):", dbErr);
  }

  // 2. Synchronize to JSON file
  try {
    const existing = await readJsonLogs();
    existing.unshift(logRecord);
    // Keep max 5000 records in JSON file
    if (existing.length > 5000) {
      existing.length = 5000;
    }
    await writeJsonLogs(existing);
  } catch (jsonErr) {
    console.error("[ActivityLog] JSON sync error:", jsonErr);
  }

  console.log(`[Activity Log] [${adminInfo.role}] ${adminInfo.name} (${adminInfo.email}) -> ${entry.module}: ${entry.summary}`);
  return logRecord;
}

// Fetch all activity logs (combining DB with JSON fallback)
export async function getActivityLogsList(filters?: {
  module?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  // Try DB first
  try {
    const dbResult = await getDbActivityLogs(filters);
    if (dbResult && dbResult.logs && dbResult.logs.length > 0) {
      const formatted: ActivityLogEntry[] = dbResult.logs.map((log) => ({
        id: log.id,
        userEmail: log.userEmail,
        userName: log.userName,
        userRole: log.userRole,
        actionType: log.actionType as any,
        module: log.module as any,
        summary: log.summary,
        targetTitle: log.targetTitle || "",
        targetId: log.targetId || "",
        changes: (log.changes as any) || [],
        ipAddress: log.ipAddress || "",
        createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString()
      }));
      return { logs: formatted, total: dbResult.total };
    }
  } catch (dbErr) {
    console.warn("[ActivityLog] DB fetch failed, falling back to JSON:", dbErr);
  }

  // Fallback to JSON
  const jsonLogs = await readJsonLogs();
  let filtered = jsonLogs;

  if (filters?.module && filters.module !== "all") {
    filtered = filtered.filter((l) => l.module === filters.module);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.userEmail.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        (l.targetTitle && l.targetTitle.toLowerCase().includes(q))
    );
  }

  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;
  const paginated = filtered.slice(offset, offset + limit);

  return { logs: paginated, total: filtered.length };
}

// Delete activity log by ID
export async function deleteActivityLogEntry(id: string): Promise<boolean> {
  // Delete from DB
  await deleteDbActivityLog(id).catch((err) => console.error("Error deleting from DB:", err));

  // Delete from JSON
  try {
    const logs = await readJsonLogs();
    const nextLogs = logs.filter((l) => l.id !== id);
    await writeJsonLogs(nextLogs);
    return true;
  } catch (err) {
    console.error("Error deleting from JSON:", err);
    return false;
  }
}

// Clear all activity logs
export async function clearActivityLogsList(): Promise<boolean> {
  // Clear DB
  await clearAllDbActivityLogs().catch((err) => console.error("Error clearing DB logs:", err));

  // Clear JSON
  try {
    await writeJsonLogs([]);
    return true;
  } catch (err) {
    console.error("Error clearing JSON logs:", err);
    return false;
  }
}
