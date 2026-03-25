-- Migration: 20260325_harden_intake_security.sql
-- Goal: Restrict intake lineage and request contact PII to admin-scoped access.

CREATE OR REPLACE FUNCTION public.can_view_performance_request_contact_pii(p_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_event_id UUID;
  v_role TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_super_admins WHERE user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT event_id INTO v_event_id
  FROM public.performance_requests
  WHERE id = p_request_id;

  IF v_event_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT public.get_effective_event_role(v_event_id, p_user_id) INTO v_role;
  RETURN v_role = 'EventAdmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE VIEW public.v_performance_requests_hardened AS
SELECT
    pr.id,
    pr.organization_id,
    pr.event_id,
    pr.import_run_id,
    pr.event_source_id,
    pr.source_anchor,
    pr.title,
    pr.lead_name,
    CASE WHEN public.can_view_performance_request_contact_pii(pr.id, auth.uid()) THEN pr.lead_email ELSE NULL END AS lead_email,
    CASE WHEN public.can_view_performance_request_contact_pii(pr.id, auth.uid()) THEN pr.lead_phone ELSE NULL END AS lead_phone,
    pr.duration_estimate_minutes,
    pr.music_supplied,
    pr.roster_supplied,
    pr.notes,
    pr.raw_payload,
    pr.request_status,
    pr.conversion_status,
    pr.converted_act_id,
    a.name AS converted_act_name,
    pr.reviewed_at,
    pr.reviewed_by,
    pr.approved_at,
    pr.approved_by,
    pr.converted_at,
    pr.converted_by,
    pr.created_at,
    pr.updated_at,
    public.can_view_performance_request_contact_pii(pr.id, auth.uid()) AS is_contact_pii_unmasked
FROM public.performance_requests pr
LEFT JOIN public.acts a ON a.id = pr.converted_act_id
WHERE public.auth_is_super_admin() OR public.auth_event_role(pr.event_id) IS NOT NULL;

GRANT SELECT ON public.v_performance_requests_hardened TO authenticated;
GRANT SELECT ON public.v_performance_requests_hardened TO service_role;

DROP POLICY IF EXISTS "performance_requests_select" ON public.performance_requests;
CREATE POLICY "performance_requests_select" ON public.performance_requests FOR SELECT USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
);

DROP POLICY IF EXISTS "intake_audit_events_select" ON public.intake_audit_events;
CREATE POLICY "intake_audit_events_select" ON public.intake_audit_events FOR SELECT USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
);

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "import_runs_select" ON public.import_runs;
CREATE POLICY "import_runs_select" ON public.import_runs FOR SELECT USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
);
DROP POLICY IF EXISTS "import_runs_manage" ON public.import_runs;
CREATE POLICY "import_runs_manage" ON public.import_runs FOR ALL USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
) WITH CHECK (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
);

ALTER TABLE public.import_run_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "import_run_records_select" ON public.import_run_records;
CREATE POLICY "import_run_records_select" ON public.import_run_records FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.import_runs ir
        WHERE ir.id = import_run_id
          AND (public.auth_is_super_admin() OR public.auth_event_role(ir.event_id) = 'EventAdmin')
    )
);
DROP POLICY IF EXISTS "import_run_records_manage" ON public.import_run_records;
CREATE POLICY "import_run_records_manage" ON public.import_run_records FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.import_runs ir
        WHERE ir.id = import_run_id
          AND (public.auth_is_super_admin() OR public.auth_event_role(ir.event_id) = 'EventAdmin')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.import_runs ir
        WHERE ir.id = import_run_id
          AND (public.auth_is_super_admin() OR public.auth_event_role(ir.event_id) = 'EventAdmin')
    )
);
