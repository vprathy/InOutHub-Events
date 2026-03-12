import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardRadarData {
    acts: {
        total: number;
        ready: number;
        arrived: number;
        arriving: number;
    };
    participants: {
        total: number;
        minors: number;
        minorsAtRisk: number; // missing guardian info
    };
    assets: {
        totalRequired: number;
        fulfilled: number;
        pending: number;
        missing: number;
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
            const actsReady = acts?.filter(a => a.arrival_status === 'Ready').length || 0;
            const actsArrived = acts?.filter(a => ['Arrived', 'Ready', 'Backstage'].includes(a.arrival_status)).length || 0;
            const actsArriving = actsTotal - actsArrived;

            // 2. Participants & Safety
            const { data: participants } = await supabase
                .from('participants')
                .select('is_minor, guardian_name, guardian_phone')
                .eq('event_id', eventId);

            const pTotal = participants?.length || 0;
            const pMinors = participants?.filter(p => p.is_minor).length || 0;
            const pMinorsAtRisk = participants?.filter(p => p.is_minor && (!p.guardian_name || !p.guardian_phone)).length || 0;

            // 3. Asset Compliance
            const participantIds = (participants as any[])?.map(p => p.id) || [];
            const { data: allAssets } = await supabase
                .from('participant_assets')
                .select('status, id, participant_id')
                .in('participant_id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);

            const assetsTotal = allAssets?.length || 0;
            const assetsFulfilled = allAssets?.filter(a => a.status === 'approved').length || 0;
            const assetsPending = allAssets?.filter(a => ['pending_review', 'uploaded'].includes(a.status || '')).length || 0;
            const assetsMissing = assetsTotal - assetsFulfilled - assetsPending;

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
                    minors: pMinors,
                    minorsAtRisk: pMinorsAtRisk
                },
                assets: {
                    totalRequired: assetsTotal,
                    fulfilled: assetsFulfilled,
                    pending: assetsPending,
                    missing: assetsMissing
                },
                overallReadiness
            };
        },
        enabled: !!eventId,
        refetchInterval: 10000, // Refetch every 10s for live pulse
    });
}
