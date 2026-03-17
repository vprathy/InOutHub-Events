import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, FileSpreadsheet, Loader2, Music } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ExternalProgramSubmission, SubmissionRosterUploadBatch } from '@/types/domain';
import { supabase } from '@/lib/supabase';
import { ImportParticipantsModal } from '@/components/participants/ImportParticipantsModal';
import {
    useApproveExternalProgramSubmission,
    useCreateExternalProgramSubmission,
    useExternalProgramSubmissions,
    useSubmissionRosterBatches,
    useUpdateExternalProgramSubmissionStatus,
} from '@/hooks/useExternalProgramSubmissions';

function getSubmissionTone(status: ExternalProgramSubmission['status']) {
    if (status === 'Approved') return 'bg-emerald-500/10 text-emerald-700';
    if (status === 'Waitlisted') return 'bg-amber-500/10 text-amber-700';
    if (status === 'Rejected') return 'bg-rose-500/10 text-rose-700';
    return 'bg-muted text-muted-foreground';
}

export default function ExternalProgramSubmissionsPage() {
    const { eventId, organizationId } = useSelection();
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [programName, setProgramName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [managerName, setManagerName] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [managerPhone, setManagerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isSyncBoardOpen, setIsSyncBoardOpen] = useState(false);
    const [approvalError, setApprovalError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const { data: submissions = [], isLoading } = useExternalProgramSubmissions(eventId || '');
    const createSubmission = useCreateExternalProgramSubmission(eventId || '');
    const approveSubmission = useApproveExternalProgramSubmission(eventId || '');
    const updateSubmissionStatus = useUpdateExternalProgramSubmissionStatus(eventId || '');

    const { data: currentEventRole } = useQuery({
        queryKey: ['current-event-role', eventId],
        queryFn: async () => {
            if (!eventId) return null;
            const { data, error } = await (supabase as any).rpc('auth_event_role', {
                p_event_id: eventId,
            });

            if (error) throw error;
            return data as string | null;
        },
        enabled: !!eventId,
    });
    const canManageSubmission = currentEventRole === 'EventAdmin';

    const selectedSubmission = useMemo(() => {
        if (!selectedSubmissionId) return submissions[0] || null;
        return submissions.find((submission: ExternalProgramSubmission) => submission.id === selectedSubmissionId) || submissions[0] || null;
    }, [selectedSubmissionId, submissions]);

    const { data: batches = [] } = useSubmissionRosterBatches(selectedSubmission?.id || null);

    const handleCreateSubmission = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!eventId || !programName.trim()) return;

        setCreateError(null);
        try {
            const created = await createSubmission.mutateAsync({
                organizationId,
                programName,
                teamName,
                managerName,
                managerEmail,
                managerPhone,
                notes,
            });

            setSelectedSubmissionId(created.id);
            setProgramName('');
            setTeamName('');
            setManagerName('');
            setManagerEmail('');
            setManagerPhone('');
            setNotes('');
        } catch (error) {
            setCreateError(error instanceof Error ? error.message : 'Submission create failed.');
        }
    };

    const handleApproveSubmission = async () => {
        if (!selectedSubmission) return;
        setApprovalError(null);

        if (!canManageSubmission) {
            setApprovalError('Approval requires EventAdmin access for the selected event.');
            return;
        }

        try {
            await approveSubmission.mutateAsync(selectedSubmission.id);
        } catch (error) {
            setApprovalError(error instanceof Error ? error.message : 'Approval failed.');
        }
    };

    const handleWaitlistToggle = async () => {
        if (!selectedSubmission) return;
        setApprovalError(null);

        if (!canManageSubmission) {
            setApprovalError('Waitlist updates require EventAdmin access for the selected event.');
            return;
        }

        try {
            await updateSubmissionStatus.mutateAsync({
                submissionId: selectedSubmission.id,
                status: selectedSubmission.status === 'Waitlisted' ? 'Submitted' : 'Waitlisted',
            });
        } catch (error) {
            setApprovalError(error instanceof Error ? error.message : 'Waitlist update failed.');
        }
    };

    if (!eventId) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-sm font-medium text-muted-foreground">Select an event to manage external submissions.</p>
            </div>
        );
    }

    if (currentEventRole !== 'EventAdmin') {
        return (
            <div className="mx-auto flex max-w-3xl flex-col space-y-4 pb-20">
                <PageHeader
                    title="External Program Intake"
                    subtitle="Admin-only surface for external team review and roster onboarding."
                    density="compact"
                />

                <Card className="p-5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-black tracking-tight text-foreground">Admin-only surface</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                External team approval and post-approval roster onboarding require EventAdmin access for this event.
                                Current access: <span className="font-bold text-foreground">{currentEventRole || 'No event role'}</span>.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-6xl flex-col space-y-4 pb-20">
            <PageHeader
                title="External Program Intake"
                subtitle="Admin-only workflow for submission review, waitlist handling, and post-approval roster onboarding."
                density="compact"
                status={
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        <span className="rounded-full bg-primary/5 px-3 py-1 text-primary">Off Main Nav</span>
                        <span className="rounded-full bg-muted px-3 py-1">Approve or Waitlist</span>
                        <span className="rounded-full bg-muted px-3 py-1">Add Roster</span>
                    </div>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="p-4">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">New External Submission</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Capture the external team or program first. Only approved submissions create a live performance.
                            </p>
                        </div>

                        <form className="space-y-3" onSubmit={handleCreateSubmission}>
                            <Input value={programName} onChange={(event) => setProgramName(event.target.value)} placeholder="Program name" required />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Team name (optional)" />
                                <Input value={managerName} onChange={(event) => setManagerName(event.target.value)} placeholder="Manager name (optional)" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} placeholder="Manager email (optional)" />
                                <Input value={managerPhone} onChange={(event) => setManagerPhone(event.target.value)} placeholder="Manager phone (optional)" />
                            </div>
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Notes for LT/admin review"
                                className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary"
                            />
                            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={createSubmission.isPending}>
                                {createSubmission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Submission
                            </Button>
                            {createError ? (
                                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">
                                    {createError}
                                </div>
                            ) : null}
                        </form>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">Submission Queue</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Submitted and waitlisted items stay outside the live performances list until they are approved.
                            </p>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-5 text-sm font-medium text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading submissions...
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                                No external submissions yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {submissions.map((submission: ExternalProgramSubmission) => (
                                    <button
                                        key={submission.id}
                                        type="button"
                                        onClick={() => setSelectedSubmissionId(submission.id)}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedSubmission?.id === submission.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black tracking-tight text-foreground">{submission.programName}</p>
                                                <p className="mt-1 text-xs font-medium text-muted-foreground">
                                                    {submission.teamName || 'No team name'}{submission.managerName ? ` • ${submission.managerName}` : ''}
                                                </p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getSubmissionTone(submission.status)}`}>
                                                {submission.status}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {selectedSubmission ? (
                <Card className="p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">Selected Submission</span>
                                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getSubmissionTone(selectedSubmission.status)}`}>
                                    {selectedSubmission.status}
                                </span>
                            </div>

                            <div>
                                <h2 className="text-xl font-black tracking-tight text-foreground">{selectedSubmission.programName}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {selectedSubmission.teamName || 'No team name yet'}{selectedSubmission.managerEmail ? ` • ${selectedSubmission.managerEmail}` : ''}
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Submission State</p>
                                    <p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.status}</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Linked Performance</p>
                                    <p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.linkedAct ? selectedSubmission.linkedAct.name : 'Not created yet'}</p>
                                </div>
                            </div>

                            {selectedSubmission.linkedAct?.businessStatus ? (
                                <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Act Business Status</p>
                                    <p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.linkedAct.businessStatus}</p>
                                </div>
                            ) : null}

                            <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Business Flow</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
                                    <span className="rounded-full bg-muted px-3 py-1 text-foreground">Submit Program</span>
                                    <span className="rounded-full bg-muted px-3 py-1 text-foreground">Approve or Waitlist</span>
                                    <span className="rounded-full bg-muted px-3 py-1 text-foreground">Create Performance</span>
                                    <span className="rounded-full bg-muted px-3 py-1 text-foreground">Add Roster</span>
                                </div>
                                <p className="mt-3 text-xs font-medium text-muted-foreground">
                                    Submission review status stays separate from act business status. Approval sets the submission to <span className="font-bold text-foreground">Approved</span> and the linked act to <span className="font-bold text-foreground">Awaiting Roster</span>.
                                </p>
                            </div>

                            {!selectedSubmission.linkedAct ? (
                                <>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            className="h-11 w-full sm:w-auto"
                                            onClick={handleApproveSubmission}
                                            disabled={approveSubmission.isPending || updateSubmissionStatus.isPending || !canManageSubmission}
                                            title={canManageSubmission ? 'Approve program' : 'Approval requires EventAdmin access'}
                                        >
                                            {approveSubmission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            Approve Program
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-11 w-full sm:w-auto"
                                            onClick={handleWaitlistToggle}
                                            disabled={approveSubmission.isPending || updateSubmissionStatus.isPending || !canManageSubmission}
                                        >
                                            {updateSubmissionStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
                                            {selectedSubmission.status === 'Waitlisted' ? 'Move Back to Submitted' : 'Waitlist'}
                                        </Button>
                                    </div>
                                    {!canManageSubmission ? (
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Approval and waitlist updates are limited to EventAdmin for this event. Current access: {currentEventRole || 'No event role'}.
                                        </p>
                                    ) : null}
                                    {approvalError ? (
                                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">
                                            {approvalError}
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Approved Performance Linked</p>
                                            <p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.linkedAct.name}</p>
                                            <p className="mt-1 text-xs font-medium text-muted-foreground">
                                                The performance now exists in the common layer and starts with the business status Awaiting Roster.
                                            </p>
                                        </div>
                                        <Button asChild variant="outline" className="h-10 rounded-xl">
                                            <Link to={`/acts/${selectedSubmission.linkedAct.id}`}>
                                                Open
                                                <ExternalLink className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">Roster Onboarding</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Reuse the Sync Board pattern after approval to add the roster file or spreadsheet the customer already has. Approved external roster onboarding stages rows for later review instead of creating live participants now.
                                </p>
                            </div>

                            <Button
                                className="h-11 w-full sm:w-auto"
                                disabled={!selectedSubmission.linkedAct || selectedSubmission.status !== 'Approved'}
                                onClick={() => setIsSyncBoardOpen(true)}
                            >
                                Open Sync Board
                            </Button>
                            {!selectedSubmission.linkedAct || selectedSubmission.status !== 'Approved' ? (
                                <p className="text-xs font-medium text-muted-foreground">
                                    Approve the submission first. Only approved external teams can start roster onboarding.
                                </p>
                            ) : null}

                            {batches.length > 0 ? (
                                <div className="space-y-3">
                                    {batches.map((batch: SubmissionRosterUploadBatch) => (
                                        <div key={batch.id} className="rounded-2xl border border-border/60 bg-card p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-black tracking-tight text-foreground">{batch.fileName}</p>
                                                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                                                        Sync Board created this staging batch. Live participant promotion is deferred.
                                                    </p>
                                                </div>
                                                <FileSpreadsheet className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="mt-3 grid grid-cols-3 gap-2">
                                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Ready</p>
                                                    <p className="mt-1 text-lg font-black text-emerald-700">{batch.summaryReadyCount}</p>
                                                </div>
                                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Warnings</p>
                                                    <p className="mt-1 text-lg font-black text-amber-700">{batch.summaryWarningCount}</p>
                                                </div>
                                                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">Blocked</p>
                                                    <p className="mt-1 text-lg font-black text-rose-700">{batch.summaryBlockedCount}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                                    No roster upload batches attached yet.
                                </div>
                            )}

                            <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Path B still stages first</p>
                                        <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                                            Sync Board reuse in this slice creates upload batches and staging rows only. Operator-confirmed promotion into the live roster is intentionally deferred.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            ) : null}

            <Card className="p-4">
                <div className="flex items-start gap-3">
                    <Music className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                        <p className="text-sm font-bold text-foreground">Core surfaces remain clean</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Submitted and waitlisted items stay out of the live performances list. Acts and Performance Workspace only receive business-state signaling after approval.
                        </p>
                    </div>
                </div>
            </Card>

            <ImportParticipantsModal
                eventId={eventId}
                isOpen={isSyncBoardOpen}
                onClose={() => setIsSyncBoardOpen(false)}
                mode="external_submission"
                submissionId={selectedSubmission?.status === 'Approved' ? selectedSubmission.id : null}
                submissionLabel={selectedSubmission?.programName || null}
            />
        </div>
    );
}
