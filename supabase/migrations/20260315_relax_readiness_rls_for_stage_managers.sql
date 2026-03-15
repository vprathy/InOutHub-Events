DO $$ BEGIN
    DROP POLICY IF EXISTS "act_readiness_practices_manage" ON act_readiness_practices;
    CREATE POLICY "act_readiness_practices_manage" ON act_readiness_practices
        FOR ALL
        USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "act_readiness_items_manage" ON act_readiness_items;
    CREATE POLICY "act_readiness_items_manage" ON act_readiness_items
        FOR ALL
        USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "act_readiness_issues_manage" ON act_readiness_issues;
    CREATE POLICY "act_readiness_issues_manage" ON act_readiness_issues
        FOR ALL
        USING (auth_is_super_admin() OR auth_event_role(get_act_event_id(act_id)) IN ('EventAdmin', 'StageManager'));
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;
