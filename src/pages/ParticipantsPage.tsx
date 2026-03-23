import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useParticipantsQuery } from '@/hooks/useParticipants';
import { useSelection } from '@/context/SelectionContext';
import { ImportParticipantsModal } from '@/components/participants/ImportParticipantsModal';
import { AddParticipantModal } from '@/components/participants/AddParticipantModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { OperationalMetricCard, type OperationalTone } from '@/components/ui/OperationalCards';
import {
    Users,
    Search,
    Loader2,
    Clock,
    AlertTriangle,
    ChevronDown,
    Plus,
    ChevronRight,
    Funnel,
    X,
    FileCheck,
    PhoneCall,
} from 'lucide-react';
import { isOperationalParticipantStatus } from '@/lib/participantStatus';
import { buildParticipantReadinessSummary } from '@/lib/requirementsPrototype';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';

function getParticipantInitials(participant: any) {
    const first = participant.firstName?.[0] || '';
    const last = participant.lastName?.[0] || '';
    return `${first}${last}`.trim().toUpperCase() || 'P';
}

function isParticipantPending(participant: any) {
    if (participant.openSpecialRequestCount) return true;
    if (!participant.actCount) return true;
    if (participant.isMinor && (!participant.guardianName || !participant.guardianPhone)) return true;
    if ((participant.assetStats?.pending || 0) + (participant.assetStats?.missing || 0) > 0) return true;
    return buildParticipantReadinessSummary(participant).status !== 'cleared';
}

const PARTICIPANT_PAGE_SIZE = 60;

export default function ParticipantsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { eventId } = useSelection();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'unassigned' | 'special' | 'ready' | 'no_phone' | 'at_risk'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'age' | 'readiness' | 'recent'>('name');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const listRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const [visibleCount, setVisibleCount] = useState(PARTICIPANT_PAGE_SIZE);
    const { data: participants, isLoading, error } = useParticipantsQuery(eventId || '');
    const capabilities = useEventCapabilities(eventId || null, null);
    const canManageSync = capabilities.canSyncParticipants;
    const canManageRoster = capabilities.canManageRoster;

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        const actionParam = searchParams.get('action');

        if (filterParam && ['all', 'missing', 'unassigned', 'special', 'ready', 'no_phone', 'at_risk'].includes(filterParam)) {
            setActiveFilter(filterParam as typeof activeFilter);
        }

        if (actionParam === 'import') {
            setIsImportModalOpen(true);
        }
    }, [searchParams]);
    const isActionsSheetOpen = searchParams.get('panel') === 'filters';
    const openActionsSheet = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('panel', 'filters');
        setSearchParams(nextParams, { replace: true });
    };

    const updateFilter = (nextFilter: typeof activeFilter) => {
        setActiveFilter(nextFilter);
        const nextParams = new URLSearchParams(searchParams);
        if (nextFilter === 'all') {
            nextParams.delete('filter');
        } else {
            nextParams.set('filter', nextFilter);
        }
        setSearchParams(nextParams, { replace: true });
    };

    const isParticipantReady = (participant: any) => buildParticipantReadinessSummary(participant).status === 'cleared';

    const getReadinessScore = (p: any) => {
        const summary = buildParticipantReadinessSummary(p);
        if (summary.status === 'cleared') return 1;
        if (summary.status === 'on_track') return 0.65;
        return p.actCount ? 0.35 : 0;
    };

    const operationalParticipants = useMemo(
        () => (participants || []).filter((participant) => isOperationalParticipantStatus(participant.status)),
        [participants]
    );
    const stats = {
        total: operationalParticipants.length || 0,
        assigned: operationalParticipants.filter(p => (p.actCount || 0) > 0).length || 0,
        ready: operationalParticipants.filter((participant) => isParticipantReady(participant)).length || 0,
        missing: operationalParticipants.filter(p => ((p.assetStats?.missing || 0) > 0) || ((p.assetStats?.pending || 0) > 0)).length || 0,
        unassigned: operationalParticipants.filter(p => !p.actCount).length || 0,
        special: operationalParticipants.filter(p => p.hasSpecialRequests).length || 0,
        atRisk: operationalParticipants.filter(p => p.isMinor && (!p.guardianName || !p.guardianPhone)).length || 0,
    };
    const filteredParticipants = participants?.filter(p => {
        const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(deferredSearchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter !== 'all' && !isOperationalParticipantStatus(p.status)) return false;
        if (activeFilter === 'missing') return ((p.assetStats?.missing || 0) > 0) || ((p.assetStats?.pending || 0) > 0);
        if (activeFilter === 'unassigned') return !p.actCount;
        if (activeFilter === 'special') return p.hasSpecialRequests;
        if (activeFilter === 'ready') return isParticipantReady(p);
        if (activeFilter === 'no_phone') return !p.guardianPhone;
        if (activeFilter === 'at_risk') return p.isMinor && (!p.guardianName || !p.guardianPhone);

        return true;
    }).sort((a, b) => {
        if (sortBy === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        if (sortBy === 'age') return (b.age || 0) - (a.age || 0);
        if (sortBy === 'readiness') return getReadinessScore(b) - getReadinessScore(a);
        if (sortBy === 'recent') return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        return 0;
    });
    const quickFilters = [
        { key: 'all' as const, label: 'All', count: stats.total, icon: null },
        { key: 'missing' as const, label: 'Files Waiting', count: stats.missing, icon: Clock },
        { key: 'unassigned' as const, label: 'Needs Placement', count: stats.unassigned, icon: Users },
        { key: 'special' as const, label: 'Special Requests', count: stats.special, icon: AlertTriangle },
        { key: 'at_risk' as const, label: 'Guardian Follow-Up', count: stats.atRisk, icon: AlertTriangle },
        { key: 'ready' as const, label: 'Ready', count: stats.ready, icon: null },
    ];
    const participantMetrics = [
        {
            key: 'unassigned',
            label: 'Need Placement',
            value: stats.unassigned,
            icon: Users,
            tone: stats.unassigned > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => updateFilter('unassigned'),
        },
        {
            key: 'missing',
            label: 'Files Waiting',
            value: stats.missing,
            icon: FileCheck,
            tone: stats.missing > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => updateFilter('missing'),
        },
    ];
    useEffect(() => {
        const root = listRef.current;
        const target = loadMoreRef.current;

        if (!root || !target || (filteredParticipants?.length || 0) <= visibleCount) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting) return;

                setVisibleCount((current) => Math.min(current + PARTICIPANT_PAGE_SIZE, filteredParticipants?.length || 0));
            },
            {
                root,
                rootMargin: '0px 0px 320px 0px',
                threshold: 0,
            }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [filteredParticipants?.length, visibleCount]);
    useEffect(() => {
        setVisibleCount(PARTICIPANT_PAGE_SIZE);
        if (listRef.current) {
            listRef.current.scrollTop = 0;
        }
    }, [activeFilter, sortBy, deferredSearchQuery, eventId]);
    const visibleParticipants = (filteredParticipants || []).slice(0, visibleCount);

    if (isLoading || !eventId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading participants...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-4 pb-24">
            {error ? (
                <EmptyState
                    title="Connection Error"
                    description="We couldn't load the participants. Please check your connection."
                    icon={Users}
                />
            ) : !participants || participants.length === 0 ? (
                <EmptyState
                    title="No Participants Found"
                    description="Sync your participant list from a Google Sheet or CSV to get started."
                    icon={Users}
                    action={{
                        label: canManageSync ? 'Import Participants' : 'Sync Requires Event Admin',
                        onClick: () => {
                            if (!canManageSync) return;
                            const nextParams = new URLSearchParams(searchParams);
                            nextParams.set('action', 'import');
                            setSearchParams(nextParams, { replace: true });
                            setIsImportModalOpen(true);
                        }
                    }}
                />
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {participantMetrics.map((metric) => (
                            <OperationalMetricCard
                                key={metric.key}
                                label={metric.label}
                                value={metric.value}
                                icon={metric.icon}
                                tone={metric.tone}
                                onClick={metric.onClick}
                                className="min-h-[80px]"
                            />
                        ))}
                    </div>

                    <div className="surface-panel flex items-center gap-2 rounded-[1.1rem] border px-2.5 py-2">
                        <label className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search people"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="min-h-[44px] w-full rounded-[0.95rem] border border-border/70 bg-background/70 pl-9 pr-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={openActionsSheet}
                            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-[0.95rem] border border-border/70 bg-background/70 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/40"
                            aria-label="Open search, sort, and filters"
                        >
                            <Funnel className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline">Filter</span>
                            {activeFilter !== 'all' ? (
                                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-primary">
                                    {quickFilters.find((filter) => filter.key === activeFilter)?.count ?? 0}
                                </span>
                            ) : null}
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        <span>
                            {filteredParticipants?.length || 0} showing
                        </span>
                        <span>
                            {activeFilter === 'all'
                                ? 'All participants'
                                : quickFilters.find((filter) => filter.key === activeFilter)?.label}
                        </span>
                    </div>

                    <div
                        ref={listRef}
                        className="surface-panel surface-section-participants h-[min(60vh,34rem)] overflow-y-auto rounded-[1.35rem] border"
                    >
                        {(filteredParticipants?.length || 0) === 0 ? (
                            <div className="flex min-h-[14rem] items-center justify-center px-5 py-10 text-center text-sm text-muted-foreground">
                                No participants match the current search or filter.
                            </div>
                        ) : (
                            <div className="w-full">
                                {visibleParticipants.map((participant) => {
                                    const isPending = isParticipantPending(participant);
                                    const initialsTone = isPending
                                        ? 'bg-amber-500/14 text-amber-600'
                                        : 'bg-primary/12 text-primary';

                                    return (
                                        <button
                                            key={participant.id}
                                            type="button"
                                            onClick={() => navigate(`/participants/${participant.id}`)}
                                            className="flex h-14 w-full items-center gap-3 border-b border-border/70 px-3 text-left transition-colors hover:bg-accent/30"
                                        >
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${initialsTone}`}>
                                                {getParticipantInitials(participant)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-base font-semibold text-foreground">
                                                        {participant.firstName} {participant.lastName}
                                                    </p>
                                                    {isPending ? (
                                                        <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-600">
                                                            Pending
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {participant.isMinor && participant.guardianPhone ? (
                                                <a
                                                    href={`tel:${participant.guardianPhone}`}
                                                    onClick={(event) => event.stopPropagation()}
                                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                                                    aria-label={`Call guardian for ${participant.firstName} ${participant.lastName}`}
                                                >
                                                    <PhoneCall className="h-4 w-4" />
                                                </a>
                                            ) : null}
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        </button>
                                    );
                                })}
                                {visibleCount < (filteredParticipants?.length || 0) ? (
                                    <div ref={loadMoreRef} className="flex items-center justify-center px-4 py-4 text-xs font-semibold text-muted-foreground">
                                        Loading more participants...
                                    </div>
                                ) : (
                                    <div className="h-2 w-full" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {canManageRoster ? (
                <button
                    type="button"
                    onClick={() => setIsAddParticipantOpen(true)}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 text-primary-foreground shadow-lg shadow-black/10 transition-colors hover:opacity-95"
                    aria-label="Add person"
                >
                    <Plus className="h-5 w-5 stroke-[2.75]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.16em]">Add Person</span>
                </button>
            ) : null}

            {isActionsSheetOpen ? (
                <div className="fixed inset-0 z-[130] bg-background/65 backdrop-blur-sm" onClick={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete('panel');
                    setSearchParams(nextParams, { replace: true });
                }}>
                    <div
                        className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Funnel className="h-4 w-4" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-foreground">Actions &amp; Filters</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const nextParams = new URLSearchParams(searchParams);
                                    nextParams.delete('panel');
                                    setSearchParams(nextParams, { replace: true });
                                }}
                                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-5 border-t border-border/70 pt-4">
                            <div className="space-y-3">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Search &amp; Sort</p>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search people in this event"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        className="min-h-[44px] w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/35"
                                    />
                                </div>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                                        className="min-h-[44px] w-full appearance-none rounded-2xl border border-border bg-background px-4 pr-10 text-sm font-medium uppercase tracking-[0.12em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
                                    >
                                        <option value="name">Name</option>
                                        <option value="age">Age</option>
                                        <option value="readiness">Clearance</option>
                                        <option value="recent">Recent</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Filters</p>
                                <div className="flex flex-wrap gap-2">
                                    {quickFilters.map((filter) => {
                                        const Icon = filter.icon;
                                        const isActive = activeFilter === filter.key;
                                        return (
                                            <button
                                                key={filter.key}
                                                type="button"
                                                onClick={() => updateFilter(filter.key)}
                                                className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                                                    isActive
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border bg-background text-muted-foreground'
                                                }`}
                                            >
                                                {Icon ? <Icon className="h-4 w-4" /> : null}
                                                <span>{filter.label}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${isActive ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                                                    {filter.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {!canManageSync ? (
                                <p className="text-sm text-muted-foreground">
                                    Sync is limited to EventAdmin for this event. Current access: {capabilities.currentEventRole || 'No event role'}.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            <ImportParticipantsModal
                eventId={eventId}
                isOpen={isImportModalOpen}
                onClose={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete('action');
                    setSearchParams(nextParams, { replace: true });
                    setIsImportModalOpen(false);
                }}
            />
            <AddParticipantModal
                eventId={eventId}
                isOpen={isAddParticipantOpen}
                onClose={() => setIsAddParticipantOpen(false)}
            />
        </div>
    );
}
