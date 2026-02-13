-- ============================================================================
-- FIX: Link user_profiles to profiles for PostgREST embedding
-- ============================================================================

-- The frontend queries 'profiles' and embeds 'user_profiles' using the hint 
-- !user_profiles_user_id_fkey.
-- For this to work, user_profiles.user_id must reference profiles.id directly,
-- NOT auth.users.id (even though they are the same UUID).

BEGIN;

-- 1. Drop the existing constraint referencing auth.users
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- 2. Add new constraint referencing profiles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 3. Verify
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'user_profiles'
AND tc.constraint_name = 'user_profiles_user_id_fkey';

COMMIT;

SELECT '✅ Fixed: user_profiles now references profiles(id) correctly' AS status;
