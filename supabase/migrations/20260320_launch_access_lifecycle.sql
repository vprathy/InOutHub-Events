ALTER TABLE public.event_members
    ADD COLUMN IF NOT EXISTS grant_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (grant_type IN ('automated', 'manual'));

CREATE TABLE IF NOT EXISTS public.pending_event_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL DEFAULT 'Member'
        CHECK (target_role IN ('EventAdmin', 'StageManager', 'ActAdmin', 'Member')),
    grant_type TEXT NOT NULL DEFAULT 'automated'
        CHECK (grant_type IN ('automated', 'manual')),
    source_type TEXT,
    source_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'fulfilled', 'revoked')),
    fulfilled_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(normalized_email, event_id)
);

CREATE OR REPLACE FUNCTION public.normalize_email(p_email TEXT)
RETURNS TEXT AS $$
    SELECT NULLIF(lower(trim(p_email)), '');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.is_valid_email(p_email TEXT)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(public.normalize_email(p_email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$', FALSE);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.extract_participant_contact_email(p_src_raw JSONB, p_notes TEXT)
RETURNS TEXT AS $$
    SELECT public.normalize_email(COALESCE(
        NULLIF(p_src_raw->>'email', ''),
        NULLIF(p_src_raw->>'Email', ''),
        NULLIF(p_src_raw->>'email address', ''),
        NULLIF(p_src_raw->>'Email Address', ''),
        NULLIF(p_src_raw->>'parent email', ''),
        NULLIF(p_src_raw->>'Parent Email', ''),
        NULLIF(p_src_raw->>'guardian email', ''),
        NULLIF(p_src_raw->>'Guardian Email', ''),
        (regexp_match(COALESCE(p_notes, ''), '\[Email:\s*([^\]]+)\]', 'i'))[1]
    ));
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.upsert_pending_event_access(
    p_email TEXT,
    p_org_id UUID,
    p_event_id UUID,
    p_target_role TEXT,
    p_grant_type TEXT,
    p_source_type TEXT DEFAULT NULL,
    p_source_participant_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'pending'
)
RETURNS VOID AS $$
DECLARE
    v_email TEXT;
BEGIN
    v_email := public.normalize_email(p_email);

    IF NOT public.is_valid_email(v_email) THEN
        RETURN;
    END IF;

    INSERT INTO public.pending_event_access (
        normalized_email,
        organization_id,
        event_id,
        target_role,
        grant_type,
        source_type,
        source_participant_id,
        status
    ) VALUES (
        v_email,
        p_org_id,
        p_event_id,
        p_target_role,
        p_grant_type,
        p_source_type,
        p_source_participant_id,
        p_status
    )
    ON CONFLICT (normalized_email, event_id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        target_role = CASE
            WHEN public.pending_event_access.grant_type = 'manual' AND EXCLUDED.grant_type = 'automated'
                THEN public.pending_event_access.target_role
            ELSE EXCLUDED.target_role
        END,
        grant_type = CASE
            WHEN public.pending_event_access.grant_type = 'manual' AND EXCLUDED.grant_type = 'automated'
                THEN public.pending_event_access.grant_type
            ELSE EXCLUDED.grant_type
        END,
        source_type = COALESCE(EXCLUDED.source_type, public.pending_event_access.source_type),
        source_participant_id = COALESCE(EXCLUDED.source_participant_id, public.pending_event_access.source_participant_id),
        status = CASE
            WHEN public.pending_event_access.grant_type = 'manual' AND EXCLUDED.grant_type = 'automated'
                THEN public.pending_event_access.status
            ELSE EXCLUDED.status
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.ensure_org_member(p_org_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_org_id, p_user_id, 'Member')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.revoke_automated_event_access_for_email(p_event_id UUID, p_email TEXT)
RETURNS VOID AS $$
DECLARE
    v_email TEXT;
    v_user_id UUID;
BEGIN
    v_email := public.normalize_email(p_email);

    IF NOT public.is_valid_email(v_email) THEN
        RETURN;
    END IF;

    SELECT id INTO v_user_id
    FROM public.user_profiles
    WHERE public.normalize_email(email) = v_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        DELETE FROM public.event_members
        WHERE event_id = p_event_id
          AND user_id = v_user_id
          AND role = 'Member'
          AND grant_type = 'automated';
    END IF;

    UPDATE public.pending_event_access
    SET status = 'revoked',
        updated_at = NOW()
    WHERE normalized_email = v_email
      AND event_id = p_event_id
      AND grant_type = 'automated'
      AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.fulfill_pending_event_access_for_user(p_user_id UUID, p_email TEXT)
RETURNS VOID AS $$
DECLARE
    v_email TEXT;
    pending_row RECORD;
    existing_member RECORD;
BEGIN
    v_email := public.normalize_email(p_email);

    IF NOT public.is_valid_email(v_email) THEN
        RETURN;
    END IF;

    FOR pending_row IN
        SELECT *
        FROM public.pending_event_access
        WHERE normalized_email = v_email
          AND status = 'pending'
        ORDER BY created_at ASC
    LOOP
        PERFORM public.ensure_org_member(pending_row.organization_id, p_user_id);

        SELECT id, role, grant_type
        INTO existing_member
        FROM public.event_members
        WHERE event_id = pending_row.event_id
          AND user_id = p_user_id
        LIMIT 1;

        IF existing_member.id IS NULL THEN
            INSERT INTO public.event_members (event_id, user_id, role, grant_type)
            VALUES (pending_row.event_id, p_user_id, pending_row.target_role, pending_row.grant_type);
        ELSIF pending_row.grant_type = 'manual' THEN
            UPDATE public.event_members
            SET role = pending_row.target_role,
                grant_type = 'manual'
            WHERE id = existing_member.id;
        END IF;

        UPDATE public.pending_event_access
        SET status = 'fulfilled',
            fulfilled_user_id = p_user_id,
            updated_at = NOW()
        WHERE id = pending_row.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.reconcile_source_participant_access(p_participant_id UUID, p_previous_email TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_participant RECORD;
    v_org_id UUID;
    v_email TEXT;
    v_user_id UUID;
    v_existing_member RECORD;
BEGIN
    SELECT *
    INTO v_participant
    FROM public.participants
    WHERE id = p_participant_id;

    IF v_participant.id IS NULL THEN
        RETURN;
    END IF;

    IF v_participant.source_system IS NULL OR v_participant.source_system = 'manual' THEN
        RETURN;
    END IF;

    v_email := public.extract_participant_contact_email(v_participant.src_raw, v_participant.notes);

    IF p_previous_email IS NOT NULL AND public.normalize_email(p_previous_email) IS DISTINCT FROM v_email THEN
        PERFORM public.revoke_automated_event_access_for_email(v_participant.event_id, p_previous_email);
    END IF;

    IF NOT public.is_valid_email(v_email) THEN
        RETURN;
    END IF;

    SELECT organization_id INTO v_org_id
    FROM public.events
    WHERE id = v_participant.event_id;

    IF v_participant.status = 'active' THEN
        SELECT id INTO v_user_id
        FROM public.user_profiles
        WHERE public.normalize_email(email) = v_email
        LIMIT 1;

        IF v_user_id IS NULL THEN
            PERFORM public.upsert_pending_event_access(
                v_email,
                v_org_id,
                v_participant.event_id,
                'Member',
                'automated',
                'participant',
                v_participant.id,
                'pending'
            );
            RETURN;
        END IF;

        PERFORM public.ensure_org_member(v_org_id, v_user_id);

        SELECT id, role, grant_type
        INTO v_existing_member
        FROM public.event_members
        WHERE event_id = v_participant.event_id
          AND user_id = v_user_id
        LIMIT 1;

        IF v_existing_member.id IS NULL THEN
            INSERT INTO public.event_members (event_id, user_id, role, grant_type)
            VALUES (v_participant.event_id, v_user_id, 'Member', 'automated');
        END IF;

        UPDATE public.pending_event_access
        SET status = 'fulfilled',
            fulfilled_user_id = v_user_id,
            updated_at = NOW()
        WHERE normalized_email = v_email
          AND event_id = v_participant.event_id
          AND status = 'pending'
          AND grant_type = 'automated';
    ELSE
        PERFORM public.revoke_automated_event_access_for_email(v_participant.event_id, v_email);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.trg_reconcile_source_participant_access()
RETURNS TRIGGER AS $$
DECLARE
    v_previous_email TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_previous_email := public.extract_participant_contact_email(OLD.src_raw, OLD.notes);
    END IF;

    PERFORM public.reconcile_source_participant_access(NEW.id, v_previous_email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.assign_org_role(p_org_id UUID, p_target_email TEXT, p_role TEXT)
RETURNS JSONB AS $$
DECLARE
    v_normalized_email TEXT;
    v_target_user_id UUID;
BEGIN
    IF NOT (public.auth_is_super_admin() OR public.auth_org_role(p_org_id) IN ('Owner', 'Admin')) THEN
        RAISE EXCEPTION 'Not authorized to manage organization access';
    END IF;

    v_normalized_email := public.normalize_email(p_target_email);

    IF NOT public.is_valid_email(v_normalized_email) THEN
        RAISE EXCEPTION 'A valid email address is required';
    END IF;

    SELECT id INTO v_target_user_id
    FROM public.user_profiles
    WHERE public.normalize_email(email) = v_normalized_email
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'User must sign in once before org access can be granted';
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_org_id, v_target_user_id, p_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RETURN jsonb_build_object(
        'outcome', 'Granted',
        'message', format('%s org access granted to %s.', p_role, v_normalized_email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.fulfill_pending_event_access_for_user(new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reconcile_source_participant_access ON public.participants;
CREATE TRIGGER trg_reconcile_source_participant_access
AFTER INSERT OR UPDATE OF status, notes, src_raw, source_system ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.trg_reconcile_source_participant_access();

ALTER TABLE public.pending_event_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_event_access_select" ON public.pending_event_access;
CREATE POLICY "pending_event_access_select" ON public.pending_event_access
FOR SELECT USING (
    public.auth_is_super_admin()
    OR public.auth_event_role(event_id) = 'EventAdmin'
);

DROP POLICY IF EXISTS "pending_event_access_manage" ON public.pending_event_access;
CREATE POLICY "pending_event_access_manage" ON public.pending_event_access
FOR ALL USING (
    public.auth_is_super_admin()
    OR public.auth_event_role(event_id) = 'EventAdmin'
);

CREATE INDEX IF NOT EXISTS idx_pending_event_access_event_status
    ON public.pending_event_access(event_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_event_access_email
    ON public.pending_event_access(normalized_email);
