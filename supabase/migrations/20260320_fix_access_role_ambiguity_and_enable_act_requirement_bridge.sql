BEGIN;

CREATE OR REPLACE FUNCTION public.assign_event_role(p_event_id UUID, p_target_email TEXT, p_role TEXT)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_normalized_email TEXT;
    v_target_user_id UUID;
    v_existing_member RECORD;
    v_outcome TEXT := 'Granted';
BEGIN
    IF NOT (public.auth_is_super_admin() OR public.auth_event_role(p_event_id) = 'EventAdmin') THEN
        RAISE EXCEPTION 'Not authorized to manage event access';
    END IF;

    SELECT organization_id INTO v_org_id
    FROM public.events
    WHERE id = p_event_id;

    v_normalized_email := public.normalize_email(p_target_email);

    IF NOT public.is_valid_email(v_normalized_email) THEN
        RAISE EXCEPTION 'A valid email address is required';
    END IF;

    SELECT em.id, em.role, em.grant_type
    INTO v_existing_member
    FROM public.event_members em
    JOIN public.user_profiles up ON up.id = em.user_id
    WHERE em.event_id = p_event_id
      AND public.normalize_email(up.email) = v_normalized_email
    LIMIT 1;

    SELECT id INTO v_target_user_id
    FROM public.user_profiles
    WHERE public.normalize_email(email) = v_normalized_email
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        PERFORM public.upsert_pending_event_access(
            v_normalized_email,
            v_org_id,
            p_event_id,
            p_role,
            'manual',
            'manual_grant',
            NULL,
            'pending'
        );

        RETURN jsonb_build_object(
            'outcome', 'Pending',
            'message', format('%s access is pending until %s signs in.', p_role, v_normalized_email)
        );
    END IF;

    PERFORM public.ensure_org_member(v_org_id, v_target_user_id);

    INSERT INTO public.event_members (event_id, user_id, role, grant_type)
    VALUES (p_event_id, v_target_user_id, p_role, 'manual')
    ON CONFLICT (event_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        grant_type = 'manual';

    IF v_existing_member.id IS NOT NULL THEN
        v_outcome := CASE
            WHEN v_existing_member.role = p_role AND COALESCE(v_existing_member.grant_type, 'manual') = 'manual' THEN 'No Change'
            ELSE 'Updated'
        END;
    END IF;

    UPDATE public.pending_event_access
    SET status = 'fulfilled',
        fulfilled_user_id = v_target_user_id,
        updated_at = NOW()
    WHERE normalized_email = v_normalized_email
      AND event_id = p_event_id
      AND status = 'pending';

    RETURN jsonb_build_object(
        'outcome', v_outcome,
        'message', format('%s access saved for %s.', p_role, v_normalized_email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

INSERT INTO public.requirement_assignments (
    policy_id,
    subject_type,
    act_id,
    status
)
SELECT
    rp.id,
    'act',
    ar.act_id,
    CASE WHEN ar.fulfilled THEN 'approved' ELSE 'missing' END
FROM public.act_requirements ar
JOIN public.acts a
    ON a.id = ar.act_id
JOIN public.events e
    ON e.id = a.event_id
JOIN public.requirement_policies rp
    ON rp.organization_id = e.organization_id
   AND rp.event_id IS NULL
   AND rp.subject_type = 'act'
   AND rp.code = public.map_legacy_act_requirement_code(ar.requirement_type)
WHERE public.map_legacy_act_requirement_code(ar.requirement_type) IS NOT NULL
ON CONFLICT (policy_id, act_id) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = NOW();

DROP TRIGGER IF EXISTS trg_bridge_act_requirements_sync ON public.act_requirements;
CREATE TRIGGER trg_bridge_act_requirements_sync
AFTER INSERT OR UPDATE OR DELETE ON public.act_requirements
FOR EACH ROW EXECUTE FUNCTION public.bridge_act_requirements_sync();

COMMIT;
