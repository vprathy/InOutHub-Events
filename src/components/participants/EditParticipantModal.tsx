import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Participant } from '@/types/domain';
import { useUpdateParticipant } from '@/hooks/useParticipants';

interface EditParticipantModalProps {
    isOpen: boolean;
    onClose: () => void;
    participant: Participant;
}

export function EditParticipantModal({ isOpen, onClose, participant }: EditParticipantModalProps) {
    const [firstName, setFirstName] = useState(participant.firstName || '');
    const [lastName, setLastName] = useState(participant.lastName || '');
    const [guardianName, setGuardianName] = useState(participant.guardianName || '');
    const [guardianPhone, setGuardianPhone] = useState(participant.guardianPhone || '');

    const updateParticipant = useUpdateParticipant(participant.id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateParticipant.mutateAsync({
                firstName,
                lastName,
                guardianName,
                guardianPhone,
            });
            onClose();
        } catch (error) {
            console.error('Failed to update participant:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Participant Profile">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">First Name</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Last Name</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Guardian Name</label>
                    <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Guardian Phone</label>
                    <input
                        type="text"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={updateParticipant.isPending}>
                        {updateParticipant.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
