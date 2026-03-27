import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Participant, ParticipantDetail, OperationalContact } from '@/types/domain';
import { fetchResolvedRequirementPolicies, normalizeRequirementPolicyCode } from '@/lib/requirementPolicies';

function extractTaggedValue(notes: string | null | undefined, tag: string) {
    if (!notes) return null;
    const match = notes.match(new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`, 'i'));
    return match?.[1]?.trim() || null;
}

function extractParticipantEmail(row: any) {
    return (
        row.email ||
        row.src_raw?.email ||
        row.src_raw?.['email address'] ||
        row.src_raw?.['parent email'] ||
        row.src_raw?.['guardian email'] ||
        extractTaggedValue(row.notes, 'Email')
    ) || null;
}

function extractParticipantAge(row: any) {
    const rawAge = row.age ?? extractTaggedValue(row.notes, 'Age');
    if (rawAge === null || rawAge === undefined || rawAge === '') return null;
    const parsed = Number(rawAge);
    return Number.isFinite(parsed) ? parsed : null;
}

function resolveParticipantMinorStatus(row: any, age: number | null) {
    if (age !== null) return age < 18;
    return !!row.is_minor;
}

function mapRequirementAssignments(rows: any[] | null | undefined) {
    return (rows || []).map((assignment: any) => ({
        id: assignment.id,
        status: assignment.status,
        notes: assignment.notes,
        evidenceSummary: assignment.evidence_summary,
        policyCode: normalizeRequirementPolicyCode(assignment.policy?.code),
        policyLabel: assignment.policy?.label,
        inputType: assignment.policy?.input_type,
        reviewMode: assignment.policy?.review_mode,
        blockingLevel: assignment.policy?.blocking_level,
    }));
}

function getPolicyBackedAssetType(policy: { code?: string | null; category?: string | null; input_type?: string | null }) {
    if (policy.code === 'participant_waiver' || policy.category === 'waiver') return 'waiver';
    if (policy.code === 'participant_photo' || policy.category === 'media') return 'photo';
    if (policy.input_type === 'file_upload') return 'other';
    return null;
}

export function useImportRuns(eventId: string) {
    return useQuery({
        queryKey: ['import-runs', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('import_runs')
                .select(`
                    id,
                    status,
                    import_target,
                    import_method,
                    source_name,
                    source_instance,
                    stats,
                    blocking_issues,
                    error_message,
                    started_at,
                    completed_at,
                    initiated_by,
                    event_source_id
                `)
                .eq('event_id', eventId)
                .order('started_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        },
        enabled: !!eventId,
        refetchInterval: (query: any) => {
            // Poll faster if any run is in 'running' status
            const hasRunning = query.state.data?.some((run: any) => run.status === 'running');
            return hasRunning ? 5000 : 30000;
        },
    });
}

export function useParticipantsQuery(eventId: string) {
    return useQuery({
        queryKey: ['participants', eventId],
        queryFn: async () => {
            const activeRequirementPolicies = await fetchResolvedRequirementPolicies(eventId, 'participant');
            const { data, error } = await (supabase as any)
                .from('v_participants_hardened')
                .select(`
                    *,
                    act_participants(role),
                    participant_assets(id, template_id, name, status, type, file_url, review_notes, created_at),
                    participant_notes(category, is_resolved),
                    requirement_assignments(
                        id,
                        status,
                        notes,
                        evidence_summary,
                        policy:requirement_policies(code, label, input_type, review_mode, blocking_level)
                    )
                `)
                .eq('event_id', eventId)
                .order('last_name', { ascending: true });

            if (error) throw error;

            return (data as any[]).map((row): Participant => {
                const participantAssets = (row as any).participant_assets || [];
                const participantNotes = (row as any).participant_notes || [];
                const preferredPhoto =
                    participantAssets.find((asset: any) => asset.type === 'photo' && asset.status === 'approved' && asset.file_url) ||
                    participantAssets.find((asset: any) => asset.type === 'photo' && ['uploaded', 'pending_review'].includes(asset.status) && asset.file_url) ||
                    null;
                const openSpecialRequestCount = participantNotes.filter((note: any) => note.category === 'special_request' && !note.is_resolved).length || 0;
                const resolvedSpecialRequestCount = participantNotes.filter((note: any) => note.category === 'special_request' && note.is_resolved).length || 0;
                const assetStats = {
                    total: participantAssets.length || 0,
                    approved: participantAssets.filter((a: any) => a.status === 'approved').length || 0,
                    pending: participantAssets.filter((a: any) => a.status === 'pending_review' || a.status === 'uploaded').length || 0,
                    missing: participantAssets.filter((a: any) => a.status === 'rejected' || !a.status).length || 0,
                };
                const requirementAssignments = mapRequirementAssignments((row as any).requirement_assignments);
                const hasDocsBridge = assetStats.total > 0;
                const participantActLinks = ((row as any).act_participants || []) as Array<{ role?: string | null }>;
                const actRoleTypes = Array.from(new Set(participantActLinks.map((assignment) => assignment.role || 'Performer').filter(Boolean)));

                const age = extractParticipantAge(row);

                return {
                    id: row.id,
                    eventId: row.event_id,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    age,
                    email: extractParticipantEmail(row),
                    isMinor: resolveParticipantMinorStatus(row, age),
                    guardianName: row.guardian_name,
                    guardianPhone: row.guardian_phone,
                    guardianRelationship: row.guardian_relationship,
                    identityVerified: !!(row as any).identity_verified,
                    identityNotes: (row as any).identity_notes,
                    photoUrl: preferredPhoto?.file_url || null,
                    notes: row.notes,
                    hasSpecialRequests: !!row.has_special_requests,
                    specialRequestRaw: row.special_request_raw,
                    openSpecialRequestCount,
                    resolvedSpecialRequestCount,
                    sourceSystem: row.source_system,
                    sourceInstance: row.source_instance,
                    sourceAnchorType: row.source_anchor_type,
                    sourceAnchorValue: row.source_anchor_value,
                    sourceImportedAt: row.source_imported_at,
                    sourceLastSeenAt: row.source_last_seen_at,
                    status: (row.status || 'active') as Participant['status'],
                    srcRaw: row.src_raw,
                    actCount: participantActLinks.length,
                    actRoleTypes,
                    assetStats,
                    assets: participantAssets.map((asset: any) => ({
                        id: asset.id || `${row.id}-${asset.type}-${asset.file_url || asset.status || 'asset'}`,
                        participantId: row.id,
                        templateId: asset.template_id || null,
                        name: asset.type || 'asset',
                        type: asset.type || 'other',
                        fileUrl: asset.file_url || null,
                        status: asset.status || 'missing',
                        reviewNotes: asset.review_notes || null,
                        createdAt: asset.created_at || row.created_at || new Date().toISOString(),
                    })),
                    requirementAssignments: [
                        ...requirementAssignments,
                        ...(hasDocsBridge ? [{
                            id: `bridge-docs-${row.id}`,
                            status: assetStats.missing > 0
                                ? 'missing'
                                : assetStats.pending > 0
                                    ? 'pending_review'
                                    : assetStats.approved === assetStats.total
                                        ? 'approved'
                                        : 'missing',
                            notes: null,
                            evidenceSummary: assetStats,
                            policyCode: 'participant_docs_clear',
                            policyLabel: 'Approvals',
                            inputType: 'file_upload',
                            reviewMode: 'review_required',
                            blockingLevel: 'blocking',
                            source: 'bridge' as const,
                        }] : []),
                    ],
                    activeRequirementPolicies,
                };
            });
        },
        enabled: !!eventId,
    });
}

export function useImportParticipants(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            file,
            sourceId,
            savedMapping,
            intakeTarget = 'participants',
            mode = 'confirm_and_sync',
        }: {
            file: File;
            sourceId?: string;
            savedMapping?: Record<string, string | undefined>;
            intakeTarget?: 'participants' | 'performance_requests';
            mode?: 'profile_only' | 'confirm_and_sync';
        }) => {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;
            const headers = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
            const sourceInstance = sourceId || file.name;

            const { data: result, error } = await supabase.functions.invoke('import-participants', {
                body: {
                    eventId,
                    mode,
                    dryRun: mode === 'profile_only',
                    intakeTarget,
                    importMethod: 'spreadsheet_upload',
                    sourceName: file.name,
                    sourceId: sourceId || null,
                    sourceInstance,
                    headers,
                    rows,
                    savedMapping,
                }
            });

            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
            queryClient.invalidateQueries({ queryKey: ['performance-requests', eventId] });
            queryClient.invalidateQueries({ queryKey: ['import-runs', eventId] });
        },
    });
}

export function useSyncGoogleSheet(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sheetId,
            dryRun = false,
            savedMapping,
            intakeTarget = 'participants',
            mode,
        }: {
            sheetId: string;
            dryRun?: boolean;
            savedMapping?: Record<string, string | undefined>;
            intakeTarget?: 'participants' | 'performance_requests';
            mode?: 'profile_only' | 'confirm_and_sync';
        }) => {
            const { data, error } = await supabase.functions.invoke('import-participants', {
                body: {
                    sheetId,
                    eventId,
                    dryRun: mode ? mode === 'profile_only' : dryRun,
                    mode,
                    savedMapping,
                    intakeTarget,
                }
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
            queryClient.invalidateQueries({ queryKey: ['performance-requests', eventId] });
            queryClient.invalidateQueries({ queryKey: ['import-runs', eventId] });
        },
    });
}

export function useParticipantDetail(participantId: string) {
    return useQuery({
        queryKey: ['participant', participantId],
        queryFn: async (): Promise<ParticipantDetail> => {
            // 1. Fetch participant core record
            const { data: p, error: pError } = await (supabase as any)
                .from('v_participants_hardened')
                .select(`
                    *,
                    requirement_assignments(
                        id,
                        status,
                        notes,
                        evidence_summary,
                        policy:requirement_policies(code, label, input_type, review_mode, blocking_level)
                    )
                `)
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

            const actIds = (actLinks || [])
                .map((link: any) => link.act?.id)
                .filter(Boolean);
            const eventId = p.event_id;

            // 3. Fetch Organization ID (required for org-level templates)
            const { data: eventData, error: eDataError } = await supabase
                .from('events')
                .select('organization_id')
                .eq('id', eventId)
                .single();

            if (eDataError) throw eDataError;
            const orgId = eventData.organization_id;
            const activeRequirementPolicies = await fetchResolvedRequirementPolicies(eventId, 'participant');

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
            
            // 5b. Fetch operational contacts for each linked act (if any)
            let operationalContacts: OperationalContact[] = [];
            if (actIds.length > 0) {
                const contactPromises = actIds.map(id => 
                    (supabase as any).rpc('get_operational_contacts', { p_act_id: id })
                );
                const contactResults = await Promise.all(contactPromises);
                
                // Merge and deduplicate by email/phone
                const seen = new Set<string>();
                for (const result of contactResults) {
                    const contacts = (result as any).data;
                    const cError = (result as any).error;
                    if (cError) continue;
                    (contacts || []).forEach((c: any) => {
                        const key = `${c.contact_email}-${c.contact_phone}`;
                        if (!seen.has(key)) {
                            operationalContacts.push({
                                contactName: c.contact_name,
                                contactRole: c.contact_role,
                                contactEmail: c.contact_email,
                                contactPhone: c.contact_phone,
                                priority: c.priority
                            });
                            seen.add(key);
                        }
                    });
                }
                operationalContacts.sort((a, b) => a.priority - b.priority);
            }

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
                        assetType: template.asset_type,
                        targetLevel: template.target_level,
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
            const policyBackedTemplatedAssets = activeRequirementPolicies
                .filter((policy: any) => policy.input_type === 'file_upload')
                .filter((policy: any) => {
                    const assetType = getPolicyBackedAssetType(policy);
                    if (!assetType) return false;

                    const hasMatchingTemplate = (templates || []).some((template: any) => {
                        if (template.asset_type === assetType) return true;
                        return template.name?.toLowerCase() === policy.label?.toLowerCase();
                    });

                    return !hasMatchingTemplate;
                })
                .map((policy: any) => {
                    const assetType = getPolicyBackedAssetType(policy) || 'other';
                    const fulfillment = (assets || []).find((asset: any) => asset.template_id == null && asset.type === assetType);

                    return {
                        template: {
                            id: `policy-${policy.code}`,
                            orgId: policy.organization_id,
                            eventId: policy.event_id,
                            actId: null,
                            name: policy.label,
                            description: policy.description,
                            assetType,
                            targetLevel: 'participant',
                            isRequired: policy.is_required,
                            createdAt: policy.created_at,
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
                            createdAt: fulfillment.created_at,
                        } : null,
                    };
                });
            const mergedTemplatedAssets = [...templatedAssets, ...policyBackedTemplatedAssets];

            // 8. Fetch operational notes
            const { data: opNotes, error: noteError } = await (supabase as any)
                .from('participant_notes')
                .select('*')
                .eq('participant_id', participantId)
                .order('created_at', { ascending: false });

            if (noteError) throw noteError;
            
            // 8.5 Fetch audit logs (Accountability)
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
                            diff[key] = {
                                from: log.old_data[key],
                                to: log.new_data[key]
                            };
                        }
                    });
                } else if (log.operation === 'INSERT') {
                    Object.keys(log.new_data || {}).forEach(key => {
                        diff[key] = { to: log.new_data[key] };
                    });
                }
                return {
                    id: log.id,
                    operation: log.operation,
                    tableName: log.table_name,
                    recordId: log.record_id,
                    changedBy: log.changed_by,
                    changedAt: log.changed_at || log.created_at,
                    diff
                };
            });

            const requirementAssignments = [
                ...mapRequirementAssignments((p as any).requirement_assignments),
                ...mergedTemplatedAssets.map(({ template, fulfillment }: any) => ({
                    id: `bridge-template-${template.id}`,
                    status: fulfillment?.status === 'approved'
                        ? 'approved'
                        : fulfillment?.status === 'pending_review'
                            ? 'pending_review'
                            : fulfillment?.status === 'uploaded'
                                ? 'submitted'
                                : fulfillment?.status === 'rejected'
                                    ? 'rejected'
                                    : 'missing',
                    notes: fulfillment?.reviewNotes || template.description || null,
                    evidenceSummary: {
                        template_id: template.id,
                        fulfillment_id: fulfillment?.id || null,
                        asset_type: template.assetType,
                    },
                    policyCode: `template_${template.id}`,
                    policyLabel: template.name,
                    inputType: 'file_upload',
                    reviewMode: 'review_required',
                    blockingLevel: template.isRequired ? 'blocking' : 'warning',
                    source: 'bridge' as const,
                })),
            ];

            const age = extractParticipantAge(p);

            return {
                id: p.id,
                eventId: p.event_id,
                firstName: p.first_name,
                lastName: p.last_name,
                age,
                email: extractParticipantEmail(p),
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
                isMinor: resolveParticipantMinorStatus(p, age),
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
                templatedAssets: mergedTemplatedAssets,
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
                openSpecialRequestCount: (opNotes || []).filter((n: any) => n.category === 'special_request' && !n.is_resolved).length || 0,
                resolvedSpecialRequestCount: (opNotes || []).filter((n: any) => n.category === 'special_request' && n.is_resolved).length || 0,
                requirementAssignments,
                activeRequirementPolicies,
                auditLogs: mappedLogs,
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
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.identityVerified !== undefined) dbUpdates.identity_verified = updates.identityVerified;

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

export function useCreateParticipant(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (participant: {
            firstName: string;
            lastName: string;
            age?: number | null;
            isMinor?: boolean;
            guardianName?: string | null;
            guardianPhone?: string | null;
            guardianRelationship?: string | null;
            email?: string | null;
            notes?: string | null;
        }) => {
            const notesParts = [participant.notes?.trim() || null];
            if (participant.email?.trim()) {
                notesParts.push(`[Email: ${participant.email.trim()}]`);
            }
            const { data, error } = await (supabase as any)
                .from('participants')
                .insert([{
                    event_id: eventId,
                    first_name: participant.firstName.trim(),
                    last_name: participant.lastName.trim(),
                    age: participant.age ?? null,
                    is_minor: participant.isMinor ?? false,
                    guardian_name: participant.guardianName ?? null,
                    guardian_phone: participant.guardianPhone ?? null,
                    guardian_relationship: participant.guardianRelationship ?? null,
                    notes: notesParts.filter(Boolean).join(' ').trim() || null,
                    source_system: 'manual',
                    source_instance: 'mobile-ops',
                    source_anchor_type: 'manual_entry',
                    source_anchor_value: crypto.randomUUID(),
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
        },
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

export function useUploadParticipantAsset(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            file,
            templateId,
            type,
            name,
            reviewNotes,
            replaceAssetId,
        }: {
            file: File;
            templateId?: string | null;
            type: 'waiver' | 'photo' | 'intro_media' | 'other';
            name?: string;
            reviewNotes?: string | null;
            replaceAssetId?: string | null;
        }) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
            const filePath = `participants/${participantId}/${Date.now()}-${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from('participant-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('participant-assets')
                .getPublicUrl(filePath);

            if (replaceAssetId) {
                const { data, error } = await (supabase as any)
                    .from('participant_assets')
                    .update({
                        file_url: publicData.publicUrl,
                        name: name || file.name,
                        type,
                        status: 'uploaded',
                        review_notes: reviewNotes || null,
                    })
                    .eq('id', replaceAssetId)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }

            const { data, error } = await (supabase as any)
                .from('participant_assets')
                .insert([{
                    participant_id: participantId,
                    template_id: templateId || null,
                    file_url: publicData.publicUrl,
                    status: 'uploaded',
                    name: name || file.name,
                    review_notes: reviewNotes || null,
                    type,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
            queryClient.invalidateQueries({ queryKey: ['participants'] });
        }
    });
}

export function useUpdateParticipantStatus(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (status: 'active' | 'inactive' | 'withdrawn' | 'refunded' | 'missing_from_source') => {
            const { data, error } = await supabase
                .from('participants')
                .update({ status })
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
            console.error('Status update error:', error);
        }
    });
}

export function useResolveNote(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            const { data, error } = await (supabase as any)
                .from('participant_notes')
                .update({ is_resolved: true, resolved_at: new Date().toISOString() })
                .eq('id', noteId)
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

export function useDeleteAsset(participantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assetId: string) => {
            const { error } = await (supabase as any)
                .from('participant_assets')
                .delete()
                .eq('id', assetId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
        }
    });
}
