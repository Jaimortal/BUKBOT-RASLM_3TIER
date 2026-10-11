import fs from "fs";
import path from "path";
import { Request } from "express";
import { hashPassword } from "../utils/passwordUtils.js";
import { logActivity, LogChangeItem } from "./activityLogService.js";
import { sendPendingApprovalEmail, sendApprovalConfirmationEmail } from "./emailService.js";

const PROJECT_ROOT = process.cwd();
const ADMIN_USERS_PATH = path.join(PROJECT_ROOT, "server", "account", "admin-users.json");
export const MAIN_ADMIN_EMAIL = (process.env.MAIN_ADMIN_EMAIL || "thepersonaljaime@gmail.com").toLowerCase();

export interface AdminPermissions {
  // Navigation Tabs
  nav_responses: boolean;
  nav_reports: boolean;
  nav_gallery: boolean;
  nav_settings: boolean;
  nav_rbac: boolean;

  // Responses Features
  responses_knowledge: boolean;
  responses_locations: boolean;
  responses_sync: boolean;

  // Reports Inner Tabs
  reports_chatbot: boolean;
  reports_activity_logs: boolean;
  reports_performance: boolean;
  reports_faq_gaps: boolean;

  // Settings Inner Tabs
  settings_chatbox_controls: boolean;
  settings_chathead_studio: boolean;
  settings_maps: boolean;
  settings_credentials: boolean;

  // Data Edit Modal Tabs
  modal_responses: boolean;
  modal_images: boolean;
  modal_map: boolean;
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  nav_responses: true,
  nav_reports: true,
  nav_gallery: true,
  nav_settings: true,
  nav_rbac: false,
  responses_knowledge: true,
  responses_locations: true,
  responses_sync: false,
  reports_chatbot: true,
  reports_activity_logs: false,
  reports_performance: false,
  reports_faq_gaps: false,
  settings_chatbox_controls: true,
  settings_chathead_studio: true,
  settings_maps: false,
  settings_credentials: true,
  modal_responses: true,
  modal_images: true,
  modal_map: true,
};

export const FULL_ADMIN_PERMISSIONS: AdminPermissions = {
  nav_responses: true,
  nav_reports: true,
  nav_gallery: true,
  nav_settings: true,
  nav_rbac: true,
  responses_knowledge: true,
  responses_locations: true,
  responses_sync: true,
  reports_chatbot: true,
  reports_activity_logs: true,
  reports_performance: true,
  reports_faq_gaps: true,
  settings_chatbox_controls: true,
  settings_chathead_studio: true,
  settings_maps: true,
  settings_credentials: true,
  modal_responses: true,
  modal_images: true,
  modal_map: true,
};

export const PERMISSION_KEYS = Object.keys(DEFAULT_ADMIN_PERMISSIONS) as Array<keyof AdminPermissions>;

/**
 * Strictly sanitize permission inputs so only known keys and true boolean values are stored.
 * Prevents strings like "false" from evaluating to truthy.
 */
export function sanitizePermissions(
  raw: Record<string, any> | undefined | null,
  base: AdminPermissions = DEFAULT_ADMIN_PERMISSIONS
): AdminPermissions {
  const result: AdminPermissions = { ...base };
  if (!raw || typeof raw !== "object") {
    return result;
  }

  for (const key of PERMISSION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const val = raw[key];
      if (typeof val === "boolean") {
        result[key] = val;
      } else if (val === "true") {
        result[key] = true;
      } else if (val === "false") {
        result[key] = false;
      }
    }
  }
  return result;
}

export interface StoredAdminUser {
  id: string;
  email: string;
  name: string;
  role: "main-admin" | "admin";
  status: "active" | "disabled" | "pending_approval";
  googleId?: string | null;
  enabled: boolean;
  password?: string;
  permissions: AdminPermissions;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUserDataFile {
  development: {
    users: StoredAdminUser[];
    settings: {
      allowGoogleAuth?: boolean;
      allowLocalAuth?: boolean;
      developmentMode?: boolean;
      signupEnabled?: boolean;
    };
  };
}

// Simple async mutex to prevent lost updates on concurrent file writes
let writeQueue: Promise<any> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.catch(() => {});
  return next;
}

export function readAdminUsersData(): AdminUserDataFile {
  try {
    if (fs.existsSync(ADMIN_USERS_PATH)) {
      const raw = fs.readFileSync(ADMIN_USERS_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.development && Array.isArray(parsed.development.users)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("[RBAC Service] Error reading admin-users.json:", error);
  }

  return {
    development: {
      users: [],
      settings: {
        allowGoogleAuth: true,
        allowLocalAuth: true,
        developmentMode: true,
        signupEnabled: true,
      },
    },
  };
}

export function writeAdminUsersData(data: AdminUserDataFile): boolean {
  try {
    const tempPath = `${ADMIN_USERS_PATH}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, serialized, "utf8");
    fs.renameSync(tempPath, ADMIN_USERS_PATH);
    return true;
  } catch (error) {
    console.error("[RBAC Service] Error writing admin-users.json:", error);
    return false;
  }
}

export function isMainAdminUser(roleOrEmail?: string, email?: string): boolean {
  if (roleOrEmail === "main-admin") return true;
  if (roleOrEmail?.toLowerCase() === MAIN_ADMIN_EMAIL) return true;
  if (email?.toLowerCase() === MAIN_ADMIN_EMAIL) return true;
  return false;
}

export function normalizeRole(roleOrEmail?: string): "main-admin" | "admin" {
  if (isMainAdminUser(roleOrEmail)) {
    return "main-admin";
  }
  return "admin";
}

export class RbacService {
  /**
   * Return all admin accounts (passwords sanitized)
   */
  static getAllAdmins(): Omit<StoredAdminUser, "password">[] {
    const data = readAdminUsersData();
    return data.development.users.map((u) => {
      const { password, ...safe } = u;
      const isMain = isMainAdminUser(safe.role, safe.email);
      return {
        ...safe,
        role: isMain ? "main-admin" : "admin",
        permissions: isMain
          ? { ...FULL_ADMIN_PERMISSIONS }
          : sanitizePermissions(safe.permissions, DEFAULT_ADMIN_PERMISSIONS),
      };
    });
  }

  /**
   * Find admin by email
   */
  static getAdminByEmail(email: string): StoredAdminUser | null {
    if (!email) return null;
    const data = readAdminUsersData();
    const user = data.development.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) return null;
    const isMain = isMainAdminUser(user.role, user.email);
    return {
      ...user,
      role: isMain ? "main-admin" : "admin",
      permissions: isMain
        ? { ...FULL_ADMIN_PERMISSIONS }
        : sanitizePermissions(user.permissions, DEFAULT_ADMIN_PERMISSIONS),
    };
  }

  /**
   * Update permissions for a specific admin user
   */
  static async updatePermissions(
    targetEmail: string,
    newPermissions: Partial<AdminPermissions>,
    req: Request
  ): Promise<{ success: boolean; message: string; user?: any }> {
    return withWriteLock(async () => {
      const data = readAdminUsersData();
      const index = data.development.users.findIndex(
        (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
      );

      if (index === -1) {
        return { success: false, message: "Administrator account not found" };
      }

      const targetUser = data.development.users[index];

      // 1. Main admin always maintains full permissions
      if (isMainAdminUser(targetUser.role, targetUser.email)) {
        return { success: false, message: "Main Administrator rules cannot be restricted" };
      }

      // 2. Prevent self-modification of permissions
      const actorEmail = ((req as any).user?.username || (req as any).user?.email || "").toLowerCase();
      const actorIsMainAdmin = isMainAdminUser((req as any).user?.role, actorEmail);

      if (actorEmail && actorEmail === targetUser.email.toLowerCase()) {
        return { success: false, message: "You cannot modify your own permission rules" };
      }

      const previousPerms = sanitizePermissions(targetUser.permissions, DEFAULT_ADMIN_PERMISSIONS);
      const mergedPerms = sanitizePermissions(newPermissions, previousPerms);

      // 3. Prevent privilege escalation if actor is not Main Admin
      if (!actorIsMainAdmin) {
        if (previousPerms.nav_rbac || mergedPerms.nav_rbac) {
          return {
            success: false,
            message: "Only the Main Administrator can grant or modify Rules Modification (nav_rbac) authority",
          };
        }
        const actorUser = this.getAdminByEmail(actorEmail);
        for (const key of PERMISSION_KEYS) {
          if (mergedPerms[key] !== previousPerms[key] && !actorUser?.permissions?.[key]) {
            return {
              success: false,
              message: `Cannot modify rule '${key}' because your account does not hold that permission`,
            };
          }
        }
      }

      // Compute diff of changes for audit log
      const changes: LogChangeItem[] = [];
      PERMISSION_KEYS.forEach((key) => {
        if (previousPerms[key] !== mergedPerms[key]) {
          changes.push({
            field: `Rule: ${key}`,
            changeType: "modified",
            details: `Changed from ${previousPerms[key] ? "Enabled" : "Disabled"} to ${mergedPerms[key] ? "Enabled" : "Disabled"}`,
            oldValue: previousPerms[key],
            newValue: mergedPerms[key],
          });
        }
      });

      targetUser.permissions = mergedPerms;
      targetUser.updatedAt = new Date().toISOString();
      data.development.users[index] = targetUser;
      writeAdminUsersData(data);

      // Audit log
      await logActivity(req, {
        actionType: "update",
        module: "Rules & RBAC",
        summary: `Updated rules/permissions for admin: ${targetUser.name} (${targetUser.email})`,
        targetTitle: `${targetUser.name} (${targetUser.email})`,
        targetId: targetUser.id || targetUser.email,
        changes: changes.length > 0 ? changes : [
          {
            field: "Permissions",
            changeType: "modified",
            details: "Permissions saved without alteration",
          },
        ],
      }).catch((err) => console.error("[RBAC Service] Audit log error:", err));

      const { password, ...safeUser } = targetUser;
      return {
        success: true,
        message: `Permissions updated successfully for ${targetUser.name}`,
        user: safeUser,
      };
    });
  }

  /**
   * Toggle admin account status: active or disabled
   */
  static async toggleStatus(
    targetEmail: string,
    status: "active" | "disabled",
    req: Request
  ): Promise<{ success: boolean; message: string }> {
    return withWriteLock(async () => {
      const data = readAdminUsersData();
      const index = data.development.users.findIndex(
        (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
      );

      if (index === -1) {
        return { success: false, message: "Administrator account not found" };
      }

      const targetUser = data.development.users[index];

      // Cannot disable Main Administrator
      if (isMainAdminUser(targetUser.role, targetUser.email)) {
        return { success: false, message: "Main Administrator account cannot be disabled" };
      }

      // Cannot disable self
      const actorEmail = (req as any).user?.username || (req as any).user?.email;
      if (actorEmail && actorEmail.toLowerCase() === targetUser.email.toLowerCase()) {
        return { success: false, message: "You cannot disable your own administrator account" };
      }

      // Cannot bypass approval workflow for pending accounts
      if (targetUser.status === "pending_approval") {
        return {
          success: false,
          message: "Pending sign-up accounts must be approved or rejected through the Pending Sign-Up Queue",
        };
      }

      const prevStatus = targetUser.status || (targetUser.enabled ? "active" : "disabled");
      targetUser.status = status;
      targetUser.enabled = status === "active";
      targetUser.updatedAt = new Date().toISOString();
      data.development.users[index] = targetUser;
      writeAdminUsersData(data);

      // Audit log
      await logActivity(req, {
        actionType: "update",
        module: "Rules & RBAC",
        summary: `${status === "disabled" ? "Disabled" : "Enabled"} admin account: ${targetUser.name} (${targetUser.email})`,
        targetTitle: `${targetUser.name} (${targetUser.email})`,
        targetId: targetUser.id || targetUser.email,
        changes: [
          {
            field: "Account Status",
            changeType: "modified",
            details: `Changed account status from ${prevStatus} to ${status}`,
            oldValue: prevStatus,
            newValue: status,
          },
        ],
      }).catch((err) => console.error("[RBAC Service] Audit log error:", err));

      return {
        success: true,
        message: `Account status for ${targetUser.name} set to ${status}`,
      };
    });
  }

  /**
   * Get list of pending signups
   */
  static getPendingSignups(): Omit<StoredAdminUser, "password">[] {
    const data = readAdminUsersData();
    return data.development.users
      .filter((u) => u.status === "pending_approval")
      .map((u) => {
        const { password, ...safe } = u;
        return safe;
      });
  }

  /**
   * Main Admin (or authorized RBAC admin) approves a pending admin sign-up
   */
  static async approveSignup(
    targetEmail: string,
    permissions: Partial<AdminPermissions>,
    customMessage: string | undefined,
    req: Request
  ): Promise<{ success: boolean; message: string }> {
    return withWriteLock(async () => {
      const data = readAdminUsersData();
      const index = data.development.users.findIndex(
        (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
      );

      if (index === -1) {
        return { success: false, message: "Pending sign-up request not found" };
      }

      const targetUser = data.development.users[index];
      if (targetUser.status !== "pending_approval") {
        return { success: false, message: "User is not in pending approval status" };
      }

      const actorEmail = ((req as any).user?.username || (req as any).user?.email || "").toLowerCase();
      const actorIsMainAdmin = isMainAdminUser((req as any).user?.role, actorEmail);
      const sanitizedPerms = sanitizePermissions(permissions, DEFAULT_ADMIN_PERMISSIONS);

      // Prevent non-main-admin from granting permissions they don't hold or granting nav_rbac
      if (!actorIsMainAdmin) {
        sanitizedPerms.nav_rbac = false;
        const actorUser = this.getAdminByEmail(actorEmail);
        for (const key of PERMISSION_KEYS) {
          if (sanitizedPerms[key] && !actorUser?.permissions?.[key]) {
            sanitizedPerms[key] = false;
          }
        }
      }

      targetUser.status = "active";
      targetUser.enabled = true;
      targetUser.role = "admin"; // Always admin only
      targetUser.permissions = sanitizedPerms;
      targetUser.updatedAt = new Date().toISOString();
      data.development.users[index] = targetUser;
      writeAdminUsersData(data);

      // Audit log first
      await logActivity(req, {
        actionType: "create",
        module: "Rules & RBAC",
        summary: `Approved sign-up for new admin: ${targetUser.name} (${targetUser.email})`,
        targetTitle: `${targetUser.name} (${targetUser.email})`,
        targetId: targetUser.id || targetUser.email,
        changes: [
          {
            field: "Account Status",
            changeType: "added",
            details: `Sign-up approved with active status and customized permissions${customMessage ? ` and note: "${customMessage}"` : ""}`,
          },
        ],
      }).catch((err) => console.error("[RBAC Service] Audit log error:", err));

      // Send confirmation email to approved admin
      await sendApprovalConfirmationEmail(targetUser.email, targetUser.name, customMessage).catch((err) =>
        console.error("[RBAC Service] Error sending approval confirmation email:", err)
      );

      return {
        success: true,
        message: `Admin account for ${targetUser.name} has been approved and activated.`,
      };
    });
  }

  /**
   * Reject / remove a pending sign-up ONLY
   */
  static async rejectSignup(
    targetEmail: string,
    reason: string | undefined,
    req: Request
  ): Promise<{ success: boolean; message: string }> {
    return withWriteLock(async () => {
      const data = readAdminUsersData();
      const index = data.development.users.findIndex(
        (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
      );

      if (index === -1) {
        return { success: false, message: "Pending sign-up not found" };
      }

      const targetUser = data.development.users[index];

      // Critical guard: Never allow deleting Main Admin or active/disabled accounts via rejectSignup
      if (isMainAdminUser(targetUser.role, targetUser.email)) {
        return { success: false, message: "Main Administrator account cannot be rejected or removed" };
      }

      if (targetUser.status !== "pending_approval") {
        return {
          success: false,
          message: "Only accounts in 'pending_approval' status can be rejected",
        };
      }

      data.development.users.splice(index, 1);
      writeAdminUsersData(data);

      // Audit log
      await logActivity(req, {
        actionType: "delete",
        module: "Rules & RBAC",
        summary: `Rejected and removed pending sign-up request for: ${targetUser.name} (${targetUser.email})`,
        targetTitle: `${targetUser.name} (${targetUser.email})`,
        targetId: targetUser.id || targetUser.email,
        changes: [
          {
            field: "Pending Request",
            changeType: "removed",
            details: `Sign-up request rejected${reason ? `. Reason: "${reason}"` : ""}`,
          },
        ],
      }).catch((err) => console.error("[RBAC Service] Audit log error:", err));

      return {
        success: true,
        message: `Pending sign-up for ${targetUser.name} has been rejected.`,
      };
    });
  }

  /**
   * Register a new admin (always role='admin', status='pending_approval')
   */
  static async registerPendingAdmin(
    userData: {
      name: string;
      email: string;
      password: string;
    },
    req?: Request
  ): Promise<{ success: boolean; message: string }> {
    return withWriteLock(async () => {
      const data = readAdminUsersData();

      // Check if sign-ups are enabled
      if (data.development.settings?.signupEnabled === false) {
        return {
          success: false,
          message: "Admin sign-up is currently disabled by the Main Administrator.",
        };
      }

      const emailClean = userData.email.trim().toLowerCase();
      const cleanName = userData.name.trim().slice(0, 100);
      if (!cleanName) {
        return {
          success: false,
          message: "Full name is required.",
        };
      }

      const existing = data.development.users.find(
        (u) => u.email.toLowerCase() === emailClean
      );

      if (existing) {
        if (existing.status === "pending_approval") {
          return {
            success: false,
            message: "Wait for the main admin to allow your sign in, as of now always check your email",
          };
        }
        return {
          success: false,
          message: "An account with this email address already exists.",
        };
      }

      const hashedPassword = await hashPassword(userData.password);
      const newAdmin: StoredAdminUser = {
        id: `admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: emailClean,
        name: cleanName,
        role: "admin", // New sign up is ALWAYS admin
        status: "pending_approval",
        enabled: false, // Disabled until approved
        password: hashedPassword,
        permissions: { ...DEFAULT_ADMIN_PERMISSIONS },
        createdAt: new Date().toISOString(),
      };

      data.development.users.push(newAdmin);
      writeAdminUsersData(data);

      // Audit log attributed to the applicant, NOT Main Admin
      await logActivity(
        req || ({ headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any),
        {
          actionType: "create",
          module: "Rules & RBAC",
          summary: `New admin sign-up registered (awaiting approval): ${newAdmin.name} (${newAdmin.email})`,
          targetTitle: `${newAdmin.name} (${newAdmin.email})`,
          targetId: newAdmin.id,
          actor: {
            email: newAdmin.email,
            name: newAdmin.name,
            role: "admin",
          },
          changes: [
            {
              field: "Admin Sign-up",
              changeType: "added",
              details: "User verified email via OTP and registered with pending_approval status awaiting Main Admin confirmation",
            },
          ],
        }
      ).catch((err) => console.error("[RBAC Service] Audit log error:", err));

      // Send pending confirmation email
      await sendPendingApprovalEmail(newAdmin.email, newAdmin.name).catch((err) =>
        console.error("[RBAC Service] Error sending pending approval email:", err)
      );

      return {
        success: true,
        message: "Wait for the main admin to allow your sign in, as of now always check your email",
      };
    });
  }

  /**
   * Get and toggle signupEnabled setting
   */
  static getSignupSettings(): { signupEnabled: boolean } {
    const data = readAdminUsersData();
    return {
      signupEnabled: data.development.settings?.signupEnabled ?? true,
    };
  }

  static async updateSignupSettings(
    enabled: boolean,
    req: Request
  ): Promise<{ success: boolean; message: string; signupEnabled: boolean }> {
    return withWriteLock(async () => {
      const data = readAdminUsersData();
      if (!data.development.settings) {
        data.development.settings = {};
      }
      const previous = data.development.settings.signupEnabled ?? true;
      data.development.settings.signupEnabled = Boolean(enabled);
      writeAdminUsersData(data);

      // Audit log
      await logActivity(req, {
        actionType: "update",
        module: "Rules & RBAC",
        summary: `${enabled ? "Enabled" : "Disabled"} public admin sign-ups`,
        targetTitle: "Sign-Up System Setting",
        targetId: "signupEnabled",
        changes: [
          {
            field: "signupEnabled",
            changeType: "modified",
            details: `Sign-up feature toggled from ${previous ? "Enabled" : "Disabled"} to ${enabled ? "Enabled" : "Disabled"}`,
            oldValue: previous,
            newValue: enabled,
          },
        ],
      }).catch((err) => console.error("[RBAC Service] Audit log error:", err));

      return {
        success: true,
        message: `Admin sign-up has been ${enabled ? "enabled" : "disabled"}.`,
        signupEnabled: enabled,
      };
    });
  }

  /**
   * Check if a user is active and has a specific permission
   */
  static hasPermission(
    userOrEmail: StoredAdminUser | string,
    permissionKey: keyof AdminPermissions
  ): boolean {
    const user =
      typeof userOrEmail === "string"
        ? this.getAdminByEmail(userOrEmail)
        : userOrEmail;

    if (!user) return false;
    if (isMainAdminUser(user.role, user.email)) {
      return true;
    }
    if (user.status !== "active" || user.enabled === false) {
      return false;
    }
    return user.permissions?.[permissionKey] === true;
  }
}
