/**
 * Schema Visualization Utilities
 * 
 * Extract and process x-viz annotations from JSON Schema
 */

import { resolveVisualizationStyle, type VisualizationStyle } from "./visualizationDictionary";

export interface SchemaProperty {
  type: string;
  description?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  "x-viz"?: string | VisualizationStyle;
}

export interface VisualizationMetadata {
  path: string; // JSON path to the field (e.g., "analysis_metadata.brand")
  style: VisualizationStyle;
  description?: string;
}

/**
 * Extract visualization metadata from JSON Schema
 */
export function extractVisualizationMetadata(
  schema: Record<string, any>,
  parentPath: string = ""
): VisualizationMetadata[] {
  const metadata: VisualizationMetadata[] = [];
  
  if (!schema.properties) {
    return metadata;
  }
  
  for (const [key, prop] of Object.entries(schema.properties)) {
    const property = prop as SchemaProperty;
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    
    // Check for x-viz annotation
    if (property["x-viz"]) {
      const style = resolveVisualizationStyle(property["x-viz"]);
      metadata.push({
        path: currentPath,
        style,
        description: property.description,
      });
    }
    
    // Recursively process nested objects
    if (property.type === "object" && property.properties) {
      const nestedMetadata = extractVisualizationMetadata(
        property as any,
        currentPath
      );
      metadata.push(...nestedMetadata);
    }
    
    // Process array items
    if (property.type === "array" && property.items) {
      const items = property.items as SchemaProperty;
      if (items.type === "object" && items.properties) {
        const arrayMetadata = extractVisualizationMetadata(
          items as any,
          `${currentPath}[]`
        );
        metadata.push(...arrayMetadata);
      }
    }
  }
  
  return metadata;
}

/**
 * Get visualization style for a specific field path
 */
export function getFieldVisualization(
  metadata: VisualizationMetadata[],
  fieldPath: string
): VisualizationStyle | null {
  // Exact match
  const exact = metadata.find((m) => m.path === fieldPath);
  if (exact) return exact.style;
  
  // Array item match (e.g., "action_plan[].action_title" matches "action_plan[0].action_title")
  const arrayMatch = metadata.find((m) => {
    const pattern = m.path.replace(/\[\]/g, "\\[\\d+\\]");
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(fieldPath);
  });
  
  return arrayMatch ? arrayMatch.style : null;
}

/**
 * Apply default visualization based on field name patterns
 */
export function inferVisualizationFromFieldName(fieldName: string): VisualizationStyle | null {
  const lowerName = fieldName.toLowerCase();
  
  // Score fields
  if (lowerName.includes("score") || lowerName.includes("rating")) {
    return {
      type: "custom",
      size: "lg",
      weight: "bold",
      color: "text-blue-600",
    };
  }
  
  // Timestamp fields
  if (lowerName.includes("timestamp") || lowerName.includes("time")) {
    return {
      type: "custom",
      size: "sm",
      weight: "medium",
      color: "text-gray-500",
    };
  }
  
  // Title/heading fields
  if (lowerName.includes("title") || lowerName.includes("headline")) {
    return {
      type: "paragraph_headline",
      size: "lg",
      weight: "semibold",
      color: "text-gray-800",
    };
  }
  
  // Description fields
  if (lowerName.includes("description") || lowerName.includes("analysis")) {
    return {
      type: "custom",
      size: "base",
      weight: "normal",
      color: "text-gray-700",
    };
  }
  
  return null;
}
