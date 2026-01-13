# Cloud Run Deployment Guide

This guide covers deploying the Maira Creative Marker application to Google Cloud Run.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and configured
- Docker installed
- Access to the GCP project: `proficio-imagen-veo`
- Service account: `creative-marker@proficio-imagen-veo.iam.gserviceaccount.com`

## Step 1: Configure GCS Bucket CORS

The application uses signed URLs for direct browser-to-GCS uploads. You must configure CORS on the bucket to allow browser uploads.

```bash
# Apply CORS configuration to the bucket
gsutil cors set cors.json gs://maira-creative-marker
```

To verify the CORS configuration:
```bash
gsutil cors get gs://maira-creative-marker
```

## Step 2: Build and Push Docker Image

```bash
# Build for linux/amd64 platform
docker build --no-cache --platform linux/amd64 \
  -t europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest .

# Push to Artifact Registry
docker push europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest
```

## Step 3: Deploy to Cloud Run

```bash
gcloud run deploy maira-creative-marker \
  --image europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --service-account creative-marker@proficio-imagen-veo.iam.gserviceaccount.com \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=proficio-imagen-veo,BIGQUERY_DATASET=creative_analysis,GCS_BUCKET=maira-creative-marker" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

## Step 4: Verify Deployment

Get the service URL:
```bash
gcloud run services describe maira-creative-marker \
  --region europe-west1 \
  --format 'value(status.url)'
```

Test the application:
1. Open the URL in your browser
2. Upload a test video or image
3. Fill in context fields (Brand, Target Audience, etc.)
4. Run analysis
5. Check BigQuery for results: `proficio-imagen-veo.creative_analysis.*_test`

## Troubleshooting

### Upload fails with "Failed to fetch"
- **Cause**: CORS not configured on GCS bucket
- **Fix**: Run `gsutil cors set cors.json gs://maira-creative-marker`

### "Missing session cookie" in logs
- **Impact**: Informational only, does not affect functionality
- **Reason**: App runs in standalone mode without Manus OAuth

### Analysis fails
- **Check**: Service account has required permissions:
  - `storage.objects.create` on GCS bucket
  - `bigquery.tables.create` and `bigquery.tables.updateData` on dataset
  - `aiplatform.endpoints.predict` for Vertex AI

### View logs
```bash
gcloud run services logs tail maira-creative-marker --region europe-west1
```

## Environment Variables

Required:
- `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `BIGQUERY_DATASET`: BigQuery dataset name
- `GCS_BUCKET`: GCS bucket name for file storage

Optional (automatically provided by service account):
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Service account credentials (uses ADC if not provided)

## Service Account Permissions

The `creative-marker@proficio-imagen-veo.iam.gserviceaccount.com` service account needs:

1. **Cloud Storage**:
   - Storage Object Creator
   - Storage Object Viewer

2. **BigQuery**:
   - BigQuery Data Editor
   - BigQuery Job User

3. **Vertex AI**:
   - Vertex AI User

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and redeploy
docker build --no-cache --platform linux/amd64 \
  -t europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest .
docker push europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest

# Cloud Run will automatically use the new image on next request
# Or force immediate update:
gcloud run services update maira-creative-marker --region europe-west1
```

## Cost Optimization

- Cloud Run charges only for actual request time
- Consider setting `--min-instances 0` (default) to scale to zero when idle
- For high traffic, set `--min-instances 1` to avoid cold starts
- Monitor costs in GCP Console → Billing

## Security Notes

- Currently deployed with `--allow-unauthenticated` for testing
- For production, remove this flag and use:
  - Cloud Run IAM to restrict access to specific Google accounts
  - Or implement custom authentication in the application
  - Or use Cloud Identity-Aware Proxy (IAP)
