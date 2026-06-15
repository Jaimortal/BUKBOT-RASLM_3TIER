import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

type RuleSet = {
  phrases: Record<string, string>;
  tokens: Record<string, string>;
  roots: Record<string, string>;
  fuzzy_roots: Record<string, string>;
};

const RULES_PATH = path.join(process.cwd(), "rasa", "actions", "normalization_rules.json");
const DEFAULT_RULES: RuleSet = {
  phrases: {},
  tokens: {},
  roots: {},
  fuzzy_roots: {},
};

const BLOCKED_ADMIN_KEYS = new Set([
  "a", "an", "and", "ang", "are", "at", "by", "course", "courses",
  "for", "go", "id", "in", "is", "mga", "of", "office", "on",
  "or", "pay", "program", "programs", "sa", "school", "student",
  "the", "to", "what", "when", "where", "who",
]);

function normalizeText(value: unknown, maxLength: number) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^\w\s?'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > maxLength) return "";
  return normalized;
}

function sanitizeRuleMap(value: unknown, type: keyof RuleSet) {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;

  for (const [rawKey, rawConcepts] of Object.entries(value as Record<string, unknown>)) {
    const key = normalizeText(rawKey, 80);
    const concepts = normalizeText(rawConcepts, 160);
    if (!key || !concepts) continue;
    if (type !== "phrases" && BLOCKED_ADMIN_KEYS.has(key)) continue;
    if (type === "fuzzy_roots" && key.length < 5) continue;
    out[key] = concepts;
  }
  return out;
}

function sanitizeRules(value: unknown): RuleSet {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<RuleSet> : {};
  return {
    phrases: sanitizeRuleMap(raw.phrases, "phrases"),
    tokens: sanitizeRuleMap(raw.tokens, "tokens"),
    roots: sanitizeRuleMap(raw.roots, "roots"),
    fuzzy_roots: sanitizeRuleMap(raw.fuzzy_roots, "fuzzy_roots"),
  };
}

async function readRules(): Promise<RuleSet> {
  try {
    const content = await fs.readFile(RULES_PATH, "utf-8");
    return sanitizeRules(JSON.parse(content));
  } catch {
    return DEFAULT_RULES;
  }
}

export class NormalizationRulesController {
  static async get(req: Request, res: Response) {
    try {
      const rules = await readRules();
      res.json({ success: true, data: rules });
    } catch (error) {
      console.error("Error fetching normalization rules:", error);
      res.status(500).json({ success: false, message: "Failed to fetch normalization rules" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const rules = sanitizeRules(req.body);
      await fs.mkdir(path.dirname(RULES_PATH), { recursive: true });
      await fs.writeFile(RULES_PATH, JSON.stringify(rules, null, 2) + "\n", "utf-8");
      res.json({
        success: true,
        message: "Normalization rules saved. Restart the Rasa action server to apply them.",
        data: rules,
      });
    } catch (error) {
      console.error("Error saving normalization rules:", error);
      res.status(500).json({ success: false, message: "Failed to save normalization rules" });
    }
  }
}
