import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { 
  createSession, 
  createFile, 
  getFilesBySession,
  createAnalysisResult,
  getAnalysisResultsBySession as getDbAnalysisResults,
  getSessionById,
  getFileById,
} from "./db";
import { analyzeWithRetry } from "./vertexAI";
import { ensureTableExists, insertAnalysisResult } from "./bigquery";
import { loadConfig, saveConfig, getCachedConfig, getDefaultConfig, AppConfig } from "./config";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

const CONFIG_BUCKET = "video-analysis-config";

export const analysisRouter = router({
  // Session management
  createSession: protectedProcedure.mutation(async ({ ctx }) => {
    const sessionId = await createSession(ctx.user.id);
    return { sessionId };
  }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const session = await getSessionById(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      return session;
    }),

  // File upload
  uploadFile: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        contextFields: z.object({
          brand: z.string(),
          targetAudience: z.string(),
          category: z.string(),
          primaryMessage: z.string(),
          secondaryMessage1: z.string(),
          secondaryMessage2: z.string(),
          version: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Infer filetype from MIME type
      let filetype: "image" | "video";
      if (input.mimeType.startsWith("image/")) {
        filetype = "image";
      } else if (input.mimeType.startsWith("video/")) {
        filetype = "video";
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File must be an image or video",
        });
      }

      // Generate unique file key
      const fileKey = `${ctx.user.id}/sessions/${input.sessionId}/${nanoid()}-${input.filename}`;

      // Store file metadata in database
      const fileId = await createFile({
        sessionId: input.sessionId,
        filename: input.filename,
        fileKey,
        fileUrl: "", // Will be updated after upload
        filetype,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        ...input.contextFields,
      });

      return {
        fileId,
        fileKey,
        filetype,
      };
    }),

  // Get files for a session
  getSessionFiles: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return await getFilesBySession(input.sessionId);
    }),

  // Run analysis
  runAnalysis: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        focus: z.enum(["branding", "performance"]),
      })
    )
    .mutation(async ({ input }) => {
      const files = await getFilesBySession(input.sessionId);
      
      if (files.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No files found for this session",
        });
      }

      const config = getCachedConfig();
      const results = [];

      for (const file of files) {
        const configKey = `${file.filetype}-${input.focus}` as keyof typeof config.systemPrompts;
        const systemPrompt = config.systemPrompts[configKey];
        const outputConfig = config.outputSchemas[configKey];

        const contextFields = {
          brand: file.brand,
          targetAudience: file.targetAudience,
          category: file.category,
          primaryMessage: file.primaryMessage,
          secondaryMessage1: file.secondaryMessage1,
          secondaryMessage2: file.secondaryMessage2,
          version: file.version || "",
        };

        // Analyze with Vertex AI
        const analysisResult = await analyzeWithRetry({
          fileUrl: file.fileUrl,
          mimeType: file.mimeType || "application/octet-stream",
          systemPrompt,
          contextFields,
          expectedSchema: outputConfig.schema,
          maxRetries: 2,
        });

        // Store in database
        const resultId = await createAnalysisResult({
          fileId: file.id,
          sessionId: input.sessionId,
          focus: input.focus,
          filetype: file.filetype,
          analysisJson: JSON.stringify(analysisResult.result || {}),
          bigqueryTable: analysisResult.success ? outputConfig.tableName : null,
          retryCount: analysisResult.retryCount,
          validationError: analysisResult.error || null,
        });

        // Store in BigQuery if successful
        if (analysisResult.success && analysisResult.result) {
          try {
            await ensureTableExists(outputConfig.tableName, outputConfig.schema);
            await insertAnalysisResult({
              tableName: outputConfig.tableName,
              sessionId: input.sessionId,
              fileId: file.id,
              filename: file.filename,
              contextFields: {
                brand: file.brand,
                targetAudience: file.targetAudience,
                category: file.category,
                primaryMessage: file.primaryMessage,
                secondaryMessage1: file.secondaryMessage1,
                secondaryMessage2: file.secondaryMessage2,
                version: file.version || undefined,
              },
              analysisData: analysisResult.result,
            });
          } catch (bigqueryError) {
            console.error("[BigQuery] Failed to insert result:", bigqueryError);
            // Continue even if BigQuery fails
          }
        }

        results.push({
          fileId: file.id,
          filename: file.filename,
          success: analysisResult.success,
          result: analysisResult.result,
          error: analysisResult.error,
          retryCount: analysisResult.retryCount,
        });
      }

      return { results };
    }),

  // Get analysis results
  getResults: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const results = await getDbAnalysisResults(input.sessionId);
      const files = await getFilesBySession(input.sessionId);

      return results.map((result) => {
        const file = files.find((f) => f.id === result.fileId);
        return {
          ...result,
          filename: file?.filename || "Unknown",
          analysisData: JSON.parse(result.analysisJson),
        };
      });
    }),

  // Configuration management
  getConfig: protectedProcedure.query(() => {
    return getCachedConfig();
  }),

  refreshConfig: protectedProcedure.mutation(async () => {
    const config = await loadConfig(CONFIG_BUCKET);
    return config;
  }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        config: z.custom<AppConfig>(),
      })
    )
    .mutation(async ({ input }) => {
      await saveConfig(CONFIG_BUCKET, input.config);
      return { success: true };
    }),

  getDefaultConfig: protectedProcedure.query(() => {
    return getDefaultConfig();
  }),
});
