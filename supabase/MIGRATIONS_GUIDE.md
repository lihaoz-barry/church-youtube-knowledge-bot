# Database Migrations Guide

## Quick Start: Apply Migrations via Supabase Dashboard

Since Supabase CLI requires additional authentication setup, the easiest way to apply migrations is through the Supabase Dashboard:

### Step 1: Open SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `church-youtube-bot-staging` (cwiehstggqlxafglkkda)
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run Migrations in Order

Copy and paste each migration file content into the SQL editor and click **RUN**:

#### Migration 1: Initial Schema
1. Open `supabase/migrations/001_initial_schema.sql`
2. Copy all content
3. Paste into SQL Editor
4. Click **RUN**
5. ✅ Should see: "Success. No rows returned"

#### Migration 2: RLS Policies
1. Open `supabase/migrations/002_rls_policies.sql`
2. Copy all content
3. Paste into SQL Editor
4. Click **RUN**
5. ✅ Should see: "Success. No rows returned"

#### Migration 3: pgvector Setup
1. Open `supabase/migrations/003_pgvector_setup.sql`
2. Copy all content
3. Paste into SQL Editor
4. Click **RUN**
5. ✅ Should see: "Success. No rows returned"

#### Migration 4: Functions
1. Open `supabase/migrations/004_functions.sql`
2. Copy all content
3. Paste into SQL Editor
4. Click **RUN**
5. ✅ Should see: "Success. No rows returned"

### Step 3: Verify Tables Created

In SQL Editor, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- ✅ churches
- ✅ oauth_tokens
- ✅ videos
- ✅ transcripts
- ✅ processing_jobs

### Step 4: Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('churches', 'oauth_tokens', 'videos', 'transcripts', 'processing_jobs');
```

All tables should show `rowsecurity = true`

### Step 5: Verify pgvector Extension

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Should return one row with `vector` extension

---

## Alternative: Use Supabase CLI (Advanced)

If you prefer using the CLI:

### Setup

```bash
# Install Supabase CLI globally (if not already)
npm install -g supabase

# Login (will open browser for authentication)
supabase login

# Link to your project
supabase link --project-ref cwiehstggqlxafglkkda
```

### Apply Migrations

```bash
# Push all migrations to remote database
supabase db push

# Or apply specific migration
supabase db push --file supabase/migrations/001_initial_schema.sql
```

### Generate TypeScript Types

```bash
# Generate types from remote database
npx supabase gen types typescript --project-id cwiehstggqlxafglkkda > lib/supabase/types.ts
```

---

## Rollback (If Needed)

If you need to undo migrations:

```sql
-- Drop all tables (careful - deletes all data!)
DROP TABLE IF EXISTS public.processing_jobs CASCADE;
DROP TABLE IF EXISTS public.transcripts CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.oauth_tokens CASCADE;
DROP TABLE IF EXISTS public.churches CASCADE;

-- Drop functions and views
DROP FUNCTION IF EXISTS public.search_transcripts CASCADE;
DROP FUNCTION IF EXISTS public.rebuild_embedding_index CASCADE;
DROP FUNCTION IF EXISTS public.get_user_church_id CASCADE;
DROP VIEW IF EXISTS public.church_stats CASCADE;
DROP VIEW IF EXISTS public.embedding_stats CASCADE;

-- Disable extension (optional)
DROP EXTENSION IF EXISTS vector;
```

---

## Verification Checklist

After running all migrations:

- [ ] Tables created (churches, oauth_tokens, videos, transcripts, processing_jobs)
- [ ] RLS enabled on all tables
- [ ] pgvector extension enabled
- [ ] Indexes created (check with `\di` in psql or view in Dashboard → Database → Indexes)
- [ ] Functions created (search_transcripts, rebuild_embedding_index, etc.)
- [ ] Views created (church_stats, embedding_stats)
- [ ] No errors in SQL Editor

---

## Next Steps

After migrations are applied:

1. Generate TypeScript types (see below)
2. Test database connection from Next.js app
3. Create test church record
4. Test RLS policies

---

## Generate TypeScript Types

### Option 1: Via Supabase CLI

```bash
npx supabase gen types typescript --project-id cwiehstggqlxafglkkda > lib/supabase/types.ts
```

### Option 2: Via Supabase Dashboard

1. Go to **Settings** → **API**
2. Scroll to **API Documentation**
3. Click **Generate Types**
4. Copy the generated TypeScript code
5. Paste into `lib/supabase/types.ts`

---

## Troubleshooting

### Error: "extension 'vector' already exists"
- This is OK - extension was already enabled in Supabase dashboard
- Migration 003 has `CREATE EXTENSION IF NOT EXISTS vector` which safely handles this

### Error: "relation already exists"
- You may have already run a migration
- Check existing tables with: `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`
- Drop tables if needed and re-run migrations

### Error: "permission denied"
- Make sure you're using the correct project
- Check you have admin access to the Supabase project
