import { PredictionServiceClient } from "@google-cloud/aiplatform";
import { google } from "@google-cloud/aiplatform/build/protos/protos";
import { getGoogleCloudCredentials } from "./googleCloud";

type IValue = google.protobuf.IValue;

/**
 * Call Vertex AI Gemini API for video/image analysis
 */
export async function analyzeWithGemini(params: {
  fileUrl: string;
  mimeType: string;
  systemPrompt: string;
  contextFields: Record<string, string>;
}): Promise<string> {
  const { projectId, credentials } = getGoogleCloudCredentials();
  const { fileUrl, mimeType, systemPrompt, contextFields } = params;

  // Replace template variables in system prompt
  let prompt = systemPrompt;
  for (const [key, value] of Object.entries(contextFields)) {
    const placeholder = `{${key}}`;
    prompt = prompt.replaceAll(placeholder, value);
  }

  const client = new PredictionServiceClient({
    credentials,
    projectId,
  });

  const location = "us-central1";
  const model = "gemini-2.0-flash-001";
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;

  // Prepare the request with file and prompt
  const fileData: IValue = {
    structValue: {
      fields: {
        mimeType: { stringValue: mimeType },
        fileUri: { stringValue: fileUrl },
      },
    },
  };

  const textData: IValue = {
    stringValue: prompt,
  };

  const instance: IValue = {
    structValue: {
      fields: {
        contents: {
          listValue: {
            values: [
              {
                structValue: {
                  fields: {
                    role: { stringValue: "user" },
                    parts: {
                      listValue: {
                        values: [fileData, textData],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  };

  const parameters: IValue = {
    structValue: {
      fields: {
        temperature: { numberValue: 0.2 },
        maxOutputTokens: { numberValue: 8192 },
      },
    },
  };

  const request = {
    endpoint,
    instances: [instance],
    parameters,
  };

  const [response] = await client.predict(request);

  if (!response.predictions || response.predictions.length === 0) {
    throw new Error("No predictions returned from Vertex AI");
  }

  const prediction = response.predictions[0];
  const structValue = prediction?.structValue;
  
  if (!structValue?.fields?.candidates?.listValue?.values?.[0]) {
    throw new Error("Invalid response structure from Vertex AI");
  }

  const candidate = structValue.fields.candidates.listValue.values[0];
  const content = candidate?.structValue?.fields?.content?.structValue;
  const parts = content?.fields?.parts?.listValue?.values;

  if (!parts || parts.length === 0) {
    throw new Error("No content parts in Vertex AI response");
  }

  const textPart = parts[0]?.structValue?.fields?.text?.stringValue;
  
  if (!textPart) {
    throw new Error("No text content in Vertex AI response");
  }

  return textPart;
}

/**
 * Analyze with retry logic and JSON schema validation
 */
export async function analyzeWithRetry(params: {
  fileUrl: string;
  mimeType: string;
  systemPrompt: string;
  contextFields: Record<string, string>;
  expectedSchema: Record<string, any>;
  maxRetries?: number;
}): Promise<{ success: boolean; result?: any; error?: string; retryCount: number }> {
  const { expectedSchema, maxRetries = 2, ...analyzeParams } = params;
  let retryCount = 0;
  let lastError = "";

  while (retryCount <= maxRetries) {
    try {
      const response = await analyzeWithGemini(analyzeParams);
      
      // Try to parse as JSON
      let parsed;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                         response.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : response;
        parsed = JSON.parse(jsonText.trim());
      } catch (parseError) {
        lastError = `JSON parse error: ${parseError}`;
        retryCount++;
        
        if (retryCount <= maxRetries) {
          // Retry with guidance
          analyzeParams.systemPrompt += `\n\nPREVIOUS ATTEMPT FAILED: ${lastError}\nPlease ensure your response is valid JSON matching the schema. Previous response was: ${response}`;
          continue;
        }
        break;
      }

      // Validate against expected schema (basic validation)
      const schemaKeys = Object.keys(expectedSchema);
      const missingKeys = schemaKeys.filter(key => !(key in parsed));
      
      if (missingKeys.length > 0) {
        lastError = `Missing required fields: ${missingKeys.join(", ")}`;
        retryCount++;
        
        if (retryCount <= maxRetries) {
          analyzeParams.systemPrompt += `\n\nPREVIOUS ATTEMPT FAILED: ${lastError}\nRequired fields: ${schemaKeys.join(", ")}\nPrevious response: ${JSON.stringify(parsed)}`;
          continue;
        }
        break;
      }

      // Success!
      return {
        success: true,
        result: parsed,
        retryCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      retryCount++;
      
      if (retryCount <= maxRetries) {
        analyzeParams.systemPrompt += `\n\nPREVIOUS ATTEMPT FAILED: ${lastError}\nPlease try again.`;
      }
    }
  }

  return {
    success: false,
    error: lastError,
    retryCount,
  };
}
