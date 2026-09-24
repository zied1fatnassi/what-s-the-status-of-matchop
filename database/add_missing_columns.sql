-- Add missing columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS open_to_work BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Notify success
SELECT '✅ Successfully added headline, open_to_work, and cv_url columns to students table' as status;
