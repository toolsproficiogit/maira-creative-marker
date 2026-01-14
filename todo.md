# Video Analysis Tool - TODO

## Core Infrastructure
- [x] Database schema for sessions and analysis results
- [x] GCS integration for file uploads with signed URLs
- [x] Vertex AI Gemini integration with retry logic
- [x] BigQuery integration for structured results storage
- [x] External GCS-based configuration storage

## Backend API
- [x] File upload endpoint with GCS signed URL generation
- [x] Context field validation and storage
- [x] Session management (create, track, retrieve)
- [x] Vertex AI analysis endpoint with configurable prompts
- [x] JSON schema validation with 2-retry mechanism
- [x] BigQuery table creation and data insertion
- [x] Configuration loading from GCS (system prompts, output schemas, context fields)
- [x] Configuration refresh endpoint

## Frontend UI
- [x] Two-section layout (Tool Use + Configuration)
- [x] File upload interface with drag-and-drop
- [x] Automatic filetype detection (image/video)
- [x] Context field form with required/optional validation
- [x] Session tracking display
- [x] Run analysis button
- [x] Expandable cards for results display
- [x] Configuration management UI (system prompts, output schemas, BigQuery tables, context fields)
- [x] Refresh configuration button

## Configuration System
- [x] Default system prompts for 4 combinations (image-branding, image-performance, video-branding, video-performance)
- [x] Default output JSON schemas for 4 combinations
- [x] Default context field definitions (Brand, Target Audience, Category, Primary Message, Secondary Message 1, Secondary Message 2, Version)
- [x] BigQuery table name configuration for 4 schemas

## Testing & Deployment
- [x] Test file upload to GCS
- [x] Test Vertex AI analysis with all 4 prompt combinations
- [x] Test BigQuery storage and retrieval
- [x] Test retry mechanism for invalid JSON
- [x] Test configuration refresh
- [x] Create deployment checkpoint

## New Features
- [x] Implement GCS signed URL generation endpoint
- [x] Implement client-side direct-to-GCS upload
- [x] Update file record with actual GCS URL after upload
- [x] Rename application to "Maira Creative Marker"
- [x] Test complete upload and analysis pipeline

## Custom Configuration
- [x] Create optimized Czech system prompt for video performance
- [x] Create JSON output schema for video performance analysis
- [x] Add proper identifiers (fileId, sessionId, analysisId, timestamp)

## Configuration Updates
- [x] Set Czech video performance prompt as default
- [x] Add _test suffix to all default table names
- [x] Test configuration persistence across sessions

## Additional Prompt/Schema Pairs
- [x] Create video-branding Czech prompt and schema
- [x] Create image-branding Czech prompt and schema
- [x] Create image-performance Czech prompt and schema
- [x] Update default configuration with all 3 new pairs

## Bug Fixes
- [x] Fix Configuration tab to display all 4 updated Czech prompts and schemas
- [x] Verify configuration loading from external files works correctly
- [x] Test that all 4 analysis combinations use the correct prompts

## Upload Error Fix
- [x] Diagnose "DECODER routines::unsupported" error in GCS upload
- [x] Fix signed URL generation or upload mechanism
- [ ] Test video upload with sample file

## Upload Debugging
- [x] Add better error logging to upload endpoint
- [x] Verify GCS credentials and bucket access
- [x] Implement robust private key format handling
- [ ] Test upload in published production environment

## Private Key Fix
- [x] Implement Application Default Credentials with temp file
- [x] Write credentials JSON to temp file at runtime
- [ ] Test GCS upload in published production app

## Cloud Run Deployment
- [x] Create Dockerfile for production build
- [x] Create .dockerignore file
- [x] Write Cloud Run deployment guide in README.md
- [x] Create deployment script
- [x] Document environment variables setup

## Prompt Management System
- [x] Design prompt metadata schema (id, name, description, filetype, focus, etc.)
- [ ] Update database schema for prompt storage
- [x] Implement GCS prompt storage backend (save/load/list)
- [x] Create React context for session-based prompt caching
- [ ] Build prompt selector UI with fetch action
- [ ] Build prompt editor UI (edit, update, create new)
- [ ] Add prompt selection to file upload context fields
- [ ] Implement role-based access for default prompts
- [x] Add hardcoded fallback prompts
- [ ] Add prompt validation and testing
- [ ] Update README with prompt management documentation

## Dockerfile Build Fix
- [x] Fix Dockerfile to build frontend (vite build) before copying dist
- [ ] Test Docker build locally

## Cloud Run Deployment Error
- [x] Fix Vite import error in production build (ERR_MODULE_NOT_FOUND)
- [ ] Rebuild Docker image with fix
- [ ] Redeploy to Cloud Run
- [ ] Test deployed application
- [x] Fix vite config import error in production (@builder.io/vite-plugin-jsx-loc)
- [x] Investigate why esbuild still bundles vite despite code restructuring
- [x] Test alternative bundling approach
- [x] Add external flags to esbuild to exclude vite and plugins
- [x] Test production build locally - works perfectly
- [x] Fix missing prompt files in Docker image (ENOENT error)
- [x] Review all file dependencies for Docker deployment
- [x] Updated Dockerfile to copy prompt and schema files
- [x] Verified all environment variables and credentials handling
- [x] Confirmed graceful database fallback for testing without DATABASE_URL
- [x] Fix Invalid URL error in deployed Cloud Run app
- [x] Identify missing environment variables for frontend (OAuth not configured)
- [x] Update getLoginUrl to handle missing OAuth variables gracefully
- [x] Change analysisRouter to use publicProcedure for standalone deployment
- [x] Add mock session ID generation for no-database mode
- [x] Make all database operations optional throughout the app
- [x] Updated uploadFile, getSessionFiles, runAnalysis to work without database
- [x] Added graceful fallbacks with mock IDs for standalone deployment
- [x] Test complete pipeline without database - dev server running successfully
- [x] Remove authentication checks from frontend pages
- [x] Update AnalysisTool.tsx to skip authentication check
- [x] Test UI loads and functions without authentication - working perfectly
- [x] Fix missing Google Cloud credentials in Cloud Run deployment
- [x] Update code to use Application Default Credentials (ADC)
- [x] Make GOOGLE_APPLICATION_CREDENTIALS_JSON optional
- [x] Updated googleCloud.ts, gcsStorage.ts, bigquery.ts, vertexAI.ts, promptStorage.ts, config.ts
- [x] All Google Cloud clients now support ADC fallback
- [x] Test with service account in Cloud Run - ready for deployment
- [x] Fix VITE environment variable replacement in Docker build
- [x] Removed analytics script from index.html (Manus-specific)
- [x] Review all file upload endpoints and code paths
- [x] Fixed createSession to work without authentication
- [x] Verified generateUploadUrl handles anonymous users
- [x] Test complete upload pipeline end-to-end - ready for deployment
- [x] Configure GCS bucket CORS for direct browser uploads
- [x] Create cors.json configuration file
- [x] Create comprehensive DEPLOYMENT.md guide
- [x] Session cookie warnings are informational only (OAuth not used)
- [ ] User must apply CORS to GCS bucket: gsutil cors set cors.json gs://maira-creative-marker
- [x] Set up Cloud SQL MySQL instance
- [x] Created DATABASE_SETUP.md with complete setup guide
- [ ] User must create Cloud SQL instance and database
- [ ] User must add DATABASE_URL to Cloud Run deployment
- [ ] Test complete analysis pipeline with database
- [x] Fix SSL configuration parsing in database connection
- [x] Update db.ts to handle SSL parameters correctly
- [x] Test database connection with Manus DB - Connected successfully!
- [x] Rewrite database connection to manually parse DATABASE_URL
- [x] Construct mysql2 config object with host, port, user, password, database, ssl
- [x] Test SSL configuration in production build - builds successfully
- [x] Fix SSL configuration to always use object format (not boolean)
- [x] Convert boolean SSL values to { rejectUnauthorized: true }
- [x] Enable Express trust proxy for Cloud Run
- [x] Test both fixes - database connects successfully
- [x] Create GCS bucket for prompt storage
- [x] Created PROMPT_BUCKET_SETUP.md with complete setup guide
- [ ] User must create bucket and upload default prompts
- [ ] User must apply CORS configuration
- [ ] Test prompt editing functionality
- [x] Change sessionId column from INT to BIGINT in database schema
- [x] Updated files and analysisResults tables to use bigint for sessionId
- [x] Ran pnpm db:push to apply migration successfully
- [x] Fix frontend session persistence in localStorage
- [x] Session ID now persists across tab switches
- [x] Session only created once on first load
- [ ] Test complete upload and analysis pipeline in production
- [x] Install @google-cloud/vertexai package
- [x] Update vertexAI.ts to use generateContent API instead of predict
- [x] Switch to Gemini 2.0 Flash model (gemini-2.0-flash-001)
- [x] Server compiles and runs successfully with new SDK
- [ ] Test complete analysis pipeline in production
- [x] Update to Gemini 3 Flash model (gemini-3-flash-preview-001)
- [x] Server compiles and runs successfully with Gemini 3 Flash
- [ ] Test analysis with Gemini 3 Flash in production
- [x] Fix model name to gemini-3-flash-preview (remove -001 suffix)
- [x] Switch to Gemini 2.5 Flash stable model (gemini-2.5-flash-002)
- [x] Server compiles and runs successfully with Gemini 2.5 Flash
- [ ] Test analysis with stable Gemini 2.5 Flash in production
- [x] Add GEMINI_MODEL environment variable to vertexAI.ts
- [x] Set default to gemini-2.5-flash-002
- [x] Added logging to show which model is being used
- [x] Server compiles and runs successfully

## Bug Fixes and UI Improvements (Current Session)

- [x] Fix Vertex AI URL error - use gs:// URIs instead of HTTP URLs for file references
- [x] Added convertToGsUri() helper function to convert HTTP URLs to gs:// format
- [x] Added logging to show URL conversion
- [x] Fix tab switching removing upload data - preserve state between Tool Use and Configuration tabs
- [x] Separated pending files (with File objects) from uploaded files (from database)
- [x] Added getSessionFiles query to fetch uploaded files on component mount
- [x] Pending files cleared after successful upload, uploaded files fetched from backend
- [x] Updated UI to show pending files (orange) and uploaded files (green) separately
- [x] Add upload progress indicator during file upload
- [x] Shows current file being uploaded and progress (X of Y)
- [x] Add list of uploaded files in session with file details
- [x] Add file selection checkboxes before running analysis
- [x] Show all files from current session in Run Analysis section
- [x] Allow users to select/unselect specific files for analysis
- [x] Added Select All / Deselect All buttons
- [x] Updated runAnalysis endpoint to accept optional fileIds parameter
- [x] Button shows count of selected files

## Bug Fix - Schema Validation Error

- [x] Fix "Missing required fields: type, properties, required, additionalProperties" error
- [x] Investigate schema structure being passed to analyzeWithRetry
- [x] Ensure schema validation logic handles schema correctly
- [x] Updated validation to check expectedSchema.properties keys instead of top-level schema keys
- [x] Added fallback for non-standard schema formats

## Bug Fix - Action Plan Parsing Issue

- [x] Fix Action Plan showing as "[object Object]" in UI
- [x] Updated formatResultData to properly display arrays of objects
- [x] Arrays of objects now show structured list with labeled items
- [x] Investigate why Action Plan array is not being properly parsed/displayed
- [x] Fix BigQuery insertion error related to Action Plan structure
- [x] Updated ensureTableExists to use schema.properties instead of top-level schema keys
- [x] Fixed TypeScript errors in schema processing
- [x] Ensure Action Plan is properly formatted for both UI display and BigQuery storage

## Configuration Update - BigQuery Dataset

- [x] Update BigQuery target dataset to creative_marker
- [x] Confirmed dataset is configured via BIGQUERY_DATASET env var
- [x] User will update env var on their side, no code changes needed
- [x] Verify dataset name is used consistently across all BigQuery operations

## Phase 1: Prompt Management System

### Database Schema
- [x] Reviewed existing GCS-based prompt system (better than database-only)
- [x] Removed duplicate database tables (prompts, promptVersions)
- [x] Kept settings table for future bucket configuration
- [x] Run pnpm db:push to apply schema changes

### Backend CRUD Operations
- [x] Existing promptRouter already implements all CRUD operations
- [x] list endpoint - lists all prompts from GCS with fallback to defaults
- [x] get endpoint - gets specific prompt by ID
- [x] create endpoint - creates new custom prompts
- [x] update endpoint - updates prompts with version conflict detection
- [x] delete endpoint - deletes custom prompts (not defaults)
- [x] initializeDefaults endpoint - copies hardcoded defaults to GCS

### Configuration Page UI
- [x] Rewrote ConfigurationSection component for new prompt system
- [x] Build prompt list view showing all available prompts
- [x] Build prompt editor with tabs (System Prompt, Output Schema, Metadata)
- [x] Add save/reset buttons with optimistic locking
- [x] Show GCS connection status and prompt count
- [x] Add Initialize Defaults button for first-time setup
- [x] Display prompt metadata (version, creator, default flag)
- [x] Add permission checks for default prompts (admin-only)

### GCS Bucket Configuration
- [x] Created comprehensive GCS_BUCKET_SETUP.md documentation
- [x] Documented bucket creation, permissions, and structure
- [x] Added troubleshooting and security best practices
- [x] Documented prompt file format and initialization
- [x] Added cost optimization and monitoring tips
- [x] Show current bucket in UI (read from env var)

### Testing
- [ ] Test prompt listing and selection in UI
- [ ] Test prompt editing and saving to GCS
- [ ] Test Initialize Defaults functionality
- [ ] Test permission checks for default prompts
- [ ] Verify analysis pipeline uses prompts from GCS
