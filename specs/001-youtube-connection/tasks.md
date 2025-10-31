# Tasks: YouTube Channel Connection & Video Processing

**Input**: Design documents from `specs/001-youtube-connection/`
**Prerequisites**: plan.md, spec.md, research.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Next.js 14 App Router structure
- Paths shown below follow plan.md structure
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Next.js 14 project with TypeScript and App Router in repository root
- [ ] T002 Install core dependencies: next@14, react@18, typescript@5, tailwind css@3
- [ ] T003 [P] Configure TypeScript with strict mode in tsconfig.json
- [ ] T004 [P] Configure Tailwind CSS in tailwind.config.js
- [ ] T005 [P] Setup shadcn/ui with components/ui/ directory structure
- [ ] T006 [P] Create Next.js configuration in next.config.js (enable App Router features)
- [ ] T007 [P] Setup environment variable template in .env.local.example
- [ ] T008 [P] Initialize Supabase client configuration in lib/supabase/client.ts and lib/supabase/server.ts
- [ ] T009 [P] Create project structure directories per plan.md (app/, components/, lib/, n8n-workflows/, supabase/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

⚠️ **CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Create initial database schema migration in supabase/migrations/001_initial_schema.sql (churches, videos, transcripts, processing_jobs, oauth_tokens tables with church_id foreign keys)
- [ ] T011 Create Row Level Security policies migration in supabase/migrations/002_rls_policies.sql (enforce church_id isolation on all tables)
- [ ] T012 Create pgvector extension setup migration in supabase/migrations/003_pgvector_setup.sql (enable extension, add embedding column to transcripts, create IVFFlat index)
- [ ] T013 Create database functions migration in supabase/migrations/004_functions.sql (token refresh function, video sync trigger)
- [ ] T014 [P] Generate TypeScript types from Supabase schema in lib/supabase/types.ts
- [ ] T015 [P] Implement token encryption utility in lib/utils/encryption.ts (AES-256 encrypt/decrypt for OAuth tokens)
- [ ] T016 [P] Implement custom error classes in lib/utils/errors.ts (YouTubeAPIError, TranscriptionError, etc.)
- [ ] T017 [P] Setup React Query provider in components/providers/query-provider.tsx
- [ ] T018 [P] Create root layout in app/layout.tsx (includes providers, fonts, metadata)
- [ ] T019 [P] Create dashboard layout in app/(dashboard)/layout.tsx (sidebar, header)
- [ ] T020 Run Supabase migrations locally to verify schema setup

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Connect YouTube Channel (Priority: P1) 🎯 MVP

**Goal**: Enable church administrators to authorize YouTube channel access via OAuth, store encrypted tokens, and display connection status

**Independent Test**: Click "Connect YouTube", complete OAuth flow, verify dashboard shows "Connected as [Channel Name]" with thumbnail

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create YouTube OAuth helper functions in lib/youtube/oauth.ts (generateAuthUrl, exchangeCodeForTokens, refreshAccessToken)
- [ ] T022 [P] [US1] Create YouTube API wrapper in lib/youtube/api.ts (getChannelInfo, listVideos with googleapis)
- [ ] T023 [US1] Implement POST /api/youtube/connect route in app/api/youtube/connect/route.ts (initiate OAuth flow, generate state parameter, store in database)
- [ ] T024 [US1] Implement GET /api/youtube/callback route in app/api/youtube/callback/route.ts (exchange code for tokens, encrypt and store in database, redirect to dashboard)
- [ ] T025 [P] [US1] Create YouTubeConnectCard component in components/youtube/connect-card.tsx (connection button, status display, channel thumbnail)
- [ ] T026 [US1] Implement main dashboard page in app/(dashboard)/page.tsx (render YouTubeConnectCard, handle connection state)
- [ ] T027 [US1] Add error handling for token expiration (detect 401 responses, trigger refresh, update UI with reconnect button)

**Checkpoint**: At this point, User Story 1 should be fully functional - administrators can connect YouTube and see connection status

---

## Phase 4: User Story 2 - View Video Library (Priority: P2)

**Goal**: Fetch all videos from connected YouTube channel, store in database, and display in dashboard with status badges

**Independent Test**: After YouTube connected, video list automatically appears showing thumbnails, titles, durations, and status badges matching YouTube channel content

### Implementation for User Story 2

- [ ] T028 [US2] Create n8n workflow template in n8n-workflows/youtube-video-sync.json (webhook trigger → YouTube API fetch → loop videos → Supabase upsert)
- [ ] T029 [US2] Implement POST /api/youtube/sync route in app/api/youtube/sync/route.ts (trigger n8n workflow with church_id and OAuth token)
- [ ] T030 [US2] Implement POST /api/webhooks/n8n route in app/api/webhooks/n8n/route.ts (receive video sync results from n8n, update database)
- [ ] T031 [US2] Implement GET /api/videos route in app/api/videos/route.ts (list videos for current church with pagination, filtering by status)
- [ ] T032 [P] [US2] Create VideoListTable component in components/youtube/video-list-table.tsx (table with columns: thumbnail, title, duration, status badge, actions)
- [ ] T033 [P] [US2] Implement status badge styling (Pending=gray, Processing=blue, Completed=green, Failed=red) in VideoListTable component
- [ ] T034 [US2] Create video list page in app/(dashboard)/videos/page.tsx (fetch videos via API, render VideoListTable, handle loading/error states)
- [ ] T035 [US2] Implement automatic video sync trigger after OAuth connection completes (call /api/youtube/sync from callback route)
- [ ] T036 [US2] Add manual "Sync Videos" button to YouTubeConnectCard component with loading indicator
- [ ] T037 [US2] Setup Supabase Realtime subscription for videos table in video list page (live status updates without polling)
- [ ] T038 [US2] Implement daily automatic sync using Vercel Cron (create app/api/cron/daily-sync/route.ts)

**Checkpoint**: At this point, User Stories 1 AND 2 work independently - videos appear in dashboard with real-time status updates

---

## Phase 5: User Story 3 - Process Single Video Transcript (Priority: P3)

**Goal**: Extract transcript from existing captions or generate via Whisper API, store time-stamped segments, display in modal with export capability

**Independent Test**: Select pending video, click "Process", verify status changes to Processing→Completed, transcript viewable in modal, timestamps link to YouTube correctly

### Implementation for User Story 3

- [ ] T039 [P] [US3] Implement caption parser utility in lib/youtube/caption-parser.ts (parse SRT and VTT formats, extract start/end times and text)
- [ ] T040 [P] [US3] Implement Whisper API client in lib/openai/whisper.ts (audio upload, transcription with timestamps, chunking for large files)
- [ ] T041 [P] [US3] Implement audio chunking utility in lib/utils/audio-chunker.ts (split audio into <25MB chunks, calculate offsets for timestamp reconstruction)
- [ ] T042 [US3] Create n8n workflow template in n8n-workflows/video-transcription.json (webhook trigger → check captions → download audio OR parse captions → Whisper transcribe → store segments → callback Vercel)
- [ ] T043 [US3] Implement POST /api/videos/[videoId]/process route in app/api/videos/[videoId]/process/route.ts (trigger transcription workflow with video metadata)
- [ ] T044 [US3] Update POST /api/webhooks/n8n route to handle transcription completion (store transcript segments, update video status)
- [ ] T045 [US3] Implement GET /api/videos/[videoId]/transcript route in app/api/videos/[videoId]/transcript/route.ts (fetch transcript segments for video)
- [ ] T046 [P] [US3] Create TranscriptViewer component in components/youtube/transcript-viewer.tsx (modal dialog, time-stamped segment list, clickable timestamps, export button)
- [ ] T047 [US3] Add "Process" button to VideoListTable for videos with Pending status
- [ ] T048 [US3] Add "View Transcript" button to VideoListTable for videos with Completed status (opens TranscriptViewer modal)
- [ ] T049 [US3] Implement SRT file export in TranscriptViewer component (format segments as SRT, trigger browser download)
- [ ] T050 [US3] Add real-time progress indicator in VideoListTable (show "Downloading audio...", "Transcribing segment 2/5...", "Generating embeddings...") using Supabase Realtime on processing_jobs table
- [ ] T051 [US3] Implement retry logic in process route with exponential backoff for API failures
- [ ] T052 [US3] Add error handling with actionable messages (display specific errors with retry button in VideoListTable)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 work independently - transcripts can be generated and viewed

---

## Phase 6: User Story 4 - Enable Semantic Search (Priority: P4)

**Goal**: Generate vector embeddings for all transcript segments to enable semantic search queries (prepares for Feature 002 Telegram bot)

**Independent Test**: After transcript completes, embeddings generate automatically, video status updates to "Indexed", pgvector similarity search returns relevant segments in <100ms

### Implementation for User Story 4

- [ ] T053 [P] [US4] Implement OpenAI embeddings client in lib/openai/embeddings.ts (batch embedding generation with text-embedding-3-small model, 1536 dimensions)
- [ ] T054 [US4] Create n8n workflow template in n8n-workflows/generate-embeddings.json (webhook trigger → fetch unprocessed segments → batch generate embeddings → store in pgvector column → update status)
- [ ] T055 [US4] Implement POST /api/embeddings/generate route in app/api/embeddings/generate/route.ts (trigger embedding workflow for completed transcripts)
- [ ] T056 [US4] Update POST /api/webhooks/n8n route to handle embedding completion (update video status to "indexed")
- [ ] T057 [US4] Modify video-transcription workflow to automatically trigger embedding generation after transcript storage
- [ ] T058 [US4] Add pgvector similarity search function to database in supabase/migrations/005_search_functions.sql (optimized query with church_id filter, cosine distance, LIMIT 10)
- [ ] T059 [US4] Implement POST /api/search/semantic route in app/api/search/semantic/route.ts (accept query embedding, perform pgvector search, return top segments with video metadata)
- [ ] T060 [US4] Update VideoListTable to show "Indexed" status badge (green with checkmark) for videos with embeddings
- [ ] T061 [US4] Add embedding generation progress indicator to processing status display

**Checkpoint**: All videos now have embeddings, semantic search infrastructure ready for Feature 002 (Telegram bot)

---

## Phase 7: User Story 5 - Upload Generated Captions (Priority: P5)

**Goal**: Optionally upload generated transcripts back to YouTube as captions for broader accessibility

**Independent Test**: After transcription completes, prompt appears asking "Upload generated captions?", clicking Yes uploads SRT to YouTube, captions visible in YouTube player

### Implementation for User Story 5

- [ ] T062 [P] [US5] Implement caption upload function in lib/youtube/api.ts (format transcript as SRT, call YouTube captions.insert API, mark as auto-generated)
- [ ] T063 [US5] Implement POST /api/videos/[videoId]/upload-captions route in app/api/videos/[videoId]/upload-captions/route.ts (trigger caption upload to YouTube)
- [ ] T064 [P] [US5] Create CaptionUploadPrompt component in components/youtube/caption-upload-prompt.tsx (dialog with "Upload generated captions?" message, Yes/No buttons)
- [ ] T065 [US5] Show CaptionUploadPrompt after transcription completes for videos without existing captions (check caption_source field)
- [ ] T066 [US5] Handle upload success/failure (log result, display notification, don't block transcript availability on failure)
- [ ] T067 [US5] Add "Upload Captions" action button to VideoListTable for completed videos without uploaded captions

**Checkpoint**: Complete pipeline working - videos can be connected, synced, transcribed, indexed, and optionally uploaded back to YouTube

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

- [ ] T068 [P] Implement i18n setup with next-intl for Chinese and English support in app/[locale]/layout.tsx
- [ ] T069 [P] Translate all UI strings and error messages to Chinese in messages/zh.json and English in messages/en.json
- [ ] T070 [P] Add loading skeleton components for video list in components/youtube/video-list-skeleton.tsx
- [ ] T071 [P] Implement optimistic UI updates in VideoListTable (immediately show Processing status when Process clicked)
- [ ] T072 [P] Add comprehensive error boundary in app/error.tsx with user-friendly error messages
- [ ] T073 [P] Create YouTube setup guide documentation in public/youtube-setup-guide.pdf (BotFather instructions, OAuth setup)
- [ ] T074 [P] Add toast notifications for user actions using shadcn/ui toast component (success/error feedback)
- [ ] T075 [P] Implement request rate limiting middleware in middleware.ts (prevent API abuse)
- [ ] T076 [P] Add API request logging to Supabase for debugging and analytics
- [ ] T077 [P] Optimize database queries with proper indexes (add indexes on church_id, video_id, status columns)
- [ ] T078 [P] Add Vercel Analytics integration in app/layout.tsx
- [ ] T079 Performance testing: Verify pgvector search <100ms for 150K vectors
- [ ] T080 Performance testing: Verify video sync for 100 videos completes <2 minutes
- [ ] T081 Performance testing: Verify transcription for 10-minute video completes <5 minutes
- [ ] T082 Security audit: Verify RLS policies prevent cross-church data access
- [ ] T083 Security audit: Verify OAuth tokens encrypted in database
- [ ] T084 Create .env.local.example with all required environment variables documented
- [ ] T085 Update README.md with setup instructions, architecture diagram, and development guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - no dependencies on other stories
  - US2 (Phase 4): Depends on US1 (needs OAuth tokens to fetch videos)
  - US3 (Phase 5): Depends on US2 (needs videos in database to process)
  - US4 (Phase 6): Depends on US3 (needs transcripts to generate embeddings)
  - US5 (Phase 7): Depends on US3 (needs transcripts to upload as captions)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - BLOCKS US2
- **User Story 2 (P2)**: Depends on US1 (needs OAuth connection) - BLOCKS US3
- **User Story 3 (P3)**: Depends on US2 (needs video list) - BLOCKS US4 and US5
- **User Story 4 (P4)**: Depends on US3 (needs transcripts) - Independent from US5
- **User Story 5 (P5)**: Depends on US3 (needs transcripts) - Independent from US4

### Critical Path

Setup → Foundational → US1 → US2 → US3 → US4 (for Feature 002 Telegram bot)

US5 (Upload Captions) is optional and can be deferred

### Within Each User Story

- Foundation tasks before story-specific tasks
- API routes before UI components that call them
- n8n workflows before API routes that trigger them
- Utilities before features that use them
- Core implementation before error handling and polish

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T003-T009 can run in parallel
**Phase 2 (Foundational)**: Tasks T014-T019 can run in parallel (after migrations complete)
**Phase 3 (US1)**: Tasks T021-T022, T025 can run in parallel
**Phase 4 (US2)**: Tasks T032-T033 can run in parallel
**Phase 5 (US3)**: Tasks T039-T041, T046 can run in parallel
**Phase 6 (US4)**: Task T053 can run while other tasks are being planned
**Phase 7 (US5)**: Tasks T062, T064 can run in parallel
**Phase 8 (Polish)**: Most tasks T068-T078 can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (YouTube OAuth connection)
4. Complete Phase 4: User Story 2 (Video library display)
5. **STOP and VALIDATE**: Test connection → video list flow
6. Deploy/demo if ready

**MVP Delivers**: Administrators can connect YouTube and see their video library

### Full Feature (User Stories 1-4)

1. Complete Phases 1-4 (MVP)
2. Complete Phase 5: User Story 3 (Transcript processing)
3. Complete Phase 6: User Story 4 (Embedding generation)
4. **STOP and VALIDATE**: Test full pipeline Connect → Sync → Process → Index
5. Deploy (blocks Feature 002 - Telegram bot)

**Full Feature Delivers**: Complete knowledge base ready for Telegram queries

### Optional Enhancement (User Story 5)

1. Complete Phases 1-6 (Full Feature)
2. Complete Phase 7: User Story 5 (Caption upload)
3. Complete Phase 8: Polish & Cross-Cutting Concerns
4. Production deployment with all features

### Incremental Delivery

1. Week 1: Setup + Foundational + US1 → Demo OAuth connection
2. Week 2: US2 → Demo video library
3. Week 3: US3 → Demo transcript processing
4. Week 4: US4 → Demo embedding generation (Feature 002 ready)
5. Week 5: US5 + Polish → Production deployment

Each week delivers independently testable value

### Parallel Team Strategy

With multiple developers after Foundational phase completes:
- Developer A: US1 + US2 (OAuth and video sync)
- Developer B: US3 (Transcription pipeline) - can start US3 backend while A finishes US2 UI
- Developer C: US4 (Embeddings) - can start while B works on US3
- Developer D: Polish items (i18n, documentation, testing)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable at its checkpoint
- Database migrations (T010-T013) must run sequentially in order
- n8n workflows (T028, T042, T054) require MCP access to deploy
- Commit after completing each phase or logical task group
- Stop at any checkpoint to validate story independently
- US4 completion unblocks Feature 002 (Telegram AI assistant)

**Total Tasks**: 85
**MVP Tasks (US1-2)**: T001-T038 (38 tasks, ~2 weeks)
**Full Feature Tasks (US1-4)**: T001-T061 (61 tasks, ~4 weeks)
**All Tasks with Polish**: T001-T085 (85 tasks, ~5-6 weeks)
