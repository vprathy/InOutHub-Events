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
    business_status TEXT CHECK (business_status IN ('Awaiting Roster', 'Needs Attention', 'Ready')),
    intake_source_type TEXT,
    intake_source_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE external_program_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    program_name TEXT NOT NULL,
    team_name TEXT,
    manager_name TEXT,
    manager_email TEXT,
    manager_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Waitlisted', 'Approved', 'Rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    linked_act_id UUID REFERENCES acts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE submission_roster_upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES external_program_submissions(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_url TEXT,
    template_version TEXT,
    uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary_ready_count INTEGER NOT NULL DEFAULT 0,
    summary_warning_count INTEGER NOT NULL DEFAULT 0,
    summary_blocked_count INTEGER NOT NULL DEFAULT 0,
    promotion_confirmed_at TIMESTAMP WITH TIME ZONE,
    promotion_confirmed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE TABLE submission_roster_staging_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES submission_roster_upload_batches(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES external_program_submissions(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    source_row_number INTEGER NOT NULL,
    raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapped_first_name TEXT,
    mapped_last_name TEXT,
    mapped_guardian_name TEXT,
    mapped_guardian_phone TEXT,
    mapped_notes TEXT,
    review_status TEXT NOT NULL DEFAULT 'blocked' CHECK (review_status IN ('ready', 'warning', 'blocked', 'promoted')),
    issue_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    operator_decision JSONB,
    source_system TEXT NOT NULL DEFAULT 'external_program_roster',
    source_instance TEXT,
    source_anchor_type TEXT,
    source_anchor_value TEXT,
    promoted_participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

CREATE OR REPLACE FUNCTION get_effective_event_role(p_event_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    v_org_id uuid;
    v_org_role text;
    v_event_role text;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.events WHERE id = p_event_id;
    SELECT role INTO v_org_role FROM public.organization_members WHERE organization_id = v_org_id AND user_id = p_user_id;
    IF v_org_role IN ('Owner', 'Admin') THEN RETURN 'EventAdmin'; END IF;
    SELECT role INTO v_event_role FROM public.event_members WHERE event_id = p_event_id AND user_id = p_user_id;
    RETURN v_event_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION get_external_program_submission_event_id(p_submission_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM external_program_submissions WHERE id = p_submission_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_submission_roster_batch_event_id(p_batch_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM submission_roster_upload_batches WHERE id = p_batch_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_external_program_submission(p_submission_id UUID)
RETURNS UUID AS $$
DECLARE
    v_submission public.external_program_submissions%ROWTYPE;
    v_act_id UUID;
    v_role TEXT;
BEGIN
    SELECT *
    INTO v_submission
    FROM public.external_program_submissions
    WHERE id = p_submission_id;

    IF v_submission.id IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    IF NOT auth_is_super_admin() THEN
        v_role := auth_event_role(v_submission.event_id);
        IF v_role <> 'EventAdmin' THEN
            RAISE EXCEPTION 'Insufficient privileges to approve external submission';
        END IF;
    END IF;

    IF v_submission.status = 'Rejected' THEN
        RAISE EXCEPTION 'Rejected submissions cannot be approved';
    END IF;

    IF v_submission.linked_act_id IS NOT NULL THEN
        UPDATE public.external_program_submissions
        SET
            status = 'Approved',
            approved_at = COALESCE(approved_at, NOW()),
            approved_by = COALESCE(approved_by, auth.uid()),
            updated_at = NOW()
        WHERE id = p_submission_id;

        UPDATE public.acts
        SET
            business_status = 'Awaiting Roster',
            intake_source_type = 'external_program_submission',
            intake_source_id = p_submission_id
        WHERE id = v_submission.linked_act_id;

        RETURN v_submission.linked_act_id;
    END IF;

    INSERT INTO public.acts (
        event_id,
        name,
        duration_minutes,
        setup_time_minutes,
        arrival_status,
        business_status,
        intake_source_type,
        intake_source_id,
        notes
    )
    VALUES (
        v_submission.event_id,
        COALESCE(NULLIF(v_submission.program_name, ''), NULLIF(v_submission.team_name, ''), 'Approved Program'),
        5,
        2,
        'Not Arrived',
        'Awaiting Roster',
        'external_program_submission',
        p_submission_id,
        v_submission.notes
    )
    RETURNING id INTO v_act_id;

    UPDATE public.external_program_submissions
    SET
        status = 'Approved',
        approved_at = COALESCE(approved_at, NOW()),
        approved_by = COALESCE(approved_by, auth.uid()),
        linked_act_id = v_act_id,
        updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN v_act_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_act_arrival_status(p_act_id UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
BEGIN
    SELECT event_id INTO v_event_id
    FROM public.acts
    WHERE acts.id = p_act_id;

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Act not found';
    END IF;

    IF NOT auth_is_super_admin() THEN
        v_role := auth_event_role(v_event_id);
        IF v_role NOT IN ('EventAdmin', 'StageManager') THEN
            RAISE EXCEPTION 'Insufficient privileges to update act arrival status';
        END IF;
    END IF;

    UPDATE public.acts
    SET arrival_status = p_status
    WHERE id = p_act_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_participant_event_id(p_participant_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM participants WHERE id = p_participant_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_participant_activity_feed(p_participant_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    table_name TEXT,
    record_id UUID,
    operation TEXT,
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by UUID,
    actor_name TEXT,
    old_data JSONB,
    new_data JSONB
) AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
BEGIN
    SELECT event_id INTO v_event_id
    FROM public.participants
    WHERE participants.id = p_participant_id;

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Participant not found';
    END IF;

    IF NOT auth_is_super_admin() THEN
        v_role := auth_event_role(v_event_id);
        IF v_role NOT IN ('EventAdmin', 'StageManager') THEN
            RAISE EXCEPTION 'Insufficient privileges to view participant activity';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        audit_logs.id,
        audit_logs.table_name,
        audit_logs.record_id,
        audit_logs.operation,
        audit_logs.changed_at,
        audit_logs.changed_by,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', user_profiles.first_name, user_profiles.last_name)), ''), user_profiles.email, 'System') AS actor_name,
        audit_logs.old_data,
        audit_logs.new_data
    FROM public.audit_logs
    LEFT JOIN public.user_profiles
        ON user_profiles.id = audit_logs.changed_by
    WHERE audit_logs.table_name = 'participants'
        AND audit_logs.record_id = p_participant_id
    ORDER BY audit_logs.changed_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_admins" ON audit_logs FOR SELECT USING (auth_is_super_admin());

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

ALTER TABLE external_program_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external_program_submissions_select" ON external_program_submissions FOR SELECT USING (auth_is_super_admin() OR auth_event_role(event_id) IS NOT NULL);
CREATE POLICY "external_program_submissions_manage" ON external_program_submissions FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

ALTER TABLE submission_roster_upload_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submission_roster_upload_batches_select" ON submission_roster_upload_batches FOR SELECT USING (auth_is_super_admin() OR auth_event_role(event_id) IS NOT NULL);
CREATE POLICY "submission_roster_upload_batches_manage" ON submission_roster_upload_batches FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

ALTER TABLE submission_roster_staging_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submission_roster_staging_rows_select" ON submission_roster_staging_rows FOR SELECT USING (auth_is_super_admin() OR auth_event_role(event_id) IS NOT NULL);
CREATE POLICY "submission_roster_staging_rows_manage" ON submission_roster_staging_rows FOR ALL USING (auth_is_super_admin() OR auth_event_role(event_id) = 'EventAdmin');

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

CREATE OR REPLACE FUNCTION get_act_activity_feed(p_act_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    table_name TEXT,
    record_id UUID,
    operation TEXT,
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by UUID,
    actor_name TEXT,
    entity_label TEXT,
    old_data JSONB,
    new_data JSONB
) AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
BEGIN
    SELECT event_id INTO v_event_id
    FROM public.acts
    WHERE acts.id = p_act_id;

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Act not found';
    END IF;

    IF NOT auth_is_super_admin() THEN
        v_role := auth_event_role(v_event_id);
        IF v_role NOT IN ('EventAdmin', 'StageManager') THEN
            RAISE EXCEPTION 'Insufficient privileges to view act activity';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        audit_logs.id,
        audit_logs.table_name,
        audit_logs.record_id,
        audit_logs.operation,
        audit_logs.changed_at,
        audit_logs.changed_by,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', user_profiles.first_name, user_profiles.last_name)), ''), user_profiles.email, 'System') AS actor_name,
        CASE audit_logs.table_name
            WHEN 'acts' THEN 'Performance'
            WHEN 'lineup_items' THEN 'Schedule'
            WHEN 'act_participants' THEN 'Cast'
            WHEN 'act_assets' THEN 'Assets'
            WHEN 'act_requirements' THEN 'Requirements'
            WHEN 'act_readiness_practices' THEN 'Practice'
            WHEN 'act_readiness_items' THEN 'Checklist'
            WHEN 'act_readiness_issues' THEN 'Issue'
            ELSE audit_logs.table_name
        END AS entity_label,
        audit_logs.old_data,
        audit_logs.new_data
    FROM public.audit_logs
    LEFT JOIN public.user_profiles
        ON user_profiles.id = audit_logs.changed_by
    WHERE
        (audit_logs.table_name = 'acts' AND audit_logs.record_id = p_act_id)
        OR (
            audit_logs.table_name IN (
                'lineup_items',
                'act_participants',
                'act_assets',
                'act_requirements',
                'act_readiness_practices',
                'act_readiness_items',
                'act_readiness_issues'
            )
            AND COALESCE(
                NULLIF(audit_logs.new_data ->> 'act_id', '')::UUID,
                NULLIF(audit_logs.old_data ->> 'act_id', '')::UUID
            ) = p_act_id
        )
    ORDER BY audit_logs.changed_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_participants AFTER INSERT OR UPDATE OR DELETE ON participants FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_acts AFTER INSERT OR UPDATE OR DELETE ON acts FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_external_program_submissions AFTER INSERT OR UPDATE OR DELETE ON external_program_submissions FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_submission_roster_upload_batches AFTER INSERT OR UPDATE OR DELETE ON submission_roster_upload_batches FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_events AFTER INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_org_members AFTER INSERT OR UPDATE OR DELETE ON organization_members FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_lineup_items AFTER INSERT OR UPDATE OR DELETE ON lineup_items FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_act_participants AFTER INSERT OR UPDATE OR DELETE ON act_participants FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_act_assets AFTER INSERT OR UPDATE OR DELETE ON act_assets FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
CREATE TRIGGER audit_act_requirements AFTER INSERT OR UPDATE OR DELETE ON act_requirements FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
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
CREATE INDEX IF NOT EXISTS idx_acts_business_status ON acts(business_status);
CREATE INDEX IF NOT EXISTS idx_external_program_submissions_event_id ON external_program_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_external_program_submissions_status ON external_program_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submission_roster_upload_batches_submission_id ON submission_roster_upload_batches(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_roster_staging_rows_batch_id ON submission_roster_staging_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_submission_roster_staging_rows_review_status ON submission_roster_staging_rows(review_status);
CREATE INDEX IF NOT EXISTS idx_act_readiness_practices_act_id ON act_readiness_practices(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_practices_starts_at ON act_readiness_practices(starts_at);
CREATE INDEX IF NOT EXISTS idx_act_readiness_items_act_id ON act_readiness_items(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_items_status ON act_readiness_items(status);
CREATE INDEX IF NOT EXISTS idx_act_readiness_issues_act_id ON act_readiness_issues(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_issues_status ON act_readiness_issues(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
