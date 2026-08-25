import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { ChatController } from "./controllers/chatController";
import { AdminController } from "./controllers/adminController";
import { AuthController } from "./controllers/authController";
import { FaqController } from "./controllers/faqController";
import { AdminBotTopicsController } from "./controllers/adminBotTopicsController";
import { AdminKnowledgeController } from "./controllers/adminKnowledgeController";
import { MapController } from "./controllers/mapController";
import { ReportController } from "./controllers/reportController";
import { ChatWidgetSettingsController } from "./controllers/chatWidgetSettingsController";
import { NormalizationRulesController } from "./controllers/normalizationRulesController";
import { ActivityLogController } from "./controllers/activityLogController";
import { logActivity } from "./services/activityLogService";
import emailRoutes from "./routes/emailRoutes";
import adminMigrationRoutes from "./routes/admin-migration.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import sharp from "sharp";
import * as dbImages from "./db/images.js";

// Configure multer for memory storage (to save to PostgreSQL)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey) return next();
    const providedKey = req.header("x-admin-key");
    if (providedKey && providedKey === expectedKey) return next();
    return res.status(401).json({ success: false, message: "Unauthorized" });
  };

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (!decoded) {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }
      
      // Attach user info to request for potential use
      (req as any).user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
  
  // AUTHENTICATION ROUTES
  app.post("/api/admin/login", AuthController.login);
  app.post("/api/admin/google-login", AuthController.googleLogin);
  app.post("/api/admin/verify", AuthController.verify);
  app.post("/api/admin/logout", AuthController.logout);
  
  // CHAT ROUTE
  app.post("/api/chat", ChatController.handleChat);
  app.get("/api/faqs", FaqController.getActiveFaqs);
  app.post("/api/reports", ReportController.create);
  app.post("/api/reports/response", ReportController.createResponseReport);
  app.get("/api/chat-widget-settings", ChatWidgetSettingsController.get);

  // PUBLIC USER PRIVILEGES
  app.get("/api/user-privileges", AdminController.getUserPrivileges);

  // IMAGE UPLOAD ROUTE (Admin only) - Saves to PostgreSQL
  // Accepts up to 10MB raw upload, auto-compresses to WebP (max 1200px, 82% quality)
  // before storing — typically reduces 6-7MB photos to ~100-250KB.
  app.post("/api/admin/upload-image", requireAuth, upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    try {
      // Auto-compress: resize to max 800px width, convert to WebP at 65% quality.
      const compressedBuffer = await sharp(req.file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 65 })
        .toBuffer();

      const base64Data = compressedBuffer.toString('base64');
      const mimeType = 'image/webp';
      // Keep original filename but change extension so it's clear it was converted.
      const filename = req.file.originalname.replace(/\.[^.]+$/, '') + '.webp';
      const size = compressedBuffer.length;

      console.log(
        `[Image Upload] Original: ${(req.file.size / 1024).toFixed(1)}KB` +
        ` → Compressed: ${(size / 1024).toFixed(1)}KB` +
        ` (${Math.round((1 - size / req.file.size) * 100)}% reduction)`
      );

      // Save compressed image to database
      const image = await dbImages.saveImage({
        filename,
        mimeType,
        data: base64Data,
        size,
      });

      if (!image) {
        return res.status(500).json({ success: false, message: "Failed to save image" });
      }

      // Log activity
      await logActivity(req, {
        actionType: "upload",
        module: "Images",
        summary: `Uploaded image: "${filename}" (${(size / 1024).toFixed(1)} KB)`,
        targetTitle: filename,
        targetId: image.id,
        changes: [
          {
            field: "Image",
            changeType: "added",
            details: `Uploaded image "${filename}" (${(size / 1024).toFixed(1)} KB)`
          }
        ]
      }).catch((err) => console.error("Error logging image upload:", err));

      // Return URL that can be used to retrieve the image
      const url = `/api/images/${image.id}`;
      return res.json({ success: true, url, id: image.id });
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ success: false, message: "Failed to upload image" });
    }
  });

  // Get all images (Admin only)
  app.get("/api/admin/images", requireAuth, async (req, res) => {
    try {
      const images = await dbImages.getAllImages();
      return res.json({ success: true, data: images.map(img => ({
        id: img.id,
        filename: img.filename,
        mimeType: img.mimeType,
        size: img.size,
        createdAt: img.createdAt,
        url: `/api/images/${img.id}`,
      }))});
    } catch (error) {
      console.error("Error fetching images:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch images" });
    }
  });

  // Delete image (Admin only)
  app.delete("/api/admin/images/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dbImages.deleteImage(id);
      if (result) {
        // Log activity
        await logActivity(req, {
          actionType: "delete",
          module: "Images",
          summary: `Deleted image ID: "${id}"`,
          targetTitle: `Image ID: ${id}`,
          targetId: id,
          changes: [
            {
              field: "Image",
              changeType: "removed",
              details: `Deleted image ID ${id}`
            }
          ]
        }).catch((err) => console.error("Error logging image deletion:", err));

        return res.json({ success: true, message: "Image deleted successfully" });
      }
      return res.status(500).json({ success: false, message: "Failed to delete image" });
    } catch (error) {
      console.error("Error deleting image:", error);
      return res.status(500).json({ success: false, message: "Failed to delete image" });
    }
  });

  // PUBLIC ROUTE: Serve image by ID
  app.get("/api/images/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const image = await dbImages.getImageById(id);
      
      if (!image) {
        return res.status(404).json({ success: false, message: "Image not found" });
      }
      
      // Convert base64 back to buffer and send
      const buffer = Buffer.from(image.data, 'base64');
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.send(buffer);
    } catch (error) {
      console.error("Error serving image:", error);
      return res.status(500).json({ success: false, message: "Failed to serve image" });
    }
  });

  // ADMIN DASHBOARD ROUTES
  app.get("/api/privileges", AdminController.getUserPrivileges);

  // MAP SETTINGS PUBLIC
  app.get("/api/map-settings", AdminController.getMapSettings);

  // PUBLIC: lightweight map locations for map quick access (no auth required)
  app.get("/api/map-locations", AdminController.getMapLocations);

  // ADMIN ROUTES
  app.post("/api/admin/map-settings", requireAuth, AdminController.updateMapSettings);
  app.post("/api/admin/chat-widget-settings", requireAuth, ChatWidgetSettingsController.update);
  app.get("/api/admin/normalization-rules", requireAuth, NormalizationRulesController.get);
  app.post("/api/admin/normalization-rules", requireAuth, NormalizationRulesController.update);
  app.delete("/api/admin/reports/:id", requireAuth, ReportController.delete);
  
  // Get all responses
  app.get("/api/admin/responses", requireAuth, AdminController.getResponses);

  // Create or update a response
  app.post("/api/admin/responses", requireAuth, AdminController.createOrUpdateResponse);

  // Translate text to Cebuano
  app.post("/api/admin/translate", requireAuth, AdminController.translateToCebuano);

  app.get("/api/admin/auto-translate-status", requireAuth, AdminController.getAutoTranslateStatus);

  // Delete a response
  app.delete("/api/admin/responses/:intent", requireAuth, AdminController.deleteResponse);

  // Get all locations
  app.get("/api/admin/locations", requireAuth, AdminController.getLocations);

  // Create or update a location
  app.post("/api/admin/locations", requireAuth, AdminController.createOrUpdateLocation);

  // Delete a location
  app.delete("/api/admin/locations/:id", requireAuth, AdminController.deleteLocation);

  // MAP ROUTES
  app.get("/api/maps", MapController.getMaps);
  app.get("/api/maps/:id", MapController.getMap);
  app.get("/api/maps/:id/routes", MapController.getRoutes);
  app.get("/api/maps/:id/markers", MapController.getMarkers);

  // ADMIN MAP ROUTES
  app.post("/api/admin/maps", requireAuth, MapController.upsertMap);
  app.delete("/api/admin/maps/:id", requireAuth, MapController.deleteMap);
  app.post("/api/admin/maps/:id/routes", requireAuth, MapController.upsertRoute);
  app.delete("/api/admin/routes/:id", requireAuth, MapController.deleteRoute);
  app.post("/api/admin/maps/:id/markers", requireAuth, MapController.upsertMarker);
  app.delete("/api/admin/markers/:id", requireAuth, MapController.deleteMarker);
  app.post("/api/admin/maps/import", requireAuth, MapController.importMap);

  // FAQs (ADMIN)
  app.get("/api/admin/faqs", requireAuth, FaqController.getAllFaqs);
  app.post("/api/admin/faqs", requireAuth, FaqController.upsertFaq);
  app.delete("/api/admin/faqs/:id", requireAuth, FaqController.deleteFaq);

  // REPORTS (ADMIN)
  app.get("/api/admin/reports", requireAuth, ReportController.list);

  // BOT TOPICS (ADMIN)
  app.get("/api/admin/bot-topics", requireAuth, AdminBotTopicsController.getTopics);

  // KNOWLEDGE MANAGER (ADMIN) - structured nested JSON browser/editor
  app.get("/api/admin/knowledge", requireAuth, AdminKnowledgeController.list);
  app.post("/api/admin/knowledge/:file(*)/parent", requireAuth, AdminKnowledgeController.createParent);
  app.post("/api/admin/knowledge/:file(*)/subtopic", requireAuth, AdminKnowledgeController.createSubtopic);
  app.post("/api/admin/knowledge/:file(*)/topic", requireAuth, AdminKnowledgeController.update);

  // SUPER INTENTS (ADMIN) - list, topics, update
  app.get("/api/admin/super-intents", requireAuth, AdminBotTopicsController.getSuperIntents);
  app.get("/api/admin/super-intents/:file(*)", requireAuth, AdminBotTopicsController.getSuperIntentTopics);
  app.post("/api/admin/super-intents/:file(*)/topic", requireAuth, AdminBotTopicsController.updateTopic);

  // USER PRIVILEGES (ADMIN)
  app.get("/api/admin/privileges", requireAuth, AdminController.getUserPrivileges);
  app.post("/api/admin/privileges", requireAuth, AdminController.updateUserPrivileges);

  // ACTIVITY LOGS (ADMIN - Main Admin only)
  app.get("/api/admin/activity-logs", requireAuth, ActivityLogController.list);
  app.delete("/api/admin/activity-logs/:id", requireAuth, ActivityLogController.delete);
  app.delete("/api/admin/activity-logs", requireAuth, ActivityLogController.clearAll);

  // PASSWORD CHANGE (ADMIN)
  app.post("/api/admin/change-password", requireAuth, AdminController.changePassword);

  // MIGRATION ROUTES (ADMIN)
  app.use("/api/admin/migrate", requireAuth, adminMigrationRoutes);

  // EMAIL VERIFICATION ROUTES
  app.use("/api/email", emailRoutes);

  return httpServer;
}
