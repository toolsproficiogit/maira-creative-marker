import { Storage } from "@google-cloud/storage";
import { getGoogleCloudCredentials } from "./googleCloud";

let storageClient: Storage | null = null;

/**
 * Get or create GCS client
 */
function getStorageClient(): Storage {
  if (!storageClient) {
    const { projectId, credentials } = getGoogleCloudCredentials();
    
    // If credentials are provided, use them; otherwise use ADC
    if (credentials) {
      storageClient = new Storage({
        projectId,
        credentials,
      });
    } else {
      // Use Application Default Credentials (ADC)
      storageClient = new Storage({ projectId });
    }
  }
  return storageClient;
}

/**
 * Generate a signed URL for uploading a file to GCS
 */
export async function generateSignedUploadUrl(params: {
  bucketName: string;
  fileKey: string;
  contentType: string;
  expiresIn?: number; // in seconds, default 15 minutes
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { bucketName, fileKey, contentType, expiresIn = 900 } = params;
  
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileKey);

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + expiresIn * 1000,
    contentType,
  });

  // Public URL (will be accessible after upload)
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileKey}`;

  return {
    uploadUrl,
    publicUrl,
  };
}

/**
 * Update file to be publicly readable
 */
export async function makeFilePublic(bucketName: string, fileKey: string): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileKey);

  await file.makePublic();
}

/**
 * Check if a file exists in GCS
 */
export async function fileExists(bucketName: string, fileKey: string): Promise<boolean> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileKey);

  const [exists] = await file.exists();
  return exists;
}
