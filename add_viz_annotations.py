#!/usr/bin/env python3
"""
Add x-viz annotations to schema JSON files
"""
import json
import sys

def add_viz_annotations(schema_obj):
    """Recursively add x-viz annotations to schema properties"""
    if not isinstance(schema_obj, dict):
        return
    
    properties = schema_obj.get("properties", {})
    
    for key, prop in properties.items():
        # Add x-viz based on field name patterns
        if "_score" in key or "_rating" in key:
            prop["x-viz"] = {
                "type": "custom",
                "size": "lg",
                "weight": "bold",
                "color": "text-blue-600"
            }
        elif "_timestamp" in key or "_time" in key:
            prop["x-viz"] = {
                "type": "custom",
                "size": "sm",
                "weight": "medium",
                "color": "text-gray-500"
            }
        elif key.startswith("section_"):
            # Section objects get section headline
            prop["x-viz"] = "section_headline"
        elif "_title" in key or "_headline" in key:
            prop["x-viz"] = "paragraph_headline"
        elif "_analysis" in key or "_description" in key or "_verdict" in key:
            prop["x-viz"] = {
                "type": "custom",
                "size": "base",
                "weight": "normal",
                "color": "text-gray-700"
            }
        elif key == "action_plan":
            # Action plan array should use bullet points
            if prop.get("type") == "array":
                items = prop.get("items", {})
                if items.get("type") == "object":
                    # Mark array items for special rendering
                    items["x-viz"] = "bullet_point"
        
        # Recursively process nested objects
        if prop.get("type") == "object":
            add_viz_annotations(prop)
        elif prop.get("type") == "array":
            items = prop.get("items", {})
            if isinstance(items, dict) and items.get("type") == "object":
                add_viz_annotations(items)

def process_schema_file(filepath):
    """Load schema file, add annotations, and save"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # The schema is nested under "schema" key
    if "schema" in data:
        add_viz_annotations(data["schema"])
    else:
        add_viz_annotations(data)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Added x-viz annotations to {filepath}")

if __name__ == "__main__":
    schemas = [
        "/home/ubuntu/video-analysis-tool/video_branding_schema_default.json",
        "/home/ubuntu/video-analysis-tool/video_performance_schema_default.json",
        "/home/ubuntu/video-analysis-tool/image_branding_schema_default.json",
        "/home/ubuntu/video-analysis-tool/image_performance_schema_default.json",
    ]
    
    for schema_file in schemas:
        try:
            process_schema_file(schema_file)
        except Exception as e:
            print(f"✗ Error processing {schema_file}: {e}", file=sys.stderr)
