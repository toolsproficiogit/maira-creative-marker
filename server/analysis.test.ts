import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createSession, getSessionById } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Analysis Router", () => {
  describe("Session Management", () => {
    it("should create a new session", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analysis.createSession();

      expect(result).toHaveProperty("sessionId");
      expect(typeof result.sessionId).toBe("number");
      expect(result.sessionId).toBeGreaterThan(0);
    });

    it("should retrieve a session by ID", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a session first
      const { sessionId } = await caller.analysis.createSession();

      // Retrieve it
      const session = await caller.analysis.getSession({ sessionId });

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.userId).toBe(ctx.user!.id);
    });
  });

  describe("Configuration Management", () => {
    it("should retrieve configuration", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const config = await caller.analysis.getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("systemPrompts");
      expect(config).toHaveProperty("outputSchemas");
      expect(config).toHaveProperty("contextFields");
    });

    it("should have all 4 system prompt combinations", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const config = await caller.analysis.getConfig();

      expect(config.systemPrompts).toHaveProperty("image-branding");
      expect(config.systemPrompts).toHaveProperty("image-performance");
      expect(config.systemPrompts).toHaveProperty("video-branding");
      expect(config.systemPrompts).toHaveProperty("video-performance");

      // Check that prompts are not empty
      expect(config.systemPrompts["image-branding"].length).toBeGreaterThan(0);
      expect(config.systemPrompts["image-performance"].length).toBeGreaterThan(0);
      expect(config.systemPrompts["video-branding"].length).toBeGreaterThan(0);
      expect(config.systemPrompts["video-performance"].length).toBeGreaterThan(0);
    });

    it("should have all 4 output schema combinations", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const config = await caller.analysis.getConfig();

      expect(config.outputSchemas).toHaveProperty("image-branding");
      expect(config.outputSchemas).toHaveProperty("image-performance");
      expect(config.outputSchemas).toHaveProperty("video-branding");
      expect(config.outputSchemas).toHaveProperty("video-performance");

      // Check that each schema has tableName and schema
      Object.values(config.outputSchemas).forEach((schemaConfig) => {
        expect(schemaConfig).toHaveProperty("tableName");
        expect(schemaConfig).toHaveProperty("schema");
        expect(typeof schemaConfig.tableName).toBe("string");
        expect(typeof schemaConfig.schema).toBe("object");
      });
    });

    it("should have required context fields", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const config = await caller.analysis.getConfig();

      expect(Array.isArray(config.contextFields)).toBe(true);
      expect(config.contextFields.length).toBeGreaterThan(0);

      // Check for required fields
      const fieldNames = config.contextFields.map((f: any) => f.name);
      expect(fieldNames).toContain("brand");
      expect(fieldNames).toContain("targetAudience");
      expect(fieldNames).toContain("category");
      expect(fieldNames).toContain("primaryMessage");
      expect(fieldNames).toContain("secondaryMessage1");
      expect(fieldNames).toContain("secondaryMessage2");
      expect(fieldNames).toContain("version");
    });

    it("should retrieve default configuration", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const defaultConfig = await caller.analysis.getDefaultConfig();

      expect(defaultConfig).toBeDefined();
      expect(defaultConfig).toHaveProperty("systemPrompts");
      expect(defaultConfig).toHaveProperty("outputSchemas");
      expect(defaultConfig).toHaveProperty("contextFields");
    });
  });

  describe("File Upload", () => {
    it("should accept image file metadata", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const { sessionId } = await caller.analysis.createSession();

      const result = await caller.analysis.uploadFile({
        sessionId,
        filename: "test-image.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024000,
        contextFields: {
          brand: "Test Brand",
          targetAudience: "Test Audience",
          category: "Test Category",
          primaryMessage: "Test Primary Message",
          secondaryMessage1: "Test Secondary 1",
          secondaryMessage2: "Test Secondary 2",
          version: "1.0",
        },
      });

      expect(result).toHaveProperty("fileId");
      expect(result).toHaveProperty("fileKey");
      expect(result).toHaveProperty("filetype");
      expect(result.filetype).toBe("image");
    });

    it("should accept video file metadata", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const { sessionId } = await caller.analysis.createSession();

      const result = await caller.analysis.uploadFile({
        sessionId,
        filename: "test-video.mp4",
        mimeType: "video/mp4",
        fileSize: 5000000,
        contextFields: {
          brand: "Test Brand",
          targetAudience: "Test Audience",
          category: "Test Category",
          primaryMessage: "Test Primary Message",
          secondaryMessage1: "Test Secondary 1",
          secondaryMessage2: "Test Secondary 2",
        },
      });

      expect(result).toHaveProperty("fileId");
      expect(result).toHaveProperty("fileKey");
      expect(result).toHaveProperty("filetype");
      expect(result.filetype).toBe("video");
    });

    it("should reject non-image/video files", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const { sessionId } = await caller.analysis.createSession();

      await expect(
        caller.analysis.uploadFile({
          sessionId,
          filename: "test-document.pdf",
          mimeType: "application/pdf",
          fileSize: 1024000,
          contextFields: {
            brand: "Test Brand",
            targetAudience: "Test Audience",
            category: "Test Category",
            primaryMessage: "Test Primary Message",
            secondaryMessage1: "Test Secondary 1",
            secondaryMessage2: "Test Secondary 2",
          },
        })
      ).rejects.toThrow("File must be an image or video");
    });
  });

  describe("Session Files", () => {
    it("should retrieve files for a session", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const { sessionId } = await caller.analysis.createSession();

      // Upload a file
      await caller.analysis.uploadFile({
        sessionId,
        filename: "test.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024000,
        contextFields: {
          brand: "Test Brand",
          targetAudience: "Test Audience",
          category: "Test Category",
          primaryMessage: "Test Primary Message",
          secondaryMessage1: "Test Secondary 1",
          secondaryMessage2: "Test Secondary 2",
        },
      });

      // Retrieve files
      const files = await caller.analysis.getSessionFiles({ sessionId });

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toHaveProperty("filename");
      expect(files[0].filename).toBe("test.jpg");
    });
  });
});
