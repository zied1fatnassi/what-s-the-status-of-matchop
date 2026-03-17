BEGIN;

ALTER TABLE public.external_matches
    ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ NULL;

COMMIT;
