-- InOutHub MVP V1 Core Architecture Schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. ROOT HIERARCHY (Organizations & Events)
-- ==========================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Users (Staff, Admins, Stage Managers)
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
-- Platform-Level Super Admins (Bypasses Org RBAC)
CREATE TABLE app_super_admins (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maps App Users to Organizations with strict RBAC roles
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

-- ==========================================
-- 2. THE EVENT ROSTER
-- ==========================================

-- A clean, validated record of a human being scoped specifically to an Event.
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    -- Lightweight guardian/contact info (Optional, used if the event is youth-heavy)
    guardian_name TEXT,
    guardian_phone TEXT,
    notes TEXT,
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

-- The primary operational performance unit.
CREATE TABLE acts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Logistics Data
    duration_minutes INTEGER NOT NULL DEFAULT 5,
    setup_time_minutes INTEGER NOT NULL DEFAULT 2,
    -- Live Operational State (Are they in the building?)
    arrival_status TEXT NOT NULL DEFAULT 'Not Arrived' CHECK (arrival_status IN ('Not Arrived', 'Arrived', 'Backstage', 'Ready')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maps Participants from the roster to specific Acts with specific roles.
CREATE TABLE act_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Performer', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(act_id, participant_id)
);

-- Logistics Details
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

-- Places Acts onto Stages at specific times.
CREATE TABLE lineup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stage_id, sort_order)
);

-- The live execution state of the Stage, driving the Stage Console.
CREATE TABLE stage_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL UNIQUE REFERENCES stages(id) ON DELETE CASCADE,
    -- Points to the specific LineupItem currently happening
    current_lineup_item_id UUID REFERENCES lineup_items(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Idle' CHECK (status IN ('Idle', 'Active', 'Paused', 'Finished')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. REAL-TIME PUBLICATION
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE acts;
ALTER PUBLICATION supabase_realtime ADD TABLE lineup_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stage_state;

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_state ENABLE ROW LEVEL SECURITY;

-- FOR V1 DEVELOPMENT ONLY:
CREATE POLICY "Allow public read/write - DEV ONLY" ON organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON app_super_admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON organization_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON acts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON act_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON act_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON act_requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON lineup_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write - DEV ONLY" ON stage_state FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 7. PERFORMANCE OPTIMIZATION (Indexes)
-- ==========================================
-- Foreign keys are not indexed by default in Postgres. 
-- These are critical for avoiding sequential scans as the database grows.

-- Organization & Event Hierarchy
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id);

-- Event Roster & Acts
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_stages_event_id ON stages(event_id);
CREATE INDEX IF NOT EXISTS idx_acts_event_id ON acts(event_id);

-- Act Details & Lineup
CREATE INDEX IF NOT EXISTS idx_act_participants_act_id ON act_participants(act_id);
CREATE INDEX IF NOT EXISTS idx_act_participants_participant_id ON act_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_act_assets_act_id ON act_assets(act_id);
CREATE INDEX IF NOT EXISTS idx_act_requirements_act_id ON act_requirements(act_id);
CREATE INDEX IF NOT EXISTS idx_lineup_items_stage_id ON lineup_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_lineup_items_act_id ON lineup_items(act_id);

-- Live State
CREATE INDEX IF NOT EXISTS idx_stage_state_stage_id ON stage_state(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_state_current_lineup_item_id ON stage_state(current_lineup_item_id);
