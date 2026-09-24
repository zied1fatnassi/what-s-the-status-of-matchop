-- Migration: Add student_id and verification metadata to certifications and experiences
-- Upgrades certifications table for student credential verification
-- Upgrades experiences table for internship/work attestation document proofs

-- 1. Ensure columns on certifications
ALTER TABLE IF EXISTS public.certifications 
    ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS document_url TEXT,
    ADD COLUMN IF NOT EXISTS document_name TEXT,
    ADD COLUMN IF NOT EXISTS document_type TEXT,
    ADD COLUMN IF NOT EXISTS document_size INTEGER,
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fraud_analysis JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create index on student_id
CREATE INDEX IF NOT EXISTS idx_certifications_student_id ON public.certifications(student_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON public.certifications(verification_status);

-- Enable RLS on certifications if not already enabled
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid collision
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public can view verified certifications" ON public.certifications;
    DROP POLICY IF EXISTS "Students can manage own certifications" ON public.certifications;
    DROP POLICY IF EXISTS "Service role full access on certifications" ON public.certifications;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Policy: Anyone authenticated can view certifications
CREATE POLICY "Public can view verified certifications"
ON public.certifications FOR SELECT
TO public
USING (true);

-- Policy: Students can insert their own certifications
CREATE POLICY "Students can insert own certifications"
ON public.certifications FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = student_id OR
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND id = student_id
    )
);

-- Policy: Students can update their own certifications
CREATE POLICY "Students can update own certifications"
ON public.certifications FOR UPDATE
TO authenticated
USING (
    auth.uid() = student_id OR
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND id = student_id
    )
);

-- Policy: Students can delete their own certifications
CREATE POLICY "Students can delete own certifications"
ON public.certifications FOR DELETE
TO authenticated
USING (
    auth.uid() = student_id OR
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND id = student_id
    )
);

-- 2. Add proof document and verification columns to experiences
ALTER TABLE IF EXISTS public.experiences
    ADD COLUMN IF NOT EXISTS proof_document_url TEXT,
    ADD COLUMN IF NOT EXISTS proof_document_name TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fraud_analysis JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_experiences_status ON public.experiences(verification_status);
