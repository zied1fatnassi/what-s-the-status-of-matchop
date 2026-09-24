-- =====================================================
-- VERIFICATION BADGE SYSTEM - DATABASE SCHEMA
-- Phase 1, Days 3-4: User Trust & Credibility
-- =====================================================

-- Add verification columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_data JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add index for quick verified user queries
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified) WHERE verified = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN profiles.verified IS 'Whether the user has been verified through any method';
COMMENT ON COLUMN profiles.verification_method IS 'Verification method: email, linkedin, manual, or NULL';
COMMENT ON COLUMN profiles.verification_data IS 'Additional verification metadata (e.g., LinkedIn profile URL, admin notes)';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when verification was completed';

-- =====================================================
-- VERIFICATION DATA EXAMPLES
-- =====================================================

-- Email verification:
-- {
--   "verified_via": "supabase_auth"
-- }

-- LinkedIn verification:
-- {
--   "linkedin_url": "https://linkedin.com/in/username",
--   "linkedin_verified_at": "2025-12-22T10:00:00Z"
-- }

-- Manual/Admin verification:
-- {
--   "admin_verified_by": "admin_user_id",
--   "admin_notes": "Verified via company email domain",
--   "verification_documents": ["url1", "url2"]
-- }
