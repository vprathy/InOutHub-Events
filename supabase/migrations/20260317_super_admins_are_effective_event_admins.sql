CREATE OR REPLACE FUNCTION public.get_effective_event_role(p_event_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_org_id uuid;
    v_org_role text;
    v_event_role text;
BEGIN
    IF EXISTS (SELECT 1 FROM public.app_super_admins WHERE user_id = p_user_id) THEN
        RETURN 'EventAdmin';
    END IF;

    SELECT organization_id INTO v_org_id
    FROM public.events
    WHERE id = p_event_id;

    SELECT role INTO v_org_role
    FROM public.organization_members
    WHERE organization_id = v_org_id AND user_id = p_user_id;

    IF v_org_role IN ('Owner', 'Admin') THEN
        RETURN 'EventAdmin';
    END IF;

    SELECT role INTO v_event_role
    FROM public.event_members
    WHERE event_id = p_event_id AND user_id = p_user_id;

    RETURN v_event_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';
