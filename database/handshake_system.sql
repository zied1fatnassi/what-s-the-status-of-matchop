-- ============================================================================
-- MATCHOP V4: HANDSHAKE SYSTEM (Engagement Decay + Intro Pipeline)
-- Run AFTER matching_engine.sql
-- ============================================================================
-- This migration transforms the "passive swipe-and-wait" model into an
-- "active handshake" model. It introduces:
--   1. Activity tracking (last_active_at) on profiles
--   2. Engagement decay scoring in the recommendation engine
--   3. An "intros" table that replaces the silent swipe-to-match flow
--   4. Automated intro-to-match promotion on company acceptance
-- ============================================================================

-- ============================================================================
-- 1. ACTIVITY TRACKING
-- ============================================================================

-- A. Add last_active_at to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- B. Initialize last_active_at from existing data
UPDATE profiles
SET last_active_at = COALESCE(updated_at, created_at, NOW())
WHERE last_active_at IS NULL;

-- C. Function to update activity timestamp
-- Called by triggers on swipes, messages, profile updates
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine which user to update based on the source table
    CASE TG_TABLE_NAME
        WHEN 'student_swipes' THEN target_user_id := NEW.student_id;
        WHEN 'company_swipes' THEN target_user_id := NEW.company_id;
        WHEN 'messages'       THEN target_user_id := NEW.sender_id;
        WHEN 'profiles'       THEN target_user_id := NEW.id;
        WHEN 'students'       THEN target_user_id := NEW.id;
        WHEN 'companies'      THEN target_user_id := NEW.id;
        WHEN 'offers'         THEN target_user_id := NEW.company_id;
        ELSE target_user_id := NULL;
    END CASE;

    IF target_user_id IS NOT NULL THEN
        UPDATE profiles
        SET last_active_at = NOW()
        WHERE id = target_user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Activity tracking triggers
-- Fire on every significant user action
CREATE TRIGGER track_activity_student_swipe
    AFTER INSERT ON student_swipes
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER track_activity_company_swipe
    AFTER INSERT ON company_swipes
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER track_activity_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER track_activity_student_profile
    AFTER UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER track_activity_company_profile
    AFTER UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER track_activity_offer_post
    AFTER INSERT ON offers
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();


-- ============================================================================
-- 2. ENGAGEMENT DECAY — UPDATED RECOMMENDATION ENGINE
-- ============================================================================

-- Rewrite recommend_matches_rpc to factor in company activity decay
-- Scoring formula:
--   Base Score = (Skill Match × 60) + (Distance × 30) + (Recency × 10)
--   Final Score = Base Score × Activity Multiplier
--   Activity Multiplier:
--     Active in last 7 days  → 1.0
--     Active in 7–30 days    → 0.6
--     Inactive 30+ days      → 0.3

-- Drop old version first: return type changed (added company_active column)
DROP FUNCTION IF EXISTS recommend_matches_rpc(UUID, INT, INT, INT);

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
    recency_bonus INT,
    company_active BOOLEAN
) AS $$
DECLARE
    s_loc GEOGRAPHY;
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
        -- Final score with engagement decay multiplier
        (
            (
                (get_skill_score(s_skills, o.req_skills) * 60) +
                (CASE WHEN s_loc IS NOT NULL AND o.location_point IS NOT NULL
                      AND ST_DWithin(s_loc, o.location_point, max_distance_km * 1000)
                 THEN 30 ELSE 0 END) +
                (CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END)
            )
            *
            -- Activity Multiplier (engagement decay)
            (CASE
                WHEN p.last_active_at > NOW() - INTERVAL '7 days'  THEN 1.0
                WHEN p.last_active_at > NOW() - INTERVAL '30 days' THEN 0.6
                ELSE 0.3
            END)
        )::INT as score,
        (get_skill_score(s_skills, o.req_skills) * 100)::INT as skill_match_pct,
        CASE WHEN s_loc IS NOT NULL AND o.location_point IS NOT NULL
             THEN get_distance_km(s_loc, o.location_point)
             ELSE NULL
        END as dist_km,
        (CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END) as recency,
        -- Flag: is the company active?
        (p.last_active_at > NOW() - INTERVAL '7 days') as is_company_active
    FROM offers o
    JOIN companies c ON o.company_id = c.id
    JOIN profiles p ON c.id = p.id
    WHERE o.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM student_swipes sw
        WHERE sw.student_id = student_uuid AND sw.offer_id = o.id
    )
    AND (s_loc IS NULL OR o.location_point IS NULL
         OR ST_DWithin(s_loc, o.location_point, max_distance_km * 1000))
    ORDER BY score DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. INTROS TABLE (The Handshake Pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    icebreaker TEXT,
    match_score INT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(student_id, offer_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_intros_company ON intros(company_id);
CREATE INDEX IF NOT EXISTS idx_intros_student ON intros(student_id);
CREATE INDEX IF NOT EXISTS idx_intros_status ON intros(status);
CREATE INDEX IF NOT EXISTS idx_intros_expires ON intros(expires_at) WHERE status = 'pending';


-- ============================================================================
-- 4. INTRO → MATCH PROMOTION TRIGGER
-- ============================================================================
-- When a company accepts an intro, automatically create a match record
-- and open a chat channel.

CREATE OR REPLACE FUNCTION handle_intro_accepted()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire when status changes to 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        -- Create the match
        INSERT INTO matches (student_id, offer_id, company_id, status, matched_at)
        VALUES (NEW.student_id, NEW.offer_id, NEW.company_id, 'matched', NOW())
        ON CONFLICT (student_id, offer_id) DO NOTHING;

        -- Set reviewed timestamp
        NEW.reviewed_at := NOW();
    END IF;

    -- Set reviewed_at on decline too
    IF NEW.status = 'declined' AND (OLD.status IS NULL OR OLD.status != 'declined') THEN
        NEW.reviewed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_intro_accepted
    BEFORE UPDATE ON intros
    FOR EACH ROW EXECUTE FUNCTION handle_intro_accepted();


-- ============================================================================
-- 5. HELPER: Create Intro from Student Swipe
-- ============================================================================
-- Called by the frontend when a student swipes right on an internal offer.
-- Calculates match score and creates the intro record.

CREATE OR REPLACE FUNCTION create_intro_from_swipe(
    p_student_id UUID,
    p_offer_id UUID,
    p_icebreaker TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_company_id UUID;
    v_match_score INT;
    v_intro_id UUID;
BEGIN
    -- Get the company that owns this offer
    SELECT company_id INTO v_company_id
    FROM offers WHERE id = p_offer_id AND status = 'active';

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Offer not found or inactive');
    END IF;

    -- Calculate match score
    v_match_score := calculate_match_score(p_student_id, p_offer_id);

    -- Create the intro
    INSERT INTO intros (student_id, offer_id, company_id, match_score, icebreaker)
    VALUES (p_student_id, p_offer_id, v_company_id, v_match_score, p_icebreaker)
    ON CONFLICT (student_id, offer_id) DO NOTHING
    RETURNING id INTO v_intro_id;

    IF v_intro_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Intro already exists');
    END IF;

    RETURN json_build_object(
        'success', true,
        'intro_id', v_intro_id,
        'match_score', v_match_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 6. JANITOR: Expire Stale Intros + Update Elo
-- ============================================================================
-- Called by the scheduled edge function every 24 hours.

CREATE OR REPLACE FUNCTION run_daily_janitor()
RETURNS JSON AS $$
DECLARE
    expired_count INT;
    elo_updated_count INT;
BEGIN
    -- A. Expire intros older than 7 days
    UPDATE intros
    SET status = 'expired', reviewed_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- B. Recalculate elo_score based on 7-day activity window
    -- Active users gain elo, inactive users decay
    UPDATE profiles
    SET elo_score = CASE
        WHEN last_active_at > NOW() - INTERVAL '1 day'   THEN LEAST(elo_score + 10, 2000)
        WHEN last_active_at > NOW() - INTERVAL '7 days'  THEN elo_score  -- no change
        WHEN last_active_at > NOW() - INTERVAL '30 days' THEN GREATEST(elo_score - 20, 200)
        ELSE GREATEST(elo_score - 50, 100)
    END;

    GET DIAGNOSTICS elo_updated_count = ROW_COUNT;

    RETURN json_build_object(
        'expired_intros', expired_count,
        'elo_updated_profiles', elo_updated_count,
        'run_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 7. PENDING INTROS VIEW FOR COMPANIES
-- ============================================================================
-- Returns all pending intros for a given company, with student details.

CREATE OR REPLACE FUNCTION get_company_intros(
    p_company_id UUID,
    p_status TEXT DEFAULT 'pending',
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    intro_id UUID,
    student_id UUID,
    offer_id UUID,
    student_name TEXT,
    student_skills TEXT[],
    student_location TEXT,
    student_avatar TEXT,
    student_bio TEXT,
    offer_title TEXT,
    match_score INT,
    icebreaker TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.student_id,
        i.offer_id,
        s.display_name,
        s.skills,
        s.location,
        s.avatar_url,
        s.bio,
        o.title,
        i.match_score,
        i.icebreaker,
        i.status,
        i.created_at,
        i.expires_at
    FROM intros i
    JOIN students s ON i.student_id = s.id
    JOIN offers o ON i.offer_id = o.id
    WHERE i.company_id = p_company_id
    AND i.status = p_status
    ORDER BY i.match_score DESC, i.created_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 8. RLS POLICIES FOR INTROS
-- ============================================================================
ALTER TABLE intros ENABLE ROW LEVEL SECURITY;

-- Students can see their own intros (read-only)
CREATE POLICY "Students view own intros"
    ON intros FOR SELECT
    USING (student_id = auth.uid());

-- Companies can see intros sent to them
CREATE POLICY "Companies view their intros"
    ON intros FOR SELECT
    USING (company_id = auth.uid());

-- Companies can update intro status (accept/decline)
CREATE POLICY "Companies update intro status"
    ON intros FOR UPDATE
    USING (company_id = auth.uid())
    WITH CHECK (company_id = auth.uid());

-- Intros are created via the RPC function (SECURITY DEFINER), so no INSERT policy
-- needed for direct table access. But if the frontend calls insert directly:
CREATE POLICY "Students create intros"
    ON intros FOR INSERT
    WITH CHECK (student_id = auth.uid());


-- ============================================================================
-- 9. UPDATE last_active_at ON LOGIN (called from frontend)
-- ============================================================================

CREATE OR REPLACE FUNCTION touch_activity()
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET last_active_at = NOW()
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- DONE
-- ============================================================================
SELECT '✅ MatchOp V4 Handshake System Applied (Engagement Decay + Intro Pipeline)' as status;
