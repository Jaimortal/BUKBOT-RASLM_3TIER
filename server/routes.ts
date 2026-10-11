import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { ChatController } from "./controllers/chatController";
import { AdminController } from "./controllers/adminController";
import { AuthController, isTokenRevoked } from "./controllers/authController";
import { FaqController } from "./controllers/faqController";
import { AdminBotTopicsController } from "./controllers/adminBotTopicsController";
import { AdminKnowledgeController } from "./controllers/adminKnowledgeController";
import { MapController } from "./controllers/mapController";
import { ReportController } from "./controllers/reportController";
import { ChatWidgetSettingsController } from "./controllers/chatWidgetSettingsController";
import { NormalizationRulesController } from "./controllers/normalizationRulesController";
import { ActivityLogController } from "./controllers/activityLogController";
import { logActivity } from "./services/activityLogService";
import { getPerformanceReport, startPerformanceSampler } from "./services/performanceTelemetry";
import emailRoutes from "./routes/emailRoutes";
import adminMigrationRoutes from "./routes/admin-migration.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import sharp from "sharp";
import * as dbImages from "./db/images.js";
import { RbacController } from "./controllers/rbacController";
import { RbacService, type AdminPermissions } from "./services/rbacService";
import { query as databaseQuery } from "./db.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

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
  startPerformanceSampler();

  app.get("/api/health", async (_req, res) => {
    const rasaBaseUrl = (process.env.RASA_BASE_URL || "http://127.0.0.1:5005").replace(/\/$/, "");
    const [database, rasa] = await Promise.allSettled([
      databaseQuery("SELECT 1 FROM conversation_logs LIMIT 1"),
      fetch(`${rasaBaseUrl}/status`, { signal: AbortSignal.timeout(3000) }).then((response) => {
        if (!response.ok) throw new Error("Rasa unavailable");
      }),
    ]);
    const ready = database.status === "fulfilled" && rasa.status === "fulfilled";
    return res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "degraded",
      database: database.status === "fulfilled" ? "ready" : "unavailable",
      rasa: rasa.status === "fulfilled" ? "ready" : "unavailable",
    });
  });

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
    if (isTokenRevoked(token)) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }
    
    try {
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
      const decoded = jwt.verify(token, JWT_SECRET) as { username?: string; role?: string } | null;
      
      if (!decoded || !decoded.username) {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }

      // Live account status check on every authenticated request (prevents disabled/deleted users from reusing JWTs)
      const liveUser = RbacService.getAdminByEmail(decoded.username);
      if (!liveUser) {
        return res.status(401).json({ success: false, message: "User account no longer exists" });
      }

      if (liveUser.status === "pending_approval") {
        return res.status(403).json({
          success: false,
          message: "Wait for the main admin to allow your sign in, as of now always check your email",
          pending: true
        });
      }

      if (liveUser.status === "disabled" || liveUser.enabled === false) {
        return res.status(403).json({
          success: false,
          message: "you are not allowed to login since your account is disabled by the Main-Admin, please contact your Main Administrator to enable your account",
          disabled: true
        });
      }
      
      // Attach live user info to request
      (req as any).user = {
        ...decoded,
        username: liveUser.email,
        role: liveUser.role,
        permissions: liveUser.permissions
      };
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };

  const requirePermission = (permissionKey: keyof AdminPermissions) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      if (user.role === "main-admin" || user.username?.toLowerCase() === "thepersonaljaime@gmail.com") {
        return next();
      }
      const hasPerm = RbacService.hasPermission(user.username, permissionKey);
      if (!hasPerm) {
        logActivity(req, {
          actionType: "update",
          module: "Rules & RBAC",
          summary: `Blocked unauthorized access by ${user.username} to ${req.method} ${req.originalUrl}`,
          targetTitle: `${req.method} ${req.originalUrl}`,
          targetId: String(permissionKey),
          changes: [
            {
              field: `Permission Required: ${String(permissionKey)}`,
              changeType: "modified",
              details: `Access denied for ${user.username} (missing rule: ${String(permissionKey)})`,
              oldValue: false,
              newValue: "blocked",
            },
          ],
        }).catch(() => {});
        return res.status(403).json({
          success: false,
          message: "Access Denied: You do not have permission to access this resource or feature."
        });
      }
      next();
    };
  };

  const requireAnyPermission = (...permissionKeys: (keyof AdminPermissions)[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      if (user.role === "main-admin" || user.username?.toLowerCase() === "thepersonaljaime@gmail.com") {
        return next();
      }
      const allowed = permissionKeys.some((key) => RbacService.hasPermission(user.username, key));
      if (!allowed) {
        logActivity(req, {
          actionType: "update",
          module: "Rules & RBAC",
          summary: `Blocked unauthorized access by ${user.username} to ${req.method} ${req.originalUrl}`,
          targetTitle: `${req.method} ${req.originalUrl}`,
          targetId: permissionKeys.join("|"),
          changes: [
            {
              field: `Permissions Required: ${permissionKeys.join(", ")}`,
              changeType: "modified",
              details: `Access denied for ${user.username} (requires any of: ${permissionKeys.join(", ")})`,
              oldValue: false,
              newValue: "blocked",
            },
          ],
        }).catch(() => {});
        return res.status(403).json({
          success: false,
          message: "Access Denied: You do not have permission to access this resource or feature."
        });
      }
      next();
    };
  };

  const requireMainAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (user.role === "main-admin" || user.username?.toLowerCase() === "thepersonaljaime@gmail.com") {
      return next();
    }
    logActivity(req, {
      actionType: "update",
      module: "Rules & RBAC",
      summary: `Blocked non-main-admin ${user.username} from ${req.method} ${req.originalUrl}`,
      targetTitle: `${req.method} ${req.originalUrl}`,
      targetId: "main-admin",
      changes: [
        {
          field: "Role Required: main-admin",
          changeType: "modified",
          details: `Blocked ${user.username} from Main-Admin endpoint`,
          oldValue: user.role || "admin",
          newValue: "blocked",
        },
      ],
    }).catch(() => {});
    return res.status(403).json({
      success: false,
      message: "Access Denied: Main Administrator role required."
    });
  };
  
  // AUTHENTICATION & SIGN-UP ROUTES
  app.post("/api/admin/login", AuthController.login);
  app.post("/api/admin/google-login", AuthController.googleLogin);
  app.post("/api/admin/verify", AuthController.verify);
  app.post("/api/admin/logout", AuthController.logout);
  app.get("/api/admin/signup/status", AuthController.getSignupStatus);
  app.post("/api/admin/signup/send-otp", AuthController.signupSendOtp);
  app.post("/api/admin/signup/register", AuthController.signupRegister);
  
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
  app.post("/api/admin/upload-image", requireAuth, requireAnyPermission("nav_gallery", "modal_images", "settings_chathead_studio"), upload.single("image"), async (req, res) => {
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
  app.get("/api/admin/images", requireAuth, requireAnyPermission("nav_gallery", "modal_images", "settings_chathead_studio"), async (req, res) => {
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
  app.delete("/api/admin/images/:id", requireAuth, requireAnyPermission("nav_gallery", "modal_images"), async (req, res) => {
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
  app.post("/api/admin/map-settings", requireAuth, requirePermission("settings_maps"), AdminController.updateMapSettings);
  app.post("/api/admin/chat-widget-settings", requireAuth, requireAnyPermission("settings_chatbox_controls", "settings_chathead_studio"), ChatWidgetSettingsController.update);
  app.get("/api/admin/normalization-rules", requireAuth, requirePermission("settings_chatbox_controls"), NormalizationRulesController.get);
  app.post("/api/admin/normalization-rules", requireAuth, requirePermission("settings_chatbox_controls"), NormalizationRulesController.update);
  app.delete("/api/admin/reports/:id", requireAuth, requirePermission("reports_chatbot"), ReportController.delete);
  
  // Get all responses
  app.get("/api/admin/responses", requireAuth, requirePermission("responses_knowledge"), AdminController.getResponses);

  // Create or update a response
  app.post("/api/admin/responses", requireAuth, requirePermission("responses_knowledge"), AdminController.createOrUpdateResponse);

  // Translate text to Cebuano
  app.post("/api/admin/translate", requireAuth, requireAnyPermission("responses_knowledge", "responses_locations"), AdminController.translateToCebuano);

  app.get("/api/admin/auto-translate-status", requireAuth, requireAnyPermission("responses_knowledge", "responses_locations"), AdminController.getAutoTranslateStatus);

  // Delete a response
  app.delete("/api/admin/responses/:intent", requireAuth, requirePermission("responses_knowledge"), AdminController.deleteResponse);

  // Get all locations
  app.get("/api/admin/locations", requireAuth, requireAnyPermission("responses_locations", "responses_knowledge", "modal_map"), AdminController.getLocations);
  app.get("/api/admin/locations/:id", requireAuth, requireAnyPermission("responses_locations", "responses_knowledge", "modal_map"), AdminController.getLocation);

  // Create or update a location
  app.post("/api/admin/locations", requireAuth, requirePermission("responses_locations"), AdminController.createOrUpdateLocation);

  // Delete a location
  app.delete("/api/admin/locations/:id", requireAuth, requirePermission("responses_locations"), AdminController.deleteLocation);

  // MAP ROUTES
  app.get("/api/maps", MapController.getMaps);
  app.get("/api/maps/:id", MapController.getMap);
  app.get("/api/maps/:id/routes", MapController.getRoutes);
  app.get("/api/maps/:id/markers", MapController.getMarkers);

  // ADMIN MAP ROUTES
  app.post("/api/admin/maps", requireAuth, requireAnyPermission("responses_locations", "modal_map"), MapController.upsertMap);
  app.delete("/api/admin/maps/:id", requireAuth, requirePermission("responses_locations"), MapController.deleteMap);
  app.post("/api/admin/maps/:id/routes", requireAuth, requireAnyPermission("responses_locations", "modal_map"), MapController.upsertRoute);
  app.delete("/api/admin/routes/:id", requireAuth, requireAnyPermission("responses_locations", "modal_map"), MapController.deleteRoute);
  app.post("/api/admin/maps/:id/markers", requireAuth, requireAnyPermission("responses_locations", "modal_map"), MapController.upsertMarker);
  app.delete("/api/admin/markers/:id", requireAuth, requireAnyPermission("responses_locations", "modal_map"), MapController.deleteMarker);
  app.post("/api/admin/maps/import", requireAuth, requirePermission("responses_locations"), MapController.importMap);

  // FAQs (ADMIN)
  app.get("/api/admin/faqs", requireAuth, requireAnyPermission("responses_knowledge", "settings_chatbox_controls"), FaqController.getAllFaqs);
  app.post("/api/admin/faqs", requireAuth, requireAnyPermission("responses_knowledge", "settings_chatbox_controls"), FaqController.upsertFaq);
  app.delete("/api/admin/faqs/:id", requireAuth, requireAnyPermission("responses_knowledge", "settings_chatbox_controls"), FaqController.deleteFaq);

  // REPORTS (ADMIN)
  app.get("/api/admin/reports", requireAuth, requirePermission("reports_chatbot"), ReportController.list);
  app.get("/api/admin/faq-gap-report", requireAuth, requirePermission("reports_faq_gaps"), async (req, res) => {
    try {
      const file = path.resolve(process.cwd(), "docs/Testing/FULL TESTING TOPICS/result/02FAQ_1.1_Report.json");
      const report = JSON.parse(await readFile(file, "utf8"));
      return res.json({ success: true, data: report });
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return res.status(404).json({ success: false, message: "FAQ gap report has not been generated yet" });
      }
      console.error("Could not read FAQ gap report", error);
      return res.status(500).json({ success: false, message: "Could not load FAQ gap report" });
    }
  });
  app.get("/api/admin/performance", requireAuth, requirePermission("reports_performance"), async (_req, res) => {
    res.json({ success: true, data: await getPerformanceReport() });
  });

  // BOT TOPICS (ADMIN)
  app.get("/api/admin/bot-topics", requireAuth, requirePermission("responses_knowledge"), AdminBotTopicsController.getTopics);

  // KNOWLEDGE MANAGER (ADMIN) - structured nested JSON browser/editor
  app.get("/api/admin/knowledge", requireAuth, requirePermission("responses_knowledge"), AdminKnowledgeController.list);
  app.get("/api/admin/knowledge/:file(*)/topic", requireAuth, requirePermission("responses_knowledge"), AdminKnowledgeController.detail);
  app.post("/api/admin/knowledge/:file(*)/parent", requireAuth, requirePermission("responses_knowledge"), AdminKnowledgeController.createParent);
  app.post("/api/admin/knowledge/:file(*)/subtopic", requireAuth, requirePermission("responses_knowledge"), AdminKnowledgeController.createSubtopic);
  app.post("/api/admin/knowledge/:file(*)/topic", requireAuth, requirePermission("responses_knowledge"), AdminKnowledgeController.update);

  // SUPER INTENTS (ADMIN) - list, topics, update
  app.get("/api/admin/super-intents", requireAuth, requirePermission("responses_knowledge"), AdminBotTopicsController.getSuperIntents);
  app.get("/api/admin/super-intents/:file(*)", requireAuth, requirePermission("responses_knowledge"), AdminBotTopicsController.getSuperIntentTopics);
  app.post("/api/admin/super-intents/:file(*)/topic", requireAuth, requirePermission("responses_knowledge"), AdminBotTopicsController.updateTopic);

  // USER PRIVILEGES (ADMIN)
  app.get("/api/admin/privileges", requireAuth, requirePermission("settings_chatbox_controls"), AdminController.getUserPrivileges);
  app.post("/api/admin/privileges", requireAuth, requirePermission("settings_chatbox_controls"), AdminController.updateUserPrivileges);

  // ACTIVITY LOGS (ADMIN - Main Admin or permitted admin)
  app.get("/api/admin/activity-logs", requireAuth, requirePermission("reports_activity_logs"), ActivityLogController.list);
  app.delete("/api/admin/activity-logs/:id", requireAuth, requireMainAdmin, ActivityLogController.delete);
  app.delete("/api/admin/activity-logs", requireAuth, requireMainAdmin, ActivityLogController.clearAll);

  // PASSWORD CHANGE (ADMIN)
  app.post("/api/admin/change-password", requireAuth, requirePermission("settings_credentials"), AdminController.changePassword);

  // MIGRATION ROUTES (ADMIN) - guarded by sync records permission
  app.use("/api/admin/migrate", requireAuth, requirePermission("responses_sync"), adminMigrationRoutes);

  // RBAC & RULES MODIFICATION ROUTES
  app.get("/api/admin/rbac/users", requireAuth, requirePermission("nav_rbac"), RbacController.getAdmins);
  app.post("/api/admin/rbac/permissions", requireAuth, requirePermission("nav_rbac"), RbacController.updatePermissions);
  app.post("/api/admin/rbac/status", requireAuth, requireMainAdmin, RbacController.toggleStatus);
  app.get("/api/admin/rbac/pending", requireAuth, requirePermission("nav_rbac"), RbacController.getPendingSignups);
  app.post("/api/admin/rbac/approve", requireAuth, requirePermission("nav_rbac"), RbacController.approveSignup);
  app.post("/api/admin/rbac/reject", requireAuth, requirePermission("nav_rbac"), RbacController.rejectSignup);
  app.get("/api/admin/rbac/signup-settings", RbacController.getSignupSettings);
  app.post("/api/admin/rbac/signup-settings", requireAuth, requireMainAdmin, RbacController.updateSignupSettings);

  // EMAIL VERIFICATION ROUTES
  app.use("/api/email", emailRoutes);

  return httpServer;
}
