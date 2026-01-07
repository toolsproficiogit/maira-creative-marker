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
