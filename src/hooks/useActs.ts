import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ActWithCounts, ArrivalStatus } from '../types/domain';
import { useEffect } from 'react';

export function useActsQuery(eventId: string) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['acts', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('acts')
                .select(`
          *,
          act_participants(id),
          act_assets(id, asset_type, asset_name),
          act_requirements(id, requirement_type)
        `)
                .eq('event_id', eventId)
                .order('name');

            if (error) throw error;

            return (data as any[]).map((row): ActWithCounts => ({
                id: row.id,
                eventId: row.event_id,
                name: row.name,
                durationMinutes: row.duration_minutes,
                setupTimeMinutes: row.setup_time_minutes,
                arrivalStatus: row.arrival_status as ArrivalStatus,
                notes: row.notes,
                participantCount: row.act_participants?.length || 0,
                assetCount: row.act_assets?.length || 0,
                requirementCount: row.act_requirements?.length || 0,
                hasTechnicalRider: (row.act_requirements || []).some((r: any) =>
                    ['Audio', 'Lighting', 'Microphone', 'Video'].includes(r.requirement_type)
                ),
                hasMusicTrack: (row.act_assets || []).some((a: any) =>
                    a.asset_type === 'Audio' || a.asset_name.toLowerCase().includes('music')
                ),
            }));
        },
        enabled: !!eventId,
    });

    // Real-time subscription
    useEffect(() => {
        if (!eventId) return;

        const channel = supabase
            .channel(`acts_changes_${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'acts',
                    filter: `event_id=eq.${eventId}`,
                },
                () => {
                    // Invalidate and refetch to get fresh counts and data
                    queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId, queryClient]);

    return query;
}

export function useUpdateActStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ actId, status }: { actId: string; status: ArrivalStatus }) => {
            const { data, error } = await supabase
                .from('acts')
                .update({ arrival_status: status })
                .eq('id', actId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ actId, status }) => {
            // Find the eventId from the acts list in cache
            const queries = queryClient.getQueryCache().findAll({ queryKey: ['acts'] });
            const query = queries[0]; // Assuming only one active event for now
            if (!query) return;

            const eventId = query.queryKey[1] as string;

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['acts', eventId] });

            // Snapshot previous value
            const previousActs = queryClient.getQueryData<ActWithCounts[]>(['acts', eventId]);

            // Optimistically update
            if (previousActs) {
                queryClient.setQueryData<ActWithCounts[]>(['acts', eventId],
                    previousActs.map(act => act.id === actId ? { ...act, arrivalStatus: status } : act)
                );
            }

            return { previousActs, eventId };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousActs) {
                queryClient.setQueryData(['acts', context.eventId], context.previousActs);
            }
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.eventId) {
                queryClient.invalidateQueries({ queryKey: ['acts', context.eventId] });
            }
        },
    });
}
