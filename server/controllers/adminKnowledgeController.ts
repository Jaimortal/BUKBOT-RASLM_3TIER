import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import { Request, Response } from "express";
import { backupJsonFile } from "../utils/jsonBackup";
import { logActivity, computeKnowledgeDiff } from "../services/activityLogService.js";
import { deleteImage } from "../db/images.js";

type JsonObject = Record<string, any>;

const KNOWLEDGE_ROOT = path.join(process.cwd(), "rasa", "actions", "knowledge");
const ROUTE_COLORS = ["#ff1744", "#ffea00", "#00b0ff", "#00e676", "#d500f9", "#ff9100", "#00e5ff", "#76ff03"];
let knowledgeListCache: { signature: string; records: JsonObject[]; files: { file: string; count: number }[] } | null = null;

function getKnowledgeFiles(): { file: string; fullPath: string; domain?: string }[] {
  const result: { file: string; fullPath: string; domain?: string }[] = [];
  if (fs.existsSync(KNOWLEDGE_ROOT)) {
    const entries = fs.readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Locations have a dedicated admin endpoint and must never be parsed by
        // the Knowledge Manager scanner.
        if (entry.name === "location") continue;
        const domainDir = path.join(KNOWLEDGE_ROOT, entry.name);
        const subFiles = fs.readdirSync(domainDir).filter((f) => f.endsWith(".json"));
        for (const subFile of subFiles) {
          result.push({
            file: `${entry.name}/${subFile}`,
            fullPath: path.join(domainDir, subFile),
            domain: entry.name,
          });
        }
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        result.push({
          file: entry.name,
          fullPath: path.join(KNOWLEDGE_ROOT, entry.name),
        });
      }
    }
  }

  // Also include Supper Saiyan if exists and not already loaded
  const oldDir = path.join(process.cwd(), "rasa", "actions", "Supper Saiyan");
  if (fs.existsSync(oldDir)) {
    const oldFiles = fs.readdirSync(oldDir).filter((f) => f.endsWith(".json"));
    for (const oldFile of oldFiles) {
      if (!result.some((r) => r.file.endsWith(oldFile))) {
        result.push({
          file: oldFile,
          fullPath: path.join(oldDir, oldFile),
        });
      }
    }
  }

  return result;
}

function knowledgeFilesSignature(files: { fullPath: string }[]): string {
  return files
    .map((item) => {
      const stat = fs.statSync(item.fullPath);
      return `${item.fullPath}:${stat.size}:${stat.mtimeMs}`;
    })
    .join("|");
}

async function loadKnowledgeRecords() {
  const allFiles = getKnowledgeFiles();
  const signature = knowledgeFilesSignature(allFiles);
  if (knowledgeListCache?.signature === signature) return knowledgeListCache;

  const records: JsonObject[] = [];
  await Promise.all(allFiles.map(async (item) => {
    try {
      const data = JSON.parse(await fsPromises.readFile(item.fullPath, "utf-8"));
      if (!Array.isArray(data.topics)) return;
      data.topics.forEach((topic: JsonObject, index: number) => collectRecords(item.file, topic, [index], null, records));
    } catch (err) {
      console.error(`Error reading knowledge file ${item.file}:`, err);
    }
  }));

  const files = allFiles.map((item) => ({
    file: item.file,
    count: records.filter((record) => record.file === item.file).length,
  }));
  knowledgeListCache = { signature, records, files };
  return knowledgeListCache;
}

function knowledgeSummary(record: JsonObject): JsonObject {
  const en = stringArray(record.responses?.en);
  const ceb = stringArray(record.responses?.ceb);
  const phrases = stringArray(record.phrases);
  const images = stringArray(record.images);
  const preview = en.find(Boolean) || ceb.find(Boolean) || "";
  const searchIndex = [
    record.displayName,
    record.file,
    record.parentTopic,
    record.topic,
    record.intent,
    record.contextTopic,
    record.subjectKey,
    record.subjectType,
    preview.slice(0, 240),
  ].filter(Boolean).join(" ").toLowerCase();

  return {
    ...record,
    responses: { en: [], ceb: [] },
    phrases: [],
    images: [],
    map: null,
    mapData: null,
    pins: [],
    routes: [],
    items: [],
    itemGroups: {},
    itemDisclaimer: "",
    ownSubjectTerms: [],
    subjectTerms: [],
    preview: preview.slice(0, 240),
    searchIndex,
    phraseCount: phrases.length,
    imageCount: images.length,
    subjectTermCount: stringArray(record.subjectTerms).length,
    isSummary: true,
  };
}

function parentAtPath(data: JsonObject, pathParts: number[]): JsonObject | null {
  return pathParts.length > 1 ? topicAtPath(data, pathParts.slice(0, -1)) : null;
}

function resolveKnowledgeFilePath(filePathOrName: string): string | null {
  if (!filePathOrName) return null;
  const decoded = decodeURIComponent(filePathOrName).replace(/^[/\\]+/, "");
  
  // 1. Direct path under KNOWLEDGE_ROOT
  const directPath = path.join(KNOWLEDGE_ROOT, decoded);
  if (fs.existsSync(directPath)) return directPath;

  // 2. Look across all domain subdirectories
  const allFiles = getKnowledgeFiles();
  const matched = allFiles.find(
    (item) => item.file === decoded || path.basename(item.file) === path.basename(decoded)
  );
  if (matched && fs.existsSync(matched.fullPath)) {
    return matched.fullPath;
  }

  // 3. Check old Supper Saiyan
  const oldCandidate = path.join(process.cwd(), "rasa", "actions", "Supper Saiyan", path.basename(decoded));
  if (fs.existsSync(oldCandidate)) return oldCandidate;

  return null;
}

function formatLabel(value: string): string {
  return String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/([A-Z])/g, " $1")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

function isSafeJsonFile(file: string): boolean {
  if (!file) return false;
  const decoded = decodeURIComponent(file);
  return Boolean(decoded.endsWith(".json") && !decoded.includes(".."));
}

function stringArray(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function cleanStringArray(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function keyValue(value: any): string {
  return String(value || "").trim();
}

function isValidKey(value: string): boolean {
  return /^[a-z0-9][a-z0-9_]*$/.test(value);
}

function hasMapPayload(topic: JsonObject): boolean {
  return Boolean(
    topic.map ||
    topic.mapData ||
    topic.mapRef ||
    topic.map_ref ||
    (Array.isArray(topic.pins) && topic.pins.length > 0) ||
    (Array.isArray(topic.routes) && topic.routes.length > 0)
  );
}

function mapDataObject(topic: JsonObject): JsonObject | null {
  if (Array.isArray(topic.mapData)) return topic.mapData[0] || null;
  if (topic.mapData && typeof topic.mapData === "object") return topic.mapData;
  return null;
}

function pinsForTopic(topic: JsonObject): any[] {
  if (Array.isArray(topic.pins)) return normalizePins(topic.pins);
  const mapData = mapDataObject(topic);
  return Array.isArray(mapData?.pins) ? normalizePins(mapData.pins) : [];
}

function routesForTopic(topic: JsonObject): any[] {
  if (Array.isArray(topic.routes)) return normalizeRoutes(topic.routes);
  const mapData = mapDataObject(topic);
  return Array.isArray(mapData?.routes) ? normalizeRoutes(mapData.routes) : [];
}

function normalizeRoutes(routes: any[]): any[] {
  return (Array.isArray(routes) ? routes : []).map((route: any, index: number) => ({
    ...route,
    name: String(route?.name || `Route ${index + 1}`),
    points: Array.isArray(route?.points) ? route.points : [],
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    route_order: Number(route?.route_order) || index + 1,
    route_label: String(route?.route_label || `Route ${index + 1}`),
  }));
}

function normalizePins(pins: any[]): any[] {
  return (Array.isArray(pins) ? pins : [])
    .map((pin: any) => {
      const coords = Array.isArray(pin?.coordinates) && pin.coordinates.length >= 2
        ? [Number(pin.coordinates[0]), Number(pin.coordinates[1])]
        : null;
      const lat = Number(pin?.lat ?? pin?.y);
      const lng = Number(pin?.lng ?? pin?.x);
      const coordinates = coords || (Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null);
      if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;
      return {
        ...pin,
        coordinates,
      };
    })
    .filter(Boolean);
}

function safeParseJson(value: any, fallback: any): any {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function collectRecords(
  file: string,
  topic: JsonObject,
  pathParts: number[],
  parent: JsonObject | null,
  records: JsonObject[],
) {
  const responses = topic.responses || {};
  const metadata = topic.metadata || {};
  const hasResponses = responses && (Array.isArray(responses.en) || Array.isArray(responses.ceb));
  const topicKey = String(topic.topic || "");

  if (topicKey) {
    records.push({
      id: `${file}:${pathParts.join(".")}`,
      file,
      path: pathParts,
      parentTopic: parent?.topic || null,
      parentSubjectKey: parent?.subject_key || null,
      topic: topicKey,
      intent: topic.intent || null,
      contextTopic: topic.context_topic || null,
      displayName: topic.display_name || topic.ui_name || formatLabel(topic.intent || topicKey),
      subjectKey: topic.subject_key || parent?.subject_key || null,
      subjectType: topic.subject_type || parent?.subject_type || null,
      ownSubjectTerms: stringArray(topic.subject_terms),
      subjectTerms: stringArray(topic.subject_terms?.length ? topic.subject_terms : parent?.subject_terms),
      responses: {
        en: stringArray(responses.en),
        ceb: stringArray(responses.ceb),
      },
      phrases: stringArray(metadata.phrases),
      images: stringArray(topic.images || topic.imageUrls),
      map: topic.map ?? null,
      mapData: topic.mapData ?? null,
      pins: pinsForTopic(topic),
      routes: routesForTopic(topic),
      mapRef: topic.mapRef || topic.map_ref || "",
      items: Array.isArray(topic.items) ? topic.items : [],
      itemGroups: topic.itemGroups || topic.item_groups || {},
      itemDisclaimer: topic.itemDisclaimer || topic.item_disclaimer || "",
      hasResponses,
      hasMap: hasMapPayload(topic),
      hasMapRef: Boolean(topic.mapRef || topic.map_ref),
      subtopicCount: Array.isArray(topic.subtopics) ? topic.subtopics.length : 0,
    });
  }

  if (Array.isArray(topic.subtopics)) {
    topic.subtopics.forEach((subtopic: JsonObject, index: number) => {
      collectRecords(file, subtopic, [...pathParts, index], topic, records);
    });
  }
}

function topicAtPath(data: JsonObject, pathParts: number[]): JsonObject | null {
  let currentList = data.topics;
  let currentTopic: JsonObject | null = null;

  for (const index of pathParts) {
    if (!Array.isArray(currentList) || index < 0 || index >= currentList.length) return null;
    currentTopic = currentList[index];
    currentList = currentTopic?.subtopics;
  }

  return currentTopic;
}

function collectTopicKeys(topics: JsonObject[], keys = new Set<string>()): Set<string> {
  for (const topic of topics || []) {
    if (topic?.topic) keys.add(String(topic.topic));
    if (Array.isArray(topic?.subtopics)) collectTopicKeys(topic.subtopics, keys);
  }
  return keys;
}

function collectSubjectKeys(topics: JsonObject[], keys = new Set<string>()): Set<string> {
  for (const topic of topics || []) {
    if (topic?.subject_key) keys.add(String(topic.subject_key));
    if (Array.isArray(topic?.subtopics)) collectSubjectKeys(topic.subtopics, keys);
  }
  return keys;
}

function validateUpdate(body: JsonObject): string[] {
  const errors: string[] = [];
  if (!Array.isArray(body.path) || body.path.some((item: any) => !Number.isInteger(item) || item < 0)) {
    errors.push("A valid topic path is required.");
  }
  if (body.responses !== undefined) {
    if (!body.responses || !Array.isArray(body.responses.en) || !Array.isArray(body.responses.ceb)) {
      errors.push("Responses must include en and ceb arrays.");
    }
  }
  for (const key of ["subjectTerms", "phrases", "images", "pins", "routes", "items"]) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      errors.push(`${key} must be an array.`);
    }
  }
  if (body.mapRef !== undefined && typeof body.mapRef !== "string") {
    errors.push("mapRef must be a string.");
  }
  if (body.displayName !== undefined && typeof body.displayName !== "string") {
    errors.push("displayName must be a string.");
  }
  if (body.itemDisclaimer !== undefined && typeof body.itemDisclaimer !== "string") {
    errors.push("itemDisclaimer must be a string.");
  }
  return errors;
}

function validateCreateParent(body: JsonObject): string[] {
  const errors: string[] = [];
  const topic = keyValue(body.topic);
  const subjectKey = keyValue(body.subjectKey);

  if (!topic) errors.push("Topic key is required.");
  if (topic && !isValidKey(topic)) errors.push("Topic key must use lowercase letters, numbers, and underscores only.");
  if (!subjectKey) errors.push("Subject key is required.");
  if (subjectKey && !isValidKey(subjectKey)) errors.push("Subject key must use lowercase letters, numbers, and underscores only.");
  if (body.subjectTerms !== undefined && !Array.isArray(body.subjectTerms)) errors.push("subjectTerms must be an array.");
  if (body.displayName !== undefined && typeof body.displayName !== "string") errors.push("displayName must be a string.");

  return errors;
}

function validateCreateSubtopic(body: JsonObject): string[] {
  const errors: string[] = [];
  const topic = keyValue(body.topic);

  if (!Array.isArray(body.parentPath) || body.parentPath.some((item: any) => !Number.isInteger(item) || item < 0)) {
    errors.push("A valid parent path is required.");
  }
  if (!topic) errors.push("Topic key is required.");
  if (topic && !isValidKey(topic)) errors.push("Topic key must use lowercase letters, numbers, and underscores only.");
  if (!body.responses || !Array.isArray(body.responses.en) || !Array.isArray(body.responses.ceb)) {
    errors.push("Responses must include en and ceb arrays.");
  }
  if (body.displayName !== undefined && typeof body.displayName !== "string") errors.push("displayName must be a string.");
  for (const key of ["phrases", "images", "pins", "routes"]) {
    if (body[key] !== undefined && !Array.isArray(body[key])) errors.push(`${key} must be an array.`);
  }
  if (body.mapRef !== undefined && typeof body.mapRef !== "string") errors.push("mapRef must be a string.");

  return errors;
}

export class AdminKnowledgeController {
  static async list(req: Request, res: Response) {
    try {
      const loaded = await loadKnowledgeRecords();
      if (loaded.files.length === 0) {
        return res.status(404).json({ success: false, message: "Knowledge directory not found" });
      }
      const summaryOnly = req.query.view === "summary";
      return res.json({
        success: true,
        records: summaryOnly ? loaded.records.map(knowledgeSummary) : loaded.records,
        files: loaded.files,
      });
    } catch (error) {
      console.error("Error listing knowledge records:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async detail(req: Request, res: Response) {
    try {
      const { file } = req.params;
      if (!isSafeJsonFile(file)) return res.status(400).json({ success: false, message: "Invalid file name" });
      const pathParts = String(req.query.path || "")
        .split(".")
        .filter(Boolean)
        .map(Number);
      if (!pathParts.length || pathParts.some((part) => !Number.isInteger(part) || part < 0)) {
        return res.status(400).json({ success: false, message: "A valid topic path is required" });
      }
      const filePath = resolveKnowledgeFilePath(file);
      if (!filePath) return res.status(404).json({ success: false, message: "File not found" });
      const data = JSON.parse(await fsPromises.readFile(filePath, "utf-8"));
      const target = topicAtPath(data, pathParts);
      if (!target) return res.status(404).json({ success: false, message: "Topic path not found" });
      const records: JsonObject[] = [];
      collectRecords(file, target, pathParts, parentAtPath(data, pathParts), records);
      return res.json({ success: true, data: records[0] });
    } catch (error) {
      console.error("Error loading knowledge record:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { file } = req.params;
      if (!isSafeJsonFile(file)) {
        return res.status(400).json({ success: false, message: "Invalid file name" });
      }

      const errors = validateUpdate(req.body || {});
      if (errors.length) {
        return res.status(400).json({ success: false, message: errors.join(" ") });
      }

      const filePath = resolveKnowledgeFilePath(file);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File not found" });
      }

      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const target = topicAtPath(data, req.body.path);
      if (!target) {
        return res.status(404).json({ success: false, message: "Topic path not found" });
      }

      // Snapshot previous state before modifying
      const prevTopic = JSON.parse(JSON.stringify(target));

      if (req.body.topic && req.body.topic !== target.topic) {
        return res.status(400).json({ success: false, message: "Topic keys cannot be renamed from Knowledge Manager." });
      }

      if (req.body.displayName !== undefined) {
        const displayName = String(req.body.displayName || "").trim();
        target.display_name = displayName || formatLabel(target.intent || target.topic);
      }

      if (req.body.responses !== undefined) {
        target.responses = {
          ...(target.responses || {}),
          en: req.body.responses.en.map((line: any) => String(line)).filter((line: string) => line.trim()),
          ceb: req.body.responses.ceb.map((line: any) => String(line)).filter((line: string) => line.trim()),
        };
      }

      if (req.body.subjectTerms !== undefined) {
        target.subject_terms = req.body.subjectTerms.map((term: any) => String(term).trim()).filter(Boolean);
      }

      if (req.body.subjectType !== undefined) {
        target.subject_type = keyValue(req.body.subjectType) || "general";
      }

      if (req.body.subjectKey !== undefined) {
        target.subject_key = keyValue(req.body.subjectKey) || undefined;
      }

      if (req.body.phrases !== undefined) {
        target.metadata = {
          ...(target.metadata || {}),
          phrases: req.body.phrases.map((phrase: any) => String(phrase).trim()).filter(Boolean),
        };
      }

      if (req.body.images !== undefined) {
        const newImages = req.body.images.map((image: any) => String(image).trim()).filter(Boolean);
        const oldImages = target.images || [];
        const removedImages = oldImages.filter((img: string) => !newImages.includes(img));

        for (const imgUrl of removedImages) {
          if (typeof imgUrl === "string" && imgUrl.startsWith("/api/images/")) {
            const id = imgUrl.split("/").pop();
            if (id) {
              await deleteImage(id).catch((err) => console.error("Failed to delete unused image:", err));
            }
          }
        }

        target.images = newImages;
      }

      if (req.body.items !== undefined) {
        target.items = req.body.items
          .filter((item: any) => item && typeof item === "object")
          .map((item: any, index: number) => ({
            key: keyValue(item.key) || `item_${index + 1}`,
            group: keyValue(item.group),
            name: keyValue(item.name),
            value: keyValue(item.value),
            text: keyValue(item.text),
            aliases: cleanStringArray(item.aliases),
            search_terms: cleanStringArray(item.search_terms || item.searchTerms),
          }))
          .filter((item: any) => item.name || item.value || item.text);
      }

      if (req.body.itemDisclaimer !== undefined) {
        const itemDisclaimer = keyValue(req.body.itemDisclaimer);
        if (itemDisclaimer) target.itemDisclaimer = itemDisclaimer;
        else {
          delete target.itemDisclaimer;
          delete target.item_disclaimer;
        }
      }

      if (req.body.map !== undefined) {
        target.map = req.body.map || null;
      }

      if (req.body.mapData !== undefined) {
        target.mapData = safeParseJson(req.body.mapData, req.body.mapData);
      }

      if (req.body.pins !== undefined) {
        target.pins = req.body.pins || [];
      }

      if (req.body.routes !== undefined) {
        target.routes = normalizeRoutes(req.body.routes);
      }

      if (req.body.mapRef !== undefined) {
        target.mapRef = keyValue(req.body.mapRef) || undefined;
      }

      if (req.body.intent !== undefined) {
        target.intent = keyValue(req.body.intent) || undefined;
      }

      if (req.body.contextTopic !== undefined) {
        target.context_topic = keyValue(req.body.contextTopic) || undefined;
      }

      await backupJsonFile(filePath, "knowledge");
      await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
      knowledgeListCache = null;

      // Log activity
      const changes = computeKnowledgeDiff(prevTopic, req.body);
      const title = target.display_name || target.topic;
      await logActivity(req, {
        actionType: "update",
        module: "Knowledge Manager",
        summary: `Modified: ${title}`,
        targetTitle: title,
        targetId: file,
        changes,
      }).catch((err) => console.error("Failed to log knowledge update:", err));

      const updatedRecords: JsonObject[] = [];
      collectRecords(file, target, req.body.path, parentAtPath(data, req.body.path), updatedRecords);
      return res.json({ success: true, message: "Knowledge record updated", topic: target, data: updatedRecords[0] });
    } catch (error) {
      console.error("Error updating knowledge record:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async createParent(req: Request, res: Response) {
    try {
      const { file } = req.params;
      if (!isSafeJsonFile(file)) {
        return res.status(400).json({ success: false, message: "Invalid file name" });
      }

      const errors = validateCreateParent(req.body || {});
      if (errors.length) {
        return res.status(400).json({ success: false, message: errors.join(" ") });
      }

      const filePath = resolveKnowledgeFilePath(file);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File not found" });
      }

      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (!Array.isArray(data.topics)) data.topics = [];

      const topic = keyValue(req.body.topic);
      const subjectKey = keyValue(req.body.subjectKey);
      const existingTopicKeys = collectTopicKeys(data.topics);
      const existingSubjectKeys = collectSubjectKeys(data.topics);

      if (existingTopicKeys.has(topic)) {
        return res.status(400).json({ success: false, message: "Topic key already exists in this file." });
      }
      if (existingSubjectKeys.has(subjectKey)) {
        return res.status(400).json({ success: false, message: "Subject key already exists in this file." });
      }

      const parentTopic: JsonObject = {
        topic,
        display_name: keyValue(req.body.displayName) || formatLabel(topic),
        subject_key: subjectKey,
        subject_type: keyValue(req.body.subjectType) || "general",
        subject_terms: cleanStringArray(req.body.subjectTerms),
        subtopics: [],
      };

      data.topics.push(parentTopic);
      await backupJsonFile(filePath, "knowledge");
      await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
      knowledgeListCache = null;

      const title = parentTopic.display_name || parentTopic.topic;
      await logActivity(req, {
        actionType: "create",
        module: "Knowledge Manager",
        summary: `Created Subject Category: "${title}" in ${file}`,
        targetTitle: title,
        targetId: file,
        changes: [
          {
            field: "Subject Category",
            changeType: "added",
            details: `Created subject "${title}" with ${parentTopic.subject_terms?.length || 0} keyword term(s)`,
          }
        ]
      }).catch((err) => console.error("Failed to log parent creation:", err));

      return res.json({
        success: true,
        message: "Parent subject created",
        topic: parentTopic,
        path: [data.topics.length - 1],
      });
    } catch (error) {
      console.error("Error creating parent subject:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async createSubtopic(req: Request, res: Response) {
    try {
      const { file } = req.params;
      if (!isSafeJsonFile(file)) {
        return res.status(400).json({ success: false, message: "Invalid file name" });
      }

      const errors = validateCreateSubtopic(req.body || {});
      if (errors.length) {
        return res.status(400).json({ success: false, message: errors.join(" ") });
      }

      const filePath = resolveKnowledgeFilePath(file);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File not found" });
      }

      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const parent = topicAtPath(data, req.body.parentPath);
      if (!parent) {
        return res.status(404).json({ success: false, message: "Parent topic path not found" });
      }

      if (!Array.isArray(parent.subtopics)) parent.subtopics = [];
      const topic = keyValue(req.body.topic);
      if (parent.subtopics.some((subtopic: JsonObject) => String(subtopic.topic || "") === topic)) {
        return res.status(400).json({ success: false, message: "Subtopic key already exists under this parent." });
      }

      const subtopic: JsonObject = {
        topic,
        display_name: keyValue(req.body.displayName) || formatLabel(keyValue(req.body.intent) || topic),
        responses: {
          en: cleanStringArray(req.body.responses.en),
          ceb: cleanStringArray(req.body.responses.ceb),
        },
      };

      const intent = keyValue(req.body.intent);
      const contextTopic = keyValue(req.body.contextTopic);
      const phrases = cleanStringArray(req.body.phrases);
      const images = cleanStringArray(req.body.images);
      const mapRef = keyValue(req.body.mapRef);

      if (intent) subtopic.intent = intent;
      if (contextTopic) subtopic.context_topic = contextTopic;
      if (phrases.length) subtopic.metadata = { phrases };
      if (images.length) subtopic.images = images;
      if (mapRef) subtopic.mapRef = mapRef;
      if (req.body.map !== undefined) subtopic.map = req.body.map;
      if (req.body.mapData !== undefined) subtopic.mapData = safeParseJson(req.body.mapData, req.body.mapData);
      if (req.body.pins !== undefined) subtopic.pins = req.body.pins;
      if (req.body.routes !== undefined) subtopic.routes = normalizeRoutes(req.body.routes);

      parent.subtopics.push(subtopic);
      const pathParts = [...req.body.parentPath, parent.subtopics.length - 1];
      await backupJsonFile(filePath, "knowledge");
      await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
      knowledgeListCache = null;

      const title = subtopic.display_name || subtopic.topic;
      await logActivity(req, {
        actionType: "create",
        module: "Knowledge Manager",
        summary: `Created Subtopic: "${title}" in ${file}`,
        targetTitle: title,
        targetId: file,
        changes: [
          {
            field: "Subtopic",
            changeType: "added",
            details: `Created subtopic "${title}" with ${subtopic.responses?.en?.length || 0} English and ${subtopic.responses?.ceb?.length || 0} Cebuano responses`,
          }
        ]
      }).catch((err) => console.error("Failed to log subtopic creation:", err));

      return res.json({
        success: true,
        message: "Subtopic created",
        topic: subtopic,
        path: pathParts,
      });
    } catch (error) {
      console.error("Error creating subtopic:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}
