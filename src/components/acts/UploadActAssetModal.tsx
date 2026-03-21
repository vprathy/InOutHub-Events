import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAddActAsset, useUploadActRequirementAsset } from '@/hooks/useActs';
import { Music, FileType, MessageSquare } from 'lucide-react';

interface UploadActAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    actId: string;
    actName: string;
    eventId: string;
}

export function UploadActAssetModal({ isOpen, onClose, actId, actName, eventId }: UploadActAssetModalProps) {
    const addAsset = useAddActAsset(eventId);
    const uploadRequirementAsset = useUploadActRequirementAsset(eventId);
    const [name, setName] = useState('');
    const [type, setType] = useState('Audio');
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (type === 'Audio') {
                if (!file) return;
                await uploadRequirementAsset.mutateAsync({
                    actId,
                    file,
                    requirementType: 'Audio',
                    description: notes || name || 'Uploaded performance music file',
                });
            } else {
                await addAsset.mutateAsync({
                    actId,
                    assetName: name,
                    assetType: type,
                    notes: notes || undefined
                });
            }
            setName('');
            setNotes('');
            setFile(null);
            onClose();
        } catch (error) {
            console.error('Failed to add act asset:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Asset Record: ${actName}`}>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        {type === 'Audio'
                            ? 'Upload a music file here to satisfy the performance music requirement. Performer photos and participant documents still belong in the participant workspace.'
                            : 'This creates an act asset record only. Performer photos and participant documents still belong in the participant workspace.'}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                            <Music className="w-3 h-3 mr-2 text-primary" />
                            Asset Name
                        </label>
                        <Input
                            placeholder="e.g. Main music track, Floor Prop Set, Spare Violin"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="bg-muted/30 border-border/50"
                        />
                    </div>

                    {type === 'Audio' ? (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                                <Music className="w-3 h-3 mr-2 text-primary" />
                                Music File
                            </label>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="block w-full rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-primary"
                            />
                            <p className="text-[10px] font-medium text-muted-foreground">
                                This uploads the file and attaches it to the `Music File` requirement as submitted media.
                            </p>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                            <FileType className="w-3 h-3 mr-2 text-primary" />
                            Asset Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['Audio', 'Prop', 'Instrument', 'Other'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${type === t
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/50'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                            <MessageSquare className="w-3 h-3 mr-2 text-primary" />
                            Internal Notes
                        </label>
                        <textarea
                            className="w-full min-h-[80px] p-3 rounded-xl bg-muted/30 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                            placeholder="Optional notes about this asset..."
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
                        disabled={addAsset.isPending || uploadRequirementAsset.isPending || !name || (type === 'Audio' && !file)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                    >
                        {addAsset.isPending || uploadRequirementAsset.isPending
                            ? (type === 'Audio' ? 'Uploading...' : 'Saving...')
                            : (type === 'Audio' ? 'Upload Music' : 'Save Record')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
