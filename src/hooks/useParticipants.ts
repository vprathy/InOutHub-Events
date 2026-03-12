import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Participant, ParticipantDetail } from '@/types/domain';

export function useParticipantsQuery(eventId: string) {
    return useQuery({
        queryKey: ['participants', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('participants')
                .select(`
                    *,
                    act_participants(count),
                    participant_assets(status)
                `)
                .eq('event_id', eventId)
                .order('last_name', { ascending: true });

            if (error) throw error;

            return (data as any[]).map((row): Participant => ({
                id: row.id,
                eventId: row.event_id,
                firstName: row.first_name,
                lastName: row.last_name,
                age: (row as any).age,
                isMinor: !!row.is_minor,
                guardianName: row.guardian_name,
                guardianPhone: row.guardian_phone,
                guardianRelationship: row.guardian_relationship,
                notes: row.notes,
                hasSpecialRequests: !!row.has_special_requests,
                specialRequestRaw: row.special_request_raw,
                sourceSystem: row.source_system,
                sourceInstance: row.source_instance,
                sourceAnchorType: row.source_anchor_type,
                sourceAnchorValue: row.source_anchor_value,
                sourceImportedAt: row.source_imported_at,
                sourceLastSeenAt: row.source_last_seen_at,
                status: (row.status || 'active') as Participant['status'],
                srcRaw: row.src_raw,
                // These will be populated by the extended select if available
                actCount: (row as any).act_participants?.[0]?.count || 0,
                assetStats: {
                    total: (row as any).participant_assets?.length || 0,
                    approved: (row as any).participant_assets?.filter((a: any) => a.status === 'approved').length || 0,
                    pending: (row as any).participant_assets?.filter((a: any) => a.status === 'pending_review' || a.status === 'uploaded').length || 0,
                    missing: (row as any).participant_assets?.filter((a: any) => a.status === 'rejected' || !a.status).length || 0
                }
            }));
        },
        enabled: !!eventId,
    });
}

import * as XLSX from 'xlsx';

export function useImportParticipants(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ file, sourceId }: { file: File, sourceId?: string }) => {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

            const participants = rows.map(rowObj => {
                const sourceInstance = sourceId || file.name;
                return {
                    event_id: eventId,
                    first_name: rowObj.FirstName || rowObj['First Name'] || rowObj['first_name'] || '',
                    last_name: rowObj.LastName || rowObj['Last Name'] || rowObj['last_name'] || '',
                    guardian_name: rowObj.Guardian || rowObj['Guardian Name'] || null,
                    guardian_phone: rowObj.Phone || rowObj['Guardian Phone'] || null,
                    notes: rowObj.Notes || null,
                    source_system: 'spreadsheet-upload',
                    source_instance: sourceInstance,
                    source_anchor_type: 'natural',
                    source_anchor_value: `${(rowObj.FirstName || '').toLowerCase()}:${(rowObj.LastName || '').toLowerCase()}`,
                    src_raw: rowObj
                };
            });

            const { error } = await supabase
                .from('participants')
                .upsert(participants, {
                    onConflict: 'event_id, source_system, source_instance, source_anchor_type, source_anchor_value'
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
        },
    });
}

export function useSyncGoogleSheet(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sheetId, dryRun = false }: { sheetId: string; dryRun?: boolean }) => {
            const { data, error } = await supabase.functions.invoke('import-participants', {
                body: { sheetId, eventId, dryRun }
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
        },
    });
}

export function useParticipantDetail(participantId: string) {
    return useQuery({
        queryKey: ['participant', participantId],
        queryFn: async (): Promise<ParticipantDetail> => {
            // 1. Fetch participant core record
            const { data: p, error: pError } = await supabase
                .from('participants')
                .select('*')
                .eq('id', participantId)
                .single();

            if (pError) throw pError;

            // 2. Fetch associated acts (to find act-level templates)
            const { data: actLinks, error: aError } = await supabase
                .from('act_participants')
                .select(`
                    id,
                    role,
                    act:acts (
                        id,
                        name,
                        arrival_status,
                        event_id
                    )
                `)
                .eq('participant_id', participantId);

            if (aError) throw aError;

            const actIds = (actLinks || []).map((link: any) => link.act.id);
            const eventId = p.event_id;

            // 3. Fetch Organization ID (required for org-level templates)
            const { data: eventData, error: eDataError } = await supabase
                .from('events')
                .select('organization_id')
                .eq('id', eventId)
                .single();

            if (eDataError) throw eDataError;
            const orgId = eventData.organization_id;

            // 4. Fetch ALL applicable Asset Templates (Org, Event, or Act scope)
            const { data: templates, error: tError } = await (supabase as any)
                .from('asset_templates')
                .select('*')
                .or(`org_id.eq.${orgId},event_id.eq.${eventId}${actIds.length > 0 ? `,act_id.in.(${actIds.join(',')})` : ''}`);

            if (tError) throw tError;

            // 5. Fetch fulfillment assets
            const { data: assets, error: assetError } = await (supabase as any)
                .from('participant_assets')
                .select('*')
                .eq('participant_id', participantId);

            if (assetError) throw assetError;

            // 6. Sibling Detection logic
            let siblings: any[] = [];
            if (p.guardian_phone || p.guardian_name) {
                let query = supabase
                    .from('participants')
                    .select('id, first_name, last_name, status')
                    .eq('event_id', eventId)
                    .neq('id', participantId);

                if (p.guardian_phone) {
                    query = query.eq('guardian_phone', p.guardian_phone);
                } else if (p.guardian_name) {
                    query = query.eq('guardian_name', p.guardian_name as string);
                }

                const { data: siblingData } = await query;
                siblings = siblingData || [];
            }

            // 7. Map Templated Assets (Template + Fulfillment record)
            const templatedAssets = (templates || []).map((template: any) => {
                const fulfillment = (assets || []).find((a: any) => a.template_id === template.id);
                return {
                    template: {
                        id: template.id,
                        orgId: template.org_id,
                        eventId: template.event_id,
                        actId: template.act_id,
                        name: template.name,
                        description: template.description,
                        isRequired: template.is_required,
                        createdAt: template.created_at
                    },
                    fulfillment: fulfillment ? {
                        id: fulfillment.id,
                        participantId: fulfillment.participant_id,
                        templateId: fulfillment.template_id,
                        name: fulfillment.name,
                        type: fulfillment.type,
                        fileUrl: fulfillment.file_url,
                        status: fulfillment.status,
                        reviewNotes: fulfillment.review_notes,
                        createdAt: fulfillment.created_at
                    } : null
                };
            });

            // 8. Fetch operational notes
            const { data: opNotes, error: noteError } = await (supabase as any)
                .from('participant_notes')
                .select('*')
                .eq('participant_id', participantId)
                .order('created_at', { ascending: false });

            if (noteError) throw noteError;

            // 9. Fetch audit logs (Accountability)
            const { data: logs, error: lError } = await (supabase as any)
                .from('audit_logs')
                .select('*')
                .eq('table_name', 'participants')
                .eq('record_id', participantId)
                .order('changed_at', { ascending: false })
                .limit(20);

            if (lError) throw lError;

            const mappedLogs = (logs || []).map((log: any) => {
                const diff: any = {};
                if (log.operation === 'UPDATE' && log.old_data && log.new_data) {
                    Object.keys(log.new_data).forEach(key => {
                        if (JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])) {
                            diff[key] = log.new_data[key];
                        }
                    });
                } else if (log.operation === 'INSERT') {
                    Object.keys(log.new_data || {}).forEach(key => diff[key] = log.new_data[key]);
                }
                return { ...log, diff };
            });

            return {
                id: p.id,
                eventId: p.event_id,
                firstName: p.first_name,
                lastName: p.last_name,
                age: (p as any).age,
                guardianName: p.guardian_name,
                guardianPhone: p.guardian_phone,
                notes: p.notes,
                hasSpecialRequests: !!p.has_special_requests,
                specialRequestRaw: p.special_request_raw,
                sourceSystem: p.source_system,
                sourceInstance: p.source_instance,
                sourceAnchorType: p.source_anchor_type,
                sourceAnchorValue: p.source_anchor_value,
                sourceImportedAt: p.source_imported_at,
                sourceLastSeenAt: p.source_last_seen_at,
                srcRaw: p.src_raw,
                status: (p.status || 'active') as Participant['status'],
                identityVerified: !!(p as any).identity_verified,
                identityNotes: (p as any).identity_notes,
                isMinor: !!p.is_minor,
                guardianRelationship: p.guardian_relationship,
                acts: (actLinks || []).map((link: any) => ({
                    id: link.act.id,
                    role: link.role,
                    name: link.act.name,
                    arrivalStatus: link.act.arrival_status
                })),
                assets: (assets || []).map((a: any) => ({
                    id: a.id,
                    participantId: a.participant_id,
                    templateId: a.template_id,
                    name: a.name,
                    type: a.type,
                    fileUrl: a.file_url,
                    status: a.status,
                    reviewNotes: a.review_notes,
                    createdAt: a.created_at
                })),
                templatedAssets,
                siblings: siblings.map(s => ({
                    id: s.id,
                    firstName: s.first_name,
                    lastName: s.last_name,
                    status: s.status
                })),
                operationalNotes: (opNotes || []).map((n: any) => ({
                    id: n.id,
                    participantId: n.participant_id,
                    authorId: n.author_id,
                    category: n.category,
                    content: n.content,
                    isResolved: n.is_resolved,
                    resolvedAt: n.resolved_at,
                    resolvedBy: n.resolved_by,
                    createdAt: n.created_at
                })),
                auditLogs: mappedLogs
            };
        },
        enabled: !!participantId,
    });
}

export function useUpdateParticipant(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates: Partial<Participant>) => {
            const dbUpdates: any = {};
            if (updates.firstName) dbUpdates.first_name = updates.firstName;
            if (updates.lastName) dbUpdates.last_name = updates.lastName;
            if (updates.guardianName !== undefined) dbUpdates.guardian_name = updates.guardianName;
            if (updates.guardianPhone !== undefined) dbUpdates.guardian_phone = updates.guardianPhone;
            if (updates.guardianRelationship !== undefined) dbUpdates.guardian_relationship = updates.guardianRelationship;
            if (updates.isMinor !== undefined) dbUpdates.is_minor = updates.isMinor;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

            const { data, error } = await supabase
                .from('participants')
                .update(dbUpdates)
                .eq('id', participantId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
            queryClient.invalidateQueries({ queryKey: ['participants', data.event_id] });
        },
        onError: (error) => {
            console.error('Update error:', error);
        }
    });
}

export function useAddParticipantNote(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ content, category = 'operational' }: { content: string; category?: 'internal' | 'special_request' | 'operational' }) => {
            const { data, error } = await (supabase as any)
                .from('participant_notes')
                .insert([{
                    participant_id: participantId,
                    content,
                    category,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}

export function useVerifyIdentity(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (verified: boolean = true) => {
            const { data, error } = await (supabase as any)
                .from('participants')
                .update({ identity_verified: verified })
                .eq('id', participantId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}

export function useAssignToAct(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ actId, role = 'Performer' }: { actId: string; role?: string }) => {
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
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}

export function useRemoveFromAct(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (actId: string) => {
            const { error } = await supabase
                .from('act_participants')
                .delete()
                .eq('participant_id', participantId)
                .eq('act_id', actId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}

export function useUpdateAssetStatus(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ assetId, status, reviewNotes }: { assetId: string; status: string; reviewNotes?: string }) => {
            const { data, error } = await (supabase as any)
                .from('participant_assets')
                .update({ status, review_notes: reviewNotes })
                .eq('id', assetId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}
export function useCreateAssetFulfillment(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templateId, status = 'approved', name = 'Manual Override', notes }: { templateId: string; status?: string; name?: string; notes?: string }) => {
            const { data, error } = await (supabase as any)
                .from('participant_assets')
                .insert([{
                    participant_id: participantId,
                    template_id: templateId,
                    status,
                    name,
                    review_notes: notes,
                    type: 'other' // Default for manual overrides
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}
