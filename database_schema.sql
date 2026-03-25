-- InOutHub MVP V1 Core Architecture Schema (Hardened V3)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. ROOT HIERARCHY (Organizations & Events)
-- ==========================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending_review', 'approved', 'restricted')),
    onboarding_contact_email TEXT,
    review_requested_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
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

ALTER TABLE organizations
    ADD CONSTRAINT organizations_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

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
    role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member')),
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
    role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('EventAdmin', 'StageManager', 'ActAdmin', 'Member')),
    grant_type TEXT NOT NULL DEFAULT 'manual' CHECK (grant_type IN ('automated', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE TABLE pending_event_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL DEFAULT 'Member' CHECK (target_role IN ('EventAdmin', 'StageManager', 'ActAdmin', 'Member')),
    grant_type TEXT NOT NULL DEFAULT 'automated' CHECK (grant_type IN ('automated', 'manual')),
    source_type TEXT,
    source_participant_id UUID,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'revoked')),
    fulfilled_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(normalized_email, event_id)
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, source_system, source_instance, source_anchor_type, source_anchor_value)
);

ALTER TABLE pending_event_access
    ADD CONSTRAINT pending_event_access_source_participant_id_fkey
    FOREIGN KEY (source_participant_id) REFERENCES participants(id) ON DELETE SET NULL;

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

-- Staging for external intake (Review -> Approve -> Convert)
CREATE TABLE performance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    import_run_id UUID REFERENCES import_runs(id) ON DELETE SET NULL,
    event_source_id UUID REFERENCES event_sources(id) ON DELETE SET NULL,
    
    source_anchor TEXT, -- Unique key from source (e.g. Row ID or Row Hash)
    
    title TEXT NOT NULL,
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    duration_estimate_minutes INTEGER NOT NULL DEFAULT 5,
    music_supplied BOOLEAN NOT NULL DEFAULT false,
    roster_supplied BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'reviewed', 'approved', 'rejected')),
    conversion_status TEXT NOT NULL DEFAULT 'not_started' CHECK (conversion_status IN ('not_started', 'converted', 'failed')),
    converted_act_id UUID REFERENCES acts(id) ON DELETE SET NULL,
    
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    converted_at TIMESTAMP WITH TIME ZONE,
    converted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate intake from the same source row per source instance
    UNIQUE(event_id, event_source_id, source_anchor)
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

CREATE TABLE event_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE import_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_source_id UUID REFERENCES event_sources(id) ON DELETE SET NULL,
    import_target TEXT NOT NULL CHECK (import_target IN ('participants', 'performance_requests')),
    import_method TEXT NOT NULL CHECK (import_method IN ('google_sheet', 'spreadsheet_upload', 'manual')),
    source_name TEXT,
    source_instance TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed', 'blocked', 'rolled_back')),
    probable_target TEXT CHECK (probable_target IN ('participants', 'performance_requests', 'unknown')),
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    blocking_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    initiated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE import_run_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('participant', 'performance_request', 'act')),
    entity_id UUID,
    entity_key TEXT,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'missing_from_source', 'blocked', 'skipped', 'deleted')),
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE intake_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    import_run_id UUID REFERENCES import_runs(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('import_run', 'participant', 'performance_request', 'act')),
    entity_id UUID,
    action TEXT NOT NULL,
    note TEXT,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    performed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE client_error_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    support_code TEXT NOT NULL UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    feature_area TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
    route TEXT,
    message TEXT NOT NULL,
    error_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_id TEXT,
    event_role TEXT,
    org_role TEXT,
    pwa_version TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE VIEW v_recent_client_error_events AS
SELECT
    ce.id,
    ce.support_code,
    ce.organization_id,
    ce.event_id,
    ce.reported_by,
    ce.feature_area,
    ce.severity,
    ce.route,
    ce.message,
    ce.error_context,
    ce.correlation_id,
    ce.event_role,
    ce.org_role,
    ce.pwa_version,
    ce.user_agent,
    ce.status,
    ce.created_at,
    up.first_name AS reporter_first_name,
    up.last_name AS reporter_last_name,
    up.email AS reporter_email,
    org.name AS organization_name,
    ev.name AS event_name
FROM client_error_events ce
LEFT JOIN user_profiles up ON up.id = ce.reported_by
LEFT JOIN organizations org ON org.id = ce.organization_id
LEFT JOIN events ev ON ev.id = ce.event_id
ORDER BY ce.created_at DESC;

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
    IF v_event_role IS NOT NULL THEN
        RETURN v_event_role;
    END IF;

    -- 4. Act Manager fallback (ActAdmin)
    IF EXISTS (
        SELECT 1 FROM act_participants ap
        JOIN acts a ON a.id = ap.act_id
        JOIN participants p ON p.id = ap.participant_id
        WHERE a.event_id = p_event_id
          AND ap.role = 'Manager'
          AND normalize_email(extract_participant_contact_email(p.src_raw, p.notes)) = (SELECT normalize_email(email) FROM public.user_profiles WHERE id = p_user_id)
    ) THEN
        RETURN 'ActAdmin';
    END IF;

    RETURN NULL;
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

CREATE OR REPLACE FUNCTION normalize_email(p_email TEXT)
RETURNS TEXT AS $$
  SELECT NULLIF(lower(trim(p_email)), '');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_my_pending_access_count()
RETURNS INTEGER AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT normalize_email(email) INTO v_email
    FROM public.user_profiles
    WHERE id = auth.uid();

    IF v_email IS NULL THEN
        RETURN 0;
    END IF;

    RETURN COALESCE((
        SELECT COUNT(*)
        FROM public.pending_event_access
        WHERE normalized_email = v_email
          AND status = 'pending'
    ), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION create_organization_with_owner(
    p_name TEXT,
    p_contact_email TEXT DEFAULT NULL,
    p_requires_review BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_contact_email TEXT;
    v_review_status TEXT := 'approved';
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NULLIF(trim(COALESCE(p_name, '')), '') IS NULL THEN
        RAISE EXCEPTION 'Organization name is required';
    END IF;

    IF NOT public.auth_is_super_admin() THEN
        IF EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE user_id = v_user_id
        ) THEN
            RAISE EXCEPTION 'Only first-time users can self-create an organization during MVP onboarding';
        END IF;

        IF public.get_my_pending_access_count() > 0 THEN
            RAISE EXCEPTION 'Pending access already exists for this user. Complete the invite flow instead of creating a new organization.';
        END IF;
    END IF;

    SELECT normalize_email(COALESCE(NULLIF(trim(p_contact_email), ''), email))
    INTO v_contact_email
    FROM public.user_profiles
    WHERE id = v_user_id;

    IF p_requires_review AND NOT public.auth_is_super_admin() THEN
        v_review_status := 'pending_review';
    END IF;

    INSERT INTO public.organizations (
        name,
        review_status,
        onboarding_contact_email,
        review_requested_at,
        reviewed_at,
        reviewed_by
    )
    VALUES (
        trim(p_name),
        v_review_status,
        v_contact_email,
        CASE WHEN v_review_status = 'pending_review' THEN NOW() ELSE NULL END,
        CASE WHEN v_review_status = 'approved' THEN NOW() ELSE NULL END,
        CASE WHEN v_review_status = 'approved' THEN v_user_id ELSE NULL END
    )
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'Owner')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'Owner';

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION is_valid_email(p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(normalize_email(p_email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$', FALSE);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION extract_participant_contact_email(p_src_raw JSONB, p_notes TEXT)
RETURNS TEXT AS $$
  SELECT normalize_email(COALESCE(
      NULLIF(p_src_raw->>'email', ''),
      NULLIF(p_src_raw->>'Email', ''),
      NULLIF(p_src_raw->>'email address', ''),
      NULLIF(p_src_raw->>'Email Address', ''),
      NULLIF(p_src_raw->>'parent email', ''),
      NULLIF(p_src_raw->>'Parent Email', ''),
      NULLIF(p_src_raw->>'guardian email', ''),
      NULLIF(p_src_raw->>'Guardian Email', ''),
      (regexp_match(COALESCE(p_notes, ''), '\[Email:\s*([^\]]+)\]', 'i'))[1]
  ));
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION can_view_guardian_pii(p_participant_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
BEGIN
    SELECT event_id INTO v_event_id FROM participants WHERE id = p_participant_id;
    IF v_event_id IS NULL THEN RETURN FALSE; END IF;

    v_role := get_effective_event_role(v_event_id, p_user_id);

    -- Only top-tier admins get guardian PII
    RETURN v_role = 'EventAdmin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION can_view_act_detail(p_act_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
BEGIN
    SELECT event_id INTO v_event_id FROM acts WHERE id = p_act_id;
    IF v_event_id IS NULL THEN RETURN FALSE; END IF;

    v_role := get_effective_event_role(v_event_id, p_user_id);

    -- EventAdmin, SuperAdmin, StageManager see all acts in the event
    IF v_role IN ('EventAdmin', 'StageManager') THEN
        RETURN TRUE;
    END IF;

    -- ActAdmin only sees their own act(s)
    IF v_role = 'ActAdmin' THEN
        RETURN EXISTS (
            SELECT 1 FROM act_participants ap
            JOIN participants p ON p.id = ap.participant_id
            WHERE ap.act_id = p_act_id
              AND ap.role = 'Manager'
              AND normalize_email(extract_participant_contact_email(p.src_raw, p.notes)) = (SELECT normalize_email(email) FROM public.user_profiles WHERE id = p_user_id)
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION can_view_participant(p_participant_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_event_id UUID;
  v_role TEXT;
    v_user_email TEXT;
BEGIN
    SELECT event_id INTO v_event_id FROM participants WHERE id = p_participant_id;
    IF v_event_id IS NULL THEN RETURN FALSE; END IF;

    v_role := get_effective_event_role(v_event_id, p_user_id);

    -- EventAdmin, SuperAdmin, StageManager can see all participants in the event roster
    IF v_role IN ('EventAdmin', 'StageManager') THEN
        RETURN TRUE;
    END IF;

    -- ActAdmin can only see participants in their own acts
    IF v_role = 'ActAdmin' THEN
        SELECT email INTO v_user_email FROM user_profiles WHERE id = p_user_id;

        RETURN EXISTS (
            SELECT 1
            FROM act_participants ap_target
            JOIN acts a ON a.id = ap_target.act_id
            JOIN act_participants ap_manager ON ap_manager.act_id = a.id
            JOIN participants p_manager ON p_manager.id = ap_manager.participant_id
            WHERE ap_target.participant_id = p_participant_id
              AND ap_manager.role = 'Manager'
              AND (
                  normalize_email(p_manager.src_raw->>'email') = normalize_email(v_user_email)
                  OR normalize_email(p_manager.src_raw->>'Email') = normalize_email(v_user_email)
                  OR normalize_email(p_manager.src_raw->>'Email Address') = normalize_email(v_user_email)
                  OR normalize_email(p_manager.src_raw->>'Guardian Email') = normalize_email(v_user_email)
              )
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION get_operational_contacts(p_act_id UUID)
RETURNS TABLE (
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- 1. Performance Managers (Participants with role 'Manager')
    SELECT
        p.first_name || ' ' || p.last_name as contact_name,
        'Act Manager' as contact_role,
        extract_participant_contact_email(p.src_raw, p.notes) as contact_email,
        COALESCE(p.guardian_phone, (p.src_raw->>'phone')::text) as contact_phone,
        1 as priority
    FROM act_participants ap
    JOIN participants p ON p.id = ap.participant_id
    WHERE ap.act_id = p_act_id AND ap.role = 'Manager'

    UNION ALL

    -- 2. Act Admins (Users linked via Participant Manager role)
    SELECT
        up.email as contact_name,
        'Act Admin' as contact_role,
        up.email as contact_email,
        NULL::text as contact_phone,
        2 as priority
    FROM act_participants ap
    JOIN participants p ON p.id = ap.participant_id
    JOIN user_profiles up ON normalize_email(up.email) = extract_participant_contact_email(p.src_raw, p.notes)
    JOIN event_members em ON em.user_id = up.id AND em.event_id = p.event_id
    WHERE ap.act_id = p_act_id AND ap.role = 'Manager' AND em.role = 'ActAdmin'

    UNION ALL

    -- 3. Event Admins (Static Fallback)
    SELECT
        up.email as contact_name,
        'Event Admin' as contact_role,
        up.email as contact_email,
        NULL::text as contact_phone,
        3 as priority
    FROM event_members em
    JOIN user_profiles up ON up.id = em.user_id
    JOIN acts a ON a.event_id = em.event_id
    WHERE a.id = p_act_id AND em.role = 'EventAdmin'

    ORDER BY priority ASC, contact_name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION set_performance_request_status(
    p_request_id UUID,
    p_action TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS performance_requests AS $$
DECLARE
    v_request performance_requests%ROWTYPE;
    v_updated performance_requests%ROWTYPE;
    v_next_status TEXT;
BEGIN
    SELECT * INTO v_request
    FROM performance_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance request not found';
    END IF;

    IF NOT (auth_is_super_admin() OR auth_event_role(v_request.event_id) = 'EventAdmin') THEN
        RAISE EXCEPTION 'Insufficient permissions to update performance request';
    END IF;

    v_next_status := CASE
        WHEN p_action IN ('review', 'reviewed') THEN 'reviewed'
        WHEN p_action = 'approve' THEN 'approved'
        WHEN p_action = 'reject' THEN 'rejected'
        ELSE NULL
    END;

    IF v_next_status IS NULL THEN
        RAISE EXCEPTION 'Unsupported performance request action: %', p_action;
    END IF;

    UPDATE performance_requests
    SET
        request_status = v_next_status,
        reviewed_at = CASE
            WHEN v_next_status IN ('reviewed', 'approved', 'rejected') THEN COALESCE(reviewed_at, NOW())
            ELSE reviewed_at
        END,
        reviewed_by = CASE
            WHEN v_next_status IN ('reviewed', 'approved', 'rejected') THEN COALESCE(reviewed_by, auth.uid())
            ELSE reviewed_by
        END,
        approved_at = CASE
            WHEN v_next_status = 'approved' THEN NOW()
            WHEN v_next_status = 'rejected' THEN NULL
            ELSE approved_at
        END,
        approved_by = CASE
            WHEN v_next_status = 'approved' THEN auth.uid()
            WHEN v_next_status = 'rejected' THEN NULL
            ELSE approved_by
        END
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO intake_audit_events (
        organization_id,
        event_id,
        import_run_id,
        entity_type,
        entity_id,
        action,
        note,
        before_data,
        after_data,
        metadata
    )
    VALUES (
        v_updated.organization_id,
        v_updated.event_id,
        v_updated.import_run_id,
        'performance_request',
        v_updated.id,
        v_next_status,
        p_note,
        to_jsonb(v_request),
        to_jsonb(v_updated),
        jsonb_build_object(
            'request_status', v_updated.request_status,
            'conversion_status', v_updated.conversion_status
        )
    );

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION convert_performance_request_to_act(
    p_request_id UUID,
    p_setup_time_minutes INTEGER DEFAULT 2
)
RETURNS UUID AS $$
DECLARE
    v_request performance_requests%ROWTYPE;
    v_updated performance_requests%ROWTYPE;
    v_act_id UUID;
    v_act_notes TEXT;
BEGIN
    SELECT * INTO v_request
    FROM performance_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance request not found';
    END IF;

    IF NOT (auth_is_super_admin() OR auth_event_role(v_request.event_id) = 'EventAdmin') THEN
        RAISE EXCEPTION 'Insufficient permissions to convert performance request';
    END IF;

    IF v_request.converted_act_id IS NOT NULL AND v_request.conversion_status = 'converted' THEN
        RETURN v_request.converted_act_id;
    END IF;

    IF v_request.request_status <> 'approved' THEN
        RAISE EXCEPTION 'Only approved performance requests can be converted';
    END IF;

    v_act_notes := concat_ws(
        E'\n\n',
        NULLIF(v_request.notes, ''),
        NULLIF(
            concat_ws(
                ' | ',
                CASE WHEN NULLIF(v_request.lead_name, '') IS NOT NULL THEN 'Lead: ' || v_request.lead_name END,
                CASE WHEN NULLIF(v_request.lead_email, '') IS NOT NULL THEN 'Email: ' || v_request.lead_email END,
                CASE WHEN NULLIF(v_request.lead_phone, '') IS NOT NULL THEN 'Phone: ' || v_request.lead_phone END
            ),
            ''
        )
    );

    INSERT INTO acts (
        event_id,
        name,
        duration_minutes,
        setup_time_minutes,
        arrival_status,
        notes
    )
    VALUES (
        v_request.event_id,
        v_request.title,
        GREATEST(COALESCE(v_request.duration_estimate_minutes, 5), 1),
        GREATEST(COALESCE(p_setup_time_minutes, 2), 0),
        'Not Arrived',
        v_act_notes
    )
    RETURNING id INTO v_act_id;

    UPDATE performance_requests
    SET
        conversion_status = 'converted',
        converted_act_id = v_act_id,
        converted_at = NOW(),
        converted_by = auth.uid()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO intake_audit_events (
        organization_id,
        event_id,
        import_run_id,
        entity_type,
        entity_id,
        action,
        note,
        before_data,
        after_data,
        metadata
    )
    VALUES (
        v_updated.organization_id,
        v_updated.event_id,
        v_updated.import_run_id,
        'performance_request',
        v_updated.id,
        'converted',
        'Converted approved performance request into an operational performance.',
        to_jsonb(v_request),
        to_jsonb(v_updated),
        jsonb_build_object(
            'converted_act_id', v_act_id,
            'request_status', v_updated.request_status,
            'conversion_status', v_updated.conversion_status
        )
    );

    RETURN v_act_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION ensure_org_member(p_org_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (p_org_id, p_user_id, 'Member')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION upsert_pending_event_access(
    p_email TEXT,
    p_org_id UUID,
    p_event_id UUID,
    p_target_role TEXT,
    p_grant_type TEXT,
    p_source_type TEXT DEFAULT NULL,
    p_source_participant_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'pending'
)
RETURNS VOID AS $$
DECLARE
    v_email TEXT;
BEGIN
    v_email := normalize_email(p_email);

    IF NOT is_valid_email(v_email) THEN
        RETURN;
    END IF;

    INSERT INTO pending_event_access (
        normalized_email,
        organization_id,
        event_id,
        target_role,
        grant_type,
        source_type,
        source_participant_id,
        status
    ) VALUES (
        v_email,
        p_org_id,
        p_event_id,
        p_target_role,
        p_grant_type,
        p_source_type,
        p_source_participant_id,
        p_status
    )
    ON CONFLICT (normalized_email, event_id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        target_role = CASE
            WHEN pending_event_access.grant_type = 'manual' AND EXCLUDED.grant_type = 'automated'
                THEN pending_event_access.target_role
            ELSE EXCLUDED.target_role
        END,
        grant_type = CASE
            WHEN pending_event_access.grant_type = 'manual' AND EXCLUDED.grant_type = 'automated'
                THEN pending_event_access.grant_type
            ELSE EXCLUDED.grant_type
        END,
        source_type = COALESCE(EXCLUDED.source_type, pending_event_access.source_type),
        source_participant_id = COALESCE(EXCLUDED.source_participant_id, pending_event_access.source_participant_id),
        status = CASE
            WHEN pending_event_access.grant_type = 'manual' AND EXCLUDED.grant_type = 'automated'
                THEN pending_event_access.status
            ELSE EXCLUDED.status
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION revoke_automated_event_access_for_email(p_event_id UUID, p_email TEXT)
RETURNS VOID AS $$
DECLARE
    v_email TEXT;
    v_user_id UUID;
BEGIN
    v_email := normalize_email(p_email);

    IF NOT is_valid_email(v_email) THEN
        RETURN;
    END IF;

    SELECT id INTO v_user_id
    FROM user_profiles
    WHERE normalize_email(email) = v_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        DELETE FROM event_members
        WHERE event_id = p_event_id
          AND user_id = v_user_id
          AND role = 'Member'
          AND grant_type = 'automated';
    END IF;

    UPDATE pending_event_access
    SET status = 'revoked',
        updated_at = NOW()
    WHERE normalized_email = v_email
      AND event_id = p_event_id
      AND grant_type = 'automated'
      AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION fulfill_pending_event_access_for_user(p_user_id UUID, p_email TEXT)
RETURNS VOID AS $$
DECLARE
    v_email TEXT;
    pending_row RECORD;
    existing_member RECORD;
BEGIN
    v_email := normalize_email(p_email);

    IF NOT is_valid_email(v_email) THEN
        RETURN;
    END IF;

    FOR pending_row IN
        SELECT *
        FROM pending_event_access
        WHERE normalized_email = v_email
          AND status = 'pending'
        ORDER BY created_at ASC
    LOOP
        PERFORM ensure_org_member(pending_row.organization_id, p_user_id);

        SELECT id, role, grant_type
        INTO existing_member
        FROM event_members
        WHERE event_id = pending_row.event_id
          AND user_id = p_user_id
        LIMIT 1;

        IF existing_member.id IS NULL THEN
            INSERT INTO event_members (event_id, user_id, role, grant_type)
            VALUES (pending_row.event_id, p_user_id, pending_row.target_role, pending_row.grant_type);
        ELSIF pending_row.grant_type = 'manual' THEN
            UPDATE event_members
            SET role = pending_row.target_role,
                grant_type = 'manual'
            WHERE id = existing_member.id;
        END IF;

        UPDATE pending_event_access
        SET status = 'fulfilled',
            fulfilled_user_id = p_user_id,
            updated_at = NOW()
        WHERE id = pending_row.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION reconcile_source_participant_access(p_participant_id UUID, p_previous_email TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_participant RECORD;
    v_org_id UUID;
    v_email TEXT;
    v_user_id UUID;
    v_existing_member RECORD;
BEGIN
    SELECT *
    INTO v_participant
    FROM participants
    WHERE id = p_participant_id;

    IF v_participant.id IS NULL THEN
        RETURN;
    END IF;

    IF v_participant.source_system IS NULL OR v_participant.source_system = 'manual' THEN
        RETURN;
    END IF;

    v_email := extract_participant_contact_email(v_participant.src_raw, v_participant.notes);

    IF p_previous_email IS NOT NULL AND normalize_email(p_previous_email) IS DISTINCT FROM v_email THEN
        PERFORM revoke_automated_event_access_for_email(v_participant.event_id, p_previous_email);
    END IF;

    IF NOT is_valid_email(v_email) THEN
        RETURN;
    END IF;

    SELECT organization_id INTO v_org_id
    FROM events
    WHERE id = v_participant.event_id;

    IF v_participant.status = 'active' THEN
        SELECT id INTO v_user_id
        FROM user_profiles
        WHERE normalize_email(email) = v_email
        LIMIT 1;

        IF v_user_id IS NULL THEN
            PERFORM upsert_pending_event_access(
                v_email,
                v_org_id,
                v_participant.event_id,
                'Member',
                'automated',
                'participant',
                v_participant.id,
                'pending'
            );
            RETURN;
        END IF;

        PERFORM ensure_org_member(v_org_id, v_user_id);

        SELECT id, role, grant_type
        INTO v_existing_member
        FROM event_members
        WHERE event_id = v_participant.event_id
          AND user_id = v_user_id
        LIMIT 1;

        IF v_existing_member.id IS NULL THEN
            INSERT INTO event_members (event_id, user_id, role, grant_type)
            VALUES (v_participant.event_id, v_user_id, 'Member', 'automated');
        END IF;

        UPDATE pending_event_access
        SET status = 'fulfilled',
            fulfilled_user_id = v_user_id,
            updated_at = NOW()
        WHERE normalized_email = v_email
          AND event_id = v_participant.event_id
          AND status = 'pending'
          AND grant_type = 'automated';
    ELSE
        PERFORM revoke_automated_event_access_for_email(v_participant.event_id, v_email);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION trg_reconcile_source_participant_access()
RETURNS TRIGGER AS $$
DECLARE
    v_previous_email TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_previous_email := extract_participant_contact_email(OLD.src_raw, OLD.notes);
    END IF;

    PERFORM reconcile_source_participant_access(NEW.id, v_previous_email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION assign_org_role(p_org_id UUID, p_target_email TEXT, p_role TEXT)
RETURNS JSONB AS $$
DECLARE
    v_normalized_email TEXT;
    v_target_user_id UUID;
BEGIN
    IF NOT (auth_is_super_admin() OR auth_org_role(p_org_id) IN ('Owner', 'Admin')) THEN
        RAISE EXCEPTION 'Not authorized to manage organization access';
    END IF;

    v_normalized_email := normalize_email(p_target_email);

    IF NOT is_valid_email(v_normalized_email) THEN
        RAISE EXCEPTION 'A valid email address is required';
    END IF;

    SELECT id INTO v_target_user_id
    FROM user_profiles
    WHERE normalize_email(email) = v_normalized_email
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'User must sign in once before org access can be granted';
    END IF;

    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (p_org_id, v_target_user_id, p_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RETURN jsonb_build_object(
        'outcome', 'Granted',
        'message', format('%s org access granted to %s.', p_role, v_normalized_email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION assign_event_role(p_event_id UUID, p_target_email TEXT, p_role TEXT)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_normalized_email TEXT;
    v_target_user_id UUID;
    v_existing_member RECORD;
    v_outcome TEXT := 'Granted';
BEGIN
    IF NOT (auth_is_super_admin() OR auth_event_role(p_event_id) = 'EventAdmin') THEN
        RAISE EXCEPTION 'Not authorized to manage event access';
    END IF;

    SELECT organization_id INTO v_org_id
    FROM events
    WHERE id = p_event_id;

    v_normalized_email := normalize_email(p_target_email);

    IF NOT is_valid_email(v_normalized_email) THEN
        RAISE EXCEPTION 'A valid email address is required';
    END IF;

    SELECT em.id, em.role, em.grant_type
    INTO v_existing_member
    FROM event_members em
    JOIN user_profiles up ON up.id = em.user_id
    WHERE em.event_id = p_event_id
      AND normalize_email(up.email) = v_normalized_email
    LIMIT 1;

    SELECT id INTO v_target_user_id
    FROM user_profiles
    WHERE normalize_email(email) = v_normalized_email
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        PERFORM upsert_pending_event_access(
            v_normalized_email,
            v_org_id,
            p_event_id,
            p_role,
            'manual',
            'manual_grant',
            NULL,
            'pending'
        );

        RETURN jsonb_build_object(
            'outcome', 'Pending',
            'message', format('%s access is pending until %s signs in.', p_role, v_normalized_email)
        );
    END IF;

    PERFORM ensure_org_member(v_org_id, v_target_user_id);

    INSERT INTO event_members (event_id, user_id, role, grant_type)
    VALUES (p_event_id, v_target_user_id, p_role, 'manual')
    ON CONFLICT (event_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        grant_type = 'manual';

    IF v_existing_member.id IS NOT NULL THEN
        v_outcome := CASE
            WHEN v_existing_member.role = p_role AND COALESCE(v_existing_member.grant_type, 'manual') = 'manual' THEN 'No Change'
            ELSE 'Updated'
        END;
    END IF;

    UPDATE pending_event_access
    SET status = 'fulfilled',
        fulfilled_user_id = v_target_user_id,
        updated_at = NOW()
    WHERE normalized_email = v_normalized_email
      AND event_id = p_event_id
      AND status = 'pending';

    RETURN jsonb_build_object(
        'outcome', v_outcome,
        'message', format('%s access saved for %s.', p_role, v_normalized_email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

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

CREATE OR REPLACE FUNCTION enforce_requirement_policy_scope()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
BEGIN
    IF NEW.event_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT organization_id INTO v_org_id
    FROM events
    WHERE id = NEW.event_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Requirement policy event is not linked to a valid organization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM requirement_policies rp
        WHERE rp.organization_id = v_org_id
          AND rp.event_id IS NULL
          AND rp.code = NEW.code
          AND rp.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Event policy % cannot override inherited organization policy', NEW.code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  PERFORM fulfill_pending_event_access_for_user(new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_view_performance_request_contact_pii(p_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_event_id UUID;
  v_role TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM app_super_admins WHERE user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT event_id INTO v_event_id
  FROM performance_requests
  WHERE id = p_request_id;

  IF v_event_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT get_effective_event_role(v_event_id, p_user_id) INTO v_role;
  RETURN v_role = 'EventAdmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    OR (act_id IS NOT NULL AND can_view_act_detail(act_id, auth.uid()))
    OR (participant_id IS NOT NULL AND can_view_participant(participant_id, auth.uid()))
);
CREATE POLICY "requirement_assignments_manage" ON requirement_assignments FOR ALL USING (
    auth_is_super_admin()
    OR (act_id IS NOT NULL AND auth_event_role(get_act_event_id(act_id)) = 'EventAdmin')
    OR (participant_id IS NOT NULL AND auth_event_role(get_participant_event_id(participant_id)) = 'EventAdmin')
);

DROP TRIGGER IF EXISTS trg_enforce_requirement_policy_scope ON requirement_policies;
CREATE TRIGGER trg_enforce_requirement_policy_scope
BEFORE INSERT OR UPDATE ON requirement_policies
FOR EACH ROW EXECUTE FUNCTION enforce_requirement_policy_scope();

ALTER TABLE app_super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_select_self" ON app_super_admins FOR SELECT USING (auth.uid() = user_id OR auth_is_super_admin());
CREATE POLICY "super_admins_manage" ON app_super_admins FOR ALL USING (auth_is_super_admin());

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (auth_is_super_admin() OR auth_org_role(id) IS NOT NULL);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (auth_is_super_admin() OR auth_org_role(id) IN ('Owner', 'Admin'));

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_members_select" ON organization_members FOR SELECT USING (auth_is_super_admin() OR auth_org_role(organization_id) IS NOT NULL);

ALTER TABLE pending_event_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_event_access_select" ON pending_event_access FOR SELECT USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);
CREATE POLICY "pending_event_access_manage" ON pending_event_access FOR ALL USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON events FOR SELECT USING (auth_is_super_admin() OR auth_event_role(id) IS NOT NULL);
CREATE POLICY "events_manage" ON events FOR ALL USING (auth_is_super_admin() OR auth_event_role(id) = 'EventAdmin');

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_select" ON participants FOR SELECT USING (can_view_participant(id, auth.uid()));
CREATE POLICY "participants_manage" ON participants FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

-- 6b. View for hardened participant visibility (Masked PII)
CREATE OR REPLACE VIEW v_participants_hardened AS
SELECT
    p.id,
    p.event_id,
    p.first_name,
    p.last_name,
    p.is_minor,
    CASE WHEN can_view_guardian_pii(p.id, auth.uid()) THEN p.guardian_name ELSE NULL END as guardian_name,
    CASE WHEN can_view_guardian_pii(p.id, auth.uid()) THEN p.guardian_phone ELSE NULL END as guardian_phone,
    p.guardian_relationship,
    p.identity_verified,
    p.identity_notes,
    p.notes,
    p.has_special_requests,
    p.special_request_raw,
    p.source_system,
    p.source_instance,
    p.src_raw,
    p.status,
    p.created_at,
    p.updated_at,
    can_view_guardian_pii(p.id, auth.uid()) as is_pii_unmasked
FROM participants p
WHERE can_view_participant(p.id, auth.uid());

GRANT SELECT ON v_participants_hardened TO authenticated;
GRANT SELECT ON v_participants_hardened TO anon;
GRANT SELECT ON v_participants_hardened TO service_role;

CREATE OR REPLACE VIEW v_performance_requests_hardened AS
SELECT
    pr.id,
    pr.organization_id,
    pr.event_id,
    pr.import_run_id,
    pr.event_source_id,
    pr.source_anchor,
    pr.title,
    pr.lead_name,
    CASE WHEN can_view_performance_request_contact_pii(pr.id, auth.uid()) THEN pr.lead_email ELSE NULL END AS lead_email,
    CASE WHEN can_view_performance_request_contact_pii(pr.id, auth.uid()) THEN pr.lead_phone ELSE NULL END AS lead_phone,
    pr.duration_estimate_minutes,
    pr.music_supplied,
    pr.roster_supplied,
    pr.notes,
    pr.raw_payload,
    pr.request_status,
    pr.conversion_status,
    pr.converted_act_id,
    a.name AS converted_act_name,
    pr.reviewed_at,
    pr.reviewed_by,
    pr.approved_at,
    pr.approved_by,
    pr.converted_at,
    pr.converted_by,
    pr.created_at,
    pr.updated_at,
    can_view_performance_request_contact_pii(pr.id, auth.uid()) AS is_contact_pii_unmasked
FROM performance_requests pr
LEFT JOIN acts a ON a.id = pr.converted_act_id
WHERE auth_is_super_admin() OR auth_event_role(pr.event_id) IS NOT NULL;

GRANT SELECT ON v_performance_requests_hardened TO authenticated;
GRANT SELECT ON v_performance_requests_hardened TO service_role;

ALTER TABLE participant_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participant_assets_select" ON participant_assets FOR SELECT USING (auth_is_super_admin() OR can_view_participant(participant_id, auth.uid()));
CREATE POLICY "participant_assets_manage" ON participant_assets FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_participant_event_id(participant_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE participant_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participant_notes_select" ON participant_notes FOR SELECT USING (auth_is_super_admin() OR can_view_participant(participant_id, auth.uid()));
CREATE POLICY "participant_notes_manage" ON participant_notes FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_participant_event_id(participant_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acts_select" ON acts FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(id, auth.uid()));
CREATE POLICY "acts_manage_admin" ON acts FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

ALTER TABLE act_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_participants_select" ON act_participants FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(act_id, auth.uid()));
CREATE POLICY "act_participants_manage" ON act_participants FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');

ALTER TABLE act_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_assets_select" ON act_assets FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(act_id, auth.uid()));
CREATE POLICY "act_assets_manage" ON act_assets FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');

ALTER TABLE act_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_requirements_select" ON act_requirements FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(act_id, auth.uid()));
CREATE POLICY "act_requirements_manage" ON act_requirements FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');

ALTER TABLE act_readiness_practices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_readiness_practices_select" ON act_readiness_practices FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(act_id, auth.uid()));
CREATE POLICY "act_readiness_practices_manage" ON act_readiness_practices FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE act_readiness_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_readiness_items_select" ON act_readiness_items FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(act_id, auth.uid()));
CREATE POLICY "act_readiness_items_manage" ON act_readiness_items FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));

ALTER TABLE act_readiness_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_readiness_issues_select" ON act_readiness_issues FOR SELECT USING (auth_is_super_admin() OR can_view_act_detail(act_id, auth.uid()));
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

ALTER TABLE intake_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intake_audit_events_select" ON intake_audit_events FOR SELECT USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);
CREATE POLICY "intake_audit_events_manage" ON intake_audit_events FOR ALL USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
) WITH CHECK (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);

ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_runs_select" ON import_runs FOR SELECT USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);
CREATE POLICY "import_runs_manage" ON import_runs FOR ALL USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
) WITH CHECK (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);

ALTER TABLE import_run_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_run_records_select" ON import_run_records FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM import_runs ir
        WHERE ir.id = import_run_id
          AND (auth_is_super_admin() OR auth_event_role(ir.event_id) = 'EventAdmin')
    )
);
CREATE POLICY "import_run_records_manage" ON import_run_records FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM import_runs ir
        WHERE ir.id = import_run_id
          AND (auth_is_super_admin() OR auth_event_role(ir.event_id) = 'EventAdmin')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM import_runs ir
        WHERE ir.id = import_run_id
          AND (auth_is_super_admin() OR auth_event_role(ir.event_id) = 'EventAdmin')
    )
);

ALTER TABLE client_error_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_error_events_insert_scoped" ON client_error_events FOR INSERT WITH CHECK (
    auth.uid() = reported_by
    AND (
        auth_is_super_admin()
        OR (event_id IS NOT NULL AND auth_event_role(event_id) IS NOT NULL)
        OR (organization_id IS NOT NULL AND auth_org_role(organization_id) IS NOT NULL)
    )
);
CREATE POLICY "client_error_events_select_internal" ON client_error_events FOR SELECT USING (
    auth_is_super_admin()
);
CREATE POLICY "client_error_events_manage_internal" ON client_error_events FOR ALL USING (
    auth_is_super_admin()
) WITH CHECK (
    auth_is_super_admin()
);

GRANT SELECT ON v_recent_client_error_events TO authenticated;
GRANT SELECT ON v_recent_client_error_events TO service_role;

ALTER TABLE performance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "performance_requests_select" ON performance_requests FOR SELECT USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);
CREATE POLICY "performance_requests_manage" ON performance_requests FOR ALL USING (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
) WITH CHECK (
    auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin'
);

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
CREATE TRIGGER audit_performance_requests AFTER INSERT OR UPDATE OR DELETE ON performance_requests FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

CREATE OR REPLACE FUNCTION handle_performance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_performance_request_updated
    BEFORE UPDATE ON performance_requests
    FOR EACH ROW EXECUTE FUNCTION handle_performance_requests_updated_at();
    
CREATE TRIGGER on_participants_updated
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION handle_performance_requests_updated_at();

DROP TRIGGER IF EXISTS trg_reconcile_source_participant_access ON participants;
CREATE TRIGGER trg_reconcile_source_participant_access
AFTER INSERT OR UPDATE OF status, notes, src_raw, source_system ON participants
FOR EACH ROW EXECUTE FUNCTION trg_reconcile_source_participant_access();

DROP TRIGGER IF EXISTS trg_bridge_act_requirements_sync ON act_requirements;
CREATE TRIGGER trg_bridge_act_requirements_sync
AFTER INSERT OR UPDATE OR DELETE ON act_requirements
FOR EACH ROW EXECUTE FUNCTION bridge_act_requirements_sync();

-- ==========================================
-- 9. PERFORMANCE OPTIMIZATION (Indexes)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_event_access_event_status ON pending_event_access(event_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_event_access_email ON pending_event_access(normalized_email);
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
CREATE INDEX IF NOT EXISTS idx_performance_requests_event_id ON performance_requests(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_requests_import_id ON performance_requests(import_run_id);
CREATE INDEX IF NOT EXISTS idx_performance_requests_status ON performance_requests(request_status, conversion_status);
CREATE INDEX IF NOT EXISTS idx_client_error_events_created_at ON client_error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_events_feature_area ON client_error_events(feature_area, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_events_event_id ON client_error_events(event_id, created_at DESC);
