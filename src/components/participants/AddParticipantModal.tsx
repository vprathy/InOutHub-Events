import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateParticipant } from '@/hooks/useParticipants';

interface AddParticipantModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
}

export function AddParticipantModal({ isOpen, onClose, eventId }: AddParticipantModalProps) {
    const createParticipant = useCreateParticipant(eventId);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setFirstName('');
        setLastName('');
        setGuardianName('');
        setGuardianPhone('');
        setNotes('');
    }, [isOpen]);

    const inputClass = 'h-11 rounded-xl border-border/60 bg-background px-4 text-sm font-medium';
    const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        await createParticipant.mutateAsync({
            firstName,
            lastName,
            guardianName: guardianName || null,
            guardianPhone: guardianPhone || null,
            notes: notes || null,
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Participant">
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>First Name</label>
                        <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={inputClass}
                            placeholder="First name"
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Last Name</label>
                        <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={inputClass}
                            placeholder="Last name"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Guardian Contact</p>
                    <div>
                        <label className={labelClass}>Guardian Name</label>
                        <Input
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value)}
                            className={inputClass}
                            placeholder="Parent or guardian"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Guardian Phone</label>
                        <Input
                            type="tel"
                            value={guardianPhone}
                            onChange={(e) => setGuardianPhone(e.target.value)}
                            className={inputClass}
                            placeholder="+1 (555) 555-5555"
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[88px] w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                        placeholder="Optional operational notes"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} className="h-10 px-5 text-[10px] font-black uppercase tracking-[0.16em]">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createParticipant.isPending || !firstName.trim() || !lastName.trim()}
                        className="h-10 px-6 text-[10px] font-black uppercase tracking-[0.16em]"
                    >
                        {createParticipant.isPending ? 'Adding...' : 'Add Participant'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
