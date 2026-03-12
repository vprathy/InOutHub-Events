import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { type LineupSlot, type Act } from '@/types/domain';

export function useLineupQuery(stageId: string | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['lineup', stageId],
        queryFn: async () => {
            if (!stageId) return [];
            const { data, error } = await supabase
                .from('lineup_items')
                .select(`
                    *,
                    act:acts(*)
                `)
                .eq('stage_id', stageId)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            return (data as any[]).map((row): LineupSlot => ({
                id: row.id,
                stageId: row.stage_id,
                actId: row.act_id,
                scheduledStartTime: row.scheduled_start_time,
                sortOrder: row.sort_order,
                executionStatus: row.execution_status || 'Queued',
                act: {
                    id: row.act.id,
                    eventId: row.act.event_id,
                    name: row.act.name,
                    durationMinutes: row.act.duration_minutes,
                    setupTimeMinutes: row.act.setup_time_minutes,
                    arrivalStatus: row.act.arrival_status,
                    notes: row.act.notes,
                }
            }));
        },
        enabled: !!stageId,
    });

    // Real-time subscription
    useEffect(() => {
        if (!stageId) return;

        const channel = supabase
            .channel(`lineup_changes_${stageId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lineup_items',
                    filter: `stage_id=eq.${stageId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['lineup', stageId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [stageId, queryClient]);

    return query;
}

export function useUnassignedActsQuery(eventId: string) {
    return useQuery({
        queryKey: ['unassigned_acts', eventId],
        queryFn: async () => {
            // 1. Get all acts for the event
            // 2. Get all assigned act_ids from lineup_items for stages in THIS event
            // Note: A simpler way in SQL is using NOT EXISTS or LEFT JOIN

            const { data, error } = await supabase
                .from('acts')
                .select('*, lineup_items(id)')
                .eq('event_id', eventId);

            if (error) throw error;

            // Filter out acts that have any lineup_items
            return (data as any[])
                .filter(row => !row.lineup_items || row.lineup_items.length === 0)
                .map((row): Act => ({
                    id: row.id,
                    eventId: row.event_id,
                    name: row.name,
                    durationMinutes: row.duration_minutes,
                    setupTimeMinutes: row.setup_time_minutes,
                    arrivalStatus: row.arrival_status,
                    notes: row.notes,
                }));
        },
        enabled: !!eventId,
    });
}

export function useAddLineupItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stageId, actId, sortOrder, scheduledStartTime }: {
            stageId: string,
            actId: string,
            sortOrder: number,
            scheduledStartTime?: string
        }) => {
            const { error } = await supabase
                .from('lineup_items')
                .insert({
                    stage_id: stageId,
                    act_id: actId,
                    sort_order: sortOrder,
                    scheduled_start_time: scheduledStartTime || new Date().toISOString()
                });

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['lineup', variables.stageId] });
            queryClient.invalidateQueries({ queryKey: ['unassigned_acts'] });
        }
    });
}

export function useUpdateLineupSlot() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: {
            id: string,
            stageId: string,
            updates: Partial<Pick<LineupSlot, 'sortOrder' | 'scheduledStartTime' | 'executionStatus'>>
        }) => {
            const dbUpdates: any = {};
            if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
            if (updates.scheduledStartTime !== undefined) dbUpdates.scheduled_start_time = updates.scheduledStartTime;
            if (updates.executionStatus !== undefined) dbUpdates.execution_status = updates.executionStatus;

            const { error } = await supabase
                .from('lineup_items')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['lineup', variables.stageId] });
        }
    });
}

export function useRemoveLineupItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id }: { id: string, stageId: string }) => {
            const { error } = await supabase
                .from('lineup_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['lineup', variables.stageId] });
            queryClient.invalidateQueries({ queryKey: ['unassigned_acts'] });
        }
    });
}
