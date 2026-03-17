CREATE OR REPLACE FUNCTION public.update_act_arrival_status(p_act_id UUID, p_status TEXT)
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
