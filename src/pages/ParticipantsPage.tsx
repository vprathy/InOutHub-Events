import { useState } from 'react';
import { useParticipantsQuery } from '../hooks/useParticipants';
import { useSelection } from '../context/SelectionContext';
import { ParticipantCard } from '../components/participants/ParticipantCard';
import { ImportRosterModal } from '../components/participants/ImportRosterModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Users, Search, UserPlus2, Filter, Loader2 } from 'lucide-react';

export default function ParticipantsPage() {
    const { eventId } = useSelection();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: participants, isLoading, error } = useParticipantsQuery(eventId || '');

    const filteredParticipants = participants?.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading || !eventId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading participants...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Participants</h1>
                    <p className="text-xs text-muted-foreground font-medium">
                        {participants?.length || 0} Participants Validated
                    </p>
                </div>
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center space-x-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <UserPlus2 className="w-4 h-4" />
                    <span>Import</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search participants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                </div>
                <button className="p-3 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {error ? (
                <EmptyState
                    title="Connection Error"
                    description="We couldn't load the participants. Please check your connection."
                    icon={Users}
                />
            ) : !participants || participants.length === 0 ? (
                <EmptyState
                    title="No Participants Found"
                    description="Import your participant list from a Google Sheet or CSV to get started."
                    icon={Users}
                    action={{
                        label: 'Import Participants',
                        onClick: () => setIsImportModalOpen(true)
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 pb-24">
                    {filteredParticipants?.map((participant) => (
                        <ParticipantCard key={participant.id} participant={participant} />
                    ))}
                    {filteredParticipants?.length === 0 && (
                        <p className="text-center py-12 text-muted-foreground text-sm font-medium">
                            No participants match "{searchQuery}"
                        </p>
                    )}
                </div>
            )}

            <ImportRosterModal
                eventId={eventId}
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </div>
    );
}
