import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CheckCircle2,
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
    onApprove,
    onReject,
    onReview,
    onConvert,
    onOpenPerformance,
    timeline,
    isWorking,
}: {
    request: any;
    onApprove: () => void;
    onReject: () => void;
    onReview: () => void;
    onConvert: () => void;
    onOpenPerformance: () => void;
    timeline: ReturnType<typeof usePerformanceRequestTimeline>;
    isWorking: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="surface-panel rounded-[1.5rem] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Request</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">{request.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {request.leadName || request.leadEmail || 'Requestor not captured'}{request.sourceAnchor ? ` • Anchor ${request.sourceAnchor}` : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getRequestStatusTone(request.requestStatus)}`}>
                            {formatActionLabel(request.requestStatus)}
                        </span>
                        {request.conversionStatus !== 'not_started' ? (
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getConversionStatusTone(request.conversionStatus)}`}>
                                {formatActionLabel(request.conversionStatus)}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="mt-4 rounded-[1.1rem] border border-border/70 bg-background/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Next Step</p>
                    <p className="mt-1 text-sm font-black text-foreground">
                        {request.conversionStatus === 'converted'
                            ? 'This request is already live as a performance.'
                            : request.requestStatus === 'approved'
                                ? 'Convert this approved request into a performance.'
                                : request.requestStatus === 'reviewed'
                                    ? 'Approve this reviewed request when you are ready to create the performance.'
                                    : 'Review the imported details, then approve or reject this request.'}
                    </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    {request.requestStatus === 'pending' ? (
                        <Button
                            variant="outline"
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onReview}
                            disabled={isWorking}
                        >
                            <Clock3 className="mr-1.5 h-4 w-4" />
                            Mark Reviewed
                        </Button>
                    ) : null}
                    {request.requestStatus !== 'approved' ? (
                        <Button
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onApprove}
                            disabled={isWorking}
                        >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Approve
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
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={onConvert}
                            disabled={isWorking}
                        >
                            <ArrowRight className="mr-1.5 h-4 w-4" />
                            Convert to Performance
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

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Imported Intake</p>
                        <p className="mt-1 text-sm font-black text-foreground">What we understood from the source</p>
                        <div className="mt-3 space-y-3 text-sm">
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
                    </div>

                    <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Contact & Notes</p>
                        <p className="mt-1 text-sm font-black text-foreground">Use this before you convert</p>
                        <div className="mt-3 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {request.leadPhone ? (
                                    <a
                                        href={`tel:${request.leadPhone}`}
                                        className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-4 text-sm font-bold text-foreground"
                                    >
                                        <Phone className="mr-2 h-4 w-4 text-primary" />
                                        Call Lead
                                    </a>
                                ) : null}
                                {request.leadPhone ? (
                                    <a
                                        href={`sms:${request.leadPhone}`}
                                        className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-4 text-sm font-bold text-foreground"
                                    >
                                        <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                                        Text Lead
                                    </a>
                                ) : null}
                                {request.leadEmail ? (
                                    <a
                                        href={`mailto:${request.leadEmail}`}
                                        className="inline-flex min-h-11 items-center rounded-xl border border-border/70 bg-background px-4 text-sm font-bold text-foreground"
                                    >
                                        <Mail className="mr-2 h-4 w-4 text-primary" />
                                        Email Lead
                                    </a>
                                ) : null}
                            </div>
                            {!request.leadPhone && !request.leadEmail ? (
                                <p className="text-sm text-muted-foreground">
                                    No direct requestor contact was captured for this request.
                                </p>
                            ) : null}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                                <p className="mt-2 text-sm leading-6 text-foreground/85">
                                    {request.notes || 'No intake notes were provided with this request.'}
                                </p>
                            </div>
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
    );
}

export default function PerformanceRequestsPage() {
    const navigate = useNavigate();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();
    const { data: requests = [], error, refetch } = usePerformanceRequestsQuery(eventId || null);

    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [loadSupportCode, setLoadSupportCode] = useState<string | null>(null);
    const [actionSupportCode, setActionSupportCode] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSegment, setActiveSegment] = useState<'pending' | 'approved' | 'converted' | 'rejected' | 'all'>('pending');
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(25);
    const lastLoadErrorRef = useRef<string | null>(null);
    const lastActionErrorRef = useRef<string | null>(null);
    const detailRef = useRef<HTMLDivElement | null>(null);
    const pendingScrollRequestRef = useRef<string | null>(null);
    const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : false));

    const canOpenAdmin =
        isSuperAdmin
        || currentEventRole === 'EventAdmin'
        || currentOrgRole === 'Owner'
        || currentOrgRole === 'Admin';

    const segmentedRequests = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return requests.filter((request) => {
            const matchesSegment = activeSegment === 'all'
                ? true
                : activeSegment === 'converted'
                    ? request.conversionStatus === 'converted'
                    : activeSegment === 'approved'
                        ? request.requestStatus === 'approved' && request.conversionStatus !== 'converted'
                        : activeSegment === 'rejected'
                            ? request.requestStatus === 'rejected'
                            : request.requestStatus === 'pending' || request.requestStatus === 'reviewed';

            if (!matchesSegment) return false;
            if (!normalizedSearch) return true;

            return [
                request.title,
                request.leadName,
                request.leadEmail,
                request.leadPhone,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalizedSearch));
        });
    }, [activeSegment, requests, searchTerm]);

    const selectedRequest = useMemo(
        () => segmentedRequests.find((request) => request.id === selectedRequestId)
            || requests.find((request) => request.id === selectedRequestId)
            || segmentedRequests[0]
            || requests[0]
            || null,
        [requests, segmentedRequests, selectedRequestId]
    );
    const visibleRequests = useMemo(() => segmentedRequests.slice(0, visibleCount), [segmentedRequests, visibleCount]);

    useEffect(() => {
        setVisibleCount(25);
    }, [activeSegment, searchTerm]);

    useEffect(() => {
        if (!selectedRequestId && segmentedRequests[0]?.id) {
            setSelectedRequestId(segmentedRequests[0].id);
            return;
        }

        if (selectedRequestId && !requests.some((request) => request.id === selectedRequestId)) {
            setSelectedRequestId(segmentedRequests[0]?.id || requests[0]?.id || null);
        }
    }, [requests, segmentedRequests, selectedRequestId]);

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

    const stats = {
        total: requests.length,
        pending: requests.filter((request) => request.requestStatus === 'pending' || request.requestStatus === 'reviewed').length,
        approved: requests.filter((request) => request.requestStatus === 'approved' && request.conversionStatus !== 'converted').length,
        converted: requests.filter((request) => request.conversionStatus === 'converted').length,
        rejected: requests.filter((request) => request.requestStatus === 'rejected').length,
    };

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
                <div className="min-w-0">
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-[1.75rem]">
                        Performance Requests
                    </h1>
                    <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                        This intake workspace is limited to event admins, org admins, and super admins.
                    </p>
                </div>
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

    const openRequest = (requestId: string) => {
        pendingScrollRequestRef.current = requestId;
        setSelectedRequestId(requestId);
        if (!isDesktop) {
            setIsMobileDetailOpen(true);
        }
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
                            {visibleRequests.map((request) => {
                                const isSelected = request.id === selectedRequest?.id;
                                const lifecycle = stageLabel(getLifecycleStage(request.requestStatus, request.conversionStatus));
                                const primaryName = request.leadName || request.leadEmail || 'Requestor not captured';
                                const secondaryTitle = request.performanceType
                                    ? `${request.title || 'Untitled request'} • ${request.performanceType}`
                                    : request.title || 'Untitled request';
                                const displayDate = formatListDate(request.requestDate) || formatListDate(request.createdAt) || 'Imported';

                                return (
                                    <button
                                        key={request.id}
                                        type="button"
                                        className={`w-full rounded-[0.95rem] border px-2.5 py-2 text-left transition-colors ${
                                            isSelected ? 'border-primary/30 bg-primary/5 shadow-[0_0_0_1px_rgba(20,184,166,0.12)]' : 'border-border/70 bg-background/75'
                                        }`}
                                        onClick={() => openRequest(request.id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="min-w-0 flex-1 truncate text-[15px] font-black text-foreground">{primaryName}</p>
                                                    <span className="shrink-0 text-[12px] font-semibold text-muted-foreground">
                                                        {request.durationEstimateMinutes}m
                                                    </span>
                                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${getRequestStatusTone(request.requestStatus)}`}>
                                                        {lifecycle}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-3">
                                                    <p className="min-w-0 truncate text-[12px] text-muted-foreground">
                                                        {secondaryTitle} • {displayDate}
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
                                                                href={`mailto:${request.leadEmail}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/70 bg-background/85 text-foreground transition-colors hover:border-primary/20 hover:bg-background"
                                                                aria-label={`Email ${primaryName}`}
                                                                title="Email requestor"
                                                            >
                                                                <Mail className="h-4 w-4 text-primary" />
                                                            </a>
                                                        ) : null}
                                                        <div className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                                                            <ArrowRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            {segmentedRequests.length === 0 ? (
                                <div className="rounded-[1.15rem] border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                                    No requests match this filter yet.
                                </div>
                            ) : null}
                            {segmentedRequests.length > visibleRequests.length ? (
                                <Button
                                    variant="outline"
                                    className="mt-2 min-h-11 w-full rounded-xl text-[10px] font-black uppercase tracking-[0.16em]"
                                    onClick={() => setVisibleCount((count) => count + 25)}
                                >
                                    Load 25 More
                                </Button>
                            ) : null}
                            {segmentedRequests.length > 0 ? (
                                <p className="px-1 text-xs text-muted-foreground">
                                    Showing {visibleRequests.length} of {segmentedRequests.length} request{segmentedRequests.length === 1 ? '' : 's'} in this view.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {isDesktop && selectedRequest ? (
                        <div ref={detailRef}>
                            <RequestDetailPanel
                                request={selectedRequest}
                                onReview={() => void handleStatusAction('review')}
                                onApprove={() => void handleStatusAction('approve')}
                                onReject={() => void handleStatusAction('reject')}
                                onConvert={() => void handleConvert()}
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
                        onReview={() => void handleStatusAction('review')}
                        onApprove={() => void handleStatusAction('approve')}
                        onReject={() => void handleStatusAction('reject')}
                        onConvert={() => void handleConvert()}
                        onOpenPerformance={() => navigate(`/performances/${selectedRequest.convertedActId}`)}
                        timeline={timeline}
                        isWorking={setStatus.isPending || convertRequest.isPending}
                    />
                ) : null}
            </Modal>
        </div>
    );
}
