# Phase 0 Research: YouTube Channel Connection & Video Processing

**Feature**: 001-youtube-connection
**Created**: 2025-10-31
**Status**: Research Required

## Research Objectives

This research phase investigates technical unknowns before detailed design. Focus areas: YouTube OAuth flow in serverless environment, Whisper API chunking strategy, pgvector index optimization, and n8n-Vercel webhook patterns.

---

## R1: YouTube OAuth 2.0 in Serverless Functions

**Question**: How do we implement YouTube OAuth flow in stateless Vercel functions without session management?

**Why Critical**: OAuth requires state parameter validation and token exchange across multiple requests. Vercel functions are stateless.

**Research Tasks**:
1. **Test OAuth flow with googleapis package**:
   - Install `googleapis` npm package
   - Create test OAuth2 client with redirect URI pointing to Vercel API route
   - Verify state parameter can be validated using database or signed JWT
   - Test token storage and refresh mechanism with Supabase

2. **Validate scope requirements**:
   - Confirm `youtube.readonly` provides channel video list access
   - Confirm `youtube.force-ssl` enables caption upload
   - Test if OAuth consent screen displays correctly with these scopes

3. **Token refresh strategy**:
   - Access tokens expire in 1 hour - test refresh token flow
   - Design: Store refresh token encrypted, regenerate access token on-demand
   - Verify YouTube API returns 401 when token expired (trigger refresh)

**Expected Outcome**: Working code snippet for OAuth flow + token refresh logic

**Acceptance Criteria**:
- OAuth flow completes successfully in local Vercel dev environment
- Refresh tokens can generate new access tokens automatically
- Tokens stored encrypted in Supabase with proper RLS policies

---

## R2: Whisper API File Size & Chunking

**Question**: How do we handle large video files exceeding Whisper API's 25MB limit while preserving accurate timestamps?

**Why Critical**: Church sermons average 30-60 minutes (45-90MB audio). Must split without losing timestamp accuracy.

**Research Tasks**:
1. **Audio extraction testing**:
   - Use `yt-dlp` to download audio from sample YouTube video
   - Test format options: m4a, mp3, wav (which is smallest while maintaining quality?)
   - Measure audio file size for 10-min, 30-min, 60-min videos

2. **Chunking strategy**:
   - Split audio into <25MB chunks (use `ffmpeg` or similar)
   - Test Whisper API with overlapping vs. non-overlapping chunks
   - Verify timestamp alignment across chunk boundaries
   - Calculate: What duration fits in 25MB? (likely ~15 minutes for standard quality)

3. **Timestamp reconstruction**:
   - Design algorithm to merge chunk results with offset timestamps
   - Example: Chunk 2 starts at 15:00, Whisper returns [0:05, 0:12, ...] → Adjust to [15:05, 15:12, ...]
   - Test with sample video to verify accuracy ±2 seconds

**Expected Outcome**: Working chunking script + timestamp merge algorithm

**Acceptance Criteria**:
- Can process 60-minute video in chunks
- Timestamps accurate within 2 seconds of original
- Total processing time < 10 minutes for 60-min video

---

## R3: pgvector Index Performance

**Question**: What pgvector index configuration achieves <100ms similarity search for 150,000 transcript segments?

**Why Critical**: Each church with 1000 videos × 150 segments = 150K vectors. Query performance must be instant.

**Research Tasks**:
1. **Index type comparison**:
   - Test IVFFlat index (fast, approximate)
   - Test HNSW index (slower insert, faster query)
   - Benchmark query time with 10K, 50K, 100K, 150K vectors

2. **Index parameters**:
   - IVFFlat: Test `lists` parameter (100, 200, 500) - affects recall vs. speed tradeoff
   - HNSW: Test `m` and `ef_construction` parameters
   - Measure: Query time, recall accuracy (% of true top-10 found)

3. **Query optimization**:
   - Test with/without `WHERE church_id = ?` filter
   - Test `LIMIT 10` vs `LIMIT 50` (retrieve more, re-rank in application)
   - Test cosine distance `<=>` operator performance

**Expected Outcome**: Recommended index configuration + SQL query template

**Acceptance Criteria**:
- Query time < 100ms at 150K vectors (p95)
- Recall accuracy > 95% (finds 9.5/10 true nearest neighbors)
- Index creation time < 5 minutes per church

---

## R4: n8n Workflow Webhook Pattern

**Question**: How do Vercel and n8n communicate bidirectionally via webhooks without blocking Vercel function timeout?

**Why Critical**: Transcription takes 5+ minutes. Vercel functions timeout at 10 seconds (or 5 minutes max for background). Must use async pattern.

**Research Tasks**:
1. **Webhook trigger setup**:
   - Create test n8n workflow with Webhook trigger node
   - Test: Vercel POST request → n8n receives payload → n8n processes → n8n POSTs back to Vercel
   - Verify n8n can be triggered from Vercel API route

2. **Async response pattern**:
   - Vercel: Respond immediately to user (202 Accepted)
   - n8n: Process in background, POST result to Vercel `/api/webhooks/n8n`
   - Vercel webhook: Update database with result
   - User: Poll database or use Supabase Realtime for status

3. **Security**:
   - Test webhook signature verification (HMAC)
   - Store shared secret in environment variable
   - Verify n8n can sign requests and Vercel can validate

**Expected Outcome**: Working n8n workflow template + Vercel webhook handler

**Acceptance Criteria**:
- Vercel can trigger n8n workflow and respond < 1 second
- n8n can process for 10 minutes and callback to Vercel
- Webhook signatures validated correctly

---

## R5: Supabase Realtime for UI Updates

**Question**: How do we push processing status updates to the dashboard in real-time without polling?

**Why Critical**: User experience requires live progress indicators. Polling is inefficient and delays updates.

**Research Tasks**:
1. **Supabase Realtime setup**:
   - Enable Realtime on `videos` and `processing_jobs` tables
   - Subscribe to table changes in Next.js client component
   - Test: Update video status in database → UI updates within 1 second

2. **RLS with Realtime**:
   - Verify RLS policies work with Realtime subscriptions
   - Test: Church A user cannot see Church B updates
   - Design: Filter subscriptions by `church_id`

3. **Reconnection handling**:
   - Test behavior when user loses internet connection
   - Verify automatic reconnection when connection restored
   - Handle: Display "Connection lost" indicator in UI

**Expected Outcome**: React hook for subscribing to video status changes

**Acceptance Criteria**:
- Status updates appear in UI within 1 second of database change
- RLS prevents cross-church data leakage
- Graceful reconnection after network interruption

---

## R6: Caption Format Parsing

**Question**: What are the exact formats of YouTube caption tracks (SRT vs VTT) and how do we parse timestamps reliably?

**Why Critical**: Existing captions must be parsed correctly to avoid re-transcription (saves API cost & time).

**Research Tasks**:
1. **Format inspection**:
   - Download sample caption tracks from YouTube API
   - Identify: SRT format, VTT format, or proprietary format?
   - Document structure and encoding (UTF-8? other?)

2. **Parsing library selection**:
   - Test `subtitle` npm package or similar
   - Verify can parse both SRT and VTT
   - Extract: start_time, end_time, text for each segment

3. **Timestamp conversion**:
   - YouTube timestamps may be in HH:MM:SS or HH:MM:SS.mmm format
   - Convert to seconds (integer) for database storage and URL links
   - Test edge cases: Midnight rollover, sub-second precision

**Expected Outcome**: Caption parsing utility function

**Acceptance Criteria**:
- Can parse SRT and VTT formats
- Timestamps converted to seconds correctly
- Handles UTF-8 and special characters (Chinese, emoji)

---

## R7: OpenAI Embedding Generation Batch Optimization

**Question**: Can we batch embed multiple transcript segments in one API call to reduce latency and cost?

**Why Critical**: 1000 videos × 150 segments = 150K API calls if done individually. Batching reduces time and cost.

**Research Tasks**:
1. **Batch API testing**:
   - Test OpenAI embeddings API with array of input strings
   - Measure: How many segments can be embedded in one call? (API limit: 2048 inputs or 8191 tokens total)
   - Compare latency: 1 call with 100 inputs vs. 100 calls with 1 input each

2. **Cost analysis**:
   - text-embedding-3-small pricing: $0.00002 per 1K tokens
   - Calculate: Cost for 150K segments × avg 50 tokens = 7.5M tokens = $0.15 per church
   - Verify batching reduces cost (fewer API call overhead fees)

3. **Error handling**:
   - Test: What happens if one segment in batch fails?
   - Does entire batch fail or just one item?
   - Design retry logic for partial failures

**Expected Outcome**: Batch embedding function with optimal batch size

**Acceptance Criteria**:
- Can embed 100 segments in single API call
- Batch processing 10x faster than individual calls
- Partial failure handling prevents re-embedding successful items

---

## R8: Database Schema for Multi-Tenancy

**Question**: What foreign key structure and RLS policies ensure complete data isolation between churches?

**Why Critical**: A single missed `WHERE church_id = ?` filter could leak sensitive sermon content to wrong church.

**Research Tasks**:
1. **Schema design**:
   - Create ERD: churches → videos → transcripts → embeddings
   - Every child table has `church_id` foreign key (even if redundant)
   - Test: Can queries accidentally JOIN across church boundaries?

2. **RLS policy templates**:
   - Policy pattern: `USING (church_id = auth.church_id())`
   - Test SELECT, INSERT, UPDATE, DELETE operations
   - Verify policies enforce isolation even with SQL injection attempts

3. **Performance impact**:
   - Measure: RLS policy overhead (add 5ms? 10ms?)
   - Test with/without RLS on large dataset
   - Optimize: Create indexes on church_id columns

**Expected Outcome**: Complete database migration SQL with RLS policies

**Acceptance Criteria**:
- RLS policies prevent all cross-church data access
- Policy overhead < 10ms per query
- Schema passes multi-tenancy audit checklist

---

## R9: Error Message Localization

**Question**: How do we display actionable error messages in both Chinese and English based on church language preference?

**Why Critical**: Constitution requires actionable error messages. Must support multilingual churches.

**Research Tasks**:
1. **i18n library selection**:
   - Test `next-intl` or `react-i18next` with Next.js App Router
   - Verify can detect church language preference from database
   - Test: Error strings loaded dynamically based on locale

2. **Error message catalog**:
   - Create error code system (e.g., `ERR_YT_QUOTA_EXCEEDED`)
   - Map codes to localized messages with parameters
   - Example: `{code: "ERR_YT_QUOTA", params: {resetTime: "2:00 AM", hoursLeft: 4}}`
   - Render: "YouTube API quota exceeded. Quota resets at 2:00 AM (in 4 hours)."

3. **Fallback handling**:
   - If translation missing, display English with warning
   - Log missing translations for later addition
   - Test: Chinese user sees Chinese errors, English user sees English

**Expected Outcome**: Error message localization system + Chinese translations

**Acceptance Criteria**:
- All error messages from spec translated to Chinese
- Language preference loaded from church settings
- Fallback to English when translation missing

---

## Research Summary

**Total Research Items**: 9
**Estimated Time**: 3-5 days (assuming parallel work on independent items)

**Critical Path Dependencies**:
1. R1 (OAuth) → Blocks YouTube integration
2. R2 (Whisper chunking) → Blocks transcription
3. R3 (pgvector) → Blocks embedding search (Feature 002 dependency)
4. R4 (n8n webhooks) → Blocks async processing

**Can Be Parallelized**:
- R5 (Realtime) - frontend work, independent of backend
- R6 (Caption parsing) - utility function, independent
- R7 (Batch embeddings) - optimization, can be added later
- R8 (Schema) - foundational, can start immediately
- R9 (i18n) - UI work, independent

**Recommended Order**:
1. **Day 1**: R8 (Schema) + R1 (OAuth) - foundational
2. **Day 2**: R4 (n8n webhooks) + R6 (Caption parsing) - processing pipeline
3. **Day 3**: R2 (Whisper chunking) + R7 (Batch embeddings) - transcription optimization
4. **Day 4**: R3 (pgvector) + R5 (Realtime) - search performance + UX
5. **Day 5**: R9 (i18n) + testing integration - polish

**Success Criteria for Phase 0 Completion**:
- All 9 research items have "Expected Outcome" artifacts created
- All "Acceptance Criteria" validated with working code
- Technical unknowns resolved, ready for Phase 1 detailed design
