import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUpdateParticipant } from '@/hooks/useParticipants';

interface EditParticipantModalProps {
    isOpen: boolean;
    onClose: () => void;
    participant: {
        id: string;
        firstName: string;
        lastName: string;
        isMinor?: boolean;
        status?: string;
        guardianName?: string | null;
        guardianPhone?: string | null;
        guardianRelationship?: string | null;
        notes?: string | null;
    };
}

export function EditParticipantModal({ isOpen, onClose, participant }: EditParticipantModalProps) {
    const [firstName, setFirstName] = useState(participant.firstName);
    const [lastName, setLastName] = useState(participant.lastName);
    const [isMinor, setIsMinor] = useState(!!participant.isMinor);
    const [status, setStatus] = useState(participant.status || 'active');
    const [guardianName, setGuardianName] = useState(participant.guardianName || '');
    const [guardianPhone, setGuardianPhone] = useState(participant.guardianPhone || '');
    const [guardianRelationship, setGuardianRelationship] = useState(participant.guardianRelationship || '');
    const [notes, setNotes] = useState(participant.notes || '');
    const [error, setError] = useState('');

    const updateParticipant = useUpdateParticipant(participant.id);

    useEffect(() => {
        if (!isOpen) return;
        setFirstName(participant.firstName);
        setLastName(participant.lastName);
        setIsMinor(!!participant.isMinor);
        setStatus(participant.status || 'active');
        setGuardianName(participant.guardianName || '');
        setGuardianPhone(participant.guardianPhone || '');
        setGuardianRelationship(participant.guardianRelationship || '');
        setNotes(participant.notes || '');
        setError('');
    }, [isOpen, participant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await updateParticipant.mutateAsync({
                firstName,
                lastName,
                isMinor,
                status: status as any,
                guardianName: guardianName || null,
                guardianPhone: guardianPhone || null,
                guardianRelationship: guardianRelationship || null,
                notes: notes || null,
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to save participant');
        }
    };

    const inputClass = "w-full px-4 py-2.5 text-sm font-medium bg-background border-2 border-border/60 rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40";
    const labelClass = "block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Participant">
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>First Name</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Last Name</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                </div>

                <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div>
                        <label className={labelClass}>Participant Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={inputClass}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="withdrawn">Withdrawn</option>
                            <option value="refunded">Refunded</option>
                            <option value="missing_from_source">Missing (Source)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center space-x-3 p-1">
                    <button
                        type="button"
                        onClick={() => setIsMinor(!isMinor)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-all ${isMinor ? 'bg-amber-500/10 border-amber-500/40 text-amber-600' : 'bg-muted border-border/50 text-muted-foreground opacity-60'}`}
                    >
                        {isMinor ? 'Minor Status Active' : 'Mark as Minor'}
                    </button>
                    <p className="text-[9px] text-muted-foreground font-medium italic">Enables guardian tracking if active</p>
                </div>

                {isMinor && (
                    <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                            Guardian Details (Minor)
                        </p>
                        <div>
                            <label className={labelClass}>Guardian Name</label>
                            <input
                                type="text"
                                value={guardianName}
                                onChange={(e) => setGuardianName(e.target.value)}
                                className={inputClass}
                                placeholder="Parent or legal guardian"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input
                                    type="tel"
                                    value={guardianPhone}
                                    onChange={(e) => setGuardianPhone(e.target.value)}
                                    className={inputClass}
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Relationship</label>
                                <input
                                    type="text"
                                    value={guardianRelationship}
                                    onChange={(e) => setGuardianRelationship(e.target.value)}
                                    className={inputClass}
                                    placeholder="e.g. Mother, Father"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelClass}>Internal Profile Notes</label>
                    <p className="text-[9px] text-muted-foreground mb-2">Private operational notes for staff. For stage-specific flags, use the Coordination section.</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`${inputClass} min-h-[80px] resize-none`}
                        placeholder="Internal bio notes, behavioral flags, or special needs..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    {error ? <p className="mr-auto self-center text-xs font-medium text-red-500">{error}</p> : null}
                    <Button type="button" variant="ghost" onClick={onClose} className="h-10 px-5 text-[10px] font-black uppercase tracking-widest">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={updateParticipant.isPending || !firstName.trim() || !lastName.trim()}
                        className="h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                        {updateParticipant.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
