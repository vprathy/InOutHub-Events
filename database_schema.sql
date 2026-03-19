-- InOutHub MVP V1 Core Architecture Schema (Hardened V3)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. ROOT HIERARCHY (Organizations & Events)
-- ==========================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Users
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT UNIQUE,
    phone_number TEXT,
    timezone_pref TEXT DEFAULT 'America/New_York',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automatically create a user profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Platform-Level Super Admins
CREATE TABLE app_super_admins (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maps App Users to Organizations
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE, 
    role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'StageManager', 'ActAdmin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('EventAdmin', 'StageManager', 'Member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ==========================================
-- 2. THE EVENT ROSTER
-- ==========================================

CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    notes TEXT,
    source_system TEXT DEFAULT 'manual',
    source_instance TEXT,
    source_anchor_type TEXT,
    source_anchor_value TEXT,
    source_imported_at TIMESTAMP WITH TIME ZONE,
    special_request_raw TEXT,
    special_request_source_column TEXT,
    has_special_requests BOOLEAN DEFAULT false,
    src_raw JSONB,
    status TEXT NOT NULL DEFAULT 'active', -- Maps to participant_status enum
    identity_verified BOOLEAN DEFAULT false,
    identity_notes TEXT,
    is_minor BOOLEAN DEFAULT false,
    guardian_relationship TEXT,
    age INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, source_system, source_instance, source_anchor_type, source_anchor_value)
);

CREATE TABLE participant_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES asset_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'uploaded',
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE participant_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'operational',
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. THE SHOW (Stages & Acts)
-- ==========================================

CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE acts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 5,
    setup_time_minutes INTEGER NOT NULL DEFAULT 2,
    arrival_status TEXT NOT NULL DEFAULT 'Not Arrived' CHECK (arrival_status IN ('Not Arrived', 'Arrived', 'Backstage', 'Ready')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE act_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Performer', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(act_id, participant_id)
);

CREATE TABLE act_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('Audio', 'Prop', 'Instrument', 'Other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE act_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    requirement_type TEXT NOT NULL CHECK (
        requirement_type IN (
            'Audio',
            'Lighting',
            'Microphone',
            'Video',
            'Waiver',
            'Poster',
            'Generative',
            'Generative_Video',
            'Generative_Audio',
            'IntroComposition'
        )
    ),
    description TEXT NOT NULL,
    file_url TEXT, 
    fulfilled BOOLEAN DEFAULT false, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE act_readiness_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    expected_for TEXT,
    venue_name TEXT NOT NULL,
    address TEXT,
    room_area TEXT,
    parking_note TEXT,
    special_instructions TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'changed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE act_readiness_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    practice_id UUID REFERENCES act_readiness_practices(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('costume', 'prop', 'music', 'shoes', 'printout', 'prep_task', 'other')),
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'in_progress', 'ready', 'missing')),
    owner_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    owner_label TEXT,
    due_at TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE act_readiness_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    practice_id UUID REFERENCES act_readiness_practices(id) ON DELETE SET NULL,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('participant_unavailable', 'missing_costume', 'missing_prop', 'music_not_final', 'intro_media_pending', 'parent_coordination', 'timing', 'rehearsal_conflict', 'lineup', 'organizer_support', 'other')),
    title TEXT NOT NULL,
    details TEXT,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'watching', 'blocked', 'resolved')),
    owner_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    owner_label TEXT,
    due_at TIMESTAMP WITH TIME ZONE,
    escalate_to_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. EXECUTION (Lineups & Live State)
-- ==========================================

CREATE TABLE lineup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stage_id, sort_order)
);

CREATE TABLE stage_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL UNIQUE REFERENCES stages(id) ON DELETE CASCADE,
    current_lineup_item_id UUID REFERENCES lineup_items(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Idle' CHECK (status IN ('Idle', 'Active', 'Paused', 'Finished')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. AUDIT & ACCOUNTABILITY
-- ==========================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES user_profiles(id) ON DELETE CASCADE,
    context_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('magic_link_requested', 'email_code_requested', 'email_code_verified', 'google_login_started', 'google_login_completed', 'install_help_opened', 'profile_check_shown', 'profile_check_completed', 'login_completed', 'logout', 'session_timeout')),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES user_profiles(id) ON DELETE CASCADE,
    active_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'timed_out', 'ended')),
    ended_reason TEXT CHECK (ended_reason IN ('logout', 'timed_out', 'revoked', 'replaced', 'ended')),
    pwa_version TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    is_offline_mode BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE requirement_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('participant', 'act')),
    label TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('identity', 'safety', 'waiver', 'media', 'technical', 'readiness', 'admin')),
    input_type TEXT NOT NULL,
    input_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT true,
    review_mode TEXT NOT NULL DEFAULT 'review_required' CHECK (review_mode IN ('system_derived', 'no_review', 'submission_only', 'review_required')),
    blocking_level TEXT NOT NULL DEFAULT 'blocking' CHECK (blocking_level IN ('none', 'warning', 'blocking')),
    allow_bulk_approve BOOLEAN NOT NULL DEFAULT false,
    applies_when JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (
        (organization_id IS NOT NULL AND event_id IS NULL)
        OR (event_id IS NOT NULL AND organization_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_policies_org_code
    ON requirement_policies(organization_id, code)
    WHERE organization_id IS NOT NULL AND event_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_policies_event_code
    ON requirement_policies(event_id, code)
    WHERE event_id IS NOT NULL AND organization_id IS NULL;

CREATE TABLE requirement_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES requirement_policies(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('participant', 'act')),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    act_id UUID REFERENCES acts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'submitted', 'pending_review', 'approved', 'rejected', 'waived', 'auto_complete')),
    due_at TIMESTAMP WITH TIME ZONE,
    evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    waived_at TIMESTAMP WITH TIME ZONE,
    waived_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (
        (subject_type = 'participant' AND participant_id IS NOT NULL AND act_id IS NULL)
        OR (subject_type = 'act' AND act_id IS NOT NULL AND participant_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_assignments_policy_participant
    ON requirement_assignments(policy_id, participant_id)
    WHERE participant_id IS NOT NULL AND act_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_assignments_policy_act
    ON requirement_assignments(policy_id, act_id)
    WHERE act_id IS NOT NULL AND participant_id IS NULL;

-- ==========================================
-- 6. RBAC HELPERS (Functions)
-- ==========================================

CREATE OR REPLACE FUNCTION auth_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM app_super_admins WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_org_role(p_org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members WHERE organization_id = p_org_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_effective_event_role(p_event_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_org_id uuid;
    v_org_role text;
    v_event_role text;
BEGIN
    IF EXISTS (SELECT 1 FROM public.app_super_admins WHERE user_id = p_user_id) THEN
        RETURN 'EventAdmin';
    END IF;
    SELECT organization_id INTO v_org_id FROM public.events WHERE id = p_event_id;
    SELECT role INTO v_org_role FROM public.organization_members WHERE organization_id = v_org_id AND user_id = p_user_id;
    IF v_org_role IN ('Owner', 'Admin') THEN RETURN 'EventAdmin'; END IF;
    SELECT role INTO v_event_role FROM public.event_members WHERE event_id = p_event_id AND user_id = p_user_id;
    RETURN v_event_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION auth_event_role(p_event_id UUID)
RETURNS TEXT AS $$
  SELECT get_effective_event_role(p_event_id, auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_act_event_id(p_act_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM acts WHERE id = p_act_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_stage_event_id(p_stage_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM stages WHERE id = p_stage_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_participant_event_id(p_participant_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM participants WHERE id = p_participant_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_event_staff(p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT auth_is_super_admin() OR auth_event_role(p_event_id) IN ('EventAdmin', 'StageManager');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION map_legacy_act_requirement_code(p_requirement_type TEXT)
RETURNS TEXT AS $$
    SELECT CASE p_requirement_type
        WHEN 'Audio' THEN 'ACT_AUDIO'
        WHEN 'Lighting' THEN 'ACT_LIGHTING'
        WHEN 'Microphone' THEN 'ACT_MICROPHONE'
        WHEN 'Video' THEN 'ACT_VIDEO'
        WHEN 'IntroComposition' THEN 'ACT_INTRO'
        WHEN 'Poster' THEN 'ACT_POSTER'
        WHEN 'Generative' THEN 'ACT_GENERATIVE'
        WHEN 'Generative_Audio' THEN 'ACT_GENERATIVE_AUDIO'
        WHEN 'Generative_Video' THEN 'ACT_GENERATIVE_VIDEO'
        WHEN 'Waiver' THEN 'ACT_WAIVER'
        ELSE NULL
    END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION bridge_act_requirements_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_policy_id UUID;
    v_status TEXT;
    v_mapped_code TEXT;
    v_org_id UUID;
BEGIN
    v_mapped_code := map_legacy_act_requirement_code(COALESCE(NEW.requirement_type, OLD.requirement_type));

    IF v_mapped_code IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT e.organization_id INTO v_org_id
    FROM acts a
    JOIN events e ON e.id = a.event_id
    WHERE a.id = COALESCE(NEW.act_id, OLD.act_id);

    SELECT rp.id INTO v_policy_id
    FROM requirement_policies rp
    WHERE rp.organization_id = v_org_id
      AND rp.event_id IS NULL
      AND rp.code = v_mapped_code
      AND rp.subject_type = 'act'
    LIMIT 1;

    IF v_policy_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE requirement_assignments
        SET status = 'missing', updated_at = NOW()
        WHERE policy_id = v_policy_id
          AND act_id = OLD.act_id;
        RETURN OLD;
    END IF;

    v_status := CASE WHEN NEW.fulfilled THEN 'approved' ELSE 'missing' END;

    INSERT INTO requirement_assignments (policy_id, subject_type, act_id, status)
    VALUES (v_policy_id, 'act', NEW.act_id, v_status)
    ON CONFLICT (policy_id, act_id) DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'bridge_act_requirements_sync fault: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_admins" ON audit_logs FOR SELECT USING (auth_is_super_admin());

ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_events_select_admins" ON auth_events FOR SELECT USING (
    auth_is_super_admin()
    OR (context_event_id IS NOT NULL AND can_manage_event_staff(context_event_id))
);
CREATE POLICY "auth_events_insert_self" ON auth_events FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sessions_select_self_or_admins" ON user_sessions FOR SELECT USING (
    auth.uid() = user_id
    OR auth_is_super_admin()
    OR (active_event_id IS NOT NULL AND can_manage_event_staff(active_event_id))
);
CREATE POLICY "user_sessions_insert_self" ON user_sessions FOR INSERT WITH CHECK (
    auth.uid() = user_id
);
CREATE POLICY "user_sessions_update_self" ON user_sessions FOR UPDATE USING (
    auth.uid() = user_id
) WITH CHECK (
    auth.uid() = user_id
);

ALTER TABLE requirement_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requirement_policies_select" ON requirement_policies FOR SELECT USING (
    auth_is_super_admin()
    OR (organization_id IS NOT NULL AND auth_org_role(organization_id) IS NOT NULL)
    OR (event_id IS NOT NULL AND auth_event_role(event_id) IS NOT NULL)
);
CREATE POLICY "requirement_policies_manage" ON requirement_policies FOR ALL USING (
    auth_is_super_admin()
    OR (organization_id IS NOT NULL AND auth_org_role(organization_id) IN ('Owner', 'Admin'))
    OR (event_id IS NOT NULL AND auth_event_role(event_id) = 'EventAdmin')
);

ALTER TABLE requirement_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requirement_assignments_select" ON requirement_assignments FOR SELECT USING (
    auth_is_super_admin()
    OR (act_id IS NOT NULL AND auth_event_role(get_act_event_id(act_id)) IS NOT NULL)
    OR (participant_id IS NOT NULL AND auth_event_role(get_participant_event_id(participant_id)) IS NOT NULL)
);
CREATE POLICY "requirement_assignments_manage" ON requirement_assignments FOR ALL USING (
    auth_is_super_admin()
    OR (act_id IS NOT NULL AND auth_event_role(get_act_event_id(act_id)) = 'EventAdmin')
    OR (participant_id IS NOT NULL AND auth_event_role(get_participant_event_id(participant_id)) = 'EventAdmin')
);

ALTER TABLE app_super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_select_self" ON app_super_admins FOR SELECT USING (auth.uid() = user_id OR auth_is_super_admin());
CREATE POLICY "super_admins_manage" ON app_super_admins FOR ALL USING (auth_is_super_admin());

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (auth_is_super_admin() OR auth_org_role(id) IS NOT NULL);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (auth_is_super_admin() OR auth_org_role(id) IN ('Owner', 'Admin'));

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_members_select" ON organization_members FOR SELECT USING (auth_is_super_admin() OR auth_org_role(organization_id) IS NOT NULL);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON events FOR SELECT USING (auth_is_super_admin() OR auth_event_role(id) IS NOT NULL);
CREATE POLICY "events_manage" ON events FOR ALL USING (auth_is_super_admin() OR auth_event_role(id) = 'EventAdmin');

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_select" ON participants FOR SELECT USING (auth_is_super_admin() OR auth_event_role(event_id) IS NOT NULL);
CREATE POLICY "participants_manage" ON participants FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

ALTER TABLE participant_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participant_assets_select" ON participant_assets FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_participant_event_id(participant_id)) IS NOT NULL);
CREATE POLICY "participant_assets_manage" ON participant_assets FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_participant_event_id(participant_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE participant_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participant_notes_select" ON participant_notes FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_participant_event_id(participant_id)) IS NOT NULL);
CREATE POLICY "participant_notes_manage" ON participant_notes FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_participant_event_id(participant_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acts_select" ON acts FOR SELECT USING (auth_is_super_admin() OR auth_event_role(event_id) IS NOT NULL);
CREATE POLICY "acts_manage_admin" ON acts FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

ALTER TABLE act_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_participants_select" ON act_participants FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
CREATE POLICY "act_participants_manage" ON act_participants FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');

ALTER TABLE act_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_assets_select" ON act_assets FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
CREATE POLICY "act_assets_manage" ON act_assets FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');

ALTER TABLE act_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_requirements_select" ON act_requirements FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
CREATE POLICY "act_requirements_manage" ON act_requirements FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');

ALTER TABLE act_readiness_practices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_readiness_practices_select" ON act_readiness_practices FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
CREATE POLICY "act_readiness_practices_manage" ON act_readiness_practices FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE act_readiness_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_readiness_items_select" ON act_readiness_items FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
CREATE POLICY "act_readiness_items_manage" ON act_readiness_items FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE act_readiness_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_readiness_issues_select" ON act_readiness_issues FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
CREATE POLICY "act_readiness_issues_manage" ON act_readiness_issues FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_select" ON stages FOR SELECT USING (auth_is_super_admin() OR auth_event_role(event_id) IS NOT NULL);
CREATE POLICY "stages_manage" ON stages FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

ALTER TABLE lineup_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineup_items_select" ON lineup_items FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_stage_event_id(stage_id)) IS NOT NULL);
CREATE POLICY "lineup_items_manage_admin" ON lineup_items FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_stage_event_id(stage_id)) = 'EventAdmin');

ALTER TABLE stage_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_state_select" ON stage_state FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_stage_event_id(stage_id)) IS NOT NULL);
CREATE POLICY "stage_state_manage_ops" ON stage_state FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_stage_event_id(stage_id)) IN ('EventAdmin', 'StageManager'));

-- ==========================================
-- 8. AUDIT TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION handle_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_participants AFTER INSERT OR UPDATE OR DELETE ON participants FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_acts AFTER INSERT OR UPDATE OR DELETE ON acts FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_events AFTER INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_org_members AFTER INSERT OR UPDATE OR DELETE ON organization_members FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_lineup_items AFTER INSERT OR UPDATE OR DELETE ON lineup_items FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_stage_state AFTER INSERT OR UPDATE OR DELETE ON stage_state FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_act_readiness_practices AFTER INSERT OR UPDATE OR DELETE ON act_readiness_practices FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_act_readiness_items AFTER INSERT OR UPDATE OR DELETE ON act_readiness_items FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_act_readiness_issues AFTER INSERT OR UPDATE OR DELETE ON act_readiness_issues FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

-- ==========================================
-- 9. PERFORMANCE OPTIMIZATION (Indexes)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_stages_event_id ON stages(event_id);
CREATE INDEX IF NOT EXISTS idx_acts_event_id ON acts(event_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_practices_act_id ON act_readiness_practices(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_practices_starts_at ON act_readiness_practices(starts_at);
CREATE INDEX IF NOT EXISTS idx_act_readiness_items_act_id ON act_readiness_items(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_items_status ON act_readiness_items(status);
CREATE INDEX IF NOT EXISTS idx_act_readiness_issues_act_id ON act_readiness_issues(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_issues_status ON act_readiness_issues(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_user_created_at ON auth_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_context_event_id ON auth_events(context_event_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_event_id ON user_sessions(active_event_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status_last_active ON user_sessions(status, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirement_policies_org ON requirement_policies(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requirement_policies_event ON requirement_policies(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requirement_assignments_act ON requirement_assignments(act_id) WHERE act_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requirement_assignments_participant ON requirement_assignments(participant_id) WHERE participant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requirement_assignments_status ON requirement_assignments(status);
