BEGIN;

UPDATE public.external_matches
SET status = 'saved'
WHERE status IS NULL
   OR status NOT IN ('saved', 'applied', 'interview', 'rejected', 'archived');

ALTER TABLE public.external_matches
    ALTER COLUMN status SET DEFAULT 'saved';

ALTER TABLE public.external_matches
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.external_matches
    DROP CONSTRAINT IF EXISTS external_matches_status_check;

ALTER TABLE public.external_matches
    ADD CONSTRAINT external_matches_status_check
    CHECK (status IN ('saved', 'applied', 'interview', 'rejected', 'archived'));

COMMIT;
