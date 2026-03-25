-- RBAC/PII Hardening for Participants
-- Purpose:
-- 1. Restrict ActAdmin to seeing only their act's participants.
-- 2. Mask Guardian PII for non-admin roles (StageManager, Member, etc.).
-- 3. Provide operational contact lookup for StageManagers.

-- 1. Helper to check if a user can view guardian PII for a participant
-- Rule: Only EventAdmin, SuperAdmin, or Org Owner/Admin can see guardian PII.
-- StageManager and ActAdmin are EXCLUDED.
CREATE OR REPLACE FUNCTION can_view_guardian_pii(p_participant_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
BEGIN
    SELECT event_id INTO v_event_id FROM participants WHERE id = p_participant_id;
    IF v_event_id IS NULL THEN RETURN FALSE; END IF;

    v_role := get_effective_event_role(v_event_id, p_user_id);

    -- Only top-tier admins get guardian PII
    RETURN v_role = 'EventAdmin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

-- 2. Helper to check if a user can view a participant record
CREATE OR REPLACE FUNCTION can_view_participant(p_participant_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_event_id UUID;
    v_role TEXT;
    v_user_email TEXT;
BEGIN
    SELECT event_id INTO v_event_id FROM participants WHERE id = p_participant_id;
    IF v_event_id IS NULL THEN RETURN FALSE; END IF;

    v_role := get_effective_event_role(v_event_id, p_user_id);

    -- EventAdmin, SuperAdmin, StageManager can see all participants in the event roster
    IF v_role IN ('EventAdmin', 'StageManager') THEN
        RETURN TRUE;
    END IF;

    -- ActAdmin can only see participants in their own acts
    -- Act ownership is derived from the user's email matching a 'Manager' participant in an act
    IF v_role = 'ActAdmin' THEN
        SELECT email INTO v_user_email FROM user_profiles WHERE id = p_user_id;

        RETURN EXISTS (
            SELECT 1
            FROM act_participants ap_target
            JOIN acts a ON a.id = ap_target.act_id
            JOIN act_participants ap_manager ON ap_manager.act_id = a.id
            JOIN participants p_manager ON p_manager.id = ap_manager.participant_id
            WHERE ap_target.participant_id = p_participant_id
              AND ap_manager.role = 'Manager'
              AND (
                  -- Email match in src_raw
                  normalize_email(p_manager.src_raw->>'email') = normalize_email(v_user_email)
                  OR normalize_email(p_manager.src_raw->>'Email') = normalize_email(v_user_email)
                  OR normalize_email(p_manager.src_raw->>'Email Address') = normalize_email(v_user_email)
                  OR normalize_email(p_manager.src_raw->>'Guardian Email') = normalize_email(v_user_email)
                  -- Future proof: if we add an email column to participants
                  -- OR normalize_email(p_manager.email) = normalize_email(v_user_email)
              )
        );
    END IF;

    -- Member role currently has no general roster visibility
    -- (They interact via specific Act/Submission tokens in future phases)
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

-- 3. Update participants RLS policies
-- We drop existing policies and replace them with hardened versions.
DROP POLICY IF EXISTS "participants_select" ON participants;
CREATE POLICY "participants_select" ON participants
    FOR SELECT
    USING (can_view_participant(id, auth.uid()));

-- 4. Update requirement_assignments RLS
-- Ensure assignments follow the same visibility rules as the participant they belong to.
DROP POLICY IF EXISTS "requirement_assignments_select" ON requirement_assignments;
CREATE POLICY "requirement_assignments_select" ON requirement_assignments
    FOR SELECT
    USING (
        auth_is_super_admin()
        OR (act_id IS NOT NULL AND auth_event_role(get_act_event_id(act_id)) IS NOT NULL)
        OR (participant_id IS NOT NULL AND can_view_participant(participant_id, auth.uid()))
    );

-- 5. Operational Contact Stack Helper
-- Returns a list of contacts for an act in priority order.
-- Used by StageManagers when Guardian PII is masked.
CREATE OR REPLACE FUNCTION get_operational_contacts(p_act_id UUID)
RETURNS TABLE (
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- 1. Performance Managers (Participants with role 'Manager')
    SELECT
        p.first_name || ' ' || p.last_name as contact_name,
        'Act Manager' as contact_role,
        extract_participant_contact_email(p.src_raw, p.notes) as contact_email,
        COALESCE(p.guardian_phone, (p.src_raw->>'phone')::text) as contact_phone,
        1 as priority
    FROM act_participants ap
    JOIN participants p ON p.id = ap.participant_id
    WHERE ap.act_id = p_act_id AND ap.role = 'Manager'

    UNION ALL

    -- 2. Act Admins (Users with role 'ActAdmin' for the event who are managers of this act)
    -- This is slightly redundant with the above but covers direct user-linked admins if we add them.
    SELECT
        up.email as contact_name,
        'Act Admin' as contact_role,
        up.email as contact_email,
        NULL::text as contact_phone,
        2 as priority
    FROM act_participants ap
    JOIN participants p ON p.id = ap.participant_id
    JOIN user_profiles up ON normalize_email(up.email) = extract_participant_contact_email(p.src_raw, p.notes)
    JOIN event_members em ON em.user_id = up.id AND em.event_id = p.event_id
    WHERE ap.act_id = p_act_id AND ap.role = 'Manager' AND em.role = 'ActAdmin'

    UNION ALL

    -- 3. Event Admins (Static Fallback)
    SELECT
        up.email as contact_name,
        'Event Admin' as contact_role,
        up.email as contact_email,
        NULL::text as contact_phone,
        3 as priority
    FROM event_members em
    JOIN user_profiles up ON up.id = em.user_id
    JOIN acts a ON a.event_id = em.event_id
    WHERE a.id = p_act_id AND em.role = 'EventAdmin'

    ORDER BY priority ASC, contact_name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';
