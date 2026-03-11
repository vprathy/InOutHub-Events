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
            return data as any[];
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

    return {
        stageState,
        lineup,
        current,
        next,
        upcoming,
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
