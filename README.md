# Maira Creative Marker

AI-powered video and image analysis tool for creative performance evaluation. Built with React, Express, tRPC, Vertex AI Gemini, and BigQuery.

## Features

- **Multi-format Upload**: Support for videos and images up to 1GB
- **Contextual Analysis**: Add brand, audience, category, and message context to each file
- **AI-Powered Insights**: Gemini 2.5/3.0 analysis with configurable system prompts
- **Structured Output**: JSON schema validation with automatic retry mechanism
- **BigQuery Storage**: Versioned tables for analysis results
- **Session Tracking**: Group related files and results together
- **Configurable Framework**: Customize prompts, schemas, and output tables via UI

## Architecture

- **Frontend**: React 19 + Tailwind 4 + Wouter
- **Backend**: Express 4 + tRPC 11
- **AI**: Vertex AI Gemini 2.5 Flash
- **Storage**: Google Cloud Storage (signed URLs)
- **Database**: MySQL/TiDB (via Drizzle ORM)
- **Analytics Storage**: BigQuery

## Prerequisites

- Node.js 22.x
- pnpm 10.4.1+
- Google Cloud Project with:
  - Vertex AI API enabled
  - BigQuery API enabled
  - Cloud Storage API enabled
  - Service account with appropriate permissions

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables (see Environment Variables section)
cp .env.example .env

# Push database schema
pnpm db:push

# Start development server
pnpm dev

# Run tests
pnpm test
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
BIGQUERY_DATASET=your-dataset-name
GCS_BUCKET=your-bucket-name

# Authentication (for Manus OAuth)
JWT_SECRET=your-jwt-secret
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=owner-open-id
OWNER_NAME=owner-name

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=your-analytics-endpoint
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# Manus Built-in APIs (optional)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# App Branding
VITE_APP_TITLE="Maira Creative Marker"
VITE_APP_LOGO=/logo.png
```

## Cloud Run Deployment

### 1. Prerequisites

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project proficio-imagen-veo
```

### 2. Prepare Service Account

```bash
# Create service account (if not exists)
gcloud iam service-accounts create creative-marker \
  --display-name="Creative Marker Service Account"

# Grant required roles
gcloud projects add-iam-policy-binding proficio-imagen-veo \
  --member="serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding proficio-imagen-veo \
  --member="serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding proficio-imagen-veo \
  --member="serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Grant token creator role (required for signed URLs)
gcloud iam service-accounts add-iam-policy-binding \
  creative-marker@proficio-imagen-veo.iam.gserviceaccount.com \
  --member="serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# Add service account to GCS bucket
gsutil iam ch serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com:roles/storage.objectAdmin \
  gs://maira-creative-marker
```

### 3. Create GCS Bucket (if not exists)

```bash
# Create bucket
gsutil mb gs://maira-creative-marker

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://maira-creative-marker
```

### 4. Build and Push Docker Image

```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry repository (first time only)
gcloud artifacts repositories create maira-creative-marker \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Maira Creative Marker container images"

# Build and push image
gcloud builds submit --tag europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest

# Or build locally and push
docker build -t europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest .
docker push europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest
```

### 5. Deploy to Cloud Run

```bash
# Get service account key JSON
gcloud iam service-accounts keys create credentials.json \
  --iam-account=creative-marker@proficio-imagen-veo.iam.gserviceaccount.com

# Deploy with environment variables
gcloud run deploy maira-creative-marker \
  --image europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --service-account creative-marker@proficio-imagen-veo.iam.gserviceaccount.com \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=proficio-imagen-veo" \
  --set-env-vars "BIGQUERY_DATASET=creative_analysis" \
  --set-env-vars "GCS_BUCKET=maira-creative-marker" \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS_JSON=$(cat credentials.json | jq -c .)" \
  --set-env-vars "DATABASE_URL=YOUR_DATABASE_URL" \
  --set-env-vars "JWT_SECRET=YOUR_JWT_SECRET" \
  --set-env-vars "VITE_APP_TITLE=Maira Creative Marker" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10

# Clean up credentials file
rm credentials.json
```

### 6. Set Up Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service maira-creative-marker \
  --domain your-domain.com \
  --region europe-west1

# Follow instructions to add DNS records
```

### 7. View Logs

```bash
# Stream logs
gcloud run services logs tail maira-creative-marker --region europe-west1

# View logs in Cloud Console
# https://console.cloud.google.com/run/detail/europe-west1/maira-creative-marker/logs
```

## Deployment Script

Create a `deploy.sh` file for easier deployment:

```bash
#!/bin/bash

# Configuration
PROJECT_ID="proficio-imagen-veo"
SERVICE_NAME="maira-creative-marker"
REGION="europe-west1"
IMAGE="europe-west1-docker.pkg.dev/$PROJECT_ID/$SERVICE_NAME/app:latest"

# Build and push
echo "Building and pushing Docker image..."
gcloud builds submit --tag $IMAGE

# Deploy
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account creative-marker@$PROJECT_ID.iam.gserviceaccount.com \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300

echo "Deployment complete!"
echo "Service URL: $(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Prompt Management System

### Current Status

**Backend Infrastructure (✅ Complete):**
- GCS-based prompt storage (`gs://your-bucket/prompts/*.json`)
- Prompt metadata schema with version control
- tRPC API endpoints (list, get, create, update, delete)
- React context for session-based caching
- Role-based access control
- Hardcoded default prompts as fallback

**Frontend UI (⏳ Pending):**
- Prompt selector with fetch action
- Prompt editor (edit, update, create new)
- Integration with file upload flow
- Prompt testing and validation

### How It Works

A "prompt" is a triple of:
1. **System Prompt**: Czech instructions for AI with variable substitution (`{brand}`, `{targetAudience}`, etc.)
2. **Output Schema**: JSON structure with English field names for BigQuery
3. **BigQuery Table**: Where results are stored

Each prompt has metadata:
- `id`: Unique identifier (e.g., `video_performance_v2`)
- `name`: Human-readable name
- `description`: What this prompt analyzes
- `filetype`: `image` or `video`
- `focus`: `branding` or `performance`
- `isDefault`: Whether it's a system default (read-only for non-admins)
- `version`: For optimistic locking

### Current Behavior

The application uses 4 hardcoded default Czech prompts:
- `video_performance_default`
- `video_branding_default`
- `image_performance_default`
- `image_branding_default`

These are loaded from local files and used for all analysis. The backend infrastructure is ready for the full prompt management UI to be completed.

### Future: Full Prompt Management

When the UI is complete, users will be able to:
1. **Fetch prompts** from GCS on session start
2. **Edit prompts** in the Configuration tab
3. **Create new versions** (e.g., `video_performance_v2`)
4. **Select prompts per file** during upload
5. **Test prompts** before saving

Admins can update default prompts; regular users can only create custom versions.

## Configuration
### System Prompts

The application includes 4 default Czech system prompts:
- **video-performance**: Hook, Message, Pacing, CTA analysis
- **video-branding**: Linkage, Story, Message, Craft analysis
- **image-branding**: Distinctiveness, Emotion, Message, CEP analysis
- **image-performance**: Attention, Copy, Offer, CTA analysis

Customize prompts in the Configuration tab of the UI.

### Output Schemas

Each analysis type has a corresponding JSON schema with English field names for BigQuery compatibility. Schemas enforce structure and enable automatic retry on validation failure.

### BigQuery Tables

Results are stored in separate tables per analysis type:
- `video_performance_test`
- `video_branding_test`
- `image_performance_test`
- `image_branding_test`

Tables are created automatically on first use.

## Troubleshooting

### Upload Errors

If you encounter "DECODER routines::unsupported" errors:

1. **Check service account permissions**:
   ```bash
   gcloud projects get-iam-policy proficio-imagen-veo \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com"
   ```

2. **Verify token creator role**:
   ```bash
   gcloud iam service-accounts get-iam-policy \
     creative-marker@proficio-imagen-veo.iam.gserviceaccount.com
   ```

3. **Check Cloud Run logs** for detailed error messages

### Vertex AI Errors

- Ensure Vertex AI API is enabled
- Verify service account has `aiplatform.user` role
- Check quota limits in Cloud Console

### BigQuery Errors

- Ensure BigQuery API is enabled
- Verify dataset exists: `bq ls --project_id=proficio-imagen-veo`
- Check service account has `bigquery.dataEditor` role

## Development

### Database Migrations

```bash
# Generate migration
pnpm db:push

# This runs:
# - drizzle-kit generate (creates migration files)
# - drizzle-kit migrate (applies migrations)
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/analysis.test.ts

# Watch mode
pnpm test --watch
```

### Code Quality

```bash
# Type check
pnpm check

# Format code
pnpm format
```

## License

MIT

## Support

For issues or questions, contact the development team or open an issue in the repository.
