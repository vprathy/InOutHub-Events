import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ActWithCounts, ArrivalStatus } from '@/types/domain';
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
                    act_participants(
                        participant:participants(
                            id,
                            has_special_requests,
                            participant_assets(status)
                        )
                    ),
                    act_assets(id, asset_type, asset_name),
                    act_requirements(id, requirement_type)
                `)
                .eq('event_id', eventId)
                .order('name');

            if (error) throw error;

            return (data as any[]).map((row): ActWithCounts => {
                const actParticipants = row.act_participants || [];

                // Calculate missing assets: Any participant with NO assets or at least one non-approved asset
                // Actually, let's be more precise: count participants who have forms that are not approved.
                const participantsWithPendingForms = actParticipants.filter((ap: any) => {
                    const p = ap.participant;
                    if (!p) return false;
                    const assets = p.participant_assets || [];
                    if (assets.length === 0) return true; // Assume they need at least one form if none exists? 
                    // Or check if they have any status that isn't 'approved'
                    return assets.some((a: any) => a.status !== 'approved');
                }).length;

                const specialRequestCount = actParticipants.filter((ap: any) =>
                    ap.participant?.has_special_requests
                ).length;

                return {
                    id: row.id,
                    eventId: row.event_id,
                    name: row.name,
                    durationMinutes: row.duration_minutes,
                    setupTimeMinutes: row.setup_time_minutes,
                    arrivalStatus: row.arrival_status as ArrivalStatus,
                    notes: row.notes,
                    participantCount: actParticipants.length,
                    assetCount: row.act_assets?.length || 0,
                    requirementCount: row.act_requirements?.length || 0,
                    missingAssetCount: participantsWithPendingForms,
                    specialRequestCount: specialRequestCount,
                    hasTechnicalRider: (row.act_requirements || []).some((r: any) =>
                        ['Audio', 'Lighting', 'Microphone', 'Video'].includes(r.requirement_type)
                    ),
                    hasMusicTrack: (row.act_assets || []).some((a: any) =>
                        a.asset_type === 'Audio' || a.asset_name.toLowerCase().includes('music')
                    ),
                };
            });
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

export function useCreateAct(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAct: {
            name: string;
            durationMinutes: number;
            setupTimeMinutes: number;
            notes?: string;
        }) => {
            const { data, error } = await supabase
                .from('acts')
                .insert([{
                    event_id: eventId,
                    name: newAct.name,
                    duration_minutes: newAct.durationMinutes,
                    setup_time_minutes: newAct.setupTimeMinutes,
                    notes: newAct.notes,
                    arrival_status: 'Not Arrived'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        }
    });
}
export function useActDetail(actId: string | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['act', actId],
        queryFn: async () => {
            if (!actId) return null;

            const { data, error } = await supabase
                .from('acts')
                .select(`
                    *,
                    act_participants(
                        id,
                        role,
                        participant:participants(
                            id,
                            first_name,
                            last_name,
                            guardian_name,
                            guardian_phone,
                            status,
                            participant_assets(status)
                        )
                    ),
                    act_assets(id, asset_type, asset_name, notes),
                    act_requirements(id, requirement_type, description, file_url, fulfilled)
                `)
                .eq('id', actId)
                .single();

            if (error) throw error;

            const row = data as any;

            // Map to domain model
            const actDetails: any = {
                id: row.id,
                eventId: row.event_id,
                name: row.name,
                durationMinutes: row.duration_minutes,
                setupTimeMinutes: row.setup_time_minutes,
                arrivalStatus: row.arrival_status as ArrivalStatus,
                notes: row.notes,
                participants: (row.act_participants || []).map((ap: any) => ({
                    id: ap.id,
                    participantId: ap.participant.id,
                    firstName: ap.participant.first_name,
                    lastName: ap.participant.last_name,
                    role: ap.role,
                    guardianName: ap.participant.guardian_name,
                    guardianPhone: ap.participant.guardian_phone,
                    status: ap.participant.status,
                    assets: ap.participant.participant_assets || []
                })),
                assets: (row.act_assets || []).map((a: any) => ({
                    id: a.id,
                    assetName: a.asset_name,
                    assetType: a.asset_type,
                    notes: a.notes
                })),
                requirements: (row.act_requirements || []).map((r: any) => ({
                    id: r.id,
                    requirementType: r.requirement_type,
                    description: r.description,
                    fileUrl: r.file_url,
                    fulfilled: r.fulfilled
                }))
            };

            return actDetails;
        },
        enabled: !!actId,
    });

    // Real-time subscription for this specific act
    useEffect(() => {
        if (!actId) return;

        const channel = supabase
            .channel(`act_detail_${actId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'acts',
                    filter: `id=eq.${actId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['act', actId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [actId, queryClient]);

    return query;
}
