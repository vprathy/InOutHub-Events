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
import { useCreateSubmissionRosterBatch, useSubmissionRosterBatches } from '@/hooks/useExternalProgramSubmissions';
import type { SubmissionRosterUploadBatch } from '@/types/domain';

interface ImportParticipantsModalProps {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
    mode?: 'participants' | 'external_submission';
    submissionId?: string | null;
    submissionLabel?: string | null;
}

export function ImportParticipantsModal({
    eventId,
    isOpen,
    onClose,
    mode = 'participants',
    submissionId = null,
    submissionLabel = null,
}: ImportParticipantsModalProps) {
    const [urlInput, setUrlInput] = useState('');
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sourceName, setSourceName] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [uiMode, setUiMode] = useState<'dashboard' | 'add_source_select' | 'link_sheet' | 'upload_spreadsheet'>('dashboard');
    const [errorMessage, setErrorMessage] = useState('');
    const [syncStats, setSyncStats] = useState<{ new: number; updated: number; missing: number } | null>(null);
    const [rosterStats, setRosterStats] = useState<{ ready: number; warning: number; blocked: number } | null>(null);
    const [showTechnicalSetup, setShowTechnicalSetup] = useState(false);
    const [serviceAccountEmail] = useState('inouthub-importer@inouthub-events.iam.gserviceaccount.com');

    const isParticipantMode = mode === 'participants';
    const { organizationId } = useSelection();
    const { sources, addSource, removeSource, updateSourceSyncStatus } = useEventSources(eventId);
    const { mutateAsync: importSpreadsheet } = useImportParticipants(eventId);
    const { mutateAsync: syncSheet } = useSyncGoogleSheet(eventId);
    const { data: rosterBatches = [] } = useSubmissionRosterBatches(isParticipantMode ? null : submissionId);
    const { mutateAsync: createSubmissionBatch } = useCreateSubmissionRosterBatch(eventId);

    const { data: selectionNames } = useQuery({
        queryKey: ['selection-metadata', organizationId, eventId],
        queryFn: async () => {
            const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single();
            return { eventName: event?.name };
        },
        enabled: isOpen && !!eventId,
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
            setRosterStats(null);
            setShowTechnicalSetup(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleLinkSheet = async () => {
        if (!isParticipantMode) return;
        if (!spreadsheetId || !sourceName) return;
        setStatus('loading');
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'google_sheet',
                config: { sheetId: spreadsheetId, url: urlInput },
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
        if (!file) return;
        setStatus('loading');
        try {
            if (isParticipantMode) {
                if (!sourceName) return;
                const newSource = await addSource({
                    eventId,
                    name: sourceName,
                    type: 'csv',
                    config: { fileName: file.name },
                });

                await importSpreadsheet({ file, sourceId: newSource.id });
                await updateSourceSyncStatus({ sourceId: newSource.id, lastSyncedAt: new Date().toISOString() });

                setStatus('success');
                setTimeout(() => {
                    setUiMode('dashboard');
                    setStatus('idle');
                    setFile(null);
                }, 1500);
                return;
            }

            if (!submissionId) throw new Error('Approved submission context is required.');
            const batch = await createSubmissionBatch({ submissionId, file });
            setRosterStats({
                ready: batch.summaryReadyCount,
                warning: batch.summaryWarningCount,
                blocked: batch.summaryBlockedCount,
            });
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
        if (!isParticipantMode || sources.length === 0) return;
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
        if (!isParticipantMode) return;
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center">
            <div className="w-full max-w-md overflow-hidden border-t border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-300 sm:rounded-2xl sm:border sm:zoom-in-95">
                <div className="flex items-center justify-between border-b border-border/50 px-6 py-5">
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                            {uiMode !== 'dashboard' && (
                                <button onClick={() => setUiMode('dashboard')} className="mr-1 -ml-1 rounded-full p-1 text-muted-foreground hover:bg-accent">
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            )}
                            <h2 className="text-xl font-bold text-foreground">Sync Board</h2>
                        </div>
                        <span className="mt-1 ml-0.5 text-[10px] font-bold uppercase tracking-widest leading-none text-muted-foreground">
                            {isParticipantMode ? selectionNames?.eventName || 'Event Participants' : submissionLabel || 'Approved External Roster'}
                        </span>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-accent/50 p-2.5 transition-colors hover:bg-accent">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6">
                    {status === 'success' ? (
                        <div className="animate-in zoom-in-95 flex flex-col items-center justify-center space-y-4 py-10">
                            <div className="rounded-full bg-emerald-500/10 p-5 ring-8 ring-emerald-500/5">
                                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                            </div>
                            <p className="text-xl font-bold text-foreground">{isParticipantMode ? 'Sync Complete' : 'Roster Uploaded'}</p>
                            {isParticipantMode && syncStats ? (
                                <div className="grid w-full grid-cols-3 gap-3 rounded-2xl border border-border/50 bg-accent/30 p-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold uppercase text-emerald-500">New</p>
                                        <p className="text-lg font-bold text-foreground">{syncStats.new}</p>
                                    </div>
                                    <div className="border-x border-border/50 px-3 text-center">
                                        <p className="text-[10px] font-bold uppercase text-blue-500">Updates</p>
                                        <p className="text-lg font-bold text-foreground">{syncStats.updated}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold uppercase text-amber-500">Missing</p>
                                        <p className="text-lg font-bold text-foreground">{syncStats.missing}</p>
                                    </div>
                                </div>
                            ) : null}
                            {!isParticipantMode && rosterStats ? (
                                <div className="grid w-full grid-cols-3 gap-3 rounded-2xl border border-border/50 bg-accent/30 p-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold uppercase text-emerald-500">Ready</p>
                                        <p className="text-lg font-bold text-foreground">{rosterStats.ready}</p>
                                    </div>
                                    <div className="border-x border-border/50 px-3 text-center">
                                        <p className="text-[10px] font-bold uppercase text-amber-500">Warnings</p>
                                        <p className="text-lg font-bold text-foreground">{rosterStats.warning}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold uppercase text-rose-500">Blocked</p>
                                        <p className="text-lg font-bold text-foreground">{rosterStats.blocked}</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : status === 'loading' ? (
                        <div className="flex flex-col items-center justify-center space-y-6 py-16">
                            <div className="relative">
                                <Loader2 className="h-16 w-16 animate-spin text-teal-500" />
                                <RefreshCw className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-teal-500/50" />
                            </div>
                            <p className="text-lg font-bold text-foreground animate-pulse">{isParticipantMode ? 'Synchronizing...' : 'Uploading roster...'}</p>
                        </div>
                    ) : uiMode === 'dashboard' ? (
                        <div className="max-h-[70vh] space-y-8 overflow-y-auto pr-1">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{isParticipantMode ? 'Active Sources' : 'Recent Roster Batches'}</h3>
                                    {isParticipantMode && sources.length > 1 ? (
                                        <button onClick={handleSyncAll} className="text-[10px] font-bold uppercase tracking-widest text-teal-500 transition-colors hover:text-teal-400">
                                            Sync All Sources
                                        </button>
                                    ) : null}
                                </div>
                                <div className="space-y-3">
                                    {isParticipantMode ? (
                                        sources.length > 0 ? (
                                            sources.map((source) => (
                                                <div key={source.id} className="flex items-center space-x-4 rounded-2xl border border-border bg-muted/30 p-4">
                                                    <div className="rounded-xl bg-accent p-2.5">
                                                        {source.type === 'google_sheet' ? <FileSpreadsheet className="h-6 w-6 text-teal-500" /> : <FileJson className="h-6 w-6 text-blue-500" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className="truncate text-sm font-bold text-foreground">{source.name}</p>
                                                        <div className="mt-0.5 flex items-center space-x-2 text-[10px] font-medium text-muted-foreground">
                                                            <span className="capitalize">{source.type === 'csv' ? 'Spreadsheet' : 'Google Sheet'}</span>
                                                            {source.lastSyncedAt ? (
                                                                <>
                                                                    <span>•</span>
                                                                    <div className="flex items-center space-x-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        <span>{new Date(source.lastSyncedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                                    </div>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        {source.type === 'google_sheet' ? (
                                                            <button onClick={() => handleSyncSingleSource(source)} className="rounded-full p-2 text-teal-500 transition-colors hover:bg-teal-500/10">
                                                                <RefreshCw className="h-4 w-4" />
                                                            </button>
                                                        ) : null}
                                                        <ActionMenu options={[{ label: 'Remove Source', icon: <Trash2 className="h-4 w-4" />, variant: 'danger', onClick: () => removeSource(source.id) }]} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="space-y-2 rounded-2xl border border-dashed border-border p-8 text-center opacity-60">
                                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No sources connected</p>
                                            </div>
                                        )
                                    ) : (
                                        rosterBatches.length > 0 ? (
                                            rosterBatches.map((batch: SubmissionRosterUploadBatch) => (
                                                <div key={batch.id} className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="rounded-xl bg-accent p-2.5">
                                                            <FileSpreadsheet className="h-6 w-6 text-blue-500" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 text-left">
                                                            <p className="truncate text-sm font-bold text-foreground">{batch.fileName}</p>
                                                            <div className="mt-0.5 flex items-center space-x-2 text-[10px] font-medium text-muted-foreground">
                                                                <span>Approved roster onboarding</span>
                                                                <span>•</span>
                                                                <span>{new Date(batch.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-center">
                                                            <p className="text-[10px] font-bold uppercase text-emerald-700">Ready</p>
                                                            <p className="text-sm font-black text-emerald-700">{batch.summaryReadyCount}</p>
                                                        </div>
                                                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center">
                                                            <p className="text-[10px] font-bold uppercase text-amber-700">Warnings</p>
                                                            <p className="text-sm font-black text-amber-700">{batch.summaryWarningCount}</p>
                                                        </div>
                                                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-center">
                                                            <p className="text-[10px] font-bold uppercase text-rose-700">Blocked</p>
                                                            <p className="text-sm font-black text-rose-700">{batch.summaryBlockedCount}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="space-y-2 rounded-2xl border border-dashed border-border p-8 text-center opacity-60">
                                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No roster batches yet</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button onClick={() => setUiMode('add_source_select')} className="flex h-16 w-full items-center justify-center space-x-3 rounded-2xl bg-foreground text-sm font-black uppercase tracking-widest text-background shadow-xl transition-all active:scale-[0.98] hover:bg-foreground/90">
                                    <Plus className="h-5 w-5" />
                                    <span>{isParticipantMode ? 'Add Source' : 'Add Roster Source'}</span>
                                </button>
                                {status === 'error' ? (
                                    <div className="mt-4 flex items-center space-x-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[10px] font-bold text-red-500">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : uiMode === 'add_source_select' ? (
                        <div className="animate-in slide-in-from-bottom-4 space-y-4 duration-300">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Source Type</h3>
                            <div className={`grid gap-4 ${isParticipantMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <button onClick={() => setUiMode('upload_spreadsheet')} className="flex h-28 flex-col items-center justify-center space-y-2 rounded-2xl border border-border bg-accent/40 shadow-sm transition-all active:scale-95 hover:bg-accent">
                                    <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500"><FileJson className="h-6 w-6" /></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Spreadsheet</span>
                                </button>
                                {isParticipantMode ? (
                                    <button onClick={() => setUiMode('link_sheet')} className="flex h-28 flex-col items-center justify-center space-y-2 rounded-2xl border border-border bg-accent/40 shadow-sm transition-all active:scale-95 hover:bg-accent">
                                        <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500"><FileSpreadsheet className="h-6 w-6" /></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Connect Google Sheet</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ) : uiMode === 'link_sheet' ? (
                        <div className="animate-in slide-in-from-right-4 space-y-6 text-left duration-300">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Name</label>
                                    <Input
                                        placeholder="e.g., Ugadi Registrations"
                                        value={sourceName}
                                        onChange={(e) => setSourceName(e.target.value)}
                                        className="h-14 rounded-2xl bg-accent/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spreadsheet URL</label>
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
                                <button onClick={() => setShowTechnicalSetup(!showTechnicalSetup)} className="flex w-full items-center justify-between rounded-2xl border border-teal-500/10 bg-teal-500/5 p-4">
                                    <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-teal-400">
                                        <ShieldCheck className="h-4 w-4" /> <span>Setup Guide</span>
                                    </div>
                                    {showTechnicalSetup ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                {showTechnicalSetup ? (
                                    <div className="animate-in space-y-3 rounded-2xl border bg-muted/50 p-4 transition-all fade-in">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">1. Share sheet with:</p>
                                        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5">
                                            <code className="mr-2 truncate text-[10px] font-mono text-foreground">{serviceAccountEmail}</code>
                                            <button onClick={() => navigator.clipboard.writeText(serviceAccountEmail)} className="rounded-md p-1.5 hover:bg-accent"><Copy className="mr-0 h-3.5 w-3.5" /></button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <Button disabled={!spreadsheetId || !sourceName} onClick={handleLinkSheet} className="h-16 w-full rounded-2xl bg-teal-600 font-black uppercase tracking-widest text-white shadow-lg hover:bg-teal-500">
                                Link & Sync
                            </Button>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right-4 space-y-6 text-left duration-300">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {isParticipantMode ? (
                                        <>
                                            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Name</label>
                                            <Input
                                                placeholder="e.g., Spring RSVP List"
                                                value={sourceName}
                                                onChange={(e) => setSourceName(e.target.value)}
                                                className="h-14 rounded-2xl bg-accent/20"
                                            />
                                        </>
                                    ) : (
                                        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                                            Roster onboarding for: <span className="font-bold">{submissionLabel || 'Approved external submission'}</span>
                                        </div>
                                    )}
                                </div>
                                <label className={`flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all ${file ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40'}`}>
                                    <div className="flex flex-col items-center justify-center px-4 text-center">
                                        {file ? <CheckCircle2 className="mb-2 h-10 w-10 text-primary" /> : <div className="mb-2 rounded-xl bg-accent p-3"><FileJson className="h-6 w-6 text-muted-foreground" /></div>}
                                        <p className="text-sm font-bold text-foreground">{file ? file.name : 'Choose Spreadsheet'}</p>
                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                            {isParticipantMode ? 'Excel (.xlsx) or CSV (.csv)' : 'Excel (.xlsx), CSV (.csv), or tab-delimited text'}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".csv,.xlsx,.xls,.txt,text/csv,text/plain,text/tab-separated-values"
                                        onChange={(e) => {
                                            const selected = e.target.files?.[0] || null;
                                            setFile(selected);
                                            if (selected && !sourceName && isParticipantMode) setSourceName(selected.name.split('.')[0]);
                                        }}
                                    />
                                </label>
                            </div>
                            <Button disabled={!file || (isParticipantMode && !sourceName)} onClick={handleUploadSpreadsheet} className="h-16 w-full rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-white shadow-lg hover:bg-blue-500">
                                {isParticipantMode ? 'Upload & Sync' : 'Upload & Stage'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
