-- ============================================================================
-- MATCHOP V2.2: SYMMETRIC MATCHING & TEST HELPERS
-- ============================================================================

-- 1. TRIGGER FOR STUDENT SWIPES (The Missing Link)
-- Handles case: Company swiped FIRST, then Student swipes SECOND.
CREATE OR REPLACE FUNCTION handle_student_swipe_match() RETURNS TRIGGER AS $$
BEGIN
    -- Only care about RIGHT swipes
    IF NEW.direction = 'right' THEN
        -- Check if Company ALREADY swiped RIGHT on this Student for this Offer
        IF EXISTS (
            SELECT 1 FROM company_swipes 
            WHERE company_id = (SELECT company_id FROM offers WHERE id = NEW.offer_id) -- Get company from offer
            AND student_id = NEW.student_id 
            AND offer_id = NEW.offer_id 
            AND direction = 'right'
        ) THEN
            -- Create Match
            INSERT INTO matches (student_id, offer_id, company_id)
            VALUES (
                NEW.student_id, 
                NEW.offer_id, 
                (SELECT company_id FROM offers WHERE id = NEW.offer_id)
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_student_swipe_match ON student_swipes;
CREATE TRIGGER on_student_swipe_match
    AFTER INSERT ON student_swipes
    FOR EACH ROW EXECUTE FUNCTION handle_student_swipe_match();


-- 2. DEBUG HELPER (Simulate Company Swipe)
-- Allows our Test Script to act as "InstaDeep" without logging in
CREATE OR REPLACE FUNCTION debug_company_swipe(
    target_student_id UUID,
    target_offer_id UUID,
    swipe_direction TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Admin
AS $$
DECLARE
    comp_id UUID;
    result JSONB;
BEGIN
    SELECT company_id INTO comp_id FROM offers WHERE id = target_offer_id;
    
    INSERT INTO company_swipes (company_id, student_id, offer_id, direction)
    VALUES (comp_id, target_student_id, target_offer_id, swipe_direction)
    ON CONFLICT (company_id, student_id, offer_id) 
    DO UPDATE SET direction = swipe_direction;

    RETURN jsonb_build_object('success', true, 'company_id', comp_id);
END;
$$;

SELECT '✅ Symmetric Triggers & Debug Tools Installed' as status;
