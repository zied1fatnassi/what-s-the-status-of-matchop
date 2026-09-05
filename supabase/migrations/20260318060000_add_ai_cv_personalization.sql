-- ============================================================================
-- MATCHOP: AI CV PERSONALIZATION FOR INTERNAL OFFERS
-- ============================================================================
-- Tracks student's original master DOCX and offer-specific personalized CVs,
-- updates intro->match promotion trigger, and upgrades intro RPCs.
-- ============================================================================

-- 1. Track original DOCX and personalized CV URLs
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS original_docx_url TEXT;

ALTER TABLE intros 
ADD COLUMN IF NOT EXISTS personalized_cv_url TEXT;

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS personalized_cv_url TEXT;

-- 2. Update intro -> match promotion trigger to retain personalized_cv_url
CREATE OR REPLACE FUNCTION handle_intro_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO matches (student_id, offer_id, company_id, status, matched_at, personalized_cv_url)
        VALUES (NEW.student_id, NEW.offer_id, NEW.company_id, 'matched', NOW(), NEW.personalized_cv_url)
        ON CONFLICT (student_id, offer_id) DO UPDATE
        SET personalized_cv_url = EXCLUDED.personalized_cv_url;

        NEW.reviewed_at := NOW();
    END IF;

    IF NEW.status = 'declined' AND (OLD.status IS NULL OR OLD.status != 'declined') THEN
        NEW.reviewed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update create_intro_from_swipe to accept personalized_cv_url
CREATE OR REPLACE FUNCTION create_intro_from_swipe(
    p_student_id UUID,
    p_offer_id UUID,
    p_icebreaker TEXT DEFAULT NULL,
    p_personalized_cv_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_company_id UUID;
    v_match_score INT;
    v_intro_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM offers WHERE id = p_offer_id AND status = 'active';

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Offer not found or inactive');
    END IF;

    v_match_score := calculate_match_score(p_student_id, p_offer_id);

    INSERT INTO intros (student_id, offer_id, company_id, match_score, icebreaker, personalized_cv_url)
    VALUES (p_student_id, p_offer_id, v_company_id, v_match_score, p_icebreaker, p_personalized_cv_url)
    ON CONFLICT (student_id, offer_id) DO UPDATE
    SET personalized_cv_url = COALESCE(EXCLUDED.personalized_cv_url, intros.personalized_cv_url)
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

-- 4. Update get_company_intros to return personalized_cv_url
DROP FUNCTION IF EXISTS get_company_intros(UUID, TEXT, INT, INT);

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
    expires_at TIMESTAMPTZ,
    personalized_cv_url TEXT
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
        i.expires_at,
        i.personalized_cv_url
    FROM intros i
    JOIN students s ON i.student_id = s.id
    JOIN offers o ON i.offer_id = o.id
    WHERE i.company_id = p_company_id
    AND i.status = p_status
    ORDER BY i.match_score DESC, i.created_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
