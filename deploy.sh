#!/bin/bash

# Maira Creative Marker - Cloud Run Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

# Configuration
PROJECT_ID="proficio-imagen-veo"
SERVICE_NAME="maira-creative-marker"
REGION="europe-west1"
SERVICE_ACCOUNT="creative-marker@${PROJECT_ID}.iam.gserviceaccount.com"
REPOSITORY="maira-creative-marker"
IMAGE_NAME="app"

# Parse environment argument (default: production)
ENVIRONMENT="${1:-production}"

# Set image tag based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    TAG="staging"
else
    TAG="latest"
fi

IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:$TAG"

echo "========================================="
echo "Maira Creative Marker Deployment"
echo "========================================="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "Image: $IMAGE"
echo "========================================="
echo ""

# Step 1: Build and push Docker image
echo "Step 1: Building and pushing Docker image..."
gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID"

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Deploy to Cloud Run
echo "Step 2: Deploying to Cloud Run..."

# Get service account credentials
echo "Fetching service account credentials..."
CREDENTIALS_JSON=$(gcloud iam service-accounts keys create /dev/stdout \
    --iam-account="$SERVICE_ACCOUNT" \
    --project="$PROJECT_ID" | jq -c .)

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch credentials!"
    exit 1
fi

# Deploy service
gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE" \
    --platform managed \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --allow-unauthenticated \
    --service-account "$SERVICE_ACCOUNT" \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
    --set-env-vars "BIGQUERY_DATASET=creative_analysis" \
    --set-env-vars "GCS_BUCKET=maira-creative-marker" \
    --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS_JSON=$CREDENTIALS_JSON" \
    --set-env-vars "NODE_ENV=production" \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "✅ Deployment successful!"
echo ""

# Step 3: Get service URL
echo "Step 3: Fetching service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format 'value(status.url)')

echo ""
echo "========================================="
echo "🎉 Deployment Complete!"
echo "========================================="
echo "Service URL: $SERVICE_URL"
echo "Environment: $ENVIRONMENT"
echo ""
echo "View logs:"
echo "  gcloud run services logs tail $SERVICE_NAME --region $REGION --project $PROJECT_ID"
echo ""
echo "Cloud Console:"
echo "  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
echo "========================================="
