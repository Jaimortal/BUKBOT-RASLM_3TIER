import fs from "fs/promises";
import path from "path";
import { Request, Response } from "express";

const SETTINGS_PATH = path.join(process.cwd(), "data", "chat_widget_settings.json");

const DEFAULT_SETTINGS = {
  inactiveIcon: "💬",
  inactiveImageUrl: "",
  activeIcon: "✕",
  activeImageUrl: "",
  inactiveCustomImages: [],
  activeCustomImages: [],
  chatheadBgColor: "#001C38",
  chatheadOpacity: 1,
  audioResponseEnabled: true,
};

async function readSettings() {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(value: any) {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  const settings = {
    inactiveIcon: String(value?.inactiveIcon || value?.chatheadIcon || DEFAULT_SETTINGS.inactiveIcon),
    inactiveImageUrl: String(value?.inactiveImageUrl || value?.chatheadImageUrl || ""),
    activeIcon: String(value?.activeIcon || DEFAULT_SETTINGS.activeIcon),
    activeImageUrl: String(value?.activeImageUrl || ""),
    inactiveCustomImages: Array.isArray(value?.inactiveCustomImages) ? value.inactiveCustomImages.map(String).filter(Boolean).slice(0, 18) : [],
    activeCustomImages: Array.isArray(value?.activeCustomImages) ? value.activeCustomImages.map(String).filter(Boolean).slice(0, 18) : [],
    chatheadBgColor: /^#[0-9a-fA-F]{6}$/.test(String(value?.chatheadBgColor || ""))
      ? String(value.chatheadBgColor)
      : DEFAULT_SETTINGS.chatheadBgColor,
    chatheadOpacity: Math.min(1, Math.max(0.35, Number(value?.chatheadOpacity ?? DEFAULT_SETTINGS.chatheadOpacity))),
    audioResponseEnabled: value?.audioResponseEnabled !== false,
  };
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}

export class ChatWidgetSettingsController {
  static async get(req: Request, res: Response) {
    const settings = await readSettings();
    res.json({ success: true, data: settings });
  }

  static async update(req: Request, res: Response) {
    try {
      const settings = await writeSettings(req.body);
      res.json({ success: true, message: "Chat widget settings saved", data: settings });
    } catch (error) {
      console.error("Error saving chat widget settings:", error);
      res.status(500).json({ success: false, message: "Failed to save chat widget settings" });
    }
  }
}
