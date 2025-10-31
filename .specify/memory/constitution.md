# Church YouTube Knowledge Bot Constitution

<!--
SYNC IMPACT REPORT
==================
Version Change: Initial → 1.0.0
Rationale: First constitution ratification establishing foundational principles

Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (7 principles)
  - Technical Guardrails
  - Quality Standards
  - Decision Framework
  - Governance

Removed Sections: N/A

Templates Status:
  ✅ plan-template.md - Constitution Check section aligns with principles
  ✅ spec-template.md - User scenario prioritization aligns with Task-Driven Development
  ✅ tasks-template.md - User story organization aligns with Incremental Processing principle
  ✅ checklist-template.md - No updates required (generic validation checklist)
  ✅ agent-file-template.md - No updates required (generic agent template)

Follow-up TODOs: None
-->

## Core Principles

### I. Task-Driven Development

Every feature implementation must begin with concrete user workflows mapped to the Connect → Process → Query pipeline. Development prioritizes solving specific user pain points (e.g., "Find which sermon mentioned justification by faith") over architectural abstractions. End-to-end functional flows MUST be completed before optimizing internal structure.

**Rationale**: Users care about capabilities, not code structure. Validated workflows ensure every commit delivers measurable value and prevents over-engineering.

---

### II. User Experience First

The user interface MUST provide crystal-clear guidance and visual feedback at every step:

- **Connection UI**: Two prominent cards for YouTube and Telegram authorization with status indicators
- **Visual Feedback**: Display thumbnails, video titles, and real-time processing status for each video
- **Export Capability**: All users can download transcripts for any processed video
- **API Placeholder Handling**: When API keys are missing, show clear UI indicators with inline documentation links (not generic error messages)

**Rationale**: Confusion is the primary barrier to adoption. Transparent state and actionable guidance reduce support burden and build user trust.

---

### III. Serverless-First Architecture

All features MUST be designed for Vercel's stateless, function-based deployment model:

- **Stateless Functions**: API routes assume cold starts; no in-memory session state
- **Long-Running Processing**: Use n8n for batch operations (transcript generation, embedding creation)
- **Communication Pattern**: Webhook-based integration between Vercel and n8n workflows
- **State Management**: Database (Supabase) is the single source of truth for all persistent state

**Rationale**: Serverless architecture enforces scalability constraints early and prevents deployment surprises. Mixing execution environments (Vercel + n8n) optimizes cost vs. capability tradeoffs.

---

### IV. Multi-Tenancy by Design

Data isolation MUST be enforced at the database level:

- **Church-Level Isolation**: Each church operates with completely separate data partitions
- **No Cross-Contamination**: Knowledge bases, transcripts, and queries never leak between churches
- **Per-Church Configuration**: YouTube channel, Telegram bot token, API quotas stored per tenant
- **Row-Level Security**: Supabase RLS policies enforce tenant boundaries for every query

**Rationale**: A single data leak destroys trust. Architecture-level isolation prevents accidental exposure and simplifies compliance (vs. application-level checks).

---

### V. Privacy & Theological Content Sensitivity

Sermon transcripts contain theological teaching and MUST be treated as sensitive data:

- **Row-Level Security**: Supabase RLS policies required on all transcript and embedding tables
- **No Third-Party Analytics**: Transcript content excluded from external monitoring tools
- **User Data Ownership**: Export and delete capabilities required for all user-generated content
- **Encryption at Rest**: API keys and tokens stored encrypted in database (not environment variables)

**Rationale**: Religious content is deeply personal. Privacy violations risk legal liability and community harm.

---

### VI. Incremental Processing

All batch operations MUST support pausable, resumable execution:

- **One-at-a-Time Processing**: Videos processed sequentially to respect API rate limits
- **Status Tracking**: Database records processing state for each video (pending/processing/completed/failed)
- **Real-Time Progress**: UI updates reflect current processing step without page refresh
- **Graceful Failure Handling**: Retry logic with exponential backoff; user-visible error notifications

**Rationale**: API quotas and long processing times are unavoidable. Users need visibility into progress and confidence that failures won't lose work.

---

### VII. Multilingual by Default

Language must never be hardcoded or assumed:

- **UI Localization**: Interface supports Chinese and English (i18n framework required)
- **Automatic Language Detection**: Whisper API detects transcript language without user input
- **Context-Preserving Responses**: AI answers maintain the source language of sermon content
- **No Translation Assumptions**: Queries in Chinese retrieve Chinese sermons; English retrieves English

**Rationale**: Church communities are linguistically diverse. Forcing language switching breaks immersion and excludes users.

---

## Technical Guardrails

### API Integration Standards

- **OAuth Callback Handling**: Use Vercel API routes (not client-side code) for YouTube OAuth callbacks
- **API Key Storage**: Per-church keys stored encrypted in Supabase (never in `.env` or client code)
- **Rate Limiting**: Implement exponential backoff for YouTube API; respect daily quota limits
- **n8n Workflow Management**: Deploy and update workflows programmatically via MCP (not manual UI edits)

### Error Handling Requirements

All user-facing errors MUST be actionable:

- ❌ **Bad**: "API Error 403"
- ✅ **Good**: "YouTube API quota exceeded. Quota resets at 2:00 AM PST (in 4 hours). [Learn about quotas →]"

Include next steps, reset times, or documentation links in every error message.

### Testing Requirements

- **API Route Integration Tests**: Required for all OAuth flows and webhook handlers
- **n8n Workflow Validation**: Template syntax verified before deployment (prevent runtime failures)
- **End-to-End Test**: Automated test covering Connect YouTube → Process video → Query in Telegram
- **Performance Benchmark**: Transcript search queries MUST respond in <2 seconds (pgvector index required)

---

## Quality Standards

### User Interface Performance

- **Perceived Instant Response**: Use optimistic updates and skeleton loaders (not spinners)
- **Real-Time Feedback**: Processing status updates without page refresh (WebSockets or polling)
- **Responsive Design**: UI functional on mobile and desktop (no desktop-only features)

### Backend Performance

- **Transcript Search Latency**: <2 seconds for pgvector similarity queries (measured at p95)
- **API Cold Start Handling**: Vercel functions gracefully handle cold starts (no timeout failures)
- **Embedding Generation Throughput**: Batch embeddings in n8n to minimize API calls

### Code Quality

- **No Hardcoded Secrets**: API keys, tokens, and credentials read from database or secure parameter store
- **Idempotent Webhooks**: n8n webhook handlers safely retry (use deduplication keys)
- **Type Safety**: TypeScript strict mode enabled; no `any` types without justification

---

## Decision Framework

When evaluating implementation choices, prioritize in this order:

1. **Correctness**: Transcripts must be accurate; timestamp links must point to correct video moments
2. **User Clarity**: UI and error messages must be immediately understandable without documentation
3. **Reliability**: System must handle API failures, resume processing, and never lose user data
4. **Performance**: Queries must feel instant (<2s); video processing must show progress
5. **Code Elegance**: Refactor only when above criteria are satisfied and tech debt blocks new features

**Example Application**: If choosing between a complex caching layer (performance) and clearer error messages (user clarity), implement error messages first. Optimize performance only after users can successfully recover from failures.

---

## Governance

### Amendment Process

This constitution supersedes all other development practices. Amendments require:

1. **Documented Rationale**: Explain why existing principle is insufficient or incorrect
2. **Impact Analysis**: Identify affected templates (plan, spec, tasks, checklist)
3. **Migration Plan**: Update existing features to comply with new principle (if breaking change)
4. **Version Increment**: Follow semantic versioning for constitution changes

### Versioning Policy

- **MAJOR** (X.0.0): Backward-incompatible principle removals or redefinitions requiring code changes
- **MINOR** (0.X.0): New principles added or existing principles materially expanded
- **PATCH** (0.0.X): Clarifications, wording improvements, typo fixes (no semantic change)

### Compliance Review

- **Pull Request Gate**: All PRs must document which principles they satisfy (use checklist)
- **Complexity Justification**: Deviations from principles require explicit approval and documented rationale
- **Template Sync**: Constitution changes trigger updates to `.specify/templates/` files within same commit

### Runtime Development Guidance

For day-to-day coding decisions not covered by constitutional principles, developers should:

1. Consult existing code patterns in the repository
2. Refer to framework documentation (Next.js, Supabase, n8n)
3. Propose new patterns via pull request with rationale
4. Escalate ambiguities to team lead for constitutional amendment consideration

---

**Version**: 1.0.0 | **Ratified**: 2025-10-31 | **Last Amended**: 2025-10-31
