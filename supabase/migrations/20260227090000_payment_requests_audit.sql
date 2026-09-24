-- ============================================================
-- Migration: payment_requests_audit + cooldown + admin undo
-- Date: 2026-02-27
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- payment_requests.status: allow reverted
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_constraint_name TEXT;
    v_constraint_def TEXT;
BEGIN
    SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO v_constraint_name, v_constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'payment_requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    ORDER BY c.conname
    LIMIT 1;

    IF v_constraint_name IS NOT NULL
       AND v_constraint_def NOT ILIKE '%reverted%' THEN
        EXECUTE format('ALTER TABLE public.payment_requests DROP CONSTRAINT %I', v_constraint_name);
    END IF;
END
$$;

ALTER TABLE public.payment_requests
    DROP CONSTRAINT IF EXISTS payment_requests_status_check;

ALTER TABLE public.payment_requests
    ADD CONSTRAINT payment_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'reverted'));

-- ---------------------------------------------------------------------------
-- Audit table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_requests_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_request_id UUID NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'rejected', 'reverted', 'proof_uploaded')),
    actor UUID NULL,
    old_state JSONB NULL,
    new_state JSONB NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_audit_payment_request_id
    ON public.payment_requests_audit(payment_request_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_audit_created_at
    ON public.payment_requests_audit(created_at DESC);

ALTER TABLE public.payment_requests_audit ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Cooldown helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_requests_recent_pending_count(p_user_id UUID, p_minutes INT)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)
    FROM public.payment_requests pr
    WHERE pr.user_id = p_user_id
      AND pr.status = 'pending'
      AND pr.created_at >= now() - (p_minutes || ' minutes')::interval;
$$;

-- ---------------------------------------------------------------------------
-- Transactional admin action RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_requests_apply_admin_action(
    p_payment_request_id UUID,
    p_action TEXT,
    p_admin_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request public.payment_requests%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_now TIMESTAMPTZ := now();
    v_plan_days INTEGER;
    v_old_state JSONB;
    v_new_state JSONB;
    v_approved_old_state JSONB;
    v_prev_profile JSONB;
    v_restore_is_premium BOOLEAN := FALSE;
    v_restore_expires TIMESTAMPTZ := NULL;
BEGIN
    IF p_action NOT IN ('approve', 'reject', 'revert') THEN
        RETURN jsonb_build_object(
            'ok', FALSE,
            'already_applied', FALSE,
            'error_code', 'BAD_ACTION',
            'message', 'action must be approve, reject, or revert'
        );
    END IF;

    SELECT *
    INTO v_request
    FROM public.payment_requests pr
    WHERE pr.id = p_payment_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', FALSE,
            'already_applied', FALSE,
            'error_code', 'NOT_FOUND',
            'message', 'Payment request not found'
        );
    END IF;

    SELECT *
    INTO v_profile
    FROM public.profiles p
    WHERE p.id = v_request.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', FALSE,
            'already_applied', FALSE,
            'error_code', 'PROFILE_NOT_FOUND',
            'message', 'Profile not found for payment request user'
        );
    END IF;

    IF p_action = 'approve' THEN
        IF v_request.status = 'approved' THEN
            RETURN jsonb_build_object(
                'ok', TRUE,
                'already_applied', TRUE,
                'error_code', NULL,
                'message', 'Payment request already approved',
                'payment_request', to_jsonb(v_request),
                'profile', to_jsonb(v_profile)
            );
        END IF;

        IF v_request.status <> 'pending' THEN
            RETURN jsonb_build_object(
                'ok', FALSE,
                'already_applied', FALSE,
                'error_code', 'CONFLICT',
                'message', format('Cannot approve request in status "%s"', v_request.status)
            );
        END IF;

        v_old_state := jsonb_build_object(
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );

        v_plan_days := CASE v_request.plan_id
            WHEN 'monthly' THEN 30
            WHEN 'yearly' THEN 365
            ELSE NULL
        END;

        IF v_plan_days IS NULL THEN
            RETURN jsonb_build_object(
                'ok', FALSE,
                'already_applied', FALSE,
                'error_code', 'BAD_DATA',
                'message', 'Payment request plan_id is invalid'
            );
        END IF;

        UPDATE public.profiles
        SET
            is_premium = TRUE,
            premium_expires_at = v_now + make_interval(days => v_plan_days)
        WHERE id = v_profile.id
        RETURNING *
        INTO v_profile;

        PERFORM set_config('app.payment_requests_skip_status_audit', 'on', TRUE);

        UPDATE public.payment_requests
        SET
            status = 'approved',
            reviewed_by = p_admin_id,
            reviewed_at = v_now,
            admin_note = NULLIF(btrim(p_note), '')
        WHERE id = v_request.id
        RETURNING *
        INTO v_request;

        PERFORM set_config('app.payment_requests_skip_status_audit', 'off', TRUE);

        v_new_state := jsonb_build_object(
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );

        INSERT INTO public.payment_requests_audit (
            payment_request_id,
            action,
            actor,
            old_state,
            new_state,
            note
        )
        VALUES (
            v_request.id,
            'approved',
            p_admin_id,
            v_old_state,
            v_new_state,
            NULLIF(btrim(p_note), '')
        );

        RETURN jsonb_build_object(
            'ok', TRUE,
            'already_applied', FALSE,
            'error_code', NULL,
            'message', 'Payment request approved',
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );
    END IF;

    IF p_action = 'reject' THEN
        IF v_request.status = 'rejected' THEN
            RETURN jsonb_build_object(
                'ok', TRUE,
                'already_applied', TRUE,
                'error_code', NULL,
                'message', 'Payment request already rejected',
                'payment_request', to_jsonb(v_request),
                'profile', to_jsonb(v_profile)
            );
        END IF;

        IF v_request.status <> 'pending' THEN
            RETURN jsonb_build_object(
                'ok', FALSE,
                'already_applied', FALSE,
                'error_code', 'CONFLICT',
                'message', format('Cannot reject request in status "%s"', v_request.status)
            );
        END IF;

        v_old_state := jsonb_build_object(
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );

        PERFORM set_config('app.payment_requests_skip_status_audit', 'on', TRUE);

        UPDATE public.payment_requests
        SET
            status = 'rejected',
            reviewed_by = p_admin_id,
            reviewed_at = v_now,
            admin_note = NULLIF(btrim(p_note), '')
        WHERE id = v_request.id
        RETURNING *
        INTO v_request;

        PERFORM set_config('app.payment_requests_skip_status_audit', 'off', TRUE);

        v_new_state := jsonb_build_object(
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );

        INSERT INTO public.payment_requests_audit (
            payment_request_id,
            action,
            actor,
            old_state,
            new_state,
            note
        )
        VALUES (
            v_request.id,
            'rejected',
            p_admin_id,
            v_old_state,
            v_new_state,
            NULLIF(btrim(p_note), '')
        );

        RETURN jsonb_build_object(
            'ok', TRUE,
            'already_applied', FALSE,
            'error_code', NULL,
            'message', 'Payment request rejected',
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );
    END IF;

    -- p_action = revert
    IF v_request.status = 'reverted' THEN
        RETURN jsonb_build_object(
            'ok', TRUE,
            'already_applied', TRUE,
            'error_code', NULL,
            'message', 'Payment request already reverted',
            'payment_request', to_jsonb(v_request),
            'profile', to_jsonb(v_profile)
        );
    END IF;

    IF v_request.status <> 'approved' THEN
        RETURN jsonb_build_object(
            'ok', FALSE,
            'already_applied', FALSE,
            'error_code', 'CONFLICT',
            'message', format('Cannot revert request in status "%s"', v_request.status)
        );
    END IF;

    v_old_state := jsonb_build_object(
        'payment_request', to_jsonb(v_request),
        'profile', to_jsonb(v_profile)
    );

    SELECT a.old_state
    INTO v_approved_old_state
    FROM public.payment_requests_audit a
    WHERE a.payment_request_id = v_request.id
      AND a.action = 'approved'
    ORDER BY a.created_at DESC
    LIMIT 1;

    v_prev_profile := COALESCE(v_approved_old_state->'profile', NULL);

    BEGIN
        IF v_prev_profile IS NOT NULL AND v_prev_profile ? 'is_premium' THEN
            v_restore_is_premium := COALESCE((v_prev_profile->>'is_premium')::BOOLEAN, FALSE);
        END IF;
    EXCEPTION
        WHEN others THEN
            v_restore_is_premium := FALSE;
    END;

    BEGIN
        IF v_prev_profile IS NOT NULL AND v_prev_profile ? 'premium_expires_at' THEN
            v_restore_expires := NULLIF(v_prev_profile->>'premium_expires_at', '')::TIMESTAMPTZ;
        END IF;
    EXCEPTION
        WHEN others THEN
            v_restore_expires := NULL;
    END;

    UPDATE public.profiles
    SET
        is_premium = v_restore_is_premium,
        premium_expires_at = v_restore_expires
    WHERE id = v_profile.id
    RETURNING *
    INTO v_profile;

    PERFORM set_config('app.payment_requests_skip_status_audit', 'on', TRUE);

    UPDATE public.payment_requests
    SET
        status = 'reverted',
        reviewed_by = p_admin_id,
        reviewed_at = v_now,
        admin_note = NULLIF(btrim(p_note), '')
    WHERE id = v_request.id
    RETURNING *
    INTO v_request;

    PERFORM set_config('app.payment_requests_skip_status_audit', 'off', TRUE);

    v_new_state := jsonb_build_object(
        'payment_request', to_jsonb(v_request),
        'profile', to_jsonb(v_profile)
    );

    INSERT INTO public.payment_requests_audit (
        payment_request_id,
        action,
        actor,
        old_state,
        new_state,
        note
    )
    VALUES (
        v_request.id,
        'reverted',
        p_admin_id,
        v_old_state,
        v_new_state,
        NULLIF(btrim(p_note), '')
    );

    RETURN jsonb_build_object(
        'ok', TRUE,
        'already_applied', FALSE,
        'error_code', NULL,
        'message', 'Payment request reverted',
        'payment_request', to_jsonb(v_request),
        'profile', to_jsonb(v_profile)
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger audit safety net
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_requests_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor UUID := NULL;
    v_action TEXT := 'updated';
BEGIN
    BEGIN
        v_actor := auth.uid();
    EXCEPTION
        WHEN others THEN
            v_actor := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.payment_requests_audit (
            payment_request_id,
            action,
            actor,
            old_state,
            new_state
        )
        VALUES (
            NEW.id,
            'created',
            v_actor,
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF (OLD.proof_object_path IS DISTINCT FROM NEW.proof_object_path)
           AND NEW.proof_object_path IS NOT NULL THEN
            v_action := 'proof_uploaded';
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            IF COALESCE(current_setting('app.payment_requests_skip_status_audit', TRUE), 'off') = 'on' THEN
                RETURN NEW;
            END IF;

            IF NEW.status IN ('approved', 'rejected', 'reverted') THEN
                v_action := NEW.status;
            ELSE
                v_action := 'updated';
            END IF;
        ELSE
            v_action := 'updated';
        END IF;

        INSERT INTO public.payment_requests_audit (
            payment_request_id,
            action,
            actor,
            old_state,
            new_state
        )
        VALUES (
            NEW.id,
            v_action,
            v_actor,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_requests_audit ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_audit
AFTER INSERT OR UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.payment_requests_audit_trigger();

-- ---------------------------------------------------------------------------
-- Audit table policies + grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.payment_requests_audit FROM anon;
REVOKE ALL ON TABLE public.payment_requests_audit FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.payment_requests_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_requests_audit TO service_role;

DROP POLICY IF EXISTS "payment_requests_audit_user_select_own" ON public.payment_requests_audit;
CREATE POLICY "payment_requests_audit_user_select_own"
ON public.payment_requests_audit
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.payment_requests pr
        WHERE pr.id = payment_request_id
          AND pr.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "payment_requests_audit_admin_select_all" ON public.payment_requests_audit;
CREATE POLICY "payment_requests_audit_admin_select_all"
ON public.payment_requests_audit
FOR SELECT
TO authenticated
USING (public.payment_requester_is_admin());

DROP POLICY IF EXISTS "payment_requests_audit_user_insert_own" ON public.payment_requests_audit;
CREATE POLICY "payment_requests_audit_user_insert_own"
ON public.payment_requests_audit
FOR INSERT
TO authenticated
WITH CHECK (
    actor = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.payment_requests pr
        WHERE pr.id = payment_request_id
          AND pr.user_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------------
-- Backfill approved/rejected rows with missing audit history
-- ---------------------------------------------------------------------------
INSERT INTO public.payment_requests_audit (
    payment_request_id,
    action,
    actor,
    old_state,
    new_state,
    created_at
)
SELECT
    pr.id,
    pr.status,
    pr.reviewed_by,
    jsonb_build_object('payment_request_id', pr.id),
    to_jsonb(pr),
    COALESCE(pr.reviewed_at, pr.updated_at, pr.created_at, now())
FROM public.payment_requests pr
WHERE pr.status IN ('approved', 'rejected')
  AND NOT EXISTS (
      SELECT 1
      FROM public.payment_requests_audit a
      WHERE a.payment_request_id = pr.id
  );

COMMIT;
