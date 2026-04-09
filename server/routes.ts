import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { ChatController } from "./controllers/chatController";
import { AdminController } from "./controllers/adminController";
import { AuthController } from "./controllers/authController";
import { FaqController } from "./controllers/faqController";
import { AdminBotTopicsController } from "./controllers/adminBotTopicsController";
import { MapController } from "./controllers/mapController";
import emailRoutes from "./routes/emailRoutes";
import adminMigrationRoutes from "./routes/admin-migration.js";
import jwt from "jsonwebtoken";
import multer from "multer";
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

  // PUBLIC USER PRIVILEGES
  app.get("/api/user-privileges", AdminController.getUserPrivileges);


  // IMAGE UPLOAD ROUTE (Admin only) - Saves to PostgreSQL
  app.post("/api/admin/upload-image", requireAuth, upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    
    try {
      // Convert buffer to base64
      const base64Data = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const filename = req.file.originalname;
      const size = req.file.size;
      
      // Save to database
      const image = await dbImages.saveImage({
        filename,
        mimeType,
        data: base64Data,
        size,
      });
      
      if (!image) {
        return res.status(500).json({ success: false, message: "Failed to save image" });
      }
      
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

  // ADMIN ROUTES
  app.post("/api/admin/map-settings", requireAuth, AdminController.updateMapSettings);
  
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

  // BOT TOPICS (ADMIN)
  app.get("/api/admin/bot-topics", requireAuth, AdminBotTopicsController.getTopics);

  // SUPER INTENTS (ADMIN) - list, topics, update
  app.get("/api/admin/super-intents", requireAuth, AdminBotTopicsController.getSuperIntents);
  app.get("/api/admin/super-intents/:file", requireAuth, AdminBotTopicsController.getSuperIntentTopics);
  app.post("/api/admin/super-intents/:file/topic", requireAuth, AdminBotTopicsController.updateTopic);

  // USER PRIVILEGES (ADMIN)

  app.get("/api/admin/privileges", requireAuth, AdminController.getUserPrivileges);

  app.post("/api/admin/privileges", requireAuth, AdminController.updateUserPrivileges);

  // PASSWORD CHANGE (ADMIN)
  app.post("/api/admin/change-password", requireAuth, AdminController.changePassword);

  // MIGRATION ROUTES (ADMIN)
  app.use("/api/admin/migrate", requireAuth, adminMigrationRoutes);

  // EMAIL VERIFICATION ROUTES
  app.use("/api/email", emailRoutes);

  return httpServer;
}
