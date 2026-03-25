ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending_review', 'approved', 'restricted')),
    ADD COLUMN IF NOT EXISTS onboarding_contact_email TEXT,
    ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_my_pending_access_count()
RETURNS INTEGER AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT public.normalize_email(email) INTO v_email
    FROM public.user_profiles
    WHERE id = auth.uid();

    IF v_email IS NULL THEN
        RETURN 0;
    END IF;

    RETURN COALESCE((
        SELECT COUNT(*)
        FROM public.pending_event_access
        WHERE normalized_email = v_email
          AND status = 'pending'
    ), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    p_name TEXT,
    p_contact_email TEXT DEFAULT NULL,
    p_requires_review BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_contact_email TEXT;
    v_review_status TEXT := 'approved';
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NULLIF(trim(COALESCE(p_name, '')), '') IS NULL THEN
        RAISE EXCEPTION 'Organization name is required';
    END IF;

    IF NOT public.auth_is_super_admin() THEN
        IF EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE user_id = v_user_id
        ) THEN
            RAISE EXCEPTION 'Only first-time users can self-create an organization during MVP onboarding';
        END IF;

        IF public.get_my_pending_access_count() > 0 THEN
            RAISE EXCEPTION 'Pending access already exists for this user. Complete the invite flow instead of creating a new organization.';
        END IF;
    END IF;

    SELECT public.normalize_email(COALESCE(NULLIF(trim(p_contact_email), ''), email))
    INTO v_contact_email
    FROM public.user_profiles
    WHERE id = v_user_id;

    IF p_requires_review AND NOT public.auth_is_super_admin() THEN
        v_review_status := 'pending_review';
    END IF;

    INSERT INTO public.organizations (
        name,
        review_status,
        onboarding_contact_email,
        review_requested_at,
        reviewed_at,
        reviewed_by
    )
    VALUES (
        trim(p_name),
        v_review_status,
        v_contact_email,
        CASE WHEN v_review_status = 'pending_review' THEN NOW() ELSE NULL END,
        CASE WHEN v_review_status = 'approved' THEN NOW() ELSE NULL END,
        CASE WHEN v_review_status = 'approved' THEN v_user_id ELSE NULL END
    )
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'Owner')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'Owner';

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
