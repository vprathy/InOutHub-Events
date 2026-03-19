UPDATE public.organization_members
SET role = 'Member'
WHERE role IN ('StageManager', 'ActAdmin');

ALTER TABLE public.organization_members
    DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('Owner', 'Admin', 'Member'));

ALTER TABLE public.event_members
    DROP CONSTRAINT IF EXISTS event_members_role_check;

ALTER TABLE public.event_members
    ADD CONSTRAINT event_members_role_check
    CHECK (role IN ('EventAdmin', 'StageManager', 'ActAdmin', 'Member'));

CREATE OR REPLACE FUNCTION public.enforce_requirement_policy_scope()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
BEGIN
    IF NEW.event_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT organization_id INTO v_org_id
    FROM public.events
    WHERE id = NEW.event_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Requirement policy event is not linked to a valid organization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.requirement_policies rp
        WHERE rp.organization_id = v_org_id
          AND rp.event_id IS NULL
          AND rp.code = NEW.code
          AND rp.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Event policy % cannot override inherited organization policy', NEW.code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_requirement_policy_scope ON public.requirement_policies;

CREATE TRIGGER trg_enforce_requirement_policy_scope
BEFORE INSERT OR UPDATE ON public.requirement_policies
FOR EACH ROW EXECUTE FUNCTION public.enforce_requirement_policy_scope();
