CREATE OR REPLACE FUNCTION public.get_participant_activity_feed(p_participant_id UUID, p_limit INTEGER DEFAULT 20)
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
