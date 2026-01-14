# Prompt Storage Bucket Setup

This guide explains how to create and configure a GCS bucket for storing custom analysis prompts.

---

## Overview

The application stores custom prompts in Google Cloud Storage to enable:
- Editing prompts through the Configuration UI
- Version control and backup of custom prompts
- Sharing prompts across deployments

---

## Setup Steps

### 1. Create the Prompt Bucket

```bash
# Create a new bucket for prompt storage
gsutil mb -p proficio-imagen-veo -l europe-west1 gs://maira-creative-marker-prompts

# Grant the service account access
gsutil iam ch serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com:objectAdmin gs://maira-creative-marker-prompts
```

### 2. Apply CORS Configuration

The bucket needs CORS configuration to allow browser-based editing:

```bash
# Use the existing cors.json file
gsutil cors set cors.json gs://maira-creative-marker-prompts

# Verify CORS is applied
gsutil cors get gs://maira-creative-marker-prompts
```

### 3. Update Environment Variable

The application looks for the bucket name in an environment variable. You have two options:

**Option A: Use the same bucket as media files (simplest)**

The code defaults to using `GCS_BUCKET` for both media and prompts. Since you already have `GCS_BUCKET=maira-creative-marker`, you can:

```bash
# Store prompts in a subfolder of the existing bucket
# No environment variable changes needed
```

**Option B: Use a separate bucket (recommended for production)**

Add a new environment variable to your Cloud Run deployment:

```bash
gcloud run services update maira-creative-marker \
  --region europe-west1 \
  --update-env-vars PROMPTS_BUCKET=maira-creative-marker-prompts
```

---

## Bucket Structure

Prompts are stored with this structure:

```
gs://[bucket-name]/
  ├── prompts/
  │   ├── video_branding_prompt_cs.txt
  │   ├── video_performance_prompt_cs.txt
  │   ├── image_branding_prompt_cs.txt
  │   └── image_performance_prompt_cs.txt
  └── schemas/
      ├── video_branding_schema.json
      ├── video_performance_schema.json
      ├── image_branding_schema.json
      └── image_performance_schema.json
```

---

## Initial Prompt Upload

After creating the bucket, upload the default prompts:

```bash
# Navigate to project directory
cd /path/to/maira-creative-marker

# Upload default prompts
gsutil cp *_prompt_cs.txt gs://maira-creative-marker-prompts/prompts/
gsutil cp *_schema.json gs://maira-creative-marker-prompts/schemas/

# Verify upload
gsutil ls gs://maira-creative-marker-prompts/prompts/
gsutil ls gs://maira-creative-marker-prompts/schemas/
```

---

## Testing

1. **Open the Configuration tab** in the deployed application
2. **View existing prompts** - should load from GCS
3. **Edit a prompt** - make a small change and save
4. **Verify the change** - refresh and check if your edit persisted

---

## Troubleshooting

### "Bucket does not exist" error
- Verify bucket name matches environment variable
- Check service account has `objectAdmin` role on the bucket

### "Access denied" error
- Ensure service account has proper IAM permissions
- Check CORS configuration is applied

### Prompts don't load
- Verify prompt files exist in the bucket
- Check file paths match expected structure (`prompts/*.txt`, `schemas/*.json`)

---

## Cost Estimate

- **Storage**: ~$0.02/month for prompt files (~1KB each)
- **Operations**: Negligible (few reads/writes per day)
- **Total**: < $0.10/month

---

## Security Notes

- Bucket is not public - requires service account credentials
- CORS allows browser access only from your domain
- Consider adding lifecycle policies to archive old prompt versions
