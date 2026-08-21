import { Request, Response } from "express";
import {
  getActivityLogsList,
  deleteActivityLogEntry,
  clearActivityLogsList,
  getAdminUserInfo
} from "../services/activityLogService.js";

// Helper to check if current user is main-admin
export function isMainAdminUser(req: Request | string): boolean {
  const userTokenEmail = typeof req === "string" ? req : (req as any).user?.username || (req as any).user?.email;
  if (!userTokenEmail) return false;
  const adminInfo = getAdminUserInfo(userTokenEmail);
  return (
    adminInfo.role === "main-admin" ||
    adminInfo.email.toLowerCase() === "thepersonaljaime@gmail.com"
  );
}

export class ActivityLogController {
  // GET /api/admin/activity-logs
  static async list(req: Request, res: Response) {
    try {
      if (!isMainAdminUser(req)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only the main administrator has access to the activity logs."
        });
      }

      const module = req.query.module as string | undefined;
      const search = req.query.search as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
      const offset = (page - 1) * limit;

      const result = await getActivityLogsList({
        module,
        search,
        limit,
        offset
      });

      return res.json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch activity logs"
      });
    }
  }

  // DELETE /api/admin/activity-logs/:id
  static async delete(req: Request, res: Response) {
    try {
      if (!isMainAdminUser(req)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only the main administrator can delete activity logs."
        });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Log ID is required"
        });
      }

      const success = await deleteActivityLogEntry(id);
      if (success) {
        return res.json({
          success: true,
          message: "Activity log deleted successfully"
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to delete activity log"
        });
      }
    } catch (error) {
      console.error("Error deleting activity log:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete activity log"
      });
    }
  }

  // DELETE /api/admin/activity-logs (Clear all)
  static async clearAll(req: Request, res: Response) {
    try {
      if (!isMainAdminUser(req)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only the main administrator can clear activity logs."
        });
      }

      const success = await clearActivityLogsList();
      if (success) {
        return res.json({
          success: true,
          message: "All activity logs have been cleared"
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to clear activity logs"
        });
      }
    } catch (error) {
      console.error("Error clearing activity logs:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to clear activity logs"
      });
    }
  }
}
