import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { parseRosterFile } from '@/lib/intake/parseRosterFile';
import type { ExternalProgramSubmission, SubmissionRosterUploadBatch } from '@/types/domain';

function mapSubmission(row: any): ExternalProgramSubmission {
    return {
        id: row.id,
        eventId: row.event_id,
        organizationId: row.organization_id,
        programName: row.program_name,
        teamName: row.team_name,
        managerName: row.manager_name,
        managerEmail: row.manager_email,
        managerPhone: row.manager_phone,
        notes: row.notes,
        status: row.status,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
        linkedActId: row.linked_act_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        linkedAct: row.linked_act ? {
            id: row.linked_act.id,
            name: row.linked_act.name,
            arrivalStatus: row.linked_act.arrival_status,
            businessStatus: row.linked_act.business_status,
        } : null,
    };
}

function mapBatch(row: any): SubmissionRosterUploadBatch {
    return {
        id: row.id,
        submissionId: row.submission_id,
        eventId: row.event_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fileUrl: row.file_url,
        templateVersion: row.template_version,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
        summaryReadyCount: row.summary_ready_count || 0,
        summaryWarningCount: row.summary_warning_count || 0,
        summaryBlockedCount: row.summary_blocked_count || 0,
        promotionConfirmedAt: row.promotion_confirmed_at,
        promotionConfirmedBy: row.promotion_confirmed_by,
    };
}

export function useExternalProgramSubmissions(eventId: string) {
    return useQuery({
        queryKey: ['external-program-submissions', eventId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('external_program_submissions')
                .select(`
                    *,
                    linked_act:acts!external_program_submissions_linked_act_id_fkey(
                        id,
                        name,
                        arrival_status,
                        business_status
                    )
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapSubmission);
        },
        enabled: !!eventId,
    });
}

export function useCreateExternalProgramSubmission(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (submission: {
            organizationId?: string | null;
            programName: string;
            teamName?: string | null;
            managerName?: string | null;
            managerEmail?: string | null;
            managerPhone?: string | null;
            notes?: string | null;
        }) => {
            const { data, error } = await (supabase as any)
                .from('external_program_submissions')
                .insert({
                    event_id: eventId,
                    organization_id: submission.organizationId || null,
                    program_name: submission.programName.trim(),
                    team_name: submission.teamName?.trim() || null,
                    manager_name: submission.managerName?.trim() || null,
                    manager_email: submission.managerEmail?.trim() || null,
                    manager_phone: submission.managerPhone?.trim() || null,
                    notes: submission.notes?.trim() || null,
                    status: 'Submitted',
                })
                .select(`
                    *,
                    linked_act:acts!external_program_submissions_linked_act_id_fkey(
                        id,
                        name,
                        arrival_status,
                        business_status
                    )
                `)
                .single();

            if (error) throw error;
            return mapSubmission(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-program-submissions', eventId] });
        },
    });
}

export function useApproveExternalProgramSubmission(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (submissionId: string) => {
            const { data, error } = await (supabase as any).rpc('approve_external_program_submission', {
                p_submission_id: submissionId,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-program-submissions', eventId] });
            queryClient.invalidateQueries({ queryKey: ['acts', eventId] });
        },
    });
}

export function useUpdateExternalProgramSubmissionStatus(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ submissionId, status }: { submissionId: string; status: 'Submitted' | 'Waitlisted' | 'Rejected' }) => {
            const { data, error } = await (supabase as any)
                .from('external_program_submissions')
                .update({ status })
                .eq('id', submissionId)
                .select(`
                    *,
                    linked_act:acts!external_program_submissions_linked_act_id_fkey(
                        id,
                        name,
                        arrival_status,
                        business_status
                    )
                `)
                .single();

            if (error) throw error;
            return mapSubmission(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-program-submissions', eventId] });
        },
    });
}

export function useSubmissionRosterBatches(submissionId: string | null) {
    return useQuery({
        queryKey: ['submission-roster-batches', submissionId],
        queryFn: async () => {
            if (!submissionId) return [];

            const { data, error } = await (supabase as any)
                .from('submission_roster_upload_batches')
                .select('*')
                .eq('submission_id', submissionId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapBatch);
        },
        enabled: !!submissionId,
    });
}

export function useCreateSubmissionRosterBatch(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ submissionId, file }: { submissionId: string; file: File }) => {
            const parsed = await parseRosterFile(file);
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const { data: batch, error: batchError } = await (supabase as any)
                .from('submission_roster_upload_batches')
                .insert({
                    submission_id: submissionId,
                    event_id: eventId,
                    file_name: file.name,
                    file_type: parsed.fileType,
                    uploaded_by: user?.id || null,
                    summary_ready_count: parsed.summary.ready,
                    summary_warning_count: parsed.summary.warning,
                    summary_blocked_count: parsed.summary.blocked,
                })
                .select()
                .single();

            if (batchError) throw batchError;

            const rows = parsed.rows.map((row) => ({
                batch_id: batch.id,
                submission_id: submissionId,
                event_id: eventId,
                source_row_number: row.sourceRowNumber,
                raw_row: row.rawRow,
                mapped_first_name: row.mappedFirstName,
                mapped_last_name: row.mappedLastName,
                mapped_guardian_name: row.mappedGuardianName,
                mapped_guardian_phone: row.mappedGuardianPhone,
                mapped_notes: row.mappedNotes,
                review_status: row.reviewStatus,
                issue_codes: row.issueCodes,
                source_system: 'external_program_roster',
                source_instance: batch.id,
                source_anchor_type: 'uploaded_row',
                source_anchor_value: row.sourceAnchorValue,
            }));

            if (rows.length > 0) {
                const { error: rowsError } = await (supabase as any)
                    .from('submission_roster_staging_rows')
                    .insert(rows);

                if (rowsError) throw rowsError;
            }

            return mapBatch(batch);
        },
        onSuccess: (_batch, variables) => {
            queryClient.invalidateQueries({ queryKey: ['submission-roster-batches', variables.submissionId] });
        },
    });
}
