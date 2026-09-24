-- =====================================================
-- MATCHOP STORAGE BUCKETS
-- Run this in Supabase SQL Editor to create storage buckets
-- =====================================================

-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('cvs', 'cvs', false),
    ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for CVs (private bucket)
CREATE POLICY "Users can view their own CV"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own CV"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Companies can view candidate CVs from matches"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'cvs' AND
    EXISTS (
        SELECT 1 FROM matches m
        JOIN student_profiles sp ON m.student_id = sp.id
        WHERE m.company_id = auth.uid()
        AND sp.id::text = (storage.foldername(name))[1]
    )
);

-- Storage policies for company logos (public bucket)
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Companies can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

SELECT 'Storage buckets and policies created!' as status;
