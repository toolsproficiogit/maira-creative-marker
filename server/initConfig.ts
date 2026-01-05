import { loadConfig } from "./config";

const CONFIG_BUCKET = "video-analysis-config";

/**
 * Initialize configuration on server startup
 */
export async function initializeConfig() {
  try {
    console.log("[Config] Initializing configuration...");
    await loadConfig(CONFIG_BUCKET);
    console.log("[Config] Configuration initialized successfully");
  } catch (error) {
    console.error("[Config] Failed to initialize configuration:", error);
    console.log("[Config] Using default configuration");
  }
}
