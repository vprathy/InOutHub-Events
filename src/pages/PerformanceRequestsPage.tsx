import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Loader2,
    Mail,
    Music,
    Phone,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    XCircle,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import {
    useConvertPerformanceRequest,
    usePerformanceRequestTimeline,
    usePerformanceRequestsQuery,
    useSetPerformanceRequestStatus,
} from '@/hooks/usePerformanceRequests';

function formatDateTime(value: string | null | undefined) {
    if (!value) return 'Pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function getRequestStatusTone(status: string) {
    if (status === 'approved') return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'rejected') return 'text-destructive bg-destructive/10 border-destructive/20';
    if (status === 'reviewed') return 'text-primary bg-primary/10 border-primary/20';
    return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
}

function getConversionStatusTone(status: string) {
    if (status === 'converted') return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'failed') return 'text-destructive bg-destructive/10 border-destructive/20';
    return 'text-muted-foreground bg-muted/60 border-border';
}

function formatActionLabel(action: string) {
    return action.replace(/_/g, ' ');
}

export default function PerformanceRequestsPage() {
    const navigate = useNavigate();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();
    const { data: requests = [], error, refetch, isFetching } = usePerformanceRequestsQuery(eventId || null);

    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const canOpenAdmin =
        isSuperAdmin
        || currentEventRole === 'EventAdmin'
        || currentOrgRole === 'Owner'
        || currentOrgRole === 'Admin';

    const selectedRequest = useMemo(
        () => requests.find((request) => request.id === selectedRequestId) || requests[0] || null,
        [requests, selectedRequestId]
    );

    useEffect(() => {
        if (!selectedRequestId && requests[0]?.id) {
            setSelectedRequestId(requests[0].id);
            return;
        }

        if (selectedRequestId && !requests.some((request) => request.id === selectedRequestId)) {
            setSelectedRequestId(requests[0]?.id || null);
        }
    }, [requests, selectedRequestId]);

    const timeline = usePerformanceRequestTimeline(selectedRequest?.id || null);
    const setStatus = useSetPerformanceRequestStatus(eventId || null, selectedRequest?.id || null);
    const convertRequest = useConvertPerformanceRequest(eventId || null, selectedRequest?.id || null);

    const stats = {
        total: requests.length,
        pending: requests.filter((request) => request.requestStatus === 'pending').length,
        approved: requests.filter((request) => request.requestStatus === 'approved').length,
        converted: requests.filter((request) => request.conversionStatus === 'converted').length,
    };

    const statusError = (setStatus.error as Error | null)?.message || (convertRequest.error as Error | null)?.message || null;

    if (isLoadingEventRole || isLoadingOrgRole || isLoadingSuperAdmin) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canOpenAdmin) {
        return (
            <div className="space-y-5">
                <PageHeader title="Performance Requests" subtitle="This intake workspace is limited to event admins, org admins, and super admins." />
                <div className="surface-panel rounded-[1.35rem] border p-6 text-sm text-muted-foreground">
                    This event context does not grant performance-request access.
                </div>
            </div>
        );
    }

    const handleStatusAction = async (action: 'review' | 'approve' | 'reject') => {
        await setStatus.mutateAsync({
            action,
            note:
                action === 'review'
                    ? 'Marked reviewed in Performance Requests workspace.'
                    : action === 'approve'
                        ? 'Approved for conversion into an operational performance.'
                        : 'Rejected in Performance Requests workspace.',
        });
    };

    const handleConvert = async () => {
        const actId = await convertRequest.mutateAsync();
        if (actId) {
            navigate(`/performances/${actId}`);
        }
    };

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Performance Requests"
                subtitle="Review imported external requests before they become operational performances."
            />

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                <div className="surface-panel rounded-[1.35rem] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Pending Review</p>
                    <p className="mt-2 text-2xl font-black text-foreground">{stats.pending}</p>
                </div>
                <div className="surface-panel rounded-[1.35rem] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Approved</p>
                    <p className="mt-2 text-2xl font-black text-foreground">{stats.approved}</p>
                </div>
                <div className="surface-panel rounded-[1.35rem] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Converted</p>
                    <p className="mt-2 text-2xl font-black text-foreground">{stats.converted}</p>
                </div>
                <div className="surface-panel rounded-[1.35rem] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Total Requests</p>
                    <p className="mt-2 text-2xl font-black text-foreground">{stats.total}</p>
                </div>
            </div>

            {statusError ? (
                <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {statusError}
                </div>
            ) : null}

            {error ? (
                <div className="surface-panel rounded-[1.35rem] border p-6 text-sm text-muted-foreground">
                    We couldn&apos;t load performance requests right now.
                    <Button variant="ghost" className="ml-2 min-h-11 px-0 text-sm font-bold text-primary" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : requests.length === 0 ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                    <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                        <EmptyState
                            title="No performance requests yet"
                            description="This workspace stages imported external requests for review, approval, rejection, and conversion into live performances."
                            icon={ClipboardList}
                            action={{
                                label: 'Open Import Data',
                                onClick: () => navigate('/admin/import-data'),
                            }}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Workflow</p>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl border border-border/70 bg-accent/15 p-3 text-primary">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-foreground">Request to Approval</p>
                                            <p className="text-sm text-muted-foreground">Review imported requests here before they enter operations.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl border border-border/70 bg-accent/15 p-3 text-primary">
                                            <Music className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-foreground">Approval to Operations</p>
                                            <p className="text-sm text-muted-foreground">Approved requests convert into real performances and then move into readiness, lineup, and console.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Coming Next</p>
                            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl border border-border/70 bg-accent/15 p-3 text-primary">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-foreground">Structured request import</p>
                                        <p className="text-sm text-muted-foreground">
                                            The next intake batch should map request rows directly into this lane instead of stopping at target detection.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
                    <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Queue</p>
                                <p className="mt-1 text-sm text-muted-foreground">{requests.length} imported request{requests.length === 1 ? '' : 's'}</p>
                            </div>
                            <Button
                                variant="ghost"
                                className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                            {requests.map((request) => {
                                const isSelected = request.id === selectedRequest?.id;

                                return (
                                    <button
                                        key={request.id}
                                        type="button"
                                        onClick={() => setSelectedRequestId(request.id)}
                                        className={`w-full rounded-[1.2rem] border p-4 text-left transition-colors ${isSelected ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-background/75 hover:bg-accent/15'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-foreground">{request.title}</p>
                                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                                    {request.leadName || request.leadEmail || 'Lead contact not captured'}
                                                </p>
                                            </div>
                                            <ArrowRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isSelected ? 'translate-x-0.5 text-primary' : ''}`} />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getRequestStatusTone(request.requestStatus)}`}>
                                                {formatActionLabel(request.requestStatus)}
                                            </span>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getConversionStatusTone(request.conversionStatus)}`}>
                                                {formatActionLabel(request.conversionStatus)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>{request.durationEstimateMinutes} min</span>
                                            <span>{request.musicSupplied ? 'Music supplied' : 'Music pending'}</span>
                                            <span>{formatDateTime(request.createdAt)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedRequest ? (
                        <div className="space-y-4">
                            <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Selected Request</p>
                                        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">{selectedRequest.title}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Imported {formatDateTime(selectedRequest.createdAt)}{selectedRequest.sourceAnchor ? ` • Anchor ${selectedRequest.sourceAnchor}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getRequestStatusTone(selectedRequest.requestStatus)}`}>
                                            {formatActionLabel(selectedRequest.requestStatus)}
                                        </span>
                                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getConversionStatusTone(selectedRequest.conversionStatus)}`}>
                                            {formatActionLabel(selectedRequest.conversionStatus)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {selectedRequest.requestStatus === 'pending' ? (
                                        <Button
                                            variant="outline"
                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => void handleStatusAction('review')}
                                            disabled={setStatus.isPending}
                                        >
                                            <Clock3 className="mr-1.5 h-4 w-4" />
                                            Mark Reviewed
                                        </Button>
                                    ) : null}
                                    {selectedRequest.requestStatus !== 'approved' ? (
                                        <Button
                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => void handleStatusAction('approve')}
                                            disabled={setStatus.isPending}
                                        >
                                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                            Approve
                                        </Button>
                                    ) : null}
                                    {selectedRequest.requestStatus !== 'rejected' && selectedRequest.conversionStatus !== 'converted' ? (
                                        <Button
                                            variant="outline"
                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => void handleStatusAction('reject')}
                                            disabled={setStatus.isPending}
                                        >
                                            <XCircle className="mr-1.5 h-4 w-4" />
                                            Reject
                                        </Button>
                                    ) : null}
                                    {selectedRequest.requestStatus === 'approved' && selectedRequest.conversionStatus !== 'converted' ? (
                                        <Button
                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => void handleConvert()}
                                            disabled={convertRequest.isPending}
                                        >
                                            {convertRequest.isPending ? (
                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowRight className="mr-1.5 h-4 w-4" />
                                            )}
                                            Convert to Performance
                                        </Button>
                                    ) : null}
                                    {selectedRequest.convertedActId ? (
                                        <Button
                                            variant="ghost"
                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => navigate(`/performances/${selectedRequest.convertedActId}`)}
                                        >
                                            Open Performance
                                        </Button>
                                    ) : null}
                                </div>

                                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                    <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Request Detail</p>
                                        <div className="mt-3 space-y-3 text-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground">Lead</span>
                                                <span className="text-right font-bold text-foreground">{selectedRequest.leadName || 'Not captured'}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground">Duration</span>
                                                <span className="text-right font-bold text-foreground">{selectedRequest.durationEstimateMinutes} minutes</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground">Music</span>
                                                <span className="text-right font-bold text-foreground">{selectedRequest.musicSupplied ? 'Supplied' : 'Not supplied'}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground">Roster</span>
                                                <span className="text-right font-bold text-foreground">{selectedRequest.rosterSupplied ? 'Supplied' : 'Not supplied'}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground">Reviewed</span>
                                                <span className="text-right font-bold text-foreground">{formatDateTime(selectedRequest.reviewedAt)}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground">Approved</span>
                                                <span className="text-right font-bold text-foreground">{formatDateTime(selectedRequest.approvedAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Contact</p>
                                        <div className="mt-3 space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedRequest.leadPhone ? (
                                                    <a
                                                        href={`tel:${selectedRequest.leadPhone}`}
                                                        className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-4 text-sm font-bold text-foreground"
                                                    >
                                                        <Phone className="mr-2 h-4 w-4 text-primary" />
                                                        Call Lead
                                                    </a>
                                                ) : null}
                                                {selectedRequest.leadEmail ? (
                                                    <a
                                                        href={`mailto:${selectedRequest.leadEmail}`}
                                                        className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-4 text-sm font-bold text-foreground"
                                                    >
                                                        <Mail className="mr-2 h-4 w-4 text-primary" />
                                                        Email Lead
                                                    </a>
                                                ) : null}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                                                <p className="mt-2 text-sm leading-6 text-foreground/85">
                                                    {selectedRequest.notes || 'No intake notes were provided with this request.'}
                                                </p>
                                            </div>
                                            {selectedRequest.convertedActId ? (
                                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Operational Result</p>
                                                    <Link
                                                        to={`/performances/${selectedRequest.convertedActId}`}
                                                        className="mt-2 inline-flex items-center text-sm font-black text-emerald-700"
                                                    >
                                                        {selectedRequest.convertedActName || 'Open converted performance'}
                                                        <ArrowRight className="ml-1.5 h-4 w-4" />
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                                {timeline.isLoading ? (
                                    <div className="mt-4 flex min-h-[8rem] items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : timeline.data && timeline.data.length > 0 ? (
                                    <div className="mt-4 space-y-3">
                                        {timeline.data.map((event) => (
                                            <div key={event.id} className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-sm font-black text-foreground">{formatActionLabel(event.action)}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDateTime(event.performedAt)}</p>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {event.actorName || event.actorEmail || 'System action'}
                                                </p>
                                                {event.note ? (
                                                    <p className="mt-3 text-sm leading-6 text-foreground/85">{event.note}</p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                                        No intake timeline events yet for this request.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
