# Church YouTube Knowledge Bot

> Transform your church's YouTube sermon library into an AI-powered, searchable knowledge base accessible via Telegram.

## 🎯 Vision

Enable congregation members to ask theological questions and instantly receive answers grounded in sermon content, with precise video timestamp links for deeper study.

**Example Query**: "What did the pastor say about justification by faith?"

**Bot Response**:
> Based on our sermon content, "justification by faith" means believers are declared righteous before God by faith alone, not by works.
>
> 📹 **Relevant sermon segments**:
> 1. **Romans Series (III): Core of Justification**
>    🕒 [14:32](https://youtu.be/abc123?t=872) - Paul emphasizes the role of faith
>    🕒 [18:45](https://youtu.be/abc123?t=1125) - Contrast with legalism
>
> 2. **Theological Foundations of the Reformation**
>    🕒 [06:15](https://youtu.be/def456?t=375) - Martin Luther's discovery

---

## 🏗️ Architecture

### Three-Stage Pipeline

```
┌─────────────┐      ┌───────────────┐      ┌────────────────┐
│   CONNECT   │ ───▶ │    PROCESS    │ ───▶ │     QUERY      │
│             │      │               │      │                │
│ YouTube     │      │ • Transcripts │      │ Telegram Bot   │
│ OAuth       │      │ • Embeddings  │      │ RAG Search     │
│ Channel     │      │ • pgvector    │      │ GPT-4 Answers  │
└─────────────┘      └───────────────┘      └────────────────┘
```

### Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (Postgres 14 + pgvector extension)
- **Workflows**: n8n (Azure Cloud) for long-running tasks
- **AI Services**: OpenAI Whisper (transcription) + text-embedding-3-small (1536d) + GPT-4 (answers)
- **Integrations**: YouTube Data API v3 (OAuth 2.0) + Telegram Bot API

### Multi-Tenant Design

Each church operates independently with complete data isolation:
- ✅ Row Level Security (RLS) policies enforce tenant boundaries
- ✅ Encrypted OAuth tokens per church
- ✅ Separate knowledge bases (no cross-contamination)
- ✅ Per-church configuration (YouTube channel, Telegram bot, API quotas)

---

## 🚀 Features

### ✅ Feature 001: YouTube Channel Connection & Video Processing

**Status**: In Development
**Branch**: `001-youtube-connection`

**Capabilities**:
1. **Connect YouTube Channel** (P1)
   - OAuth 2.0 authorization flow
   - Display connection status with channel name and thumbnail
   - Automatic token refresh handling

2. **View Video Library** (P2)
   - Sync all videos from YouTube channel
   - Display thumbnails, titles, durations, processing status
   - Daily automatic sync + manual sync button
   - Real-time status updates via Supabase Realtime

3. **Process Video Transcripts** (P3)
   - Extract existing YouTube captions (SRT/VTT)
   - OR generate transcripts via OpenAI Whisper API
   - Handle videos up to 3 hours (audio chunking)
   - Time-stamped segments with clickable YouTube links
   - Export transcripts as SRT files
   - Real-time processing progress indicators

4. **Enable Semantic Search** (P4)
   - Generate vector embeddings (1536 dimensions) for all transcript segments
   - pgvector similarity search (<100ms for 150K vectors)
   - Prepares knowledge base for Telegram queries

5. **Upload Generated Captions** (P5)
   - Optional: Upload transcripts back to YouTube as captions
   - Improves accessibility for broader audience

### 🔜 Feature 002: Telegram AI Knowledge Assistant

**Status**: Specification Complete
**Branch**: `002-telegram-assistant`

**Capabilities**:
1. Connect Telegram bot via BotFather token
2. Answer questions using RAG (Retrieval-Augmented Generation)
3. Multi-turn conversations with context (5-message history)
4. Multi-language support (Chinese/English with language preservation)
5. Bot analytics dashboard (queries, response times, engagement)
6. Broadcast messages to all bot users

---

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **Package Manager**: npm, yarn, or pnpm
- **Supabase Account**: For database (free tier works)
- **n8n Instance**: Azure Cloud deployment via MCP
- **API Keys**:
  - Google Cloud (YouTube Data API v3)
  - OpenAI (Whisper + Embeddings + GPT-4)
  - Telegram (BotFather token, for Feature 002)

---

## 🛠️ Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd church-youtube-knowledge-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# YouTube OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/youtube/callback

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.azure.com/webhook
N8N_WEBHOOK_SECRET=your-shared-secret

# Telegram (Feature 002)
# TELEGRAM_BOT_TOKEN=your-bot-token (added later)
```

### 4. Setup Supabase Database

```bash
# Run migrations
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > lib/supabase/types.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 📖 Development Guide

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard pages
│   │   ├── page.tsx        # Main dashboard (YouTube + Telegram cards)
│   │   └── videos/         # Video library page
│   └── api/                # API routes
│       ├── youtube/        # OAuth, sync, callbacks
│       ├── videos/         # Video CRUD, processing
│       └── webhooks/       # n8n webhook receivers
│
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── youtube/            # YouTube-specific components
│
├── lib/                    # Utility libraries
│   ├── supabase/           # Database clients & types
│   ├── youtube/            # YouTube API wrappers
│   ├── openai/             # Whisper & Embeddings clients
│   └── utils/              # Encryption, errors, helpers
│
├── n8n-workflows/          # Workflow templates (JSON)
├── supabase/migrations/    # Database migrations
└── specs/                  # Feature specifications
    ├── 001-youtube-connection/
    └── 002-telegram-assistant/
```

### Key Documents

- **specs/001-youtube-connection/spec.md**: Feature specification (user stories, requirements, success criteria)
- **specs/001-youtube-connection/plan.md**: Implementation plan (tech stack, architecture, constitution check)
- **specs/001-youtube-connection/tasks.md**: Task list organized by user story (85 tasks total)
- **specs/001-youtube-connection/research.md**: Technical research items (9 research areas)
- **.specify/memory/constitution.md**: Project constitution (7 core principles)

### Development Workflow

1. **Pick a task** from `specs/001-youtube-connection/tasks.md`
2. **Create feature branch** (if not on one)
3. **Implement task** following checklist format
4. **Test independently** using acceptance criteria from spec.md
5. **Commit** with descriptive message
6. **Move to next task** in same user story or phase

### Testing Strategy

- **Unit Tests**: `npm test` (Jest + React Testing Library)
- **Integration Tests**: API routes with Supabase interactions
- **E2E Tests**: `npm run test:e2e` (Playwright)
- **Manual Testing**: Use quickstart.md scenarios per user story

---

## 🎯 Roadmap

### Phase 1: MVP (Weeks 1-2)
- [x] Setup project infrastructure
- [x] Database schema with RLS
- [ ] YouTube OAuth connection (US1)
- [ ] Video library display (US2)

**Deliverable**: Administrators can connect YouTube and see video list

### Phase 2: Core Pipeline (Weeks 3-4)
- [ ] Transcript processing (US3)
- [ ] Embedding generation (US4)

**Deliverable**: Knowledge base indexed and ready for queries

### Phase 3: Telegram Integration (Weeks 5-6)
- [ ] Telegram bot connection (Feature 002, US1)
- [ ] RAG Q&A implementation (Feature 002, US2)
- [ ] Multi-turn conversations (Feature 002, US3)

**Deliverable**: Congregation members can query via Telegram

### Phase 4: Production (Week 7+)
- [ ] Caption upload feature (US5)
- [ ] Analytics dashboard (Feature 002, US4)
- [ ] Broadcast messages (Feature 002, US5)
- [ ] Performance optimization
- [ ] Production deployment

---

## 🏛️ Constitutional Principles

This project adheres to 7 core principles defined in `.specify/memory/constitution.md`:

1. **Task-Driven Development**: Focus on user workflows (Connect → Process → Query)
2. **User Experience First**: Crystal-clear UI, visual feedback, actionable errors
3. **Serverless-First Architecture**: Vercel functions + n8n hybrid
4. **Multi-Tenancy by Design**: Church-level isolation via RLS
5. **Privacy & Theological Content Sensitivity**: Encrypted tokens, no analytics on content
6. **Incremental Processing**: Pausable/resumable, status tracking, retry logic
7. **Multilingual by Default**: Chinese/English throughout

All implementation decisions align with these principles (see constitution checks in plan.md).

---

## 📊 Performance Targets

- **OAuth Flow**: <5 seconds
- **Video Sync** (100 videos): <2 minutes
- **Transcript Extraction** (with captions): <1 minute/video
- **Audio Transcription** (10-min video): <5 minutes
- **Embedding Generation**: <30 seconds/video
- **pgvector Search**: <100ms (for 150K vectors)
- **Telegram Response**: <5 seconds (95th percentile)

---

## 🤝 Contributing

1. Read `.specify/memory/constitution.md` to understand project principles
2. Check `specs/001-youtube-connection/tasks.md` for available tasks
3. Follow checklist format: `- [ ] T### [P?] [Story?] Description with file path`
4. Each user story should be independently testable
5. Test against acceptance scenarios in spec.md

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Database & Auth
- [OpenAI](https://openai.com/) - Whisper, Embeddings, GPT-4
- [n8n](https://n8n.io/) - Workflow automation
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Status**: 🚧 In Active Development
**Current Feature**: 001 - YouTube Channel Connection & Video Processing
**Next Feature**: 002 - Telegram AI Knowledge Assistant
