-- =====================================================
-- REPORT & BLOCK SYSTEM - DATABASE SCHEMA
-- Phase 1: User Safety Features
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- REPORTED USERS TABLE
-- Stores user reports for fake profiles, spam, harassment
-- =====================================================
CREATE TABLE reported_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake_profile', 'harassment', 'inappropriate_content', 'other')),
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    
    -- Prevent spam reporting (one report per user pair)
    UNIQUE(reporter_id, reported_id)
);

-- Indexes for performance
CREATE INDEX idx_reported_users_status ON reported_users(status);
CREATE INDEX idx_reported_users_reported ON reported_users(reported_id);
CREATE INDEX idx_reported_users_created ON reported_users(created_at DESC);

-- =====================================================
-- BLOCKED USERS TABLE
-- Stores user blocks to hide profiles and messages
-- =====================================================
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One block per pair
    UNIQUE(blocker_id, blocked_id)
);

-- Indexes for performance
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE reported_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- reported_users policies
CREATE POLICY "Users can view their own reports"
    ON reported_users FOR SELECT
    USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
    ON reported_users FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

-- blocked_users policies
CREATE POLICY "Users can view their blocks"
    ON blocked_users FOR SELECT
    USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
    ON blocked_users FOR INSERT
    WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their blocks (unblock)"
    ON blocked_users FOR DELETE
    USING (blocker_id = auth.uid());

-- =====================================================
-- GRANT TABLE PERMISSIONS TO AUTHENTICATED USERS
-- Critical: RLS policies need base table permissions
-- =====================================================

GRANT SELECT, INSERT ON reported_users TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get report count for a user (for admin use)
CREATE OR REPLACE FUNCTION get_user_report_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM reported_users
        WHERE reported_id = user_id
        AND status IN ('pending', 'reviewed')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is blocked by another user
CREATE OR REPLACE FUNCTION is_user_blocked(checker_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE blocker_id = checker_id
        AND blocked_id = target_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE reported_users IS 'Stores user reports for moderation';
COMMENT ON TABLE blocked_users IS 'Stores user blocks to filter content';
COMMENT ON COLUMN reported_users.reason IS 'Categorized reason for report';
COMMENT ON COLUMN reported_users.status IS 'Report review status';
COMMENT ON COLUMN blocked_users.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN blocked_users.blocked_id IS 'User who was blocked';
