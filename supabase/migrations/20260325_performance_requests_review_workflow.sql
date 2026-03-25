-- Migration: 20260325_performance_requests_review_workflow.sql
-- Goal: Add backend workflow helpers and audit access for the Performance Requests review lane.

CREATE OR REPLACE FUNCTION public.set_performance_request_status(
    p_request_id UUID,
    p_action TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS public.performance_requests AS $$
DECLARE
    v_request public.performance_requests%ROWTYPE;
    v_updated public.performance_requests%ROWTYPE;
    v_next_status TEXT;
BEGIN
    SELECT * INTO v_request
    FROM public.performance_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance request not found';
    END IF;

    IF NOT (public.auth_is_super_admin() OR public.auth_event_role(v_request.event_id) = 'EventAdmin') THEN
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

    UPDATE public.performance_requests
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

    INSERT INTO public.intake_audit_events (
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

CREATE OR REPLACE FUNCTION public.convert_performance_request_to_act(
    p_request_id UUID,
    p_setup_time_minutes INTEGER DEFAULT 2
)
RETURNS UUID AS $$
DECLARE
    v_request public.performance_requests%ROWTYPE;
    v_updated public.performance_requests%ROWTYPE;
    v_act_id UUID;
    v_act_notes TEXT;
BEGIN
    SELECT * INTO v_request
    FROM public.performance_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance request not found';
    END IF;

    IF NOT (public.auth_is_super_admin() OR public.auth_event_role(v_request.event_id) = 'EventAdmin') THEN
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

    INSERT INTO public.acts (
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

    UPDATE public.performance_requests
    SET
        conversion_status = 'converted',
        converted_act_id = v_act_id,
        converted_at = NOW(),
        converted_by = auth.uid()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO public.intake_audit_events (
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

ALTER TABLE public.intake_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_audit_events_select" ON public.intake_audit_events FOR SELECT USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL
);

CREATE POLICY "intake_audit_events_manage" ON public.intake_audit_events FOR ALL USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
) WITH CHECK (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
);

GRANT SELECT, INSERT ON public.intake_audit_events TO authenticated;
