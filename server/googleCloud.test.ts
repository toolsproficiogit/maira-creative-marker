import { describe, expect, it } from "vitest";
import { testGoogleCloudCredentials, getGoogleCloudCredentials } from "./googleCloud";

describe("Google Cloud Credentials", () => {
  it("should have valid Google Cloud credentials configured", async () => {
    const isValid = await testGoogleCloudCredentials();
    expect(isValid).toBe(true);
  });

  it("should parse credentials JSON successfully", () => {
    const { projectId, credentials, dataset } = getGoogleCloudCredentials();
    
    expect(projectId).toBeTruthy();
    expect(dataset).toBeTruthy();
    expect(credentials).toHaveProperty("client_email");
    expect(credentials).toHaveProperty("private_key");
    expect(credentials.client_email).toContain("@");
  });
});
