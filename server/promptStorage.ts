/**
 * GCS-based Prompt Storage
 * 
 * Stores prompt configurations as JSON files in GCS bucket under prompts/ folder
 * File naming: prompts/{promptId}.json
 */

import { Storage } from "@google-cloud/storage";
import { getGoogleCloudCredentials } from "./googleCloud";
import type { PromptConfig, PromptListItem } from "../shared/promptTypes";
import { ENV } from "./_core/env";

const PROMPTS_FOLDER = "prompts/";

/**
 * Get GCS storage client
 */
function getStorageClient(): Storage {
  const { projectId, credentials } = getGoogleCloudCredentials();
  // If credentials are provided, use them; otherwise use ADC
  return credentials
    ? new Storage({ projectId, credentials })
    : new Storage({ projectId });
}

/**
 * List all available prompts from GCS
 */
export async function listPromptsFromGCS(): Promise<PromptListItem[]> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(ENV.gcsBucket || "maira-creative-marker");
    
    const [files] = await bucket.getFiles({ prefix: PROMPTS_FOLDER });
    
    const prompts: PromptListItem[] = [];
    
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      
      try {
        const [content] = await file.download();
        const promptConfig: PromptConfig = JSON.parse(content.toString());
        
        // Return list item without large fields
        const { systemPrompt, outputSchema, ...listItem } = promptConfig;
        prompts.push(listItem);
      } catch (error) {
        console.error(`[PromptStorage] Failed to parse ${file.name}:`, error);
      }
    }
    
    console.log(`[PromptStorage] Listed ${prompts.length} prompts from GCS`);
    return prompts;
  } catch (error) {
    console.error("[PromptStorage] Failed to list prompts from GCS:", error);
    throw new Error("Failed to list prompts from GCS");
  }
}

/**
 * Get a specific prompt by ID from GCS
 */
export async function getPromptFromGCS(promptId: string): Promise<PromptConfig | null> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(ENV.gcsBucket || "maira-creative-marker");
    const file = bucket.file(`${PROMPTS_FOLDER}${promptId}.json`);
    
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`[PromptStorage] Prompt ${promptId} not found in GCS`);
      return null;
    }
    
    const [content] = await file.download();
    const promptConfig: PromptConfig = JSON.parse(content.toString());
    
    console.log(`[PromptStorage] Retrieved prompt ${promptId} from GCS`);
    return promptConfig;
  } catch (error) {
    console.error(`[PromptStorage] Failed to get prompt ${promptId}:`, error);
    return null;
  }
}

/**
 * Save a prompt to GCS
 */
export async function savePromptToGCS(promptConfig: PromptConfig): Promise<void> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(ENV.gcsBucket || "maira-creative-marker");
    const file = bucket.file(`${PROMPTS_FOLDER}${promptConfig.id}.json`);
    
    await file.save(JSON.stringify(promptConfig, null, 2), {
      contentType: "application/json",
      metadata: {
        cacheControl: "no-cache",
      },
    });
    
    console.log(`[PromptStorage] Saved prompt ${promptConfig.id} to GCS`);
  } catch (error) {
    console.error(`[PromptStorage] Failed to save prompt ${promptConfig.id}:`, error);
    throw new Error(`Failed to save prompt ${promptConfig.id} to GCS`);
  }
}

/**
 * Delete a prompt from GCS
 */
export async function deletePromptFromGCS(promptId: string): Promise<void> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(ENV.gcsBucket || "maira-creative-marker");
    const file = bucket.file(`${PROMPTS_FOLDER}${promptId}.json`);
    
    await file.delete();
    
    console.log(`[PromptStorage] Deleted prompt ${promptId} from GCS`);
  } catch (error) {
    console.error(`[PromptStorage] Failed to delete prompt ${promptId}:`, error);
    throw new Error(`Failed to delete prompt ${promptId} from GCS`);
  }
}

/**
 * Check if a prompt exists in GCS
 */
export async function promptExistsInGCS(promptId: string): Promise<boolean> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(ENV.gcsBucket || "maira-creative-marker");
    const file = bucket.file(`${PROMPTS_FOLDER}${promptId}.json`);
    
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error(`[PromptStorage] Failed to check if prompt ${promptId} exists:`, error);
    return false;
  }
}
