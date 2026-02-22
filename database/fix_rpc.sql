-- Drop the existing function to ensure we can recreate it with correct attributes
DROP FUNCTION IF EXISTS recommend_matches_rpc(uuid,int,int,int);

-- Recreate it with SECURITY DEFINER
CREATE OR REPLACE FUNCTION recommend_matches_rpc(
    student_uuid UUID,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0,
    max_distance_km INT DEFAULT 100
)
RETURNS TABLE (
    offer_id UUID,
    title TEXT,
    company_name TEXT,
    company_logo TEXT,
    match_score INT,       
    skill_match_pct INT,   
    distance_km INT,
    recency_bonus INT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- <--- CRITICAL CHANGE: Runs as Admin
AS $$
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
            (get_skill_score(s_skills, o.req_skills) * 60) + 
            (CASE WHEN gis.ST_DWithin(s_loc, o.location_point, max_distance_km * 1000) THEN 30 ELSE 0 END) + 
            (CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END)
        )::INT as score,
        (get_skill_score(s_skills, o.req_skills) * 100)::INT as skill_match_pct,
        get_distance_km(s_loc, o.location_point) as dist_km,
        (CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END) as recency
    FROM offers o
    JOIN companies c ON o.company_id = c.id
    WHERE o.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM student_swipes sw 
        WHERE sw.student_id = student_uuid AND sw.offer_id = o.id
    )
    AND (s_loc IS NULL OR gis.ST_DWithin(s_loc, o.location_point, max_distance_km * 1000))
    ORDER BY score DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;
