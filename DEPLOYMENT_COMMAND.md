# Cloud Run Deployment Command

## Full Deployment Command

```bash
gcloud run deploy maira-creative-marker \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account creative-marker@proficio-imagen-veo.iam.gserviceaccount.com \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "DATABASE_URL=mysql://maira_user:YOUR_PASSWORD@/maira_creative_marker?host=/cloudsql/proficio-imagen-veo:europe-west1:maira-db&ssl={\"rejectUnauthorized\":true}" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=proficio-imagen-veo" \
  --set-env-vars "GCS_BUCKET_NAME=maira-creative-marker" \
  --set-env-vars "BIGQUERY_DATASET=creative_analysis" \
  --set-env-vars "GEMINI_MODEL=gemini-2.5-flash-002" \
  --add-cloudsql-instances proficio-imagen-veo:europe-west1:maira-db
```

## Environment Variables Explained

### Required Variables
- `DATABASE_URL`: MySQL connection string with Cloud SQL Unix socket path and SSL config
- `GOOGLE_CLOUD_PROJECT`: GCP project ID (proficio-imagen-veo)
- `GCS_BUCKET_NAME`: Cloud Storage bucket for file uploads (maira-creative-marker)
- `BIGQUERY_DATASET`: BigQuery dataset for analysis results (creative_analysis)

### Configurable Variables
- `GEMINI_MODEL`: Gemini model to use for analysis (default: gemini-2.5-flash-002)
  - Available options:
    - `gemini-2.5-flash-002` (default, stable, fast, cost-effective)
    - `gemini-2.5-pro-002` (more capable, slower, higher cost)
    - `gemini-2.0-flash-001` (older stable version)
    - Any other Vertex AI Gemini model available in us-central1

### Optional Variables
- `PROMPT_BUCKET_NAME`: Separate GCS bucket for prompt storage (if different from GCS_BUCKET_NAME)
  - If not set, uses GCS_BUCKET_NAME with /prompts/ prefix
  - See PROMPT_BUCKET_SETUP.md for setup instructions

## Testing Different Models

To test with a different Gemini model, simply change the GEMINI_MODEL value:

```bash
# Test with Gemini Pro (more capable, higher cost)
--set-env-vars "GEMINI_MODEL=gemini-2.5-pro-002"

# Test with older Flash version
--set-env-vars "GEMINI_MODEL=gemini-2.0-flash-001"
```

The model change will be logged in Cloud Run logs:
```
[Vertex AI] Using model: gemini-2.5-flash-002
```

## Prerequisites

Before deploying, ensure:
1. ✅ Cloud SQL instance created (see DATABASE_SETUP.md)
2. ✅ GCS bucket created with CORS configured (see DEPLOYMENT.md)
3. ✅ Service account has required permissions
4. ✅ BigQuery dataset created
5. ✅ (Optional) Prompt storage bucket configured (see PROMPT_BUCKET_SETUP.md)

## Post-Deployment

After deployment:
1. Check logs: `gcloud run services logs read maira-creative-marker --region europe-west1`
2. Verify model: Look for `[Vertex AI] Using model: ...` in logs
3. Test upload and analysis functionality
4. Monitor BigQuery for analysis results

## Cost Optimization

Model selection impacts cost significantly:
- **gemini-2.5-flash-002**: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
- **gemini-2.5-pro-002**: ~$1.25 per 1M input tokens, ~$5.00 per 1M output tokens

For video analysis with large files, Flash models are recommended for cost-effectiveness.
