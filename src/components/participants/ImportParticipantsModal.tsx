import { useEffect, useState } from 'react';
import { useImportParticipants, useSyncGoogleSheet, useImportRuns } from '@/hooks/useParticipants';
import { X, RefreshCw, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Copy, ChevronDown, ChevronRight, Trash2, FileSpreadsheet, FileJson, ArrowLeft, SlidersHorizontal, Clock } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useEventSources, type EventSource } from '@/hooks/useEventSources';
import { ActionMenu } from '@/components/ui/ActionMenu';
import type { ParticipantImportField, ParticipantImportProfile } from '@/lib/participantImportMapping';
import { isImportRunStale } from '@/types/intake';

interface ImportParticipantsModalProps {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
    embedded?: boolean;
    initialMode?: 'dashboard' | 'add_source_select' | 'link_sheet' | 'upload_spreadsheet' | 'mapping_review';
}

const MAPPING_FIELDS: Array<{ key: ParticipantImportField; label: string; helper: string }> = [
    { key: 'firstName', label: 'First Name', helper: 'Participant first-name column' },
    { key: 'lastName', label: 'Last Name', helper: 'Participant last-name column' },
    { key: 'fullName', label: 'Full Name', helper: 'Use when names arrive in one column' },
    { key: 'guardianName', label: 'Guardian Name', helper: 'Parent or guardian full name' },
    { key: 'phone', label: 'Phone', helper: 'Primary family or guardian phone' },
    { key: 'email', label: 'Email', helper: 'Family or participant email' },
    { key: 'age', label: 'Age', helper: 'Numeric age column' },
    { key: 'studentId', label: 'Student ID', helper: 'Stable participant identifier' },
    { key: 'submissionId', label: 'Submission ID', helper: 'Form timestamp, order, or submission id' },
    { key: 'products', label: 'Products / Group', helper: 'Class, package, or group labels' },
    { key: 'specialRequest', label: 'Special Request', helper: 'Accommodation or placement request text' },
    { key: 'notes', label: 'Notes', helper: 'Freeform notes to preserve during import' },
];

export function ImportParticipantsModal({
    eventId,
    isOpen,
    onClose,
    embedded = false,
    initialMode = 'dashboard',
}: ImportParticipantsModalProps) {
    const extractSheetId = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch) return idMatch[1];
        return trimmed;
    };

    const [urlInput, setUrlInput] = useState('');
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sourceName, setSourceName] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [uiMode, setUiMode] = useState<'dashboard' | 'add_source_select' | 'link_sheet' | 'upload_spreadsheet' | 'mapping_review'>('dashboard');
    const [errorMessage, setErrorMessage] = useState('');
    const [syncStats, setSyncStats] = useState<{ new: number; updated: number; missing: number } | null>(null);
    const [syncGaps, setSyncGaps] = useState<string[]>([]);
    const [mappingSource, setMappingSource] = useState<EventSource | null>(null);
    const [draftMapping, setDraftMapping] = useState<ParticipantImportProfile>({});
    const [showTechnicalSetup, setShowTechnicalSetup] = useState(false);
    const [intakeTarget, setIntakeTarget] = useState<'participants' | 'performance_requests'>('participants');
    const [serviceAccountEmail] = useState('inouthub-importer@inouthub-events.iam.gserviceaccount.com');

    const { organizationId } = useSelection();
    const { sources, addSource, removeSource, updateSourceSyncStatus } = useEventSources(eventId);
    const { mutateAsync: importSpreadsheet } = useImportParticipants(eventId);
    const { mutateAsync: syncSheet } = useSyncGoogleSheet(eventId);
    const { data: importRuns } = useImportRuns(eventId);

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
            setSyncGaps([]);
            setMappingSource(null);
            setDraftMapping({});
            setShowTechnicalSetup(false);
            setIntakeTarget('participants');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUiMode(initialMode);
        }
    }, [isOpen, initialMode]);

    if (!isOpen) return null;

    const participantSources = sources.filter((source) => (source.config.intakeTarget || 'participants') === 'participants');
    const performanceRequestSources = sources.filter((source) => source.config.intakeTarget === 'performance_requests');
    const resolvedSpreadsheetId = extractSheetId(urlInput || spreadsheetId);

    const buildSourceConfig = (source: EventSource | { config?: EventSource['config'] }, result: { mapping?: Record<string, string | undefined>; gaps?: string[]; headers?: string[] }) => ({
        ...(source.config || {}),
        inferredMapping: result.mapping,
        mappingGaps: result.gaps || [],
        detectedHeaders: result.headers || [],
        mappingMode: source.config?.mappingMode || 'inferred',
        mappingUpdatedAt: new Date().toISOString(),
    });

    const openMappingReview = (source: EventSource) => {
        setMappingSource(source);
        setDraftMapping(source.config?.inferredMapping || {});
        setUiMode('mapping_review');
    };

    const handleSaveMapping = async () => {
        if (!mappingSource) return;
        await updateSourceSyncStatus({
            sourceId: mappingSource.id,
            lastSyncedAt: mappingSource.lastSyncedAt || new Date().toISOString(),
            config: {
                ...mappingSource.config,
                inferredMapping: draftMapping,
                mappingMode: 'locked',
                mappingUpdatedAt: new Date().toISOString(),
            },
        });
        setUiMode('dashboard');
    };

    const handleLinkSheet = async () => {
        const parsedSheetId = extractSheetId(urlInput || spreadsheetId);
        if (!parsedSheetId || !sourceName.trim()) {
            setStatus('error');
            setErrorMessage('Paste a valid Google Sheet URL or ID before linking this source.');
            return;
        }
        setStatus('loading');
        setSyncGaps([]);
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'google_sheet',
                config: { intakeTarget, sheetId: parsedSheetId, url: urlInput }
            });

            const result = await syncSheet({
                sheetId: parsedSheetId,
                savedMapping: newSource.config?.inferredMapping,
                intakeTarget,
            });
            await updateSourceSyncStatus({
                sourceId: newSource.id,
                lastSyncedAt: new Date().toISOString(),
                config: buildSourceConfig(newSource, result),
            });

            setSyncStats(result.stats);
            setSyncGaps(result.gaps || []);
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
        setSyncGaps([]);
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'csv', // Keeping 'csv' type in DB for compatibility but UI says Spreadsheet
                config: { intakeTarget, fileName: file.name }
            });

            const result = await importSpreadsheet({
                file,
                sourceId: newSource.id,
                savedMapping: newSource.config?.inferredMapping,
                intakeTarget,
            });
            await updateSourceSyncStatus({
                sourceId: newSource.id,
                lastSyncedAt: new Date().toISOString(),
                config: buildSourceConfig(newSource, result),
            });

            setSyncStats(result.stats || null);
            setSyncGaps(result.gaps || []);
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
        setSyncGaps([]);
        const combinedStats = { new: 0, updated: 0, missing: 0 };

        try {
            for (const source of sources) {
                if (source.type === 'google_sheet' && source.config.sheetId) {
                    const result = await syncSheet({
                        sheetId: source.config.sheetId,
                        savedMapping: source.config.inferredMapping,
                        intakeTarget: source.config.intakeTarget || 'participants',
                    });
                    await updateSourceSyncStatus({
                        sourceId: source.id,
                        lastSyncedAt: new Date().toISOString(),
                        config: buildSourceConfig(source, result),
                    });
                    combinedStats.new += result.stats.new;
                    combinedStats.updated += result.stats.updated;
                    combinedStats.missing += result.stats.missing;
                    if (Array.isArray(result.gaps) && result.gaps.length > 0) {
                        setSyncGaps((current) => Array.from(new Set([...current, ...result.gaps])));
                    }
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
        setSyncGaps([]);
        try {
            if (source.type === 'google_sheet' && source.config.sheetId) {
                const result = await syncSheet({
                    sheetId: source.config.sheetId,
                    savedMapping: source.config.inferredMapping,
                    intakeTarget: source.config.intakeTarget || 'participants',
                });
                await updateSourceSyncStatus({
                    sourceId: source.id,
                    lastSyncedAt: new Date().toISOString(),
                    config: buildSourceConfig(source, result),
                });
                setSyncStats(result.stats);
                setSyncGaps(result.gaps || []);
            }
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1500);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || `Failed to sync ${source.name}`);
        }
    };

    const headerTitle =
        uiMode === 'dashboard'
            ? embedded ? 'Import Data Workspace' : 'Import Data'
            : uiMode === 'mapping_review'
                ? 'Review Mapping'
                : uiMode === 'add_source_select'
                    ? 'Add Import'
                    : uiMode === 'link_sheet'
                        ? 'Connect Google Sheet'
                        : 'Upload Spreadsheet';

    const content = (
        <>
            <div className={`flex items-center justify-between border-b border-border/50 ${embedded ? 'px-5 py-4' : 'px-6 py-5'}`}>
                <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                        {uiMode !== 'dashboard' ? (
                            <button
                                onClick={() => {
                                    if (status === 'loading') return;
                                    setUiMode('dashboard');
                                }}
                                disabled={status === 'loading'}
                                className="p-1 -ml-1 hover:bg-accent rounded-full text-muted-foreground mr-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        ) : null}
                        <h2 className={`${embedded ? 'text-lg' : 'text-xl'} font-bold text-foreground`}>{headerTitle}</h2>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1 ml-0.5">
                        {selectionNames?.eventName || 'Current Event'}
                    </span>
                </div>
                {!embedded ? (
                    <button
                        onClick={() => {
                            if (status === 'loading') return;
                            onClose();
                        }}
                        disabled={status === 'loading'}
                        className="p-2.5 bg-accent/50 hover:bg-accent rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                ) : null}
            </div>

            <div className={embedded ? 'p-5' : 'p-6'}>
                    {status === 'error' ? (
                        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">Import Issue</p>
                                    <p className="mt-1 text-sm font-medium text-red-700">{errorMessage || 'The import did not complete. Review the source setup and try again.'}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
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
                            {syncGaps.length > 0 && (
                                <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-left dark:bg-amber-950/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Mapping Review</p>
                                    <div className="mt-2 space-y-1">
                                        {syncGaps.map((gap) => (
                                            <p key={gap} className="text-xs font-medium text-amber-800 dark:text-amber-100">{gap}</p>
                                        ))}
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
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Participant Imports</h3>
                                    {participantSources.length > 1 ? (
                                        <button onClick={handleSyncAll} className="text-[10px] font-bold text-teal-500 hover:text-teal-400 uppercase tracking-widest transition-colors">
                                            Refresh All Imports
                                        </button>
                                    ) : null}
                                </div>
                                <div className="overflow-visible rounded-[1.25rem] border border-border/70 bg-background/70">
                                    {participantSources.length > 0 ? participantSources.map((source, index) => (
                                        <div key={source.id} className={`flex min-h-[60px] items-center gap-3 px-3 ${index < participantSources.length - 1 ? 'border-b border-border/70' : ''}`}>
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                                {source.type === 'google_sheet' ? <FileSpreadsheet className="w-5 h-5 text-teal-500" /> : <FileJson className="w-5 h-5 text-blue-500" />}
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="truncate text-sm font-bold text-foreground">{source.name}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                                    <span>{source.type === 'csv' ? 'Spreadsheet' : 'Google Sheet'}</span>
                                                    {source.lastSyncedAt ? (
                                                        <>
                                                            <span>•</span>
                                                            <span>{new Date(source.lastSyncedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                        </>
                                                    ) : null}
                                                    <span>•</span>
                                                    <span>{source.config.mappingGaps?.length ? `${source.config.mappingGaps.length} gap${source.config.mappingGaps.length > 1 ? 's' : ''}` : 'Mapped'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {source.type === 'google_sheet' ? (
                                                    <button
                                                        onClick={() => handleSyncSingleSource(source)}
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                                                        aria-label={`Refresh ${source.name}`}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                ) : null}
                                                <ActionMenu options={[
                                                    { label: 'Review Mapping', icon: <SlidersHorizontal className="w-4 h-4" />, onClick: () => openMappingReview(source) },
                                                    { label: 'Remove Source', icon: <Trash2 className="w-4 h-4" />, variant: 'danger', onClick: () => removeSource(source.id) }
                                                ]} />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No participant imports connected yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance Request Imports</h3>
                                </div>
                                <div className="overflow-visible rounded-[1.25rem] border border-border/70 bg-background/70">
                                    {performanceRequestSources.length > 0 ? performanceRequestSources.map((source, index) => (
                                        <div key={source.id} className={`flex min-h-[60px] items-center gap-3 px-3 ${index < performanceRequestSources.length - 1 ? 'border-b border-border/70' : ''}`}>
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                                {source.type === 'google_sheet' ? <FileSpreadsheet className="w-5 h-5 text-teal-500" /> : <FileJson className="w-5 h-5 text-blue-500" />}
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="truncate text-sm font-bold text-foreground">{source.name}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                                    <span>{source.type === 'csv' ? 'Spreadsheet' : 'Google Sheet'}</span>
                                                    {source.lastSyncedAt ? (
                                                        <>
                                                            <span>•</span>
                                                            <span>{new Date(source.lastSyncedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                        </>
                                                    ) : null}
                                                    <span>•</span>
                                                    <span>{source.config.mappingGaps?.length ? `${source.config.mappingGaps.length} gap${source.config.mappingGaps.length > 1 ? 's' : ''}` : 'Mapped'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {source.type === 'google_sheet' ? (
                                                    <button
                                                        onClick={() => handleSyncSingleSource(source)}
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                                                        aria-label={`Refresh ${source.name}`}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                ) : null}
                                                <ActionMenu options={[
                                                    { label: 'Remove Source', icon: <Trash2 className="w-4 h-4" />, variant: 'danger', onClick: () => removeSource(source.id) }
                                                ]} />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No performance request imports connected yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recent Sync Activity</h3>
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/70 divide-y divide-border/70">
                                    {importRuns && importRuns.length > 0 ? importRuns.map((run) => {
                                        const isStale = isImportRunStale(run);
                                        const stats = run.stats as any || {};
                                        return (
                                            <div key={run.id} className="p-3 text-left">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`h-2 w-2 rounded-full ${
                                                            run.status === 'succeeded' ? 'bg-emerald-500' :
                                                            run.status === 'running' ? (isStale ? 'bg-amber-500' : 'bg-blue-500 animate-pulse') :
                                                            run.status === 'rolled_back' ? 'bg-gray-400' :
                                                            'bg-red-500'
                                                        }`} />
                                                        <span className="text-xs font-bold text-foreground capitalize">
                                                            {run.source_name || (run.import_target === 'performance_requests' ? 'Performance Request Sync' : 'Participant Sync')}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        {new Date(run.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {run.status === 'running' ? (isStale ? 'Stale / Timed Out' : 'Syncing...') : 
                                                             run.status === 'succeeded' ? `${stats.new || 0} new, ${stats.updated || 0} updated` : 
                                                             run.status === 'rolled_back' ? 'Changes rolled back' :
                                                             run.error_message || 'Sync failed'}
                                                        </p>
                                                        {run.status === 'blocked' && run.blocking_issues && (run.blocking_issues as string[]).length > 0 && (
                                                            <p className="text-[9px] text-amber-600 font-medium leading-tight mt-0.5">
                                                                Stopped: {(run.blocking_issues as string[])[0]}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No recent sync activity.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : uiMode === 'mapping_review' ? (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 text-left">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black tracking-tight text-foreground">Review Mapping</h3>
                                <p className="text-xs text-muted-foreground">
                                    {mappingSource?.name || 'Source'} should land in the right participant fields before operators trust the sync.
                                </p>
                            </div>
                            {mappingSource?.config.mappingGaps && mappingSource.config.mappingGaps.length > 0 && (
                                <div className="rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Needs Confirmation</p>
                                    <div className="mt-2 space-y-1">
                                        {mappingSource.config.mappingGaps.map((gap) => (
                                            <p key={gap} className="text-xs font-medium text-amber-800 dark:text-amber-100">{gap}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                {MAPPING_FIELDS.map((field) => {
                                    const headers = mappingSource?.config.detectedHeaders || [];
                                    const selectedValue = draftMapping[field.key] || '';
                                    return (
                                        <div key={field.key} className="rounded-2xl border border-border/70 bg-accent/15 p-3.5">
                                            <div className="mb-2">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{field.label}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{field.helper}</p>
                                            </div>
                                            <select
                                                value={selectedValue}
                                                onChange={(event) => setDraftMapping((current) => ({
                                                    ...current,
                                                    [field.key]: event.target.value || undefined,
                                                }))}
                                                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                                            >
                                                <option value="">Not mapped</option>
                                                {headers.map((header) => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => setUiMode('dashboard')}
                                    className="h-12 rounded-2xl"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSaveMapping}
                                    className="h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                                >
                                    Save Mapping
                                </Button>
                            </div>
                        </div>
                    ) : uiMode === 'add_source_select' ? (
                        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black tracking-tight text-foreground">Choose what you are importing</h3>
                                <p className="text-xs text-muted-foreground">Choose the intake lane first so spreadsheets and Google Sheets land in the correct operational workflow.</p>
                            </div>
                            <div className="grid gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIntakeTarget('participants')}
                                    className={`rounded-[1.25rem] border p-4 text-left transition-colors ${intakeTarget === 'participants' ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-background/80'}`}
                                >
                                    <p className="text-sm font-black text-foreground">Participants</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Use this for roster spreadsheets and participant refreshes.</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIntakeTarget('performance_requests')}
                                    className={`rounded-[1.25rem] border p-4 text-left transition-colors ${intakeTarget === 'performance_requests' ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-background/80'}`}
                                >
                                    <p className="text-sm font-black text-foreground">Performance Requests</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Use this for partner submissions and external request files before conversion into live performances.</p>
                                </button>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Import Method</h3>
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
                                            setSpreadsheetId(extractSheetId(val));
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
                            <Button disabled={!resolvedSpreadsheetId || !sourceName.trim()} onClick={handleLinkSheet} className="w-full h-16 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">
                                Link & Refresh
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
                                Upload & Refresh
                            </Button>
                        </div>
                    )}
            </div>
        </>
    );

    if (embedded) {
        return (
            <div className="surface-panel overflow-hidden rounded-[1.5rem] border">
                {content}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border-t sm:border border-border w-full max-w-md sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                {content}
            </div>
        </div>
    );
}
