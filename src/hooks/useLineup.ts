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
                    act:acts(
                        *,
                        participants:act_participants(
                            id,
                            participant_id,
                            role,
                            participant:participants(
                                first_name,
                                last_name,
                                guardian_name,
                                guardian_phone
                            )
                        ),
                        requirements:act_requirements(*)
                    )
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
                    participants: row.act.participants?.map((p: any) => ({
                        id: p.id,
                        participantId: p.participant_id,
                        firstName: p.participant.first_name,
                        lastName: p.participant.last_name,
                        role: p.role,
                        guardianName: p.participant.guardian_name,
                        guardianPhone: p.participant.guardian_phone
                    })),
                    requirements: row.act.requirements?.map((r: any) => ({
                        id: r.id,
                        requirementType: r.requirement_type,
                        description: r.description,
                        fileUrl: r.file_url,
                        fulfilled: r.fulfilled
                    }))
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

export function useUpdateLineupOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ items }: {
            items: { id: string, sortOrder: number }[]
        }) => {
            // Two-phase reorder to avoid colliding with the unique (stage_id, sort_order) constraint.
            const tempResults = await Promise.all(
                items.map((item, index) =>
                    supabase
                        .from('lineup_items')
                        .update({ sort_order: -1000 - index })
                        .eq('id', item.id)
                )
            );

            const tempErrors = tempResults.filter((result) => result.error).map((result) => result.error);
            if (tempErrors.length > 0) throw tempErrors[0];

            for (const item of items) {
                const { error } = await supabase
                    .from('lineup_items')
                    .update({ sort_order: item.sortOrder })
                    .eq('id', item.id);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineup'] });
            queryClient.invalidateQueries({ queryKey: ['all_event_lineup'] });
        }
    });
}

export function useAllEventLineupQuery(eventId: string) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['all_event_lineup', eventId],
        queryFn: async () => {
            const { data: stages, error: stageError } = await supabase
                .from('stages')
                .select('id')
                .eq('event_id', eventId);

            if (stageError) throw stageError;
            const stageIds = stages.map(s => s.id);

            if (stageIds.length === 0) return [];

            const { data, error } = await supabase
                .from('lineup_items')
                .select(`
                    *,
                    act:acts(
                        *,
                        participants:act_participants(
                            id,
                            participant_id,
                            role,
                            participant:participants(
                                first_name,
                                last_name
                            )
                        ),
                        requirements:act_requirements(*)
                    )
                `)
                .in('stage_id', stageIds);

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
                    participants: row.act.participants?.map((p: any) => ({
                        id: p.id,
                        participantId: p.participant_id,
                        firstName: p.participant.first_name,
                        lastName: p.participant.last_name,
                        role: p.role
                    })),
                    requirements: row.act.requirements?.map((r: any) => ({
                        id: r.id,
                        requirementType: r.requirement_type,
                        description: r.description,
                        fileUrl: r.file_url,
                        fulfilled: r.fulfilled
                    }))
                }
            }));
        },
        enabled: !!eventId,
    });

    // Real-time subscription for any lineup changes in this event
    useEffect(() => {
        if (!eventId) return;

        const channel = supabase
            .channel(`all_lineup_changes_${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lineup_items',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['all_event_lineup', eventId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId, queryClient]);

    return query;
}
