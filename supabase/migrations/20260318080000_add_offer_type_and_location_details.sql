BEGIN;

-- Add opportunity type and workplace type columns to offers if they do not exist
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Full-time',
    ADD COLUMN IF NOT EXISTS workplace_type TEXT DEFAULT 'onsite';

-- Backfill offers with 'Internship' if the title or description explicitly indicates an internship/stage
UPDATE public.offers
SET type = 'Internship'
WHERE (type IS NULL OR type = '' OR type = 'Full-time')
  AND (
    title ILIKE '%intern%'
    OR title ILIKE '%stage%'
    OR title ILIKE '%pfe%'
    OR title ILIKE '%pfa%'
    OR title ILIKE '%alternan%'
    OR description ILIKE '%pfe%'
    OR description ILIKE '%stage de fin d''études%'
  );

-- Backfill offers with 'Part-time' if title indicates part-time
UPDATE public.offers
SET type = 'Part-time'
WHERE (type IS NULL OR type = '' OR type = 'Full-time')
  AND (
    title ILIKE '%part-time%'
    OR title ILIKE '%temps partiel%'
    OR title ILIKE '%mi-temps%'
  );

-- Backfill offers with 'Contract' if title indicates freelance/contract
UPDATE public.offers
SET type = 'Contract'
WHERE (type IS NULL OR type = '' OR type = 'Full-time')
  AND (
    title ILIKE '%contract%'
    OR title ILIKE '%freelance%'
    OR title ILIKE '%cdd%'
    OR title ILIKE '%consultant%'
  );

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_offers_type
    ON public.offers (type);

CREATE INDEX IF NOT EXISTS idx_offers_workplace_type
    ON public.offers (workplace_type);

COMMIT;
