/**
 * Prompt Management tRPC Router
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listPromptsFromGCS,
  getPromptFromGCS,
  savePromptToGCS,
  deletePromptFromGCS,
  promptExistsInGCS,
} from "./promptStorage";
import { getDefaultPrompts, getDefaultPrompt } from "./defaultPrompts";
import type { PromptConfig, PromptListItem } from "../shared/promptTypes";
import { DEFAULT_PROMPT_IDS } from "../shared/promptTypes";

/**
 * Check if user can manage default prompts
 */
function canManageDefaults(userEmail: string, userRole: string): boolean {
  return userRole === "admin";
}

export const promptRouter = router({
  /**
   * List all available prompts (GCS + defaults, with fallback)
   * TODO: Re-enable auth in Phase 2 (change to protectedProcedure)
   */
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      // Try to get prompts from GCS
      const gcsPrompts = await listPromptsFromGCS();
      
      // Add default prompts
      const defaultPrompts = getDefaultPrompts();
      const defaultListItems: PromptListItem[] = defaultPrompts.map(
        ({ systemPrompt, outputSchema, ...rest }) => rest
      );
      
      // Combine and deduplicate (GCS overrides defaults)
      const allPrompts = [...gcsPrompts];
      for (const defaultPrompt of defaultListItems) {
        if (!allPrompts.some((p) => p.id === defaultPrompt.id)) {
          allPrompts.push(defaultPrompt);
        }
      }
      
      return { prompts: allPrompts, source: "gcs" as const };
    } catch (error) {
      console.error("[PromptRouter] Failed to list from GCS, using defaults:", error);
      
      // Fallback to hardcoded defaults
      const defaultPrompts = getDefaultPrompts();
      const defaultListItems: PromptListItem[] = defaultPrompts.map(
        ({ systemPrompt, outputSchema, ...rest }) => rest
      );
      
      return { prompts: defaultListItems, source: "fallback" as const };
    }
  }),

  /**
   * Get a specific prompt by ID
   * TODO: Re-enable auth in Phase 2 (change to protectedProcedure)
   */
  get: publicProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      const { promptId } = input;
      
      try {
        // Try GCS first
        const gcsPrompt = await getPromptFromGCS(promptId);
        if (gcsPrompt) {
          return { prompt: gcsPrompt, source: "gcs" as const };
        }
        
        // Fallback to default
        const defaultPrompt = getDefaultPrompt(promptId);
        if (defaultPrompt) {
          return { prompt: defaultPrompt, source: "default" as const };
        }
        
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Prompt ${promptId} not found`,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        // On GCS error, try default
        const defaultPrompt = getDefaultPrompt(promptId);
        if (defaultPrompt) {
          return { prompt: defaultPrompt, source: "fallback" as const };
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get prompt ${promptId}`,
        });
      }
    }),

  /**
   * Create a new prompt
   * TODO: Re-enable auth in Phase 2 (change to protectedProcedure)
   */
  create: publicProcedure
    .input(
      z.object({
        id: z.string().regex(/^[a-z0-9_]+$/, "ID must be lowercase alphanumeric with underscores"),
        name: z.string().min(1),
        description: z.string(),
        filetype: z.enum(["image", "video"]),
        focus: z.enum(["branding", "performance"]),
        systemPrompt: z.string().min(1),
        outputSchema: z.record(z.string(), z.any()),
        bigqueryTable: z.string().regex(/^[a-z0-9_]+$/, "Table name must be lowercase alphanumeric with underscores"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      
      // Check if prompt already exists
      const exists = await promptExistsInGCS(id);
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Prompt ${id} already exists`,
        });
      }
      
      // Check if it's a default ID (reserved)
      if (DEFAULT_PROMPT_IDS.includes(id as any)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Prompt ID ${id} is reserved for defaults`,
        });
      }
      
      const promptConfig: PromptConfig = {
        ...input,
        isDefault: false,
        createdAt: new Date().toISOString(),
        createdBy: ctx.user?.email || ctx.user?.name || "anonymous",
        version: 1,
      };
      
      await savePromptToGCS(promptConfig);
      
      return { success: true, promptId: id };
    }),

  /**
   * Update an existing prompt
   * TODO: Re-enable auth in Phase 2 (change to protectedProcedure)
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        systemPrompt: z.string().min(1).optional(),
        outputSchema: z.record(z.string(), z.any()).optional(),
        bigqueryTable: z.string().regex(/^[a-z0-9_]+$/, "Table name must be lowercase alphanumeric with underscores").optional(),
        version: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, version, ...updates } = input;
      
      // Get existing prompt
      const existing = await getPromptFromGCS(id);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Prompt ${id} not found`,
        });
      }
      
      // Check if it's a default and user has permission
      if (existing.isDefault && !canManageDefaults(ctx.user?.email || "", ctx.user?.role || "user")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update default prompts",
        });
      }
      
      // Optimistic locking check
      if (existing.version !== version) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Prompt was modified by another user. Please refresh and try again.",
        });
      }
      
      // Apply updates
      const updated: PromptConfig = {
        ...existing,
        ...updates,
        version: existing.version + 1,
      };
      
      await savePromptToGCS(updated);
      
      return { success: true, promptId: id, version: updated.version };
    }),

  /**
   * Delete a prompt
   * TODO: Re-enable auth in Phase 2 (change to protectedProcedure)
   */
  delete: publicProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { promptId } = input;
      
      // Get existing prompt
      const existing = await getPromptFromGCS(promptId);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Prompt ${promptId} not found`,
        });
      }
      
      // Check if it's a default
      if (existing.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete default prompts",
        });
      }
      
      await deletePromptFromGCS(promptId);
      
      return { success: true };
    }),

  /**
   * Initialize GCS with default prompts
   * TODO: Re-enable auth in Phase 2 (change to protectedProcedure)
   * TODO: Re-enable admin check after user management is implemented
   */
  initializeDefaults: publicProcedure.mutation(async ({ ctx }) => {
    // Admin check temporarily disabled for testing
    // if (!canManageDefaults(ctx.user?.email || "", ctx.user?.role || "user")) {
    //   throw new TRPCError({
    //     code: "FORBIDDEN",
    //     message: "Only admins can initialize defaults",
    //   });
    // }
    
    const defaults = getDefaultPrompts();
    let initialized = 0;
    
    for (const prompt of defaults) {
      try {
        const exists = await promptExistsInGCS(prompt.id);
        if (!exists) {
          await savePromptToGCS(prompt);
          initialized++;
        }
      } catch (error) {
        console.error(`[PromptRouter] Failed to initialize ${prompt.id}:`, error);
      }
    }
    
    return { success: true, initialized };
  }),
});
