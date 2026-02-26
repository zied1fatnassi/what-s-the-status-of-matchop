-- ============================================================
-- Migration: d17_payments
-- Date: 2026-02-26
-- Purpose:
--   1) Create payment_requests for manual D17 premium upgrades.
--   2) Enforce strict RLS for user-owned requests and admin reviews.
--   3) Provision Storage bucket/policies for payment proof uploads.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.payment_requester_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_admin BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    BEGIN
        SELECT public.matchop_requester_has_profile_type('admin')
        INTO has_admin;
    EXCEPTION
        WHEN undefined_function THEN
            has_admin := FALSE;
    END;

    IF has_admin THEN
        RETURN TRUE;
    END IF;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
              AND up.profile_type::TEXT = 'admin'
        )
        INTO has_admin;

        IF has_admin THEN
            RETURN TRUE;
        END IF;
    END IF;

    IF to_regclass('public.profiles') IS NOT NULL THEN
        BEGIN
            SELECT EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role::TEXT = 'admin'
            )
            INTO has_admin;
        EXCEPTION
            WHEN undefined_column THEN
                has_admin := FALSE;
        END;

        IF has_admin THEN
            RETURN TRUE;
        END IF;

        BEGIN
            SELECT EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.type::TEXT = 'admin'
            )
            INTO has_admin;
        EXCEPTION
            WHEN undefined_column THEN
                has_admin := FALSE;
        END;

        IF has_admin THEN
            RETURN TRUE;
        END IF;

        BEGIN
            SELECT COALESCE(p.is_admin, FALSE)
            INTO has_admin
            FROM public.profiles p
            WHERE p.id = auth.uid();
        EXCEPTION
            WHEN undefined_column THEN
                has_admin := FALSE;
        END;
    END IF;

    RETURN COALESCE(has_admin, FALSE);
END;
$$;

CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('monthly', 'yearly')),
    amount_tnd INTEGER NOT NULL CHECK (amount_tnd > 0),
    currency TEXT NOT NULL DEFAULT 'TND',
    d17_phone TEXT NOT NULL DEFAULT '+21652460278',
    reference TEXT NOT NULL UNIQUE,
    proof_object_path TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT NULL,
    reviewed_by UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_created_at
    ON public.payment_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status_created_at
    ON public.payment_requests (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_one_pending_per_user
    ON public.payment_requests (user_id)
    WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.payment_requests_set_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS NULL THEN
        NEW.id := gen_random_uuid();
    END IF;

    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());

    IF NEW.reference IS NULL OR btrim(NEW.reference) = '' THEN
        NEW.reference := 'MOP-'
            || substr(NEW.user_id::TEXT, 1, 8)
            || '-'
            || to_char(NEW.created_at, 'YYYYMMDD')
            || '-'
            || substr(NEW.id::TEXT, 1, 6);
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.payment_requests_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_requests_set_reference ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_set_reference
BEFORE INSERT ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.payment_requests_set_reference();

DROP TRIGGER IF EXISTS trg_payment_requests_set_updated_at ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_set_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.payment_requests_set_updated_at();

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_requests FROM anon;
REVOKE ALL ON TABLE public.payment_requests FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.payment_requests TO authenticated;
GRANT UPDATE (proof_object_path) ON TABLE public.payment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_requests TO service_role;

DROP POLICY IF EXISTS "payment_requests_user_insert_own" ON public.payment_requests;
CREATE POLICY "payment_requests_user_insert_own"
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND (admin_note IS NULL OR btrim(admin_note) = '')
);

DROP POLICY IF EXISTS "payment_requests_user_select_own" ON public.payment_requests;
CREATE POLICY "payment_requests_user_select_own"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_requests_user_update_pending_proof" ON public.payment_requests;
CREATE POLICY "payment_requests_user_update_pending_proof"
ON public.payment_requests
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    AND status = 'pending'
)
WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
);

DROP POLICY IF EXISTS "payment_requests_admin_select_all" ON public.payment_requests;
CREATE POLICY "payment_requests_admin_select_all"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (public.payment_requester_is_admin());

DROP POLICY IF EXISTS "payment_requests_admin_update_all" ON public.payment_requests;
CREATE POLICY "payment_requests_admin_update_all"
ON public.payment_requests
FOR UPDATE
TO authenticated
USING (public.payment_requester_is_admin())
WITH CHECK (public.payment_requester_is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment_proofs', 'payment_proofs', FALSE, '20MiB')
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "payment_proofs_insert_own" ON storage.objects;
CREATE POLICY "payment_proofs_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'payment_proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM public.payment_requests pr
        WHERE pr.id::TEXT = (storage.foldername(name))[2]
          AND pr.user_id = auth.uid()
          AND pr.status = 'pending'
    )
);

DROP POLICY IF EXISTS "payment_proofs_select_own" ON storage.objects;
CREATE POLICY "payment_proofs_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment_proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "payment_proofs_select_admin_all" ON storage.objects;
CREATE POLICY "payment_proofs_select_admin_all"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment_proofs'
    AND public.payment_requester_is_admin()
);

COMMIT;
