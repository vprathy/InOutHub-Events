import { useSelection } from '@/context/SelectionContext';
import { useActsQuery } from '@/hooks/useActs';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { ActCard } from '@/components/acts/ActCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Music, Search, Loader2, Plus, CheckCircle2, Clock3, Users, AlertTriangle, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddPerformanceModal } from '@/components/acts/AddPerformanceModal';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard } from '@/components/ui/OperationalCards';
import { prepareIntroAutopilot } from '@/lib/introCapabilities';

export default function ActsPage() {
    const { eventId } = useSelection();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'needs_cast' | 'docs' | 'intro_ready' | 'stage_ready' | 'music_missing'>('all');
    const [expandedActId, setExpandedActId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBatchPreparing, setIsBatchPreparing] = useState(false);
    const [batchNotice, setBatchNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const { data: acts, isLoading, error } = useActsQuery(eventId || '');
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam && ['all', 'needs_cast', 'docs', 'intro_ready', 'stage_ready', 'music_missing'].includes(filterParam)) {
            setActiveFilter(filterParam as typeof activeFilter);
        }
    }, [searchParams]);

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

    const stats = {
        total: acts?.length || 0,
        needsCast: acts?.filter((act) => act.participantCount === 0).length || 0,
        docs: acts?.filter((act) => act.missingAssetCount > 0).length || 0,
        introReady: acts?.filter((act) => act.hasApprovedIntro).length || 0,
        introEligible: acts?.filter((act) => act.introEligible).length || 0,
        stageReady: acts?.filter((act) => act.arrivalStatus === 'Ready').length || 0,
        musicMissing: acts?.filter((act) => !act.hasMusicTrack).length || 0,
    };
    const canBatchPrepareIntros = currentEventRole === 'EventAdmin';
    const performanceResponseItems = [
        {
            key: 'needs_cast' as const,
            label: 'Cast Gaps',
            detail: 'These performances do not have any performers assigned yet.',
            count: stats.needsCast,
            tone: 'warning' as const,
            action: 'Open cast gaps',
        },
        {
            key: 'docs' as const,
            label: 'Prep Gaps',
            detail: 'Readiness items or approvals are still incomplete before these performances can clear.',
            count: stats.docs,
            tone: 'warning' as const,
            action: 'Review prep work',
        },
        {
            key: 'music_missing' as const,
            label: 'Music Missing',
            detail: 'The uploaded audio track is still missing for these performances.',
            count: stats.musicMissing,
            tone: 'critical' as const,
            action: 'Review media',
        },
    ].filter((item) => item.count > 0).slice(0, 3);

    const filteredActs = acts?.filter(act => {
        const matchesSearch = act.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'needs_cast') return act.participantCount === 0;
        if (activeFilter === 'docs') return act.missingAssetCount > 0;
        if (activeFilter === 'intro_ready') return act.hasApprovedIntro;
        if (activeFilter === 'stage_ready') return act.arrivalStatus === 'Ready';
        if (activeFilter === 'music_missing') return !act.hasMusicTrack;
        return true;
    });

    const handleBatchPrepareIntros = async () => {
        const eligibleActs = (acts || []).filter((act) => act.introEligible);
        if (eligibleActs.length === 0) {
            setBatchNotice({ tone: 'error', message: 'No performances currently meet the intro prerequisites.' });
            return;
        }

        setIsBatchPreparing(true);
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

        setIsBatchPreparing(false);
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

    return (
        <div className="flex flex-col space-y-5">
            <div className="space-y-3">
                <PageHeader
                    title="Performances"
                    subtitle={`${stats.total} in play • ${stats.stageReady} show ready • ${stats.docs} prep gaps still open`}
                    actions={
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            {canBatchPrepareIntros ? (
                                <Button
                                    variant="outline"
                                    onClick={() => void handleBatchPrepareIntros()}
                                    disabled={isBatchPreparing || stats.introEligible === 0}
                                    className="h-11 w-full sm:w-auto font-bold"
                                >
                                    {isBatchPreparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Music className="w-4 h-4 mr-2" />}
                                    Prepare Eligible Intros
                                </Button>
                            ) : null}
                            <Button
                                onClick={() => setIsAddModalOpen(true)}
                                className="h-11 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Performance
                            </Button>
                        </div>
                    }
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

                <div className="surface-panel rounded-[1.35rem] p-3">
                    <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Performance Snapshot</p>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <OperationalMetricCard label="Performances" value={stats.total} icon={Music} tone="default" onClick={() => updateFilter('all')} />
                        <OperationalMetricCard label="Needs Cast" value={stats.needsCast} icon={Users} tone={stats.needsCast > 0 ? 'warning' : 'good'} onClick={() => updateFilter('needs_cast')} />
                        <OperationalMetricCard label="Intro Ready" value={stats.introReady} icon={AlertTriangle} tone="info" onClick={() => updateFilter('intro_ready')} />
                        <OperationalMetricCard label="Show Ready" value={stats.stageReady} icon={CheckCircle2} tone="good" onClick={() => updateFilter('stage_ready')} />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Needs Response</p>
                    {performanceResponseItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {performanceResponseItems.map((item) => (
                                <OperationalResponseCard
                                    key={item.key}
                                    label={item.label}
                                    detail={item.detail}
                                    count={item.count}
                                    tone={item.tone}
                                    action={item.action}
                                    onClick={() => updateFilter(item.key)}
                                />
                            ))}
                        </div>
                    ) : (
                        <OperationalEmptyResponse
                            title="No Escalations"
                            detail="Nothing urgent is blocking the performance queue right now."
                        />
                    )}
                </div>
            </div>

            <div className="surface-panel space-y-3 rounded-[1.35rem] p-3">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search performances..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => updateFilter('all')}
                        className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        All
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'all' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.total}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('needs_cast')}
                        className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'needs_cast' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Needs Cast
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'needs_cast' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.needsCast}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('docs')}
                        className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'docs' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Clock3 className="w-3.5 h-3.5" />
                        Prep Gaps
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'docs' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.docs}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('stage_ready')}
                        className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'stage_ready' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Show Ready
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'stage_ready' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.stageReady}
                        </span>
                    </button>
                    <div className="relative shrink-0">
                        <select
                            value={['intro_ready', 'music_missing'].includes(activeFilter) ? activeFilter : ''}
                            onChange={(e) => updateFilter((e.target.value || 'all') as typeof activeFilter)}
                            className="min-h-11 appearance-none rounded-full border border-border bg-card pl-4 pr-9 text-xs font-bold uppercase tracking-wider text-muted-foreground focus:outline-none"
                        >
                            <option value="">More Filters</option>
                            <option value="intro_ready">Intro Approved ({stats.introReady})</option>
                            <option value="music_missing">Music Missing ({stats.musicMissing})</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                </div>
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
                        />
                    ))}
                    {filteredActs?.length === 0 && (
                        <p className="text-center py-12 text-muted-foreground text-sm font-medium">
                            No performances match "{searchQuery}"
                        </p>
                    )}
                </div>
            )}

            <AddPerformanceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                eventId={eventId || ''}
            />
        </div>
    );
}
