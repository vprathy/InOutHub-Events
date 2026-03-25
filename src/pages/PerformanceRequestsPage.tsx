import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    ClipboardList,
    Clock3,
    Loader2,
    Mail,
    MessageSquare,
    Music,
    Phone,
    ShieldCheck,
    Search,
    Sparkles,
    XCircle,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useEventSources } from '@/hooks/useEventSources';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useImportRuns } from '@/hooks/useParticipants';
import { reportClientError } from '@/lib/clientErrorReporting';
import { supabase } from '@/lib/supabase';
import {
    useConvertPerformanceRequest,
    usePerformanceRequestCounts,
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

function getLifecycleStage(requestStatus: string, conversionStatus: string) {
    if (conversionStatus === 'converted') return 'converted';
    if (requestStatus === 'rejected') return 'rejected';
    if (requestStatus === 'approved') return 'approved';
    return 'pending';
}

function stageLabel(stage: string) {
    if (stage === 'pending') return 'Pending';
    if (stage === 'approved') return 'Approved';
    if (stage === 'converted') return 'Converted';
    if (stage === 'rejected') return 'Rejected';
    return 'Imported';
}

function formatListDate(value: string | null | undefined) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function RequestDetailPanel({
    request,
    eventName,
    onCreatePerformance,
    onReject,
    onMoveBackToPending,
    onOpenPerformance,
    timeline,
    isWorking,
}: {
    request: any;
    eventName: string | null;
    onCreatePerformance: () => void;
    onReject: () => void;
    onMoveBackToPending: () => void;
    onOpenPerformance: () => void;
    timeline: ReturnType<typeof usePerformanceRequestTimeline>;
    isWorking: boolean;
}) {
    const primaryContact = request.leadName || request.leadEmail || 'Requestor not captured';
    const secondaryRequestLabel = request.performanceType ? `${request.title} • ${request.performanceType}` : request.title;
    const emailSubject = encodeURIComponent(`${eventName || 'InOutHub Event'} • ${request.title || 'Performance Request'}`);

    return (
        <div className="space-y-4">
            <div className="surface-panel rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Selected Request</p>
                        <h2 className="mt-1 truncate text-xl font-black tracking-tight text-foreground">{primaryContact}</h2>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{secondaryRequestLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {request.requestDate ? `Requested ${formatListDate(request.requestDate)}` : `Imported ${formatDateTime(request.createdAt)}`}
                            {request.sourceAnchor ? ` • Anchor ${request.sourceAnchor}` : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getRequestStatusTone(request.requestStatus)}`}>
                            {stageLabel(getLifecycleStage(request.requestStatus, request.conversionStatus))}
                        </span>
                        {request.conversionStatus !== 'not_started' ? (
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getConversionStatusTone(request.conversionStatus)}`}>
                                {formatActionLabel(request.conversionStatus)}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="mt-4 rounded-[1.1rem] border border-border/70 bg-background/70 p-3.5">
                    <div className="flex flex-wrap gap-2">
                        {request.leadPhone ? (
                            <a
                                href={`tel:${request.leadPhone}`}
                                className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-3.5 text-sm font-bold text-foreground"
                            >
                                <Phone className="mr-2 h-4 w-4 text-primary" />
                                Call
                            </a>
                        ) : null}
                        {request.leadPhone ? (
                            <a
                                href={`sms:${request.leadPhone}`}
                                className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-3.5 text-sm font-bold text-foreground"
                            >
                                <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                                Text
                            </a>
                        ) : null}
                        {request.leadEmail ? (
                            <a
                                href={`mailto:${request.leadEmail}?subject=${emailSubject}`}
                                className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-3.5 text-sm font-bold text-foreground"
                            >
                                <Mail className="mr-2 h-4 w-4 text-primary" />
                                Email
                            </a>
                        ) : null}
                    </div>
                    <p className="mt-3 text-sm font-black text-foreground">
                        {request.conversionStatus === 'converted'
                            ? 'This request is already live as a performance.'
                            : request.requestStatus === 'approved'
                                ? 'Create the performance now, or move it back to pending if approval was premature.'
                                : 'Create the performance now. Approval will be handled automatically as part of that step.'}
                    </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {request.conversionStatus !== 'converted' ? (
                        <Button
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onCreatePerformance}
                            disabled={isWorking}
                        >
                            <ArrowRight className="mr-1.5 h-4 w-4" />
                            Create Performance
                        </Button>
                    ) : null}
                    {request.requestStatus !== 'rejected' && request.conversionStatus !== 'converted' ? (
                        <Button
                            variant="outline"
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onReject}
                            disabled={isWorking}
                        >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Reject
                        </Button>
                    ) : null}
                    {request.requestStatus === 'approved' && request.conversionStatus !== 'converted' ? (
                        <Button
                            variant="outline"
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onMoveBackToPending}
                            disabled={isWorking}
                        >
                            Move Back to Pending
                        </Button>
                    ) : null}
                    {request.convertedActId ? (
                        <Button
                            variant="ghost"
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onOpenPerformance}
                        >
                            Open Performance
                        </Button>
                    ) : null}
                </div>

                <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Request Summary</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Performance</span>
                            <span className="max-w-[60%] text-right font-bold text-foreground">{request.title || 'Untitled request'}</span>
                        </div>
                        {request.performanceType ? (
                            <div className="flex items-start justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">Type</span>
                                <span className="max-w-[60%] text-right font-bold text-foreground">{request.performanceType}</span>
                            </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Requested</span>
                            <span className="max-w-[60%] text-right font-bold text-foreground">
                                {request.requestDate ? formatListDate(request.requestDate) : formatDateTime(request.createdAt)}
                            </span>
                        </div>
                        <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="max-w-[60%] text-right font-bold text-foreground">{request.durationEstimateMinutes} minutes</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Music</span>
                            <span className="max-w-[60%] text-right font-bold text-foreground">{request.musicSupplied ? 'Supplied' : 'Not supplied'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Roster</span>
                            <span className="max-w-[60%] text-right font-bold text-foreground">{request.rosterSupplied ? 'Supplied' : 'Not supplied'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <details className="surface-panel rounded-[1.5rem] p-4 group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                        <p className="mt-1 text-sm font-black text-foreground">Imported request notes</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-foreground/85">
                    {request.notes || 'No intake notes were provided with this request.'}
                </div>
            </details>

            <details className="surface-panel rounded-[1.5rem] p-4 group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Imported Intake</p>
                        <p className="mt-1 text-sm font-black text-foreground">What we understood from the source</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-4 space-y-3 rounded-[1.2rem] border border-border/70 bg-background/70 p-4 text-sm">
                    {(request.importInsights || []).map((insight: any) => (
                        <div key={`${insight.label}-${insight.sourceKey || insight.value}`} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <span className="text-muted-foreground">{insight.label}</span>
                                {insight.sourceKey ? (
                                    <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        Source: {insight.sourceKey}
                                    </p>
                                ) : null}
                            </div>
                            <span className="max-w-[60%] text-right font-bold text-foreground">{insight.value}</span>
                        </div>
                    ))}
                </div>
            </details>

            <details className="surface-panel rounded-[1.5rem] p-4 group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                        <p className="mt-1 text-sm font-black text-foreground">Status and audit history</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-open:rotate-90" />
                </summary>
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
            </details>
        </div>
    );
}

export default function PerformanceRequestsPage() {
    const navigate = useNavigate();
    const { organizationId, eventId } = useSelection();
    const { data: selectionNames } = useQuery({
        queryKey: ['selection-metadata', organizationId, eventId],
        queryFn: async () => {
            const { data: event } = await supabase.from('events').select('name').eq('id', eventId as string).single();
            return { eventName: event?.name || null };
        },
        enabled: !!eventId,
    });
    const eventName = selectionNames?.eventName || null;
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();
    const { data: requestCounts, isLoading: isLoadingRequestCounts } = usePerformanceRequestCounts(eventId || null);
    const { sources } = useEventSources(eventId || '');
    const { data: importRuns = [] } = useImportRuns(eventId || '');

    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [loadSupportCode, setLoadSupportCode] = useState<string | null>(null);
    const [actionSupportCode, setActionSupportCode] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSegment, setActiveSegment] = useState<'pending' | 'approved' | 'converted' | 'rejected' | 'all'>('pending');
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
    const pageSize = 25;
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const lastLoadErrorRef = useRef<string | null>(null);
    const lastActionErrorRef = useRef<string | null>(null);
    const detailRef = useRef<HTMLDivElement | null>(null);
    const pendingScrollRequestRef = useRef<string | null>(null);
    const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : false));
    const {
        data: requestPages,
        error,
        refetch,
        isLoading: isLoadingRequests,
        isFetchingNextPage,
        fetchNextPage,
    } = usePerformanceRequestsQuery({
        eventId: eventId || null,
        segment: activeSegment,
        searchTerm,
        pageSize,
    });
    const requests = useMemo(
        () => requestPages?.pages.flatMap((page) => page.requests) || [],
        [requestPages]
    );
    const totalFilteredCount = requestPages?.pages[0]?.totalCount || 0;

    const canOpenAdmin =
        isSuperAdmin
        || currentEventRole === 'EventAdmin'
        || currentOrgRole === 'Owner'
        || currentOrgRole === 'Admin';

    const selectedRequest = useMemo(
        () => requests.find((request) => request.id === selectedRequestId)
            || requests[0]
            || null,
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

    useEffect(() => {
        if (!selectedRequest?.id || pendingScrollRequestRef.current !== selectedRequest.id) return;
        if (!detailRef.current) return;
        if (isDesktop) {
            pendingScrollRequestRef.current = null;
            return;
        }

        window.setTimeout(() => {
            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            pendingScrollRequestRef.current = null;
        }, 120);
    }, [isDesktop, selectedRequest?.id]);

    useEffect(() => {
        const onResize = () => setIsDesktop(window.innerWidth >= 1280);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const timeline = usePerformanceRequestTimeline(selectedRequest?.id || null);
    const setStatus = useSetPerformanceRequestStatus(eventId || null, selectedRequest?.id || null);
    const convertRequest = useConvertPerformanceRequest(eventId || null, selectedRequest?.id || null);

    const stats = requestCounts || {
        total: 0,
        pending: 0,
        approved: 0,
        converted: 0,
        rejected: 0,
    };
    const performanceRequestSourceIds = useMemo(
        () => new Set(sources.filter((source) => source.config.intakeTarget === 'performance_requests').map((source) => source.id)),
        [sources]
    );
    const activeSyncRun = useMemo(
        () => importRuns.find((run: any) => run.status === 'running' && run.import_target === 'performance_requests' && run.event_source_id && performanceRequestSourceIds.has(run.event_source_id)),
        [importRuns, performanceRequestSourceIds]
    );

    const statusError = (setStatus.error as Error | null)?.message || (convertRequest.error as Error | null)?.message || null;
    const segmentOptions = [
        { key: 'pending', label: 'Pending', count: stats.pending },
        { key: 'approved', label: 'Approved', count: stats.approved },
        { key: 'converted', label: 'Converted', count: stats.converted },
        { key: 'rejected', label: 'Rejected', count: stats.rejected },
        { key: 'all', label: 'All', count: stats.total },
    ] as const;

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
                    requestCount: totalFilteredCount,
                },
            });
            setLoadSupportCode(result.supportCode);
        })();
    }, [currentEventRole, currentOrgRole, error, eventId, organizationId, totalFilteredCount]);

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

    if (isLoadingEventRole || isLoadingOrgRole || isLoadingSuperAdmin || isLoadingRequests || isLoadingRequestCounts) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canOpenAdmin) {
        return (
            <div className="space-y-5">
                <div className="surface-panel rounded-[1.35rem] border p-6">
                    <p className="text-sm font-semibold text-foreground">
                        This event context does not grant performance-request access.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Performance Requests is limited to event admins and organization admins.
                    </p>
                </div>
            </div>
        );
    }

    const handleStatusAction = async (action: 'review' | 'approve' | 'reject' | 'move_back_to_pending') => {
        await setStatus.mutateAsync({
            action,
            note:
                action === 'review'
                    ? 'Marked reviewed in Performance Requests workspace.'
                    : action === 'approve'
                        ? 'Approved for conversion into an operational performance.'
                        : action === 'move_back_to_pending'
                            ? 'Moved back to pending before conversion.'
                            : 'Rejected in Performance Requests workspace.',
        });
    };

    const handleMoveBackToPending = async () => {
        if (!selectedRequest) return;
        const confirmed = window.confirm('Move this request back to Pending? This will clear the approval state but keep the imported request data.');
        if (!confirmed) return;
        await handleStatusAction('move_back_to_pending');
    };

    const handleCreatePerformance = async () => {
        const actId = await convertRequest.mutateAsync();
        if (actId) {
            navigate(`/performances/${actId}`);
        }
    };

    const handleApproveAndCreatePerformance = async () => {
        if (!selectedRequest) return;
        if (selectedRequest.requestStatus !== 'approved') {
            await handleStatusAction('approve');
        }
        await handleCreatePerformance();
    };

    const openRequest = (requestId: string) => {
        pendingScrollRequestRef.current = requestId;
        setSelectedRequestId(requestId);
        if (!isDesktop) {
            setIsMobileDetailOpen(true);
        }
    };

    const toggleExpandedRequest = (requestId: string) => {
        setSelectedRequestId(requestId);
        setExpandedRequestId((current) => (current === requestId ? null : requestId));
    };

    return (
        <div className="space-y-5 pb-12">
            <div className="surface-panel rounded-[1.35rem] p-4">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Workflow</p>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {[
                            {
                                key: 'pending',
                                label: 'Pending',
                                count: stats.pending,
                                activeClasses: 'border-orange-500/20 bg-orange-500/8 text-orange-700',
                                idleClasses: 'border-orange-500/10 bg-orange-500/5 text-orange-700/85',
                            },
                            {
                                key: 'approved',
                                label: 'Approved',
                                count: stats.approved,
                                activeClasses: 'border-sky-500/20 bg-sky-500/8 text-sky-700',
                                idleClasses: 'border-sky-500/10 bg-sky-500/5 text-sky-700/85',
                            },
                            {
                                key: 'converted',
                                label: 'Converted',
                                count: stats.converted,
                                activeClasses: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-700',
                                idleClasses: 'border-emerald-500/10 bg-emerald-500/5 text-emerald-700/85',
                            },
                            {
                                key: 'rejected',
                                label: 'Rejected',
                                count: stats.rejected,
                                activeClasses: 'border-border bg-background text-foreground',
                                idleClasses: 'border-border/70 bg-background/75 text-muted-foreground',
                            },
                            {
                                key: 'all',
                                label: 'All',
                                count: stats.total,
                                activeClasses: 'border-primary/20 bg-primary/8 text-primary',
                                idleClasses: 'border-primary/10 bg-primary/5 text-primary/85',
                            },
                        ].map((item) => {
                            const isActive = activeSegment === item.key;

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`min-h-[56px] rounded-[0.95rem] border px-1.5 py-2 text-center transition-colors ${
                                        isActive ? `${item.activeClasses} shadow-[0_0_0_1px_rgba(20,184,166,0.10)]` : item.idleClasses
                                    }`}
                                    onClick={() => setActiveSegment(item.key as typeof activeSegment)}
                                >
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] sm:text-[10px]">
                                        {item.label}
                                    </span>
                                    <span className="mt-1 block text-lg font-black leading-none text-foreground sm:text-xl">
                                        {item.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Work the <span className="font-bold text-foreground">Pending</span> queue first. Approved requests are ready to convert. Converted ones are already live performances.
                    </p>
                </div>
            </div>

            {activeSyncRun ? (
                <div className="rounded-[1.1rem] border border-primary/20 bg-primary/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <div className="min-w-0">
                            <p className="text-sm font-black text-foreground">Syncing source</p>
                            <p className="truncate text-sm text-muted-foreground">
                                {activeSyncRun.source_name} • Reading, matching, and saving request rows now.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

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
            ) : stats.total === 0 ? (
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
                        <div className="space-y-3">
                            <div className="grid gap-2">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Search by request title or requestor"
                                        className="min-h-11 rounded-xl pl-9 text-sm"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Showing <span className="font-bold text-foreground">{segmentOptions.find((segment) => segment.key === activeSegment)?.label || 'Pending'}</span> requests.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            {requests.map((request) => {
                                const isSelected = request.id === selectedRequest?.id;
                                const isExpanded = expandedRequestId === request.id;
                                const lifecycle = stageLabel(getLifecycleStage(request.requestStatus, request.conversionStatus));
                                const primaryName = request.leadName || request.leadEmail || 'Requestor not captured';
                                const titleLabel = request.title || 'Untitled request';
                                const displayDate = formatListDate(request.requestDate) || formatListDate(request.createdAt) || 'Imported';
                                const emailSubject = encodeURIComponent(`${eventName || 'InOutHub Event'} • ${titleLabel}`);

                                return (
                                    <button
                                        key={request.id}
                                        type="button"
                                        className={`w-full rounded-[0.95rem] border px-2.5 py-2 text-left transition-colors ${
                                            isSelected ? 'border-primary/30 bg-primary/5 shadow-[0_0_0_1px_rgba(20,184,166,0.12)]' : 'border-border/70 bg-background/75'
                                        }`}
                                        onClick={() => toggleExpandedRequest(request.id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="min-w-0 flex-1 truncate text-[15px] font-black text-foreground">{primaryName}</p>
                                                    {request.performanceType ? (
                                                        <span className="shrink-0 truncate text-[12px] font-semibold text-primary">
                                                            {request.performanceType}
                                                        </span>
                                                    ) : null}
                                                    <span className="shrink-0 text-[12px] font-semibold text-muted-foreground">
                                                        {request.durationEstimateMinutes}m
                                                    </span>
                                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${getRequestStatusTone(request.requestStatus)}`}>
                                                        {lifecycle}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-3">
                                                    <p className="min-w-0 truncate text-[12px] text-muted-foreground">
                                                        {titleLabel} • {displayDate}
                                                    </p>
                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        {request.leadPhone ? (
                                                            <a
                                                                href={`tel:${request.leadPhone}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/70 bg-background/85 text-foreground transition-colors hover:border-primary/20 hover:bg-background"
                                                                aria-label={`Call ${primaryName}`}
                                                                title="Call requestor"
                                                            >
                                                                <Phone className="h-4 w-4 text-primary" />
                                                            </a>
                                                        ) : null}
                                                        {request.leadPhone ? (
                                                            <a
                                                                href={`sms:${request.leadPhone}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/70 bg-background/85 text-foreground transition-colors hover:border-primary/20 hover:bg-background"
                                                                aria-label={`Text ${primaryName}`}
                                                                title="Text requestor"
                                                            >
                                                                <MessageSquare className="h-4 w-4 text-primary" />
                                                            </a>
                                                        ) : null}
                                                        {request.leadEmail ? (
                                                            <a
                                                                href={`mailto:${request.leadEmail}?subject=${emailSubject}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/70 bg-background/85 text-foreground transition-colors hover:border-primary/20 hover:bg-background"
                                                                aria-label={`Email ${primaryName}`}
                                                                title="Email requestor"
                                                            >
                                                                <Mail className="h-4 w-4 text-primary" />
                                                            </a>
                                                        ) : null}
                                                        <div className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                                                            <ArrowRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <div className="mt-3 border-t border-border/70 pt-3" onClick={(event) => event.stopPropagation()}>
                                                <div className="flex flex-wrap gap-2">
                                                    {request.conversionStatus !== 'converted' ? (
                                                        <Button
                                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                            onClick={() => {
                                                                setSelectedRequestId(request.id);
                                                                void (request.requestStatus === 'approved'
                                                                    ? handleCreatePerformance()
                                                                    : handleApproveAndCreatePerformance());
                                                            }}
                                                            disabled={setStatus.isPending || convertRequest.isPending}
                                                        >
                                                            <ArrowRight className="mr-1.5 h-4 w-4" />
                                                            Create Performance
                                                        </Button>
                                                    ) : null}
                                                    {request.requestStatus !== 'rejected' && request.conversionStatus !== 'converted' ? (
                                                        <Button
                                                            variant="outline"
                                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                            onClick={() => void handleStatusAction('reject')}
                                                            disabled={setStatus.isPending || convertRequest.isPending}
                                                        >
                                                            <XCircle className="mr-1.5 h-4 w-4" />
                                                            Reject
                                                        </Button>
                                                    ) : null}
                                                    {request.requestStatus === 'approved' && request.conversionStatus !== 'converted' ? (
                                                        <Button
                                                            variant="outline"
                                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                            onClick={() => void handleMoveBackToPending()}
                                                            disabled={setStatus.isPending || convertRequest.isPending}
                                                        >
                                                            Move Back to Pending
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        variant="ghost"
                                                        className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                        onClick={() => openRequest(request.id)}
                                                    >
                                                        <ArrowRight className="mr-1.5 h-4 w-4" />
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </button>
                                );
                            })}
                            {totalFilteredCount === 0 ? (
                                <div className="rounded-[1.15rem] border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                                    No requests match this filter yet.
                                </div>
                            ) : null}
                            {totalFilteredCount > requests.length ? (
                                <Button
                                    variant="outline"
                                    className="mt-2 min-h-11 w-full rounded-xl text-[10px] font-black uppercase tracking-[0.16em]"
                                    onClick={() => void fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Loading More
                                        </>
                                    ) : (
                                        'Load 25 More'
                                    )}
                                </Button>
                            ) : null}
                            {totalFilteredCount > 0 ? (
                                <p className="px-1 text-xs text-muted-foreground">
                                    Showing {requests.length} of {totalFilteredCount} request{totalFilteredCount === 1 ? '' : 's'} in this view.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {isDesktop && selectedRequest ? (
                        <div ref={detailRef}>
                            <RequestDetailPanel
                                request={selectedRequest}
                                eventName={eventName || null}
                                onCreatePerformance={() => void (selectedRequest.requestStatus === 'approved' ? handleCreatePerformance() : handleApproveAndCreatePerformance())}
                                onReject={() => void handleStatusAction('reject')}
                                onMoveBackToPending={() => void handleMoveBackToPending()}
                                onOpenPerformance={() => navigate(`/performances/${selectedRequest.convertedActId}`)}
                                timeline={timeline}
                                isWorking={setStatus.isPending || convertRequest.isPending}
                            />
                        </div>
                    ) : (
                        <div className="hidden xl:block" />
                    )}
                </div>
            )}

            <Modal
                isOpen={!isDesktop && !!selectedRequest && isMobileDetailOpen}
                onClose={() => setIsMobileDetailOpen(false)}
                title={selectedRequest?.title || 'Request Detail'}
            >
                {selectedRequest ? (
                    <RequestDetailPanel
                        request={selectedRequest}
                        eventName={eventName || null}
                        onCreatePerformance={() => void (selectedRequest.requestStatus === 'approved' ? handleCreatePerformance() : handleApproveAndCreatePerformance())}
                        onReject={() => void handleStatusAction('reject')}
                        onMoveBackToPending={() => void handleMoveBackToPending()}
                        onOpenPerformance={() => navigate(`/performances/${selectedRequest.convertedActId}`)}
                        timeline={timeline}
                        isWorking={setStatus.isPending || convertRequest.isPending}
                    />
                ) : null}
            </Modal>
        </div>
    );
}
