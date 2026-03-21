import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isOperationalParticipantStatus } from '@/lib/participantStatus';

export interface DashboardRadarData {
    acts: {
        total: number;
        ready: number;
        arrived: number;
        arriving: number;
    };
    participants: {
        total: number;
        assigned: number;
        unassigned: number;
        minors: number;
        minorsAtRisk: number; // missing guardian info
        specialRequests: number;
        identityPending: number;
    };
    assets: {
        totalRequired: number;
        fulfilled: number;
        pending: number;
        missing: number;
    };
    needsResponse: {
        identityPending: number;
        specialRequestReview: number;
        actIssueOpen: number;
        actIssueBlocked: number;
        teamCoverageGaps: number;
        introPending: number;
    };
    overallReadiness: number; // 0-100
}

export function useDashboardRadar(eventId: string) {
    return useQuery({
        queryKey: ['dashboard-radar', eventId],
        queryFn: async (): Promise<DashboardRadarData> => {
            if (!eventId) throw new Error('Event ID is required');

            // 1. Acts Pulse
            const { data: acts } = await supabase
                .from('acts')
                .select('arrival_status')
                .eq('event_id', eventId);

            const actsTotal = acts?.length || 0;
            const actIds = (acts || []).map((act: any) => act.id);
            const actsReady = acts?.filter(a => a.arrival_status === 'Ready').length || 0;
            const actsArrived = acts?.filter(a => ['Arrived', 'Ready', 'Backstage'].includes(a.arrival_status)).length || 0;
            const actsArriving = actsTotal - actsArrived;

            // 2. Participants & Safety
            const { data: participants } = await supabase
                .from('participants')
                .select('id, status, is_minor, guardian_name, guardian_phone, has_special_requests, identity_verified')
                .eq('event_id', eventId);

            const operationalParticipants = (participants || []).filter((participant: any) =>
                isOperationalParticipantStatus(participant.status)
            );
            const pTotal = operationalParticipants.length || 0;
            const participantIds = (operationalParticipants as any[])?.map(p => p.id) || [];
            const pMinors = operationalParticipants?.filter(p => p.is_minor).length || 0;
            const pMinorsAtRisk = operationalParticipants?.filter(p => p.is_minor && (!p.guardian_name || !p.guardian_phone)).length || 0;
            const pSpecialRequests = operationalParticipants?.filter(p => p.has_special_requests).length || 0;
            const pIdentityPending = operationalParticipants?.filter(p => !p.identity_verified).length || 0;

            const { data: actAssignments } = await supabase
                .from('act_participants')
                .select('participant_id')
                .in('participant_id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);

            const assignedParticipantIds = new Set((actAssignments || []).map((row: any) => row.participant_id));
            const participantsAssigned = assignedParticipantIds.size;
            const participantsUnassigned = Math.max(pTotal - participantsAssigned, 0);

            // 3. Asset Compliance
            const { data: allAssets } = await supabase
                .from('participant_assets')
                .select('status, id, participant_id')
                .in('participant_id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);

            const assetsTotal = allAssets?.length || 0;
            const assetsFulfilled = allAssets?.filter(a => a.status === 'approved').length || 0;
            const assetsPending = allAssets?.filter(a => ['pending_review', 'uploaded'].includes(a.status || '')).length || 0;
            const assetsMissing = assetsTotal - assetsFulfilled - assetsPending;

            // 4. Escalations / follow-up queue
            const { data: specialRequestNotes } = await supabase
                .from('participant_notes')
                .select('participant_id')
                .eq('category', 'special_request')
                .eq('is_resolved', true)
                .in('participant_id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);

            const reviewedSpecialRequestIds = new Set((specialRequestNotes || []).map((note: any) => note.participant_id));
            const specialRequestReview = operationalParticipants.filter((participant: any) =>
                participant.has_special_requests && !reviewedSpecialRequestIds.has(participant.id)
            ).length;

            const { data: readinessIssues } = await (supabase as any)
                .from('act_readiness_issues')
                .select('status, severity')
                .in('act_id', actIds.length > 0 ? actIds : ['00000000-0000-0000-0000-000000000000']);

            const unresolvedIssues = (readinessIssues || []).filter((issue: any) => issue.status !== 'resolved');
            const blockedIssues = unresolvedIssues.filter((issue: any) =>
                issue.status === 'blocked' || issue.severity === 'high'
            ).length;

            const { data: actParticipants } = await supabase
                .from('act_participants')
                .select('act_id, role')
                .in('act_id', actIds.length > 0 ? actIds : ['00000000-0000-0000-0000-000000000000']);

            const actCoverage = new Map<string, { performerCount: number; teamCount: number }>();
            (actParticipants || []).forEach((row: any) => {
                const current = actCoverage.get(row.act_id) || { performerCount: 0, teamCount: 0 };
                if (['Manager', 'Choreographer', 'Support', 'Crew'].includes(row.role)) {
                    current.teamCount += 1;
                } else {
                    current.performerCount += 1;
                }
                actCoverage.set(row.act_id, current);
            });
            const teamCoverageGaps = Array.from(actCoverage.values()).filter((entry) =>
                entry.performerCount > 0 && entry.teamCount === 0
            ).length;

            const { data: introRequirements } = await supabase
                .from('act_requirements')
                .select('act_id, fulfilled')
                .eq('requirement_type', 'IntroComposition')
                .in('act_id', actIds.length > 0 ? actIds : ['00000000-0000-0000-0000-000000000000']);

            const introPending = (introRequirements || []).filter((requirement: any) => !requirement.fulfilled).length;

            const overallReadiness = assetsTotal > 0 ? Math.round((assetsFulfilled / assetsTotal) * 100) : 100;

            return {
                acts: {
                    total: actsTotal,
                    ready: actsReady,
                    arrived: actsArrived,
                    arriving: actsArriving
                },
                participants: {
                    total: pTotal,
                    assigned: participantsAssigned,
                    unassigned: participantsUnassigned,
                    minors: pMinors,
                    minorsAtRisk: pMinorsAtRisk,
                    specialRequests: pSpecialRequests,
                    identityPending: pIdentityPending
                },
                assets: {
                    totalRequired: assetsTotal,
                    fulfilled: assetsFulfilled,
                    pending: assetsPending,
                    missing: assetsMissing
                },
                needsResponse: {
                    identityPending: pIdentityPending,
                    specialRequestReview,
                    actIssueOpen: unresolvedIssues.length,
                    actIssueBlocked: blockedIssues,
                    teamCoverageGaps,
                    introPending,
                },
                overallReadiness
            };
        },
        enabled: !!eventId,
        refetchInterval: 10000, // Refetch every 10s for live pulse
    });
}
