import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("GCS Upload Flow", () => {
  it("should generate signed upload URL for image", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.analysis.createSession();

    const result = await caller.analysis.generateUploadUrl({
      sessionId,
      filename: "test-image.jpg",
      contentType: "image/jpeg",
    });

    expect(result).toHaveProperty("uploadUrl");
    expect(result).toHaveProperty("publicUrl");
    expect(result).toHaveProperty("fileKey");
    expect(result).toHaveProperty("filetype");
    expect(result.filetype).toBe("image");
    expect(result.uploadUrl).toContain("storage.googleapis.com");
    expect(result.publicUrl).toContain("storage.googleapis.com");
  });

  it("should generate signed upload URL for video", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.analysis.createSession();

    const result = await caller.analysis.generateUploadUrl({
      sessionId,
      filename: "test-video.mp4",
      contentType: "video/mp4",
    });

    expect(result).toHaveProperty("uploadUrl");
    expect(result).toHaveProperty("publicUrl");
    expect(result).toHaveProperty("fileKey");
    expect(result).toHaveProperty("filetype");
    expect(result.filetype).toBe("video");
  });

  it("should reject non-media content types", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.analysis.createSession();

    await expect(
      caller.analysis.generateUploadUrl({
        sessionId,
        filename: "document.pdf",
        contentType: "application/pdf",
      })
    ).rejects.toThrow("File must be an image or video");
  });

  it("should update file URL after upload", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.analysis.createSession();

    // Create file record
    const fileData = await caller.analysis.uploadFile({
      sessionId,
      filename: "test.jpg",
      mimeType: "image/jpeg",
      fileSize: 1024000,
      contextFields: {
        brand: "Test Brand",
        targetAudience: "Test Audience",
        category: "Test Category",
        primaryMessage: "Test Primary",
        secondaryMessage1: "Test Secondary 1",
        secondaryMessage2: "Test Secondary 2",
      },
    });

    // Update with URL
    const testUrl = "https://storage.googleapis.com/bucket/test.jpg";
    const result = await caller.analysis.updateFileUrl({
      fileId: fileData.fileId,
      fileUrl: testUrl,
    });

    expect(result.success).toBe(true);

    // Verify the URL was updated
    const files = await caller.analysis.getSessionFiles({ sessionId });
    const updatedFile = files.find((f) => f.id === fileData.fileId);
    expect(updatedFile?.fileUrl).toBe(testUrl);
  });

  it("should generate unique file keys for multiple uploads", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.analysis.createSession();

    const result1 = await caller.analysis.generateUploadUrl({
      sessionId,
      filename: "test.jpg",
      contentType: "image/jpeg",
    });

    const result2 = await caller.analysis.generateUploadUrl({
      sessionId,
      filename: "test.jpg",
      contentType: "image/jpeg",
    });

    expect(result1.fileKey).not.toBe(result2.fileKey);
  });
});
