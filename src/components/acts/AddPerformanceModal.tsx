import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateAct } from '@/hooks/useActs';
import { Music, Clock, Timer, MessageSquare } from 'lucide-react';

interface AddPerformanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
}

export function AddPerformanceModal({ isOpen, onClose, eventId }: AddPerformanceModalProps) {
    const createAct = useCreateAct(eventId);
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('5');
    const [setupTime, setSetupTime] = useState('2');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAct.mutateAsync({
                name,
                durationMinutes: parseInt(duration) || 0,
                setupTimeMinutes: parseInt(setupTime) || 0,
                notes: notes || undefined
            });
            setName('');
            setDuration('5');
            setSetupTime('2');
            setNotes('');
            onClose();
        } catch (error) {
            console.error('Failed to create performance:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Performance">
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                            <Music className="w-3 h-3 mr-2 text-primary" />
                            Performance Name
                        </label>
                        <Input
                            placeholder="e.g. Opening Number, Solo Dance"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="bg-muted/30 border-border/50 focus:border-primary/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                                <Timer className="w-3 h-3 mr-2 text-primary" />
                                Duration (mins)
                            </label>
                            <Input
                                type="number"
                                min="1"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                required
                                className="bg-muted/30 border-border/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                                <Clock className="w-3 h-3 mr-2 text-primary" />
                                Setup Time (mins)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                value={setupTime}
                                onChange={(e) => setSetupTime(e.target.value)}
                                required
                                className="bg-muted/30 border-border/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                            <MessageSquare className="w-3 h-3 mr-2 text-primary" />
                            Technical Notes
                        </label>
                        <textarea
                            className="w-full min-h-[100px] p-3 rounded-lg bg-muted/30 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                            placeholder="Optional technical notes or requirements..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/10">
                    <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createAct.isPending || !name}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                    >
                        {createAct.isPending ? 'Creating...' : 'Create Performance'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
