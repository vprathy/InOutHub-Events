CREATE TABLE IF NOT EXISTS public.event_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.import_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_source_id UUID REFERENCES public.event_sources(id) ON DELETE SET NULL,
    import_target TEXT NOT NULL CHECK (import_target IN ('participants', 'performance_requests')),
    import_method TEXT NOT NULL CHECK (import_method IN ('google_sheet', 'spreadsheet_upload', 'manual')),
    source_name TEXT,
    source_instance TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed', 'blocked', 'rolled_back')),
    probable_target TEXT CHECK (probable_target IN ('participants', 'performance_requests', 'unknown')),
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    blocking_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    initiated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.import_run_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id UUID NOT NULL REFERENCES public.import_runs(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('participant', 'performance_request', 'act')),
    entity_id UUID,
    entity_key TEXT,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'missing_from_source', 'blocked', 'skipped', 'deleted')),
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intake_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    import_run_id UUID REFERENCES public.import_runs(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('import_run', 'participant', 'performance_request', 'act')),
    entity_id UUID,
    action TEXT NOT NULL,
    note TEXT,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.participants
    ADD COLUMN IF NOT EXISTS source_last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sync_metadata JSONB,
    ADD COLUMN IF NOT EXISTS created_by_import_run_id UUID,
    ADD COLUMN IF NOT EXISTS last_import_run_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'participants_created_by_import_run_id_fkey'
    ) THEN
        ALTER TABLE public.participants
            ADD CONSTRAINT participants_created_by_import_run_id_fkey
            FOREIGN KEY (created_by_import_run_id) REFERENCES public.import_runs(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'participants_last_import_run_id_fkey'
    ) THEN
        ALTER TABLE public.participants
            ADD CONSTRAINT participants_last_import_run_id_fkey
            FOREIGN KEY (last_import_run_id) REFERENCES public.import_runs(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_sources_event_id ON public.event_sources(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_runs_event_id ON public.import_runs(event_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_runs_source_id ON public.import_runs(event_source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_run_records_run_id ON public.import_run_records(import_run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_run_records_entity ON public.import_run_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_intake_audit_events_event_id ON public.intake_audit_events(event_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_audit_events_entity ON public.intake_audit_events(entity_type, entity_id, performed_at DESC);

CREATE OR REPLACE FUNCTION public.get_import_run_dependency_summary(p_import_run_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH imported_participants AS (
    SELECT DISTINCT entity_id AS participant_id
    FROM public.import_run_records
    WHERE import_run_id = p_import_run_id
      AND entity_type = 'participant'
      AND entity_id IS NOT NULL
),
summary AS (
    SELECT
        (SELECT COUNT(*) FROM imported_participants) AS participant_count,
        (SELECT COUNT(*) FROM public.act_participants ap JOIN imported_participants ip ON ip.participant_id = ap.participant_id) AS act_assignment_count,
        (SELECT COUNT(*) FROM public.participant_assets pa JOIN imported_participants ip ON ip.participant_id = pa.participant_id) AS participant_asset_count,
        (SELECT COUNT(*) FROM public.participant_notes pn JOIN imported_participants ip ON ip.participant_id = pn.participant_id) AS participant_note_count,
        (SELECT COUNT(*) FROM public.pending_event_access pea JOIN imported_participants ip ON ip.participant_id = pea.source_participant_id) AS pending_access_count
)
SELECT jsonb_build_object(
    'participantCount', participant_count,
    'actAssignmentCount', act_assignment_count,
    'participantAssetCount', participant_asset_count,
    'participantNoteCount', participant_note_count,
    'pendingAccessCount', pending_access_count,
    'hasDependencies', (act_assignment_count + participant_asset_count + participant_note_count + pending_access_count) > 0
)
FROM summary;
$$;

CREATE OR REPLACE FUNCTION public.can_rollback_import_run(p_import_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
SELECT
    EXISTS (
        SELECT 1
        FROM public.import_runs ir
        WHERE ir.id = p_import_run_id
          AND ir.status = 'succeeded'
    )
    AND NOT COALESCE((public.get_import_run_dependency_summary(p_import_run_id) ->> 'hasDependencies')::boolean, false);
$$;

ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_run_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_audit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'event_sources' AND policyname = 'event_sources_select'
    ) THEN
        CREATE POLICY "event_sources_select" ON public.event_sources FOR SELECT USING (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'event_sources' AND policyname = 'event_sources_manage'
    ) THEN
        CREATE POLICY "event_sources_manage" ON public.event_sources FOR ALL USING (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
        ) WITH CHECK (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'import_runs' AND policyname = 'import_runs_select'
    ) THEN
        CREATE POLICY "import_runs_select" ON public.import_runs FOR SELECT USING (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'import_runs' AND policyname = 'import_runs_manage'
    ) THEN
        CREATE POLICY "import_runs_manage" ON public.import_runs FOR ALL USING (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
        ) WITH CHECK (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'import_run_records' AND policyname = 'import_run_records_select'
    ) THEN
        CREATE POLICY "import_run_records_select" ON public.import_run_records FOR SELECT USING (
            EXISTS (
                SELECT 1
                FROM public.import_runs ir
                WHERE ir.id = import_run_id
                  AND (public.auth_is_super_admin() OR public.auth_event_role(ir.event_id) IS NOT NULL)
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'import_run_records' AND policyname = 'import_run_records_manage'
    ) THEN
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
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'intake_audit_events' AND policyname = 'intake_audit_events_select'
    ) THEN
        CREATE POLICY "intake_audit_events_select" ON public.intake_audit_events FOR SELECT USING (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'intake_audit_events' AND policyname = 'intake_audit_events_manage'
    ) THEN
        CREATE POLICY "intake_audit_events_manage" ON public.intake_audit_events FOR ALL USING (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
        ) WITH CHECK (
            public.auth_is_super_admin() OR public.auth_event_role(event_id) = 'EventAdmin'
        );
    END IF;
END $$;
