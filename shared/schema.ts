import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, integer, serial, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});
// Table for responses.json data
export const botResponses = pgTable("bot_responses", {
  id: serial("id").primaryKey(),
  intent: text("intent").notNull().unique(),
  category: text("category").default(""),
  subCategory: text("sub_category").default(""),
  // Answer can be multilingual or simple array
  answerEn: jsonb("answer_en").$type<string[]>().default([]),
  answerCeb: jsonb("answer_ceb").$type<string[]>().default([]),
  // Simple answer for non-multilingual responses
  answer: jsonb("answer").$type<string[]>().default([]),
  followUp: jsonb("follow_up").$type<string[]>().default([]),
  contextSlots: jsonb("context_slots").default({}),
  imageUrl: text("image_url").default(""),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  mapData: jsonb("map_data").default(null),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table for responses_location.json data
export const locationResponses = pgTable("location_responses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  building: text("building").notNull(),
  floor: text("floor").default("N/A"),
  coordinates: jsonb("coordinates").$type<number[]>().notNull(), // [y, x] format
  mapId: text("map_id").default("main_map"),
  // Multilingual responses
  responsesEn: jsonb("responses_en").$type<string[]>().default([]),
  responsesCeb: jsonb("responses_ceb").$type<string[]>().default([]),
  // Additional map data
  pins: jsonb("pins").$type<{name: string, coordinates: number[]}[]>().default([]),
  routes: jsonb("routes").$type<{name: string, points: [number, number][], color?: string, isDefault?: boolean}[]>().default([]),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep existing admin_responses table for admin-managed responses
export const adminResponses = pgTable("admin_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intent: text("intent").notNull().unique(),
  category: text("category").notNull(),
  subCategory: text("sub_category").default(""),
  responses: jsonb("responses").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(), // IP + username combination
  attemptCount: integer("attempt_count").default(1),
  lastAttempt: timestamp("last_attempt").defaultNow(),
  lockedUntil: timestamp("locked_until"), // null if not locked
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  token: text("token").notNull(),
  username: text("username").notNull(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Simplified locations table for basic location data
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  coordinates: jsonb("coordinates").notNull(), // [y, x] format
  mapImage: text("map_image").default("/generated_map.png"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPrivileges = pgTable("user_privileges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatEnabled: boolean("chat_enabled").default(true),
  audioInputEnabled: boolean("audio_input_enabled").default(true),
  mapAccessEnabled: boolean("map_access_enabled").default(true),
  autoTranslateEnabled: boolean("auto_translate_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationLogs = pgTable("conversation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  userMessage: text("user_message").notNull(),
  botResponse: text("bot_response"),
  userMessageTimestamp: timestamp("user_message_timestamp").defaultNow(),
  botResponseTimestamp: timestamp("bot_response_timestamp"),
  intent: text("intent"),
  language: text("language").default("en"),
  responseTime: integer("response_time"), // Response time in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const faqConfigs = pgTable("faq_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  superIntent: text("super_intent").notNull(),
  topicKey: text("topic_key").notNull(),
  displayLabel: text("display_label").notNull(),
  subtitle: text("subtitle"),
  icon: text("icon"),
  payload: text("payload").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table for Super Intent module topics (Supper Saiyan/*.json)
export const superIntentResponses = pgTable("super_intent_responses", {
  id: serial("id").primaryKey(),
  superIntent: text("super_intent").notNull(), // The source file identifier (e.g. "University_info")
  topic: text("topic").notNull(),              // The technical topic key (e.g. "mission_vision")
  uiName: text("ui_name").default(""),         // Display name
  // Multilingual answer support
  responsesEn: jsonb("responses_en").$type<string[]>().default([]),
  responsesCeb: jsonb("responses_ceb").$type<string[]>().default([]),
  // Media slots
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  // Map slots
  mapData: jsonb("map_data").$type<{lat: number, lng: number} | null>().default(null),
  pins: jsonb("pins").$type<{name: string, lat: number, lng: number}[]>().default([]),
  routes: jsonb("routes").$type<{name: string, points: [number, number][], color?: string}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table for storing uploaded images in PostgreSQL
export const images = pgTable("images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(), // base64 encoded image data
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maps = pgTable("maps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  styleUrl: text("style_url").default("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  zoom: integer("zoom").default(13),
  center: jsonb("center").$type<number[]>().default([10.3157, 123.8854]),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  mapId: integer("map_id").references(() => maps.id),
  name: text("name").notNull(),
  points: jsonb("points").$type<{lat: number, lng: number}[]>().notNull(),
  color: text("color").default("#3b82f6"),
  weight: integer("weight").default(5),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mapMarkers = pgTable("map_markers", {
  id: serial("id").primaryKey(),
  mapId: integer("map_id").references(() => maps.id),
  name: text("name").notNull(),
  lat: text("lat").notNull(), // Use text for precision
  lng: text("lng").notNull(),
  description: text("description"),
  type: text("type").default("generic"), // e.g., 'building', 'office'
  createdAt: timestamp("created_at").defaultNow(),
});


export const insertMapSchema = createInsertSchema(maps).omit({
  id: true,
  createdAt: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
});

export const insertMapMarkerSchema = createInsertSchema(mapMarkers).omit({
  id: true,
  createdAt: true,
});

export const migrationTracking = pgTable("migration_tracking", {
  fileName: text("file_name").primaryKey(),
  lastMtime: bigint("last_mtime", { mode: "number" }).notNull(),
  version: integer("version").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMigrationTrackingSchema = createInsertSchema(migrationTracking);
export type MigrationTracking = typeof migrationTracking.$inferSelect;
export type InsertMigrationTracking = z.infer<typeof insertMigrationTrackingSchema>;
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertBotResponseSchema = createInsertSchema(botResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationResponseSchema = createInsertSchema(locationResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSuperIntentResponseSchema = createInsertSchema(superIntentResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminResponseSchema = createInsertSchema(adminResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertUserPrivilegesSchema = createInsertSchema(userPrivileges).omit({
  id: true,
  updatedAt: true,
});

export const insertConversationLogSchema = createInsertSchema(conversationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertFaqConfigSchema = createInsertSchema(faqConfigs).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBotResponse = z.infer<typeof insertBotResponseSchema>;
export type BotResponse = typeof botResponses.$inferSelect;

export type InsertLocationResponse = z.infer<typeof insertLocationResponseSchema>;
export type LocationResponse = typeof locationResponses.$inferSelect;

export type InsertSuperIntentResponse = z.infer<typeof insertSuperIntentResponseSchema>;
export type SuperIntentResponse = typeof superIntentResponses.$inferSelect;

export type InsertAdminResponse = z.infer<typeof insertAdminResponseSchema>;
export type AdminResponse = typeof adminResponses.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertUserPrivileges = z.infer<typeof insertUserPrivilegesSchema>;
export type UserPrivileges = typeof userPrivileges.$inferSelect;

export type InsertConversationLog = z.infer<typeof insertConversationLogSchema>;
export type ConversationLog = typeof conversationLogs.$inferSelect;

export const LoginAttempt = typeof loginAttempts.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;

export type InsertFaqConfig = z.infer<typeof insertFaqConfigSchema>;
export type FaqConfig = typeof faqConfigs.$inferSelect;

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

export type InsertMap = z.infer<typeof insertMapSchema>;
export type Map = typeof maps.$inferSelect;

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

export type InsertMapMarker = z.infer<typeof insertMapMarkerSchema>;
export type MapMarker = typeof mapMarkers.$inferSelect;
