import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { verifyPassword } from "../utils/passwordUtils.js";

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

// Simple in-memory session storage (in production, use Redis or database)
const sessions = new Map<string, { token: string; expires: number }>();

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
function generateToken(username: string): string {
  return jwt.sign(
    { username, role: "admin" },
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
      const { username, password } = req.body;
      
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
          u.email === username && u.enabled && u.password // Only check users with passwords
        );
        
        if (user) {
          const passwordValid = await verifyPassword(password, user.password);
          
          if (passwordValid) {
            const token = generateToken(user.email);
            const sessionId = `session_${Date.now()}_${Math.random()}`;
            
            sessions.set(sessionId, {
              token,
              expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });

            // Clear failed attempts on successful login
            clearFailedAttempts(identifier);

            return res.json({
              success: true,
              token,
              message: "Login successful",
              user: {
                email: user.email,
                name: user.name,
                role: user.role
              }
            });
          }
        }
      }

      // Record failed attempt
      const failedResult = recordFailedAttempt(identifier);
      
      if (failedResult.locked) {
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

      const adminUser = adminUsers.development.users.find((adminUser: any) => 
        adminUser.email === effectiveEmail && adminUser.enabled
      );
      
      if (!adminUser) {
        return res.status(403).json({
          success: false,
          message: "User not authorized as admin"
        });
      }
      
      console.log(`Google login successful for authorized admin: ${effectiveEmail}`);

      // Generate JWT token
      const jwtToken = generateToken(effectiveEmail);
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      
      sessions.set(sessionId, {
        token: jwtToken,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });

      return res.json({
        success: true,
        token: jwtToken,
        user: {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
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
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }

      // Clean up expired sessions
      cleanupExpiredSessions();

      // Check if session exists
      let sessionExists = false;
      Array.from(sessions.values()).forEach((session) => {
        if (session.token === token && session.expires > Date.now()) {
          sessionExists = true;
        }
      });

      if (!sessionExists) {
        return res.status(401).json({
          success: false,
          message: "Session expired"
        });
      }

      return res.json({
        success: true,
        message: "Token valid"
      });
    } catch (error) {
      console.error("Verify error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
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
