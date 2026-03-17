ALTER TABLE public.acts
    ADD COLUMN IF NOT EXISTS business_status TEXT CHECK (business_status IN ('Awaiting Roster', 'Needs Attention', 'Ready')),
    ADD COLUMN IF NOT EXISTS intake_source_type TEXT,
    ADD COLUMN IF NOT EXISTS intake_source_id UUID;

CREATE TABLE IF NOT EXISTS public.external_program_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    program_name TEXT NOT NULL,
    team_name TEXT,
    manager_name TEXT,
    manager_email TEXT,
    manager_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Approved', 'Awaiting Roster', 'Rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    linked_act_id UUID REFERENCES public.acts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submission_roster_upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.external_program_submissions(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_url TEXT,
    template_version TEXT,
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary_ready_count INTEGER NOT NULL DEFAULT 0,
    summary_warning_count INTEGER NOT NULL DEFAULT 0,
    summary_blocked_count INTEGER NOT NULL DEFAULT 0,
    promotion_confirmed_at TIMESTAMP WITH TIME ZONE,
    promotion_confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.submission_roster_staging_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.submission_roster_upload_batches(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES public.external_program_submissions(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    source_row_number INTEGER NOT NULL,
    raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapped_first_name TEXT,
    mapped_last_name TEXT,
    mapped_guardian_name TEXT,
    mapped_guardian_phone TEXT,
    mapped_notes TEXT,
    review_status TEXT NOT NULL DEFAULT 'blocked' CHECK (review_status IN ('ready', 'warning', 'blocked', 'promoted')),
    issue_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    operator_decision JSONB,
    source_system TEXT NOT NULL DEFAULT 'external_program_roster',
    source_instance TEXT,
    source_anchor_type TEXT,
    source_anchor_value TEXT,
    promoted_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.get_external_program_submission_event_id(p_submission_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM public.external_program_submissions WHERE id = p_submission_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_submission_roster_batch_event_id(p_batch_id UUID)
RETURNS UUID AS $$
    SELECT event_id FROM public.submission_roster_upload_batches WHERE id = p_batch_id;
$$ LANGUAGE sql SECURITY DEFINER;

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
            status = 'Awaiting Roster',
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
        status = 'Awaiting Roster',
        approved_at = COALESCE(approved_at, NOW()),
        approved_by = COALESCE(approved_by, auth.uid()),
        linked_act_id = v_act_id,
        updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN v_act_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.external_program_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_roster_upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_roster_staging_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external_program_submissions_select" ON public.external_program_submissions;
CREATE POLICY "external_program_submissions_select" ON public.external_program_submissions FOR SELECT USING (public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL);
DROP POLICY IF EXISTS "external_program_submissions_manage" ON public.external_program_submissions;
CREATE POLICY "external_program_submissions_manage" ON public.external_program_submissions FOR ALL USING (public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin');

DROP POLICY IF EXISTS "submission_roster_upload_batches_select" ON public.submission_roster_upload_batches;
CREATE POLICY "submission_roster_upload_batches_select" ON public.submission_roster_upload_batches FOR SELECT USING (public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL);
DROP POLICY IF EXISTS "submission_roster_upload_batches_manage" ON public.submission_roster_upload_batches;
CREATE POLICY "submission_roster_upload_batches_manage" ON public.submission_roster_upload_batches FOR ALL USING (public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin');

DROP POLICY IF EXISTS "submission_roster_staging_rows_select" ON public.submission_roster_staging_rows;
CREATE POLICY "submission_roster_staging_rows_select" ON public.submission_roster_staging_rows FOR SELECT USING (public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL);
DROP POLICY IF EXISTS "submission_roster_staging_rows_manage" ON public.submission_roster_staging_rows;
CREATE POLICY "submission_roster_staging_rows_manage" ON public.submission_roster_staging_rows FOR ALL USING (public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin');

DROP TRIGGER IF EXISTS audit_external_program_submissions ON public.external_program_submissions;
CREATE TRIGGER audit_external_program_submissions AFTER INSERT OR UPDATE OR DELETE ON public.external_program_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
DROP TRIGGER IF EXISTS audit_submission_roster_upload_batches ON public.submission_roster_upload_batches;
CREATE TRIGGER audit_submission_roster_upload_batches AFTER INSERT OR UPDATE OR DELETE ON public.submission_roster_upload_batches FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE INDEX IF NOT EXISTS idx_acts_business_status ON public.acts(business_status);
CREATE INDEX IF NOT EXISTS idx_external_program_submissions_event_id ON public.external_program_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_external_program_submissions_status ON public.external_program_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submission_roster_upload_batches_submission_id ON public.submission_roster_upload_batches(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_roster_staging_rows_batch_id ON public.submission_roster_staging_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_submission_roster_staging_rows_review_status ON public.submission_roster_staging_rows(review_status);
