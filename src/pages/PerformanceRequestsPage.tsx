import { useEffect, useMemo, useRef, useState } from 'react';
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
import { OperationalMetricCard, OperationalResponseCard, type OperationalTone } from '@/components/ui/OperationalCards';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { reportClientError } from '@/lib/clientErrorReporting';
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

function getMetricTone(value: number, kind: 'pending' | 'approved' | 'converted' | 'total'): OperationalTone {
    if (kind === 'pending') return value > 0 ? 'warning' : 'good';
    if (kind === 'approved') return value > 0 ? 'info' : 'default';
    if (kind === 'converted') return value > 0 ? 'good' : 'default';
    return value > 0 ? 'default' : 'info';
}

export default function PerformanceRequestsPage() {
    const navigate = useNavigate();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();
    const { data: requests = [], error, refetch, isFetching } = usePerformanceRequestsQuery(eventId || null);

    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [loadSupportCode, setLoadSupportCode] = useState<string | null>(null);
    const [actionSupportCode, setActionSupportCode] = useState<string | null>(null);
    const lastLoadErrorRef = useRef<string | null>(null);
    const lastActionErrorRef = useRef<string | null>(null);

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

    const metricCards = [
        {
            label: 'Pending Review',
            value: stats.pending,
            icon: Clock3,
            tone: getMetricTone(stats.pending, 'pending'),
            infoBody: 'Counts imported requests that still need operator review before they can be approved or rejected.',
        },
        {
            label: 'Approved',
            value: stats.approved,
            icon: CheckCircle2,
            tone: getMetricTone(stats.approved, 'approved'),
            infoBody: 'Counts requests that have been approved and are ready for conversion into operational performances.',
        },
        {
            label: 'Converted',
            value: stats.converted,
            icon: Music,
            tone: getMetricTone(stats.converted, 'converted'),
            infoBody: 'Counts approved requests that have already been turned into live performance records.',
        },
        {
            label: 'Total Requests',
            value: stats.total,
            icon: ClipboardList,
            tone: getMetricTone(stats.total, 'total'),
            infoBody: 'Shows the full volume of staged performance requests currently in this event workspace.',
        },
    ] as const;

    const statusError = (setStatus.error as Error | null)?.message || (convertRequest.error as Error | null)?.message || null;

    useEffect(() => {
        if (!error || !eventId) return;
        const message = error instanceof Error ? error.message : 'Performance Requests failed to load';
        if (lastLoadErrorRef.current === message) return;
        lastLoadErrorRef.current = message;

        void (async () => {
            const result = await reportClientError({
                featureArea: 'performance_requests',
                message,
                error,
                organizationId: organizationId || null,
                eventId,
                orgRole: currentOrgRole || null,
                eventRole: currentEventRole || null,
                context: {
                    view: 'performance_requests_page',
                    requestCount: requests.length,
                },
            });
            setLoadSupportCode(result.supportCode);
        })();
    }, [currentEventRole, currentOrgRole, error, eventId, organizationId, requests.length]);

    useEffect(() => {
        if (!statusError || !eventId) return;
        if (lastActionErrorRef.current === statusError) return;
        lastActionErrorRef.current = statusError;

        void (async () => {
            const result = await reportClientError({
                featureArea: 'performance_requests',
                message: statusError,
                error: setStatus.error || convertRequest.error,
                organizationId: organizationId || null,
                eventId,
                orgRole: currentOrgRole || null,
                eventRole: currentEventRole || null,
                context: {
                    view: 'performance_requests_actions',
                    requestId: selectedRequest?.id || null,
                    requestStatus: selectedRequest?.requestStatus || null,
                    conversionStatus: selectedRequest?.conversionStatus || null,
                },
            });
            setActionSupportCode(result.supportCode);
        })();
    }, [
        convertRequest.error,
        currentEventRole,
        currentOrgRole,
        eventId,
        organizationId,
        selectedRequest?.conversionStatus,
        selectedRequest?.id,
        selectedRequest?.requestStatus,
        setStatus.error,
        statusError,
    ]);

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

            <div className="surface-panel rounded-[1.35rem] p-3">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Request Snapshot</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {metricCards.map((metric) => (
                        <OperationalMetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            icon={metric.icon}
                            tone={metric.tone}
                            infoBody={metric.infoBody}
                            infoLabel={`About ${metric.label}`}
                        />
                    ))}
                </div>
            </div>

            {statusError ? (
                <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {statusError}
                    {actionSupportCode ? (
                        <span className="block pt-1 text-xs font-semibold text-destructive">
                            Reference code: <span className="font-black tracking-[0.08em]">{actionSupportCode}</span>
                        </span>
                    ) : null}
                </div>
            ) : null}

            {error ? (
                <div className="space-y-2">
                    <div className="space-y-0.5 px-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Request Queue</h2>
                        <p className="truncate text-xs text-muted-foreground">Imported requests, admin actions, and conversion status.</p>
                    </div>
                    <div className="surface-panel rounded-[1.2rem] border px-4 py-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl border border-orange-500/15 bg-orange-500/10 p-3 text-orange-600">
                                <Clock3 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-foreground">Request workspace is temporarily unavailable</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Your connected import sources are still saved. Retry now, or return to Import Data and refresh the source before reviewing requests.
                                </p>
                                {loadSupportCode ? (
                                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                                        Reference code: <span className="font-black tracking-[0.08em] text-foreground">{loadSupportCode}</span>
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col gap-2">
                                <Button variant="ghost" className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => refetch()}>
                                    Retry
                                </Button>
                                <Button
                                    variant="outline"
                                    className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                                    onClick={() => navigate('/admin/import-data')}
                                >
                                    Import Data
                                </Button>
                            </div>
                        </div>
                    </div>
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
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Action</p>
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
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
                            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl border border-border/70 bg-accent/15 p-3 text-primary">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-foreground">Request intake model</p>
                                        <p className="text-sm text-muted-foreground">
                                            Imported requests stay staged here until an operator reviews, approves, rejects, or converts them into real performances.
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
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Action</p>
                                <p className="mt-1 text-sm font-black text-foreground">Request Queue</p>
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
                                    <div key={request.id} className="space-y-1.5">
                                        <OperationalResponseCard
                                            label={formatActionLabel(request.requestStatus)}
                                            count={request.durationEstimateMinutes}
                                            tone={
                                                request.requestStatus === 'approved'
                                                    ? 'good'
                                                    : request.requestStatus === 'rejected'
                                                        ? 'critical'
                                                        : request.requestStatus === 'reviewed'
                                                            ? 'info'
                                                            : 'warning'
                                            }
                                            detail={request.title}
                                            onClick={() => setSelectedRequestId(request.id)}
                                            className={isSelected ? 'border-primary/30 bg-primary/5' : ''}
                                        />
                                        <div className="flex flex-wrap items-center gap-2 px-1">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getConversionStatusTone(request.conversionStatus)}`}>
                                                {formatActionLabel(request.conversionStatus)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {request.leadName || request.leadEmail || 'Lead contact not captured'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDateTime(request.createdAt)}
                                            </span>
                                            {isSelected ? (
                                                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Selected</span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {selectedRequest ? (
                        <div className="space-y-4">
                            <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Action</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
                                        <p className="mt-1 text-sm font-black text-foreground">Request Detail</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
                                        <p className="mt-1 text-sm font-black text-foreground">Lead Contact</p>
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
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
                                <p className="mt-1 text-sm font-black text-foreground">Timeline</p>
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
