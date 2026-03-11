import { Search, Plus, Clock } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUnassignedActsQuery } from '@/hooks/useLineup';
import { Card } from '@/components/ui/Card';

interface AddActToLineupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (actId: string) => void;
    eventId: string;
}

export function AddActToLineupModal({ isOpen, onClose, onAdd, eventId }: AddActToLineupModalProps) {
    const { data: acts, isLoading } = useUnassignedActsQuery(eventId);
    const [search, setSearch] = useState('');

    const filteredActs = acts?.filter(act =>
        act.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Act to Lineup">
            <div className="space-y-4 pt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                        placeholder="Search acts..."
                        className="pl-10 h-10"
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading acts...</div>
                    ) : filteredActs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {search ? 'No matches found.' : 'All acts are already scheduled!'}
                        </div>
                    ) : (
                        filteredActs.map(act => (
                            <Card key={act.id} className="p-3 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                <div className="min-w-0">
                                    <h4 className="font-medium text-foreground truncate">{act.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Clock size={12} />
                                        <span>{act.durationMinutes}m + {act.setupTimeMinutes}m setup</span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                                    onClick={() => onAdd(act.id)}
                                >
                                    <Plus size={16} className="mr-1" /> Add
                                </Button>
                            </Card>
                        ))
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Close</Button>
                </div>
            </div>
        </Modal>
    );
}
