-- ============================================================================
-- DEBUG: Inspect Relationships & Reload Schema Cache
-- ============================================================================

-- 1. Force PostgREST validation/reload
NOTIFY pgrst, 'reload schema';

-- 2. Check Foreign Keys on user_profiles
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name,
    pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
AND conrelid::regclass::text IN ('user_profiles', 'profiles', 'students', 'companies');

-- 3. Check for any "ambiguous" relationships
-- (If user_profiles had two FKs to profiles, PostgREST would need a hint)
-- We expect ONLY ONE FK from user_profiles -> profiles now.

SELECT '✅ Schema reload triggered. Check output above for constraints.' AS status;
