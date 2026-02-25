-- Migration: storage_cvs_policies
-- Purpose:
--   1) Ensure the private `cvs` bucket exists.
--   2) Fix/standardize owner-scoped RLS policies on storage.objects for that bucket.
--   3) Allow companies to read CVs only for students they matched with.

BEGIN;

-- Ensure the bucket exists and remains private.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Remove legacy/overly broad policies if they exist.
DROP POLICY IF EXISTS "Public Access to CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to CVs" ON storage.objects;
DROP POLICY IF EXISTS "User Update Own CV" ON storage.objects;
DROP POLICY IF EXISTS "User Delete Own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Companies can view candidate CVs from matches" ON storage.objects;

-- Owner policies: users can fully manage files in their own folder: {auth.uid()}/...
DROP POLICY IF EXISTS "cvs_select_own" ON storage.objects;
CREATE POLICY "cvs_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "cvs_insert_own" ON storage.objects;
CREATE POLICY "cvs_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "cvs_update_own" ON storage.objects;
CREATE POLICY "cvs_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "cvs_delete_own" ON storage.objects;
CREATE POLICY "cvs_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Companies can read CVs for students they are matched with.
DROP POLICY IF EXISTS "cvs_select_matched_company" ON storage.objects;
DO $$
BEGIN
    IF to_regclass('public.matches') IS NULL THEN
        RAISE NOTICE 'Skipping cvs_select_matched_company policy because public.matches does not exist.';
    ELSE
        CREATE POLICY "cvs_select_matched_company"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'cvs'
            AND EXISTS (
                SELECT 1
                FROM public.matches AS m
                WHERE m.company_id = auth.uid()
                  AND m.student_id::text = (storage.foldername(name))[1]
            )
        );
    END IF;
END
$$ LANGUAGE plpgsql;

COMMIT;
