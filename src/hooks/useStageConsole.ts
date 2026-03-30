import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { type StageStatus } from '@/types/domain';
import { useEffect } from 'react';

const findRecoveryIndex = (lineup: any[] | undefined, currentLineupItemId: string | null | undefined) => {
    if (!lineup || lineup.length === 0) return -1;
    if (!currentLineupItemId) return 0;

    const exactIndex = lineup.findIndex((item) => item.id === currentLineupItemId);
    if (exactIndex !== -1) return exactIndex;

    return 0;
};

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
                            participant:participants(
                                id,
                                first_name,
                                last_name,
                                participant_assets(id, file_url, status, type)
                            )
                        ),
                        requirements:act_requirements(*)
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
                        assets: (p.participant.participant_assets || []).map((asset: any) => ({
                            id: asset.id,
                            fileUrl: asset.file_url,
                            status: asset.status,
                            type: asset.type,
                        })),
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

    useEffect(() => {
        if (!stageId) return;

        const channel = supabase
            .channel(`stage_lineup_${stageId}`)
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

    const currentIndex = lineup?.findIndex(item => item.id === stageState?.current_lineup_item_id) ?? -1;
    const isLiveRun = stageState?.status === 'Active' || stageState?.status === 'Paused';
    const isPreflightState = stageState?.status === 'Idle' || stageState?.status === 'Finished';
    const recoveryIndex = findRecoveryIndex(lineup, stageState?.current_lineup_item_id);
    const isRecoveredCurrent = isLiveRun && currentIndex === -1 && recoveryIndex !== -1;
    const anchorIndex = currentIndex !== -1
        ? currentIndex
        : isLiveRun && recoveryIndex !== -1
            ? recoveryIndex
        : isPreflightState && (lineup?.length ?? 0) > 0
            ? 0
            : -1;

    const current = anchorIndex !== -1 ? lineup?.[anchorIndex] : null;
    const next = anchorIndex + 1 < (lineup?.length ?? 0) ? lineup?.[anchorIndex + 1] : null;
    const upcoming = anchorIndex + 2 < (lineup?.length ?? 0) ? lineup?.[anchorIndex + 2] : null;

    // Prefetch media for the next act to ensure smooth offline transitions
    useEffect(() => {
        if (!next?.act?.requirements) return;

        next.act.requirements.forEach((req: any) => {
            if (req.fulfilled && req.fileUrl) {
                if (['Poster', 'Generative', 'IntroComposition'].includes(req.requirementType)) {
                    const img = new Image();
                    img.src = req.fileUrl;
                } else if (['Video', 'Generative_Video'].includes(req.requirementType)) {
                    const vid = document.createElement('video');
                    vid.src = req.fileUrl;
                    vid.preload = 'auto';
                }
            }
        });
    }, [next]);

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

    const isStageActionPending = updateState.isPending;

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
    const driftMinutes = isLiveRun && current ? Math.floor((now - scheduledStart) / 60000) : 0;
    const isOvertime = Boolean(isLiveRun && current && now > scheduledEnd);
    const overtimeMinutes = isOvertime ? Math.floor((now - scheduledEnd) / 60000) : 0;

    return {
        stageState,
        lineup,
        current,
        next,
        upcoming,
        hasLineup: Boolean(lineup && lineup.length > 0),
        hasRecoveredCurrent: isRecoveredCurrent,
        currentLineupPointerMissing: Boolean(isLiveRun && stageState?.current_lineup_item_id && currentIndex === -1),
        driftMinutes,
        isOvertime,
        overtimeMinutes,
        isLoading: isLoadingState || isLoadingLineup,
        isStageActionPending,
        actions: {
            startShow,
            nextPerformance,
            pauseShow,
            resumeShow,
            resetShow
        }
    };
}
