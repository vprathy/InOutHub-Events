import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { type StageStatus } from '@/types/domain';
import { useEffect } from 'react';

export function useStageConsole(stageId: string | null) {
    const queryClient = useQueryClient();

    const { data: stageState, isLoading: isLoadingState } = useQuery({
        queryKey: ['stage_state', stageId],
        queryFn: async () => {
            if (!stageId) return null;
            const { data, error } = await supabase
                .from('stage_state')
                .select('*')
                .eq('stage_id', stageId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!stageId,
    });

    const { data: lineup, isLoading: isLoadingLineup } = useQuery({
        queryKey: ['lineup', stageId],
        queryFn: async () => {
            if (!stageId) return [];
            const { data, error } = await supabase
                .from('lineup_items')
                .select(`
                    *,
                    act:acts(
                        *,
                        act_participants(
                            participant:participants(id, first_name, last_name)
                        )
                    )
                `)
                .eq('stage_id', stageId)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            return (data as any[]).map((row): any => ({
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
                    act_participants: row.act.act_participants?.map((p: any) => ({
                        participantId: p.participant.id,
                        firstName: p.participant.first_name,
                        lastName: p.participant.last_name,
                    }))
                }
            }));
        },
        enabled: !!stageId,
    });

    // Real-time subscription for stage state
    useEffect(() => {
        if (!stageId) return;

        const channel = supabase
            .channel(`stage_state_${stageId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stage_state',
                    filter: `stage_id=eq.${stageId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['stage_state', stageId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [stageId, queryClient]);

    const currentIndex = lineup?.findIndex(item => item.id === stageState?.current_lineup_item_id) ?? -1;

    const current = currentIndex !== -1 ? lineup?.[currentIndex] : null;
    const next = currentIndex + 1 < (lineup?.length ?? 0) ? lineup?.[currentIndex + 1] : null;
    const upcoming = currentIndex + 2 < (lineup?.length ?? 0) ? lineup?.[currentIndex + 2] : null;

    const updateState = useMutation({
        mutationFn: async (updates: { status?: StageStatus, current_lineup_item_id?: string | null }) => {
            if (!stageId) return;
            const { error } = await supabase
                .from('stage_state')
                .update(updates)
                .eq('stage_id', stageId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage_state', stageId] });
        }
    });

    const startShow = () => {
        if (!lineup || lineup.length === 0) return;
        updateState.mutate({
            status: 'Active',
            current_lineup_item_id: lineup[0].id
        });
    };

    const nextPerformance = () => {
        if (!next) {
            updateState.mutate({ status: 'Finished', current_lineup_item_id: null });
        } else {
            updateState.mutate({ current_lineup_item_id: next.id });
        }
    };

    const pauseShow = () => {
        updateState.mutate({ status: 'Paused' });
    };

    const resumeShow = () => {
        updateState.mutate({ status: 'Active' });
    };

    const resetShow = () => {
        updateState.mutate({ status: 'Idle', current_lineup_item_id: null });
    };

    const now = Date.now();
    const scheduledStart = current ? new Date(current.scheduledStartTime).getTime() : 0;
    const scheduledEnd = current ? scheduledStart + (current.act.durationMinutes * 60000) : 0;

    // Drift is positive if we're past the scheduled start
    const driftMinutes = current ? Math.floor((now - scheduledStart) / 60000) : 0;
    const isOvertime = current && now > scheduledEnd;
    const overtimeMinutes = isOvertime ? Math.floor((now - scheduledEnd) / 60000) : 0;

    return {
        stageState,
        lineup,
        current,
        next,
        upcoming,
        driftMinutes,
        isOvertime,
        overtimeMinutes,
        isLoading: isLoadingState || isLoadingLineup,
        actions: {
            startShow,
            nextPerformance,
            pauseShow,
            resumeShow,
            resetShow
        }
    };
}
