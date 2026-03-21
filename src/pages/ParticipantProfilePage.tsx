import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    useParticipantDetail,
    useAddParticipantNote,
    useAssignToAct,
    useRemoveFromAct,
    useUpdateAssetStatus,
    useUploadParticipantAsset,
    useUpdateParticipantStatus,
    useResolveNote,
    useDeleteAsset
} from '@/hooks/useParticipants';
import { useActsQuery } from '@/hooks/useActs';
import {
    Shield,
    History as HistoryIcon,
    Database,
    Info,
    AlertCircle,
    Phone,
    FileText,
    UserCircle,
    ChevronRight,
    CheckCircle,
    Users,
    RefreshCw,
    Plus,
    Trash2,
    Upload,
    ShieldCheck,
    ClipboardList,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EditParticipantModal } from '@/components/participants/EditParticipantModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { buildParticipantRequirementRows, getRequirementStatusMeta, type RequirementRow } from '@/lib/requirementsPrototype';
import { OperationalEmptyResponse, OperationalResponseCard } from '@/components/ui/OperationalCards';
import { AssetPreviewModal } from '@/components/ui/AssetPreviewModal';
import { useSelection } from '@/context/SelectionContext';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';

// Helper functions for audit log
const getActionDescription = (log: any) => {
    if (log.operation === 'INSERT') return 'Initial record loaded';
    if (log.operation === 'UPDATE') {
        if (log.diff && Object.keys(log.diff).length > 0) {
            const changes = Object.entries(log.diff).map(([key, val]: [string, any]) => {
                const field = key.replace(/_/g, ' ');
                return `${field}: ${val.from ?? 'null'} \u2192 ${val.to ?? 'null'}`;
            });
            return `Changes: ${changes.join(' | ')}`;
        }
        return 'Synced from source';
    }
    if (log.operation === 'DELETE') return 'Record Removed';
    return log.operation;
};

const formatDate = (dateString: any) => {
    if (!dateString) return 'Pending...';
    // If it's already a Date object, use it directly
    const date = dateString instanceof Date ? dateString : new Date(String(dateString).replace(' ', 'T'));
    
    if (isNaN(date.getTime())) {
        // Fallback for very specific formats (e.g., fractional seconds + offset with space)
        const parts = String(dateString).split(' ');
        if (parts.length >= 2) {
            const iso = parts[0] + 'T' + parts[1];
            const retryDate = new Date(iso);
            if (!isNaN(retryDate.getTime())) {
                return retryDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
            }
        }
        return 'Unknown';
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

function getParticipantStatusLabel(status: string | null | undefined) {
    if (status === 'missing_from_source') return 'Missing From Source';
    if (!status) return 'Active';
    return status.replace(/_/g, ' ');
}

export function ParticipantProfilePage() {
    const { participantId } = useParams<{ participantId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { organizationId } = useSelection();
    // Form and Action state
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteCategory, setNoteCategory] = useState<'operational' | 'internal' | 'special_request'>('operational');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedActId, setSelectedActId] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<{ templateId?: string | null; replaceAssetId?: string | null; type: 'waiver' | 'photo' | 'intro_media' | 'other'; title: string } | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadType, setUploadType] = useState<'waiver' | 'photo' | 'intro_media' | 'other'>('other');
    const [uploadNotes, setUploadNotes] = useState('');
    const [assetNotice, setAssetNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [showAllNotes, setShowAllNotes] = useState(false);
    const requirementsSectionRef = useRef<HTMLDivElement | null>(null);
    const filesSectionRef = useRef<HTMLDivElement | null>(null);
    const assignmentsSectionRef = useRef<HTMLDivElement | null>(null);
    const notesSectionRef = useRef<HTMLDivElement | null>(null);

    const { data: participant, isLoading, error } = useParticipantDetail(participantId || '');
    const capabilities = useEventCapabilities(participant?.eventId || null, organizationId || null);

    // Available acts for assignment
    const { data: allActs } = useActsQuery(participant?.eventId || '');

    // Mutations
    const addNote = useAddParticipantNote(participantId || '');
    const assignToAct = useAssignToAct(participantId || '');
    const removeFromAct = useRemoveFromAct(participantId || '');
    const updateAssetStatus = useUpdateAssetStatus(participantId || '');
    const updateStatus = useUpdateParticipantStatus(participantId || '');
    const resolveNote = useResolveNote(participantId || '');
    const deleteAsset = useDeleteAsset(participantId || '');
    const uploadAsset = useUploadParticipantAsset(participantId || '');
    const openUploadModal = ({
        templateId = null,
        replaceAssetId = null,
        type,
        title,
        suggestedName,
    }: {
        templateId?: string | null;
        replaceAssetId?: string | null;
        type: 'waiver' | 'photo' | 'intro_media' | 'other';
        title: string;
        suggestedName?: string;
    }) => {
        setUploadTarget({ templateId, replaceAssetId, type, title });
        setUploadType(type);
        setUploadFile(null);
        setUploadName(suggestedName || '');
        setUploadNotes('');
        setAssetNotice(null);
        setShowUploadModal(true);
    };

    const handleUploadAsset = async () => {
        if (!uploadFile || !uploadTarget) return;
        try {
            await uploadAsset.mutateAsync({
                file: uploadFile,
                templateId: uploadTarget.templateId,
                replaceAssetId: uploadTarget.replaceAssetId,
                type: uploadType,
                name: uploadName.trim() || uploadFile.name,
                reviewNotes: uploadNotes.trim() || null,
            });
            setAssetNotice({
                tone: 'success',
                message: `${uploadTarget.type === 'photo' ? 'Photo' : 'Asset'} uploaded. Refreshing participant assets now.`,
            });
            setShowUploadModal(false);
            setUploadTarget(null);
            setUploadFile(null);
            setUploadName('');
            setUploadNotes('');
        } catch (err: any) {
            setAssetNotice({
                tone: 'error',
                message: err?.message || 'Upload failed. Check storage access and try again.',
            });
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;
        await addNote.mutateAsync({ content: noteContent, category: noteCategory });
        setNoteContent('');
        setShowNoteForm(false);
    };

    const handleAssignAct = async () => {
        if (!selectedActId) return;
        await assignToAct.mutateAsync({ actId: selectedActId });
        setShowAssignModal(false);
        setSelectedActId('');
    };

    const scrollToSection = (ref: { current: HTMLDivElement | null }) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !participant) {
        return (
            <div className="p-8 text-center bg-destructive/10 rounded-xl border border-destructive/20 max-w-2xl mx-auto mt-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Failed to load participant</h2>
                <p className="text-muted-foreground mb-6">The record might have been deleted or you may not have permission to view it.</p>
                <Button onClick={() => navigate('/participants')}>Return to Participants</Button>
            </div>
        );
    }

    const assignedActCount = participant.acts?.length || 0;
    const unresolvedNoteCount = participant.operationalNotes?.filter(note => !note.isResolved).length || 0;
    const approvedAssetCount = participant.templatedAssets?.filter(asset => asset.fulfillment?.status === 'approved').length || 0;
    const totalAssetCount = participant.templatedAssets?.length || 0;
    const specialRequestNotes = participant.operationalNotes?.filter((note) => note.category === 'special_request') || [];
    const openSpecialRequestNotes = specialRequestNotes.filter((note) => !note.isResolved);
    const resolvedSpecialRequestNotes = specialRequestNotes.filter((note) => note.isResolved);
    const visibleOperationalNotes = showAllNotes
        ? (participant.operationalNotes || [])
        : (participant.operationalNotes || []).slice(0, 4);
    const editRequested = searchParams.get('action') === 'edit-profile';
    const requirementRows = buildParticipantRequirementRows(participant);
    const unresolvedRequirementRows = requirementRows.filter((row) => !['approved', 'auto_complete'].includes(row.status));
    const nextRequirementRow = unresolvedRequirementRows[0] || requirementRows[0] || null;
    const canManageParticipantRecords = capabilities.canManageParticipantRecords;
    const canManageParticipantOps = capabilities.canManageParticipantOps;
    const canManageRoster = capabilities.canManageRoster;
    const inactiveRecord = participant.status && participant.status !== 'active';
    const readinessLabel = inactiveRecord
        ? getParticipantStatusLabel(participant.status)
        : unresolvedRequirementRows.some((row) => row.status === 'missing' || row.status === 'rejected')
            ? 'Blocked'
            : unresolvedRequirementRows.length > 0 || openSpecialRequestNotes.length > 0 || unresolvedNoteCount > 0
                ? 'Needs Review'
                : 'Cleared';
    const readinessTone = inactiveRecord
        ? participant.status === 'withdrawn'
            ? 'critical'
            : 'warning'
        : readinessLabel === 'Blocked'
            ? 'critical'
            : readinessLabel === 'Needs Review'
                ? 'warning'
                : 'good';
    const readinessDetail = inactiveRecord
        ? 'This person is not active in the current event roster.'
        : readinessLabel === 'Blocked'
            ? `${unresolvedRequirementRows.length} blocker${unresolvedRequirementRows.length === 1 ? '' : 's'} need action now.`
            : readinessLabel === 'Needs Review'
                ? `${Math.max(unresolvedRequirementRows.length, openSpecialRequestNotes.length, unresolvedNoteCount)} item${Math.max(unresolvedRequirementRows.length, openSpecialRequestNotes.length, unresolvedNoteCount) === 1 ? '' : 's'} still need review.`
                : 'No immediate participant blockers are open.';

    const closeEditProfile = () => {
        const nextParams = new URLSearchParams(searchParams);
        if (nextParams.get('action') === 'edit-profile') {
            nextParams.delete('action');
            setSearchParams(nextParams, { replace: true });
        }
        setShowEditModal(false);
    };

    const handleRequirementAction = (row: RequirementRow) => {
        if (row.target === 'assets') {
            scrollToSection(filesSectionRef);
            return;
        }
        if (row.target === 'cast') {
            scrollToSection(assignmentsSectionRef);
            return;
        }
        scrollToSection(requirementsSectionRef);
    };

    return (
        <div className="relative">
            {assetNotice && (
                <div className="fixed top-36 left-1/2 z-[60] w-[min(92vw,36rem)] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
                        assetNotice.tone === 'error'
                            ? 'border-destructive/20 bg-destructive/95 text-white'
                            : 'border-emerald-500/20 bg-emerald-600/95 text-white'
                    }`}>
                        {assetNotice.tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                        <p className="flex-1 text-sm font-bold tracking-tight">{assetNotice.message}</p>
                        <button onClick={() => setAssetNotice(null)} className="transition-opacity hover:opacity-70">
                            <Plus className="h-4 w-4 rotate-45" />
                        </button>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 space-y-3 px-4 pb-12 duration-500 md:px-0">
                <PageHeader
                    title={`${participant.firstName} ${participant.lastName}`}
                    subtitle={undefined}
                    actions={
                        <div className="flex justify-end">
                            <ActionMenu
                                options={[
                                    {
                                        label: 'View Record History',
                                        onClick: () => setShowHistoryModal(true),
                                        icon: <HistoryIcon className="h-4 w-4" />,
                                    },
                                ]}
                            />
                        </div>
                    }
                    status={
                        <div className="surface-section-participants grid grid-cols-1 gap-2 rounded-2xl p-3 xl:grid-cols-[1.15fr,1fr,1fr]">
                            <div className="rounded-2xl border border-indigo-500/10 bg-background/80 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Readiness State</p>
                                <div className="mt-2 flex min-h-11 items-center rounded-xl bg-background/80 px-3">
                                    <p className={`text-sm font-black ${
                                        readinessTone === 'critical'
                                            ? 'text-destructive'
                                            : readinessTone === 'warning'
                                                ? 'text-orange-600'
                                                : 'text-emerald-600'
                                    }`}>
                                        {readinessLabel}
                                    </p>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">{readinessDetail}</p>
                            </div>

                            <div className="rounded-2xl border border-indigo-500/10 bg-background/80 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Primary Contact</p>
                                        <p className="mt-2 text-sm font-black text-foreground">
                                            {participant.isMinor ? (participant.guardianName || 'Guardian not captured') : 'Adult profile'}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {participant.isMinor
                                                ? participant.guardianPhone || 'Phone still needed'
                                                : participant.identityVerified
                                                    ? 'Identity verified'
                                                    : 'Identity review optional'}
                                        </p>
                                    </div>
                                    {participant.isMinor && participant.guardianPhone ? (
                                        <a
                                            href={`tel:${participant.guardianPhone}`}
                                            className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-primary px-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary-foreground transition-all active:scale-95"
                                        >
                                            <Phone className="mr-1.5 h-3.5 w-3.5" />
                                            Call
                                        </a>
                                    ) : null}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-indigo-500/10 bg-background/80 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Operational Snapshot</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant="outline" className="min-h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                                        {assignedActCount === 0 ? 'Needs Placement' : `${assignedActCount} Assignment${assignedActCount > 1 ? 's' : ''}`}
                                    </Badge>
                                    <Badge variant="outline" className="min-h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                                        {approvedAssetCount}/{totalAssetCount} Files Ready
                                    </Badge>
                                    <Badge variant="outline" className="min-h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                                        {unresolvedRequirementRows.length} Open Requirement{unresolvedRequirementRows.length === 1 ? '' : 's'}
                                    </Badge>
                                    <Badge variant="outline" className="min-h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                                        {unresolvedNoteCount} Open Note{unresolvedNoteCount === 1 ? '' : 's'}
                                    </Badge>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {participant.isMinor ? 'Clearance and guardian status stay visible in the first viewport.' : 'This screen is optimized for fast operational follow-up, not record browsing.'}
                                </p>
                            </div>
                        </div>
                    }
                />
                <div className="bg-card rounded-2xl border border-border/50 shadow-sm min-h-[500px]">
                    <div className="animate-in fade-in space-y-4 p-4 duration-300 sm:p-5">
                        {nextRequirementRow ? (() => {
                            const meta = getRequirementStatusMeta(nextRequirementRow.status as any);
                            return (
                                <OperationalResponseCard
                                    key={`profile-next-${nextRequirementRow.key}`}
                                    label="Next Action"
                                    detail={`${nextRequirementRow.label} • ${nextRequirementRow.detail}`}
                                    count={meta.label}
                                    tone={meta.tone === 'critical' ? 'critical' : meta.tone === 'warning' ? 'warning' : meta.tone === 'good' ? 'good' : 'default'}
                                    action={nextRequirementRow.actionLabel}
                                    onClick={() => handleRequirementAction(nextRequirementRow)}
                                />
                            );
                        })() : (
                            <OperationalEmptyResponse
                                title="Profile Clear"
                                detail="No participant follow-up is blocking the current profile lane."
                            />
                        )}

                        <div ref={requirementsSectionRef} className="surface-panel rounded-[1.2rem] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground flex items-center">
                                        <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                                        Requirements & Compliance
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Clear blockers here first. File-backed requirements stay linked to uploads lower on the page.
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tabular-nums">
                                    {requirementRows.length}
                                </Badge>
                            </div>

                            {requirementRows.length > 0 ? (
                                <div className="mt-4 space-y-2">
                                    {requirementRows.map((row) => {
                                        const meta = getRequirementStatusMeta(row.status);
                                        return (
                                            <OperationalResponseCard
                                                key={row.key}
                                                label={row.label}
                                                detail={row.detail}
                                                count={meta.label}
                                                tone={meta.tone === 'critical' ? 'critical' : meta.tone === 'warning' ? 'warning' : meta.tone === 'good' ? 'good' : 'default'}
                                                action={row.actionLabel}
                                                onClick={() => handleRequirementAction(row)}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <OperationalEmptyResponse
                                        title="No Participant Requirements"
                                        detail="This event has not assigned any participant-level requirements to this profile yet."
                                    />
                                </div>
                            )}
                        </div>

                        <div ref={notesSectionRef} className="surface-panel rounded-[1.2rem] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Updates & Follow-Up</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {participant.operationalNotes && participant.operationalNotes.length > 4 ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => setShowAllNotes((current) => !current)}
                                        >
                                            {showAllNotes ? 'Show Less' : `Show All (${participant.operationalNotes.length})`}
                                        </Button>
                                    ) : null}
                                    {canManageParticipantOps ? (
                                        <Button
                                            variant={showNoteForm ? 'ghost' : 'outline'}
                                            size="sm"
                                            className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                                            onClick={() => setShowNoteForm(!showNoteForm)}
                                        >
                                            {showNoteForm ? 'Cancel' : 'Add Follow-Up'}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>

                            {showNoteForm ? (
                                <form onSubmit={handleAddNote} className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-background/80 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(['operational', 'internal', 'special_request'] as const).map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setNoteCategory(cat)}
                                                className={`min-h-11 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${noteCategory === cat ? 'bg-primary text-primary-foreground' : 'surface-metric text-muted-foreground'}`}
                                            >
                                                {cat === 'special_request' ? 'special request' : cat.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        placeholder="Enter the follow-up or risk note that matters right now..."
                                        className="min-h-[112px] w-full rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                            disabled={addNote.isPending || !noteContent.trim()}
                                        >
                                            {addNote.isPending ? 'Saving...' : 'Save Note'}
                                        </Button>
                                    </div>
                                </form>
                            ) : null}

                            <div className="mt-4 space-y-2">
                                {participant.operationalNotes && participant.operationalNotes.length > 0 ? (
                                    visibleOperationalNotes.map((note) => (
                                        <div key={note.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.16em]">
                                                            {note.category.replace('_', ' ')}
                                                        </Badge>
                                                        {note.isResolved ? (
                                                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Resolved</span>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-foreground/80">{note.content}</p>
                                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                                        {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Just now'}
                                                    </p>
                                                </div>
                                                {!note.isResolved && canManageParticipantOps ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="min-h-11 shrink-0 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
                                                        onClick={() => resolveNote.mutate(note.id)}
                                                        disabled={resolveNote.isPending}
                                                    >
                                                        Resolve
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))
                                ) : !showNoteForm ? (
                                    <OperationalEmptyResponse
                                        title="No Escalations"
                                        detail="No active coordination notes are demanding attention right now."
                                    />
                                ) : null}
                            </div>
                        </div>

                        <div ref={filesSectionRef} className="surface-panel rounded-[1.2rem] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground flex items-center">
                                        <Upload className="mr-2 h-4 w-4 text-primary" />
                                        Files & Approvals
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Upload, approve, replace, and review participant artifacts without leaving the profile.
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tabular-nums">
                                    {participant.templatedAssets?.filter(a => !!a.fulfillment).length || 0} / {participant.templatedAssets?.length || 0} Complete
                                </Badge>
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Required Documents</p>
                                    {participant.templatedAssets && participant.templatedAssets.length > 0 ? (
                                        <div className="space-y-2">
                                            {participant.templatedAssets.map(({ template, fulfillment }) => (
                                                <div
                                                    key={template.id}
                                                    className={`rounded-[1.15rem] border px-3.5 py-3 transition-all ${fulfillment?.status === 'approved'
                                                        ? 'surface-good'
                                                        : fulfillment?.status === 'rejected'
                                                            ? 'surface-critical'
                                                            : fulfillment
                                                                ? 'surface-info'
                                                                : 'surface-panel'
                                                        }`}
                                                >
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-foreground">{template.name}</span>
                                                                {template.isRequired && (
                                                                    <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black uppercase h-4 px-1">Required</Badge>
                                                                )}
                                                                <Badge variant="outline" className="text-[9px] font-bold uppercase h-5">
                                                                    {template.actId ? 'Act' : template.eventId ? 'Event' : 'Org'}
                                                                </Badge>
                                                                {fulfillment ? (
                                                                    <Badge className={`${fulfillment.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'} border-none text-[9px] font-bold uppercase h-5`}>
                                                                        {fulfillment.status.replace(/_/g, ' ')}
                                                                    </Badge>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-sm text-foreground/80">{template.description || 'Mandatory operational artifact'}</p>
                                                            {fulfillment?.reviewNotes ? (
                                                                <p className="text-xs text-destructive">{fulfillment.reviewNotes}</p>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center">
                                                            {fulfillment && fulfillment.status !== 'approved' && canManageParticipantOps ? (
                                                                <Button
                                                                    size="sm"
                                                                    className="min-h-11 rounded-xl px-3 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-white"
                                                                    onClick={() => updateAssetStatus.mutate({ assetId: fulfillment.id, status: 'approved' })}
                                                                    disabled={updateAssetStatus.isPending}
                                                                >
                                                                    Approve
                                                                </Button>
                                                            ) : null}
                                                            {canManageParticipantOps ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant={fulfillment ? 'ghost' : 'default'}
                                                                    className="min-h-11 rounded-xl px-3 text-[9px] font-black uppercase tracking-widest"
                                                                    onClick={() => openUploadModal({
                                                                        templateId: template.id,
                                                                        replaceAssetId: fulfillment?.id || null,
                                                                        type: template.assetType || 'other',
                                                                        title: fulfillment ? `Replace ${template.name}` : `Upload ${template.name}`,
                                                                        suggestedName: template.name,
                                                                    })}
                                                                    disabled={uploadAsset.isPending}
                                                                >
                                                                    {fulfillment ? 'Replace' : 'Upload'}
                                                                </Button>
                                                            ) : null}
                                                            {fulfillment && fulfillment.status === 'pending_review' && canManageParticipantOps ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="min-h-11 rounded-xl px-3 text-[9px] font-bold uppercase text-destructive border-destructive/20 hover:bg-destructive/10"
                                                                    onClick={() => {
                                                                        const notes = prompt('Enter rejection reason:');
                                                                        if (notes) updateAssetStatus.mutate({ assetId: fulfillment.id, status: 'rejected', reviewNotes: notes });
                                                                    }}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <OperationalEmptyResponse
                                            title="No Templated Tasks"
                                            detail="No document upload templates are attached to this participant yet."
                                        />
                                    )}
                                </div>

                                <div className="border-t border-border/50 pt-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Other Files</p>
                                        {canManageParticipantOps ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="min-h-11 rounded-xl px-3 text-[10px] font-bold uppercase tracking-wider border-2"
                                                onClick={() => openUploadModal({
                                                    type: 'other',
                                                    title: 'Upload Participant Asset',
                                                })}
                                            >
                                                <Upload className="mr-1.5 h-3.5 w-3.5" />
                                                Manual Upload
                                            </Button>
                                        ) : null}
                                    </div>

                                    {participant.assets && participant.assets.filter(a => !a.templateId).length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {participant.assets.filter(a => !a.templateId).map((asset) => (
                                                <div
                                                    key={asset.id}
                                                    className="surface-panel group cursor-zoom-in rounded-2xl border p-4 transition-all hover:border-primary/20"
                                                    onClick={() => {
                                                        if (asset.fileUrl) {
                                                            setSelectedAssetUrl(asset.fileUrl);
                                                        }
                                                    }}
                                                >
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <Badge variant="outline" className="text-[9px] font-mono uppercase h-4 px-1.5">
                                                            {asset.type}
                                                        </Badge>
                                                        {canManageParticipantOps ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm('Delete this asset? This cannot be undone.')) {
                                                                        deleteAsset.mutate(asset.id);
                                                                    }
                                                                }}
                                                                className="rounded-lg p-1 transition-colors hover:bg-destructive/10 group/trash"
                                                                disabled={deleteAsset.isPending}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover/trash:text-destructive" />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                    <p className="mb-1 truncate text-sm font-bold">{asset.name}</p>
                                                    <div className="mt-2 flex items-center justify-between border-t border-border/10 pt-2">
                                                        <p className="text-[10px] font-medium tabular-nums text-muted-foreground/60">
                                                            {new Date(asset.createdAt).toLocaleDateString()}
                                                        </p>
                                                        <div className="text-[10px] font-black uppercase text-primary opacity-0 transition-opacity group-hover:opacity-100">Preview</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <OperationalEmptyResponse title="No Other Assets" detail="Manual uploads will appear here once they are added." />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div ref={assignmentsSectionRef} className="surface-panel rounded-[1.2rem] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground flex items-center">
                                        <Database className="mr-2 h-4 w-4 text-primary" />
                                        Assignments
                                    </h3>
                                    <p className="text-sm font-semibold text-foreground">Manage which performances this participant is currently attached to.</p>
                                </div>
                                <Button
                                    className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                    onClick={() => setShowAssignModal(true)}
                                    disabled={!canManageRoster}
                                >
                                    Assign to Performance
                                </Button>
                            </div>

                            {participant.acts && participant.acts.length > 0 ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {participant.acts.map((act) => (
                                        <div
                                            key={act.id}
                                            className="rounded-xl border border-border/50 bg-background/70 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase h-5 px-2">
                                                            {act.role || 'Performer'}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-2 text-lg font-black tracking-tight text-foreground">{act.name}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Linked to this participant record for lineup, approvals, and intro readiness.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromAct.mutate(act.id)}
                                                    className="min-h-11 rounded-xl border border-border/50 bg-background p-3 text-muted-foreground transition-all hover:border-destructive/20 hover:text-destructive"
                                                    title="Remove from performance"
                                                    disabled={removeFromAct.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
                                    <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                                    <p className="text-sm font-bold text-foreground">No active assignments yet.</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Place this participant into a performance when the lineup is ready.</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                            <div className="space-y-4">
                                <details className="group surface-panel rounded-[1.2rem] p-4">
                                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Profile & Safety</h3>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                                    </summary>
                                    <div className="mt-4 rounded-xl border border-border/50 bg-background/70 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Record Status</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Administrative roster state for this person.</p>
                                        {canManageParticipantRecords ? (
                                            <select
                                                value={participant.status || 'active'}
                                                onChange={(e) => updateStatus.mutate(e.target.value as any)}
                                                className={`mt-3 min-h-11 w-full rounded-xl border px-3 text-[10px] font-black uppercase tracking-[0.18em] outline-none transition-all ${participant.status === 'withdrawn'
                                                    ? 'border-destructive/20 bg-destructive/10 text-destructive'
                                                    : participant.status === 'missing_from_source'
                                                        ? 'border-orange-500/20 bg-orange-500/10 text-orange-600'
                                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                                                    }`}
                                            >
                                                <option value="active">Active</option>
                                                <option value="withdrawn">Withdrawn</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="refunded">Refunded</option>
                                                <option value="missing_from_source">Missing From Source</option>
                                            </select>
                                        ) : (
                                            <div className="mt-3 flex min-h-11 items-center rounded-xl bg-background px-3">
                                                <p className="text-sm font-black text-foreground">{getParticipantStatusLabel(participant.status)}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                {participant.isMinor ? 'Guardian Name' : 'Profile Type'}
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-foreground">
                                                {participant.isMinor ? (participant.guardianName || 'Not captured yet') : 'Adult participant'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {participant.isMinor
                                                    ? participant.guardianRelationship || 'Relationship not captured yet'
                                                    : participant.identityVerified
                                                        ? 'Identity verified for roster confidence'
                                                        : 'Identity verification is optional for this profile right now'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                {participant.isMinor ? 'Guardian Phone' : 'Identity Notes'}
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-foreground">
                                                {participant.isMinor ? (participant.guardianPhone || 'Not captured yet') : (participant.identityNotes || 'No special identity notes')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Email</p>
                                            <p className="mt-1 text-sm font-bold text-foreground">{participant.email || 'Not captured yet'}</p>
                                        </div>
                                        <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Age</p>
                                            <p className="mt-1 text-sm font-bold text-foreground">{participant.age ?? 'Not captured yet'}</p>
                                        </div>
                                    </div>
                                    {participant.notes ? (
                                        <div className="mt-3 rounded-xl border border-border/50 bg-muted/15 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Internal Note</p>
                                            <p className="mt-1 text-sm leading-6 text-foreground/80">{participant.notes}</p>
                                        </div>
                                    ) : null}
                                </details>

                                {participant.hasSpecialRequests ? (
                                    <div className="surface-panel rounded-[1.2rem] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <ClipboardList className="h-4 w-4 text-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Special Request</h3>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                                                    openSpecialRequestNotes.length > 0
                                                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                                                        : resolvedSpecialRequestNotes.length > 0
                                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                                            : ''
                                                }`}
                                            >
                                                {openSpecialRequestNotes.length > 0
                                                    ? 'Open'
                                                    : resolvedSpecialRequestNotes.length > 0
                                                        ? 'Closed'
                                                        : 'Needs Review'}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 rounded-xl border border-border/50 bg-background/70 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Request Details</p>
                                            <p className="mt-1 text-sm leading-6 text-foreground/80">
                                                {participant.specialRequestRaw || 'A special request flag came through sync, but no raw details were attached.'}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {openSpecialRequestNotes[0] && canManageParticipantOps ? (
                                                <Button
                                                    variant="outline"
                                                    className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                    onClick={() => resolveNote.mutate(openSpecialRequestNotes[0].id)}
                                                    disabled={resolveNote.isPending}
                                                >
                                                    {resolveNote.isPending ? 'Closing...' : 'Mark Request Closed'}
                                                </Button>
                                            ) : canManageParticipantOps ? (
                                                <Button
                                                    variant="outline"
                                                    className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                    onClick={() => {
                                                        setNoteCategory('special_request');
                                                        setNoteContent((current) => current || participant.specialRequestRaw || '');
                                                        setShowNoteForm(true);
                                                        scrollToSection(notesSectionRef);
                                                    }}
                                                >
                                                    Log Request Review
                                                </Button>
                                            ) : null}
                                            {resolvedSpecialRequestNotes.length > 0 ? (
                                                <p className="self-center text-xs text-muted-foreground">
                                                    {resolvedSpecialRequestNotes.length} closed request note{resolvedSpecialRequestNotes.length > 1 ? 's' : ''} on file.
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}

                                {participant.siblings && participant.siblings.length > 0 ? (
                                    <details className="group surface-panel rounded-[1.2rem] p-4">
                                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Family Links</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                                    {participant.siblings.length}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                                            </div>
                                        </summary>
                                        <div className="mt-3 space-y-2">
                                            {participant.siblings.map((s) => (
                                                <Link
                                                    key={s.id}
                                                    to={`/participants/${s.id}`}
                                                    className="flex min-h-[44px] items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-3 transition-colors hover:bg-accent/20"
                                                >
                                                    <span className="text-sm font-bold text-foreground">{s.firstName} {s.lastName}</span>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </Link>
                                            ))}
                                        </div>
                                    </details>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Assign to Performance"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-xs text-muted-foreground">Select a performance to assign <strong>{participant.firstName}</strong> into.</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {allActs?.filter(act => !participant.acts?.some(a => a.id === act.id)).map(act => (
                            <button
                                key={act.id}
                                onClick={() => setSelectedActId(act.id)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selectedActId === act.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border/50 hover:border-primary/20'}`}
                            >
                                <div>
                                    <p className="text-sm font-black whitespace-nowrap">{act.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{act.participantCount} performers joined</p>
                                </div>
                                {selectedActId === act.id && <CheckCircle className="w-4 h-4 text-primary" />}
                            </button>
                        ))}
                        {allActs?.filter(act => !participant.acts?.some(a => a.id === act.id)).length === 0 && (
                            <div className="py-8 text-center bg-muted/30 rounded-xl border border-dashed">
                                <p className="text-xs font-bold text-muted-foreground">No more performances available</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
                        <Button variant="ghost" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                        <Button
                            onClick={handleAssignAct}
                            disabled={!selectedActId || assignToAct.isPending}
                        >
                            {assignToAct.isPending ? 'Assigning...' : 'Confirm Assignment'}
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* Final structural balance check */}

            {/* Edit Participant Modal */}
            {participant && (
                <EditParticipantModal
                    isOpen={showEditModal || editRequested}
                    onClose={closeEditProfile}
                    participant={participant}
                />
            )}

            <Modal
                isOpen={showUploadModal}
                onClose={() => {
                    setShowUploadModal(false);
                    setUploadTarget(null);
                }}
                title={uploadTarget?.title || 'Upload Asset'}
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Asset Name</label>
                        <input
                            type="text"
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder="Waiver, photo, audio note..."
                            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    {!uploadTarget?.templateId && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Asset Type</label>
                            <select
                                value={uploadType}
                                onChange={(e) => setUploadType(e.target.value as typeof uploadType)}
                                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="other">Other</option>
                                <option value="waiver">Waiver / Doc</option>
                                <option value="photo">Photo</option>
                                <option value="intro_media">Intro Media</option>
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Choose File</label>
                        <input
                            type="file"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="block w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-primary"
                        />
                        <p className="text-[10px] font-medium text-muted-foreground">
                            Selected file uploads into participant assets and appears in this tab after save.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notes</label>
                        <textarea
                            value={uploadNotes}
                            onChange={(e) => setUploadNotes(e.target.value)}
                            rows={3}
                            placeholder="Optional review notes or upload context"
                            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowUploadModal(false);
                                setUploadTarget(null);
                                setUploadFile(null);
                                setUploadNotes('');
                                setUploadName('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUploadAsset}
                            disabled={!uploadFile || uploadAsset.isPending}
                        >
                            {uploadAsset.isPending ? 'Uploading...' : 'Upload Asset'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title="Record History"
            >
                <div className="max-h-[72vh] overflow-y-auto pr-1">
                    <ParticipantHistoryContent participant={participant} />
                </div>
            </Modal>

            <AssetPreviewModal
                isOpen={!!selectedAssetUrl}
                onClose={() => setSelectedAssetUrl(null)}
                url={selectedAssetUrl}
                title="Participant Asset"
            />
            </div>
        </div>
    );
}

export default ParticipantProfilePage;

function ParticipantHistoryContent({ participant }: { participant: any }) {
    return (
        <div className="space-y-6 pt-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                <h4 className="text-sm font-black uppercase tracking-tight flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Source Traceability
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    This record was synchronized from <strong>{participant.sourceSystem || 'a direct manual entry'}</strong>.
                    The identity anchor used for this connection is <strong>{participant.sourceAnchorType || 'record_id'}</strong>.
                    Changes in the originating system will automatically propagate here during the next sync.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="p-4 bg-muted/20 border-border/50">
                    <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Context</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-muted-foreground">Originating System</label>
                            <p className="text-sm font-medium">{participant.sourceSystem || 'Manual Entry'}</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-muted-foreground">System ID (External)</label>
                            <p className="inline-block rounded bg-foreground/5 p-1 text-sm font-mono text-muted-foreground">{participant.sourceAnchorValue || 'N/A'}</p>
                        </div>
                    </div>
                </Card>
                <div className="space-y-3 rounded-2xl border-2 border-border/50 bg-muted/5 p-5">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/60">Sync Status</span>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold tabular-nums">
                                {participant.sourceLastSeenAt ? new Date(participant.sourceLastSeenAt).toLocaleDateString() : 'Active'}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">Healthy</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="flex items-center text-sm font-black uppercase tracking-widest text-muted-foreground/60">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    Raw Source Metadata
                </h3>
                <details className="group overflow-hidden rounded-2xl border-2 border-border/50 bg-muted/30">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-muted/50">
                        <span>View Raw Record Metadata</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <pre className="overflow-x-auto whitespace-pre-wrap border-t border-border/50 bg-background/50 p-6 text-[11px] font-mono leading-relaxed">
                        {JSON.stringify(participant.srcRaw, null, 2)}
                    </pre>
                </details>
            </div>

            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h3 className="flex items-center text-sm font-black uppercase tracking-widest text-muted-foreground">
                            <HistoryIcon className="w-4 h-4 mr-2 text-primary" />
                            Operational Accountability
                        </h3>
                        <p className="text-[10px] font-medium uppercase tracking-tighter text-muted-foreground">Human-readable history of record changes</p>
                    </div>
                    <div className="flex items-center rounded border border-emerald-500/10 bg-emerald-500/5 px-2 py-1 text-[9px] font-black uppercase text-emerald-500">
                        <Shield className="w-2.5 h-2.5 mr-1" />
                        Audit Active
                    </div>
                </div>

                <div className="relative space-y-6">
                    {participant.auditLogs && participant.auditLogs.length > 0 ? (
                        (participant.auditLogs as any[]).map((log) => {
                            const description = getActionDescription(log);
                            let operationLabel = log.operation;
                            let operationColor = 'bg-primary/10 text-primary';

                            if (log.operation === 'INSERT') {
                                operationLabel = 'Imported / Created';
                                operationColor = 'bg-emerald-500/10 text-emerald-500';
                            } else if (log.operation === 'UPDATE') {
                                operationLabel = 'Sync Update';
                                operationColor = 'bg-blue-500/10 text-blue-500';
                            }

                            return (
                                <div key={log.id} className="relative pl-8 pb-8 last:pb-0">
                                    <div className="absolute left-[3px] top-2 bottom-0 w-[0.5px] bg-border last:hidden" />
                                    <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full border border-background shadow-sm ${operationColor.split(' ')[0]}`} />

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline" className={`h-5 border-none px-1.5 text-[9px] font-bold uppercase tracking-wider ${operationColor}`}>
                                                {operationLabel}
                                            </Badge>
                                            <time className="text-[10px] font-medium text-muted-foreground">{formatDate(log.changedAt || log.createdAt)}</time>
                                        </div>
                                        <div className="space-y-2 rounded-xl border border-border/50 bg-background/50 p-4">
                                            <p className="text-xs font-bold text-foreground">{description}</p>
                                            <div className="flex items-center border-t border-border/10 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                <UserCircle className="w-3 h-3 mr-1.5 text-primary/60" />
                                                Traceability ID: {log.id?.slice(0, 8) || 'AUTO'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-3xl border-2 border-dashed border-border/50 bg-muted/10 py-16 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-background shadow-inner">
                                <Shield className="w-6 h-6 text-muted-foreground/20" />
                            </div>
                            <h4 className="mb-1 text-sm font-black uppercase tracking-widest text-foreground">No Integrity Logs</h4>
                            <p className="text-xs text-muted-foreground/60">System-level accountability is active and watching</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
