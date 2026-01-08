/**
 * Prompt Management System Types
 * 
 * A "prompt" is a triple of:
 * - System prompt (instructions for AI)
 * - Output schema (JSON structure)
 * - BigQuery table location
 */

export type Filetype = "image" | "video";
export type Focus = "branding" | "performance";

/**
 * Complete prompt configuration with metadata
 */
export interface PromptConfig {
  /** Unique identifier (e.g., "image_branding_default", "video_performance_v2") */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this prompt analyzes */
  description: string;
  
  /** File type this prompt is designed for */
  filetype: Filetype;
  
  /** Analysis focus */
  focus: Focus;
  
  /** System prompt with variable substitution support */
  systemPrompt: string;
  
  /** JSON schema for output validation */
  outputSchema: Record<string, any>;
  
  /** BigQuery table name for storing results */
  bigqueryTable: string;
  
  /** Whether this is a default (read-only for non-admins) */
  isDefault: boolean;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Creator email */
  createdBy: string;
  
  /** Version number for optimistic locking */
  version: number;
}

/**
 * Prompt creation input (without auto-generated fields)
 */
export type CreatePromptInput = Omit<PromptConfig, "createdAt" | "createdBy" | "version">;

/**
 * Prompt update input
 */
export type UpdatePromptInput = {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  outputSchema?: Record<string, any>;
  bigqueryTable?: string;
  version: number; // For optimistic locking
};

/**
 * Prompt list item (without large fields)
 */
export type PromptListItem = Omit<PromptConfig, "systemPrompt" | "outputSchema">;

/**
 * Hardcoded default prompts for fallback
 */
export const DEFAULT_PROMPT_IDS = [
  "video_performance_default",
  "video_branding_default",
  "image_performance_default",
  "image_branding_default",
] as const;

export type DefaultPromptId = typeof DEFAULT_PROMPT_IDS[number];
