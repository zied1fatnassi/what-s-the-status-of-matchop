-- ============================================================
-- PHASE 2: Vector Matching SQL Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Ensure extension schema and pgvector placement are deterministic
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

DO $$
DECLARE
    _vector_schema text;
    _vector_owner text;
BEGIN
    SELECT n.nspname, pg_get_userbyid(e.extowner)
    INTO _vector_schema, _vector_owner
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector'
    LIMIT 1;

    IF _vector_schema IS NOT NULL AND _vector_schema <> 'extensions' THEN
        IF _vector_owner = current_user THEN
            EXECUTE 'ALTER EXTENSION vector SET SCHEMA extensions';
        ELSE
            RAISE EXCEPTION
                'Extension "vector" is in schema "%" and owned by "%". Current role "%" cannot move it to "extensions".',
                _vector_schema,
                coalesce(_vector_owner, '<unknown>'),
                current_user;
        END IF;
    END IF;
END
$$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Step 2-4: Only apply to projects where base app tables exist.
DO $$
BEGIN
    IF to_regclass('public.students') IS NULL OR to_regclass('public.offers') IS NULL THEN
        RAISE NOTICE 'Skipping vector matching setup because public.students/public.offers do not exist yet.';
        RETURN;
    END IF;

    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);
    ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);

    -- Note: IVFFlat index requires at least some rows with embeddings.
    -- We use HNSW here, which also works when tables are empty.
    CREATE INDEX IF NOT EXISTS students_embedding_idx ON public.students
    USING hnsw (embedding extensions.vector_cosine_ops);

    CREATE INDEX IF NOT EXISTS offers_embedding_idx ON public.offers
    USING hnsw (embedding extensions.vector_cosine_ops);

    EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.match_jobs_for_student(
        student_embedding extensions.vector(384),
        excluded_ids uuid[] DEFAULT '{}',
        match_count int DEFAULT 20
    )
    RETURNS TABLE (
        id uuid,
        title text,
        description text,
        company_id uuid,
        location text,
        type text,
        salary_range text,
        req_skills text[],
        status text,
        created_at timestamptz,
        similarity float
    )
    LANGUAGE plpgsql
    AS $body$
    BEGIN
        RETURN QUERY
        SELECT
            o.id,
            o.title,
            o.description,
            o.company_id,
            o.location,
            o.type,
            o.salary_range,
            o.req_skills,
            o.status,
            o.created_at,
            1 - (o.embedding <=> student_embedding) as similarity
        FROM public.offers o
        WHERE o.status = 'active'
          AND o.embedding IS NOT NULL
          AND (array_length(excluded_ids, 1) IS NULL OR o.id != ALL(excluded_ids))
        ORDER BY o.embedding <=> student_embedding
        LIMIT match_count;
    END;
    $body$;
    $fn$;

    GRANT EXECUTE ON FUNCTION public.match_jobs_for_student(extensions.vector, uuid[], integer) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.match_jobs_for_student(extensions.vector, uuid[], integer) TO anon;
END
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICATION: Test the setup
-- ============================================================
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'students' AND column_name = 'embedding';
