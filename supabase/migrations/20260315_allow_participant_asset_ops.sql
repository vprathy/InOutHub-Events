CREATE OR REPLACE FUNCTION public.get_participant_event_id(p_participant_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM public.participants WHERE id = p_participant_id;
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE public.participant_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participant_assets_select" ON public.participant_assets;
CREATE POLICY "participant_assets_select" ON public.participant_assets
    FOR SELECT
    USING (
        auth_is_super_admin()
        OR auth_event_role(get_participant_event_id(participant_id)) IS NOT NULL
    );

DROP POLICY IF EXISTS "participant_assets_manage" ON public.participant_assets;
CREATE POLICY "participant_assets_manage" ON public.participant_assets
    FOR ALL
    USING (
        auth_is_super_admin()
        OR auth_event_role(get_participant_event_id(participant_id)) IN ('EventAdmin', 'StageManager')
    );

DROP POLICY IF EXISTS "participant_notes_select" ON public.participant_notes;
CREATE POLICY "participant_notes_select" ON public.participant_notes
    FOR SELECT
    USING (
        auth_is_super_admin()
        OR auth_event_role(get_participant_event_id(participant_id)) IS NOT NULL
    );

DROP POLICY IF EXISTS "participant_notes_manage" ON public.participant_notes;
CREATE POLICY "participant_notes_manage" ON public.participant_notes
    FOR ALL
    USING (
        auth_is_super_admin()
        OR auth_event_role(get_participant_event_id(participant_id)) IN ('EventAdmin', 'StageManager')
    );
