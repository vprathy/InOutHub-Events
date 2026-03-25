-- Migration: 20260325_performance_intake_model.sql
-- Goal: Add Performance Requests staging table for external intake review and conversion.

-- 1. Create the Performance Requests table
CREATE TABLE IF NOT EXISTS public.performance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    import_run_id UUID REFERENCES public.import_runs(id) ON DELETE SET NULL,
    event_source_id UUID REFERENCES public.event_sources(id) ON DELETE SET NULL,
    
    -- Lineage: Source Identifier
    source_anchor TEXT, -- Unique key from source (e.g. Row ID or Row Hash)
    
    -- Request Detail
    title TEXT NOT NULL,
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    duration_estimate_minutes INTEGER NOT NULL DEFAULT 5,
    music_supplied BOOLEAN NOT NULL DEFAULT false,
    roster_supplied BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Profile / Lifecycle Status
    request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'reviewed', 'approved', 'rejected')),
    conversion_status TEXT NOT NULL DEFAULT 'not_started' CHECK (conversion_status IN ('not_started', 'converted', 'failed')),
    converted_act_id UUID REFERENCES public.acts(id) ON DELETE SET NULL,
    
    -- Review & Accountability Logs
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,
    converted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    -- Prevent duplicate intake from the same source row into the same event
    UNIQUE(event_id, event_source_id, source_anchor)
);

-- 2. Audit Integration
CREATE TRIGGER audit_performance_requests 
    AFTER INSERT OR UPDATE OR DELETE ON public.performance_requests 
    FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- 3. Security (RLS)
ALTER TABLE public.performance_requests ENABLE ROW LEVEL SECURITY;

-- Select Policy (Visible to all event staff)
CREATE POLICY "performance_requests_select" ON public.performance_requests 
FOR SELECT USING (
    public.auth_is_super_admin() OR public.auth_event_role(event_id) IS NOT NULL
);

-- Manage Policy (Restricted to EventAdmin and OrgAdmin+)
CREATE POLICY "performance_requests_manage" ON public.performance_requests 
FOR ALL USING (
    public.auth_is_super_admin() OR 
    public.auth_event_role(event_id) = 'EventAdmin'
) WITH CHECK (
    public.auth_is_super_admin() OR 
    public.auth_event_role(event_id) = 'EventAdmin'
);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_performance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_performance_request_updated
    BEFORE UPDATE ON public.performance_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_performance_requests_updated_at();

-- 5. Helper Indexing (Aligned with database_schema.sql)
CREATE INDEX IF NOT EXISTS idx_performance_requests_event_id ON public.performance_requests(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_requests_import_id ON public.performance_requests(import_run_id);
CREATE INDEX IF NOT EXISTS idx_performance_requests_status ON public.performance_requests(request_status, conversion_status);

-- 6. Grant explicit permissions
GRANT ALL ON public.performance_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.performance_requests TO authenticated;
