# Claude Code Guidance: Church YouTube Knowledge Bot

## Project Overview

This is a multi-tenant SaaS application that transforms church YouTube sermon libraries into AI-powered, searchable knowledge bases accessible via Telegram. The system follows a three-stage pipeline: Connect → Process → Query.

**Current Development**: Feature 001 (YouTube Channel Connection & Video Processing)

---

## Quick Context

**Tech Stack**:
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Vercel Serverless Functions
- Database: Supabase (Postgres 14 + pgvector)
- Workflows: n8n (Azure Cloud)
- AI: OpenAI (Whisper, Embeddings, GPT-4)

**Project Type**: Web application (serverless architecture)

**Multi-Tenancy**: Church-level isolation enforced via Supabase RLS policies

---

## Constitutional Principles

⚠️ **CRITICAL**: All implementation must adhere to these 7 principles from `.specify/memory/constitution.md`:

1. **Task-Driven Development**
   - Focus on Connect → Process → Query pipeline
   - Prioritize user workflows over abstractions
   - Each commit delivers measurable value

2. **User Experience First**
   - Crystal-clear UI with visual feedback
   - Actionable error messages (e.g., "YouTube API quota exceeded - resets in 4 hours")
   - No generic errors like "Something went wrong"

3. **Serverless-First Architecture**
   - Vercel functions are stateless (cold-start aware)
   - n8n handles long-running tasks (>10 seconds)
   - Supabase is single source of truth
   - Webhook pattern for Vercel ↔ n8n communication

4. **Multi-Tenancy by Design**
   - ALWAYS filter by `church_id`
   - Use Supabase RLS policies (never skip)
   - Test cross-church data isolation
   - Each church has isolated: YouTube tokens, videos, transcripts, bot config

5. **Privacy & Theological Content Sensitivity**
   - Sermon transcripts are sensitive data
   - Encrypt OAuth tokens (AES-256)
   - No third-party analytics on content
   - Support export/delete capabilities

6. **Incremental Processing**
   - Process videos one-at-a-time
   - Track status in database (pending/processing/completed/failed)
   - Real-time UI updates (Supabase Realtime)
   - Retry logic with exponential backoff

7. **Multilingual by Default**
   - UI supports Chinese and English (i18n)
   - Whisper auto-detects language
   - Never hardcode language assumptions

---

## File Organization

### Documentation Structure

```
specs/
├── 001-youtube-connection/
│   ├── spec.md           # Feature specification (5 user stories)
│   ├── plan.md           # Implementation plan (tech stack, structure)
│   ├── tasks.md          # Task list (85 tasks, organized by user story)
│   ├── research.md       # Technical research (9 items)
│   └── checklists/
│       └── requirements.md
└── 002-telegram-assistant/
    ├── spec.md           # Feature specification (5 user stories)
    └── checklists/
```

### Code Structure

```
├── app/                  # Next.js App Router
│   ├── (dashboard)/      # Dashboard routes
│   └── api/              # API routes (serverless functions)
│
├── components/           # React components
│   ├── ui/               # shadcn/ui base components
│   └── youtube/          # Feature-specific components
│
├── lib/                  # Utility libraries
│   ├── supabase/         # DB clients & types
│   ├── youtube/          # YouTube API wrappers
│   ├── openai/           # AI clients
│   └── utils/            # Helpers
│
├── n8n-workflows/        # Workflow templates (JSON)
└── supabase/migrations/  # Database migrations
```

---

## Development Workflow

### Step 1: Check Current Context

```bash
# View current branch
git branch

# Check task list
cat specs/001-youtube-connection/tasks.md | grep "^\- \[ \]" | head -10

# View spec for current user story
cat specs/001-youtube-connection/spec.md | grep -A 20 "User Story"
```

### Step 2: Pick Next Task

Tasks are organized by user story in `specs/001-youtube-connection/tasks.md`:
- **Phase 1**: Setup (T001-T009)
- **Phase 2**: Foundational (T010-T020) - BLOCKS all user stories
- **Phase 3**: User Story 1 - Connect YouTube Channel (T021-T027)
- **Phase 4**: User Story 2 - View Video Library (T028-T038)
- **Phase 5**: User Story 3 - Process Transcripts (T039-T052)
- **Phase 6**: User Story 4 - Enable Search (T053-T061)
- **Phase 7**: User Story 5 - Upload Captions (T062-T067)
- **Phase 8**: Polish (T068-T085)

**Task Format**: `- [ ] T### [P?] [Story?] Description with file path`

### Step 3: Implement Task

Follow this checklist:

1. **Read user story** from spec.md to understand context
2. **Check acceptance criteria** to know what "done" looks like
3. **Create files** at exact paths specified in task
4. **Follow constitutional principles** (see above)
5. **Test independently** using acceptance scenario from spec
6. **Mark task complete** in tasks.md (change `[ ]` to `[x]`)

### Step 4: Testing

- **Unit Tests**: Place in `tests/unit/` (Jest)
- **Integration Tests**: Place in `tests/integration/` (API routes)
- **E2E Tests**: Place in `tests/e2e/` (Playwright)
- **Manual Testing**: Use acceptance scenarios from spec.md

### Step 5: Commit

```bash
git add .
git commit -m "feat(US#): brief description

- Task T###: Specific change
- Follows principle: [Principle Name]
- Acceptance: [Test result]
"
```

---

## Common Patterns

### 1. API Routes (Vercel Functions)

**Location**: `app/api/[feature]/[action]/route.ts`

**Template**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Get Supabase client (includes RLS enforcement)
    const supabase = createClient();

    // 2. Get church_id from auth session (multi-tenancy)
    const { data: { session } } = await supabase.auth.getSession();
    const churchId = session?.user?.app_metadata?.church_id;

    if (!churchId) {
      return NextResponse.json(
        { error: 'Unauthorized - no church context' },
        { status: 401 }
      );
    }

    // 3. Parse request body
    const body = await request.json();

    // 4. Business logic here
    // - ALWAYS filter by churchId
    // - Use RLS policies
    // - Handle errors with actionable messages

    // 5. Return result
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    // Actionable error messages per constitutional principle
    console.error('Error context:', { error, endpoint: '/api/...' });
    return NextResponse.json(
      { error: 'Specific error message with next steps' },
      { status: 500 }
    );
  }
}
```

### 2. Supabase Queries (with RLS)

**Pattern**:
```typescript
// GOOD: RLS automatically enforces church_id
const { data, error } = await supabase
  .from('videos')
  .select('*')
  .eq('status', 'pending'); // RLS filters by church_id

// ALSO GOOD: Explicit filter for clarity
const { data, error } = await supabase
  .from('videos')
  .select('*')
  .eq('church_id', churchId)  // Explicit
  .eq('status', 'pending');

// BAD: Skipping RLS or using service role without reason
const { data, error } = await supabaseAdmin  // Bypasses RLS!
  .from('videos')
  .select('*');
```

### 3. React Components

**Location**: `components/[feature]/[component-name].tsx`

**Template**:
```typescript
'use client';  // Only if using hooks, otherwise use server component

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  videoId: string;
  onSuccess?: () => void;
}

export function ProcessVideoButton({ videoId, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}/process`, {
        method: 'POST',
      });

      if (!response.ok) {
        const { error } = await response.json();
        // Actionable error message
        throw new Error(error || 'Failed to process video');
      }

      onSuccess?.();
    } catch (err) {
      // Display user-friendly error
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleProcess} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Process Video'}
      </Button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
```

### 4. n8n Workflow Templates

**Location**: `n8n-workflows/[workflow-name].json`

**Structure**:
```json
{
  "name": "youtube-video-sync",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "youtube-video-sync",
        "authentication": "headerAuth"
      }
    },
    {
      "name": "YouTube API",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://www.googleapis.com/youtube/v3/search",
        "method": "GET",
        "queryParameters": {
          "part": "snippet",
          "channelId": "={{$json.channelId}}",
          "maxResults": "50"
        }
      }
    },
    {
      "name": "Supabase Insert",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "table": "videos",
        "rows": "={{$json.items}}"
      }
    }
  ]
}
```

### 5. Database Migrations

**Location**: `supabase/migrations/###_description.sql`

**Template**:
```sql
-- Migration: 001_initial_schema.sql
-- Description: Create core tables with church_id foreign keys

-- Churches table (tenant root)
CREATE TABLE churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  youtube_channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table (per-church)
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, youtube_video_id)
);

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (only access own church's videos)
CREATE POLICY "Users can only access their church's videos"
  ON videos
  FOR ALL
  USING (church_id = auth.uid()::uuid);  -- Adjust based on auth setup

-- Create indexes
CREATE INDEX idx_videos_church_id ON videos(church_id);
CREATE INDEX idx_videos_status ON videos(status);
```

---

## Debugging Tips

### 1. Check RLS Policies

```sql
-- Test if RLS is blocking query
SELECT * FROM videos WHERE church_id = 'xxx';  -- Should work

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'videos';
```

### 2. Check API Route Logs

```bash
# Vercel dev logs
npm run dev  # Watch console for errors

# Check Supabase logs
npx supabase db logs
```

### 3. Test OAuth Flow

```typescript
// In browser console after OAuth redirect
localStorage.getItem('youtube_oauth_state');  // Should match state param
```

### 4. Validate n8n Webhook

```bash
curl -X POST https://your-n8n.com/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"churchId": "test", "videoId": "abc123"}'
```

---

## Gotchas & Common Mistakes

### ❌ Don't Do This

1. **Skip RLS Checks**
   ```typescript
   // BAD: Using service role without filtering
   const { data } = await supabaseAdmin
     .from('videos')
     .select('*');  // Returns ALL churches' videos!
   ```

2. **Hardcode Language**
   ```typescript
   // BAD: Assuming English
   const errorMessage = "Something went wrong";

   // GOOD: Use i18n
   const errorMessage = t('errors.generic');
   ```

3. **Block Vercel Function**
   ```typescript
   // BAD: Waiting for long task in API route
   await transcribeVideo(videoId);  // Might timeout!

   // GOOD: Trigger n8n workflow, return immediately
   await triggerN8NWorkflow('transcribe', { videoId });
   return NextResponse.json({ status: 'processing' });
   ```

4. **Generic Error Messages**
   ```typescript
   // BAD: Unhelpful
   throw new Error('API error');

   // GOOD: Actionable
   throw new Error('YouTube API quota exceeded. Quota resets at 2:00 AM (in 4 hours). [Learn about quotas →]');
   ```

### ✅ Do This Instead

1. **Always Use RLS**
   ```typescript
   const supabase = createClient();  // Respects RLS
   const { data } = await supabase
     .from('videos')
     .select('*')
     .eq('church_id', churchId);  // Explicit + RLS
   ```

2. **Support Multilingual**
   ```typescript
   import { useTranslations } from 'next-intl';

   const t = useTranslations('errors');
   const errorMessage = t('api_error', { code: 'QUOTA_EXCEEDED' });
   ```

3. **Use Async Patterns**
   ```typescript
   // Trigger workflow
   await fetch(n8nWebhookUrl, {
     method: 'POST',
     body: JSON.stringify({ videoId })
   });

   // Return immediately
   return NextResponse.json({ status: 'processing' }, { status: 202 });
   ```

4. **Provide Context**
   ```typescript
   const quota Reset = new Date();
   quotaReset.setHours(2, 0, 0, 0);
   const hoursUntilReset = Math.ceil((quotaReset.getTime() - Date.now()) / (1000 * 60 * 60));

   throw new Error(
     `YouTube API quota exceeded. Quota resets at 2:00 AM (in ${hoursUntilReset} hours). ` +
     `Learn more: https://developers.google.com/youtube/v3/getting-started#quota`
   );
   ```

---

## Performance Optimization

Refer to `specs/001-youtube-connection/plan.md` for targets:
- OAuth: <5s
- Video sync (100 videos): <2min
- Transcription (10-min video): <5min
- pgvector search: <100ms

**Key Optimizations**:
1. Use pgvector IVFFlat index for similarity search
2. Batch embedding generation (up to 100 segments per API call)
3. React Query caching for video lists
4. Supabase Realtime instead of polling
5. Next.js static generation for dashboard pages

---

## Security Checklist

Before deploying any feature:

- [ ] RLS policies enabled on all tables
- [ ] OAuth tokens encrypted in database
- [ ] API keys never exposed to frontend
- [ ] Webhook signatures verified (n8n, Telegram)
- [ ] Rate limiting on public endpoints
- [ ] Input validation on all API routes
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] CORS policies restrict domains
- [ ] Environment variables never committed to git

---

## Need Help?

1. **Check spec.md** for user story context and acceptance criteria
2. **Check plan.md** for architecture decisions and tech stack
3. **Check tasks.md** for task list and dependencies
4. **Check research.md** for technical decisions and patterns
5. **Check constitution.md** for project principles
6. **Ask specific questions** with context about which task/user story

---

## Current Status

**Branch**: `001-youtube-connection`
**Phase**: Setup & Foundational (Tasks T001-T020)
**Next Milestone**: User Story 1 - Connect YouTube Channel (Tasks T021-T027)

**Completed Tasks**: See tasks.md (checkboxes marked [x])
**Blocked Tasks**: None (foundational phase complete unlocks all user stories)

**Documentation**: All specs complete and validated
**Ready for**: Active development 🚀
