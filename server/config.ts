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

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppConfig = {
  systemPrompts: {
    "image-branding": `You are an expert brand analyst. Analyze this image for branding effectiveness.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Brand visibility and prominence
2. Message clarity and alignment
3. Visual appeal for target audience
4. Brand consistency

Return your analysis as JSON matching this structure:
{
  "brand_visibility_score": 1-10,
  "message_clarity_score": 1-10,
  "target_audience_fit_score": 1-10,
  "overall_branding_score": 1-10,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
    "image-performance": `You are a marketing performance analyst. Analyze this image for campaign performance potential.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Call-to-action clarity
2. Engagement potential
3. Conversion likelihood
4. Performance metrics prediction

Return your analysis as JSON matching this structure:
{
  "cta_clarity_score": 1-10,
  "engagement_potential_score": 1-10,
  "conversion_likelihood_score": 1-10,
  "overall_performance_score": 1-10,
  "predicted_metrics": {
    "click_through_rate": "percentage estimate",
    "engagement_rate": "percentage estimate"
  },
  "optimization_suggestions": ["suggestion 1", "suggestion 2"]
}`,
    "video-branding": `You are an expert brand analyst. Analyze this video for branding effectiveness.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Brand presence throughout video
2. Message delivery effectiveness
3. Emotional connection with target audience
4. Brand recall potential

Return your analysis as JSON matching this structure:
{
  "brand_presence_score": 1-10,
  "message_delivery_score": 1-10,
  "emotional_connection_score": 1-10,
  "brand_recall_score": 1-10,
  "overall_branding_score": 1-10,
  "key_moments": ["timestamp: observation"],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
    "video-performance": `You are a marketing performance analyst. Analyze this video for campaign performance potential.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Hook effectiveness (first 3 seconds)
2. Retention potential
3. Call-to-action strength
4. Shareability and virality potential

Return your analysis as JSON matching this structure:
{
  "hook_effectiveness_score": 1-10,
  "retention_potential_score": 1-10,
  "cta_strength_score": 1-10,
  "shareability_score": 1-10,
  "overall_performance_score": 1-10,
  "predicted_metrics": {
    "view_through_rate": "percentage estimate",
    "engagement_rate": "percentage estimate",
    "share_rate": "percentage estimate"
  },
  "optimization_suggestions": ["suggestion 1", "suggestion 2"]
}`,
  },
  outputSchemas: {
    "image-branding": {
      tableName: "image_branding_results",
      schema: {
        brand_visibility_score: { type: "integer" },
        message_clarity_score: { type: "integer" },
        target_audience_fit_score: { type: "integer" },
        overall_branding_score: { type: "integer" },
        strengths: { type: "array" },
        weaknesses: { type: "array" },
        recommendations: { type: "array" },
      },
    },
    "image-performance": {
      tableName: "image_performance_results",
      schema: {
        cta_clarity_score: { type: "integer" },
        engagement_potential_score: { type: "integer" },
        conversion_likelihood_score: { type: "integer" },
        overall_performance_score: { type: "integer" },
        predicted_metrics: { type: "object" },
        optimization_suggestions: { type: "array" },
      },
    },
    "video-branding": {
      tableName: "video_branding_results",
      schema: {
        brand_presence_score: { type: "integer" },
        message_delivery_score: { type: "integer" },
        emotional_connection_score: { type: "integer" },
        brand_recall_score: { type: "integer" },
        overall_branding_score: { type: "integer" },
        key_moments: { type: "array" },
        strengths: { type: "array" },
        weaknesses: { type: "array" },
        recommendations: { type: "array" },
      },
    },
    "video-performance": {
      tableName: "video_performance_results",
      schema: {
        hook_effectiveness_score: { type: "integer" },
        retention_potential_score: { type: "integer" },
        cta_strength_score: { type: "integer" },
        shareability_score: { type: "integer" },
        overall_performance_score: { type: "integer" },
        predicted_metrics: { type: "object" },
        optimization_suggestions: { type: "array" },
      },
    },
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
