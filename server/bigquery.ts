import { BigQuery } from "@google-cloud/bigquery";
import { getGoogleCloudCredentials } from "./googleCloud";

let bigqueryClient: BigQuery | null = null;

/**
 * Get or create BigQuery client
 */
function getBigQueryClient(): BigQuery {
  if (!bigqueryClient) {
    const { projectId, credentials } = getGoogleCloudCredentials();
    
    // If credentials are provided, use them; otherwise use ADC
    if (credentials) {
      bigqueryClient = new BigQuery({
        projectId,
        credentials,
      });
    } else {
      // Use Application Default Credentials (ADC)
      bigqueryClient = new BigQuery({ projectId });
    }
  }
  return bigqueryClient;
}

/**
 * Create BigQuery table if it doesn't exist
 */
export async function ensureTableExists(
  tableName: string,
  schema: Record<string, any>
): Promise<void> {
  const { dataset: datasetId } = getGoogleCloudCredentials();
  const client = getBigQueryClient();
  const dataset = client.dataset(datasetId);
  const table = dataset.table(tableName);

  const [exists] = await table.exists();
  
  if (!exists) {
    // Convert JSON schema to BigQuery schema
    const fields = Object.entries(schema).map(([name, type]) => {
      let bqType = "STRING";
      
      if (typeof type === "object" && type.type) {
        switch (type.type) {
          case "string":
            bqType = "STRING";
            break;
          case "number":
          case "integer":
            bqType = type.type === "integer" ? "INTEGER" : "FLOAT";
            break;
          case "boolean":
            bqType = "BOOLEAN";
            break;
          case "array":
            bqType = "STRING"; // Store arrays as JSON strings
            break;
          case "object":
            bqType = "STRING"; // Store objects as JSON strings
            break;
        }
      } else if (typeof type === "string") {
        bqType = type.toUpperCase();
      }

      return {
        name,
        type: bqType,
        mode: "NULLABLE",
      };
    });

    // Add metadata fields
    fields.push(
      { name: "session_id", type: "INTEGER", mode: "REQUIRED" },
      { name: "file_id", type: "INTEGER", mode: "REQUIRED" },
      { name: "filename", type: "STRING", mode: "REQUIRED" },
      { name: "brand", type: "STRING", mode: "NULLABLE" },
      { name: "target_audience", type: "STRING", mode: "NULLABLE" },
      { name: "category", type: "STRING", mode: "NULLABLE" },
      { name: "primary_message", type: "STRING", mode: "NULLABLE" },
      { name: "secondary_message_1", type: "STRING", mode: "NULLABLE" },
      { name: "secondary_message_2", type: "STRING", mode: "NULLABLE" },
      { name: "version", type: "STRING", mode: "NULLABLE" },
      { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" }
    );

    await table.create({
      schema: { fields },
    });

    console.log(`[BigQuery] Created table: ${datasetId}.${tableName}`);
  }
}

/**
 * Insert analysis results into BigQuery
 */
export async function insertAnalysisResult(params: {
  tableName: string;
  sessionId: number;
  fileId: number;
  filename: string;
  contextFields: {
    brand: string;
    targetAudience: string;
    category: string;
    primaryMessage: string;
    secondaryMessage1: string;
    secondaryMessage2: string;
    version?: string;
  };
  analysisData: Record<string, any>;
}): Promise<void> {
  const { dataset: datasetId } = getGoogleCloudCredentials();
  const client = getBigQueryClient();
  const { tableName, sessionId, fileId, filename, contextFields, analysisData } = params;

  // Flatten nested objects and arrays to JSON strings
  const flattenedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(analysisData)) {
    if (typeof value === "object" && value !== null) {
      flattenedData[key] = JSON.stringify(value);
    } else {
      flattenedData[key] = value;
    }
  }

  const row = {
    ...flattenedData,
    session_id: sessionId,
    file_id: fileId,
    filename,
    brand: contextFields.brand,
    target_audience: contextFields.targetAudience,
    category: contextFields.category,
    primary_message: contextFields.primaryMessage,
    secondary_message_1: contextFields.secondaryMessage1,
    secondary_message_2: contextFields.secondaryMessage2,
    version: contextFields.version || null,
    created_at: new Date().toISOString(),
  };

  await client.dataset(datasetId).table(tableName).insert([row]);
  
  console.log(`[BigQuery] Inserted row into ${datasetId}.${tableName}`);
}

/**
 * Query analysis results by session ID
 */
export async function getAnalysisResultsBySession(
  tableName: string,
  sessionId: number
): Promise<any[]> {
  const { dataset: datasetId } = getGoogleCloudCredentials();
  const client = getBigQueryClient();

  const query = `
    SELECT *
    FROM \`${datasetId}.${tableName}\`
    WHERE session_id = @sessionId
    ORDER BY created_at ASC
  `;

  const options = {
    query,
    params: { sessionId },
  };

  const [rows] = await client.query(options);
  return rows;
}
