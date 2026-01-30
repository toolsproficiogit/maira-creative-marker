import { useMemo } from "react";
import {
  extractVisualizationMetadata,
  getFieldVisualization,
  inferVisualizationFromFieldName,
  type VisualizationMetadata,
} from "../../../shared/schemaVisualization";
import {
  getVisualizationClasses,
  type VisualizationStyle,
} from "../../../shared/visualizationDictionary";

interface ResultsDisplayProps {
  data: Record<string, any>;
  schema: Record<string, any>;
}

export function ResultsDisplay({ data, schema }: ResultsDisplayProps) {
  // Extract visualization metadata from schema
  const vizMetadata = useMemo(() => {
    return extractVisualizationMetadata(schema);
  }, [schema]);

  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, value]) => (
        <FieldRenderer
          key={key}
          fieldName={key}
          fieldPath={key}
          value={value}
          vizMetadata={vizMetadata}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  fieldName: string;
  fieldPath: string;
  value: any;
  vizMetadata: VisualizationMetadata[];
}

function FieldRenderer({ fieldName, fieldPath, value, vizMetadata }: FieldRendererProps) {
  // Get visualization style for this field
  const vizStyle =
    getFieldVisualization(vizMetadata, fieldPath) ||
    inferVisualizationFromFieldName(fieldName);

  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Render based on value type and visualization style
  if (vizStyle?.type === "section_divider") {
    return <SectionDivider style={vizStyle} />;
  }

  if (Array.isArray(value)) {
    return (
      <ArrayRenderer
        fieldName={fieldName}
        fieldPath={fieldPath}
        value={value}
        vizMetadata={vizMetadata}
        vizStyle={vizStyle}
      />
    );
  }

  if (typeof value === "object") {
    return (
      <ObjectRenderer
        fieldName={fieldName}
        fieldPath={fieldPath}
        value={value}
        vizMetadata={vizMetadata}
        vizStyle={vizStyle}
      />
    );
  }

  // Primitive values
  return <PrimitiveRenderer fieldName={fieldName} value={value} vizStyle={vizStyle} />;
}

function PrimitiveRenderer({
  fieldName,
  value,
  vizStyle,
}: {
  fieldName: string;
  value: any;
  vizStyle: VisualizationStyle | null;
}) {
  const className = vizStyle ? getVisualizationClasses(vizStyle) : "text-base text-gray-700";

  // Format field name as label
  const label = fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-600">{label}:</span>
      <span className={className}>{String(value)}</span>
    </div>
  );
}

function ObjectRenderer({
  fieldName,
  fieldPath,
  value,
  vizMetadata,
  vizStyle,
}: {
  fieldName: string;
  fieldPath: string;
  value: Record<string, any>;
  vizMetadata: VisualizationMetadata[];
  vizStyle: VisualizationStyle | null;
}) {
  const label = fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Check if this should be rendered as a table
  const isTable = vizStyle?.type === "table_header" || vizStyle?.type === "table_row";

  if (isTable) {
    return <TableRenderer data={[value]} vizStyle={vizStyle} />;
  }

  // Render as nested structure with headline
  const headlineClass = vizStyle
    ? getVisualizationClasses(vizStyle)
    : "text-lg font-semibold text-gray-800 mb-2";

  return (
    <div className="space-y-3">
      <h3 className={headlineClass}>{label}</h3>
      <div className="ml-4 space-y-2">
        {Object.entries(value).map(([key, val]) => (
          <FieldRenderer
            key={key}
            fieldName={key}
            fieldPath={`${fieldPath}.${key}`}
            value={val}
            vizMetadata={vizMetadata}
          />
        ))}
      </div>
    </div>
  );
}

function ArrayRenderer({
  fieldName,
  fieldPath,
  value,
  vizMetadata,
  vizStyle,
}: {
  fieldName: string;
  fieldPath: string;
  value: any[];
  vizMetadata: VisualizationMetadata[];
  vizStyle: VisualizationStyle | null;
}) {
  const label = fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Check if this is a bullet point list
  const isBulletList = vizStyle?.type === "bullet_point";

  // Check if this should be rendered as a table
  const isTable =
    value.length > 0 &&
    typeof value[0] === "object" &&
    !Array.isArray(value[0]) &&
    (vizStyle?.type === "table_header" || vizStyle?.type === "table_row");

  if (isTable) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
        <TableRenderer data={value} vizStyle={vizStyle} />
      </div>
    );
  }

  if (isBulletList) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
        <BulletListRenderer items={value} vizStyle={vizStyle} />
      </div>
    );
  }

  // Render as numbered list with nested content
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
      <div className="ml-4 space-y-4">
        {value.map((item, index) => (
          <div key={index} className="border-l-2 border-gray-300 pl-4">
            <FieldRenderer
              fieldName={`${fieldName}[${index}]`}
              fieldPath={`${fieldPath}[${index}]`}
              value={item}
              vizMetadata={vizMetadata}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletListRenderer({
  items,
  vizStyle,
}: {
  items: any[];
  vizStyle: VisualizationStyle | null;
}) {
  const bulletStyle = vizStyle?.bulletStyle || "disc";
  const bulletMap = {
    disc: "•",
    circle: "◦",
    square: "▪",
    dash: "–",
    arrow: "→",
    none: "",
  };
  const bullet = bulletMap[bulletStyle];

  const className = vizStyle ? getVisualizationClasses(vizStyle) : "text-base text-gray-700";

  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li key={index} className={`flex gap-2 ${className}`}>
          {bullet && <span className="flex-shrink-0">{bullet}</span>}
          <span>{typeof item === "object" ? JSON.stringify(item) : String(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function TableRenderer({
  data,
  vizStyle,
}: {
  data: Record<string, any>[];
  vizStyle: VisualizationStyle | null;
}) {
  if (data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const tableStyle = vizStyle?.tableStyle || {};

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left text-sm font-bold text-gray-900 border-r border-gray-300 last:border-r-0"
              >
                {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={`bg-white divide-y divide-gray-200 ${
            tableStyle.striped ? "divide-y divide-gray-200" : ""
          }`}
        >
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`${tableStyle.hover ? "hover:bg-gray-50" : ""} ${
                tableStyle.striped && rowIndex % 2 === 1 ? "bg-gray-50" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300 last:border-r-0"
                >
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionDivider({ style }: { style: VisualizationStyle }) {
  const dividerStyleMap = {
    line: "border-solid",
    dashed: "border-dashed",
    dotted: "border-dotted",
    double: "border-double",
    thick: "border-solid border-2",
  };

  const borderClass = dividerStyleMap[style.dividerStyle || "line"];
  const colorClass = style.dividerColor || "border-gray-300";
  const marginClass = getVisualizationClasses(style);

  return <hr className={`${borderClass} ${colorClass} ${marginClass}`} />;
}
