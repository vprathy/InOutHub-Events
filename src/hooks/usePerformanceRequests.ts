import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { IntakeAuditEvent, PerformanceRequest } from '@/types/domain';

type RawPayload = Record<string, unknown>;

const REQUEST_SOURCE_ALIASES = {
    title: ['program name', 'program title', 'performance title', 'performance name', 'act title', 'act name', 'dance title', 'item title', 'title'],
    performanceType: ['performance type', 'program type', 'act type', 'item type', 'category', 'dance style', 'style', 'genre', 'division', 'group type', 'entry type', 'team type'],
    leadName: ['requester name', 'requestor name', 'submitted by', 'primary contact name', 'primary contact', 'contact name', 'lead name', 'lead contact', 'teacher name', 'coach name', 'director name', 'manager name', 'team manager', 'name'],
    leadFirstName: ['requester first name', 'requestor first name', 'first name', 'contact first name', 'primary contact first name'],
    leadLastName: ['requester last name', 'requestor last name', 'last name', 'contact last name', 'primary contact last name'],
    leadEmail: ['requester email', 'requestor email', 'primary contact email', 'contact email', 'lead email', 'manager email', 'teacher email', 'email address', 'email'],
    leadPhone: ['requester phone', 'requestor phone', 'primary contact phone', 'contact phone', 'lead phone', 'manager phone', 'teacher phone', 'phone number', 'phone', 'mobile'],
    requestDate: ['timestamp', 'submitted at', 'submitted on', 'submission date', 'date submitted', 'request date', 'entry date'],
    durationMinutes: ['program duration', 'duration estimate minutes', 'duration minutes', 'duration', 'runtime', 'length'],
    notes: ['special request', 'special requests', 'request notes', 'notes', 'comments', 'description', 'message'],
} as const;

function normalizeKey(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toText(value: unknown) {
    return value == null ? '' : String(value).trim();
}

function getRawPayload(row: any): RawPayload {
    return row?.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
}

function findRawValue(
    rawPayload: RawPayload,
    aliases: readonly string[],
    validator?: (value: string) => boolean
): { value: string; sourceKey: string } | null {
    const entries = Object.entries(rawPayload)
        .map(([key, value]) => ({ key, normalizedKey: normalizeKey(key), value: toText(value) }))
        .filter((entry) => entry.value.length > 0);

    for (const alias of aliases) {
        const exact = entries.find((entry) => entry.normalizedKey === alias);
        if (exact && (!validator || validator(exact.value))) {
            return { value: exact.value, sourceKey: exact.key };
        }
    }

    for (const alias of aliases) {
        const partial = entries.find((entry) => entry.normalizedKey.includes(alias));
        if (partial && (!validator || validator(partial.value))) {
            return { value: partial.value, sourceKey: partial.key };
        }
    }

    return null;
}

function isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10;
}

function buildImportInsights(row: any) {
    const rawPayload = getRawPayload(row);

    const title = toText(row.title) || findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.title)?.value || 'Untitled Request';
    const performanceTypeMatch = findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.performanceType);
    const leadNameMatch = toText(row.lead_name)
        ? { value: toText(row.lead_name), sourceKey: null as string | null }
        : findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.leadName);
    const leadFirstNameMatch = findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.leadFirstName);
    const leadLastNameMatch = findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.leadLastName);
    const leadEmailMatch = toText(row.lead_email)
        ? { value: toText(row.lead_email), sourceKey: null as string | null }
        : findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.leadEmail, isEmail);
    const leadPhoneMatch = toText(row.lead_phone)
        ? { value: toText(row.lead_phone), sourceKey: null as string | null }
        : findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.leadPhone, isPhone);
    const requestDateMatch = findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.requestDate);
    const durationSource = findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.durationMinutes);
    const notesMatch = toText(row.notes)
        ? { value: toText(row.notes), sourceKey: null as string | null }
        : findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.notes);
    const combinedLeadName = leadNameMatch?.value
        || [leadFirstNameMatch?.value, leadLastNameMatch?.value].filter(Boolean).join(' ').trim()
        || null;
    const combinedLeadSourceKey = leadNameMatch?.sourceKey
        || [leadFirstNameMatch?.sourceKey, leadLastNameMatch?.sourceKey].filter(Boolean).join(' + ')
        || null;

    const importInsights = [
        { label: 'Request Title', value: title, sourceKey: findRawValue(rawPayload, REQUEST_SOURCE_ALIASES.title)?.sourceKey || null },
        performanceTypeMatch ? { label: 'Performance Type', value: performanceTypeMatch.value, sourceKey: performanceTypeMatch.sourceKey } : null,
        combinedLeadName ? { label: 'Requestor', value: combinedLeadName, sourceKey: combinedLeadSourceKey } : null,
        leadEmailMatch ? { label: 'Email', value: leadEmailMatch.value, sourceKey: leadEmailMatch.sourceKey } : null,
        leadPhoneMatch ? { label: 'Phone', value: leadPhoneMatch.value, sourceKey: leadPhoneMatch.sourceKey } : null,
        requestDateMatch ? { label: 'Request Date', value: requestDateMatch.value, sourceKey: requestDateMatch.sourceKey } : null,
        {
            label: 'Duration',
            value: `${Number.isFinite(Number(row.duration_estimate_minutes)) ? Number(row.duration_estimate_minutes) : 5} minutes`,
            sourceKey: durationSource?.sourceKey || null,
        },
        { label: 'Music', value: row.music_supplied ? 'Supplied' : 'Not supplied', sourceKey: null },
        { label: 'Roster', value: row.roster_supplied ? 'Supplied' : 'Not supplied', sourceKey: null },
        row.source_anchor ? { label: 'Source Identity', value: row.source_anchor, sourceKey: null } : null,
        notesMatch ? { label: 'Imported Notes', value: notesMatch.value, sourceKey: notesMatch.sourceKey } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; sourceKey?: string | null }>;

    return {
        title,
        performanceType: performanceTypeMatch?.value || null,
        leadName: combinedLeadName,
        leadEmail: leadEmailMatch?.value || null,
        leadPhone: leadPhoneMatch?.value || null,
        requestDate: requestDateMatch?.value || null,
        notes: notesMatch?.value || null,
        importInsights,
    };
}

function mapPerformanceRequest(row: any): PerformanceRequest {
    const resolved = buildImportInsights(row);

    return {
        id: row.id,
        organizationId: row.organization_id,
        eventId: row.event_id,
        importRunId: row.import_run_id,
        eventSourceId: row.event_source_id,
        sourceAnchor: row.source_anchor,
        title: resolved.title,
        performanceType: resolved.performanceType,
        leadName: resolved.leadName,
        leadEmail: resolved.leadEmail,
        leadPhone: resolved.leadPhone,
        requestDate: resolved.requestDate,
        durationEstimateMinutes: row.duration_estimate_minutes,
        musicSupplied: !!row.music_supplied,
        rosterSupplied: !!row.roster_supplied,
        notes: resolved.notes,
        rawPayload: row.raw_payload,
        requestStatus: row.request_status,
        conversionStatus: row.conversion_status,
        convertedActId: row.converted_act_id,
        convertedActName: row.converted_act_name ?? null,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
        convertedAt: row.converted_at,
        convertedBy: row.converted_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        importInsights: resolved.importInsights,
    };
}

function mapIntakeAuditEvent(row: any): IntakeAuditEvent {
    const actor = row.actor || null;
    const actorName = [actor?.first_name, actor?.last_name].filter(Boolean).join(' ').trim();

    return {
        id: row.id,
        entityId: row.entity_id,
        entityType: row.entity_type,
        action: row.action,
        note: row.note,
        beforeData: row.before_data,
        afterData: row.after_data,
        metadata: row.metadata,
        performedAt: row.performed_at,
        performedBy: row.performed_by,
        actorName: actorName || null,
        actorEmail: actor?.email || null,
    };
}

type PerformanceRequestSegment = 'pending' | 'approved' | 'converted' | 'rejected' | 'all';

function applyRequestSegmentFilter(query: any, segment: PerformanceRequestSegment) {
    if (segment === 'converted') {
        return query.eq('conversion_status', 'converted');
    }

    if (segment === 'approved') {
        return query.eq('request_status', 'approved').neq('conversion_status', 'converted');
    }

    if (segment === 'rejected') {
        return query.eq('request_status', 'rejected');
    }

    if (segment === 'pending') {
        return query.or('request_status.eq.pending,request_status.eq.reviewed');
    }

    return query;
}

function applyRequestSearch(query: any, normalizedSearch: string) {
    if (!normalizedSearch) return query;

    return query.or(
        [
            `title.ilike.%${normalizedSearch}%`,
            `lead_name.ilike.%${normalizedSearch}%`,
            `lead_email.ilike.%${normalizedSearch}%`,
            `lead_phone.ilike.%${normalizedSearch}%`,
        ].join(',')
    );
}

export function usePerformanceRequestsQuery({
    eventId,
    segment,
    searchTerm,
    limit,
}: {
    eventId: string | null;
    segment: PerformanceRequestSegment;
    searchTerm: string;
    limit: number;
}) {
    return useQuery({
        queryKey: ['performance-requests', eventId, segment, searchTerm, limit],
        enabled: !!eventId,
        queryFn: async () => {
            const normalizedSearch = searchTerm.trim();
            let query = (supabase as any)
                .from('v_performance_requests_hardened')
                .select('*', { count: 'exact' })
                .eq('event_id', eventId);

            query = applyRequestSegmentFilter(query, segment);
            query = applyRequestSearch(query, normalizedSearch);

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(0, Math.max(limit - 1, 0));

            if (error) throw error;
            return {
                requests: ((data as any[]) || []).map(mapPerformanceRequest),
                totalCount: count || 0,
            };
        },
    });
}

export function usePerformanceRequestCounts(eventId: string | null) {
    return useQuery({
        queryKey: ['performance-requests-counts', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const base = () => (supabase as any).from('v_performance_requests_hardened').select('id', { count: 'exact', head: true }).eq('event_id', eventId);

            const [
                totalResult,
                pendingResult,
                approvedResult,
                convertedResult,
                rejectedResult,
            ] = await Promise.all([
                base(),
                applyRequestSegmentFilter(base(), 'pending'),
                applyRequestSegmentFilter(base(), 'approved'),
                applyRequestSegmentFilter(base(), 'converted'),
                applyRequestSegmentFilter(base(), 'rejected'),
            ]);

            const errors = [
                totalResult.error,
                pendingResult.error,
                approvedResult.error,
                convertedResult.error,
                rejectedResult.error,
            ].filter(Boolean);

            if (errors[0]) throw errors[0];

            return {
                total: totalResult.count || 0,
                pending: pendingResult.count || 0,
                approved: approvedResult.count || 0,
                converted: convertedResult.count || 0,
                rejected: rejectedResult.count || 0,
            };
        },
    });
}

export function usePerformanceRequestTimeline(requestId: string | null) {
    return useQuery({
        queryKey: ['performance-request-timeline', requestId],
        enabled: !!requestId,
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('intake_audit_events')
                .select(`
                    id,
                    entity_id,
                    entity_type,
                    action,
                    note,
                    before_data,
                    after_data,
                    metadata,
                    performed_at,
                    performed_by,
                    actor:user_profiles!intake_audit_events_performed_by_fkey(first_name, last_name, email)
                `)
                .eq('entity_type', 'performance_request')
                .eq('entity_id', requestId)
                .order('performed_at', { ascending: false });

            if (error) throw error;
            return ((data as any[]) || []).map(mapIntakeAuditEvent);
        },
    });
}

export function useSetPerformanceRequestStatus(eventId: string | null, requestId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ action, note }: { action: 'review' | 'approve' | 'reject' | 'move_back_to_pending'; note?: string | null }) => {
            const { data, error } = await (supabase as any).rpc('set_performance_request_status', {
                p_request_id: requestId,
                p_action: action,
                p_note: note || null,
            });

            if (error) throw error;
            return mapPerformanceRequest(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performance-requests', eventId] });
            queryClient.invalidateQueries({ queryKey: ['performance-request-timeline', requestId] });
        },
    });
}

export function useConvertPerformanceRequest(eventId: string | null, requestId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data, error } = await (supabase as any).rpc('convert_performance_request_to_act', {
                p_request_id: requestId,
                p_setup_time_minutes: 2,
            });

            if (error) throw error;
            return data as string;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performance-requests', eventId] });
            queryClient.invalidateQueries({ queryKey: ['performance-request-timeline', requestId] });
            queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        },
    });
}

export function usePerformanceRequestForAct(actId: string | null) {
    return useQuery({
        queryKey: ['performance-request-for-act', actId],
        enabled: !!actId,
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('v_performance_requests_hardened')
                .select('*')
                .eq('converted_act_id', actId)
                .maybeSingle();

            if (error) throw error;
            return data ? mapPerformanceRequest(data) : null;
        },
    });
}
