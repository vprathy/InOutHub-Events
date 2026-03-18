ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS timezone_pref TEXT DEFAULT 'America/New_York',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    context_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('magic_link_requested', 'login_completed', 'logout', 'session_timeout')),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    active_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'timed_out', 'ended')),
    ended_reason TEXT CHECK (ended_reason IN ('logout', 'timed_out', 'revoked', 'replaced', 'ended')),
    pwa_version TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    is_offline_mode BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE OR REPLACE FUNCTION public.can_manage_event_staff(p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.auth_is_super_admin() OR public.auth_event_role(p_event_id) IN ('EventAdmin', 'StageManager');
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_events_select_admins" ON public.auth_events;
CREATE POLICY "auth_events_select_admins" ON public.auth_events FOR SELECT USING (
    public.auth_is_super_admin()
    OR (context_event_id IS NOT NULL AND public.can_manage_event_staff(context_event_id))
);

DROP POLICY IF EXISTS "auth_events_insert_self" ON public.auth_events;
CREATE POLICY "auth_events_insert_self" ON public.auth_events FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_select_self_or_admins" ON public.user_sessions;
CREATE POLICY "user_sessions_select_self_or_admins" ON public.user_sessions FOR SELECT USING (
    auth.uid() = user_id
    OR public.auth_is_super_admin()
    OR (active_event_id IS NOT NULL AND public.can_manage_event_staff(active_event_id))
);

DROP POLICY IF EXISTS "user_sessions_insert_self" ON public.user_sessions;
CREATE POLICY "user_sessions_insert_self" ON public.user_sessions FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "user_sessions_update_self" ON public.user_sessions;
CREATE POLICY "user_sessions_update_self" ON public.user_sessions FOR UPDATE USING (
    auth.uid() = user_id
) WITH CHECK (
    auth.uid() = user_id
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_created_at ON public.auth_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_context_event_id ON public.auth_events(context_event_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_event_id ON public.user_sessions(active_event_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status_last_active ON public.user_sessions(status, last_active_at DESC);
