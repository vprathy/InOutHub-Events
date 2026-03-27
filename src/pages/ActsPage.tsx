import { useSelection } from '@/context/SelectionContext';
import { useActsQuery } from '@/hooks/useActs';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { ActCard } from '@/components/acts/ActCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Music, Search, Loader2, CheckCircle2, Users, Funnel, X, Plus, Clock3, ChevronDown } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AddPerformanceModal } from '@/components/acts/AddPerformanceModal';
import { UploadActAssetModal } from '@/components/acts/UploadActAssetModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { prepareIntroAutopilot } from '@/lib/introCapabilities';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';
import { InlineInfoTip } from '@/components/ui/InlineInfoTip';
import { OperationalMetricCard, type OperationalTone } from '@/components/ui/OperationalCards';

export default function ActsPage() {
    const { eventId } = useSelection();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [activeFilter, setActiveFilter] = useState<'all' | 'attention' | 'ready' | 'intro' | 'music_missing' | 'needs_cast' | 'prep_gaps'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'duration' | 'readiness'>('name');
    const [expandedActId, setExpandedActId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddGuideOpen, setIsAddGuideOpen] = useState(false);
    const [uploadMusicAct, setUploadMusicAct] = useState<NonNullable<typeof acts>[number] | null>(null);
    const [batchNotice, setBatchNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const { data: acts, isLoading, error } = useActsQuery(eventId || '');
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const capabilities = useEventCapabilities(eventId || null, null);

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        const actionParam = searchParams.get('action');

        if (filterParam) {
            if (filterParam === 'needs_cast' || filterParam === 'docs' || filterParam === 'music_missing') {
                setActiveFilter('attention');
            } else if (filterParam === 'stage_ready') {
                setActiveFilter('ready');
            } else if (filterParam === 'intro_ready') {
                setActiveFilter('intro');
            } else if (['all', 'attention', 'ready', 'intro', 'music_missing', 'needs_cast', 'prep_gaps'].includes(filterParam)) {
                setActiveFilter(filterParam as typeof activeFilter);
            }
        }

        if (actionParam === 'prepare-intros' && capabilities.canUsePremiumGeneration) {
            void handleBatchPrepareIntros();
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('action');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, capabilities.canUsePremiumGeneration]);

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
    const isFiltersOpen = searchParams.get('panel') === 'performance-filters';
    const toggleFiltersPanel = () => {
        const nextParams = new URLSearchParams(searchParams);
        if (isFiltersOpen) {
            nextParams.delete('panel');
        } else {
            nextParams.set('panel', 'performance-filters');
        }
        setSearchParams(nextParams, { replace: true });
    };
    const closeFiltersPanel = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('panel');
        setSearchParams(nextParams, { replace: true });
    };

    const stats = {
        total: acts?.length || 0,
        needsCast: acts?.filter((act) => act.participantCount === 0).length || 0,
        docs: acts?.filter((act) => act.missingAssetCount > 0).length || 0,
        introReady: acts?.filter((act) => act.hasApprovedIntro).length || 0,
        introEligible: acts?.filter((act) => act.introEligible).length || 0,
        stageReady: acts?.filter((act) => act.arrivalStatus === 'Ready').length || 0,
        musicMissing: acts?.filter((act) => !act.hasMusicTrack).length || 0,
    };
    const attentionCount = acts?.filter((act) =>
        act.readinessState === 'Blocked'
        || act.readinessState === 'At Risk'
        || act.arrivalStatus === 'Not Arrived'
        || (act.openIssueCount || 0) > 0
    ).length || 0;
    const readyCount = acts?.filter((act) => act.arrivalStatus === 'Ready' && act.participantCount > 0 && act.hasMusicTrack && act.missingAssetCount === 0).length || 0;

    const getReadinessScore = (act: NonNullable<typeof acts>[number]) => {
        if (act.participantCount === 0) return 0;
        if (!act.hasMusicTrack) return 0.2;
        if (act.missingAssetCount > 0) return 0.45;
        if (act.arrivalStatus === 'Ready') return 1;
        if (act.hasApprovedIntro) return 0.85;
        return 0.65;
    };

    const filteredActs = useMemo(() => (acts || []).filter(act => {
        const matchesSearch = act.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) || (act.managerName || '').toLowerCase().includes(deferredSearchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'attention') {
            return act.readinessState === 'Blocked'
                || act.readinessState === 'At Risk'
                || act.arrivalStatus === 'Not Arrived'
                || (act.openIssueCount || 0) > 0;
        }
        if (activeFilter === 'ready') return act.arrivalStatus === 'Ready' && act.participantCount > 0 && act.hasMusicTrack && act.missingAssetCount === 0;
        if (activeFilter === 'intro') return act.hasApprovedIntro;
        if (activeFilter === 'music_missing') return !act.hasMusicTrack;
        if (activeFilter === 'needs_cast') return act.participantCount === 0;
        if (activeFilter === 'prep_gaps') return act.missingAssetCount > 0;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'duration') return b.durationMinutes - a.durationMinutes;
        if (sortBy === 'readiness') return getReadinessScore(b) - getReadinessScore(a);
        return 0;
    }), [acts, deferredSearchQuery, activeFilter, sortBy]);

    const handleBatchPrepareIntros = async () => {
        if (!capabilities.canUsePremiumGeneration) {
            setBatchNotice({ tone: 'error', message: 'Intro generation stays limited until pilot review is approved for this organization.' });
            return;
        }

        const eligibleActs = (acts || []).filter((act) => act.introEligible);
        if (eligibleActs.length === 0) {
            setBatchNotice({ tone: 'error', message: 'No performances currently meet the intro prerequisites.' });
            return;
        }

        setBatchNotice(null);
        let prepared = 0;
        let skipped = 0;
        let failed = 0;

        for (const act of eligibleActs) {
            try {
                await prepareIntroAutopilot(act.id);
                prepared += 1;
            } catch {
                failed += 1;
            }
        }

        setBatchNotice({
            tone: failed > 0 ? 'error' : 'success',
            message: `${eligibleActs.length} eligible intros checked. ${prepared} prepared, ${failed} failed, ${skipped} skipped.`,
        });
    };

    if (isLoading || !eventId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading performances...</p>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="Oops! Something went wrong"
                description="We couldn't load the performances for this event. Check your connection and try again."
                icon={Music}
                action={{ label: 'Retry', onClick: () => window.location.reload() }}
            />
        );
    }

    const filterOptions = [
        { key: 'all' as const, label: 'All', count: stats.total, icon: Users },
        { key: 'attention' as const, label: 'Acts At Risk', count: attentionCount, icon: Music },
        { key: 'music_missing' as const, label: 'Music Missing', count: stats.musicMissing, icon: Music },
        { key: 'needs_cast' as const, label: 'Needs Cast', count: stats.needsCast, icon: Users },
        { key: 'prep_gaps' as const, label: 'Prep Gaps', count: stats.docs, icon: Clock3 },
        { key: 'ready' as const, label: 'Ready', count: readyCount, icon: CheckCircle2 },
        { key: 'intro' as const, label: 'Intro Ready', count: stats.introReady, icon: Music },
    ];
    const performanceMetrics = [
        {
            key: 'performances',
            label: 'Performances',
            infoBody: 'Shows the total number of acts or performances currently assembled for this event.',
            value: stats.total,
            icon: Music,
            tone: 'default' as OperationalTone,
            onClick: () => updateFilter('all'),
        },
        {
            key: 'attention',
            label: 'Acts At Risk',
            infoBody: 'Counts blocked, at-risk, or not-arrived performances that could disrupt readiness or execution.',
            value: attentionCount,
            icon: Clock3,
            tone: attentionCount > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => updateFilter('attention'),
        },
    ];

    const activeFilterLabel = filterOptions.find((option) => option.key === activeFilter)?.label || 'All';

    return (
        <div className="flex flex-col space-y-4 pb-24">
            <div className="space-y-3">
                <PageHeader
                    title="Performances"
                    subtitle="Manage cast, media, and prep readiness for this event."
                />

                {batchNotice ? (
                    <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold ${
                        batchNotice.tone === 'success'
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                            : 'border-destructive/20 bg-destructive/5 text-destructive'
                    }`}>
                        {batchNotice.message}
                    </div>
                ) : null}
                {!capabilities.canCreateActs ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Add is limited on your current access.</span>
                        <InlineInfoTip
                            label="Create performance access"
                            body={`Creating new performances is limited to EventAdmin for this event. Current access: ${currentEventRole || 'No event role'}.`}
                        />
                    </div>
                ) : null}
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    {performanceMetrics.map((metric) => (
                        <OperationalMetricCard
                            key={metric.key}
                            label={metric.label}
                            value={metric.value}
                            icon={metric.icon}
                            tone={metric.tone}
                            onClick={metric.onClick}
                            infoBody={metric.infoBody}
                            className="min-h-[80px]"
                        />
                    ))}
                </div>

                <div className="surface-panel flex items-center gap-2 rounded-[1.1rem] border px-2.5 py-2">
                    <label className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search performances"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-h-[44px] w-full rounded-[0.95rem] border border-border/70 bg-background/70 pl-9 pr-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={toggleFiltersPanel}
                        className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-[0.95rem] border border-border/70 bg-background/70 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/40"
                        aria-label="Open performance filters"
                    >
                        <Funnel className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Filter</span>
                        {activeFilter !== 'all' ? (
                            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-primary">
                                {filterOptions.find((option) => option.key === activeFilter)?.count ?? 0}
                            </span>
                        ) : null}
                    </button>
                </div>

                <div className="flex items-center justify-between px-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{filteredActs?.length || 0} showing</span>
                    <span>{activeFilterLabel}</span>
                </div>

                {isFiltersOpen ? (
                    <div className="fixed inset-0 z-[130] bg-background/65 backdrop-blur-sm" onClick={closeFiltersPanel}>
                        <div
                            className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <Funnel className="h-4 w-4" />
                                    </div>
                                    <h2 className="text-xl font-black tracking-tight text-foreground">Performance Filters</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeFiltersPanel}
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
                                            placeholder="Search performances in this event"
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
                                            <option value="duration">Duration</option>
                                            <option value="readiness">Readiness</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Filters</p>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.map((option) => {
                                            const Icon = option.icon;
                                            const isActive = activeFilter === option.key;
                                            return (
                                                <button
                                                    key={option.key}
                                                    type="button"
                                                    onClick={() => updateFilter(option.key)}
                                                    className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                                                        isActive
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-border bg-background text-muted-foreground'
                                                    }`}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    <span>{option.label}</span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${isActive ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                                                        {option.count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {!acts || acts.length === 0 ? (
                <EmptyState
                    title="No Performances Scheduled"
                    description="This event doesn't have any performances yet. Create your first performance to get started."
                    icon={Music}
                />
            ) : (
                <div className="flex flex-col space-y-4 pb-20">
                    {filteredActs?.map((act) => (
                        <ActCard
                            key={act.id}
                            act={act}
                            isExpanded={expandedActId === act.id}
                            onToggle={() => setExpandedActId(current => current === act.id ? null : act.id)}
                            onUploadMusic={setUploadMusicAct}
                        />
                    ))}
                    {filteredActs?.length === 0 && (
                        <p className="text-center py-12 text-muted-foreground text-sm font-medium">
                            No performances match "{searchQuery}"
                        </p>
                    )}
                </div>
            )}

            {capabilities.canCreateActs ? (
                <button
                    type="button"
                    onClick={() => setIsAddGuideOpen(true)}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-4 z-30 inline-flex min-h-12 items-center gap-1.5 rounded-full border border-primary/30 bg-primary px-3.5 text-primary-foreground shadow-lg shadow-black/10 transition-colors hover:opacity-95"
                    aria-label="Add performance"
                >
                    <Plus className="h-4.5 w-4.5 stroke-[2.75]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.12em]">Add</span>
                </button>
            ) : null}

            {isAddGuideOpen ? (
                <div className="fixed inset-0 z-[130] bg-background/65 backdrop-blur-sm" onClick={() => setIsAddGuideOpen(false)}>
                    <div
                        className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border/80" />
                        <div className="space-y-2">
                            <h2 className="text-xl font-black tracking-tight text-foreground">Add One Performance</h2>
                            <p className="text-sm text-muted-foreground">
                                Use this for one quick performance. For external files or bulk requests, use Import Data.
                            </p>
                        </div>
                        <div className="mt-5 grid gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddGuideOpen(false);
                                    setIsAddModalOpen(true);
                                }}
                                className="min-h-[44px] rounded-2xl bg-primary px-4 text-sm font-black uppercase tracking-[0.16em] text-primary-foreground"
                            >
                                Continue
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddGuideOpen(false);
                                    navigate('/admin/import-data');
                                }}
                                className="min-h-[44px] rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground"
                            >
                                Open Import Data
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <AddPerformanceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                eventId={eventId || ''}
            />
            {uploadMusicAct ? (
                <UploadActAssetModal
                    isOpen={Boolean(uploadMusicAct)}
                    onClose={() => setUploadMusicAct(null)}
                    actId={uploadMusicAct.id}
                    actName={uploadMusicAct.name}
                    eventId={eventId || ''}
                    initialType="Audio"
                />
            ) : null}
        </div>
    );
}
