# GCS Bucket Setup Guide

This application uses Google Cloud Storage (GCS) buckets for:
1. **File uploads** - Storing uploaded videos and images
2. **Prompt management** - Storing prompt configurations as JSON files

## Prerequisites

- Google Cloud Project with billing enabled
- Service account with appropriate permissions
- GCS bucket(s) created

## Step 1: Create GCS Buckets

You can use a single bucket or separate buckets for files and prompts.

### Option A: Single Bucket (Recommended for simplicity)

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export BUCKET_NAME="maira-creative-marker"
export REGION="us-central1"

# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME/

# Set bucket to public read (for file URLs)
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
```

### Option B: Separate Buckets

```bash
# File storage bucket (public read)
export FILES_BUCKET="maira-files"
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$FILES_BUCKET/
gsutil iam ch allUsers:objectViewer gs://$FILES_BUCKET

# Prompt storage bucket (private)
export PROMPTS_BUCKET="maira-prompts"
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$PROMPTS_BUCKET/
```

## Step 2: Configure Service Account Permissions

Your service account needs these permissions:

```bash
# For the service account
export SERVICE_ACCOUNT="your-service-account@your-project.iam.gserviceaccount.com"

# Grant Storage Admin role (or more granular permissions)
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectAdmin gs://$BUCKET_NAME/
```

### Minimum Required Permissions

- `storage.objects.create` - Upload files
- `storage.objects.delete` - Delete files
- `storage.objects.get` - Read files
- `storage.objects.list` - List files

## Step 3: Set Environment Variables

Update your environment variables (already configured in Manus):

```bash
# Google Cloud Project
GOOGLE_CLOUD_PROJECT="your-project-id"

# Service Account Credentials (JSON)
GOOGLE_APPLICATION_CREDENTIALS_JSON="{...}"

# GCS Bucket Name
GCS_BUCKET="maira-creative-marker"

# BigQuery Dataset
BIGQUERY_DATASET="creative_marker"
```

## Step 4: Initialize Default Prompts

The application stores prompts as JSON files in GCS under the `prompts/` folder:

```
gs://your-bucket/
  prompts/
    image_branding_default.json
    image_performance_default.json
    video_branding_default.json
    video_performance_default.json
```

### Initialize via UI (Recommended)

1. Log in as admin
2. Go to Configuration tab
3. Click "Initialize Default Prompts"
4. This will copy hardcoded defaults to GCS

### Manual Initialization

```bash
# Upload default prompt files
gsutil cp prompts/*.json gs://$BUCKET_NAME/prompts/
```

## Bucket Structure

```
gs://your-bucket/
├── prompts/                    # Prompt configurations
│   ├── image_branding_default.json
│   ├── image_performance_default.json
│   ├── video_branding_default.json
│   ├── video_performance_default.json
│   └── custom_prompt_123.json
│
└── files/                      # Uploaded files (organized by session)
    ├── session-1-files/
    │   ├── video1-abc123.mp4
    │   └── image1-def456.jpg
    └── session-2-files/
        └── video2-ghi789.mp4
```

## Prompt File Format

Each prompt is stored as a JSON file with this structure:

```json
{
  "id": "image_branding_default",
  "name": "Image Branding Analysis",
  "description": "Analyzes brand assets, emotional resonance, and message clarity in images",
  "filetype": "image",
  "focus": "branding",
  "systemPrompt": "# SYSTEM DIRECTIVE: SENIOR BRAND STRATEGIST\n\n...",
  "outputSchema": {
    "type": "object",
    "properties": {
      "analysis_metadata": { ... },
      "section_a_assets": { ... }
    }
  },
  "bigqueryTable": "image_branding_analysis",
  "isDefault": true,
  "createdAt": "2026-01-14T10:00:00.000Z",
  "createdBy": "admin@example.com",
  "version": 1
}
```

## Troubleshooting

### Permission Denied Errors

```bash
# Check bucket permissions
gsutil iam get gs://$BUCKET_NAME

# Verify service account has access
gsutil ls -L gs://$BUCKET_NAME
```

### Files Not Accessible

- Ensure bucket has public read access for file URLs to work
- Check CORS configuration if accessing from browser

```bash
# Set CORS policy
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://$BUCKET_NAME
```

### Prompt Not Found

- Check if prompts are in the correct folder: `prompts/`
- Verify file naming: `{promptId}.json`
- Check service account has read permissions

## Security Best Practices

1. **Use separate buckets** for files (public) and prompts (private)
2. **Enable versioning** for prompt bucket to track changes
3. **Set lifecycle policies** to automatically delete old files
4. **Use signed URLs** instead of public access for sensitive files
5. **Audit access logs** regularly

## Cost Optimization

```bash
# Set lifecycle policy to delete old files after 90 days
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME
```

## Monitoring

Set up monitoring for:
- Storage usage
- API request count
- Error rates
- Cost alerts

```bash
# Check bucket size
gsutil du -sh gs://$BUCKET_NAME

# Check object count
gsutil ls -r gs://$BUCKET_NAME | wc -l
```
