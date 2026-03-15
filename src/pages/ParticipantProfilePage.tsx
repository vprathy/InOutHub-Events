import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
    ArrowLeft,
    Shield,
    History as HistoryIcon,
    Database,
    Info,
    AlertCircle,
    Phone,
    FileText,
    Clock,
    UserCircle,
    ChevronRight,
    Edit,
    CheckCircle,
    Users,
    RefreshCw,
    Plus,
    Trash2,
    Upload,
    ShieldCheck,
    ShieldAlert,
    Activity,
    Sparkles,
    X,
    Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EditParticipantModal } from '@/components/participants/EditParticipantModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/lib/supabase';

type Tab = 'overview' | 'acts' | 'assets' | 'source' | 'audit';

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

export function ParticipantProfilePage() {
    const { participantId } = useParams<{ participantId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Form and Action state
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteCategory, setNoteCategory] = useState<'operational' | 'internal' | 'special_request'>('operational');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedActId, setSelectedActId] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
    const [aiSuggestResult, setAiSuggestResult] = useState<string | null>(null);
    const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [headerThumbnailUrl, setHeaderThumbnailUrl] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<{ templateId?: string | null; replaceAssetId?: string | null; type: 'waiver' | 'photo' | 'intro_media' | 'other'; title: string } | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadType, setUploadType] = useState<'waiver' | 'photo' | 'intro_media' | 'other'>('other');
    const [uploadNotes, setUploadNotes] = useState('');
    const [assetNotice, setAssetNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

    const { data: participant, isLoading, error } = useParticipantDetail(participantId || '');

    const generativeAsset = participant?.actRequirements?.find(r => r.requirementType === 'Generative' && r.fulfilled);

    // Fetch signed URL for header thumbnail
    useEffect(() => {
        if (generativeAsset?.fileUrl) {
            (async () => {
                try {
                    const urlObj = new URL(generativeAsset.fileUrl!);
                    const pathParts = urlObj.pathname.split('/v1/object/public/');
                    const bucketAndPath = pathParts.length > 1 ? pathParts[1] : null;
                    const filePath = bucketAndPath?.replace('participant-assets/', '') || null;

                    if (filePath) {
                        const { data } = await supabase.storage
                            .from('participant-assets')
                            .createSignedUrl(filePath, 3600);
                        if (data?.signedUrl) setHeaderThumbnailUrl(data.signedUrl);
                    } else {
                        setHeaderThumbnailUrl(generativeAsset.fileUrl!);
                    }
                } catch (e) {
                    setHeaderThumbnailUrl(generativeAsset.fileUrl!);
                }
            })();
        } else {
            setHeaderThumbnailUrl(null);
        }
    }, [generativeAsset?.fileUrl]);

    const handlePreviewAsset = async (fileUrl: string, assetType?: string) => {
        if (!fileUrl) return;
        
        // Skip signed URL logic for non-poster assets to prevent undefined/bucket errors
        if (assetType && assetType !== 'POSTER' && assetType !== 'Generative') {
            console.log(`[Handshake] Skipping signed URL for asset type: ${assetType}`);
            setSelectedAssetUrl(fileUrl);
            return;
        }

        setPreviewLoading(true);
        try {
            // Extract path robustly
            let filePath = null;
            if (fileUrl.includes('supabase.co/storage/v1/object/public/')) {
                const parts = fileUrl.split('/public/')[1]?.split('/');
                if (parts && parts.length > 1) {
                    // Skip the bucket name (parts[0])
                    filePath = parts.slice(1).join('/');
                }
            } else if (!fileUrl.startsWith('http')) {
                // Assume it's already a path
                filePath = fileUrl;
            }

            if (filePath) {
                const { data, error } = await supabase.storage
                    .from('participant-assets')
                    .createSignedUrl(filePath, 3600); // 1 hour

                if (error) throw error;
                setSelectedAssetUrl(data.signedUrl);
            } else {
                // Fallback to direct URL
                setSelectedAssetUrl(fileUrl);
            }
        } catch (err) {
            console.error('Error generating signed URL:', err);
            setSelectedAssetUrl(fileUrl); // Final fallback
        } finally {
            setPreviewLoading(false);
        }
    };

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
    const hasAssignedActs = Boolean(participant?.acts && participant.acts.length > 0);

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

    const handleAiSuggest = async () => {
        if (!participant?.acts || participant.acts.length === 0) {
            setShowAssignModal(true);
            return;
        }
        const existingPoster = participant.actRequirements?.find(r => r.requirementType === 'Generative' && r.fulfilled);
        
        if (existingPoster) {
            const confirmRegen = window.confirm(
                "A cinematic poster already exists for this act. Regenerating will use additional AI credits. Do you want to continue?"
            );
            if (!confirmRegen) return;
        }

        setAiSuggestLoading(true);
        // Keep previous result visible until new one arrives to avoid "flicker/vanishing"
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-act-assets`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'x-inouthub-trust': 'inouthub-internal-2026-v16'
                    },
                    body: JSON.stringify({ actId: participant.acts[0].id, bucket: 'participant-assets', testOnly: false }),
                }
            );
            const result = await res.json();
            if (result.error) {
                setAiSuggestResult(`Error: ${result.error}`);
            } else if (result.isPending) {
                // Handle Silent Failure / Brand Safety Review gracefully for Demo
                setAiSuggestResult(result.message || 'Poster generation is under review');
                // Don't auto-dismiss immediately so the user can see it
                setTimeout(() => setAiSuggestResult(null), 8000);
            } else {
                setAiSuggestResult('Poster updated');
                // Refresh data to show the new asset in the Assets tab
                queryClient.invalidateQueries({ queryKey: ['participant', participantId] });
                // Auto-dismiss success status after 5s
                setTimeout(() => setAiSuggestResult(null), 5000);
            }
        } catch (err: any) {
            setAiSuggestResult(`Network error: ${err.message}`);
        } finally {
            setAiSuggestLoading(false);
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

    const statusColors: Record<string, string> = {
        'Identity Confirmed': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        'Verification Required': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        'ready': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        'missing_assets': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        'Needs Placement': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        'In Review': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
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
    const stageReadinessPercent = Math.round((approvedAssetCount / (totalAssetCount || 1)) * 100);
    const subtitleParts = [
        assignedActCount === 1 ? '1 performance assigned' : `${assignedActCount} performances assigned`,
        totalAssetCount > 0 ? `${approvedAssetCount}/${totalAssetCount} requirements approved` : 'No required assets',
        participant.identityVerified ? 'identity verified' : 'manual verification needed',
    ];

    return (
        <div className="relative">
            {/* Non-intrusive Notification Toast */}
            {aiSuggestResult && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
                    <div className={`px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md border flex items-center space-x-3 pointer-events-auto ${
                        aiSuggestResult.startsWith('Error') 
                        ? 'bg-destructive/90 border-destructive/20 text-white' 
                        : 'bg-emerald-600/90 border-emerald-500/20 text-white'
                    }`}>
                        {aiSuggestResult.startsWith('Error') ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        <span className="text-sm font-bold tracking-tight">{aiSuggestResult}</span>
                        <button onClick={() => setAiSuggestResult(null)} className="ml-4 hover:opacity-70">
                            <Plus className="w-4 h-4 rotate-45" />
                        </button>
                    </div>
                </div>
            )}

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

            <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 space-y-4 px-4 pb-12 duration-500 md:px-0">
                <button
                    onClick={() => navigate('/participants')}
                    className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Roster
                </button>

                <PageHeader
                    title={`${participant.firstName} ${participant.lastName}`}
                    subtitle={subtitleParts.join(' • ')}
                    actions={
                        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-11 rounded-xl border border-primary/10 bg-primary/5 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-primary hover:bg-primary/10"
                                onClick={handleAiSuggest}
                                disabled={aiSuggestLoading}
                            >
                                {aiSuggestLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                                {aiSuggestLoading
                                    ? 'Generating...'
                                    : !hasAssignedActs
                                        ? 'Assign to Performance'
                                        : (participant.actRequirements?.some(r => r.requirementType === 'Generative' && r.fulfilled) ? 'Regenerate Poster' : 'Generate Poster')}
                            </Button>
                            <Button
                                className="min-h-11 rounded-xl border border-border/50 px-4 text-[10px] font-bold uppercase tracking-[0.18em]"
                                variant="outline"
                                onClick={() => setShowEditModal(true)}
                            >
                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                Edit Profile
                            </Button>
                        </div>
                    }
                    status={
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 p-2">
                            <select
                                value={participant.status || 'active'}
                                onChange={(e) => updateStatus.mutate(e.target.value as any)}
                                className={`min-h-11 rounded-xl border px-3 text-[10px] font-black uppercase tracking-[0.18em] outline-none transition-all ${participant.status === 'withdrawn'
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
                                <option value="missing_from_source">Missing (Source)</option>
                            </select>

                            <Badge variant="outline" className={`min-h-11 rounded-xl border-none px-3 text-[10px] font-black uppercase tracking-[0.18em] ${statusColors[participant.identityVerified ? 'Identity Confirmed' : 'Verification Required']}`}>
                                {participant.identityVerified ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />}
                                {participant.identityVerified ? 'Verified' : 'Unverified'}
                            </Badge>

                            {participant.age ? (
                                <Badge variant="outline" className="min-h-11 rounded-xl border-none bg-muted/50 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                    Age {participant.age}
                                </Badge>
                            ) : null}

                            {assignedActCount > 1 ? (
                                <Badge className="min-h-11 rounded-xl border-none bg-indigo-500 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-md shadow-indigo-500/20">
                                    <Activity className="mr-1.5 h-3.5 w-3.5" />
                                    Multi-Act
                                </Badge>
                            ) : null}

                            <Badge variant="outline" className="min-h-11 rounded-xl border-none bg-primary/5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                                {participant.eventId ? 'Event Registered' : 'Draft Roster'}
                            </Badge>

                            {generativeAsset ? (
                                <button
                                    onClick={() => generativeAsset.fileUrl && handlePreviewAsset(generativeAsset.fileUrl, 'Generative')}
                                    className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary transition-all hover:bg-primary/20"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Poster Ready
                                    <span className="relative h-8 w-8 overflow-hidden rounded-lg border border-primary/30 bg-black">
                                        {headerThumbnailUrl ? (
                                            <img src={headerThumbnailUrl} alt="Poster preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ) : null}
                        </div>
                    }
                />

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Performances</p>
                        <div className="mt-1 flex items-end justify-between gap-3">
                            <p className="text-xl font-black tracking-tight text-foreground">{assignedActCount}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                                {assignedActCount > 0 ? 'Assignments active' : 'Needs placement'}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Assets</p>
                        <div className="mt-1 flex items-end justify-between gap-3">
                            <p className="text-xl font-black tracking-tight text-foreground">{approvedAssetCount}/{totalAssetCount}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">{stageReadinessPercent}% ready</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Follow-Up</p>
                        <div className="mt-1 flex items-end justify-between gap-3">
                            <p className="text-xl font-black tracking-tight text-foreground">{unresolvedNoteCount}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                                {unresolvedNoteCount > 0 ? 'Open notes' : 'Clear'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 rounded-l-2xl bg-gradient-to-r from-background via-background/90 to-transparent sm:hidden" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rounded-r-2xl bg-gradient-to-l from-background via-background/90 to-transparent sm:hidden" />
                    <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/40 bg-muted/20 p-1 shadow-inner scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${activeTab === 'overview' ? 'border border-primary/20 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Info size={14} />
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('acts')}
                            className={`flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${activeTab === 'acts' ? 'border border-primary/20 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Sparkles size={14} />
                            Performances
                        </button>
                        <button
                            onClick={() => setActiveTab('assets')}
                            className={`flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${activeTab === 'assets' ? 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Plus size={14} />
                            Assets
                        </button>
                        <button
                            onClick={() => setActiveTab('source')}
                            className={`flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${activeTab === 'source' ? 'border border-primary/20 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Shield size={14} />
                            Data Origin
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${activeTab === 'audit' ? 'border border-primary/20 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <HistoryIcon size={14} />
                            Audit Log
                        </button>
                    </div>
                </div>

            {/* Content Area */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm min-h-[500px]">
                {activeTab === 'overview' && (
                    <div className="divide-y divide-border/50 animate-in fade-in duration-300">
                        {/* Status Alert Banner */}
                        {participant.hasSpecialRequests && (
                            <div className="p-4 bg-amber-500/5 border-b border-amber-500/10 flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-tighter">
                                        <span className="text-xs font-bold text-amber-500 uppercase">Review Required</span>
                                    </h4>
                                    <p className="text-xs text-amber-500/80 font-medium">
                                        "{participant.specialRequestRaw}"
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                            {/* Contact & Identity */}
                            <div className="p-4 sm:p-5 space-y-5">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center antialiased">
                                        <UserCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                                        Identity & Contact
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="group">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 antialiased">Guardian Name</p>
                                            <p className="text-sm font-bold text-foreground antialiased">{participant.guardianName || 'Unknown'}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 antialiased">Guardian Phone</p>
                                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                                                <p className="text-base font-bold text-foreground font-mono antialiased">{participant.guardianPhone || 'No Phone'}</p>
                                                {participant.guardianPhone && (
                                                    <a href={`tel:${participant.guardianPhone}`} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110 antialiased">
                                                        <Phone className="w-3 h-3 mr-1.5" />
                                                        Call
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {participant.notes && (
                                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                                                    <Info className="w-3 h-3" />
                                                    <p className="text-[10px] font-bold uppercase tracking-wider antialiased">Internal Bio / Notes</p>
                                                </div>
                                                <p className="text-xs font-medium text-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3 antialiased">
                                                    "{participant.notes}"
                                                </p>
                                            </div>
                                        )}
                                        {participant.siblings && participant.siblings.length > 0 && (
                                            <div className="group border-t border-border/50 pt-3">
                                                <div className="flex items-center justify-between mb-3 text-emerald-600">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Family & Group Linkage</h4>
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <div className="space-y-2">
                                                    {participant.siblings.map(s => (
                                                        <Link
                                                            key={s.id}
                                                            to={`/participants/${s.id}`}
                                                            className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl hover:bg-emerald-500/10 transition-colors group/sib"
                                                        >
                                                            <div className="flex items-center">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3" />
                                                                <span className="text-sm font-bold">{s.firstName} {s.lastName}</span>
                                                            </div>
                                                            <div className="flex items-center text-[10px] font-black uppercase text-emerald-600/60 group-hover/sib:text-emerald-600 transition-colors">
                                                                View Profile
                                                                <ChevronRight className="w-3 h-3 ml-1" />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Coordination & Risks */}
                            <div className="bg-muted/5 p-4 sm:p-5 space-y-5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center">
                                            <FileText className="w-3.5 h-3.5 mr-2 text-primary" />
                                            Active Coordination
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-6 px-2 text-[10px] font-bold uppercase tracking-tighter ${showNoteForm ? 'text-destructive' : ''}`}
                                            onClick={() => setShowNoteForm(!showNoteForm)}
                                        >
                                            {showNoteForm ? 'Cancel' : 'Add Note'}
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {showNoteForm && (
                                            <form onSubmit={handleAddNote} className="animate-in slide-in-from-top-2 space-y-3 rounded-xl border-2 border-primary/20 bg-background p-4">
                                                <div className="flex items-center space-x-2">
                                                    {(['operational', 'internal', 'special_request'] as const).map(cat => (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => setNoteCategory(cat)}
                                                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-all ${noteCategory === cat ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    autoFocus
                                                    value={noteContent}
                                                    onChange={(e) => setNoteContent(e.target.value)}
                                                    placeholder="Enter coordination note or risk flag..."
                                                    className="w-full h-20 text-xs bg-muted/30 border-none focus:ring-1 focus:ring-primary rounded-lg p-2 resize-none"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-border" id="internal-note" />
                                                        <label htmlFor="internal-note" className="text-xs font-medium text-muted-foreground">Mark as Confidential (Staff Only)</label>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        type="submit"
                                                        className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest"
                                                        disabled={addNote.isPending || !noteContent.trim()}
                                                    >
                                                        {addNote.isPending ? 'Saving...' : 'Save Note'}
                                                    </Button>
                                                </div>
                                            </form>
                                        )}

                                        {participant.operationalNotes && participant.operationalNotes.length > 0 ? (
                                            participant.operationalNotes.map((note) => (
                                                <div key={note.id} className={`p-4 rounded-xl border transition-all ${note.isResolved ? 'bg-muted/30 border-border opacity-60' : 'bg-background border-primary/20 shadow-sm italic'}`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <Badge variant="outline" className={`text-[9px] h-4 px-1 font-bold uppercase tracking-tighter ${note.category === 'special_request' ? 'border-amber-500 text-amber-500' : ''}`}>
                                                            {note.category}
                                                        </Badge>
                                                        {!note.isResolved && (
                                                            <button
                                                                className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tighter"
                                                                onClick={() => resolveNote.mutate(note.id)}
                                                                disabled={resolveNote.isPending}
                                                            >
                                                                {resolveNote.isPending ? 'Resolving...' : 'Resolve'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs leading-relaxed font-medium">
                                                        {note.content}
                                                    </p>
                                                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                        <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Just now'}</span>
                                                        {note.isResolved && <span className="text-emerald-500 flex items-center font-bold"><Info className="w-2.5 h-2.5 mr-1" /> Resolved</span>}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            !showNoteForm && (
                                                <div className="rounded-xl border border-dashed border-border/50 bg-muted/30 py-6 text-center">
                                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">No active flags</p>
                                                    <p className="text-[10px] text-muted-foreground/60">Risk assessment clean</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'assets' && (
                    <div className="animate-in fade-in space-y-8 p-4 sm:p-5 duration-300">
                        {/* Generative AI Media Section */}
                        {participant.actRequirements?.some(r => r.requirementType === 'Generative' && r.fulfilled) && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generative Experience Assets
                                    </h3>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-tight">AI Generated</Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {participant.actRequirements
                                        .filter(r => r.requirementType === 'Generative' && r.fulfilled)
                                        .map((asset) => (
                                            <div 
                                                                className="relative aspect-[2/3] bg-black rounded-lg overflow-hidden border border-border/50 group cursor-zoom-in"
                                                                 onClick={() => asset.fileUrl && handlePreviewAsset(asset.fileUrl, 'POSTER')}
                                                            >
                                                <div className="aspect-[16/9] w-full overflow-hidden">
                                                    <img 
                                                        src={asset.fileUrl || ''} 
                                                        alt="AI Generated Poster" 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xl font-black tracking-tight">Cinematic Performance Poster</h4>
                                                        <Badge className="bg-emerald-500/90 text-white border-none text-[10px] font-bold uppercase">Ready</Badge>
                                                    </div>
                                                    <p className="text-sm text-white/70 font-medium mb-4">Dynamically generated based on act composition & performers</p>
                                                    <div className="flex items-center space-x-3">
                                                        <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md text-[10px] font-bold uppercase" asChild>
                                                            <a href={asset.fileUrl || ''} target="_blank" rel="noopener noreferrer">View Original</a>
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5 text-[10px] font-bold uppercase">Download</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Readiness Indicator */}
                        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight">Stage Readiness</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {participant.templatedAssets?.every(a => a.fulfillment?.status === 'approved') ? 'All clear for stage performance' : 'Critical documents or media pending'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black tabular-nums">
                                    {Math.round((participant.templatedAssets?.filter(a => a.fulfillment?.status === 'approved').length || 0) / (participant.templatedAssets?.length || 1) * 100)}%
                                </p>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ready Score</p>
                            </div>
                        </div>

                        {/* Templated Assets Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                                    Required Tasks & Artifacts
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tabular-nums">
                                    {participant.templatedAssets?.filter(a => !!a.fulfillment).length || 0} / {participant.templatedAssets?.length || 0} Complete
                                </Badge>
                            </div>

                            {participant.templatedAssets && participant.templatedAssets.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {participant.templatedAssets.map(({ template, fulfillment }) => (
                                        <div
                                            key={template.id}
                                            className={`p-5 rounded-2xl border-2 transition-all relative overflow-hidden group ${fulfillment?.status === 'approved'
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : fulfillment?.status === 'rejected'
                                                    ? 'bg-destructive/5 border-destructive/20'
                                                    : fulfillment
                                                        ? 'bg-primary/5 border-primary/20'
                                                        : 'bg-muted/10 border-border/50 grayscale opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-lg font-black tracking-tight">{template.name}</span>
                                                        {template.isRequired && (
                                                            <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black uppercase h-4 px-1">Required</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-medium">{template.description || 'Mandatory operational artifact'}</p>
                                                </div>
                                                <div className="shrink-0">
                                                    {fulfillment?.status === 'approved' ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                            <CheckCircle className="w-5 h-5 text-white" />
                                                        </div>
                                                    ) : fulfillment ? (
                                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                                            <Clock className="w-4 h-4 text-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-muted border-2 border-border/50 border-dashed" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col space-y-3 pt-2 border-t border-border/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase h-5">
                                                            Scope: {template.actId ? 'Act' : template.eventId ? 'Event' : 'Org'}
                                                        </Badge>
                                                        {fulfillment && (
                                                            <Badge className={`${fulfillment.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'} border-none text-[9px] font-bold uppercase h-5`}>
                                                                {fulfillment.status.replace(/_/g, ' ')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {fulfillment && fulfillment.status !== 'approved' && (
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-2 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-white"
                                                                onClick={() => updateAssetStatus.mutate({ assetId: fulfillment.id, status: 'approved' })}
                                                                disabled={updateAssetStatus.isPending}
                                                            >
                                                                Approve
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant={fulfillment ? "ghost" : "default"}
                                                            className="h-7 px-2 text-[9px] font-black uppercase tracking-widest rounded-lg"
                                                            onClick={() => openUploadModal({
                                                                templateId: template.id,
                                                                replaceAssetId: fulfillment?.id || null,
                                                                type: template.assetType || 'other',
                                                                title: fulfillment ? `Replace ${template.name}` : `Upload ${template.name}`,
                                                                suggestedName: template.name,
                                                            })}
                                                            disabled={uploadAsset.isPending}
                                                        >
                                                            {fulfillment ? 'Replace Upload' : 'Upload'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {fulfillment && fulfillment.status === 'pending_review' && (
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-[9px] font-bold uppercase text-destructive border-destructive/20 hover:bg-destructive/10"
                                                            onClick={() => {
                                                                const notes = prompt('Enter rejection reason:');
                                                                if (notes) updateAssetStatus.mutate({ assetId: fulfillment.id, status: 'rejected', reviewNotes: notes });
                                                            }}
                                                        >
                                                            Reject with feedback
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {fulfillment?.reviewNotes && (
                                                <div className="mt-3 p-3 bg-background/50 rounded-xl border border-destructive/10">
                                                    <p className="text-[10px] text-destructive font-bold uppercase tracking-tighter mb-1 flex items-center">
                                                        <AlertCircle className="w-2.5 h-2.5 mr-1" /> Rejection Note
                                                    </p>
                                                    <p className="text-[11px] italic leading-tight">{fulfillment.reviewNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
                                    <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                                    <h4 className="text-sm font-black text-foreground mb-1 uppercase tracking-widest">No Templated Tasks</h4>
                                    <p className="text-xs text-muted-foreground/60 max-w-[280px] mx-auto">
                                        This event hasn't defined any global requirements for participants yet.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Ad-hoc / Other Uploads */}
                        <div className="space-y-6 pt-6 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center">
                                    <Plus className="w-4 h-4 mr-2 text-primary" />
                                    Other Participant Assets
                                </h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg border-2"
                                    onClick={() => openUploadModal({
                                        type: 'other',
                                        title: 'Upload Participant Asset',
                                    })}
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    Manual Upload
                                </Button>
                            </div>

                            {participant.assets && participant.assets.filter(a => !a.templateId).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {participant.assets.filter(a => !a.templateId).map((asset) => (
                                        <div 
                                            key={asset.id} 
                                            className="p-4 border-2 border-border/50 rounded-2xl bg-muted/5 group hover:border-primary/20 transition-all cursor-zoom-in"
                                            onClick={async () => {
                                                if (asset.fileUrl) {
                                                    // Generate Signed URL for secure mobile viewing if needed, 
                                                    // but for now we'll just use the public URL if it's already there
                                                    setSelectedAssetUrl(asset.fileUrl);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <Badge variant="outline" className="text-[9px] font-mono uppercase h-4 px-1.5">
                                                    {asset.type}
                                                </Badge>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('Delete this asset? This cannot be undone.')) {
                                                            deleteAsset.mutate(asset.id);
                                                        }
                                                    }}
                                                    className="p-1 hover:bg-destructive/10 rounded-lg transition-colors group/trash"
                                                    disabled={deleteAsset.isPending}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/trash:text-destructive transition-colors" />
                                                </button>
                                            </div>
                                            <p className="font-bold text-sm truncate mb-1">{asset.name}</p>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                                                <p className="text-[10px] text-muted-foreground/60 font-medium tabular-nums">
                                                    {new Date(asset.createdAt).toLocaleDateString()}
                                                </p>
                                                <div className="text-[10px] font-black text-primary uppercase opacity-0 group-hover:opacity-100 transition-opacity">Preview</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center bg-muted/5 rounded-3xl border-2 border-dashed border-border/30">
                                    <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em]">Zero ad-hoc assets</p>
                                    <p className="text-[10px] text-muted-foreground/40 mt-1">Manual uploads appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'acts' && (
                    <div className="animate-in fade-in space-y-6 p-4 sm:p-5 duration-300">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                                    <Database className="w-4 h-4 mr-2 text-primary" />
                                    Operational Assignments
                                </h3>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Manage which acts this participant is performing in</p>
                            </div>
                            <Button size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg" onClick={() => setShowAssignModal(true)}>
                                Assign to Act
                            </Button>
                        </div>

                        {participant.acts && participant.acts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {participant.acts.map((act) => (
                                    <div
                                        key={act.id}
                                        className="group relative flex items-center justify-between overflow-hidden rounded-2xl border-2 border-border/50 bg-muted/10 p-4"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase h-5 px-2">
                                                    {act.role || 'Performer'}
                                                </Badge>
                                                <Badge variant="outline" className="text-[9px] h-4 font-mono uppercase">
                                                    {act.arrivalStatus?.replace(/_/g, ' ') || 'Registered'}
                                                </Badge>
                                            </div>
                                            <p className="font-black text-lg tracking-tight">{act.name}</p>
                                            <div className="flex items-center text-[10px] text-muted-foreground font-bold uppercase tracking-tighter pt-1">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Requirement Impact: None
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromAct.mutate(act.id)}
                                            className="min-h-11 rounded-xl border border-border/50 bg-background p-3 text-muted-foreground shadow-sm transition-all hover:border-destructive/20 hover:text-destructive group/trash"
                                            title="Remove from act"
                                            disabled={removeFromAct.isPending}
                                        >
                                            <Trash2 className="w-4 h-4 group-hover/trash:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
                                <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                                <h4 className="text-sm font-bold text-foreground mb-1 uppercase tracking-widest">No Active Assignments</h4>
                                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto mb-6">
                                    This participant is currently on the roster but not assigned to any specific acts or groups.
                                </p>
                                <Button variant="outline" size="sm" className="h-9 px-6 font-bold uppercase tracking-widest text-[10px] rounded-xl border-2" onClick={() => setShowAssignModal(true)}>
                                    Add Assignment
                                </Button>
                            </div>
                        )}

                        {/* Assignment Modal */}
                        <Modal
                            isOpen={showAssignModal}
                            onClose={() => setShowAssignModal(false)}
                            title="Assign to Act"
                        >
                            <div className="space-y-4 pt-2">
                                <p className="text-xs text-muted-foreground">Select an act to assign <strong>{participant.firstName}</strong> as a performer.</p>
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
                                            <p className="text-xs font-bold text-muted-foreground">No more acts available</p>
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

                    </div>
                )}

                {activeTab === 'source' && (
                    <div className="animate-in fade-in space-y-6 p-4 sm:p-5 duration-300">
                        <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 space-y-2">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="p-4 bg-muted/20 border-border/50">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">System Context</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground block uppercase">Originating System</label>
                                        <p className="text-sm font-medium">{participant.sourceSystem || 'Manual Entry'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground block uppercase">System ID (External)</label>
                                        <p className="text-sm font-mono text-muted-foreground bg-black/5 p-1 rounded inline-block">{participant.sourceAnchorValue || 'N/A'}</p>
                                    </div>
                                </div>
                            </Card>
                            <div className="p-6 border-2 border-border/50 rounded-2xl bg-muted/5 space-y-3">
                                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-[0.2em]">Sync Status</span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <RefreshCw className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-bold tabular-nums">
                                            {participant.sourceLastSeenAt ? new Date(participant.sourceLastSeenAt).toLocaleDateString() : 'Active'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Healthy</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-primary" />
                                Technical Origin Details
                            </h3>
                            <details className="group border-2 border-border/50 rounded-2xl bg-muted/30 overflow-hidden">
                                <summary className="p-4 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-muted/50 transition-colors list-none flex items-center justify-between">
                                    <span>View Raw Record Metadata</span>
                                    <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                                </summary>
                                <pre className="p-6 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border-t border-border/50 bg-background/50">
                                    {JSON.stringify(participant.srcRaw, null, 2)}
                                </pre>
                            </details>
                        </div>
                        <Card className="md:col-span-2 p-4 bg-muted/20 border-border/50">
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Original Submission Details</h4>
                            <div className="bg-black/5 rounded-lg p-4 font-mono text-[10px] overflow-x-auto">
                                <pre>{JSON.stringify(participant.srcRaw || {}, null, 2)}</pre>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-in fade-in space-y-6 p-4 sm:p-5 duration-300">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center">
                                    <HistoryIcon className="w-4 h-4 mr-2 text-primary" />
                                    Operational Accountability
                                </h3>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Human-readable history of all record transformations</p>
                            </div>
                            <div className="flex items-center bg-emerald-500/5 text-emerald-500 px-2 py-1 rounded border border-emerald-500/10 text-[9px] font-black uppercase">
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
                                            {/* Line */}
                                            <div className="absolute left-[3px] top-2 bottom-0 w-[0.5px] bg-border last:hidden" />
                                            {/* Dot */}
                                            <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full border border-background shadow-sm ${operationColor.split(' ')[0]}`} />

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider px-1.5 h-5 border-none ${operationColor}`}>
                                                        {operationLabel}
                                                    </Badge>
                                                    <time className="text-[10px] text-muted-foreground font-medium">{formatDate(log.changedAt || log.createdAt)}</time>
                                                </div>
                                                <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-2">
                                                    <p className="text-xs font-bold text-foreground">{description}</p>
                                                    <div className="flex items-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest pt-1 border-t border-border/10">
                                                        <UserCircle className="w-3 h-3 mr-1.5 text-primary/60" />
                                                        Traceability ID: {log.id?.slice(0, 8) || 'AUTO'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-16 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
                                    <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-border shadow-inner">
                                        <Shield className="w-6 h-6 text-muted-foreground/20" />
                                    </div>
                                    <h4 className="text-sm font-black text-foreground mb-1 uppercase tracking-widest">No Integrity Logs</h4>
                                    <p className="text-xs text-muted-foreground/60">System-level accountability is active and watching</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* Final structural balance check */}

            {/* Edit Participant Modal */}
            {participant && (
                <EditParticipantModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
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

        {/* Poster Lightbox/Full-screen View */}
            {selectedAssetUrl && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
                    onClick={() => setSelectedAssetUrl(null)}
                >
                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center space-y-4">
                        <button 
                            className="absolute top-0 right-0 p-3 text-white/60 hover:text-white transition-colors"
                            onClick={() => setSelectedAssetUrl(null)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        
                        {previewLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                <p className="text-white/60 font-black uppercase tracking-widest text-xs">Decrypting Signed Asset...</p>
                            </div>
                        ) : (
                            <>
                                <img 
                                    src={selectedAssetUrl} 
                                    alt="AI Generated Poster Full View" 
                                    className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500"
                                />
                                <div className="text-center space-y-1">
                                    <h2 className="text-xl font-black text-white tracking-tight uppercase">
                                        {selectedAssetUrl?.includes('POSTER') || selectedAssetUrl?.includes('pout_') ? 'Cinematic Preview' : 'Asset Verification'}
                                    </h2>
                                    {selectedAssetUrl?.includes('token=') && (
                                        <p className="text-sm text-white/60 font-medium animate-pulse">Verified via Secure Signed URL</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default ParticipantProfilePage;
