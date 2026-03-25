CREATE OR REPLACE FUNCTION public.get_performance_request_stats(p_event_id UUID)
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    approved BIGINT,
    converted BIGINT,
    rejected BIGINT
) AS $$
BEGIN
    IF NOT (auth_is_super_admin() OR auth_event_role(p_event_id) = 'EventAdmin') THEN
        RAISE EXCEPTION 'Insufficient permissions to view performance request stats';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE request_status IN ('pending', 'reviewed'))::BIGINT AS pending,
        COUNT(*) FILTER (WHERE request_status = 'approved' AND COALESCE(conversion_status, 'not_started') <> 'converted')::BIGINT AS approved,
        COUNT(*) FILTER (WHERE conversion_status = 'converted')::BIGINT AS converted,
        COUNT(*) FILTER (WHERE request_status = 'rejected')::BIGINT AS rejected
    FROM public.performance_requests
    WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
