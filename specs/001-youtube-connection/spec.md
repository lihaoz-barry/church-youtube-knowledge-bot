# Feature Specification: YouTube Channel Connection & Video Processing

**Feature Branch**: `001-youtube-connection`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "YouTube Channel Connection & Video Processing - As a church administrator, I need to connect our YouTube channel so the system automatically fetches all videos and generates a searchable knowledge base, enabling congregation members to query theological content via Telegram."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect YouTube Channel (Priority: P1)

As a church administrator, I need to authorize the system to access our YouTube channel so that video metadata can be fetched and displayed in the dashboard.

**Why this priority**: Without YouTube authorization, no videos can be fetched or processed. This is the foundational step that enables all other functionality.

**Independent Test**: Can be fully tested by clicking "Connect YouTube", completing OAuth flow, and verifying that the dashboard shows "Connected as [Channel Name]" with the channel thumbnail. Delivers immediate value by showing connection status.

**Acceptance Scenarios**:

1. **Given** an unauthenticated church administrator on the dashboard, **When** they click "Connect YouTube" button, **Then** they are redirected to Google OAuth consent screen requesting youtube.readonly and youtube.force-ssl scopes
2. **Given** user approves OAuth consent, **When** they are redirected back to the application, **Then** the dashboard displays "Connected as [Channel Name]" with the channel thumbnail
3. **Given** a connected YouTube channel, **When** the administrator views the dashboard, **Then** connection status shows as active with channel information
4. **Given** OAuth tokens are stored, **When** tokens expire, **Then** the system displays "Connection expired - Reconnect" with a reconnect button

---

### User Story 2 - View Video Library (Priority: P2)

As a church administrator, I need to see all videos from our YouTube channel in a list so that I can understand what content is available and its processing status.

**Why this priority**: Administrators need visibility into what videos exist before they can process them. This provides transparency and control over the knowledge base content.

**Independent Test**: After YouTube is connected, the video list automatically appears showing thumbnails, titles, durations, and status badges. Can verify by checking that videos match the YouTube channel and status indicators are accurate.

**Acceptance Scenarios**:

1. **Given** a connected YouTube channel, **When** the video sync completes, **Then** the dashboard displays a list with each video showing: thumbnail (clickable to YouTube), title, duration, and processing status badge (Pending/Processing/Completed/Failed)
2. **Given** a video list with 50+ videos, **When** the administrator scrolls through the list, **Then** videos load smoothly without performance degradation
3. **Given** videos with different processing statuses, **When** viewing the list, **Then** each status badge is clearly distinguishable with appropriate colors (e.g., Pending=gray, Processing=blue, Completed=green, Failed=red)
4. **Given** a video thumbnail, **When** clicked, **Then** the video opens in YouTube in a new tab at the exact video URL
5. **Given** videos are added to the YouTube channel, **When** the administrator triggers manual sync or waits for automatic sync (runs daily at midnight), **Then** new videos appear in the list with "Pending" status

---

### User Story 3 - Process Single Video Transcript (Priority: P3)

As a church administrator, I need to generate a transcript for a specific video so that its content becomes searchable by congregation members.

**Why this priority**: Processing individual videos allows administrators to start building the knowledge base incrementally without waiting for all videos to process. Enables testing and validation of transcript quality early.

**Independent Test**: Select a single pending video, click "Process", and verify that: (1) status changes to Processing then Completed, (2) transcript becomes viewable in a modal, (3) clicking transcript timestamps jumps to correct YouTube video position.

**Acceptance Scenarios**:

1. **Given** a video with "Pending" status, **When** processing is triggered, **Then** the system checks for existing YouTube captions first
2. **Given** a video with existing YouTube captions, **When** processing completes, **Then** the transcript is extracted from captions, stored, and status updates to "Completed" within 30 seconds
3. **Given** a video without existing captions, **When** audio transcription is triggered, **Then** the system downloads audio, sends to transcription service with language auto-detect, and stores time-stamped segments
4. **Given** a video is being processed, **When** the administrator views the video in the list, **Then** real-time progress is shown (e.g., "Downloading audio...", "Transcribing segment 2/5...", "Generating embeddings...")
5. **Given** a completed transcript, **When** the administrator clicks "View Transcript", **Then** a modal displays time-stamped transcript segments with clickable timestamps that link to the YouTube video at that exact moment
6. **Given** a completed transcript, **When** the administrator clicks "Export", **Then** a downloadable file (SRT format) is generated containing the full transcript
7. **Given** transcription fails, **When** viewing the video status, **Then** error badge shows with specific error message (e.g., "YouTube API quota exceeded - retry in 2 hours") and a "Retry" button

---

### User Story 4 - Enable Semantic Search (Priority: P4)

As a church administrator, I need processed video transcripts to be indexed for semantic search so that congregation members can query theological content via Telegram.

**Why this priority**: Semantic search is the end goal that delivers value to congregation members. However, it depends on transcripts being generated first and requires embeddings to be created.

**Independent Test**: After transcript processing completes with embeddings, a Telegram query like "What did the pastor say about justification by faith?" returns relevant sermon segments with timestamps. Verifies the entire Connect → Process → Query pipeline.

**Acceptance Scenarios**:

1. **Given** a video with completed transcript, **When** embedding generation is triggered, **Then** each transcript segment is converted to a vector embedding and stored with the segment
2. **Given** embeddings are being generated, **When** the administrator views the video, **Then** status shows "Indexing..." with progress indicator
3. **Given** embeddings are completed, **When** status updates to "Indexed", **Then** the video content is available for semantic search queries
4. **Given** embedding generation fails, **When** viewing status, **Then** error details are shown with retry option

---

### User Story 5 - Upload Generated Captions (Priority: P5)

As a church administrator, I want the option to upload generated transcripts back to YouTube as captions so that videos have accessible captions for all viewers.

**Why this priority**: This is a value-add feature that benefits the broader YouTube audience, not just knowledge base users. Lower priority because transcripts are already usable for search without uploading to YouTube.

**Independent Test**: After generating a transcript for a video without captions, a prompt appears asking "Upload generated captions?". Clicking "Yes" uploads the transcript to YouTube and captions become visible on the YouTube video.

**Acceptance Scenarios**:

1. **Given** a transcript has been generated for a video without existing captions, **When** processing completes, **Then** a prompt appears asking "Upload generated captions to YouTube?"
2. **Given** the administrator confirms upload, **When** the upload processes, **Then** the transcript is formatted as SRT and uploaded via YouTube API marked as "auto-generated"
3. **Given** caption upload succeeds, **When** viewing the YouTube video, **Then** captions are available and selectable in the YouTube player
4. **Given** caption upload fails, **When** viewing status, **Then** error is logged but does not block transcript availability for search

---

### Edge Cases

- **Very long videos (>3 hours)**: System splits audio into chunks under the transcription service size limit, processes each chunk separately, and combines results while preserving accurate timestamps
- **Non-speech videos (music only, B-roll)**: Transcription returns empty or minimal text. System marks video as "No speech detected" and excludes from search index
- **Multiple caption languages available**: System prioritizes caption language matching the church's configured language preference (Chinese or English). If no match, defaults to first available caption track
- **YouTube API quota limits**: When quota is exceeded, system displays actionable error message: "YouTube API quota exceeded. Quota resets at [TIME] (in [X] hours). [Learn about quotas →]" with automatic retry after reset
- **Deleted YouTube videos**: System periodically checks video availability. If a video is deleted from YouTube, status updates to "Video unavailable" but existing transcripts and embeddings are retained for historical searches
- **OAuth token expiration**: When tokens expire during operation, system displays "Connection expired - Reconnect YouTube" and pauses processing until reauthorization
- **Concurrent processing requests**: If multiple videos are triggered for processing simultaneously, system queues them and processes one at a time to respect API rate limits
- **Network interruptions during processing**: If processing is interrupted, system saves progress state and resumes from last completed step when triggered again
- **Duplicate videos**: If the same video ID already exists in the database, system skips insertion and updates metadata only (title, thumbnail, duration) if changed
- **Invalid or private videos**: If a video is private or restricted, system displays "Video access restricted" status and does not attempt processing

## Requirements *(mandatory)*

### Functional Requirements

#### YouTube Authorization

- **FR-001**: System MUST provide a "Connect YouTube" button on the dashboard that initiates OAuth 2.0 authorization flow
- **FR-002**: System MUST request these OAuth scopes: `youtube.readonly` (read channel and video list) and `youtube.force-ssl` (upload captions)
- **FR-003**: System MUST store OAuth tokens encrypted in the database on a per-church basis (supporting multi-tenancy)
- **FR-004**: System MUST display connection status showing "Connected as [Channel Name]" with channel thumbnail after successful authorization
- **FR-005**: System MUST handle OAuth token expiration by displaying reconnection prompt and pausing operations until reauthorization

#### Video List Fetching

- **FR-006**: System MUST automatically trigger video synchronization after successful YouTube connection
- **FR-007**: System MUST fetch all videos from the connected channel using YouTube Data API v3
- **FR-008**: System MUST extract and store these video attributes: video ID, title, thumbnail URL, duration, upload date
- **FR-009**: System MUST check if each video already exists in the database by `youtube_video_id` before insertion
- **FR-010**: System MUST insert new videos with initial status of "pending"
- **FR-011**: System MUST update existing video metadata if video already exists
- **FR-012**: System MUST display video list with: clickable thumbnail linking to YouTube, title, duration, processing status badge
- **FR-013**: System MUST automatically synchronize video list every 24 hours (daily at midnight) to discover new videos
- **FR-014**: System MUST provide a manual "Sync Videos" button that administrators can trigger at any time

#### Transcript Extraction

- **FR-015**: System MUST check for existing YouTube caption tracks before attempting audio transcription
- **FR-016**: System MUST download and parse existing caption tracks (SRT or VTT format) when available
- **FR-017**: System MUST store caption content as time-stamped transcript segments linked to the video
- **FR-018**: System MUST update video status to "completed" after successful caption extraction

#### Audio Transcription

- **FR-019**: System MUST download video audio when no captions exist
- **FR-020**: System MUST split audio into chunks that respect transcription service file size limits (25MB)
- **FR-021**: System MUST send audio to transcription service with language auto-detect enabled and request verbose JSON format including timestamps
- **FR-022**: System MUST combine transcription chunks and store as time-stamped segments
- **FR-023**: System MUST generate downloadable SRT file from transcript
- **FR-024**: System MUST mark videos with no detectable speech as "No speech detected"

#### Caption Upload

- **FR-025**: System MUST prompt administrator with "Upload generated captions?" after transcription completes for videos without existing captions
- **FR-026**: System MUST format transcript as SRT file and upload to YouTube via captions API if administrator confirms
- **FR-027**: System MUST mark uploaded captions with "auto-generated" metadata
- **FR-028**: System MUST log caption upload failures without blocking transcript availability for search

#### Embedding Generation

- **FR-029**: System MUST generate vector embeddings for each transcript segment after transcript is stored
- **FR-030**: System MUST use 1536-dimension embedding model for semantic search capability
- **FR-031**: System MUST store embeddings with associated transcript segments
- **FR-032**: System MUST update video status to "indexed" after embeddings are complete

#### Progress Tracking

- **FR-033**: System MUST update video processing status in real-time visible to administrators within 5 seconds
- **FR-034**: System MUST display current processing step (e.g., "Downloading audio...", "Transcribing...", "Indexing...")
- **FR-035**: System MUST store processing job details including: video ID, current step, start time, completion time

#### Error Handling

- **FR-036**: System MUST store error messages in processing jobs table when failures occur
- **FR-037**: System MUST display error badge with specific, actionable error message (e.g., "API quota exceeded - retry in X hours")
- **FR-038**: System MUST provide "Retry" button for failed processing jobs
- **FR-039**: System MUST log errors with context: video ID, API response, timestamp
- **FR-040**: System MUST implement exponential backoff for API rate limiting

#### Security & Multi-Tenancy

- **FR-041**: System MUST encrypt OAuth tokens at rest in the database
- **FR-042**: System MUST never expose YouTube API keys to frontend code
- **FR-043**: System MUST implement rate limiting on webhook endpoints
- **FR-044**: System MUST validate that videos belong to the connected church's channel before processing
- **FR-045**: System MUST enforce row-level security ensuring churches cannot access other churches' data

### Key Entities

- **Church**: Represents a church tenant with isolated data; attributes include church ID, name, YouTube channel ID, OAuth tokens (encrypted), configuration settings (language preference, API quotas)

- **Video**: Represents a YouTube video; attributes include video ID (YouTube's ID), church ID (foreign key), title, thumbnail URL, duration, upload date, processing status (pending/processing/completed/failed/indexed), created date, updated date

- **Transcript Segment**: Represents a time-stamped portion of video transcript; attributes include segment ID, video ID (foreign key), start time, end time, text content, language code, vector embedding (1536 dimensions), segment order

- **Processing Job**: Represents a video processing task; attributes include job ID, video ID (foreign key), job type (fetch/transcript/embedding), status (queued/running/completed/failed), current step, error message, start time, end time, retry count

- **OAuth Token**: Represents YouTube authorization credentials; attributes include token ID, church ID (foreign key), access token (encrypted), refresh token (encrypted), token expiry, scopes granted, created date

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Church administrators can connect their YouTube channel and see confirmation with channel name and thumbnail within 30 seconds of OAuth approval

- **SC-002**: After connection, all videos from the channel appear in the dashboard list within 2 minutes regardless of channel size (tested up to 500 videos)

- **SC-003**: Videos with existing YouTube captions are processed and marked "Completed" within 1 minute per video

- **SC-004**: Videos requiring audio transcription (10-minute video) are fully processed including embeddings within 5 minutes

- **SC-005**: Administrators can click any transcript segment timestamp and YouTube video opens at the exact moment (within 2 seconds accuracy)

- **SC-006**: Manual spot-check of 10 transcripts shows accuracy above 90% for clear speech content

- **SC-007**: Congregation members can find relevant sermon content through semantic search within 3 clicks from Telegram query

- **SC-008**: Processing status updates are visible in the UI within 5 seconds of backend status change

- **SC-009**: Zero data leakage between churches verified through row-level security audit (church A cannot access church B's videos or transcripts)

- **SC-010**: System handles YouTube API quota exhaustion gracefully by showing clear error message with quota reset time and automatic retry

- **SC-011**: Administrators can export any completed transcript as a downloadable file in under 3 seconds

- **SC-012**: When errors occur, 100% of error messages include specific cause and actionable next steps (no generic "Error occurred" messages)

## Assumptions

1. **Transcription Service**: Assuming use of industry-standard transcription API (e.g., OpenAI Whisper or similar) that supports auto-language detection, provides verbose JSON with timestamps, and has 25MB file size limit

2. **Database**: Assuming PostgreSQL database with pgvector extension for storing 1536-dimension embeddings and support for Supabase row-level security policies

3. **Video Sync Frequency**: Administrators can manually trigger sync at any time. System also performs automatic sync every 24 hours (daily at midnight) to discover new videos. This balances content freshness with API quota usage.

4. **Webhook Infrastructure**: Assuming n8n workflow orchestration is already configured with accessible webhook endpoints and authentication mechanism between application and n8n

5. **Language Support**: System supports Chinese and English based on church configuration. Other languages are detected automatically by transcription service but UI remains in Chinese/English

6. **Video Ownership**: Assuming church has legitimate access rights to all videos in their connected channel. System validates channel ownership but does not verify copyright or licensing

7. **Concurrent Users**: Assuming typical church has 1-5 administrators accessing the dashboard simultaneously. System designed for low concurrent admin load but high query volume from congregation members

8. **Storage Limits**: Assuming adequate database storage for transcripts and embeddings. Average 10-minute video generates approximately 3000 words transcript (15KB text) plus 200 segments × 6KB embeddings = 1.2MB per video

9. **Network Reliability**: Assuming reliable network connection for webhook communication between application and n8n. Processing jobs can be retried if network interruptions occur

10. **OAuth Scope Permissions**: Assuming church YouTube channel owner has authority to grant requested OAuth scopes (youtube.readonly and youtube.force-ssl)
