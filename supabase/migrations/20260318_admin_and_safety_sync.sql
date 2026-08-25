BEGIN;

-- ================================================================
-- 20260318_admin_and_safety_sync.sql
-- Adds admin, moderation, and safety tables/columns that were
-- referenced by the frontend but missing from the migration chain.
-- ================================================================

-- 1. Missing columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_data JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended);

-- 2. Moderation: Ensure reported_users and blocked_users exist
CREATE TABLE IF NOT EXISTS public.reported_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake_profile', 'harassment', 'inappropriate_content', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken', 'resolved')),
    resolution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    UNIQUE(reporter_id, reported_id)
);

CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- 3. Admin audit logs & settings
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id),
    admin_email TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS and add policies
ALTER TABLE public.reported_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Users can report and block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'reported_users' AND policyname = 'Users can insert reports'
    ) THEN
        CREATE POLICY "Users can insert reports" ON public.reported_users FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'reported_users' AND policyname = 'Users can view their own reports'
    ) THEN
        CREATE POLICY "Users can view their own reports" ON public.reported_users FOR SELECT TO authenticated USING (reporter_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'blocked_users' AND policyname = 'Users can manage blocks'
    ) THEN
        CREATE POLICY "Users can manage blocks" ON public.blocked_users FOR ALL TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());
    END IF;

    -- Admins can view/manage reports, audit logs, and settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'reported_users' AND policyname = 'Admins can view and update reports'
    ) THEN
        CREATE POLICY "Admins can view and update reports" ON public.reported_users FOR ALL TO authenticated USING (public.matchop_requester_has_profile_type('admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'admin_audit_logs' AND policyname = 'Admins can manage audit logs'
    ) THEN
        CREATE POLICY "Admins can manage audit logs" ON public.admin_audit_logs FOR ALL TO authenticated USING (public.matchop_requester_has_profile_type('admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Admins can manage app settings'
    ) THEN
        CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (public.matchop_requester_has_profile_type('admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Anyone can read app settings'
    ) THEN
        CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
    END IF;
END
$$;

-- 5. Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-exports', 'pdf-exports', false) ON CONFLICT (id) DO NOTHING;

COMMIT;
