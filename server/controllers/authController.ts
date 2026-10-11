import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { verifyPassword } from "../utils/passwordUtils.js";
import { sendVerificationCode, verifyCode } from "../services/emailService.js";
import { RbacService, DEFAULT_ADMIN_PERMISSIONS, FULL_ADMIN_PERMISSIONS, sanitizePermissions } from "../services/rbacService.js";
import { logActivity } from "../services/activityLogService.js";

const SERVER_DIR = path.join(process.cwd(), "server");

// Load admin users from JSON file
let adminUsers: any = null;
const adminUsersPath = path.join(SERVER_DIR, "account", "admin-users.json");

function loadAdminUsers() {
  try {
    if (fs.existsSync(adminUsersPath)) {
      const data = fs.readFileSync(adminUsersPath, "utf8");
      adminUsers = JSON.parse(data);
    } else {
      console.log("Admin users JSON file not found, using fallback");
    }
  } catch (error) {
    console.error("Error loading admin users:", error);
  }
}

// Load admin users on startup
loadAdminUsers();

// Simple in-memory session storage and revoked tokens tracking
const sessions = new Map<string, { token: string; expires: number }>();
const revokedTokens = new Map<string, number>(); // token -> expiry timestamp

export function isTokenRevoked(token: string): boolean {
  const exp = revokedTokens.get(token);
  if (!exp) return false;
  if (exp < Date.now()) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}

// Rate limiting for failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Check if user is locked out
function isUserLockedOut(identifier: string): { locked: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    return { locked: false };
  }

  // Check if currently locked out
  if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
    const remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60); // minutes
    return { locked: true, remainingTime };
  }

  // If lockout period has passed, reset the counter
  if (attempts.lockedUntil && attempts.lockedUntil <= Date.now()) {
    loginAttempts.delete(identifier);
    return { locked: false };
  }

  return { locked: false };
}

// Record failed login attempt
function recordFailedAttempt(identifier: string): { locked: boolean; remainingTime?: number } {
  const now = Date.now();
  const existing = loginAttempts.get(identifier);
  
  console.log(`Recording failed attempt for ${identifier}. Current attempts: ${existing?.count || 0}`); // Debug log
  
  if (!existing) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    console.log(`First failed attempt recorded for ${identifier}`); // Debug log
    return { locked: false };
  }

  const newCount = existing.count + 1;
  console.log(`Failed attempt count for ${identifier}: ${newCount}`); // Debug log
  
  if (newCount >= MAX_ATTEMPTS) {
    // Lock the user out
    const lockedUntil = now + LOCKOUT_DURATION;
    loginAttempts.set(identifier, {
      count: newCount,
      lastAttempt: now,
      lockedUntil
    });
    
    console.log(`User ${identifier} locked out after ${newCount} failed attempts`); // Debug log
    
    return { 
      locked: true, 
      remainingTime: Math.ceil(LOCKOUT_DURATION / 1000 / 60) // 5 minutes
    };
  }

  // Update attempt count
  loginAttempts.set(identifier, {
    count: newCount,
    lastAttempt: now
  });

  console.log(`Updated failed attempts for ${identifier}: ${newCount}/${MAX_ATTEMPTS}`); // Debug log
  return { locked: false };
}

// Clear failed attempts on successful login
function clearFailedAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Initialize Google OAuth client
const googleClient = new OAuth2Client();

// Clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  Array.from(sessions.entries()).forEach(([sessionId, session]) => {
    if (session.expires < now) {
      sessions.delete(sessionId);
    }
  });
}

// Generate JWT token
function generateToken(username: string, role: string = "admin"): string {
  return jwt.sign(
    { username, role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// Verify JWT token
function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const username = (req.body.username || req.body.email || "").trim();
      const { password } = req.body;
      
      // Use a more reliable identifier for rate limiting
      const clientIP = (req as any).connection?.remoteAddress || 
                      req.socket?.remoteAddress || 
                      req.headers['x-forwarded-for'] || 
                      'localhost';
      const identifier = `${clientIP}_${username}`;
      
      console.log(`Login attempt for identifier: ${identifier}`); // Debug log
      
      // Check if user is locked out
      const lockoutStatus = isUserLockedOut(identifier);
      if (lockoutStatus.locked) {
        console.log(`User ${identifier} is locked out for ${lockoutStatus.remainingTime} minutes`); // Debug log
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Please try again in ${lockoutStatus.remainingTime} minutes.`,
          locked: true,
          remainingTime: lockoutStatus.remainingTime
        });
      }

      // Check admin-users.json for email/password authentication ONLY
      if (adminUsers && adminUsers.development && adminUsers.development.users) {
        // Always reload admin users to get latest data
        loadAdminUsers();
        
        const user = adminUsers.development.users.find((u: any) => 
          u.email?.toLowerCase() === username?.trim().toLowerCase() && u.password // Only check users with passwords
        );
        
        if (user) {
          const passwordValid = await verifyPassword(password, user.password);
          
          if (passwordValid) {
            // 1. Check if pending Main Admin approval FIRST
            if (user.status === "pending_approval") {
              return res.status(403).json({
                success: false,
                message: "Wait for the main admin to allow your sign in, as of now always check your email",
                pending: true
              });
            }

            // 2. Check if disabled by Main Admin
            if (user.status === "disabled" || user.enabled === false) {
              await logActivity(req, {
                actionType: "update",
                module: "Rules & RBAC",
                summary: `Blocked login attempt by disabled admin account: ${user.name || user.email} (${user.email})`,
                targetTitle: `${user.name || "Admin"} (${user.email})`,
                targetId: user.id || user.email,
                actor: {
                  email: user.email,
                  name: user.name || "Disabled Admin",
                  role: "admin",
                },
                changes: [
                  {
                    field: "Security Alert",
                    changeType: "modified",
                    details: "Rejected password login attempt because account is disabled by Main Administrator",
                  },
                ],
              }).catch(() => {});

              return res.status(403).json({
                success: false,
                message: "you are not allowed to login since your account is disabled by the Main-Admin, please contact your Main Administrator to enable your account",
                disabled: true
              });
            }

            const role = user.role === "main-admin" || user.email?.toLowerCase() === "thepersonaljaime@gmail.com" ? "main-admin" : "admin";
            const token = generateToken(user.email, role);
            const sessionId = `session_${Date.now()}_${Math.random()}`;
            
            sessions.set(sessionId, {
              token,
              expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });

            // Clear failed attempts on successful login
            clearFailedAttempts(identifier);

            const permissions = role === "main-admin"
              ? FULL_ADMIN_PERMISSIONS
              : sanitizePermissions(user.permissions, DEFAULT_ADMIN_PERMISSIONS);

            return res.json({
              success: true,
              token,
              message: "Login successful",
              user: {
                email: user.email,
                name: user.name,
                role: role,
                status: user.status || "active",
                permissions: permissions
              }
            });
          }
        }
      }

      // Record failed attempt
      const failedResult = recordFailedAttempt(identifier);
      
      if (failedResult.locked) {
        await logActivity(req, {
          actionType: "update",
          module: "Rules & RBAC",
          summary: `Account temporarily locked after ${MAX_ATTEMPTS} failed login attempts: ${username || "unknown"}`,
          targetTitle: username || "Unknown User",
          targetId: username || "unknown",
          actor: {
            email: username || "unauthenticated",
            name: username || "Unauthenticated",
            role: "admin",
          },
          changes: [
            {
              field: "Rate Limit Lockout",
              changeType: "modified",
              details: `Locked login for ${failedResult.remainingTime} minutes after repeated invalid credentials`,
            },
          ],
        }).catch(() => {});

        return res.status(429).json({
          success: false,
          message: `Account locked due to too many failed attempts. Please try again in ${failedResult.remainingTime} minutes.`,
          locked: true,
          remainingTime: failedResult.remainingTime
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      const { token, user } = req.body;

      // Reload admin users to pick up changes to admin-users.json without a server restart
      loadAdminUsers();
      
      const googleClientId = process.env.GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        return res.status(500).json({
          success: false,
          message: "Server misconfigured: GOOGLE_CLIENT_ID is not set"
        });
      }

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Google token required"
        });
      }

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      
      const effectiveEmail = user?.email || payload?.email;

      if (!payload || !effectiveEmail || payload.email !== effectiveEmail) {
        return res.status(401).json({
          success: false,
          message: "Invalid Google token"
        });
      }

      // Check if user is in admin users list - REQUIRED for security
      if (!adminUsers || !adminUsers.development || !adminUsers.development.users) {
        return res.status(500).json({
          success: false,
          message: "Server configuration error: Admin users not loaded"
        });
      }

      const adminUser = adminUsers.development.users.find((u: any) => 
        u.email?.toLowerCase() === effectiveEmail?.toLowerCase()
      );
      
      if (!adminUser) {
        return res.status(403).json({
          success: false,
          message: "User not authorized as admin"
        });
      }

      // Check if account is still pending Main Admin approval FIRST
      if (adminUser.status === "pending_approval") {
        return res.status(403).json({
          success: false,
          message: "Wait for the main admin to allow your sign in, as of now always check your email",
          pending: true
        });
      }

      // Check if account was disabled by Main Admin
      if (adminUser.status === "disabled" || adminUser.enabled === false) {
        logActivity(req, {
          actionType: "update",
          module: "Rules & RBAC",
          summary: `Blocked Google login attempt on disabled account: ${adminUser.email}`,
          targetTitle: `${adminUser.name || "Admin"} (${adminUser.email})`,
          targetId: adminUser.id || adminUser.email,
          actor: {
            email: adminUser.email,
            name: adminUser.name || "Admin",
            role: adminUser.role === "main-admin" ? "main-admin" : "admin",
          },
          changes: [
            {
              field: "Security Event",
              changeType: "modified",
              details: "Attempted Google sign-in while account status is disabled",
              oldValue: "disabled",
              newValue: "blocked",
            },
          ],
        }).catch(() => {});
        return res.status(403).json({
          success: false,
          message: "you are not allowed to login since your account is disabled by the Main-Admin, please contact your Main Administrator to enable your account",
          disabled: true
        });
      }
      
      const role = adminUser.role === "main-admin" || adminUser.email?.toLowerCase() === "thepersonaljaime@gmail.com" ? "main-admin" : "admin";
      console.log(`Google login successful for authorized [${role}]: ${effectiveEmail}`);

      // Generate JWT token with role
      const jwtToken = generateToken(effectiveEmail, role);
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      
      sessions.set(sessionId, {
        token: jwtToken,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });

      const permissions = role === "main-admin"
        ? FULL_ADMIN_PERMISSIONS
        : sanitizePermissions(adminUser.permissions);

      return res.json({
        success: true,
        token: jwtToken,
        user: {
          email: payload.email,
          name: adminUser.name || payload.name,
          picture: payload.picture,
          role: role,
          status: adminUser.status || "active",
          permissions: permissions
        },
        message: "Google login successful"
      });
    } catch (error) {
      console.error("Google login error:", error);
      return res.status(500).json({
        success: false,
        message: "Google authentication failed"
      });
    }
  }

  static async verify(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "No token provided"
        });
      }

      const token = authHeader.substring(7);
      if (isTokenRevoked(token)) {
        return res.status(401).json({
          success: false,
          message: "Session expired"
        });
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.username) {
        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }

      // Clean up expired sessions
      cleanupExpiredSessions();

      loadAdminUsers();
      const matchedUser = RbacService.getAdminByEmail(decoded.username);

      if (!matchedUser) {
        return res.status(401).json({
          success: false,
          message: "User not found"
        });
      }

      if (matchedUser.status === "pending_approval") {
        return res.status(403).json({
          success: false,
          message: "Wait for the main admin to allow your sign in, as of now always check your email",
          pending: true
        });
      }

      if (matchedUser.status === "disabled" || matchedUser.enabled === false) {
        return res.status(403).json({
          success: false,
          message: "you are not allowed to login since your account is disabled by the Main-Admin, please contact your Main Administrator to enable your account",
          disabled: true
        });
      }

      const role = matchedUser.role === "main-admin" || matchedUser.email?.toLowerCase() === "thepersonaljaime@gmail.com" ? "main-admin" : "admin";
      const permissions = role === "main-admin"
        ? FULL_ADMIN_PERMISSIONS
        : sanitizePermissions(matchedUser.permissions);

      return res.json({
        success: true,
        message: "Token valid",
        user: {
          email: matchedUser.email,
          name: matchedUser?.name || "Admin",
          role: role,
          status: matchedUser.status || "active",
          permissions: permissions
        }
      });
    } catch (error) {
      console.error("Verify error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  static async signupSendOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ success: false, message: "A valid email address is required" });
      }

      loadAdminUsers();
      const signupSettings = RbacService.getSignupSettings();
      if (!signupSettings.signupEnabled) {
        return res.status(403).json({
          success: false,
          message: "Admin sign-up is currently disabled by the Main Administrator."
        });
      }

      const existing = RbacService.getAdminByEmail(email.trim().toLowerCase());
      if (existing) {
        if (existing.status === "pending_approval") {
          return res.status(400).json({
            success: false,
            message: "Wait for the main admin to allow your sign in, as of now always check your email"
          });
        }
        return res.status(400).json({
          success: false,
          message: "An administrator account with this email already exists"
        });
      }

      const result = await sendVerificationCode(email.trim().toLowerCase());
      const statusCode = result.success ? 200 : (result.retryAfterSeconds ? 429 : 400);
      return res.status(statusCode).json(result);
    } catch (error: any) {
      console.error("signupSendOtp error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to send verification code" });
    }
  }

  static async signupRegister(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;
      const code = req.body.code || req.body.otp;
      if (!name || !email || !password || !code) {
        return res.status(400).json({
          success: false,
          message: "Full name, email, password, and verification code are required"
        });
      }

      if (String(password).length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long"
        });
      }

      // Verify OTP code
      const verifyResult = verifyCode(email.trim().toLowerCase(), String(code).trim());
      if (!verifyResult.success) {
        return res.status(400).json(verifyResult);
      }

      // Register with pending status
      const registerResult = await RbacService.registerPendingAdmin(
        {
          name: String(name).trim(),
          email: email.trim().toLowerCase(),
          password: String(password)
        },
        req
      );

      // Reload admin users in memory
      loadAdminUsers();

      if (!registerResult.success) {
        return res.status(400).json(registerResult);
      }

      return res.json(registerResult);
    } catch (error: any) {
      console.error("signupRegister error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to register account" });
    }
  }

  static async getSignupStatus(_req: Request, res: Response) {
    try {
      const status = RbacService.getSignupSettings();
      return res.json({ success: true, ...status });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to fetch sign-up status" });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "No token provided"
        });
      }

      const token = authHeader.substring(7);
      revokedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);

      // Remove session
      Array.from(sessions.entries()).forEach(([sessionId, session]) => {
        if (session.token === token) {
          sessions.delete(sessionId);
        }
      });

      return res.json({
        success: true,
        message: "Logout successful"
      });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
}
