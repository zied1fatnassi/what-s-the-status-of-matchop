-- ============================================================================
-- PDF EXPORTS: STORAGE BUCKET + RLS
-- ============================================================================
-- Creates the 'pdf-exports' bucket and sets up RLS so that:
--   • The service_role (Edge Function) handles all INSERTs/UPDATEs
--   • Only the profile owner can SELECT (download) their own PDF
--   • Public signed URLs (created by service_role) bypass RLS
-- ============================================================================

-- 1. Create the storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-exports', 'pdf-exports', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies on storage.objects for this bucket

-- Allow profile owners to READ their own PDFs
-- Path pattern: profiles/{profile_id}/cv.pdf
-- storage.foldername(name) returns the folder parts as an array
CREATE POLICY "Users can read own PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'pdf-exports'
    AND (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
);

-- Service role handles INSERT/UPDATE/DELETE (no policy needed — service_role bypasses RLS)
-- But we explicitly deny non-service-role writes for safety:
CREATE POLICY "Block direct uploads from users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id != 'pdf-exports'
);

SELECT '✅ pdf-exports bucket created with owner-only read RLS' as status;
