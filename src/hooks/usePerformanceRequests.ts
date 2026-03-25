import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { IntakeAuditEvent, PerformanceRequest } from '@/types/domain';

function mapPerformanceRequest(row: any): PerformanceRequest {
    return {
        id: row.id,
        organizationId: row.organization_id,
        eventId: row.event_id,
        importRunId: row.import_run_id,
        eventSourceId: row.event_source_id,
        sourceAnchor: row.source_anchor,
        title: row.title,
        leadName: row.lead_name,
        leadEmail: row.lead_email,
        leadPhone: row.lead_phone,
        durationEstimateMinutes: row.duration_estimate_minutes,
        musicSupplied: !!row.music_supplied,
        rosterSupplied: !!row.roster_supplied,
        notes: row.notes,
        rawPayload: row.raw_payload,
        requestStatus: row.request_status,
        conversionStatus: row.conversion_status,
        convertedActId: row.converted_act_id,
        convertedActName: row.converted_act?.name ?? null,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
        convertedAt: row.converted_at,
        convertedBy: row.converted_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
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

export function usePerformanceRequestsQuery(eventId: string | null) {
    return useQuery({
        queryKey: ['performance-requests', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('performance_requests')
                .select(`
                    *,
                    converted_act:acts(id, name)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return ((data as any[]) || []).map(mapPerformanceRequest);
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
        mutationFn: async ({ action, note }: { action: 'review' | 'approve' | 'reject'; note?: string | null }) => {
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
