import { useSelection } from '@/context/SelectionContext';
import { useActsQuery } from '@/hooks/useActs';
import { ActCard } from '@/components/acts/ActCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Music, Search, Filter, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddPerformanceModal } from '@/components/acts/AddPerformanceModal';

export default function ActsPage() {
    const { eventId } = useSelection();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { data: acts, isLoading, error } = useActsQuery(eventId || '');

    const filteredActs = acts?.filter(act =>
        act.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Performance
                </Button>
            </div>

            {/* Search and Filters */}
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
                <button className="p-3 bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                    <Filter className="w-5 h-5" />
                </button>
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
