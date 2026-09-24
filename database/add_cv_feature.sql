-- Add cv_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Create cvs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cvs', 'cvs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies for cvs bucket
DROP POLICY IF EXISTS "Public Access to CVs" ON storage.objects;
CREATE POLICY "Public Access to CVs" ON storage.objects FOR SELECT USING (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Authenticated Upload to CVs" ON storage.objects;
CREATE POLICY "Authenticated Upload to CVs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cvs');

DROP POLICY IF EXISTS "User Update Own CV" ON storage.objects;
CREATE POLICY "User Update Own CV" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "User Delete Own CV" ON storage.objects;
CREATE POLICY "User Delete Own CV" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
