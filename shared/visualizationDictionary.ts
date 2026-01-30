/**
 * Visualization Dictionary
 * 
 * Predefined visualization styles for schema annotations.
 * Use these IDs in x-viz fields or define custom styles inline.
 */

export type VisualizationType =
  | "main_headline"
  | "section_headline"
  | "paragraph_headline"
  | "section_divider"
  | "table_header"
  | "table_row"
  | "bullet_point"
  | "custom";

export interface VisualizationStyle {
  type: VisualizationType;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  weight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  color?: string; // Tailwind color class or hex
  italic?: boolean;
  underline?: boolean;
  
  // Bullet point specific
  bulletStyle?: "disc" | "circle" | "square" | "dash" | "arrow" | "none";
  indent?: number; // 0-4
  
  // Table specific
  tableStyle?: {
    striped?: boolean;
    bordered?: boolean;
    hover?: boolean;
    compact?: boolean;
  };
  
  // Section divider specific
  dividerStyle?: "line" | "dashed" | "dotted" | "double" | "thick";
  dividerColor?: string;
  
  // Layout
  marginTop?: "none" | "sm" | "md" | "lg" | "xl";
  marginBottom?: "none" | "sm" | "md" | "lg" | "xl";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

/**
 * Predefined visualization styles dictionary
 */
export const VISUALIZATION_DICTIONARY: Record<string, VisualizationStyle> = {
  // Headlines
  main_headline: {
    type: "main_headline",
    size: "3xl",
    weight: "bold",
    color: "text-gray-900",
    marginTop: "lg",
    marginBottom: "md",
  },
  
  section_headline: {
    type: "section_headline",
    size: "2xl",
    weight: "bold",
    color: "text-gray-800",
    marginTop: "md",
    marginBottom: "sm",
  },
  
  paragraph_headline: {
    type: "paragraph_headline",
    size: "lg",
    weight: "semibold",
    color: "text-gray-700",
    marginTop: "sm",
    marginBottom: "sm",
  },
  
  // Dividers
  section_divider: {
    type: "section_divider",
    dividerStyle: "line",
    dividerColor: "border-gray-300",
    marginTop: "md",
    marginBottom: "md",
  },
  
  // Tables
  table_header: {
    type: "table_header",
    size: "sm",
    weight: "bold",
    color: "text-gray-900",
    tableStyle: {
      bordered: true,
      striped: false,
      hover: false,
      compact: false,
    },
  },
  
  table_row: {
    type: "table_row",
    size: "sm",
    weight: "normal",
    color: "text-gray-700",
    tableStyle: {
      bordered: true,
      striped: true,
      hover: true,
      compact: false,
    },
  },
  
  // Lists
  bullet_point: {
    type: "bullet_point",
    size: "base",
    weight: "normal",
    color: "text-gray-700",
    bulletStyle: "disc",
    indent: 1,
    marginBottom: "sm",
  },
};

/**
 * Resolve visualization style from dictionary ID or custom definition
 */
export function resolveVisualizationStyle(
  vizAnnotation: string | VisualizationStyle
): VisualizationStyle {
  if (typeof vizAnnotation === "string") {
    // Look up in dictionary
    const style = VISUALIZATION_DICTIONARY[vizAnnotation];
    if (!style) {
      console.warn(`Visualization style "${vizAnnotation}" not found in dictionary, using default`);
      return { type: "custom", size: "base", weight: "normal", color: "text-gray-700" };
    }
    return style;
  }
  
  // Custom inline definition
  return vizAnnotation;
}

/**
 * Get Tailwind CSS classes for a visualization style
 */
export function getVisualizationClasses(style: VisualizationStyle): string {
  const classes: string[] = [];
  
  // Size
  if (style.size) {
    const sizeMap = {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
    };
    classes.push(sizeMap[style.size]);
  }
  
  // Weight
  if (style.weight) {
    const weightMap = {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
    };
    classes.push(weightMap[style.weight]);
  }
  
  // Color
  if (style.color) {
    classes.push(style.color);
  }
  
  // Text decoration
  if (style.italic) classes.push("italic");
  if (style.underline) classes.push("underline");
  
  // Margins
  const marginMap = {
    none: "0",
    sm: "2",
    md: "4",
    lg: "6",
    xl: "8",
  };
  if (style.marginTop) classes.push(`mt-${marginMap[style.marginTop]}`);
  if (style.marginBottom) classes.push(`mb-${marginMap[style.marginBottom]}`);
  if (style.padding) classes.push(`p-${marginMap[style.padding]}`);
  
  // Indent for bullet points
  if (style.indent) {
    classes.push(`ml-${style.indent * 4}`);
  }
  
  return classes.join(" ");
}
