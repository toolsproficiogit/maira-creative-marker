import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sessions, files, analysisResults, InsertFile, InsertAnalysisResult } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      
      // Parse DATABASE_URL manually to handle SSL configuration
      // mysql2 doesn't accept JSON string format for SSL in the URL
      const url = new URL(databaseUrl.replace('mysql://', 'http://'));
      const sslParam = url.searchParams.get('ssl');
      
      if (sslParam) {
        // Parse SSL configuration from query parameter
        // mysql2 requires SSL to be an object, not a boolean
        let sslConfig: any = { rejectUnauthorized: true }; // Default SSL config
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(sslParam);
          if (typeof parsed === 'object' && parsed !== null) {
            sslConfig = parsed;
          } else if (parsed === true) {
            sslConfig = { rejectUnauthorized: true };
          } else if (parsed === false) {
            sslConfig = false; // Explicitly disable SSL
          }
        } catch {
          // If not valid JSON, treat as boolean string
          if (sslParam === 'true') {
            sslConfig = { rejectUnauthorized: true };
          } else if (sslParam === 'false') {
            sslConfig = false;
          } else {
            // Default to secure SSL for any other value
            sslConfig = { rejectUnauthorized: true };
          }
        }
        
        // Manually construct connection config
        const mysql = await import('mysql2');
        const config: any = {
          host: url.hostname,
          port: url.port ? parseInt(url.port) : 3306,
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.slice(1), // Remove leading slash
          ssl: sslConfig,
        };
        
        // Add any other query parameters
        url.searchParams.forEach((value, key) => {
          if (key !== 'ssl') {
            config[key] = value;
          }
        });
        
        const connection = mysql.createPool(config);
        _db = drizzle(connection);
      } else {
        // No SSL parameter, use URL as-is
        _db = drizzle(databaseUrl);
      }
      
      console.log('[Database] Connected successfully');
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Session management
export async function createSession(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sessions).values({ userId });
  return result[0].insertId;
}

export async function getSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// File management
export async function createFile(file: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(files).values(file);
  return result[0].insertId;
}

export async function getFilesBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(files).where(eq(files.sessionId, sessionId));
}

export async function getFileById(fileId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Analysis results management
export async function createAnalysisResult(result: InsertAnalysisResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertResult = await db.insert(analysisResults).values(result);
  return insertResult[0].insertId;
}

export async function getAnalysisResultsBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(analysisResults).where(eq(analysisResults.sessionId, sessionId));
}
