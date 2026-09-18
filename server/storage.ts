import { 
  type User, 
  type InsertUser,
  type AdminResponse,
  type InsertAdminResponse,
  type Location,
  type InsertLocation,
  type UserPrivileges,
  type InsertUserPrivileges,
  type LoginAttempt,
  type UserSession,
  type ConversationLog,
  type InsertConversationLog
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { conversationLogs as conversationLogsTable } from "@shared/schema";
import { between, eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Admin Response operations
  getAdminResponses(): Promise<AdminResponse[]>;
  getAdminResponseByIntent(intent: string): Promise<AdminResponse | undefined>;
  createAdminResponse(response: InsertAdminResponse): Promise<AdminResponse>;
  updateAdminResponse(intent: string, response: Partial<InsertAdminResponse>): Promise<AdminResponse | undefined>;
  deleteAdminResponse(intent: string): Promise<boolean>;
  
  // Location operations
  getLocations(): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: string): Promise<boolean>;
  
  // User Privileges operations
  getUserPrivileges(): Promise<UserPrivileges | undefined>;
  updateUserPrivileges(privileges: Partial<InsertUserPrivileges>): Promise<UserPrivileges>;
  
  // Login Attempt operations
  getLoginAttempt(identifier: string): Promise<LoginAttempt | undefined>;
  createLoginAttempt(attempt: Omit<LoginAttempt, 'id' | 'createdAt'>): Promise<LoginAttempt>;
  updateLoginAttempt(identifier: string, attempt: Partial<LoginAttempt>): Promise<LoginAttempt | undefined>;
  deleteLoginAttempt(identifier: string): Promise<boolean>;
  
  // Session operations
  createSession(session: Omit<UserSession, 'id' | 'createdAt'>): Promise<UserSession>;
  getSessionByToken(token: string): Promise<UserSession | undefined>;
  deleteSession(token: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<void>;
  
  // Conversation Log operations
  createConversationLog(log: Omit<InsertConversationLog, 'id' | 'createdAt'>): Promise<ConversationLog>;
  getConversationLogs(sessionId?: string): Promise<ConversationLog[]>;
  getConversationLogsByDateRange(startDate: Date, endDate: Date): Promise<ConversationLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private adminResponses: Map<string, AdminResponse>;
  private locations: Map<string, Location>;
  private userPrivileges: UserPrivileges | undefined;
  private loginAttempts: Map<string, LoginAttempt>;
  private sessions: Map<string, UserSession>;
  private conversationLogs: Map<string, ConversationLog>;

  constructor() {
    this.users = new Map();
    this.adminResponses = new Map();
    this.locations = new Map();
    this.loginAttempts = new Map();
    this.sessions = new Map();
    this.conversationLogs = new Map();
    
    // Initialize default user privileges
    this.userPrivileges = {
      id: randomUUID(),
      chatEnabled: true,
      audioInputEnabled: true,
      mapAccessEnabled: true,
      autoTranslateEnabled: true,
      updatedAt: new Date(),
    };
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      role: insertUser.role || "admin"
    };
    this.users.set(id, user);
    return user;
  }

  // Admin Response operations
  async getAdminResponses(): Promise<AdminResponse[]> {
    return Array.from(this.adminResponses.values());
  }

  async getAdminResponseByIntent(intent: string): Promise<AdminResponse | undefined> {
    return Array.from(this.adminResponses.values()).find(
      (response) => response.intent === intent,
    );
  }

  async createAdminResponse(response: InsertAdminResponse): Promise<AdminResponse> {
    const id = randomUUID();
    const now = new Date();
    const newResponse: AdminResponse = {
      ...response,
      id,
      createdAt: now,
      updatedAt: now,
      subCategory: response.subCategory || null,
    };
    this.adminResponses.set(id, newResponse);
    return newResponse;
  }

  async updateAdminResponse(intent: string, response: Partial<InsertAdminResponse>): Promise<AdminResponse | undefined> {
    const existing = Array.from(this.adminResponses.values()).find(r => r.intent === intent);
    if (!existing) return undefined;

    const updated: AdminResponse = {
      ...existing,
      ...response,
      updatedAt: new Date(),
    };
    this.adminResponses.set(existing.id, updated);
    return updated;
  }

  async deleteAdminResponse(intent: string): Promise<boolean> {
    const existing = Array.from(this.adminResponses.values()).find(r => r.intent === intent);
    if (!existing) return false;
    
    return this.adminResponses.delete(existing.id);
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocationById(id: string): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const id = randomUUID();
    const newLocation: Location = {
      ...location,
      id,
      createdAt: new Date(),
      mapImage: location.mapImage || "/generated_map.png",
    };
    this.locations.set(id, newLocation);
    return newLocation;
  }

  async updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const existing = this.locations.get(id);
    if (!existing) return undefined;

    const updated: Location = {
      ...existing,
      ...location,
    };
    this.locations.set(id, updated);
    return updated;
  }

  async deleteLocation(id: string): Promise<boolean> {
    return this.locations.delete(id);
  }

  // User Privileges operations
  async getUserPrivileges(): Promise<UserPrivileges | undefined> {
    return this.userPrivileges;
  }

  async updateUserPrivileges(privileges: Partial<InsertUserPrivileges>): Promise<UserPrivileges> {
    if (!this.userPrivileges) {
      this.userPrivileges = {
        id: randomUUID(),
        chatEnabled: true,
        audioInputEnabled: true,
        mapAccessEnabled: true,
        autoTranslateEnabled: true,
        updatedAt: new Date(),
      };
    }

    const updated: UserPrivileges = {
      ...this.userPrivileges,
      ...privileges,
      updatedAt: new Date(),
    };
    this.userPrivileges = updated;
    return updated;
  }

  // Login Attempt operations
  async getLoginAttempt(identifier: string): Promise<LoginAttempt | undefined> {
    return Array.from(this.loginAttempts.values()).find(
      (attempt) => attempt.identifier === identifier,
    );
  }

  async createLoginAttempt(attempt: Omit<LoginAttempt, 'id' | 'createdAt'>): Promise<LoginAttempt> {
    const id = randomUUID();
    const newAttempt: LoginAttempt = {
      ...attempt,
      id,
      createdAt: new Date(),
    };
    this.loginAttempts.set(id, newAttempt);
    return newAttempt;
  }

  async updateLoginAttempt(identifier: string, attempt: Partial<LoginAttempt>): Promise<LoginAttempt | undefined> {
    const existing = Array.from(this.loginAttempts.values()).find(a => a.identifier === identifier);
    if (!existing) return undefined;

    const updated: LoginAttempt = {
      ...existing,
      ...attempt,
    };
    this.loginAttempts.set(existing.id, updated);
    return updated;
  }

  async deleteLoginAttempt(identifier: string): Promise<boolean> {
    const existing = Array.from(this.loginAttempts.values()).find(a => a.identifier === identifier);
    if (!existing) return false;
    
    return this.loginAttempts.delete(existing.id);
  }

  // Session operations
  async createSession(session: Omit<UserSession, 'id' | 'createdAt'>): Promise<UserSession> {
    const id = randomUUID();
    const newSession: UserSession = {
      ...session,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async getSessionByToken(token: string): Promise<UserSession | undefined> {
    return Array.from(this.sessions.values()).find(
      (session) => session.token === token && new Date(session.expires) > new Date(),
    );
  }

  async deleteSession(token: string): Promise<boolean> {
    const existing = Array.from(this.sessions.values()).find(s => s.token === token);
    if (!existing) return false;
    
    return this.sessions.delete(existing.id);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    this.sessions.forEach((session, id) => {
      if (new Date(session.expires) <= now) {
        expiredSessions.push(id);
      }
    });
    
    expiredSessions.forEach(id => this.sessions.delete(id));
  }

  // Conversation Log operations
  async createConversationLog(log: Omit<InsertConversationLog, 'id' | 'createdAt'>): Promise<ConversationLog> {
    const id = randomUUID();
    const newLog: ConversationLog = {
      ...log,
      id,
      createdAt: new Date(),
      userMessageTimestamp: log.userMessageTimestamp || new Date(),
      botResponseTimestamp: log.botResponseTimestamp || null,
      intent: log.intent || null,
      language: log.language || "en",
      responseTime: log.responseTime || null,
      botResponse: log.botResponse || null,
    };
    this.conversationLogs.set(id, newLog);
    return newLog;
  }

  async getConversationLogs(sessionId?: string): Promise<ConversationLog[]> {
    const logs = Array.from(this.conversationLogs.values());
    if (sessionId) {
      return logs.filter(log => log.sessionId === sessionId);
    }
    return logs;
  }

  async getConversationLogsByDateRange(startDate: Date, endDate: Date): Promise<ConversationLog[]> {
    return Array.from(this.conversationLogs.values()).filter(
      log => log.createdAt && log.createdAt >= startDate && log.createdAt <= endDate
    );
  }
}

class ProductionStorage extends MemStorage {
  async createConversationLog(log: Omit<InsertConversationLog, 'id' | 'createdAt'>): Promise<ConversationLog> {
    const [saved] = await db.insert(conversationLogsTable).values(log).returning();
    return saved;
  }

  async getConversationLogs(sessionId?: string): Promise<ConversationLog[]> {
    if (sessionId) {
      return db.select().from(conversationLogsTable).where(eq(conversationLogsTable.sessionId, sessionId));
    }
    return db.select().from(conversationLogsTable);
  }

  async getConversationLogsByDateRange(startDate: Date, endDate: Date): Promise<ConversationLog[]> {
    return db.select().from(conversationLogsTable).where(between(conversationLogsTable.createdAt, startDate, endDate));
  }
}

export const storage = process.env.NODE_ENV === "production" ? new ProductionStorage() : new MemStorage();
