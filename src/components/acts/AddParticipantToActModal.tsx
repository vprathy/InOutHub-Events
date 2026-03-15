import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useParticipantsQuery } from '@/hooks/useParticipants';
import { useAddParticipantToAct } from '@/hooks/useActs';
import { Search, UserPlus, Loader2 } from 'lucide-react';

interface AddParticipantToActModalProps {
    isOpen: boolean;
    onClose: () => void;
    actId: string;
    actName: string;
    eventId: string;
    role?: string;
    title?: string;
}

export function AddParticipantToActModal({
    isOpen,
    onClose,
    actId,
    actName,
    eventId,
    role = 'Performer',
    title,
}: AddParticipantToActModalProps) {
    const { data: participants, isLoading } = useParticipantsQuery(eventId);
    const addParticipant = useAddParticipantToAct(actId, eventId);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredParticipants = participants?.filter(p =>
        p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = async (participantId: string) => {
        try {
            await addParticipant.mutateAsync({ participantId, role });
            // We don't close immediately so they can add multiple
        } catch (error) {
            console.error('Failed to add participant:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || `Add to: ${actName}`}>
            <div className="space-y-4 pt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search roster..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-muted/30 border-border/50"
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : filteredParticipants?.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            No participants found.
                        </div>
                    ) : (
                        filteredParticipants?.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl hover:bg-muted/40 transition-colors group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {p.firstName[0]}{p.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{p.firstName} {p.lastName}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                            {p.status}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAdd(p.id)}
                                    disabled={addParticipant.isPending}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground border-border/50"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border/10">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        Done
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
