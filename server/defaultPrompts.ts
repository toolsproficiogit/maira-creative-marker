/**
 * Hardcoded Default Prompts
 * 
 * These serve as fallback when GCS is unavailable
 * Also used to initialize GCS on first deployment
 */

import type { PromptConfig } from "../shared/promptTypes";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read prompt files from project directory
const VIDEO_PERFORMANCE_PROMPT = fs.readFileSync(
  path.join(__dirname, "../video_performance_prompt_cs.txt"),
  "utf8"
);

const VIDEO_BRANDING_PROMPT = fs.readFileSync(
  path.join(__dirname, "../video_branding_prompt_cs.txt"),
  "utf8"
);

const IMAGE_PERFORMANCE_PROMPT = fs.readFileSync(
  path.join(__dirname, "../image_performance_prompt_cs.txt"),
  "utf8"
);

const IMAGE_BRANDING_PROMPT = fs.readFileSync(
  path.join(__dirname, "../image_branding_prompt_cs.txt"),
  "utf8"
);

// Read schema files
const VIDEO_PERFORMANCE_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../video_performance_schema.json"), "utf8")
);

const VIDEO_BRANDING_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../video_branding_schema.json"), "utf8")
);

const IMAGE_PERFORMANCE_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../image_performance_schema.json"), "utf8")
);

const IMAGE_BRANDING_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../image_branding_schema.json"), "utf8")
);

export const DEFAULT_PROMPTS: Record<string, PromptConfig> = {
  video_performance_default: {
    id: "video_performance_default",
    name: "Video Performance Analysis (Default)",
    description: "Analýza výkonnosti videa: Hook, Message, Pacing, CTA",
    filetype: "video",
    focus: "performance",
    systemPrompt: VIDEO_PERFORMANCE_PROMPT,
    outputSchema: VIDEO_PERFORMANCE_SCHEMA,
    bigqueryTable: "video_performance_test",
    isDefault: true,
    createdAt: "2026-01-08T00:00:00Z",
    createdBy: "system",
    version: 1,
  },
  
  video_branding_default: {
    id: "video_branding_default",
    name: "Video Branding Analysis (Default)",
    description: "Analýza brandingu videa: Linkage, Story, Message, Craft",
    filetype: "video",
    focus: "branding",
    systemPrompt: VIDEO_BRANDING_PROMPT,
    outputSchema: VIDEO_BRANDING_SCHEMA,
    bigqueryTable: "video_branding_test",
    isDefault: true,
    createdAt: "2026-01-08T00:00:00Z",
    createdBy: "system",
    version: 1,
  },
  
  image_performance_default: {
    id: "image_performance_default",
    name: "Image Performance Analysis (Default)",
    description: "Analýza výkonnosti obrázku: Attention, Copy, Offer, CTA",
    filetype: "image",
    focus: "performance",
    systemPrompt: IMAGE_PERFORMANCE_PROMPT,
    outputSchema: IMAGE_PERFORMANCE_SCHEMA,
    bigqueryTable: "image_performance_test",
    isDefault: true,
    createdAt: "2026-01-08T00:00:00Z",
    createdBy: "system",
    version: 1,
  },
  
  image_branding_default: {
    id: "image_branding_default",
    name: "Image Branding Analysis (Default)",
    description: "Analýza brandingu obrázku: Distinctiveness, Emotion, Message, CEP",
    filetype: "image",
    focus: "branding",
    systemPrompt: IMAGE_BRANDING_PROMPT,
    outputSchema: IMAGE_BRANDING_SCHEMA,
    bigqueryTable: "image_branding_test",
    isDefault: true,
    createdAt: "2026-01-08T00:00:00Z",
    createdBy: "system",
    version: 1,
  },
};

/**
 * Get all default prompts
 */
export function getDefaultPrompts(): PromptConfig[] {
  return Object.values(DEFAULT_PROMPTS);
}

/**
 * Get a specific default prompt by ID
 */
export function getDefaultPrompt(promptId: string): PromptConfig | null {
  return DEFAULT_PROMPTS[promptId] || null;
}
