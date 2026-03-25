-- Migration: 20260325_add_performance_request_reopen_action.sql
-- Goal: Allow EventAdmin to move approved, not-yet-converted requests back to pending.

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
        WHEN p_action IN ('reopen', 'move_back_to_pending', 'pending') THEN 'pending'
        ELSE NULL
    END;

    IF v_next_status IS NULL THEN
        RAISE EXCEPTION 'Unsupported performance request action: %', p_action;
    END IF;

    IF p_action IN ('reopen', 'move_back_to_pending', 'pending') THEN
        IF v_request.request_status <> 'approved' THEN
            RAISE EXCEPTION 'Only approved requests can be moved back to pending';
        END IF;

        IF v_request.conversion_status = 'converted' OR v_request.converted_act_id IS NOT NULL THEN
            RAISE EXCEPTION 'Converted requests cannot be moved back to pending';
        END IF;
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
            WHEN v_next_status = 'pending' THEN NULL
            ELSE approved_at
        END,
        approved_by = CASE
            WHEN v_next_status = 'approved' THEN auth.uid()
            WHEN v_next_status = 'rejected' THEN NULL
            WHEN v_next_status = 'pending' THEN NULL
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
