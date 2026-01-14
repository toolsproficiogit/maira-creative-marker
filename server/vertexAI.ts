import { VertexAI } from "@google-cloud/vertexai";
import { getGoogleCloudCredentials } from "./googleCloud";

/**
 * Call Vertex AI Gemini API for video/image analysis using the new SDK
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

  // Initialize Vertex AI with credentials or ADC
  const vertexAI = new VertexAI({
    project: projectId,
    location: "us-central1",
    googleAuthOptions: credentials ? { credentials } : undefined,
  });

  // Get the Gemini 3 Flash model (preview)
  const model = vertexAI.getGenerativeModel({
    model: "gemini-3-flash-preview-001",
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  // Prepare the request with file and prompt
  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: mimeType,
              fileUri: fileUrl,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  // Call generateContent API
  const response = await model.generateContent(request);

  // Extract text from response
  const result = response.response;
  
  if (!result.candidates || result.candidates.length === 0) {
    throw new Error("No candidates returned from Vertex AI");
  }

  const candidate = result.candidates[0];
  
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error("No content parts in Vertex AI response");
  }

  const textPart = candidate.content.parts[0].text;
  
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
