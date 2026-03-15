import { useSelection } from '@/context/SelectionContext';
import { useActsQuery } from '@/hooks/useActs';
import { ActCard } from '@/components/acts/ActCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Music, Search, Loader2, Plus, CheckCircle2, Clock3, Users, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddPerformanceModal } from '@/components/acts/AddPerformanceModal';
import { useSearchParams } from 'react-router-dom';

export default function ActsPage() {
    const { eventId } = useSelection();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'needs_cast' | 'docs' | 'intro_ready' | 'stage_ready'>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { data: acts, isLoading, error } = useActsQuery(eventId || '');

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam && ['all', 'needs_cast', 'docs', 'intro_ready', 'stage_ready'].includes(filterParam)) {
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
        stageReady: acts?.filter((act) => act.arrivalStatus === 'Ready').length || 0,
    };
    const needsAttention = acts?.filter((act) => act.participantCount === 0 || act.missingAssetCount > 0 || !act.hasApprovedIntro).length || 0;

    const filteredActs = acts?.filter(act => {
        const matchesSearch = act.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'needs_cast') return act.participantCount === 0;
        if (activeFilter === 'docs') return act.missingAssetCount > 0;
        if (activeFilter === 'intro_ready') return act.hasApprovedIntro;
        if (activeFilter === 'stage_ready') return act.arrivalStatus === 'Ready';
        return true;
    });

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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Performances</h1>
                    <p className="text-xs text-muted-foreground font-medium">
                        {stats.total} scheduled, {needsAttention} still need attention
                    </p>
                    </div>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-11 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Performance
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border bg-card px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Live Count</p>
                        <p className="mt-1 text-xl font-black tracking-tight text-foreground">{stats.total}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Attention
                        </p>
                        <p className="mt-1 text-xl font-black tracking-tight text-amber-700">{needsAttention}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Stage Ready</p>
                        <p className="mt-1 text-xl font-black tracking-tight text-emerald-700">{stats.stageReady}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
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
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        All
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'all' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.total}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('needs_cast')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'needs_cast' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Needs Cast
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'needs_cast' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.needsCast}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('docs')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'docs' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Clock3 className="w-3.5 h-3.5" />
                        Docs
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'docs' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.docs}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('intro_ready')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'intro_ready' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Music className="w-3.5 h-3.5" />
                        Intro Ready
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'intro_ready' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.introReady}
                        </span>
                    </button>
                    <button
                        onClick={() => updateFilter('stage_ready')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'stage_ready' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stage Ready
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'stage_ready' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
                            {stats.stageReady}
                        </span>
                    </button>
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
                        <ActCard key={act.id} act={act} />
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
