import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ActWithCounts, ArrivalStatus } from '@/types/domain';
import { useEffect } from 'react';
import { deriveActReadinessSummary } from '@/lib/actReadiness';
import { localInputToEventIso } from '@/lib/eventTime';

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
                    act_requirements(id, requirement_type, file_url, fulfilled),
                    requirement_assignments(
                        id,
                        status,
                        notes,
                        evidence_summary,
                        policy:requirement_policies(code, label, input_type, review_mode, blocking_level)
                    ),
                    act_readiness_practices(id, expected_for, venue_name, address, room_area, parking_note, special_instructions, contact_name, contact_phone, starts_at, ends_at, status, notes),
                    act_readiness_items(id, practice_id, category, title, notes, status, owner_user_id, owner_label, due_at, sort_order),
                    act_readiness_issues(id, practice_id, issue_type, title, details, severity, status, owner_user_id, owner_label, due_at, escalate_to_user_id, resolution_note)
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

                const introRequirement = (row.act_requirements || []).find((r: any) => r.requirement_type === 'IntroComposition');
                const requirementAssignments = (row.requirement_assignments || []).map((assignment: any) => ({
                    id: assignment.id,
                    status: assignment.status,
                    notes: assignment.notes,
                    evidenceSummary: assignment.evidence_summary,
                    policyCode: assignment.policy?.code,
                    policyLabel: assignment.policy?.label,
                    inputType: assignment.policy?.input_type,
                    reviewMode: assignment.policy?.review_mode,
                    blockingLevel: assignment.policy?.blocking_level,
                }));
                const practices = (row.act_readiness_practices || []).map((practice: any) => ({
                    id: practice.id,
                    actId: row.id,
                    expectedFor: practice.expected_for,
                    venueName: practice.venue_name,
                    address: practice.address,
                    roomArea: practice.room_area,
                    parkingNote: practice.parking_note,
                    specialInstructions: practice.special_instructions,
                    contactName: practice.contact_name,
                    contactPhone: practice.contact_phone,
                    startsAt: practice.starts_at,
                    endsAt: practice.ends_at,
                    status: practice.status,
                    notes: practice.notes,
                }));
                const readinessItems = (row.act_readiness_items || []).map((item: any) => ({
                    id: item.id,
                    actId: row.id,
                    practiceId: item.practice_id,
                    category: item.category,
                    title: item.title,
                    notes: item.notes,
                    status: item.status,
                    ownerUserId: item.owner_user_id,
                    ownerLabel: item.owner_label,
                    dueAt: item.due_at,
                    sortOrder: item.sort_order || 0,
                }));
                const readinessIssues = (row.act_readiness_issues || []).map((issue: any) => ({
                    id: issue.id,
                    actId: row.id,
                    practiceId: issue.practice_id,
                    issueType: issue.issue_type,
                    title: issue.title,
                    details: issue.details,
                    severity: issue.severity,
                    status: issue.status,
                    ownerUserId: issue.owner_user_id,
                    ownerLabel: issue.owner_label,
                    dueAt: issue.due_at,
                    escalateToUserId: issue.escalate_to_user_id,
                    resolutionNote: issue.resolution_note,
                }));
                const readinessSummary = deriveActReadinessSummary({
                    practices,
                    items: readinessItems,
                    issues: readinessIssues,
                    participantCount: actParticipants.length,
                    missingParticipantAssetCount: participantsWithPendingForms,
                    hasMusicTrack: (row.act_assets || []).some((a: any) =>
                        a.asset_type === 'Audio' || a.asset_name.toLowerCase().includes('music')
                    ),
                    hasIntroRequirement: Boolean(introRequirement),
                    hasApprovedIntro: Boolean(introRequirement?.fulfilled),
                });
                const hasMusicTrack = (row.act_assets || []).some((a: any) =>
                    a.asset_type === 'Audio' || a.asset_name.toLowerCase().includes('music')
                );

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
                    hasMusicTrack,
                    hasIntroRequirement: Boolean(introRequirement),
                    hasApprovedIntro: Boolean(introRequirement?.fulfilled),
                    requirementAssignments,
                    introBackgroundUrl: introRequirement?.file_url || (row.act_requirements || []).find((r: any) => r.requirement_type === 'Generative')?.file_url || null,
                    readinessState: readinessSummary.state,
                    nextPracticeStartsAt: readinessSummary.nextPractice?.startsAt || null,
                    nextPracticeStatus: readinessSummary.nextPractice?.status || null,
                    openIssueCount: readinessSummary.openIssueCount,
                    missingChecklistCount: readinessSummary.incompleteChecklistCount,
                };
            });
        },
        enabled: !!eventId,
    });

    // Real-time subscription
    useEffect(() => {
        if (!eventId) return;

        const invalidateActs = () => {
            queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        };

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
                invalidateActs
            )
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_participants',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'participant_assets',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'participants',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_assets',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_requirements',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'requirement_assignments',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_readiness_practices',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_readiness_items',
            }, invalidateActs)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_readiness_issues',
            }, invalidateActs)
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
                    act_requirements(id, requirement_type, description, file_url, fulfilled),
                    requirement_assignments(
                        id,
                        status,
                        notes,
                        evidence_summary,
                        policy:requirement_policies(code, label, input_type, review_mode, blocking_level)
                    ),
                    act_readiness_practices(id, expected_for, venue_name, address, room_area, parking_note, special_instructions, contact_name, contact_phone, starts_at, ends_at, status, notes),
                    act_readiness_items(id, practice_id, category, title, notes, status, owner_user_id, owner_label, due_at, sort_order),
                    act_readiness_issues(id, practice_id, issue_type, title, details, severity, status, owner_user_id, owner_label, due_at, escalate_to_user_id, resolution_note)
                `)
                .eq('id', actId)
                .single();

            if (error) throw error;

            const row = data as any;

            // Map to domain model
            const readinessPractices = (row.act_readiness_practices || []).map((practice: any) => ({
                id: practice.id,
                actId: row.id,
                expectedFor: practice.expected_for,
                venueName: practice.venue_name,
                address: practice.address,
                roomArea: practice.room_area,
                parkingNote: practice.parking_note,
                specialInstructions: practice.special_instructions,
                contactName: practice.contact_name,
                contactPhone: practice.contact_phone,
                startsAt: practice.starts_at,
                endsAt: practice.ends_at,
                status: practice.status,
                notes: practice.notes,
            }));
            const readinessItems = (row.act_readiness_items || []).map((item: any) => ({
                id: item.id,
                actId: row.id,
                practiceId: item.practice_id,
                category: item.category,
                title: item.title,
                notes: item.notes,
                status: item.status,
                ownerUserId: item.owner_user_id,
                ownerLabel: item.owner_label,
                dueAt: item.due_at,
                sortOrder: item.sort_order || 0,
            }));
            const readinessIssues = (row.act_readiness_issues || []).map((issue: any) => ({
                id: issue.id,
                actId: row.id,
                practiceId: issue.practice_id,
                issueType: issue.issue_type,
                title: issue.title,
                details: issue.details,
                severity: issue.severity,
                status: issue.status,
                ownerUserId: issue.owner_user_id,
                ownerLabel: issue.owner_label,
                dueAt: issue.due_at,
                escalateToUserId: issue.escalate_to_user_id,
                resolutionNote: issue.resolution_note,
            }));
            const requirementAssignments = (row.requirement_assignments || []).map((assignment: any) => ({
                id: assignment.id,
                status: assignment.status,
                notes: assignment.notes,
                evidenceSummary: assignment.evidence_summary,
                policyCode: assignment.policy?.code,
                policyLabel: assignment.policy?.label,
                inputType: assignment.policy?.input_type,
                reviewMode: assignment.policy?.review_mode,
                blockingLevel: assignment.policy?.blocking_level,
            }));
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
                })),
                requirementAssignments,
                readinessPractices,
                readinessItems,
                readinessIssues,
                readinessSummary: deriveActReadinessSummary({
                    practices: readinessPractices,
                    items: readinessItems,
                    issues: readinessIssues,
                    participantCount: (row.act_participants || []).length,
                    missingParticipantAssetCount: (row.act_participants || []).filter((ap: any) => {
                        const assets = ap.participant?.participant_assets || [];
                        if (assets.length === 0) return true;
                        return assets.some((asset: any) => asset.status !== 'approved');
                    }).length,
                    hasMusicTrack: (row.act_assets || []).some((asset: any) =>
                        asset.asset_type === 'Audio' || asset.asset_name?.toLowerCase().includes('music')
                    ),
                    hasIntroRequirement: (row.act_requirements || []).some((requirement: any) => requirement.requirement_type === 'IntroComposition'),
                    hasApprovedIntro: (row.act_requirements || []).some((requirement: any) =>
                        requirement.requirement_type === 'IntroComposition' && requirement.fulfilled
                    ),
                }),
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
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'act_requirements',
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['act', actId] });
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'requirement_assignments',
                filter: `act_id=eq.${actId}`,
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['act', actId] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [actId, queryClient]);

    return query;
}

export function useAddActReadinessPractice(actId: string, eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (practice: {
            expectedFor?: string | null;
            venueName: string;
            address?: string | null;
            roomArea?: string | null;
            parkingNote?: string | null;
            specialInstructions?: string | null;
            contactName?: string | null;
            contactPhone?: string | null;
            startsAt: string;
            endsAt?: string | null;
            status: 'planned' | 'confirmed' | 'changed' | 'cancelled';
            notes?: string | null;
        }) => {
            const { data, error } = await (supabase as any)
                .from('act_readiness_practices')
                .insert([{
                    act_id: actId,
                    expected_for: practice.expectedFor ?? null,
                    venue_name: practice.venueName,
                    address: practice.address ?? null,
                    room_area: practice.roomArea ?? null,
                    parking_note: practice.parkingNote ?? null,
                    special_instructions: practice.specialInstructions ?? null,
                    contact_name: practice.contactName ?? null,
                    contact_phone: practice.contactPhone ?? null,
                    starts_at: localInputToEventIso(practice.startsAt),
                    ends_at: localInputToEventIso(practice.endsAt) ?? null,
                    status: practice.status,
                    notes: practice.notes ?? null,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['act', actId] });
            if (eventId) queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        },
    });
}

export function useAddActReadinessItem(actId: string, eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: {
            practiceId?: string | null;
            category: 'costume' | 'prop' | 'music' | 'shoes' | 'printout' | 'prep_task' | 'other';
            title: string;
            notes?: string | null;
            status: 'needed' | 'in_progress' | 'ready' | 'missing';
            ownerLabel?: string | null;
            dueAt?: string | null;
        }) => {
            const { data, error } = await (supabase as any)
                .from('act_readiness_items')
                .insert([{
                    act_id: actId,
                    practice_id: item.practiceId ?? null,
                    category: item.category,
                    title: item.title,
                    notes: item.notes ?? null,
                    status: item.status,
                    owner_label: item.ownerLabel ?? null,
                    due_at: localInputToEventIso(item.dueAt) ?? null,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['act', actId] });
            if (eventId) queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        },
    });
}

export function useAddActReadinessIssue(actId: string, eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (issue: {
            practiceId?: string | null;
            issueType: 'participant_unavailable' | 'missing_costume' | 'missing_prop' | 'music_not_final' | 'intro_media_pending' | 'parent_coordination' | 'timing' | 'rehearsal_conflict' | 'lineup' | 'organizer_support' | 'other';
            title: string;
            details?: string | null;
            severity: 'low' | 'medium' | 'high';
            status: 'open' | 'watching' | 'blocked' | 'resolved';
            ownerLabel?: string | null;
            dueAt?: string | null;
            resolutionNote?: string | null;
        }) => {
            const { data, error } = await (supabase as any)
                .from('act_readiness_issues')
                .insert([{
                    act_id: actId,
                    practice_id: issue.practiceId ?? null,
                    issue_type: issue.issueType,
                    title: issue.title,
                    details: issue.details ?? null,
                    severity: issue.severity,
                    status: issue.status,
                    owner_label: issue.ownerLabel ?? null,
                    due_at: localInputToEventIso(issue.dueAt) ?? null,
                    resolution_note: issue.resolutionNote ?? null,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['act', actId] });
            if (eventId) queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        },
    });
}
export function useAddActAsset(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ actId, assetName, assetType, notes }: { actId: string; assetName: string; assetType: string; notes?: string }) => {
            const { data, error } = await supabase
                .from('act_assets')
                .insert([{
                    act_id: actId,
                    asset_name: assetName,
                    asset_type: assetType,
                    notes: notes
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
            queryClient.invalidateQueries({ queryKey: ['act'] });
        }
    });
}

export function useRemoveActAsset(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assetId: string) => {
            const { error } = await supabase
                .from('act_assets')
                .delete()
                .eq('id', assetId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
            queryClient.invalidateQueries({ queryKey: ['act'] });
        }
    });
}

export function useAddParticipantToAct(actId: string, eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ participantId, role = 'Performer' }: { participantId: string; role?: string }) => {
            const { data, error } = await supabase
                .from('act_participants')
                .insert([{
                    act_id: actId,
                    participant_id: participantId,
                    role
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['act', actId] });
            if (eventId) {
                queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
            }
        }
    });
}
