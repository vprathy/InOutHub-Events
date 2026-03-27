-- Migration: 20260326_preserve_imported_contacts.sql
-- Goal: Add metadata to acts and update RPC to generically preserve imported contacts.

-- 1. Add metadata container to acts
ALTER TABLE public.acts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Update Conversion RPC with Generic Extraction Logic
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
    v_imported_contacts JSONB;
BEGIN
    -- Locked fetch of the request context
    SELECT * INTO v_request
    FROM public.performance_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance request not found';
    END IF;

    -- Permissions Check
    IF NOT (public.auth_is_super_admin() OR public.auth_event_role(v_request.event_id) = 'EventAdmin') THEN
        RAISE EXCEPTION 'Insufficient permissions to convert performance request';
    END IF;

    -- Guard against double-conversion
    IF v_request.converted_act_id IS NOT NULL AND v_request.conversion_status = 'converted' THEN
        RETURN v_request.converted_act_id;
    END IF;

    -- State Guard
    IF v_request.request_status <> 'approved' THEN
        RAISE EXCEPTION 'Only approved performance requests can be converted';
    END IF;

    -- GENERIC EXTRACTION: Group all keys ending in Name/Email/Phone into contact roles
    WITH prefixes AS (
        SELECT DISTINCT 
            trim(regexp_replace(key, '\s+(name|email|phone|phone number|first name|last name)$', '', 'i')) as role
        FROM jsonb_object_keys(v_request.raw_payload) as key
        WHERE key ~* '\s+(name|email|phone|phone number|first name|last name)$'
    ),
    contact_groups AS (
        SELECT 
            role,
            COALESCE(
                v_request.raw_payload->>(role || ' Name'),
                NULLIF(trim(concat_ws(' ', 
                    v_request.raw_payload->>(role || ' First Name'), 
                    v_request.raw_payload->>(role || ' Last Name')
                )), '')
            ) as name,
            v_request.raw_payload->>(role || ' Email') as email,
            COALESCE(
                v_request.raw_payload->>(role || ' Phone'),
                v_request.raw_payload->>(role || ' Phone Number')
            ) as phone,
            ARRAY[
                role || ' Name', 
                role || ' First Name', 
                role || ' Last Name', 
                role || ' Email', 
                role || ' Phone', 
                role || ' Phone Number'
            ] as source_keys
        FROM prefixes
        -- Filter out 'Lead' and 'Requestor' to avoid duplicate with the primary lead mapping
        WHERE lower(role) NOT IN ('lead', 'requestor', 'requester')
    )
    SELECT jsonb_agg(
        jsonb_strip_nulls(
            jsonb_build_object(
                'role', initcap(role),
                'name', name,
                'email', email,
                'phone', phone,
                'source_keys', source_keys
            )
        )
    ) INTO v_imported_contacts
    FROM contact_groups
    WHERE name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL;

    -- Manually prepend the Primary Requestor (mapped from standard columns)
    IF v_request.lead_name IS NOT NULL OR v_request.lead_email IS NOT NULL THEN
        v_imported_contacts := jsonb_build_array(
            jsonb_strip_nulls(
                jsonb_build_object(
                    'role', 'Requestor',
                    'name', v_request.lead_name,
                    'email', v_request.lead_email,
                    'phone', v_request.lead_phone,
                    'source_keys', ARRAY['lead_name', 'lead_email', 'lead_phone']
                )
            )
        ) || COALESCE(v_imported_contacts, '[]'::jsonb);
    END IF;

    -- Build Legacy Multi-tenant Notes (for fallback scannability)
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

    -- Insert standard operational performance with linked metadata
    INSERT INTO public.acts (
        event_id,
        name,
        duration_minutes,
        setup_time_minutes,
        arrival_status,
        notes,
        intake_source_type,
        intake_source_id,
        metadata
    )
    VALUES (
        v_request.event_id,
        v_request.title,
        GREATEST(COALESCE(v_request.duration_estimate_minutes, 5), 1),
        GREATEST(COALESCE(p_setup_time_minutes, 2), 0),
        'Not Arrived',
        v_act_notes,
        'performance_request',
        p_request_id,
        jsonb_build_object('imported_contacts', COALESCE(v_imported_contacts, '[]'::jsonb))
    )
    RETURNING id INTO v_act_id;

    -- Lifecycle advancement
    UPDATE public.performance_requests
    SET
        conversion_status = 'converted',
        converted_act_id = v_act_id,
        converted_at = NOW(),
        converted_by = auth.uid()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    -- Audit capture
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
            'conversion_status', v_updated.conversion_status,
            'imported_contacts_count', jsonb_array_length(COALESCE(v_imported_contacts, '[]'::jsonb))
        )
    );

    RETURN v_act_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
