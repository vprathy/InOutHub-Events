import {
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    ShieldAlert,
    FileCheck,
    ClipboardList,
    Star,
    MonitorPlay,
} from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useDashboardRadar } from '@/hooks/useDashboardRadar';
import { useImportRuns, useParticipantsQuery } from '@/hooks/useParticipants';
import { useActsQuery } from '@/hooks/useActs';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard, type OperationalTone } from '@/components/ui/OperationalCards';
import { fetchResolvedRequirementPolicies } from '@/lib/requirementPolicies';
import { isOperationalParticipantStatus } from '@/lib/participantStatus';
import { supabase } from '@/lib/supabase';
import { useStagesQuery } from '@/hooks/useStages';
import { useStageConsole } from '@/hooks/useStageConsole';
import { usePerformanceRequestCounts } from '@/hooks/usePerformanceRequests';

type DashboardPhase = 'pre_show' | 'show_day' | 'live';
type DashboardAudience = 'admin' | 'ops' | 'member';
const DASHBOARD_RETURN_FOCUS_KEY = 'dashboard:return-focus';
const DASHBOARD_STAGE_KEY = 'stage-console:selected-stage:';
const CATEGORY_INCREMENT = 8;

function getTodayKey() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function toDateKey(value?: string | null, endOfDay = false) {
    if (!value) return null;
    return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).getTime();
}

function trimRequestPreview(value?: string | null, maxLength = 88) {
    if (!value) return 'Special request details are available on the participant record.';
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getQueueItemCount(item: unknown) {
    if (item && typeof item === 'object' && 'count' in item && typeof (item as { count?: unknown }).count === 'number') {
        return (item as { count: number }).count;
    }
    return undefined;
}

function getDashboardStageStorageKey(eventId: string | null) {
    return eventId ? `${DASHBOARD_STAGE_KEY}${eventId}` : null;
}

function formatStageStatus(status: string | null | undefined) {
    if (!status) return 'Idle';
    if (status === 'Active') return 'Live';
    return status;
}

export default function DashboardPage() {
    const { eventId, organizationId } = useSelection();
    const navigate = useNavigate();
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [returnFocus, setReturnFocus] = useState<{ category: string; itemId?: string } | null>(null);
    const [visibleItemCounts, setVisibleItemCounts] = useState<Record<string, number>>({});
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const categorySentinels = useRef<Record<string, HTMLDivElement | null>>({});
    const categoryCardsRef = useRef<Array<{ key: string; items: Array<{ id: string }> }>>([]);
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false } = useIsSuperAdmin();

    const { data: radar, isLoading } = useDashboardRadar(eventId || '');
    const { data: participants = [] } = useParticipantsQuery(eventId || '');
    const { data: importRuns = [] } = useImportRuns(eventId || '');
    const { data: acts = [] } = useActsQuery(eventId || '');
    const { data: stages = [] } = useStagesQuery(eventId || '');
    const { data: requestCounts } = usePerformanceRequestCounts(eventId || null);
    const { data: eventTiming } = useQuery({
        queryKey: ['dashboard-event-timing', eventId],
        queryFn: async () => {
            if (!eventId) return null;
            const { data, error } = await supabase
                .from('events')
                .select('start_date, end_date')
                .eq('id', eventId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!eventId,
    });
    const { data: specialRequestItems = [] } = useQuery({
        queryKey: ['dashboard-special-requests', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            const { data, error } = await supabase
                .from('participants')
                .select(`
                    id,
                    first_name,
                    last_name,
                    created_at,
                    special_request_raw,
                    participant_notes(category, is_resolved)
                `)
                .eq('event_id', eventId)
                .eq('has_special_requests', true)
                .order('created_at', { ascending: true })
                .order('last_name', { ascending: true });

            if (error) throw error;

            return (data || [])
                .filter((participant: any) => {
                    const resolvedSpecialNotes = (participant.participant_notes || []).filter(
                        (note: any) => note.category === 'special_request' && note.is_resolved
                    );
                    return resolvedSpecialNotes.length === 0;
                })
                .map((participant: any) => ({
                    id: participant.id,
                    name: `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || 'Participant',
                    detail: trimRequestPreview(participant.special_request_raw),
                }));
        },
        enabled: !!eventId,
    });

    useEffect(() => {
        if (!stages || stages.length === 0) return;

        const storageKey = getDashboardStageStorageKey(eventId);
        const savedStageId = storageKey ? window.localStorage.getItem(storageKey) : null;
        const hasSavedStage = Boolean(savedStageId && stages.some((stage) => stage.id === savedStageId));

        if (!selectedStageId) {
            setSelectedStageId(hasSavedStage ? savedStageId! : stages[0].id);
            return;
        }

        if (!stages.some((stage) => stage.id === selectedStageId)) {
            setSelectedStageId(hasSavedStage ? savedStageId! : stages[0].id);
        }
    }, [eventId, stages, selectedStageId]);

    useEffect(() => {
        const storageKey = getDashboardStageStorageKey(eventId);
        if (!storageKey || !selectedStageId) return;
        window.localStorage.setItem(storageKey, selectedStageId);
    }, [eventId, selectedStageId]);

    const {
        stageState,
        current,
        next,
        upcoming,
        hasLineup,
        currentLineupPointerMissing,
        driftMinutes,
        isOvertime,
        overtimeMinutes,
    } = useStageConsole(selectedStageId);
    useEffect(() => {
        const raw = sessionStorage.getItem(DASHBOARD_RETURN_FOCUS_KEY);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as { category?: string; itemId?: string };
            if (parsed.category) {
                setReturnFocus({ category: parsed.category, itemId: parsed.itemId });
                setExpandedCategory(parsed.category);
            }
        } catch {
            sessionStorage.removeItem(DASHBOARD_RETURN_FOCUS_KEY);
        }
    }, []);

    useEffect(() => {
        if (!returnFocus) return;
        const target = returnFocus.itemId
            ? itemRefs.current[returnFocus.itemId]
            : categoryRefs.current[returnFocus.category];
        if (!target) return;

        window.setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sessionStorage.removeItem(DASHBOARD_RETURN_FOCUS_KEY);
            setReturnFocus(null);
        }, 60);
    }, [returnFocus, expandedCategory, specialRequestItems.length]);

    useEffect(() => {
        if (!expandedCategory) return;
        setVisibleItemCounts((current) =>
            current[expandedCategory] ? current : { ...current, [expandedCategory]: CATEGORY_INCREMENT }
        );
    }, [expandedCategory]);
    useEffect(() => {
        if (!expandedCategory) return;
        const sentinel = categorySentinels.current[expandedCategory];
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting) return;
                setVisibleItemCounts((current) => ({
                    ...current,
                    [expandedCategory]: Math.min(
                        (current[expandedCategory] || CATEGORY_INCREMENT) + CATEGORY_INCREMENT,
                        categoryCardsRef.current.find((category) => category.key === expandedCategory)?.items.length || CATEGORY_INCREMENT
                    ),
                }));
            },
            { root: null, rootMargin: '120px 0px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [expandedCategory]);

    const { data: participantRequirementPolicies = [] } = useQuery({
        queryKey: ['dashboard-participant-requirement-policies', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            return fetchResolvedRequirementPolicies(eventId, 'participant');
        },
        enabled: !!eventId,
    });
    if (!eventId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="p-4 rounded-3xl bg-primary/10 text-primary">
                    <LayoutDashboard className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-bold">Welcome to InOutHub</h1>
                <p className="text-muted-foreground max-w-xs">Please select an event to see your operations dashboard.</p>
                <button
                    onClick={() => navigate('/select-org')}
                    className="h-12 px-8 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                    Select Workspace
                </button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-20 bg-muted rounded-3xl w-1/3" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-28 bg-muted rounded-[1.5rem]" />
                ))}
            </div>
        </div>;
    }

    const todayKey = getTodayKey();
    const startKey = toDateKey(eventTiming?.start_date);
    const endKey = toDateKey(eventTiming?.end_date || eventTiming?.start_date, true);
    const isShowDay = startKey !== null && endKey !== null && todayKey >= startKey && todayKey <= endKey;
    const dashboardPhase: DashboardPhase = isShowDay
        ? (radar?.acts.arrived || 0) > 0 || (radar?.acts.ready || 0) > 0
            ? 'live'
            : 'show_day'
        : 'pre_show';

    const dashboardAudience: DashboardAudience =
        isSuperAdmin || currentOrgRole === 'Owner' || currentOrgRole === 'Admin' || currentEventRole === 'EventAdmin'
            ? 'admin'
            : currentEventRole === 'StageManager' || currentEventRole === 'ActAdmin'
                ? 'ops'
                : 'member';

    const hasIdentityCheckActive = participantRequirementPolicies.some((policy) => policy.code === 'identity_check');
    const operationalParticipants = participants.filter((participant) => isOperationalParticipantStatus(participant.status));
    const needPlacementItems = operationalParticipants
        .filter((participant) => !participant.actCount)
        .slice(0, 6)
        .map((participant) => ({
            id: participant.id,
            metricKey: 'needs_placement',
            label: `${participant.firstName} ${participant.lastName}`.trim(),
            detail: 'Still needs placement.',
            tone: 'info' as OperationalTone,
            onClick: () => navigate(`/participants/${participant.id}`),
        }));
    const approvalItems = operationalParticipants
        .filter((participant) => ((participant.assetStats?.missing || 0) + (participant.assetStats?.pending || 0)) > 0)
        .slice(0, 6)
        .map((participant) => ({
            id: participant.id,
            label: `${participant.firstName} ${participant.lastName}`.trim(),
            detail: `${(participant.assetStats?.missing || 0) + (participant.assetStats?.pending || 0)} approval item${((participant.assetStats?.missing || 0) + (participant.assetStats?.pending || 0)) > 1 ? 's' : ''} still pending.`,
            tone: 'warning' as OperationalTone,
            onClick: () => navigate(`/participants/${participant.id}`),
        }));
    const guardianGapItems = operationalParticipants
        .filter((participant) => participant.isMinor && (!participant.guardianName || !participant.guardianPhone))
        .slice(0, 6)
        .map((participant) => ({
            id: participant.id,
            metricKey: 'safety',
            label: `${participant.firstName} ${participant.lastName}`.trim(),
            detail: 'Guardian details still need follow-up.',
            tone: 'critical' as OperationalTone,
            onClick: () => navigate(`/participants/${participant.id}`),
        }));
    const blockedPerformanceItems = acts
        .filter((act) => act.readinessState === 'Blocked' || (act.openIssueCount || 0) > 0)
        .slice(0, 6)
        .map((act) => ({
            id: act.id,
            label: act.name,
            detail: 'Blocked issues need immediate follow-up.',
            tone: 'critical' as OperationalTone,
            onClick: () => navigate(`/performances/${act.id}`),
        }));
    const identityPendingItems = hasIdentityCheckActive
        ? operationalParticipants
            .filter((participant) => !participant.identityVerified)
            .slice(0, 6)
            .map((participant) => ({
                id: participant.id,
                label: `${participant.firstName} ${participant.lastName}`.trim(),
                detail: 'Identity review is still pending.',
                tone: 'default' as OperationalTone,
                onClick: () => navigate(`/participants/${participant.id}`),
            }))
        : [];
    const notArrivedItems = acts
        .filter((act) => act.arrivalStatus === 'Not Arrived')
        .slice(0, 6)
        .map((act) => ({
            id: act.id,
            metricKey: 'not_here',
            label: act.name,
            detail: 'Still not on site.',
            tone: 'warning' as OperationalTone,
            onClick: () => navigate(`/performances/${act.id}`),
        }));
    const atRiskActItems = acts
        .filter((act) => act.readinessState === 'At Risk')
        .slice(0, 6)
        .map((act) => ({
            id: act.id,
            label: act.name,
            detail: 'Readiness still needs attention.',
            tone: 'warning' as OperationalTone,
            onClick: () => navigate(`/performances/${act.id}`),
        }));
    const introReviewItems = acts
        .filter((act) => act.hasIntroRequirement && !act.hasApprovedIntro)
        .slice(0, 6)
        .map((act) => ({
            id: act.id,
            label: act.name,
            detail: 'Intro is still waiting for review.',
            tone: 'default' as OperationalTone,
            onClick: () => navigate(`/performances/${act.id}`),
        }));
    const urgentImportItems = importRuns
        .filter((run: any) => run.status === 'blocked' || run.status === 'failed')
        .slice(0, 4)
        .map((run: any) => ({
            id: run.id,
            label: run.source_name || (run.import_target === 'performance_requests' ? 'Performance Request Sync' : 'Participant Sync'),
            detail: run.error_message || 'Import needs attention before this source is trusted again.',
            tone: 'critical' as OperationalTone,
            onClick: () => navigate('/admin/import-data'),
        }));
    const pendingRequestCount = Number(requestCounts?.pending || 0);
    const intakeBacklogItems = pendingRequestCount > 0
        ? [{
            id: 'pending-performance-requests',
            label: 'Performance Requests',
            detail: `${pendingRequestCount} request${pendingRequestCount === 1 ? '' : 's'} still need review before they become live performances.`,
            count: pendingRequestCount,
            tone: dashboardPhase === 'pre_show' ? 'info' as OperationalTone : 'warning' as OperationalTone,
            onClick: () => navigate('/admin/performance-requests'),
        }]
        : [];
    const actsAtRiskCount = blockedPerformanceItems.length + atRiskActItems.length + (dashboardPhase === 'pre_show' ? 0 : notArrivedItems.length);
    const urgentAdminCount = urgentImportItems.length + (dashboardPhase === 'pre_show' ? 0 : pendingRequestCount);
    const metrics = [
        {
            key: 'guardian_gaps',
            label: 'Guardian Gaps',
            infoBody: 'Minor participants who still need guardian contact follow-up before readiness is reliable.',
            value: radar?.participants.minorsAtRisk || 0,
            icon: ShieldAlert,
            tone: (radar?.participants.minorsAtRisk || 0) > 0 ? 'critical' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/participants?filter=at_risk'),
        },
        {
            key: 'missing_requirements',
            label: 'Missing Requirements',
            infoBody: 'Participant requirements still missing or waiting for review.',
            value: (radar?.assets.pending || 0) + (radar?.assets.missing || 0),
            icon: FileCheck,
            tone: ((radar?.assets.pending || 0) + (radar?.assets.missing || 0)) > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/participants?filter=missing'),
        },
        {
            key: 'acts_at_risk',
            label: 'Acts At Risk',
            infoBody: 'Blocked, at-risk, or not-yet-arrived acts that could disrupt readiness or execution.',
            value: actsAtRiskCount,
            icon: Star,
            tone: actsAtRiskCount > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/performances'),
        },
        {
            key: 'admin_alerts',
            label: 'Admin Alerts',
            infoBody: 'Import failures or urgent intake backlog that need admin follow-through.',
            value: urgentAdminCount,
            icon: ClipboardList,
            tone: urgentAdminCount > 0 ? 'critical' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate(urgentImportItems.length > 0 ? '/admin/import-data' : '/admin/performance-requests'),
        },
    ].filter((metric) => dashboardAudience !== 'member' || metric.key !== 'admin_alerts');

    const openSpecialRequestProfile = (participantId: string) => {
        sessionStorage.setItem(
            DASHBOARD_RETURN_FOCUS_KEY,
            JSON.stringify({ category: 'special_requests', itemId: participantId })
        );
        navigate(`/participants/${participantId}`);
    };

    const categoryDefinitions = [
        {
            key: 'readiness_exceptions',
            label: 'Readiness Exceptions',
            tone: 'critical' as OperationalTone,
            summary: 'Blocking issues need immediate follow-up.',
            audience: ['admin', 'ops'] as DashboardAudience[],
            items: [
                ...guardianGapItems,
                ...blockedPerformanceItems,
                ...(dashboardPhase === 'pre_show' ? [] : notArrivedItems),
                ...atRiskActItems,
            ],
        },
        {
            key: 'missing_requirements',
            label: 'Missing Requirements',
            tone: 'warning' as OperationalTone,
            summary: 'Participant and act follow-up still needs work.',
            audience: ['admin', 'ops'] as DashboardAudience[],
            items: [
                ...needPlacementItems,
                ...approvalItems,
                ...introReviewItems,
                ...identityPendingItems,
            ],
        },
        {
            key: 'special_requests',
            label: 'Special Requests',
            tone: 'warning' as OperationalTone,
            summary: 'Special requests still need review.',
            audience: ['admin', 'ops'] as DashboardAudience[],
            items: specialRequestItems.map((item) => ({
                id: item.id,
                label: item.name,
                detail: item.detail,
                tone: 'warning' as OperationalTone,
                action: 'Open Participant',
                onClick: () => navigate(`/participants/${item.id}`),
                })),
        },
        {
            key: 'urgent_admin',
            label: 'Urgent Admin',
            tone: 'critical' as OperationalTone,
            summary: 'Imports or request intake need admin attention.',
            audience: ['admin'] as DashboardAudience[],
            items: [
                ...urgentImportItems,
                ...intakeBacklogItems,
            ],
        },
    ] as const;

    const categoryCards = categoryDefinitions
        .filter((category) => category.audience.includes(dashboardAudience))
        .map((category) => {
            const items = category.items.filter((item) => {
                const count = getQueueItemCount(item);
                return count !== undefined ? count > 0 : true;
            });
            return {
                ...category,
                items,
                count: category.key === 'special_requests'
                    ? radar?.needsResponse.specialRequestReview || 0
                    : items.some((item) => getQueueItemCount(item) !== undefined)
                        ? items.reduce((sum, item) => sum + (getQueueItemCount(item) || 0), 0)
                        : items.length,
                summary: category.summary,
            };
        })
        .filter((category) => category.count > 0);
    categoryCardsRef.current = categoryCards;
    const activeStage = stages.find((stage) => stage.id === selectedStageId) || stages[0] || null;
    const stagePulseToneClassName = currentLineupPointerMissing
        ? 'border-rose-500/20 bg-rose-500/5'
        : isOvertime
            ? 'border-amber-500/20 bg-amber-500/5'
            : stageState?.status === 'Active'
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-border/70 bg-background/70';
    const stagePulseSummary = currentLineupPointerMissing
        ? 'The live pointer drifted from the lineup and needs review.'
        : !activeStage
            ? 'Add or select a stage before relying on live stage status.'
            : !hasLineup
                ? 'No lineup is loaded for the selected stage yet.'
                : isOvertime
                    ? `Running over by ${overtimeMinutes} minute${overtimeMinutes === 1 ? '' : 's'}.`
                    : stageState?.status === 'Active' && driftMinutes > 0
                        ? `Running ${driftMinutes} minute${driftMinutes === 1 ? '' : 's'} past the scheduled start.`
                        : stageState?.status === 'Paused'
                            ? 'The live run is paused.'
                        : stageState?.status === 'Active'
                                ? 'Stage is live and moving.'
                                : 'Stage is ready to run when you start the console.';

    useEffect(() => {
        if (!categoryCards.length) return;
        if (expandedCategory && categoryCards.some((category) => category.key === expandedCategory)) return;
        setExpandedCategory(categoryCards[0].key);
    }, [categoryCards, expandedCategory]);

    return (
        <div className="space-y-5 pt-3 pb-12 sm:pt-4">
            <div className="surface-panel surface-section-dashboard rounded-[1.35rem] p-3">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Readiness Snapshot</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {metrics.map((metric) => (
                        <OperationalMetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            icon={metric.icon}
                            tone={metric.tone}
                            onClick={metric.onClick}
                            infoBody={metric.infoBody}
                            infoLabel={`About ${metric.label}`}
                        />
                    ))}
                </div>
            </div>

            <div className={`surface-panel rounded-[1.3rem] border p-3.5 ${stagePulseToneClassName}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current Stage Status</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="truncate text-sm font-black text-foreground">{activeStage?.name || 'No Stage Selected'}</p>
                            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/75">
                                {formatStageStatus(stageState?.status)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground/80">{stagePulseSummary}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/stage-console')}
                        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-3 text-primary"
                        aria-label="Open live console"
                    >
                        <MonitorPlay className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Now</p>
                        <p className="mt-1 truncate text-sm font-bold text-foreground">{current?.act.name || 'No act live yet'}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Next</p>
                        <p className="mt-1 truncate text-sm font-bold text-foreground">{next?.act.name || 'Nothing queued next'}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Then</p>
                        <p className="mt-1 truncate text-sm font-bold text-foreground">{upcoming?.act.name || 'Queue ends there'}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-0.5">
                <div className="space-y-0.5 px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Response Queue</h2>
                    <p className="truncate text-xs text-muted-foreground">Exceptions, follow-up, and urgent requests.</p>
                </div>
                {categoryCards.length > 0 ? (
                    <div className="space-y-2.5">
                        {categoryCards.map((category) => {
                            const isExpanded = expandedCategory === category.key;
                            const visibleItems = category.items.slice(0, visibleItemCounts[category.key] || CATEGORY_INCREMENT);
                            const hasMoreItems = category.items.length > visibleItems.length;
                            return (
                                <div
                                    key={category.key}
                                    ref={(node) => { categoryRefs.current[category.key] = node; }}
                                    className="surface-panel overflow-hidden rounded-[1.2rem] border px-3.5 py-3"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpandedCategory((current) => current === category.key ? null : category.key)}
                                        className="flex w-full items-start justify-between gap-3 text-left outline-none focus:outline-none focus-visible:outline-none"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-black text-foreground">
                                                    {category.label}
                                                </p>
                                                <span className="text-[11px] font-bold text-muted-foreground">
                                                    {category.count}
                                                </span>
                                            </div>
                                            <p className="truncate pr-1 text-xs text-muted-foreground">
                                                {category.summary}
                                            </p>
                                        </div>
                                        <div className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center self-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </button>

                                    {isExpanded ? (
                                        <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
                                            {category.key === 'special_requests' ? (
                                                visibleItems.map((item) => {
                                                    const participantId = (('id' in item ? item.id : '') || '') as string;
                                                    return (
                                                        <button
                                                            key={`${category.key}-${item.label}`}
                                                            ref={(node) => { itemRefs.current[participantId] = node; }}
                                                            type="button"
                                                            onClick={() => openSpecialRequestProfile(participantId)}
                                                            className="surface-panel relative w-full overflow-hidden rounded-[1.2rem] border px-3.5 py-3 text-left transition active:scale-[0.99]"
                                                        >
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="min-w-0 flex-1 truncate text-sm font-black text-foreground">
                                                                        {item.label}
                                                                    </p>
                                                                    <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-primary" />
                                                                </div>
                                                                <p className="truncate text-sm text-foreground/80">
                                                                    {item.detail}
                                                                </p>
                                                            </div>
                                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500" />
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                visibleItems.map((item) => (
                                                    <OperationalResponseCard
                                                        key={`${category.key}-${item.label}`}
                                                        label={item.label}
                                                        detail={item.detail}
                                                        count={getQueueItemCount(item)}
                                                        tone={item.tone}
                                                        onClick={item.onClick}
                                                    />
                                            ))
                                            )}
                                            {hasMoreItems ? (
                                                <div
                                                    ref={(node) => { categorySentinels.current[category.key] = node; }}
                                                    className="h-6"
                                                />
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <OperationalEmptyResponse
                        title="No Active Issues"
                        detail="Sense check roster, approvals, lineup, and readiness before relying on a clean board."
                    />
                )}
            </div>

        </div>
    );
}
