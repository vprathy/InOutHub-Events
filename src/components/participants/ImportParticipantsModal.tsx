import { useEffect, useState } from 'react';
import { useImportParticipants, useSyncGoogleSheet } from '@/hooks/useParticipants';
import { X, RefreshCw, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Copy, ChevronDown, ChevronRight, Trash2, FileSpreadsheet, FileJson, Clock, Plus, ArrowLeft } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useEventSources, type EventSource } from '@/hooks/useEventSources';
import { ActionMenu } from '@/components/ui/ActionMenu';

interface ImportParticipantsModalProps {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImportParticipantsModal({ eventId, isOpen, onClose }: ImportParticipantsModalProps) {
    const [urlInput, setUrlInput] = useState('');
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sourceName, setSourceName] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [uiMode, setUiMode] = useState<'dashboard' | 'add_source_select' | 'link_sheet' | 'upload_spreadsheet'>('dashboard');
    const [errorMessage, setErrorMessage] = useState('');
    const [syncStats, setSyncStats] = useState<{ new: number; updated: number; missing: number } | null>(null);
    const [showTechnicalSetup, setShowTechnicalSetup] = useState(false);
    const [serviceAccountEmail] = useState('inouthub-importer@inouthub-events.iam.gserviceaccount.com');

    const { organizationId } = useSelection();
    const { sources, addSource, removeSource, updateSourceSyncStatus } = useEventSources(eventId);
    const { mutateAsync: importSpreadsheet } = useImportParticipants(eventId);
    const { mutateAsync: syncSheet } = useSyncGoogleSheet(eventId);

    const { data: selectionNames } = useQuery({
        queryKey: ['selection-metadata', organizationId, eventId],
        queryFn: async () => {
            const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single();
            return { eventName: event?.name };
        },
        enabled: isOpen && !!eventId
    });

    useEffect(() => {
        if (!isOpen) {
            setUrlInput('');
            setSpreadsheetId('');
            setFile(null);
            setSourceName('');
            setStatus('idle');
            setUiMode('dashboard');
            setErrorMessage('');
            setSyncStats(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleLinkSheet = async () => {
        if (!spreadsheetId || !sourceName) return;
        setStatus('loading');
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'google_sheet',
                config: { sheetId: spreadsheetId, url: urlInput }
            });

            const result = await syncSheet({ sheetId: spreadsheetId });
            await updateSourceSyncStatus({ sourceId: newSource.id, lastSyncedAt: new Date().toISOString() });

            setSyncStats(result.stats);
            setStatus('success');
            setTimeout(() => {
                setUiMode('dashboard');
                setStatus('idle');
            }, 1500);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to link Google Sheet');
        }
    };

    const handleUploadSpreadsheet = async () => {
        if (!file || !sourceName) return;
        setStatus('loading');
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'csv', // Keeping 'csv' type in DB for compatibility but UI says Spreadsheet
                config: { fileName: file.name }
            });

            await importSpreadsheet({ file, sourceId: newSource.id });
            await updateSourceSyncStatus({ sourceId: newSource.id, lastSyncedAt: new Date().toISOString() });

            setStatus('success');
            setTimeout(() => {
                setUiMode('dashboard');
                setStatus('idle');
                setFile(null);
            }, 1500);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to upload spreadsheet');
        }
    };

    const handleSyncAll = async () => {
        if (sources.length === 0) return;
        setStatus('loading');
        const combinedStats = { new: 0, updated: 0, missing: 0 };

        try {
            for (const source of sources) {
                if (source.type === 'google_sheet' && source.config.sheetId) {
                    const result = await syncSheet({ sheetId: source.config.sheetId });
                    await updateSourceSyncStatus({ sourceId: source.id, lastSyncedAt: new Date().toISOString() });
                    combinedStats.new += result.stats.new;
                    combinedStats.updated += result.stats.updated;
                    combinedStats.missing += result.stats.missing;
                }
            }

            setSyncStats(combinedStats);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Global sync failed');
        }
    };

    const handleSyncSingleSource = async (source: EventSource) => {
        setStatus('loading');
        try {
            if (source.type === 'google_sheet' && source.config.sheetId) {
                const result = await syncSheet({ sheetId: source.config.sheetId });
                await updateSourceSyncStatus({ sourceId: source.id, lastSyncedAt: new Date().toISOString() });
                setSyncStats(result.stats);
            }
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1500);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || `Failed to sync ${source.name}`);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border-t sm:border border-border w-full max-w-md sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-border/50">
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                            {uiMode !== 'dashboard' && (
                                <button onClick={() => setUiMode('dashboard')} className="p-1 -ml-1 hover:bg-accent rounded-full text-muted-foreground mr-1">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                            )}
                            <h2 className="text-xl font-bold text-foreground">Sync Board</h2>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1 ml-0.5">
                            {selectionNames?.eventName || 'Event Participants'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-accent/50 hover:bg-accent rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in zoom-in-95">
                            <div className="bg-emerald-500/10 p-5 rounded-full ring-8 ring-emerald-500/5">
                                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                            </div>
                            <p className="text-xl font-bold text-foreground">Sync Complete</p>
                            {syncStats && (
                                <div className="grid grid-cols-3 gap-3 w-full bg-accent/30 rounded-2xl p-4 border border-border/50">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase">New</p>
                                        <p className="text-lg font-bold text-foreground">{syncStats.new}</p>
                                    </div>
                                    <div className="text-center border-x border-border/50 px-3">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase">Updates</p>
                                        <p className="text-lg font-bold text-foreground">{syncStats.updated}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-amber-500 uppercase">Missing</p>
                                        <p className="text-lg font-bold text-foreground">{syncStats.missing}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : status === 'loading' ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-6">
                            <div className="relative">
                                <Loader2 className="w-16 h-16 text-teal-500 animate-spin" />
                                <RefreshCw className="w-8 h-8 text-teal-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-lg font-bold text-foreground animate-pulse">Synchronizing...</p>
                        </div>
                    ) : uiMode === 'dashboard' ? (
                        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-1">
                            {/* Active Sources */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Active Sources</h3>
                                    {sources.length > 1 && (
                                        <button onClick={handleSyncAll} className="text-[10px] font-bold text-teal-500 hover:text-teal-400 uppercase tracking-widest transition-colors">
                                            Sync All Sources
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {sources.length > 0 ? sources.map(source => (
                                        <div key={source.id} className="p-4 bg-muted/30 border border-border rounded-2xl flex items-center space-x-4">
                                            <div className="bg-accent p-2.5 rounded-xl">
                                                {source.type === 'google_sheet' ? <FileSpreadsheet className="w-6 h-6 text-teal-500" /> : <FileJson className="w-6 h-6 text-blue-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-bold text-foreground truncate">{source.name}</p>
                                                <div className="flex items-center space-x-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                                                    <span className="capitalize">{source.type === 'csv' ? 'Spreadsheet' : 'Google Sheet'}</span>
                                                    {source.lastSyncedAt && (
                                                        <>
                                                            <span>•</span>
                                                            <div className="flex items-center space-x-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{new Date(source.lastSyncedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                {source.type === 'google_sheet' && (
                                                    <button
                                                        onClick={() => handleSyncSingleSource(source)}
                                                        className="p-2 hover:bg-teal-500/10 rounded-full text-teal-500 transition-colors"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <ActionMenu options={[
                                                    { label: 'Remove Source', icon: <Trash2 className="w-4 h-4" />, variant: 'danger', onClick: () => removeSource(source.id) }
                                                ]} />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-8 border border-dashed border-border rounded-2xl text-center space-y-2 opacity-60">
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No sources connected</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Source Toggle */}
                            <div className="pt-2">
                                <button onClick={() => setUiMode('add_source_select')} className="w-full h-16 bg-foreground text-background hover:bg-foreground/90 rounded-2xl flex items-center justify-center space-x-3 text-sm font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all">
                                    <Plus className="w-5 h-5" />
                                    <span>Add Source</span>
                                </button>
                                {status === 'error' && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold flex items-center space-x-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : uiMode === 'add_source_select' ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Source Type</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setUiMode('upload_spreadsheet')} className="h-28 bg-accent/40 border border-border rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-accent transition-all active:scale-95 shadow-sm">
                                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500"><FileJson className="w-6 h-6" /></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Spreadsheet</span>
                                </button>
                                <button onClick={() => setUiMode('link_sheet')} className="h-28 bg-accent/40 border border-border rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-accent transition-all active:scale-95 shadow-sm">
                                    <div className="bg-teal-500/10 p-3 rounded-xl text-teal-500"><FileSpreadsheet className="w-6 h-6" /></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Connect Google Sheet</span>
                                </button>
                            </div>
                        </div>
                    ) : uiMode === 'link_sheet' ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-left">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Source Name</label>
                                    <Input
                                        placeholder="e.g., Ugadi Registrations"
                                        value={sourceName}
                                        onChange={(e) => setSourceName(e.target.value)}
                                        className="h-14 rounded-2xl bg-accent/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Spreadsheet URL</label>
                                    <Input
                                        placeholder="Paste link..."
                                        value={urlInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setUrlInput(val);
                                            const idMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                                            if (idMatch) setSpreadsheetId(idMatch[1]);
                                            else setSpreadsheetId(val);
                                        }}
                                        className="h-14 rounded-2xl bg-accent/20"
                                    />
                                </div>
                                <button onClick={() => setShowTechnicalSetup(!showTechnicalSetup)} className="w-full flex items-center justify-between p-4 bg-teal-500/5 rounded-2xl border border-teal-500/10">
                                    <div className="flex items-center space-x-2 text-teal-400 font-bold uppercase text-[10px] tracking-widest">
                                        <ShieldCheck className="w-4 h-4" /> <span>Setup Guide</span>
                                    </div>
                                    {showTechnicalSetup ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {showTechnicalSetup && (
                                    <div className="p-4 bg-muted/50 border rounded-2xl space-y-3 animate-in fade-in transition-all">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">1. Share sheet with:</p>
                                        <div className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border">
                                            <code className="text-[10px] font-mono truncate mr-2 text-foreground">{serviceAccountEmail}</code>
                                            <button onClick={() => navigator.clipboard.writeText(serviceAccountEmail)} className="p-1.5 hover:bg-accent rounded-md"><Copy className="w-3.5 h-3.5 mr-0" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button disabled={!spreadsheetId || !sourceName} onClick={handleLinkSheet} className="w-full h-16 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">
                                Link & Sync
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-left">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Source Name</label>
                                    <Input
                                        placeholder="e.g., Spring RSVP List"
                                        value={sourceName}
                                        onChange={(e) => setSourceName(e.target.value)}
                                        className="h-14 rounded-2xl bg-accent/20"
                                    />
                                </div>
                                <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${file ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40'}`}>
                                    <div className="flex flex-col items-center justify-center px-4 text-center">
                                        {file ? <CheckCircle2 className="w-10 h-10 mb-2 text-primary" /> : <div className="bg-accent p-3 rounded-xl mb-2"><FileJson className="w-6 h-6 text-muted-foreground" /></div>}
                                        <p className="text-sm font-bold text-foreground">{file ? file.name : 'Choose Spreadsheet'}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Excel (.xlsx) or CSV (.csv)</p>
                                    </div>
                                    <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => {
                                        const selected = e.target.files?.[0] || null;
                                        setFile(selected);
                                        if (selected && !sourceName) setSourceName(selected.name.split('.')[0]);
                                    }} />
                                </label>
                            </div>
                            <Button disabled={!file || !sourceName} onClick={handleUploadSpreadsheet} className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">
                                Upload & Sync
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
