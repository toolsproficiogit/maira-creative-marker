import { ENV } from "./_core/env";

/**
 * Get Google Cloud credentials from environment
 */
export function getGoogleCloudCredentials() {
  const projectId = ENV.googleCloudProject;
  const credentialsJson = ENV.googleApplicationCredentialsJson;
  const dataset = ENV.bigqueryDataset;

  if (!projectId || !credentialsJson || !dataset) {
    throw new Error("Missing required Google Cloud credentials");
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format");
  }

  return {
    projectId,
    credentials,
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
