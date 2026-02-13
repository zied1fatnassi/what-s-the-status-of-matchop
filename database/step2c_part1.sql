-- ============================================================================
-- MATCHOP: STEP 2C — PART 1 (Run this FIRST, alone)
-- ============================================================================
-- Creates the profile_type enum and adds 'admin'. Must be committed before
-- Part 2 can reference the 'admin' value.
-- ============================================================================

-- Create enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE profile_type AS ENUM ('student', 'company');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add 'admin' to the enum
ALTER TYPE profile_type ADD VALUE IF NOT EXISTS 'admin';

SELECT '✅ Part 1 done — profile_type enum ready. Now run step2c_part2.sql' AS status;
