ALTER TABLE public.external_program_submissions
    DROP CONSTRAINT IF EXISTS external_program_submissions_status_check;

ALTER TABLE public.external_program_submissions
    ADD CONSTRAINT external_program_submissions_status_check
    CHECK (status IN ('Submitted', 'Waitlisted', 'Approved', 'Rejected'));

CREATE OR REPLACE FUNCTION public.approve_external_program_submission(p_submission_id UUID)
RETURNS UUID AS $$
DECLARE
    v_submission public.external_program_submissions%ROWTYPE;
    v_act_id UUID;
    v_role TEXT;
BEGIN
    SELECT *
    INTO v_submission
    FROM public.external_program_submissions
    WHERE id = p_submission_id;

    IF v_submission.id IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    IF NOT public.auth_is_super_admin() THEN
        v_role := public.auth_event_role(v_submission.event_id);
        IF v_role <> 'EventAdmin' THEN
            RAISE EXCEPTION 'Insufficient privileges to approve external submission';
        END IF;
    END IF;

    IF v_submission.status = 'Rejected' THEN
        RAISE EXCEPTION 'Rejected submissions cannot be approved';
    END IF;

    IF v_submission.linked_act_id IS NOT NULL THEN
        UPDATE public.external_program_submissions
        SET
            status = 'Approved',
            approved_at = COALESCE(approved_at, NOW()),
            approved_by = COALESCE(approved_by, auth.uid()),
            updated_at = NOW()
        WHERE id = p_submission_id;

        UPDATE public.acts
        SET
            business_status = 'Awaiting Roster',
            intake_source_type = 'external_program_submission',
            intake_source_id = p_submission_id
        WHERE id = v_submission.linked_act_id;

        RETURN v_submission.linked_act_id;
    END IF;

    INSERT INTO public.acts (
        event_id,
        name,
        duration_minutes,
        setup_time_minutes,
        arrival_status,
        business_status,
        intake_source_type,
        intake_source_id,
        notes
    )
    VALUES (
        v_submission.event_id,
        COALESCE(NULLIF(v_submission.program_name, ''), NULLIF(v_submission.team_name, ''), 'Approved Program'),
        5,
        2,
        'Not Arrived',
        'Awaiting Roster',
        'external_program_submission',
        p_submission_id,
        v_submission.notes
    )
    RETURNING id INTO v_act_id;

    UPDATE public.external_program_submissions
    SET
        status = 'Approved',
        approved_at = COALESCE(approved_at, NOW()),
        approved_by = COALESCE(approved_by, auth.uid()),
        linked_act_id = v_act_id,
        updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN v_act_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
