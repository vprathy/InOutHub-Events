import { useSelection } from '@/context/SelectionContext';
import { useActsQuery } from '@/hooks/useActs';
import { ActCard } from '@/components/acts/ActCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Music, Search, Loader2, Plus, CheckCircle2, Clock3, Users } from 'lucide-react';
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
        <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Performances</h1>
                    <p className="text-xs text-muted-foreground font-medium">
                        {acts?.length || 0} Performances Scheduled
                    </p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Performance
                </Button>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                <button
                    onClick={() => updateFilter('all')}
                    className={`rounded-2xl border p-3 text-left transition-all ${activeFilter === 'all' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'}`}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">All</p>
                    <p className="mt-1 text-2xl font-black tracking-tight">{stats.total}</p>
                </button>
                <button
                    onClick={() => updateFilter('needs_cast')}
                    className={`rounded-2xl border p-3 text-left transition-all ${activeFilter === 'needs_cast' ? 'border-indigo-500 bg-indigo-500/5 shadow-sm' : 'border-border bg-card hover:border-indigo-500/40'}`}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Needs Cast</p>
                    <p className="mt-1 text-2xl font-black tracking-tight">{stats.needsCast}</p>
                </button>
                <button
                    onClick={() => updateFilter('docs')}
                    className={`rounded-2xl border p-3 text-left transition-all ${activeFilter === 'docs' ? 'border-amber-500 bg-amber-500/5 shadow-sm' : 'border-border bg-card hover:border-amber-500/40'}`}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Docs</p>
                    <p className="mt-1 text-2xl font-black tracking-tight">{stats.docs}</p>
                </button>
                <button
                    onClick={() => updateFilter('intro_ready')}
                    className={`rounded-2xl border p-3 text-left transition-all ${activeFilter === 'intro_ready' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'}`}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Intro Ready</p>
                    <p className="mt-1 text-2xl font-black tracking-tight">{stats.introReady}</p>
                </button>
                <button
                    onClick={() => updateFilter('stage_ready')}
                    className={`rounded-2xl border p-3 text-left transition-all ${activeFilter === 'stage_ready' ? 'border-emerald-500 bg-emerald-500/5 shadow-sm' : 'border-border bg-card hover:border-emerald-500/40'}`}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Stage Ready</p>
                    <p className="mt-1 text-2xl font-black tracking-tight">{stats.stageReady}</p>
                </button>
            </div>

            {/* Search and Filters */}
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
                    </button>
                    <button
                        onClick={() => updateFilter('needs_cast')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'needs_cast' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Needs Cast
                    </button>
                    <button
                        onClick={() => updateFilter('docs')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'docs' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Clock3 className="w-3.5 h-3.5" />
                        Docs
                    </button>
                    <button
                        onClick={() => updateFilter('intro_ready')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'intro_ready' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <Music className="w-3.5 h-3.5" />
                        Intro Ready
                    </button>
                    <button
                        onClick={() => updateFilter('stage_ready')}
                        className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === 'stage_ready' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-card border border-border text-muted-foreground'}`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stage Ready
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
