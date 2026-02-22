-- ============================================================================
-- MATCHOP V3: ADVANCED MATCHING ENGINE
-- Run this AFTER refactor_v2.sql
-- ============================================================================

-- 1. EXTENSIONS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS gis;

DO $$
DECLARE
    _schema text;
    _owner text;
BEGIN
    SELECT n.nspname, pg_get_userbyid(e.extowner)
    INTO _schema, _owner
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm'
    LIMIT 1;

    IF _schema IS NOT NULL AND _schema <> 'extensions' THEN
        IF _owner = current_user THEN
            EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
        ELSE
            RAISE EXCEPTION
                'Extension "pg_trgm" is in schema "%" and owned by "%". Current role "%" cannot move it to "extensions".',
                _schema,
                coalesce(_owner, '<unknown>'),
                current_user;
        END IF;
    END IF;
END
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    _schema text;
    _owner text;
BEGIN
    SELECT n.nspname, pg_get_userbyid(e.extowner)
    INTO _schema, _owner
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis'
    LIMIT 1;

    IF _schema IS NOT NULL AND _schema <> 'gis' THEN
        IF _owner = current_user THEN
            EXECUTE 'ALTER EXTENSION postgis SET SCHEMA gis';
        ELSE
            RAISE EXCEPTION
                'Extension "postgis" is in schema "%" and owned by "%". Current role "%" cannot move it to "gis".',
                _schema,
                coalesce(_owner, '<unknown>'),
                current_user;
        END IF;
    END IF;
END
$$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA gis;

-- 2. SCHEMA UPDATES (Adding Brains & Maps)
-- ============================================================================

-- A. Profiles (Add Elo Score)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS elo_score INT DEFAULT 1000;

-- B. Students (Add Geospatial Location)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS location_point gis.GEOGRAPHY(Point);

-- B2. Companies (Add Geospatial Location)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS location_point gis.GEOGRAPHY(Point);

-- C. Offers (Add Geospatial Location)
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS location_point gis.GEOGRAPHY(Point);


-- 3. INDEXES (for Speed)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_offers_location ON offers USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_students_location ON students USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_offers_req_skills ON offers USING GIN(req_skills);
CREATE INDEX IF NOT EXISTS idx_students_skills ON students USING GIN(skills);


-- 4. MATCHING LOGIC V3 (The Brain)
-- ============================================================================

-- A. Helper: Calculate Distance (in km)
CREATE OR REPLACE FUNCTION get_distance_km(p1 gis.GEOGRAPHY, p2 gis.GEOGRAPHY)
RETURNS INT AS $$
BEGIN
    RETURN (gis.ST_Distance(p1, p2) / 1000)::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- B. Helper: Calculate Skill Similarity (0.0 to 1.0)
-- Using simple intersection ratio
CREATE OR REPLACE FUNCTION get_skill_score(student_skills TEXT[], offer_skills TEXT[])
RETURNS FLOAT AS $$
DECLARE
    intersection_count INT;
    total_req_count INT;
BEGIN
    IF offer_skills IS NULL OR array_length(offer_skills, 1) IS NULL THEN
        RETURN 1.0; -- No skills required? Perfect match!
    END IF;

    SELECT COUNT(*) INTO intersection_count
    FROM (SELECT UNNEST(student_skills) INTERSECT SELECT UNNEST(offer_skills)) as i;
    
    total_req_count := array_length(offer_skills, 1);
    
    RETURN (intersection_count::FLOAT / total_req_count::FLOAT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- C. RECOMMENDATION RPC (Called by Edge Function or Frontend)
-- Returns top recommended offers for a student
CREATE OR REPLACE FUNCTION recommend_matches_rpc(
    student_uuid UUID,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0,
    max_distance_km INT DEFAULT 100 -- Filter by distance
)
RETURNS TABLE (
    offer_id UUID,
    title TEXT,
    company_name TEXT,
    company_logo TEXT,
    match_score INT,       -- 0 to 100
    skill_match_pct INT,   -- 0 to 100
    distance_km INT,
    recency_bonus INT
) AS $$
DECLARE
    s_loc gis.GEOGRAPHY;
    s_skills TEXT[];
BEGIN
    -- Get Student Context
    SELECT location_point, skills INTO s_loc, s_skills 
    FROM students WHERE id = student_uuid;

    RETURN QUERY
    SELECT 
        o.id,
        o.title,
        c.company_name,
        c.logo_url,
        (
            (get_skill_score(s_skills, o.req_skills) * 60) + -- 60% weight to Skills
            (CASE WHEN gis.ST_DWithin(s_loc, o.location_point, max_distance_km * 1000) THEN 30 ELSE 0 END) + -- 30% weight Distance
            (CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END) -- 10% Recency
        )::INT as score,
        (get_skill_score(s_skills, o.req_skills) * 100)::INT as skill_match_pct,
        get_distance_km(s_loc, o.location_point) as dist_km,
        (CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END) as recency
    FROM offers o
    JOIN companies c ON o.company_id = c.id
    WHERE o.status = 'active'
    AND NOT EXISTS (
        -- Exclude already swiped offers
        SELECT 1 FROM student_swipes sw 
        WHERE sw.student_id = student_uuid AND sw.offer_id = o.id
    )
    -- Distance Filter (if student has location)
    AND (s_loc IS NULL OR gis.ST_DWithin(s_loc, o.location_point, max_distance_km * 1000))
    ORDER BY score DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Matchop V3 Engine Applied (PostGIS + Advanced Scoring)' as status;
