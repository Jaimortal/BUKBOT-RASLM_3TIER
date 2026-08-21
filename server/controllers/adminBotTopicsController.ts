import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { deleteImage } from '../db/images.js';
import { backupJsonFile } from '../utils/jsonBackup';
import { logActivity, computeKnowledgeDiff } from '../services/activityLogService.js';

const ROUTE_COLORS = ["#ff1744", "#ffea00", "#00b0ff", "#00e676", "#d500f9", "#ff9100", "#00e5ff", "#76ff03"];

function normalizeRoutes(routes: any[]): any[] {
  return (Array.isArray(routes) ? routes : []).map((route: any, index: number) => ({
    name: String(route?.name || `Route ${index + 1}`),
    points: Array.isArray(route?.points) ? route.points : [],
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    route_order: Number(route?.route_order) || index + 1,
    route_label: String(route?.route_label || `Route ${index + 1}`),
  }));
}

// Define the TS structures matching the frontend expectations
export interface BotTopic {
  topicKey: string;
  payload: string;
  superIntent: string;
  defaultLabel: string;
  defaultIcon: string;
  routingType: string;
  previewResponse?: string;
}

export interface TopicRoute {
  name: string;
  points: [number, number][];
  color?: string;
}

export interface BotCategory {
  id: string; 
  displayName: string;
  sourceFile: string;
  topics: BotTopic[];
}

// Utility to generate clean labels from keys like: "restroom_location" -> "Restroom Location"
function formatLabel(topicKey: string): string {
  if (!topicKey) return "Unknown Topic";
  return topicKey
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

// Smart Icon mapping based on keywords
function guessIcon(labelOrKey: string): string {
  const lowered = labelOrKey.toLowerCase();
  if (lowered.includes('location') || lowered.includes('map') || lowered.includes('building') || lowered.includes('where')) return '📍';
  if (lowered.includes('exam') || lowered.includes('test') || lowered.includes('quiz') || lowered.includes('cat')) return '📝';
  if (lowered.includes('enrollment') || lowered.includes('admission') || lowered.includes('apply')) return '📋';
  if (lowered.includes('policy') || lowered.includes('rule') || lowered.includes('guideline')) return '⚖️';
  if (lowered.includes('money') || lowered.includes('fee') || lowered.includes('payment') || lowered.includes('finance') || lowered.includes('cashier')) return '💸';
  if (lowered.includes('academic') || lowered.includes('course') || lowered.includes('class') || lowered.includes('subject')) return '📚';
  if (lowered.includes('dorm') || lowered.includes('housing') || lowered.includes('room')) return '🏠';
  if (lowered.includes('clinic') || lowered.includes('health') || lowered.includes('medical')) return '🏥';
  if (lowered.includes('library') || lowered.includes('book')) return '📖';
  if (lowered.includes('ict') || lowered.includes('tech') || lowered.includes('internet') || lowered.includes('wifi') || lowered.includes('computer')) return '💻';
  if (lowered.includes('sports') || lowered.includes('gym') || lowered.includes('intramural') || lowered.includes('oval')) return '🏅';
  if (lowered.includes('contact') || lowered.includes('email') || lowered.includes('phone') || lowered.includes('reach')) return '📞';
  if (lowered.includes('schedule') || lowered.includes('date') || lowered.includes('time') || lowered.includes('calendar')) return '📅';
  if (lowered.includes('scholar') || lowered.includes('grant') || lowered.includes('tes')) return '🎓';
  if (lowered.includes('staff') || lowered.includes('faculty') || lowered.includes('admin') || lowered.includes('personnel')) return '👨‍🏫';
  if (lowered.includes('password') || lowered.includes('account') || lowered.includes('login') || lowered.includes('portal')) return '🔐';
  if (lowered.includes('result') || lowered.includes('grade') || lowered.includes('report') || lowered.includes('score')) return '📊';
  if (lowered.includes('safet') || lowered.includes('guard')) return '🛡️';
  
  return '💡'; // Fallback
}

// Utility to format a display name from intent string
function formatIntentDisplayName(intent: string): string {
  if (!intent) return 'Unknown';
  let name = intent.replace(/^ask_/, '');
  name = name.replace(/_/g, ' ');
  return name
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function firstResponseText(item: any): string {
  if (Array.isArray(item?.responses?.en)) {
    return item.responses.en.join(" ");
  }
  if (Array.isArray(item?.responses?.answer?.en)) {
    return item.responses.answer.en.join(" ");
  }
  if (Array.isArray(item?.responses?.answer)) {
    return item.responses.answer.join(" ");
  }
  if (typeof item?.responses?.answer === "string") {
    return item.responses.answer;
  }
  return "";
}

function firstPhrase(item: any, fallback: string): string {
  const phrase = item?.metadata?.phrases?.find((value: unknown) => typeof value === "string" && value.trim());
  return phrase ? String(phrase).trim() : fallback;
}

function buildKnowledgePayload(topicKey: string, item: any): string {
  return firstPhrase(item, formatLabel(topicKey));
}

function buildLocationPayload(locationName: string): string {
  return `where is ${locationName}`;
}

export class AdminBotTopicsController {

  // -----------------------------------------------------------------------
  // GET /api/admin/super-intents
  // -----------------------------------------------------------------------
  static async getSuperIntents(req: Request, res: Response) {
    try {
      const basePath = path.join(process.cwd(), 'rasa', 'actions', 'Supper Saiyan');
      if (!fs.existsSync(basePath)) {
        return res.status(404).json({ success: false, message: 'Supper Saiyan directory not found' });
      }

      const files = fs.readdirSync(basePath).filter(f => f.endsWith('.json'));
      const superIntents = files.map(file => {
        try {
          const filePath = path.join(basePath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const intent = data.intent || file.replace('.json', '');
          return {
            file,
            intent,
            displayName: formatIntentDisplayName(intent),
            topicCount: Array.isArray(data.topics)
              ? data.topics.filter((t: any) => t.topic && t.topic.trim()).length
              : 0,
          };
        } catch {
          return null;
        }
      }).filter(Boolean);

      res.json({ success: true, superIntents });
    } catch (error) {
      console.error('Error fetching super intents:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // -----------------------------------------------------------------------
  // GET /api/admin/super-intents/:file
  // -----------------------------------------------------------------------
  static async getSuperIntentTopics(req: Request, res: Response) {
    try {
      const { file } = req.params;
      if (!file || !file.endsWith('.json') || file.includes('..') || file.includes('/')) {
        return res.status(400).json({ success: false, message: 'Invalid file name' });
      }

      const filePath = path.join(process.cwd(), 'rasa', 'actions', 'Supper Saiyan', file);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const intent = data.intent || file.replace('.json', '');

      const topics = (Array.isArray(data.topics) ? data.topics : [])
        .filter((t: any) => t.topic && t.topic.trim())
        .map((t: any) => ({
          topic: t.topic,
          ui_name: t.ui_name || null,
          displayName: t.display_name || t.ui_name || formatLabel(t.intent || t.topic),
          responses: {
            en: Array.isArray(t.responses?.en) ? t.responses.en : [],
            ceb: Array.isArray(t.responses?.ceb) ? t.responses.ceb : [],
          },
          images: Array.isArray(t.images) ? t.images : [],
          map: t.map || null,
          pins: Array.isArray(t.pins) ? t.pins : [],
          routes: Array.isArray(t.routes) ? t.routes : [],
        }));

      res.json({ success: true, intent, displayName: formatIntentDisplayName(intent), topics });
    } catch (error) {
      console.error('Error fetching super intent topics:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // -----------------------------------------------------------------------
  // POST /api/admin/super-intents/:file/topic
  // -----------------------------------------------------------------------
  static async updateTopic(req: Request, res: Response) {
    try {
      const { file } = req.params;
      if (!file || !file.endsWith('.json') || file.includes('..') || file.includes('/')) {
        return res.status(400).json({ success: false, message: 'Invalid file name' });
      }

      const { topic: topicKey, ui_name, responses, images, map, pins, routes } = req.body;
      if (!topicKey) {
        return res.status(400).json({ success: false, message: 'topic key is required' });
      }

      const filePath = path.join(process.cwd(), 'rasa', 'actions', 'Supper Saiyan', file);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (!Array.isArray(data.topics)) {
        return res.status(400).json({ success: false, message: 'Invalid JSON structure: missing topics array' });
      }

      const idx = data.topics.findIndex((t: any) => t.topic === topicKey);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: `Topic "${topicKey}" not found in ${file}` });
      }

      // Merge — NEVER overwrite the topic key itself
      const existing = data.topics[idx];
      const updated: any = { ...existing };

      if (ui_name !== undefined) updated.ui_name = ui_name || undefined;

      if (responses !== undefined) {
        updated.responses = {
          en: Array.isArray(responses.en) ? responses.en : (existing.responses?.en || []),
          ceb: Array.isArray(responses.ceb) ? responses.ceb : (existing.responses?.ceb || []),
        };
      }

      // Sync image deletions
      if (images !== undefined) {
        const newImages = Array.isArray(images)
          ? images.map((s: any) => String(s).trim()).filter(Boolean)
          : (existing.images || []);
        
        const oldImages = Array.isArray(existing.images) ? existing.images : [];
        const removedImages = oldImages.filter((url: any) => !newImages.includes(url));
        
        for (const url of removedImages) {
          if (typeof url === 'string' && url.startsWith('/api/images/')) {
            const id = url.split('/').pop();
            if (id) {
              console.log(`[Database Sync] Deleting image ${id} removed from super intent topic ${topicKey} in ${file}`);
              await deleteImage(id).catch(err => console.error("Failed to delete image from DB:", err));
            }
          }
        }
        
        updated.images = newImages;
      }

      if (map !== undefined) {
        updated.map = map;
      }

      if (pins !== undefined) {
        updated.pins = Array.isArray(pins) ? pins : (existing.pins || []);
      }

      if (routes !== undefined) {
        updated.routes = Array.isArray(routes) ? normalizeRoutes(routes) : normalizeRoutes(existing.routes || []);
      }

      // Clean up undefined ui_name
      if (updated.ui_name === undefined) delete updated.ui_name;

      data.topics[idx] = updated;

      await backupJsonFile(filePath, 'super-intents');
      await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      // Log activity
      const changes = computeKnowledgeDiff(existing, req.body);
      const title = updated.ui_name || updated.display_name || formatLabel(topicKey);
      await logActivity(req, {
        actionType: "update",
        module: "Knowledge Manager",
        summary: `Modified: ${title}`,
        targetTitle: title,
        targetId: file,
        changes
      }).catch(err => console.error("Failed to log super intent topic update:", err));

      res.json({ success: true, message: 'Topic updated successfully', topic: updated });
    } catch (error) {
      console.error('Error updating topic:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // -----------------------------------------------------------------------
  // GET /api/admin/bot-topics
  // -----------------------------------------------------------------------
  static async getTopics(req: Request, res: Response) {
    try {
      const categories: BotCategory[] = [];
      const basePath = path.join(process.cwd(), 'rasa', 'actions');
      
      // 1. Parse Supper Saiyan/ JSON files
      const supperSaiyanPath = path.join(basePath, 'Supper Saiyan');
      if (fs.existsSync(supperSaiyanPath)) {
        const files = fs.readdirSync(supperSaiyanPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          try {
            const filePath = path.join(supperSaiyanPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            const superIntent = data.intent; 
            
            if (data.topics && Array.isArray(data.topics)) {
              const botTopics: BotTopic[] = [];
              for (const top of data.topics) {
                if (!top.topic) continue;

                const parentKey = top.topic;
                if (Array.isArray(top.subtopics) && top.subtopics.length > 0) {
                  for (const sub of top.subtopics) {
                    const subKey = sub.intent || sub.topic;
                    if (!subKey) continue;
                    const topicKey = `${parentKey}.${subKey}`;
                    const labelSource = sub.display_name || sub.ui_name;
                    const fallbackLabelSource = sub.intent || sub.topic || parentKey;
                    botTopics.push({
                      topicKey,
                      payload: buildKnowledgePayload(subKey, sub),
                      superIntent,
                      defaultLabel: labelSource || formatLabel(fallbackLabelSource),
                      defaultIcon: guessIcon((labelSource || fallbackLabelSource) + ' ' + file),
                      routingType: 'supper_saiyan',
                      previewResponse: firstResponseText(sub)
                    });
                  }
                  continue;
                }

                const topicKey = parentKey;
                botTopics.push({
                  topicKey,
                  payload: buildKnowledgePayload(topicKey, top),
                  superIntent,
                  defaultLabel: top.display_name || top.ui_name || formatLabel(topicKey),
                  defaultIcon: guessIcon((top.display_name || top.ui_name || topicKey) + ' ' + file),
                  routingType: 'supper_saiyan',
                  previewResponse: firstResponseText(top)
                });
              }
              
              if (botTopics.length > 0) {
                categories.push({
                  id: file,
                  displayName: formatLabel(file.replace('.json', '')),
                  sourceFile: `Supper Saiyan/${file}`,
                  topics: botTopics
                });
              }
            }
          } catch (err) {
            console.error(`Error parsing file ${file}:`, err);
          }
        }
      }
      
      // 2. Parse responses_location.json
      const locationFile = path.join(basePath, 'responses_location.json');
      if (fs.existsSync(locationFile)) {
        try {
          const content = fs.readFileSync(locationFile, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.locations && typeof data.locations === 'object') {
            const locTopics: BotTopic[] = [];
            for (const key of Object.keys(data.locations)) {
              let preview = "";
              if (data.locations[key]?.responses?.en && Array.isArray(data.locations[key].responses.en)) {
                preview = data.locations[key].responses.en.join(" ");
              }
              locTopics.push({
                topicKey: key,
                payload: buildLocationPayload(key),
                superIntent: 'ask_location',
                defaultLabel: formatLabel(key),
                defaultIcon: guessIcon(key + ' location map building'),
                routingType: 'location',
                previewResponse: preview
              });
            }
            
            categories.push({
              id: 'responses_location.json',
              displayName: 'Locations & Mapping',
              sourceFile: 'responses_location.json',
              topics: locTopics
            });
          }
        } catch (err) {
          console.error("Error parsing responses_location.json:", err);
        }
      }
      
      // 3. Parse responses.json
      const responsesFile = path.join(basePath, 'responses.json');
      if (fs.existsSync(responsesFile)) {
        try {
          const content = fs.readFileSync(responsesFile, 'utf-8');
          const data = JSON.parse(content);
          
          if (Array.isArray(data)) {
            const resTopics: BotTopic[] = [];
            for (const item of data) {
              if (item.intent) {
                let preview = "";
                if (item.responses?.answer) {
                  preview = typeof item.responses.answer === 'string' 
                    ? item.responses.answer 
                    : Array.isArray(item.responses.answer) ? item.responses.answer.join(" ") : "";
                }
                resTopics.push({
                  topicKey: item.intent,
                  payload: formatLabel(item.intent),
                  superIntent: item.intent,
                  defaultLabel: formatLabel(item.intent),
                  defaultIcon: guessIcon(item.intent + ' ' + (item.category || '')),
                  routingType: 'response',
                  previewResponse: preview
                });
              }
            }
            
            categories.push({
              id: 'responses.json',
              displayName: 'General Responses',
              sourceFile: 'responses.json',
              topics: resTopics
            });
          }
        } catch (err) {
          console.error("Error parsing responses.json:", err);
        }
      }
      
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching bot topics:', error);
      res.status(500).json({ message: 'Internal server error while fetching bot topics' });
    }
  }
}
