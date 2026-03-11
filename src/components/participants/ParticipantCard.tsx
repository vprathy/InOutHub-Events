import type { Participant } from '../../types/domain';
import { User, Phone, StickyNote } from 'lucide-react';

interface ParticipantCardProps {
    participant: Participant;
}

export function ParticipantCard({ participant }: ParticipantCardProps) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition-all flex items-start space-x-4">
            <div className="bg-primary/10 p-3 rounded-full">
                <User className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground truncate">
                    {participant.firstName} {participant.lastName}
                </h3>

                {(participant.guardianName || participant.guardianPhone) && (
                    <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground font-medium">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="truncate">
                            {participant.guardianName} {participant.guardianPhone ? `(${participant.guardianPhone})` : ''}
                        </span>
                    </div>
                )}

                {participant.notes && (
                    <div className="flex items-start space-x-2 mt-2 text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/50">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <p className="line-clamp-2">{participant.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
