import { Storage } from "@google-cloud/storage";
import { getGoogleCloudCredentials } from "./googleCloud";
import { ENV } from "./_core/env";

/**
 * Test GCS connection and signed URL generation
 */
export async function testGcsConnection() {
  console.log("\n=== Testing GCS Connection ===");
  
  try {
    // Step 1: Get credentials
    console.log("1. Getting credentials...");
    const { projectId, credentials } = getGoogleCloudCredentials();
    console.log("   ✓ Project ID:", projectId);
    console.log("   ✓ Service Account:", credentials.client_email);
    console.log("   ✓ Private Key length:", credentials.private_key?.length || 0);
    console.log("   ✓ Private Key starts with:", credentials.private_key?.substring(0, 50));
    
    // Step 2: Create Storage client
    console.log("\n2. Creating Storage client...");
    const storage = new Storage({
      projectId,
      credentials,
    });
    console.log("   ✓ Storage client created");
    
    // Step 3: Check bucket exists
    console.log("\n3. Checking bucket:", ENV.gcsBucket);
    const bucket = storage.bucket(ENV.gcsBucket);
    const [exists] = await bucket.exists();
    console.log("   ✓ Bucket exists:", exists);
    
    if (!exists) {
      throw new Error(`Bucket ${ENV.gcsBucket} does not exist`);
    }
    
    // Step 4: Test signed URL generation
    console.log("\n4. Testing signed URL generation...");
    const testFile = bucket.file(`test-${Date.now()}.txt`);
    const [signedUrl] = await testFile.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: "text/plain",
    });
    console.log("   ✓ Signed URL generated successfully");
    console.log("   ✓ URL length:", signedUrl.length);
    
    console.log("\n=== All tests passed! ===\n");
    return { success: true, message: "GCS connection working" };
    
  } catch (error) {
    console.error("\n=== Test failed ===");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    console.error("========================\n");
    return { 
      success: false, 
      message: error instanceof Error ? error.message : String(error),
      error 
    };
  }
}
