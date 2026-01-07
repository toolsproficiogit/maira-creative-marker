import { Storage } from "@google-cloud/storage";
import { getGoogleCloudCredentials } from "./googleCloud";

let storageClient: Storage | null = null;

/**
 * Get or create GCS client
 */
function getStorageClient(): Storage {
  if (!storageClient) {
    const { projectId, credentials } = getGoogleCloudCredentials();
    storageClient = new Storage({
      projectId,
      credentials,
    });
  }
  return storageClient;
}

/**
 * Configuration structure
 */
export interface AppConfig {
  systemPrompts: {
    "image-branding": string;
    "image-performance": string;
    "video-branding": string;
    "video-performance": string;
  };
  outputSchemas: {
    "image-branding": { schema: Record<string, any>; tableName: string };
    "image-performance": { schema: Record<string, any>; tableName: string };
    "video-branding": { schema: Record<string, any>; tableName: string };
    "video-performance": { schema: Record<string, any>; tableName: string };
  };
  contextFields: Array<{
    name: string;
    label: string;
    required: boolean;
    type: "text" | "textarea";
  }>;
}

// Load prompts from files
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const videoBrandingPrompt = readFileSync(join(__dirname, "../../video_branding_prompt_cs.txt"), "utf-8");
const imageBrandingPrompt = readFileSync(join(__dirname, "../../image_branding_prompt_cs.txt"), "utf-8");
const imagePerformancePrompt = readFileSync(join(__dirname, "../../image_performance_prompt_cs.txt"), "utf-8");
const videoPerformancePrompt = readFileSync(join(__dirname, "../../video_performance_prompt_cs.txt"), "utf-8");

// Load schemas from files
const videoBrandingSchema = JSON.parse(readFileSync(join(__dirname, "../../video_branding_schema.json"), "utf-8"));
const imageBrandingSchema = JSON.parse(readFileSync(join(__dirname, "../../image_branding_schema.json"), "utf-8"));
const imagePerformanceSchema = JSON.parse(readFileSync(join(__dirname, "../../image_performance_schema.json"), "utf-8"));
const videoPerformanceSchema = JSON.parse(readFileSync(join(__dirname, "../../video_performance_schema.json"), "utf-8"));

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppConfig = {
  systemPrompts: {
    "image-branding": imageBrandingPrompt,
    "image-performance": imagePerformancePrompt,
    "video-branding": videoBrandingPrompt,
    "video-performance": videoPerformancePrompt,
  },
  outputSchemas: {
    "image-branding": imageBrandingSchema,
    "image-performance": imagePerformanceSchema,
    "video-branding": videoBrandingSchema,
    "video-performance": videoPerformanceSchema,
  },
  contextFields: [
    { name: "brand", label: "Brand", required: true, type: "text" },
    { name: "targetAudience", label: "Target Audience", required: true, type: "text" },
    { name: "category", label: "Category", required: true, type: "text" },
    { name: "primaryMessage", label: "Primary Message", required: true, type: "textarea" },
    { name: "secondaryMessage1", label: "Secondary Message 1", required: true, type: "textarea" },
    { name: "secondaryMessage2", label: "Secondary Message 2", required: true, type: "textarea" },
    { name: "version", label: "Version", required: false, type: "text" },
  ],
};

let cachedConfig: AppConfig | null = null;

/**
 * Load configuration from GCS or use default
 */
export async function loadConfig(bucketName: string, configFileName: string = "config.json"): Promise<AppConfig> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(configFileName);

    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("[Config] Config file not found in GCS, using defaults");
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }

    const [contents] = await file.download();
    const config = JSON.parse(contents.toString());
    
    cachedConfig = config;
    console.log("[Config] Loaded configuration from GCS");
    return config;
  } catch (error) {
    console.error("[Config] Error loading config from GCS:", error);
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to GCS
 */
export async function saveConfig(
  bucketName: string,
  config: AppConfig,
  configFileName: string = "config.json"
): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(configFileName);

  await file.save(JSON.stringify(config, null, 2), {
    contentType: "application/json",
  });

  cachedConfig = config;
  console.log("[Config] Saved configuration to GCS");
}

/**
 * Get cached configuration
 */
export function getCachedConfig(): AppConfig {
  return cachedConfig || DEFAULT_CONFIG;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): AppConfig {
  return DEFAULT_CONFIG;
}
