-- Migration: V1 Requirements & Readiness Engine
-- Phase 1 is deliberately additive and act-scoped only.
-- Participant-side requirements remain deferred until the asset/template bridge is made explicit.

-------------------------------------------------------
-- 1. SCHEMA DEFINITIONS
-------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.requirement_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('participant', 'act')),
    label TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('identity', 'safety', 'waiver', 'media', 'technical', 'readiness', 'admin')),
    input_type TEXT NOT NULL,
    input_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT true,
    review_mode TEXT NOT NULL DEFAULT 'review_required'
        CHECK (review_mode IN ('system_derived', 'no_review', 'submission_only', 'review_required')),
    blocking_level TEXT NOT NULL DEFAULT 'blocking'
        CHECK (blocking_level IN ('none', 'warning', 'blocking')),
    allow_bulk_approve BOOLEAN NOT NULL DEFAULT false,
    applies_when JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (organization_id IS NOT NULL AND event_id IS NULL)
        OR (event_id IS NOT NULL AND organization_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_policies_org_code
    ON public.requirement_policies (organization_id, code)
    WHERE organization_id IS NOT NULL AND event_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_policies_event_code
    ON public.requirement_policies (event_id, code)
    WHERE event_id IS NOT NULL AND organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_policies_org
    ON public.requirement_policies (organization_id)
    WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_policies_event
    ON public.requirement_policies (event_id)
    WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.requirement_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES public.requirement_policies(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('participant', 'act')),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    act_id UUID REFERENCES public.acts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'missing'
        CHECK (status IN ('missing', 'submitted', 'pending_review', 'approved', 'rejected', 'waived', 'auto_complete')),
    due_at TIMESTAMPTZ,
    evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    waived_at TIMESTAMPTZ,
    waived_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (subject_type = 'participant' AND participant_id IS NOT NULL AND act_id IS NULL)
        OR (subject_type = 'act' AND act_id IS NOT NULL AND participant_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_assignments_policy_participant
    ON public.requirement_assignments (policy_id, participant_id)
    WHERE participant_id IS NOT NULL AND act_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_assignments_policy_act
    ON public.requirement_assignments (policy_id, act_id)
    WHERE act_id IS NOT NULL AND participant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_assignments_act
    ON public.requirement_assignments (act_id)
    WHERE act_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_assignments_participant
    ON public.requirement_assignments (participant_id)
    WHERE participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_assignments_status
    ON public.requirement_assignments (status);

-------------------------------------------------------
-- 2. SECURITY MODEL
-------------------------------------------------------

ALTER TABLE public.requirement_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirement_policies_select" ON public.requirement_policies;
CREATE POLICY "requirement_policies_select" ON public.requirement_policies
FOR SELECT USING (
    auth_is_super_admin()
    OR (organization_id IS NOT NULL AND auth_org_role(organization_id) IS NOT NULL)
    OR (event_id IS NOT NULL AND auth_event_role(event_id) IS NOT NULL)
);

DROP POLICY IF EXISTS "requirement_policies_manage" ON public.requirement_policies;
CREATE POLICY "requirement_policies_manage" ON public.requirement_policies
FOR ALL USING (
    auth_is_super_admin()
    OR (organization_id IS NOT NULL AND auth_org_role(organization_id) IN ('Owner', 'Admin'))
    OR (event_id IS NOT NULL AND auth_event_role(event_id) = 'EventAdmin')
);

DROP POLICY IF EXISTS "requirement_assignments_select" ON public.requirement_assignments;
CREATE POLICY "requirement_assignments_select" ON public.requirement_assignments
FOR SELECT USING (
    auth_is_super_admin()
    OR (
        act_id IS NOT NULL
        AND auth_event_role(get_act_event_id(act_id)) IS NOT NULL
    )
    OR (
        participant_id IS NOT NULL
        AND auth_event_role(get_participant_event_id(participant_id)) IS NOT NULL
    )
);

DROP POLICY IF EXISTS "requirement_assignments_manage" ON public.requirement_assignments;
CREATE POLICY "requirement_assignments_manage" ON public.requirement_assignments
FOR ALL USING (
    auth_is_super_admin()
    OR (
        act_id IS NOT NULL
        AND auth_event_role(get_act_event_id(act_id)) = 'EventAdmin'
    )
    OR (
        participant_id IS NOT NULL
        AND auth_event_role(get_participant_event_id(participant_id)) = 'EventAdmin'
    )
);

-------------------------------------------------------
-- 3. DETERMINISTIC LEGACY MAPPING (ACT-SIDE ONLY)
-------------------------------------------------------

CREATE OR REPLACE FUNCTION public.map_legacy_act_requirement_code(p_requirement_type TEXT)
RETURNS TEXT AS $$
    SELECT CASE p_requirement_type
        WHEN 'Audio' THEN 'ACT_AUDIO'
        WHEN 'Lighting' THEN 'ACT_LIGHTING'
        WHEN 'Microphone' THEN 'ACT_MICROPHONE'
        WHEN 'Video' THEN 'ACT_VIDEO'
        WHEN 'IntroComposition' THEN 'ACT_INTRO'
        WHEN 'Poster' THEN 'ACT_POSTER'
        WHEN 'Generative' THEN 'ACT_GENERATIVE'
        WHEN 'Generative_Audio' THEN 'ACT_GENERATIVE_AUDIO'
        WHEN 'Generative_Video' THEN 'ACT_GENERATIVE_VIDEO'
        WHEN 'Waiver' THEN 'ACT_WAIVER'
        ELSE NULL
    END;
$$ LANGUAGE sql IMMUTABLE;

-------------------------------------------------------
-- 4. BRIDGE FUNCTION ONLY (TRIGGER IS NOT ENABLED IN PHASE 1)
-------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bridge_act_requirements_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_policy_id UUID;
    v_status TEXT;
    v_mapped_code TEXT;
    v_org_id UUID;
BEGIN
    v_mapped_code := public.map_legacy_act_requirement_code(COALESCE(NEW.requirement_type, OLD.requirement_type));

    IF v_mapped_code IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT e.organization_id INTO v_org_id
    FROM public.acts a
    JOIN public.events e ON e.id = a.event_id
    WHERE a.id = COALESCE(NEW.act_id, OLD.act_id);

    SELECT rp.id INTO v_policy_id
    FROM public.requirement_policies rp
    WHERE rp.organization_id = v_org_id
      AND rp.event_id IS NULL
      AND rp.code = v_mapped_code
      AND rp.subject_type = 'act'
    LIMIT 1;

    IF v_policy_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE public.requirement_assignments
        SET status = 'missing', updated_at = NOW()
        WHERE policy_id = v_policy_id
          AND act_id = OLD.act_id;
        RETURN OLD;
    END IF;

    v_status := CASE WHEN NEW.fulfilled THEN 'approved' ELSE 'missing' END;

    INSERT INTO public.requirement_assignments (
        policy_id,
        subject_type,
        act_id,
        status
    ) VALUES (
        v_policy_id,
        'act',
        NEW.act_id,
        v_status
    )
    ON CONFLICT (policy_id, act_id) DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'bridge_act_requirements_sync fault: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-------------------------------------------------------
-- 5. PHASE 1 SEED / BACKFILL PLAYBOOK (MANUAL RUNBOOK)
-------------------------------------------------------
/*
-- 5A. Canonical org-scoped starter policies
INSERT INTO public.requirement_policies (
    organization_id,
    code,
    subject_type,
    label,
    description,
    category,
    input_type,
    review_mode,
    blocking_level,
    allow_bulk_approve,
    sort_order
)
SELECT
    o.id,
    seed.code,
    'act',
    seed.label,
    seed.description,
    seed.category,
    seed.input_type,
    seed.review_mode,
    seed.blocking_level,
    seed.allow_bulk_approve,
    seed.sort_order
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('ACT_AUDIO', 'Performance Audio Track', 'Uploaded audio or final music track for the act.', 'media', 'file_upload', 'submission_only', 'blocking', false, 10),
        ('ACT_INTRO', 'Stage Introduction Media', 'Approved intro composition or opening media.', 'media', 'review_required', 'blocking', false, 20),
        ('ACT_LIGHTING', 'Lighting Cue Sheet', 'Lighting cues needed to run the act cleanly.', 'technical', 'submission_only', 'warning', false, 30),
        ('ACT_MICROPHONE', 'Microphone Plan', 'Microphone and channel needs confirmed.', 'technical', 'no_review', 'warning', false, 40),
        ('ACT_VIDEO', 'Video Playback Ready', 'Video asset is present and ready to run.', 'media', 'submission_only', 'warning', false, 50),
        ('ACT_POSTER', 'Poster / Promo Graphic', 'Poster or promo asset available for act operations.', 'media', 'submission_only', 'none', true, 60),
        ('ACT_GENERATIVE', 'Generative Media Review', 'Generative content has been reviewed for use.', 'media', 'review_required', 'warning', false, 70),
        ('ACT_GENERATIVE_AUDIO', 'Generative Audio Review', 'Generative audio has been reviewed for use.', 'media', 'review_required', 'warning', false, 80),
        ('ACT_GENERATIVE_VIDEO', 'Generative Video Review', 'Generative video has been reviewed for use.', 'media', 'review_required', 'warning', false, 90),
        ('ACT_WAIVER', 'Act Waiver Review', 'Waiver requirement tracked at act level for compatibility.', 'waiver', 'review_required', 'warning', true, 100)
) AS seed(code, label, description, category, input_type, review_mode, blocking_level, allow_bulk_approve, sort_order)
ON CONFLICT DO NOTHING;

-- 5B. Backfill assignments from existing act_requirements using the same deterministic mapper
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

-- 5C. Phase 1 cutover command (manual, after verification)
CREATE TRIGGER trg_bridge_act_requirements_sync
AFTER INSERT OR UPDATE OR DELETE ON public.act_requirements
FOR EACH ROW EXECUTE FUNCTION public.bridge_act_requirements_sync();
*/
