import { useEffect, useMemo, useState } from 'react';
import { useImportParticipants, useSyncGoogleSheet, useImportRuns } from '@/hooks/useParticipants';
import { X, RefreshCw, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Copy, ChevronDown, ChevronRight, Trash2, FileSpreadsheet, FileJson, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useEventSources, type EventSource } from '@/hooks/useEventSources';
import { ActionMenu } from '@/components/ui/ActionMenu';
import type {
    ParticipantImportField,
    PerformanceRequestImportField,
} from '@/lib/participantImportMapping';
import { isImportRunStale } from '@/types/intake';
import { reportClientError } from '@/lib/clientErrorReporting';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';

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

const REQUEST_MAPPING_FIELDS: Array<{ key: PerformanceRequestImportField; label: string; helper: string }> = [
    { key: 'title', label: 'Request Title', helper: 'Performance, act, or program title' },
    { key: 'leadFirstName', label: 'Requestor First Name', helper: 'Primary contact first name' },
    { key: 'leadLastName', label: 'Requestor Last Name', helper: 'Primary contact last name' },
    { key: 'leadName', label: 'Requestor Full Name', helper: 'Use when contact name arrives in one column' },
    { key: 'leadEmail', label: 'Requestor Email', helper: 'Primary contact email' },
    { key: 'leadPhone', label: 'Requestor Phone', helper: 'Primary contact phone' },
    { key: 'durationMinutes', label: 'Duration', helper: 'Estimated runtime in minutes' },
    { key: 'musicSupplied', label: 'Music Supplied', helper: 'Yes or no music status' },
    { key: 'rosterSupplied', label: 'Roster Supplied', helper: 'Yes or no roster status' },
    { key: 'notes', label: 'Notes', helper: 'Freeform request notes' },
    { key: 'sourceAnchor', label: 'Source Identity', helper: 'Stable request id, submission id, or timestamp' },
];

const IMPORT_PROGRESS_STEPS = [
    'Connecting to source',
    'Reading source rows',
    'Matching columns',
    'Saving intake records',
    'Finalizing sync',
];

const IMPORT_FIELD_LABELS: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    fullName: 'Full Name',
    parentFirstName: 'Parent First Name',
    parentLastName: 'Parent Last Name',
    guardianName: 'Guardian Name',
    phone: 'Phone',
    email: 'Email',
    age: 'Age',
    notes: 'Notes',
    studentId: 'Student ID',
    submissionId: 'Submission ID',
    products: 'Products / Group',
    specialRequest: 'Special Request',
    title: 'Request Title',
    leadName: 'Lead Name',
    leadEmail: 'Lead Email',
    leadPhone: 'Lead Phone',
    durationMinutes: 'Duration',
    musicSupplied: 'Music Supplied',
    rosterSupplied: 'Roster Supplied',
    sourceAnchor: 'Source Identity',
};

type SyncSummary = {
    sourceName: string;
    intakeTarget: 'participants' | 'performance_requests';
    stats: { new: number; updated: number; missing: number; total?: number };
    probableTarget?: 'participants' | 'performance_requests' | 'unknown';
    confidence?: 'high' | 'medium' | 'low';
    gaps: string[];
    warnings?: string[];
    blockingIssues?: string[];
    reviewRequired?: boolean;
    profileHash?: string;
    driftSummary?: string[];
    sourceState?: 'inferred' | 'locked' | 'drifted' | 'blocked';
    preservedFieldCount?: number;
    usedFields?: Array<{ field: string; header: string }>;
    headers: string[];
    mapping: Record<string, string | undefined>;
};

type RecentImportRun = {
    id: string;
    event_source_id: string | null;
    source_name?: string | null;
    import_target?: 'participants' | 'performance_requests';
    status: string;
    started_at: string;
    stats?: { new?: number; updated?: number; missing?: number };
    error_message?: string | null;
    blocking_issues?: string[] | null;
};

type ImportSyncResult = {
    stats?: { new: number; updated: number; missing: number; total?: number };
    mapping?: Record<string, string | undefined>;
    gaps?: string[];
    warnings?: string[];
    blockingIssues?: string[];
    probableTarget?: 'participants' | 'performance_requests' | 'unknown';
    confidence?: 'high' | 'medium' | 'low';
    headers?: string[];
    reviewRequired?: boolean;
    profileHash?: string;
    driftSummary?: string[];
    sourceState?: 'inferred' | 'locked' | 'drifted' | 'blocked';
    preservedFieldCount?: number;
    usedFields?: Array<{ field: string; header: string }>;
};

type SourceTrustStep = {
    label: string;
    complete: boolean;
};

function formatIntakeTargetLabel(target: 'participants' | 'performance_requests') {
    return target === 'performance_requests' ? 'Performance Requests' : 'Participants';
}

function summarizeMappedFields(mapping: Record<string, string | undefined>) {
    return Object.entries(mapping)
        .filter(([, header]) => !!header)
        .map(([field, header]) => ({
            label: IMPORT_FIELD_LABELS[field] || field,
            header: header as string,
        }));
}

function buildLockedSourceConfig(
    source: EventSource | { config?: EventSource['config'] },
    result: SyncSummary,
    approvedMapping: Record<string, string | undefined>,
): EventSource['config'] {
    return {
        ...(source.config || {}),
        inferredMapping: result.mapping,
        lockedMapping: approvedMapping,
        mappingGaps: result.gaps || [],
        mappingWarnings: result.warnings || [],
        detectedHeaders: result.headers || [],
        mappingMode: result.sourceState === 'blocked' ? 'blocked' : 'locked',
        mappingUpdatedAt: new Date().toISOString(),
        profileHash: result.profileHash,
        lockedProfileHash: result.profileHash,
        lockedTarget: result.probableTarget || result.intakeTarget,
        probableTarget: result.probableTarget || result.intakeTarget,
        reviewRequired: false,
        driftSummary: [],
        lastConfirmedAt: new Date().toISOString(),
    };
}

function buildInferredSourceConfig(
    source: EventSource | { config?: EventSource['config'] },
    result: SyncSummary,
): EventSource['config'] {
    return {
        ...(source.config || {}),
        inferredMapping: result.mapping,
        mappingGaps: result.gaps || [],
        mappingWarnings: result.warnings || [],
        detectedHeaders: result.headers || [],
        mappingMode: result.sourceState || 'inferred',
        mappingUpdatedAt: new Date().toISOString(),
        profileHash: result.profileHash,
        lockedTarget: source.config?.lockedTarget,
        lockedProfileHash: source.config?.lockedProfileHash,
        probableTarget: result.probableTarget || result.intakeTarget,
        reviewRequired: result.reviewRequired ?? true,
        driftSummary: result.driftSummary || [],
    };
}

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
    const [reportedSupportCode, setReportedSupportCode] = useState<string | null>(null);
    const [syncStats, setSyncStats] = useState<{ new: number; updated: number; missing: number } | null>(null);
    const [syncGaps, setSyncGaps] = useState<string[]>([]);
    const [lastSyncSummary, setLastSyncSummary] = useState<SyncSummary | null>(null);
    const [mappingSource, setMappingSource] = useState<EventSource | null>(null);
    const [mappingAssessment, setMappingAssessment] = useState<SyncSummary | null>(null);
    const [draftMapping, setDraftMapping] = useState<Record<string, string | undefined>>({});
    const [showTechnicalSetup, setShowTechnicalSetup] = useState(false);
    const [intakeTarget, setIntakeTarget] = useState<'participants' | 'performance_requests'>('participants');
    const [serviceAccountEmail] = useState('inouthub-importer@inouthub-events.iam.gserviceaccount.com');
    const [currentSyncContext, setCurrentSyncContext] = useState<{ sourceName: string; intakeTarget: 'participants' | 'performance_requests' } | null>(null);
    const [loadingStepIndex, setLoadingStepIndex] = useState(0);

    const { organizationId } = useSelection();
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole } = useCurrentOrgRole(organizationId || null);
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
            setReportedSupportCode(null);
            setSyncStats(null);
            setSyncGaps([]);
            setLastSyncSummary(null);
            setMappingSource(null);
            setMappingAssessment(null);
            setDraftMapping({});
            setShowTechnicalSetup(false);
            setIntakeTarget('participants');
            setCurrentSyncContext(null);
            setLoadingStepIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUiMode(initialMode);
        }
    }, [isOpen, initialMode]);

    const participantSources = sources.filter((source) => (source.config.intakeTarget || 'participants') === 'participants');
    const performanceRequestSources = sources.filter((source) => source.config.intakeTarget === 'performance_requests');
    const resolvedSpreadsheetId = extractSheetId(urlInput || spreadsheetId);
    const latestRunBySource = useMemo(() => {
        const map = new Map<string, RecentImportRun>();
        for (const run of (importRuns || []) as RecentImportRun[]) {
            if (!run.event_source_id) continue;
            if (!map.has(run.event_source_id)) {
                map.set(run.event_source_id, run);
            }
        }
        return map;
    }, [importRuns]);

    const recordImportError = async (message: string, error: unknown, context?: Record<string, unknown>) => {
        const result = await reportClientError({
            featureArea: 'import_data',
            message,
            error,
            organizationId: organizationId || null,
            eventId,
            orgRole: currentOrgRole || null,
            eventRole: currentEventRole || null,
            context: {
                intakeTarget,
                uiMode,
                ...context,
            },
        });
        setReportedSupportCode(result.supportCode);
    };

    const buildSyncSummary = (
        sourceNameValue: string,
        intakeTargetValue: 'participants' | 'performance_requests',
        result: {
            stats?: { new: number; updated: number; missing: number; total?: number };
            mapping?: Record<string, string | undefined>;
            gaps?: string[];
            headers?: string[];
            probableTarget?: 'participants' | 'performance_requests' | 'unknown';
            confidence?: 'high' | 'medium' | 'low';
            warnings?: string[];
            blockingIssues?: string[];
            reviewRequired?: boolean;
            profileHash?: string;
            driftSummary?: string[];
            sourceState?: 'inferred' | 'locked' | 'drifted' | 'blocked';
            preservedFieldCount?: number;
            usedFields?: Array<{ field: string; header: string }>;
        }
    ): SyncSummary => ({
        sourceName: sourceNameValue,
        intakeTarget: intakeTargetValue,
        stats: result.stats || { new: 0, updated: 0, missing: 0 },
        probableTarget: result.probableTarget,
        confidence: result.confidence,
        gaps: result.gaps || [],
        warnings: result.warnings || [],
        blockingIssues: result.blockingIssues || [],
        reviewRequired: result.reviewRequired,
        profileHash: result.profileHash,
        driftSummary: result.driftSummary || [],
        sourceState: result.sourceState,
        preservedFieldCount: result.preservedFieldCount,
        usedFields: result.usedFields || [],
        headers: result.headers || [],
        mapping: result.mapping || {},
    });

    useEffect(() => {
        if (status !== 'loading') {
            setLoadingStepIndex(0);
            if (status !== 'success') {
                setCurrentSyncContext(null);
            }
            return;
        }

        const interval = window.setInterval(() => {
            setLoadingStepIndex((current) => (current + 1) % IMPORT_PROGRESS_STEPS.length);
        }, 1400);

        return () => window.clearInterval(interval);
    }, [status]);

    if (!isOpen) return null;

    const openMappingReview = (source: EventSource) => {
        setMappingSource(source);
        setMappingAssessment(buildSyncSummary(source.name, source.config.intakeTarget || 'participants', {
            mapping: source.config?.inferredMapping || {},
            gaps: source.config?.mappingGaps || [],
            warnings: source.config?.mappingWarnings || [],
            probableTarget: source.config?.probableTarget,
            reviewRequired: source.config?.reviewRequired,
            profileHash: source.config?.profileHash,
            driftSummary: source.config?.driftSummary || [],
            sourceState: source.config?.mappingMode === 'blocked'
                ? 'blocked'
                : source.config?.mappingMode === 'drifted'
                    ? 'drifted'
                    : source.config?.mappingMode === 'locked'
                        ? 'locked'
                        : 'inferred',
            headers: source.config?.detectedHeaders || [],
        }));
        setDraftMapping(source.config?.lockedMapping || source.config?.inferredMapping || {});
        setUiMode('mapping_review');
    };

    const sourcesNeedingReview = sources.filter((source) => source.config.reviewRequired || source.config.mappingMode !== 'locked');
    const lockedSources = sources.filter((source) => !source.config.reviewRequired && source.config.mappingMode === 'locked');
    const trustedSyncedSources = lockedSources.filter((source) => !!source.lastSyncedAt);
    const lockedUnsyncedSource = lockedSources.find((source) => !source.lastSyncedAt) || null;
    const nextReviewSource = sourcesNeedingReview[0] || null;
    const trustSteps: SourceTrustStep[] = [
        { label: 'Connect source', complete: sources.length > 0 },
        { label: 'Confirm mapping', complete: sources.length > 0 && sourcesNeedingReview.length === 0 },
        { label: 'Run trusted sync', complete: trustedSyncedSources.length > 0 },
    ];

    let sourceTrustTitle = 'Connect your first source';
    let sourceTrustBody = 'Start by linking a Google Sheet or uploading a spreadsheet so this event has an intake source to trust.';
    let sourceTrustActionLabel = 'Add Source';
    let sourceTrustAction: (() => void) | null = () => setUiMode('add_source_select');
    let sourceTrustToneClassName = 'border-primary/20 bg-primary/5';

    if (nextReviewSource) {
        sourceTrustTitle = 'Review mapping before trust is granted';
        sourceTrustBody = `${nextReviewSource.name} still needs mapping confirmation or drift review before it can become a trusted repeat sync.`;
        sourceTrustActionLabel = 'Review Mapping';
        sourceTrustAction = () => openMappingReview(nextReviewSource);
        sourceTrustToneClassName = 'border-amber-400/30 bg-amber-500/5';
    } else if (lockedUnsyncedSource) {
        sourceTrustTitle = 'Run the first trusted sync';
        sourceTrustBody = `${lockedUnsyncedSource.name} is locked and ready. Run the first sync so this source becomes a reusable event intake lane.`;
        sourceTrustActionLabel = lockedUnsyncedSource.type === 'google_sheet' ? 'Sync Source' : 'Confirm Import';
        sourceTrustAction = lockedUnsyncedSource.type === 'google_sheet'
            ? () => { void handleSyncSingleSource(lockedUnsyncedSource); }
            : () => setUiMode('upload_spreadsheet');
        sourceTrustToneClassName = 'border-blue-400/30 bg-blue-500/5';
    } else if (trustedSyncedSources.length > 0) {
        sourceTrustTitle = 'Trusted sync is active';
        sourceTrustBody = `${trustedSyncedSources.length} source${trustedSyncedSources.length > 1 ? 's are' : ' is'} already locked and synced. Additional sources can follow the same trust path without engineering help.`;
        sourceTrustActionLabel = 'Add Another Source';
        sourceTrustAction = () => setUiMode('add_source_select');
        sourceTrustToneClassName = 'border-emerald-400/30 bg-emerald-500/5';
    }

    const handleLinkSheet = async () => {
        const parsedSheetId = extractSheetId(urlInput || spreadsheetId);
        if (!parsedSheetId || !sourceName.trim()) {
            setStatus('error');
            setErrorMessage('Paste a valid Google Sheet URL or ID before linking this source.');
            return;
        }
        setStatus('loading');
        setCurrentSyncContext({ sourceName, intakeTarget });
        setReportedSupportCode(null);
        setSyncGaps([]);
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'google_sheet',
                config: { intakeTarget, sheetId: parsedSheetId, url: urlInput, mappingMode: 'inferred', reviewRequired: true }
            });

            const result = await syncSheet({
                sheetId: parsedSheetId,
                mode: 'profile_only',
                savedMapping: newSource.config?.lockedMapping || newSource.config?.inferredMapping,
                intakeTarget,
            });
            const profileSummary = buildSyncSummary(sourceName, intakeTarget, result);
            await updateSourceSyncStatus({
                sourceId: newSource.id,
                config: buildInferredSourceConfig(newSource, profileSummary),
            });
            setMappingSource({
                ...newSource,
                lastSyncedAt: null,
                createdAt: new Date().toISOString(),
                config: buildInferredSourceConfig(newSource, profileSummary),
            });
            setMappingAssessment(profileSummary);
            setDraftMapping(profileSummary.mapping);
            setStatus('idle');
            setUiMode('mapping_review');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to link Google Sheet';
            setStatus('error');
            setErrorMessage(message);
            await recordImportError(message, err, {
                sourceName,
                sourceType: 'google_sheet',
                spreadsheetId: parsedSheetId,
            });
        }
    };

    const handleUploadSpreadsheet = async () => {
        if (!file || !sourceName) return;
        setStatus('loading');
        setCurrentSyncContext({ sourceName, intakeTarget });
        setReportedSupportCode(null);
        setSyncGaps([]);
        try {
            const newSource = await addSource({
                eventId,
                name: sourceName,
                type: 'csv', // Keeping 'csv' type in DB for compatibility but UI says Spreadsheet
                config: { intakeTarget, fileName: file.name, mappingMode: 'inferred', reviewRequired: true }
            });

            const result = await importSpreadsheet({
                file,
                sourceId: newSource.id,
                mode: 'profile_only',
                savedMapping: newSource.config?.lockedMapping || newSource.config?.inferredMapping,
                intakeTarget,
            });
            const profileSummary = buildSyncSummary(sourceName, intakeTarget, result);
            await updateSourceSyncStatus({
                sourceId: newSource.id,
                config: buildInferredSourceConfig(newSource, profileSummary),
            });
            setMappingSource({
                ...newSource,
                lastSyncedAt: null,
                createdAt: new Date().toISOString(),
                config: buildInferredSourceConfig(newSource, profileSummary),
            });
            setMappingAssessment(profileSummary);
            setDraftMapping(profileSummary.mapping);
            setStatus('idle');
            setUiMode('mapping_review');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to upload spreadsheet';
            setStatus('error');
            setErrorMessage(message);
            await recordImportError(message, err, {
                sourceName,
                sourceType: 'spreadsheet_upload',
                fileName: file.name,
            });
        }
    };

    const handleSyncAll = async () => {
        if (sources.length === 0) return;
        const untrustedSource = sources.find((source) => source.config.reviewRequired || source.config.mappingMode !== 'locked');
        if (untrustedSource) {
            openMappingReview(untrustedSource);
            return;
        }
        setStatus('loading');
        setCurrentSyncContext({ sourceName: 'All Imports', intakeTarget: 'participants' });
        setReportedSupportCode(null);
        setSyncGaps([]);
        const combinedStats = { new: 0, updated: 0, missing: 0 };

        try {
            for (const source of sources) {
                if (source.type === 'google_sheet' && source.config.sheetId) {
                    const result = await syncSheet({
                        sheetId: source.config.sheetId,
                        mode: 'confirm_and_sync',
                        savedMapping: source.config.lockedMapping || source.config.inferredMapping,
                        intakeTarget: source.config.intakeTarget || 'participants',
                    });
                    const syncSummary = buildSyncSummary(source.name, source.config.intakeTarget || 'participants', result);
                    await updateSourceSyncStatus({
                        sourceId: source.id,
                        lastSyncedAt: new Date().toISOString(),
                        config: buildLockedSourceConfig(source, syncSummary, source.config.lockedMapping || source.config.inferredMapping || {}),
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
            setLastSyncSummary({
                sourceName: 'All Imports',
                intakeTarget: 'participants',
                stats: combinedStats,
                gaps: syncGaps,
                headers: [],
                mapping: {},
            });
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Global sync failed';
            setStatus('error');
            setErrorMessage(message);
            await recordImportError(message, err, {
                sourceCount: sources.length,
                syncMode: 'all_sources',
            });
        }
    };

    const handleSyncSingleSource = async (source: EventSource) => {
        if (source.config.reviewRequired || source.config.mappingMode !== 'locked') {
            openMappingReview(source);
            return;
        }
        setStatus('loading');
        const sourceTarget = source.config.intakeTarget || 'participants';
        setCurrentSyncContext({ sourceName: source.name, intakeTarget: sourceTarget });
        setReportedSupportCode(null);
        setSyncGaps([]);
        try {
            if (source.type === 'google_sheet' && source.config.sheetId) {
                const result = await syncSheet({
                    sheetId: source.config.sheetId,
                    mode: 'confirm_and_sync',
                    savedMapping: source.config.lockedMapping || source.config.inferredMapping,
                    intakeTarget: sourceTarget,
                });
                const syncSummary = buildSyncSummary(source.name, sourceTarget, result);
                await updateSourceSyncStatus({
                    sourceId: source.id,
                    lastSyncedAt: new Date().toISOString(),
                    config: buildLockedSourceConfig(source, syncSummary, source.config.lockedMapping || source.config.inferredMapping || {}),
                });
                setSyncStats(result.stats);
                setSyncGaps(result.gaps || []);
                setLastSyncSummary(syncSummary);
            }
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `Failed to sync ${source.name}`;
            setStatus('error');
            setErrorMessage(message);
            await recordImportError(message, err, {
                sourceId: source.id,
                sourceName: source.name,
                sourceType: source.type,
                syncMode: 'single_source',
            });
        }
    };

    const handleSaveMappingOnly = async () => {
        if (!mappingSource || !mappingAssessment) return;
        await updateSourceSyncStatus({
            sourceId: mappingSource.id,
            config: {
                ...buildInferredSourceConfig(mappingSource, mappingAssessment),
                lockedMapping: draftMapping,
            },
        });
        setUiMode('dashboard');
    };

    const handleConfirmAndSync = async () => {
        if (!mappingSource || !mappingAssessment) return;
        setStatus('loading');
        setCurrentSyncContext({
            sourceName: mappingSource.name,
            intakeTarget: mappingSource.config.intakeTarget || 'participants',
        });
        try {
            let result: ImportSyncResult | null = null;
            if (mappingSource.type === 'google_sheet' && mappingSource.config.sheetId) {
                result = await syncSheet({
                    sheetId: mappingSource.config.sheetId,
                    mode: 'confirm_and_sync',
                    savedMapping: draftMapping,
                    intakeTarget: mappingSource.config.intakeTarget || 'participants',
                });
            } else if (file) {
                result = await importSpreadsheet({
                    file,
                    sourceId: mappingSource.id,
                    mode: 'confirm_and_sync',
                    savedMapping: draftMapping,
                    intakeTarget: mappingSource.config.intakeTarget || 'participants',
                });
            }

            if (!result) {
                throw new Error('This source needs its original spreadsheet file before it can be synced again.')
            }

            const syncSummary = buildSyncSummary(mappingSource.name, mappingSource.config.intakeTarget || 'participants', result);
            await updateSourceSyncStatus({
                sourceId: mappingSource.id,
                lastSyncedAt: new Date().toISOString(),
                config: buildLockedSourceConfig(mappingSource, syncSummary, draftMapping),
            });
            setSyncStats(result.stats || null);
            setSyncGaps(result.gaps || []);
            setLastSyncSummary(syncSummary);
            setStatus('success');
            setMappingAssessment(null);
            setTimeout(() => {
                setUiMode('dashboard');
                setStatus('idle');
            }, 1500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `Failed to sync ${mappingSource.name}`;
            setStatus('error');
            setErrorMessage(message);
            await recordImportError(message, err, {
                sourceId: mappingSource.id,
                sourceName: mappingSource.name,
                syncMode: 'confirm_and_sync',
            });
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

    const dashboardContent = (
        <div className="space-y-4">
            <section className={`rounded-[1.25rem] border p-4 text-left ${sourceTrustToneClassName}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Next Action</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{sourceTrustTitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{sourceTrustBody}</p>
                    </div>
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {trustSteps.map((step) => (
                        <div key={step.label} className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{step.label}</p>
                            <p className={`mt-1 text-xs font-bold ${step.complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {step.complete ? 'Complete' : 'Pending'}
                            </p>
                        </div>
                    ))}
                </div>
                {sourceTrustAction ? (
                    <div className="mt-4">
                        <Button
                            onClick={sourceTrustAction}
                            className="h-11 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                        >
                            {sourceTrustActionLabel}
                        </Button>
                    </div>
                ) : null}
            </section>

            <details open className="surface-panel group rounded-[1.35rem] p-3.5 sm:p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Connected Sources</p>
                        <p className="mt-1 text-sm font-black text-foreground">Manage imports for this event</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-4 space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Participant Imports</h3>
                            {participantSources.length > 1 ? (
                                <button onClick={handleSyncAll} className="text-[10px] font-bold uppercase tracking-widest text-teal-500 transition-colors hover:text-teal-400">
                                    Refresh All
                                </button>
                            ) : null}
                        </div>
                        <div className="overflow-visible rounded-[1.25rem] border border-border/70 bg-background/70">
                            {participantSources.length > 0 ? participantSources.map((source, index) => (
                                <div key={source.id} className={`flex min-h-[60px] items-center gap-3 px-3 ${index < participantSources.length - 1 ? 'border-b border-border/70' : ''}`}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                        {source.type === 'google_sheet' ? <FileSpreadsheet className="h-5 w-5 text-teal-500" /> : <FileJson className="h-5 w-5 text-blue-500" />}
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
                                            <span>
                                                {source.config.reviewRequired
                                                    ? 'Needs review'
                                                    : source.config.mappingMode === 'locked'
                                                        ? 'Locked'
                                                        : source.config.mappingGaps?.length
                                                            ? `${source.config.mappingGaps.length} gap${source.config.mappingGaps.length > 1 ? 's' : ''}`
                                                            : 'Mapped'}
                                            </span>
                                        </div>
                                        {(() => {
                                            const latestRun = latestRunBySource.get(source.id);
                                            return latestRun ? (
                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                    {latestRun.status === 'succeeded'
                                                        ? `${latestRun.stats?.new || 0} new, ${latestRun.stats?.updated || 0} updated on latest sync`
                                                        : latestRun.status === 'running'
                                                            ? 'Sync in progress'
                                                            : latestRun.error_message || 'Latest sync needs attention'}
                                                </p>
                                            ) : null;
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {source.type === 'google_sheet' ? (
                                            <button
                                                onClick={() => handleSyncSingleSource(source)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                                                aria-label={`Refresh ${source.name}`}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                        <ActionMenu options={[
                                            { label: 'Review Mapping', icon: <SlidersHorizontal className="h-4 w-4" />, onClick: () => openMappingReview(source) },
                                            { label: 'Remove Source', icon: <Trash2 className="h-4 w-4" />, variant: 'danger', onClick: () => removeSource(source.id) }
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

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance Request Imports</h3>
                        </div>
                        <div className="overflow-visible rounded-[1.25rem] border border-border/70 bg-background/70">
                            {performanceRequestSources.length > 0 ? performanceRequestSources.map((source, index) => (
                                <div key={source.id} className={`flex min-h-[60px] items-center gap-3 px-3 ${index < performanceRequestSources.length - 1 ? 'border-b border-border/70' : ''}`}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                        {source.type === 'google_sheet' ? <FileSpreadsheet className="h-5 w-5 text-teal-500" /> : <FileJson className="h-5 w-5 text-blue-500" />}
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
                                            <span>
                                                {source.config.reviewRequired
                                                    ? 'Needs review'
                                                    : source.config.mappingMode === 'locked'
                                                        ? 'Locked'
                                                        : source.config.mappingGaps?.length
                                                            ? `${source.config.mappingGaps.length} gap${source.config.mappingGaps.length > 1 ? 's' : ''}`
                                                            : 'Mapped'}
                                            </span>
                                        </div>
                                        {(() => {
                                            const latestRun = latestRunBySource.get(source.id);
                                            return latestRun ? (
                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                    {latestRun.status === 'succeeded'
                                                        ? `${latestRun.stats?.new || 0} new, ${latestRun.stats?.updated || 0} updated on latest sync`
                                                        : latestRun.status === 'running'
                                                            ? 'Sync in progress'
                                                            : latestRun.error_message || 'Latest sync needs attention'}
                                                </p>
                                            ) : null;
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {source.type === 'google_sheet' ? (
                                            <button
                                                onClick={() => handleSyncSingleSource(source)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                                                aria-label={`Refresh ${source.name}`}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                        <ActionMenu options={[
                                            { label: 'Review Mapping', icon: <SlidersHorizontal className="h-4 w-4" />, onClick: () => openMappingReview(source) },
                                            { label: 'Remove Source', icon: <Trash2 className="h-4 w-4" />, variant: 'danger', onClick: () => removeSource(source.id) }
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
                </div>
            </details>

            <details className="surface-panel group rounded-[1.35rem] p-3.5 sm:p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Recent Sync Activity</p>
                        <p className="mt-1 text-sm font-black text-foreground">Recent outcomes and troubleshooting</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-4 space-y-4">
                    {lastSyncSummary ? (
                        <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/5 p-4 text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Latest Sync Summary</p>
                            <p className="mt-1 text-sm font-bold text-foreground">
                                {lastSyncSummary.sourceName}: {lastSyncSummary.stats.new} new, {lastSyncSummary.stats.updated} updated, {lastSyncSummary.stats.missing} missing.
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Imported as {formatIntakeTargetLabel(lastSyncSummary.intakeTarget)} • Detected target {lastSyncSummary.probableTarget || lastSyncSummary.intakeTarget} • Confidence {lastSyncSummary.confidence || 'n/a'}
                            </p>
                            <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-bold text-emerald-700 dark:text-emerald-300">View what was used</summary>
                                {(() => {
                                    const mappedFields = summarizeMappedFields(lastSyncSummary.mapping);
                                    const usedHeaderCount = new Set(mappedFields.map((item) => item.header)).size;
                                    const ignoredHeaderCount = Math.max(lastSyncSummary.headers.length - usedHeaderCount, 0);
                                    return (
                                        <div className="mt-3 space-y-3">
                                            {mappedFields.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {mappedFields.slice(0, 6).map((item) => (
                                                        <span key={`${item.label}-${item.header}`} className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-bold text-foreground/80">
                                                            {item.label}: {item.header}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                            {lastSyncSummary.headers.length > 0 ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Used {usedHeaderCount} of {lastSyncSummary.headers.length} columns. {ignoredHeaderCount} extra columns were preserved in raw payload for later review.
                                                </p>
                                            ) : null}
                                        </div>
                                    );
                                })()}
                            </details>
                        </div>
                    ) : null}

                    <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/70 divide-y divide-border/70">
                        {importRuns && importRuns.length > 0 ? importRuns.map((run) => {
                            const isStale = isImportRunStale(run);
                            const stats = (typeof run.stats === 'object' && run.stats && !Array.isArray(run.stats) ? run.stats : {}) as { new?: number; updated?: number; missing?: number };
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
                                                <p className="mt-0.5 text-[9px] font-medium leading-tight text-amber-700 dark:text-amber-300">
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
            </details>
        </div>
    );

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
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-300">Import Issue</p>
                                    <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-200">{errorMessage || 'The import did not complete. Review the source setup and try again.'}</p>
                                    {reportedSupportCode ? (
                                        <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-200">
                                            Reference code: <span className="font-black tracking-[0.08em]">{reportedSupportCode}</span>
                                        </p>
                                    ) : null}
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
                            {lastSyncSummary ? (
                                <div className="w-full rounded-2xl border border-border/60 bg-background/80 p-4 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Import Understanding</p>
                                    <p className="mt-1 text-sm font-bold text-foreground">
                                        {lastSyncSummary.sourceName} was imported as {formatIntakeTargetLabel(lastSyncSummary.intakeTarget)}.
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Detected target: {lastSyncSummary.probableTarget || lastSyncSummary.intakeTarget} • Confidence: {lastSyncSummary.confidence || 'n/a'}
                                    </p>
                                    {(() => {
                                        const mappedFields = summarizeMappedFields(lastSyncSummary.mapping);
                                        const usedHeaderCount = new Set(mappedFields.map((item) => item.header)).size;
                                        const ignoredHeaderCount = Math.max(lastSyncSummary.headers.length - usedHeaderCount, 0);
                                        return (
                                            <>
                                                {mappedFields.length > 0 ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {mappedFields.slice(0, 5).map((item) => (
                                                            <span key={`${item.label}-${item.header}`} className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-bold text-foreground/80">
                                                                {item.label}: {item.header}
                                                            </span>
                                                        ))}
                                                        {mappedFields.length > 5 ? (
                                                            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                                                                +{mappedFields.length - 5} more
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                                {lastSyncSummary.headers.length > 0 ? (
                                                    <p className="mt-3 text-xs text-muted-foreground">
                                                        Used {usedHeaderCount} of {lastSyncSummary.headers.length} columns. {ignoredHeaderCount} extra columns were preserved in the raw source payload but not used for import decisions.
                                                    </p>
                                                ) : null}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : null}
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
                        <div className="mx-auto max-w-md rounded-[1.4rem] border border-border/70 bg-background/75 p-5">
                            <div className="flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                                    <RefreshCw className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-teal-500/45" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-foreground">Sync in progress</p>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">
                                        {currentSyncContext?.sourceName || 'Import source'} • {formatIntakeTargetLabel(currentSyncContext?.intakeTarget || intakeTarget)}
                                    </p>
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                                        Step {loadingStepIndex + 1} of {IMPORT_PROGRESS_STEPS.length} • {IMPORT_PROGRESS_STEPS[loadingStepIndex]}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent/50">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${((loadingStepIndex + 1) / IMPORT_PROGRESS_STEPS.length) * 100}%` }}
                                />
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Wide Google Sheets are normal. We are reading the rows, checking the columns, and saving what matches this intake target.
                            </p>
                        </div>
                    ) : uiMode === 'dashboard' ? (
                        dashboardContent
                    ) : uiMode === 'mapping_review' ? (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 text-left">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black tracking-tight text-foreground">Review Mapping</h3>
                                <p className="text-xs text-muted-foreground">
                                    Confirm what {mappingSource?.name || 'this source'} means before this import becomes a trusted repeat sync.
                                </p>
                            </div>
                            {mappingAssessment ? (
                                <div className="rounded-2xl border border-border/70 bg-accent/15 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Detected Target</p>
                                    <p className="mt-1 text-sm font-bold text-foreground">
                                        {formatIntakeTargetLabel((mappingAssessment.probableTarget === 'unknown' ? mappingAssessment.intakeTarget : (mappingAssessment.probableTarget || mappingAssessment.intakeTarget)) as 'participants' | 'performance_requests')}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Confidence {mappingAssessment.confidence || 'n/a'}{mappingAssessment.reviewRequired ? ' • Review required before sync' : ''}
                                    </p>
                                </div>
                            ) : null}
                            {mappingAssessment?.blockingIssues && mappingAssessment.blockingIssues.length > 0 && (
                                <div className="rounded-2xl border border-red-400/30 bg-red-50 px-4 py-3 dark:bg-red-950/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700 dark:text-red-300">Blocked</p>
                                    <div className="mt-2 space-y-1">
                                        {mappingAssessment.blockingIssues.map((issue) => (
                                            <p key={issue} className="text-xs font-medium text-red-800 dark:text-red-100">{issue}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {mappingAssessment?.warnings && mappingAssessment.warnings.length > 0 && (
                                <div className="rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Warnings</p>
                                    <div className="mt-2 space-y-1">
                                        {mappingAssessment.warnings.map((gap) => (
                                            <p key={gap} className="text-xs font-medium text-amber-800 dark:text-amber-100">{gap}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {mappingAssessment?.driftSummary && mappingAssessment.driftSummary.length > 0 && (
                                <div className="rounded-2xl border border-blue-400/30 bg-blue-50 px-4 py-3 dark:bg-blue-950/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Source Drift</p>
                                    <div className="mt-2 space-y-1">
                                        {mappingAssessment.driftSummary.map((item) => (
                                            <p key={item} className="text-xs font-medium text-blue-800 dark:text-blue-100">{item}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {mappingAssessment ? (
                                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Import Understanding</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {summarizeMappedFields(draftMapping).map((item) => (
                                            <span key={`${item.label}-${item.header}`} className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-bold text-foreground/80">
                                                {item.label}: {item.header}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {mappingAssessment.preservedFieldCount ?? Math.max(mappingAssessment.headers.length - summarizeMappedFields(draftMapping).length, 0)} extra columns will be preserved in raw payload but not used for import decisions.
                                    </p>
                                </div>
                            ) : null}
                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                {(mappingSource?.config.intakeTarget === 'performance_requests' ? REQUEST_MAPPING_FIELDS : MAPPING_FIELDS).map((field) => {
                                    const headers = mappingSource?.config.detectedHeaders || [];
                                    const selectedValue = draftMapping[field.key as string] || '';
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
                                                    [field.key as string]: event.target.value || undefined,
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => setUiMode('dashboard')}
                                    className="h-12 rounded-2xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleSaveMappingOnly}
                                    className="h-12 rounded-2xl"
                                >
                                    Save Mapping Only
                                </Button>
                                <Button
                                    onClick={handleConfirmAndSync}
                                    disabled={!!mappingAssessment?.blockingIssues?.length}
                                    className="h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                                >
                                    Confirm & Sync
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

    if (embedded && uiMode === 'dashboard' && status === 'idle') {
        return dashboardContent;
    }

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
