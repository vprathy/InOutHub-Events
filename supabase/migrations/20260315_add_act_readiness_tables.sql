CREATE TABLE IF NOT EXISTS act_readiness_practices (
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

CREATE TABLE IF NOT EXISTS act_readiness_items (
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

CREATE TABLE IF NOT EXISTS act_readiness_issues (
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

ALTER TABLE act_readiness_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_readiness_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_readiness_issues ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "act_readiness_practices_select" ON act_readiness_practices FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "act_readiness_practices_manage" ON act_readiness_practices FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "act_readiness_items_select" ON act_readiness_items FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "act_readiness_items_manage" ON act_readiness_items FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "act_readiness_issues_select" ON act_readiness_issues FOR SELECT USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "act_readiness_issues_manage" ON act_readiness_issues FOR ALL USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) = 'EventAdmin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS audit_act_readiness_practices ON act_readiness_practices;
CREATE TRIGGER audit_act_readiness_practices AFTER INSERT OR UPDATE OR DELETE ON act_readiness_practices FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

DROP TRIGGER IF EXISTS audit_act_readiness_items ON act_readiness_items;
CREATE TRIGGER audit_act_readiness_items AFTER INSERT OR UPDATE OR DELETE ON act_readiness_items FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

DROP TRIGGER IF EXISTS audit_act_readiness_issues ON act_readiness_issues;
CREATE TRIGGER audit_act_readiness_issues AFTER INSERT OR UPDATE OR DELETE ON act_readiness_issues FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

CREATE INDEX IF NOT EXISTS idx_act_readiness_practices_act_id ON act_readiness_practices(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_practices_starts_at ON act_readiness_practices(starts_at);
CREATE INDEX IF NOT EXISTS idx_act_readiness_items_act_id ON act_readiness_items(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_items_status ON act_readiness_items(status);
CREATE INDEX IF NOT EXISTS idx_act_readiness_issues_act_id ON act_readiness_issues(act_id);
CREATE INDEX IF NOT EXISTS idx_act_readiness_issues_status ON act_readiness_issues(status);
