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
    asset_type TEXT NOT NULL CHECK (asset_type IN ('Prop', 'Instrument', 'Other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE act_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('Audio', 'Lighting', 'Microphone', 'Video', 'Waiver')),
    description TEXT NOT NULL,
    file_url TEXT, 
    fulfilled BOOLEAN DEFAULT false, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- ==========================================
-- 9. PERFORMANCE OPTIMIZATION (Indexes)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_stages_event_id ON stages(event_id);
CREATE INDEX IF NOT EXISTS idx_acts_event_id ON acts(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
