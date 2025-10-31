# Implementation Plan: YouTube Channel Connection & Video Processing

**Branch**: `001-youtube-connection` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-youtube-connection/spec.md`

## Summary

This feature implements the first two stages of the Connect → Process → Query pipeline: YouTube OAuth authorization, video synchronization, transcript extraction/generation via Whisper API, and embedding generation for semantic search. Administrators connect their YouTube channel, the system fetches all videos, processes transcripts (either from existing captions or audio transcription), and generates vector embeddings for each segment. This creates the foundation knowledge base that will power the Telegram AI assistant (Feature 002).

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 14 (App Router)
**Primary Dependencies**:
- Frontend: Next.js 14, React 18, Tailwind CSS 3.x, shadcn/ui components
- Backend: Vercel Serverless Functions, googleapis (YouTube API), openai (Whisper + Embeddings)
- Database: Supabase (Postgres 14+ with pgvector extension)
- Workflow: n8n (pre-deployed Azure instance, MCP integration)

**Storage**: Supabase Postgres (metadata, transcripts, embeddings) + Supabase Storage (temporary audio files)
**Testing**: Jest + React Testing Library (unit), Playwright (E2E), Supabase local dev environment
**Target Platform**: Vercel Edge Network (global CDN), serverless functions in us-east-1
**Project Type**: Web application (Next.js frontend + backend API routes)

**Performance Goals**:
- OAuth flow completion < 5 seconds
- Video sync for 100 videos < 2 minutes
- Transcript extraction (with captions) < 1 minute per video
- Audio transcription (10-min video) < 5 minutes
- Embedding generation < 30 seconds per video
- pgvector similarity search < 100ms

**Constraints**:
- YouTube API quota: 10,000 units/day (read operations ~1 unit each, video list ~100 units)
- OpenAI Whisper API: 25MB file size limit (requires audio chunking)
- Vercel function timeout: 10 seconds for API routes, 5 minutes for background jobs (via n8n)
- Supabase connection limit: 60 concurrent connections per project
- OAuth token refresh: Handle 1-hour access token expiry

**Scale/Scope**:
- Support 1000+ videos per church
- 50 concurrent churches in production
- Average video: 30 minutes (45MB audio, 9000 words transcript, ~150 segments)
- Database: ~500MB per church (1000 videos × 500KB avg)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Task-Driven Development
**Status**: PASS
- Implementation follows Connect → Process pipeline with concrete user workflows
- Each phase delivers independently testable value (OAuth → Video list → Single transcript → Batch processing)
- Focus on admin pain point: "How do I make sermon content searchable?"

### ✅ II. User Experience First
**Status**: PASS
- Visual feedback at every step (connection status, video thumbnails, processing progress badges)
- Export capability included (download transcripts as SRT)
- Error messages are actionable (e.g., "YouTube API quota exceeded - resets in 4 hours")
- Connection UI uses prominent cards as specified

### ✅ III. Serverless-First Architecture
**Status**: PASS
- Vercel API routes are stateless (cold-start aware)
- Long-running transcription/embedding handled by n8n workflows
- Webhook pattern for Vercel ← n8n communication
- Supabase is single source of truth (no in-memory state)

### ✅ IV. Multi-Tenancy by Design
**Status**: PASS
- All database tables include church_id foreign key
- Supabase RLS policies enforce data isolation
- OAuth tokens stored per-church with encryption
- Video processing filtered by church_id

### ✅ V. Privacy & Theological Content Sensitivity
**Status**: PASS
- RLS policies on transcripts and videos tables
- OAuth tokens encrypted with AES-256 (Supabase vault)
- No third-party analytics on transcript content
- Export and delete capabilities included in spec

### ✅ VI. Incremental Processing
**Status**: PASS
- Videos processed one-at-a-time (status tracking in database)
- Real-time UI updates via Supabase Realtime
- Retry logic with exponential backoff for API failures
- Resume capability (processing_jobs table tracks state)

### ✅ VII. Multilingual by Default
**Status**: PASS
- UI supports i18n (Chinese/English)
- Whisper API auto-detects language
- Transcript language stored per-segment
- No hardcoded language assumptions

### ⚠️ Technical Guardrails Review

**API Integration Standards**:
- ✅ OAuth callbacks via Vercel API routes (`/api/youtube/callback`)
- ✅ Tokens stored encrypted in Supabase (not .env)
- ✅ Rate limiting with exponential backoff implemented
- ✅ n8n workflows deployed via MCP (template-based)

**Error Handling Requirements**:
- ✅ Actionable error messages per constitution examples
- ✅ Error context logged (video ID, API response, timestamp)

**Testing Requirements**:
- ✅ API route integration tests planned
- ✅ n8n workflow validation before deployment
- ✅ E2E test: Connect → Process → Verify transcript
- ✅ pgvector performance benchmark < 2 seconds

**Quality Standards**:
- ✅ Optimistic UI updates planned (React Query)
- ✅ Skeleton loaders for video list
- ✅ Supabase Realtime for processing status
- ✅ Type safety (TypeScript strict mode)

## Project Structure

### Documentation (this feature)

```text
specs/001-youtube-connection/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (API endpoint contracts)
└── checklists/          # Validation checklists
    └── requirements.md  # Spec validation (already exists)
```

### Source Code (repository root)

```text
# Web application structure (Next.js)
├── app/                           # Next.js 14 App Router
│   ├── (dashboard)/               # Dashboard routes group
│   │   ├── page.tsx               # Main dashboard (YouTube + Telegram cards)
│   │   ├── videos/
│   │   │   └── page.tsx           # Video list page
│   │   └── layout.tsx             # Dashboard layout
│   ├── api/                       # API Routes
│   │   ├── youtube/
│   │   │   ├── connect/route.ts   # POST: Initiate OAuth
│   │   │   ├── callback/route.ts  # GET: OAuth callback handler
│   │   │   └── sync/route.ts      # POST: Trigger video sync
│   │   ├── videos/
│   │   │   ├── [videoId]/
│   │   │   │   ├── transcript/route.ts  # GET: Fetch transcript
│   │   │   │   └── process/route.ts     # POST: Trigger processing
│   │   │   └── route.ts           # GET: List videos
│   │   └── webhooks/
│   │       └── n8n/route.ts       # POST: n8n webhook receiver
│   └── layout.tsx                 # Root layout
│
├── components/                    # React components
│   ├── ui/                        # shadcn/ui base components
│   ├── youtube/
│   │   ├── connect-card.tsx       # YouTube connection UI
│   │   ├── video-list-table.tsx   # Video list with status badges
│   │   └── transcript-viewer.tsx  # Transcript modal with timestamps
│   └── providers/
│       └── query-provider.tsx     # React Query setup
│
├── lib/                           # Utility libraries
│   ├── supabase/
│   │   ├── client.ts              # Supabase client (browser)
│   │   ├── server.ts              # Supabase client (server)
│   │   └── types.ts               # Generated database types
│   ├── youtube/
│   │   ├── oauth.ts               # OAuth flow helpers
│   │   └── api.ts                 # YouTube API wrappers
│   ├── openai/
│   │   ├── whisper.ts             # Whisper API client
│   │   └── embeddings.ts          # Embedding generation
│   └── utils/
│       ├── encryption.ts          # Token encryption/decryption
│       └── errors.ts              # Custom error classes
│
├── n8n-workflows/                 # n8n workflow templates
│   ├── youtube-video-sync.json    # Video synchronization workflow
│   ├── video-transcription.json   # Transcription processing workflow
│   └── generate-embeddings.json   # Embedding generation workflow
│
├── supabase/                      # Database migrations & config
│   ├── migrations/
│   │   ├── 001_initial_schema.sql # Churches, videos, transcripts tables
│   │   ├── 002_rls_policies.sql   # Row Level Security policies
│   │   ├── 003_pgvector_setup.sql # pgvector extension & indexes
│   │   └── 004_functions.sql      # Database functions & triggers
│   └── config.toml                # Supabase project config
│
├── tests/                         # Test files
│   ├── integration/
│   │   ├── youtube-oauth.test.ts  # OAuth flow tests
│   │   └── video-processing.test.ts # Transcription pipeline tests
│   ├── e2e/
│   │   └── youtube-to-transcript.spec.ts # Playwright E2E
│   └── unit/
│       ├── encryption.test.ts     # Token encryption tests
│       └── embeddings.test.ts     # Embedding generation tests
│
├── public/                        # Static assets
│   └── youtube-setup-guide.pdf    # Admin documentation
│
├── .env.local.example             # Environment variable template
├── next.config.js                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies & scripts
```

**Structure Decision**: Web application structure chosen because:
1. Feature requires both frontend (admin dashboard) and backend (API routes)
2. Next.js App Router provides optimal serverless deployment on Vercel
3. Supabase integration well-supported in Next.js ecosystem
4. n8n workflows stored as JSON templates (version controlled, deployable via MCP)

## Complexity Tracking

> **No constitutional violations detected - this section intentionally blank**

All architectural choices align with constitutional principles. Serverless + n8n hybrid is explicitly mandated, multi-tenancy enforced via RLS, incremental processing built-in. No complexity justifications required.

