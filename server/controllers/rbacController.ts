import { Request, Response } from "express";
import { RbacService, AdminPermissions } from "../services/rbacService.js";

function getBody(req: Request): any {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return req.body;
  }
  if ((req as any).rawBody) {
    try {
      return JSON.parse((req as any).rawBody.toString("utf8"));
    } catch {
      // not json
    }
  }
  return req.body || {};
}

export class RbacController {
  /**
   * List all admin accounts
   */
  static async getAdmins(req: Request, res: Response) {
    try {
      const admins = RbacService.getAllAdmins();
      return res.json({ success: true, data: admins });
    } catch (error: any) {
      console.error("[RBAC Controller] getAdmins error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch administrator accounts" });
    }
  }

  /**
   * Update permissions for a specific admin
   */
  static async updatePermissions(req: Request, res: Response) {
    try {
      const body = getBody(req);
      const { email, permissions } = body;
      if (!email || !permissions) {
        return res.status(400).json({ success: false, message: "Target email and permissions are required" });
      }

      const result = await RbacService.updatePermissions(email, permissions, req);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[RBAC Controller] updatePermissions error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to update permissions" });
    }
  }

  /**
   * Toggle status of an admin account (active | disabled)
   */
  static async toggleStatus(req: Request, res: Response) {
    try {
      const body = getBody(req);
      const { email, status } = body;
      if (!email || !status || !["active", "disabled"].includes(status)) {
        return res.status(400).json({ success: false, message: "Valid email and status ('active' | 'disabled') are required" });
      }

      const result = await RbacService.toggleStatus(email, status, req);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[RBAC Controller] toggleStatus error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to update account status" });
    }
  }

  /**
   * Get pending signups queue
   */
  static async getPendingSignups(_req: Request, res: Response) {
    try {
      const pending = RbacService.getPendingSignups();
      return res.json({ success: true, data: pending });
    } catch (error: any) {
      console.error("[RBAC Controller] getPendingSignups error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch pending sign-ups" });
    }
  }

  /**
   * Main Admin approves a pending sign-up
   */
  static async approveSignup(req: Request, res: Response) {
    try {
      const body = getBody(req);
      const { email, permissions } = body;
      const customMessage = body.customMessage || body.message;
      if (!email || !permissions) {
        return res.status(400).json({ success: false, message: "User email and permissions are required for approval" });
      }

      const result = await RbacService.approveSignup(email, permissions, customMessage, req);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[RBAC Controller] approveSignup error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to approve sign-up" });
    }
  }

  /**
   * Main Admin rejects a pending sign-up
   */
  static async rejectSignup(req: Request, res: Response) {
    try {
      const body = getBody(req);
      const { email, reason } = body;
      if (!email) {
        return res.status(400).json({ success: false, message: "User email is required to reject request" });
      }

      const result = await RbacService.rejectSignup(email, reason, req);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[RBAC Controller] rejectSignup error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to reject sign-up" });
    }
  }

  /**
   * Get sign-up availability status
   */
  static async getSignupSettings(_req: Request, res: Response) {
    try {
      const settings = RbacService.getSignupSettings();
      return res.json({ success: true, ...settings });
    } catch (error: any) {
      console.error("[RBAC Controller] getSignupSettings error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch sign-up settings" });
    }
  }

  /**
   * Toggle sign-up availability
   */
  static async updateSignupSettings(req: Request, res: Response) {
    try {
      const body = getBody(req);
      let enabled = body.enabled;
      if (typeof enabled === "string") {
        enabled = enabled === "true";
      }
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ success: false, message: "Field 'enabled' (boolean) is required" });
      }

      const result = await RbacService.updateSignupSettings(enabled, req);
      return res.json(result);
    } catch (error: any) {
      console.error("[RBAC Controller] updateSignupSettings error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to update sign-up settings" });
    }
  }
}
