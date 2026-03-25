CREATE TABLE IF NOT EXISTS client_error_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    support_code TEXT NOT NULL UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    feature_area TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
    route TEXT,
    message TEXT NOT NULL,
    error_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_id TEXT,
    event_role TEXT,
    org_role TEXT,
    pwa_version TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW v_recent_client_error_events AS
SELECT
    ce.id,
    ce.support_code,
    ce.organization_id,
    ce.event_id,
    ce.reported_by,
    ce.feature_area,
    ce.severity,
    ce.route,
    ce.message,
    ce.error_context,
    ce.correlation_id,
    ce.event_role,
    ce.org_role,
    ce.pwa_version,
    ce.user_agent,
    ce.status,
    ce.created_at,
    up.first_name AS reporter_first_name,
    up.last_name AS reporter_last_name,
    up.email AS reporter_email,
    org.name AS organization_name,
    ev.name AS event_name
FROM client_error_events ce
LEFT JOIN user_profiles up ON up.id = ce.reported_by
LEFT JOIN organizations org ON org.id = ce.organization_id
LEFT JOIN events ev ON ev.id = ce.event_id
ORDER BY ce.created_at DESC;

ALTER TABLE client_error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_error_events_insert_scoped" ON client_error_events;
CREATE POLICY "client_error_events_insert_scoped" ON client_error_events FOR INSERT WITH CHECK (
    auth.uid() = reported_by
    AND (
        auth_is_super_admin()
        OR (event_id IS NOT NULL AND auth_event_role(event_id) IS NOT NULL)
        OR (organization_id IS NOT NULL AND auth_org_role(organization_id) IS NOT NULL)
    )
);

DROP POLICY IF EXISTS "client_error_events_select_internal" ON client_error_events;
CREATE POLICY "client_error_events_select_internal" ON client_error_events FOR SELECT USING (
    auth_is_super_admin()
);

DROP POLICY IF EXISTS "client_error_events_manage_internal" ON client_error_events;
CREATE POLICY "client_error_events_manage_internal" ON client_error_events FOR ALL USING (
    auth_is_super_admin()
) WITH CHECK (
    auth_is_super_admin()
);

GRANT SELECT ON v_recent_client_error_events TO authenticated;
GRANT SELECT ON v_recent_client_error_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_client_error_events_created_at ON client_error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_events_feature_area ON client_error_events(feature_area, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_events_event_id ON client_error_events(event_id, created_at DESC);
