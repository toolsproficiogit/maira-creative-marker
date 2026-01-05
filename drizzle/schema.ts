import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Analysis sessions group uploaded files together
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Uploaded files with context metadata
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => sessions.id),
  filename: varchar("filename", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 1024 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  filetype: mysqlEnum("filetype", ["image", "video"]).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  
  // Context fields
  brand: text("brand").notNull(),
  targetAudience: text("targetAudience").notNull(),
  category: text("category").notNull(),
  primaryMessage: text("primaryMessage").notNull(),
  secondaryMessage1: text("secondaryMessage1").notNull(),
  secondaryMessage2: text("secondaryMessage2").notNull(),
  version: varchar("version", { length: 64 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Analysis results from Vertex AI
 */
export const analysisResults = mysqlTable("analysisResults", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull().references(() => files.id),
  sessionId: int("sessionId").notNull().references(() => sessions.id),
  
  // Analysis metadata
  focus: mysqlEnum("focus", ["branding", "performance"]).notNull(),
  filetype: mysqlEnum("filetype", ["image", "video"]).notNull(),
  
  // Results
  analysisJson: text("analysisJson").notNull(),
  bigqueryTable: varchar("bigqueryTable", { length: 256 }),
  
  // Retry tracking
  retryCount: int("retryCount").default(0).notNull(),
  validationError: text("validationError"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = typeof analysisResults.$inferInsert;