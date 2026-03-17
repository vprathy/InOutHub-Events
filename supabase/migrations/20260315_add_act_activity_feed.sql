DROP TRIGGER IF EXISTS audit_act_participants ON act_participants;
CREATE TRIGGER audit_act_participants AFTER INSERT OR UPDATE OR DELETE ON act_participants FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

DROP TRIGGER IF EXISTS audit_act_assets ON act_assets;
CREATE TRIGGER audit_act_assets AFTER INSERT OR UPDATE OR DELETE ON act_assets FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

DROP TRIGGER IF EXISTS audit_act_requirements ON act_requirements;
CREATE TRIGGER audit_act_requirements AFTER INSERT OR UPDATE OR DELETE ON act_requirements FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

CREATE OR REPLACE FUNCTION public.get_act_activity_feed(p_act_id UUID, p_limit INTEGER DEFAULT 20)
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
