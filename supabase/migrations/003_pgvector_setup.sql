-- Migration: 003_pgvector_setup
-- Description: Enable pgvector extension and create indexes for semantic search
-- Constitutional Principle: Incremental Processing
-- Enables fast vector similarity search for sermon content

-- ============================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ============================================

-- pgvector provides vector data type and similarity functions
-- Must be enabled before using vector columns
CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON EXTENSION vector IS 'pgvector extension for vector similarity search (cosine distance, dot product)';

-- ============================================
-- 2. CREATE IVFFLAT INDEX FOR FAST SEARCH
-- ============================================

-- IVFFlat index dramatically speeds up similarity search
-- Configuration:
--   - lists: Number of clusters (rule of thumb: sqrt(rows)/2)
--   - For 150K vectors: lists = sqrt(150000)/2 ≈ 193
--   - We use 200 as a round number
--   - vector_cosine_ops: Use cosine distance for similarity

-- Note: This index is created AFTER data exists for best performance
-- For now, create with small lists value, rebuild later with more data

CREATE INDEX IF NOT EXISTS idx_transcripts_embedding
  ON public.transcripts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON INDEX idx_transcripts_embedding IS 'IVFFlat index for fast cosine similarity search. Rebuild with more lists as data grows.';

-- ============================================
-- 3. SIMILARITY SEARCH FUNCTION
-- ============================================

-- Function to search transcripts by semantic similarity
-- Returns top 10 most relevant segments for a query embedding

CREATE OR REPLACE FUNCTION public.search_transcripts(
  query_embedding vector(1536),
  match_church_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  segment_index INT,
  start_time FLOAT,
  end_time FLOAT,
  text TEXT,
  language TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.video_id,
    t.segment_index,
    t.start_time,
    t.end_time,
    t.text,
    t.language,
    1 - (t.embedding <=> query_embedding) AS similarity -- Cosine similarity (1 - cosine distance)
  FROM public.transcripts t
  WHERE t.church_id = match_church_id
    AND t.embedding IS NOT NULL
  ORDER BY t.embedding <=> query_embedding -- Order by cosine distance (ascending = most similar first)
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.search_transcripts IS 'Semantic search using cosine similarity. Returns top N most relevant transcript segments for a query embedding.';

-- ============================================
-- 4. REBUILD INDEX FUNCTION (For Admin Use)
-- ============================================

-- Function to rebuild index with optimal lists parameter
-- Call this after significant data growth (e.g., every 10K new embeddings)

CREATE OR REPLACE FUNCTION public.rebuild_embedding_index()
RETURNS TEXT AS $$
DECLARE
  row_count BIGINT;
  optimal_lists INT;
BEGIN
  -- Count rows with embeddings
  SELECT COUNT(*) INTO row_count
  FROM public.transcripts
  WHERE embedding IS NOT NULL;

  -- Calculate optimal lists: sqrt(rows)/2
  optimal_lists := GREATEST(FLOOR(SQRT(row_count) / 2), 100);

  -- Drop existing index
  DROP INDEX IF EXISTS public.idx_transcripts_embedding;

  -- Recreate with optimal lists
  EXECUTE format('
    CREATE INDEX idx_transcripts_embedding
    ON public.transcripts
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = %s)
  ', optimal_lists);

  RETURN format('Index rebuilt with %s lists for %s rows', optimal_lists, row_count);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.rebuild_embedding_index IS 'Rebuild embedding index with optimal lists parameter based on current data size. Run after significant data growth.';

-- ============================================
-- 5. PERFORMANCE STATISTICS
-- ============================================

-- View to monitor search performance
CREATE OR REPLACE VIEW public.embedding_stats AS
SELECT
  COUNT(*) AS total_transcripts,
  COUNT(embedding) AS transcripts_with_embeddings,
  COUNT(DISTINCT church_id) AS churches_with_embeddings,
  COUNT(DISTINCT video_id) AS videos_with_embeddings,
  ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) AS embedding_coverage_percent
FROM public.transcripts;

COMMENT ON VIEW public.embedding_stats IS 'Statistics about embedding coverage for monitoring search readiness';

-- ============================================
-- 6. SEARCH PERFORMANCE NOTES
-- ============================================

-- Expected Performance (from plan.md):
--   - Target: <100ms for similarity search across 150K vectors
--   - IVFFlat provides 10-100x speedup vs sequential scan
--   - Accuracy: ~95% recall with proper lists configuration
--
-- Monitoring:
--   - Use EXPLAIN ANALYZE to check query plans
--   - Should use "Index Scan using idx_transcripts_embedding"
--   - If using "Seq Scan", index needs rebuilding or query needs optimization
--
-- Optimization:
--   - Rebuild index when data size doubles
--   - Consider upgrading Supabase tier for more memory if search is slow
--   - Can use vector_ip_ops (inner product) instead of cosine for normalized embeddings
