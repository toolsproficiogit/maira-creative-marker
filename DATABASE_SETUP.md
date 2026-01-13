# Cloud SQL Database Setup Guide

This guide covers setting up a Cloud SQL MySQL instance for the Maira Creative Marker application.

## Quick Setup (Recommended for Testing)

### 1. Create Cloud SQL Instance

```bash
gcloud sql instances create maira-creative-marker-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04
```

**Note**: Replace `YOUR_SECURE_PASSWORD` with a strong password. Save it securely.

### 2. Create Database

```bash
gcloud sql databases create creative_marker \
  --instance=maira-creative-marker-db
```

### 3. Create Database User

```bash
gcloud sql users create app_user \
  --instance=maira-creative-marker-db \
  --password=YOUR_APP_PASSWORD
```

**Note**: Replace `YOUR_APP_PASSWORD` with a different strong password for the application.

### 4. Enable Cloud SQL Admin API

```bash
gcloud services enable sqladmin.googleapis.com
```

### 5. Grant Service Account Access

```bash
# Add Cloud SQL Client role to the service account
gcloud projects add-iam-policy-binding proficio-imagen-veo \
  --member=serviceAccount:creative-marker@proficio-imagen-veo.iam.gserviceaccount.com \
  --role=roles/cloudsql.client
```

### 6. Get Connection Name

```bash
gcloud sql instances describe maira-creative-marker-db \
  --format='value(connectionName)'
```

This will output something like: `proficio-imagen-veo:europe-west1:maira-creative-marker-db`

### 7. Construct DATABASE_URL

Format:
```
mysql://USERNAME:PASSWORD@/DATABASE?host=/cloudsql/CONNECTION_NAME&ssl={"rejectUnauthorized":true}
```

Example:
```
mysql://app_user:YOUR_APP_PASSWORD@/creative_marker?host=/cloudsql/proficio-imagen-veo:europe-west1:maira-creative-marker-db&ssl={"rejectUnauthorized":true}
```

## Deploy with Database

Update your Cloud Run deployment to include the DATABASE_URL:

```bash
gcloud run deploy maira-creative-marker \
  --image europe-west1-docker.pkg.dev/proficio-imagen-veo/maira-creative-marker/app:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --service-account creative-marker@proficio-imagen-veo.iam.gserviceaccount.com \
  --add-cloudsql-instances proficio-imagen-veo:europe-west1:maira-creative-marker-db \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=proficio-imagen-veo,BIGQUERY_DATASET=creative_analysis,GCS_BUCKET=maira-creative-marker,DATABASE_URL=mysql://app_user:YOUR_APP_PASSWORD@/creative_marker?host=/cloudsql/proficio-imagen-veo:europe-west1:maira-creative-marker-db" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

**Important**: 
- Replace `YOUR_APP_PASSWORD` with your actual app password
- Add the `--add-cloudsql-instances` flag to enable Cloud SQL connection
- The `DATABASE_URL` uses Unix socket connection via `/cloudsql/`

## Verify Database Connection

After deployment, check the logs:

```bash
gcloud run services logs tail maira-creative-marker --region europe-west1
```

Look for messages like:
- `[Database] Connected successfully`
- `[Database] Running migrations...`

## Database Schema

The application uses Drizzle ORM and will automatically create tables on first connection:

- `users` - User accounts (for future OAuth integration)
- `sessions` - Analysis sessions
- `files` - Uploaded files metadata
- `analysis_results` - Analysis results (also stored in BigQuery)

## Troubleshooting

### Connection timeout
- **Cause**: Cloud SQL instance not added to Cloud Run
- **Fix**: Add `--add-cloudsql-instances` flag to deployment

### Authentication failed
- **Cause**: Wrong password in DATABASE_URL
- **Fix**: Verify password matches what you set in step 3

### Permission denied
- **Cause**: Service account lacks Cloud SQL Client role
- **Fix**: Run step 5 again

### SSL/TLS errors
- **Cause**: SSL configuration mismatch
- **Fix**: Use Unix socket connection (default in DATABASE_URL format above)

## Production Recommendations

For production use, consider:

1. **Higher tier**: Upgrade from `db-f1-micro` to `db-n1-standard-1` or higher
2. **High availability**: Add `--availability-type=REGIONAL` for automatic failover
3. **Backups**: Automated backups are enabled by default (retained for 7 days)
4. **Monitoring**: Set up Cloud Monitoring alerts for:
   - CPU usage > 80%
   - Storage usage > 80%
   - Connection count > 80% of max
5. **Connection pooling**: The app uses Drizzle ORM with built-in connection management
6. **Secrets**: Store DATABASE_URL in Secret Manager instead of environment variable

## Cost Estimation

**db-f1-micro** (testing):
- ~$7-10/month for the instance
- ~$0.17/GB/month for storage (10GB = ~$1.70/month)
- Total: ~$8-12/month

**db-n1-standard-1** (production):
- ~$50-60/month for the instance
- Storage costs same as above
- Total: ~$52-62/month

## Connecting from Local Development

For local development, use Cloud SQL Proxy:

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Run proxy
./cloud-sql-proxy proficio-imagen-veo:europe-west1:maira-creative-marker-db

# In another terminal, set DATABASE_URL
export DATABASE_URL="mysql://app_user:YOUR_APP_PASSWORD@127.0.0.1:3306/creative_marker"

# Run your app
pnpm dev
```

## Deleting the Database (if needed)

```bash
gcloud sql instances delete maira-creative-marker-db
```

**Warning**: This permanently deletes all data. Make sure you have backups if needed.
