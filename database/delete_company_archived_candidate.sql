-- ============================================================================
-- MATCHOP: Permanent Deletion of Archived Candidates / Matches / Intros
-- ============================================================================

-- 1. RPC Function to permanently delete archived candidate data for a company
CREATE OR REPLACE FUNCTION delete_company_archived_candidate(
    p_match_id UUID DEFAULT NULL,
    p_intro_id UUID DEFAULT NULL,
    p_student_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID := auth.uid();
BEGIN
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete match and its cascading messages
    IF p_match_id IS NOT NULL THEN
        DELETE FROM messages WHERE match_id = p_match_id;
        DELETE FROM matches WHERE id = p_match_id AND company_id = v_company_id;
    END IF;

    -- Delete by student_id for this company
    IF p_student_id IS NOT NULL THEN
        DELETE FROM messages WHERE match_id IN (
            SELECT id FROM matches WHERE company_id = v_company_id AND student_id = p_student_id
        );
        DELETE FROM matches WHERE company_id = v_company_id AND student_id = p_student_id;
        DELETE FROM intros WHERE company_id = v_company_id AND student_id = p_student_id;
    END IF;

    -- Delete intro if specified
    IF p_intro_id IS NOT NULL THEN
        DELETE FROM intros WHERE id = p_intro_id AND company_id = v_company_id;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_company_archived_candidate TO authenticated;

-- 2. Direct DELETE RLS Policies for authenticated companies
DO $$
BEGIN
    -- Policy for matches
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'matches_delete_company'
    ) THEN
        CREATE POLICY "matches_delete_company"
            ON matches FOR DELETE TO authenticated
            USING (company_id = auth.uid());
    END IF;

    -- Policy for intros
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'intros' AND policyname = 'intros_delete_company'
    ) THEN
        CREATE POLICY "intros_delete_company"
            ON intros FOR DELETE TO authenticated
            USING (company_id = auth.uid());
    END IF;

    -- Policy for messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_delete_company'
    ) THEN
        CREATE POLICY "messages_delete_company"
            ON messages FOR DELETE TO authenticated
            USING (
                sender_id = auth.uid()
                OR match_id IN (SELECT id FROM matches WHERE company_id = auth.uid())
            );
    END IF;
END $$;
