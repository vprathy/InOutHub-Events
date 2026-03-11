import { useState } from 'react';
import { useImportRoster } from '../../hooks/useParticipants';
import { X, Link as LinkIcon, FileUp, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useSelection } from '../../context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface ImportRosterModalProps {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImportRosterModal({ eventId, isOpen, onClose }: ImportRosterModalProps) {
    const [sourceUrl, setSourceUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const { organizationId } = useSelection();
    const { mutate: importParticipants } = useImportRoster(eventId);

    // Fetch names for context banner
    const { data: selectionNames } = useQuery({
        queryKey: ['selection-names', organizationId, eventId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data: org } = await supabase.from('organizations').select('name').eq('id', organizationId).single();
            const { data: event } = eventId
                ? await supabase.from('events').select('name').eq('id', eventId).single()
                : { data: null };
            return { orgName: org?.name, eventName: event?.name };
        },
        enabled: !!organizationId && isOpen
    });

    if (!isOpen) return null;

    const handleImport = () => {
        if (!sourceUrl && !file) return;

        setStatus('loading');
        importParticipants(file || sourceUrl, {
            onSuccess: () => {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                    setSourceUrl('');
                    setFile(null);
                }, 1500);
            },
            onError: (err: any) => {
                setStatus('error');
                setErrorMessage(err.message || 'Failed to import participants');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Import Participants</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {selectionNames?.orgName && selectionNames?.eventName && (
                    <div className="bg-primary/5 border-b border-primary/10 px-6 py-3 flex items-start sm:items-center space-x-2">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                        <span className="text-xs font-medium text-primary leading-tight">
                            Importing into: <strong className="font-bold">{selectionNames.orgName}</strong> / <strong className="font-bold">{selectionNames.eventName}</strong>
                        </span>
                    </div>
                )}

                <div className="p-6 space-y-6">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="bg-emerald-500/10 p-4 rounded-full">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                            <p className="text-lg font-bold text-foreground">Import Successful!</p>
                            <p className="text-sm text-muted-foreground">The participants list has been updated.</p>
                        </div>
                    ) : (
                        <>
                            {/* Google Sheets URL Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    Google Sheets URL
                                </label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        value={sourceUrl}
                                        onChange={(e) => {
                                            setSourceUrl(e.target.value);
                                            setFile(null);
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="relative py-2 flex items-center">
                                <div className="flex-1 border-t border-border"></div>
                                <span className="px-3 text-[10px] font-bold uppercase text-muted-foreground bg-card">OR</span>
                                <div className="flex-1 border-t border-border"></div>
                            </div>

                            {/* CSV File Upload */}
                            <div className="space-y-2">
                                <label className={`
                  flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
                  ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                `}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FileUp className={`w-8 h-8 mb-2 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <p className="text-xs font-medium text-foreground">
                                            {file ? file.name : 'Click to upload or drag & drop'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">CSV files only</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".csv"
                                        onChange={(e) => {
                                            const selected = e.target.files?.[0];
                                            if (selected) {
                                                setFile(selected);
                                                setSourceUrl('');
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            {status === 'error' && (
                                <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p className="font-medium">{errorMessage}</p>
                                </div>
                            )}

                            <button
                                disabled={(!sourceUrl && !file) || status === 'loading'}
                                onClick={handleImport}
                                className={`
                  w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2
                  ${status === 'loading' ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:shadow-lg hover:shadow-primary/20 text-white'}
                `}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <span>Import Participants</span>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
