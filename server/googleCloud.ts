import { ENV } from "./_core/env";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let credentialsFilePath: string | null = null;

/**
 * Write credentials JSON to a temporary file for Application Default Credentials
 */
function writeCredentialsFile(credentialsJson: string): string {
  if (credentialsFilePath && fs.existsSync(credentialsFilePath)) {
    return credentialsFilePath;
  }

  try {
    // Create temp directory if it doesn't exist
    const tmpDir = path.join(os.tmpdir(), 'gcp-credentials');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Write credentials to file
    credentialsFilePath = path.join(tmpDir, 'credentials.json');
    fs.writeFileSync(credentialsFilePath, credentialsJson, 'utf8');
    
    // Set environment variable for ADC
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;
    
    console.log('[GoogleCloud] Credentials file written to:', credentialsFilePath);
    return credentialsFilePath;
  } catch (error) {
    console.error('[GoogleCloud] Failed to write credentials file:', error);
    throw new Error('Failed to initialize Google Cloud credentials');
  }
}

export function getGoogleCloudCredentials() {
  const projectId = ENV.googleCloudProject;
  const credentialsJson = ENV.googleApplicationCredentialsJson;
  const dataset = ENV.bigqueryDataset;

  if (!projectId || !dataset) {
    throw new Error("Missing required Google Cloud configuration (GOOGLE_CLOUD_PROJECT or BIGQUERY_DATASET)");
  }

  // If credentials JSON is provided, use it
  if (credentialsJson) {
    // Write credentials to file for ADC
    writeCredentialsFile(credentialsJson);

    // Parse credentials for direct use
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error('[GoogleCloud] Failed to parse credentials JSON:', error);
      throw new Error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format");
    }

    return {
      projectId,
      credentials,
      dataset,
    };
  }

  // Otherwise, use Application Default Credentials (ADC)
  // This works automatically in Cloud Run with service account
  console.log('[GoogleCloud] Using Application Default Credentials (service account)');
  return {
    projectId,
    credentials: undefined, // Let Google Cloud SDK use ADC
    dataset,
  };
}

/**
 * Test Google Cloud credentials by checking project access
 */
export async function testGoogleCloudCredentials(): Promise<boolean> {
  try {
    const { projectId, credentials } = getGoogleCloudCredentials();
    
    // Basic validation
    if (!credentials.client_email || !credentials.private_key) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
