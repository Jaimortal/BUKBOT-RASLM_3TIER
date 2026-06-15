import crypto from "crypto";
import { Request, Response } from "express";
import { query } from "../db";

const REPORT_LIMIT_DAYS = 30;
const REPORT_LIMIT_COUNT = 5;
const RESPONSE_REPORT_LIMIT_COUNT = 10;
const MAX_REPORT_LENGTH = 1000;

function reportSecret(): string {
  return process.env.REPORT_ENCRYPTION_KEY || process.env.JWT_SECRET || "change-this-report-secret";
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(`${reportSecret()}:${value.trim().toLowerCase()}`).digest("hex");
}

function encryptionKey(): Buffer {
  return crypto.createHash("sha256").update(reportSecret()).digest();
}

function encryptText(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptText(value: string): string {
  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.split(":");
    if (!ivRaw || !tagRaw || !encryptedRaw) return "";
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

async function ensureReportsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS chatbot_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email_encrypted TEXT NOT NULL,
      email_hash TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      report_text TEXT NOT NULL,
      report_kind TEXT DEFAULT 'general',
      question_text TEXT DEFAULT '',
      bot_response_text TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE chatbot_reports ADD COLUMN IF NOT EXISTS report_kind TEXT DEFAULT 'general'`);
  await query(`ALTER TABLE chatbot_reports ADD COLUMN IF NOT EXISTS question_text TEXT DEFAULT ''`);
  await query(`ALTER TABLE chatbot_reports ADD COLUMN IF NOT EXISTS bot_response_text TEXT DEFAULT ''`);
  await query(`CREATE INDEX IF NOT EXISTS idx_chatbot_reports_email_hash ON chatbot_reports(email_hash)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_chatbot_reports_ip_hash ON chatbot_reports(ip_hash)`);
}

function remainingDaysFrom(value: Date): number {
  const expiresAt = value.getTime() + REPORT_LIMIT_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = expiresAt - Date.now();
  return Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

export class ReportController {
  static async create(req: Request, res: Response) {
    try {
      await ensureReportsTable();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const report = String(req.body?.report || "").trim();

      if (!/^[^\s@]+@gmail\.com$/.test(email)) {
        return res.status(400).json({ success: false, message: "A valid Gmail address is required." });
      }
      if (!report) {
        return res.status(400).json({ success: false, message: "Report message is required." });
      }
      if (report.length > MAX_REPORT_LENGTH) {
        return res.status(400).json({ success: false, message: `Report must be ${MAX_REPORT_LENGTH} characters or fewer.` });
      }

      const ip = clientIp(req);
      const ipHash = hashValue(ip);
      const emailHash = hashValue(email);
      const recent = await query<{ created_at: Date }>(
        `SELECT created_at FROM chatbot_reports
         WHERE (ip_hash = $1 OR email_hash = $2)
           AND created_at > NOW() - INTERVAL '${REPORT_LIMIT_DAYS} days'
         ORDER BY created_at ASC`,
        [ipHash, emailHash]
      );

      if (recent.rows.length >= REPORT_LIMIT_COUNT) {
        const remainingDays = remainingDaysFrom(new Date(recent.rows[0].created_at));
        return res.status(429).json({
          success: false,
          limited: true,
          remainingDays,
          message: `You have reached the report limit. You can submit another report in about ${remainingDays} day${remainingDays === 1 ? "" : "s"}.`,
        });
      }

      await query(
        `INSERT INTO chatbot_reports (email_encrypted, email_hash, ip_hash, ip_address, report_text, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [encryptText(email), emailHash, ipHash, ip, report, String(req.headers["user-agent"] || "")]
      );

      return res.json({ success: true, message: "Report submitted. Thank you for helping improve the chatbot." });
    } catch (error) {
      console.error("Error creating report:", error);
      return res.status(500).json({ success: false, message: "Failed to submit report." });
    }
  }

  static async createResponseReport(req: Request, res: Response) {
    try {
      await ensureReportsTable();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const report = String(req.body?.report || "").trim();
      const question = String(req.body?.question || "").trim();
      const botResponse = String(req.body?.botResponse || "").trim();

      if (!/^[^\s@]+@gmail\.com$/.test(email)) {
        return res.status(400).json({ success: false, message: "A valid Gmail address is required." });
      }
      if (!report) {
        return res.status(400).json({ success: false, message: "Report message is required." });
      }
      if (report.length > MAX_REPORT_LENGTH) {
        return res.status(400).json({ success: false, message: `Report must be ${MAX_REPORT_LENGTH} characters or fewer.` });
      }
      if (!question || !botResponse) {
        return res.status(400).json({ success: false, message: "The reported question and response are required." });
      }

      const ip = clientIp(req);
      const ipHash = hashValue(ip);
      const emailHash = hashValue(email);
      const recent = await query<{ created_at: Date }>(
        `SELECT created_at FROM chatbot_reports
         WHERE ip_hash = $1
           AND report_kind = 'response'
           AND created_at > NOW() - INTERVAL '${REPORT_LIMIT_DAYS} days'
         ORDER BY created_at ASC`,
        [ipHash]
      );

      if (recent.rows.length >= RESPONSE_REPORT_LIMIT_COUNT) {
        const remainingDays = remainingDaysFrom(new Date(recent.rows[0].created_at));
        return res.status(429).json({
          success: false,
          limited: true,
          remainingDays,
          message: `You have reached the response report limit. You can submit another response report in about ${remainingDays} day${remainingDays === 1 ? "" : "s"}.`,
        });
      }

      await query(
        `INSERT INTO chatbot_reports (email_encrypted, email_hash, ip_hash, ip_address, report_text, report_kind, question_text, bot_response_text, user_agent)
         VALUES ($1, $2, $3, $4, $5, 'response', $6, $7, $8)`,
        [encryptText(email), emailHash, ipHash, ip, report, question.slice(0, 4000), botResponse.slice(0, 12000), String(req.headers["user-agent"] || "")]
      );

      return res.json({ success: true, message: "Response report submitted. Thank you for helping improve the chatbot." });
    } catch (error) {
      console.error("Error creating response report:", error);
      return res.status(500).json({ success: false, message: "Failed to submit response report." });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      await ensureReportsTable();
      const result = await query<any>(
        `SELECT id, email_encrypted, ip_address, ip_hash, report_text, report_kind, question_text, bot_response_text, user_agent, created_at
         FROM chatbot_reports
         ORDER BY created_at DESC`
      );

      const grouped = new Map<string, any>();
      for (const row of result.rows) {
        const key = row.ip_hash;
        if (!grouped.has(key)) {
          grouped.set(key, {
            ipHash: row.ip_hash,
            ipAddress: row.ip_address,
            count: 0,
            latestAt: row.created_at,
            reports: [],
          });
        }
        const item = grouped.get(key);
        item.count += 1;
        item.reports.push({
          id: row.id,
          email: decryptText(row.email_encrypted),
          report: row.report_text,
          reportKind: row.report_kind || "general",
          question: row.question_text || "",
          botResponse: row.bot_response_text || "",
          userAgent: row.user_agent,
          createdAt: row.created_at,
        });
      }

      return res.json({ success: true, data: Array.from(grouped.values()) });
    } catch (error) {
      console.error("Error listing reports:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch reports." });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ensureReportsTable();
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ success: false, message: "Report id is required." });

      await query(`DELETE FROM chatbot_reports WHERE id = $1`, [id]);
      return res.json({ success: true, message: "Report deleted." });
    } catch (error) {
      console.error("Error deleting report:", error);
      return res.status(500).json({ success: false, message: "Failed to delete report." });
    }
  }
}
