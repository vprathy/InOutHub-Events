import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    useParticipantDetail,
    useVerifyIdentity,
    useAddParticipantNote,
    useAssignToAct,
    useRemoveFromAct,
    useUpdateAssetStatus,
    useCreateAssetFulfillment,
    useUpdateParticipant,
    useResolveParticipantNote,
    useDeleteParticipantAsset
} from '@/hooks/useParticipants';
import { EditParticipantModal } from '@/components/participants/EditParticipantModal';
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
    ShieldCheck,
    ShieldAlert,
    Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';

type Tab = 'overview' | 'acts' | 'assets' | 'source' | 'audit';

// Helper functions for audit log
const getActionDescription = (log: any) => {
    if (log.operation === 'INSERT') return 'Initial record loaded';
    if (log.operation === 'UPDATE') {
        if (log.diff && Object.keys(log.diff).length > 0) {
            const changedFields = Object.keys(log.diff).map(key => key.replace(/_/g, ' ')).join(', ');
            return `Updated fields: ${changedFields}`;
        }
        return 'Record Updated';
    }
    if (log.operation === 'DELETE') return 'Record Removed';
    return log.operation;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(); // Or use a more specific format like date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
};

export function ParticipantProfilePage() {
    const { participantId } = useParams<{ participantId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Form and Action state
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteCategory, setNoteCategory] = useState<'operational' | 'internal' | 'special_request'>('operational');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedActId, setSelectedActId] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [isAISuggesting, setIsAISuggesting] = useState(false);

    const { data: participant, isLoading, error } = useParticipantDetail(participantId || '');

    // Available acts for assignment
    const { data: allActs } = useActsQuery(participant?.eventId || '');

    // Mutations
    const verifyIdentity = useVerifyIdentity(participantId || '');
    const addNote = useAddParticipantNote(participantId || '');
    const assignToAct = useAssignToAct(participantId || '');
    const removeFromAct = useRemoveFromAct(participantId || '');
    const updateAssetStatus = useUpdateAssetStatus(participantId || '');
    const createFulfillment = useCreateAssetFulfillment(participantId || '');
    const updateParticipantStatus = useUpdateParticipant(participantId || '');
    const resolveNote = useResolveParticipantNote(participantId || '');
    const deleteAsset = useDeleteParticipantAsset(participantId || '');

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;
        await addNote.mutateAsync({ content: noteContent, category: noteCategory });
        setNoteContent('');
        setShowNoteForm(false);
    };

    const handleVerify = async () => {
        await verifyIdentity.mutateAsync(!participant?.identityVerified);
    };

    const handleAssignAct = async () => {
        if (!selectedActId) return;
        await assignToAct.mutateAsync({ actId: selectedActId });
        setShowAssignModal(false);
        setSelectedActId('');
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as any;
        await updateParticipantStatus.mutateAsync({ status: newStatus });
    };

    const handleAISuggest = async () => {
        setIsAISuggesting(true);
        // Simulate an AI operation taking some time
        setTimeout(() => {
            alert('AI Suggestion completed: Recommended Acts are "Opening Number" and "Finale" based on participant\'s age and skills.');
            setIsAISuggesting(false);
        }, 1500);
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

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 md:px-0 pb-12">
            {/* Operational Header */}
            <div className="flex flex-col space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                        onClick={() => navigate('/participants')}
                        className="flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group min-h-[44px]"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Participants
                    </button>
                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <select
                            value={participant.status || 'active'}
                            onChange={handleStatusChange}
                            className={`px-3 py-1.5 text-[10px] font-black tracking-tight uppercase rounded-xl border outline-none transition-all min-h-[36px] ${participant.status === 'withdrawn' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                participant.status === 'missing_from_source' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                }`}
                        >
                            <option value="active">Active</option>
                            <option value="withdrawn">Withdrawn</option>
                            <option value="inactive">Inactive</option>
                            <option value="refunded">Refunded</option>
                            <option value="missing_from_source">Missing (Source)</option>
                        </select>
                        <Badge variant="outline" className={`px-3 py-1.5 text-[10px] font-black tracking-tight uppercase rounded-xl min-h-[36px] ${statusColors[participant.identityVerified ? 'Identity Confirmed' : 'Verification Required']}`}>
                            {participant.identityVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
                                {participant.firstName} {participant.lastName}
                            </h1>
                            <div className="flex items-center gap-2">
                                {participant.acts && participant.acts.length > 1 && (
                                    <Badge className="bg-indigo-500 text-white border-none text-[10px] font-black uppercase h-7 px-3 flex items-center shadow-lg shadow-indigo-500/20 animate-pulse rounded-full">
                                        <Activity className="w-3.5 h-3.5 mr-1.5" />
                                        Multi-Act
                                    </Badge>
                                )}
                                {participant.age && (
                                    <span className="text-xl font-bold text-muted-foreground/40 tabular-nums">
                                        {participant.age}y
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <div className="flex items-center">
                                {participant.identityVerified ? (
                                    <div className="flex items-center text-emerald-500">
                                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                                        <span>Verified</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-amber-500">
                                        <ShieldAlert className="w-4 h-4 mr-1.5" />
                                        <span>Action Required</span>
                                    </div>
                                )}
                            </div>

                            {participant.siblings && participant.siblings.length > 0 && (
                                <>
                                    <span className="opacity-20 hidden sm:inline">•</span>
                                    <div className="flex items-center text-primary">
                                        <Users className="w-4 h-4 mr-1.5" />
                                        <div className="flex items-center space-x-1.5">
                                            {participant.siblings.map((s, idx) => (
                                                <Link
                                                    key={s.id}
                                                    to={`/participants/${s.id}`}
                                                    className="hover:underline"
                                                >
                                                    {s.firstName}{idx < (participant.siblings?.length || 0) - 1 ? ',' : ''}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 sm:h-8 rounded-xl text-[10px] font-black uppercase bg-primary/5 text-primary hover:bg-primary/10 transition-all border border-primary/10 shadow-sm"
                            onClick={handleAISuggest}
                            disabled={isAISuggesting}
                        >
                            <Info className="w-3.5 h-3.5 mr-1.5" />
                            {isAISuggesting ? 'Suggesting...' : 'AI Suggest Acts'}
                        </Button>
                        <Button
                            variant={participant.identityVerified ? "ghost" : "default"}
                            size="sm"
                            className={`h-10 sm:h-8 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${participant.identityVerified ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/10' : ''}`}
                            onClick={handleVerify}
                        >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                            {participant.identityVerified ? 'Verified' : 'Verify'}
                        </Button>
                        <Button className="h-11 sm:h-10 px-6 font-black border-2 transition-all rounded-xl shadow-lg shadow-black/5 text-[10px] uppercase tracking-widest" variant="outline" onClick={() => setShowEditModal(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center space-x-1 bg-muted/30 p-1 rounded-2xl border border-border/50 max-w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'overview' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('acts')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'acts' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    Performances
                </button>
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'assets' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    Forms & Documents
                </button>
                <button
                    onClick={() => setActiveTab('source')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'source' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    Data Origin
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'audit' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    Audit Log
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm min-h-[500px] overflow-hidden">
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
                            <div className="p-8 space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center">
                                        <UserCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                                        Identity & Contact
                                    </h3>
                                    <div className="space-y-5">
                                        <div className="group">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Guardian Name</p>
                                            <p className="text-sm font-bold text-foreground">{participant.guardianName || 'Unknown'}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Guardian Phone</p>
                                            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50">
                                                <p className="text-lg font-black text-foreground font-mono">{participant.guardianPhone || 'No Phone'}</p>
                                                {participant.guardianPhone && (
                                                    <a href={`tel:${participant.guardianPhone}`} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center">
                                                        <Phone className="w-3.5 h-3.5 mr-2" />
                                                        Call
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {participant.siblings && participant.siblings.length > 0 && (
                                            <div className="group pt-4 border-t border-border/50">
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
                            <div className="p-8 space-y-8 bg-muted/5">
                                <div className="space-y-6">
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
                                            <form onSubmit={handleAddNote} className="p-4 bg-background border-2 border-primary/20 rounded-xl space-y-3 animate-in slide-in-from-top-2">
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
                                                            <button className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tighter" onClick={() => resolveNote.mutate(note.id)}>
                                                                Resolve
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
                                                <div className="py-8 text-center bg-muted/30 rounded-xl border border-dashed border-border/50">
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
                    <div className="p-8 space-y-10 animate-in fade-in duration-300">
                        {/* Readiness Indicator */}
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
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

                        {/* Required Asset Tasks (Templates) */}
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
                                                            onClick={() => !fulfillment && createFulfillment.mutate({ templateId: template.id, status: 'approved' })}
                                                            disabled={createFulfillment.isPending}
                                                        >
                                                            {fulfillment ? 'Replace' : 'Direct Approve'}
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
                                <Button size="sm" variant="outline" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg border-2">
                                    Manual Upload
                                </Button>
                            </div>

                            {participant.assets && participant.assets.filter(a => !a.templateId).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {participant.assets.filter(a => !a.templateId).map((asset) => (
                                        <div key={asset.id} className="p-4 border-2 border-border/50 rounded-2xl bg-muted/5 group hover:border-primary/20 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-4">
                                                <Badge variant="outline" className="text-[9px] font-mono uppercase h-4 px-1.5">
                                                    {asset.type}
                                                </Badge>
                                                <button onClick={() => {
                                                    if (confirm('Are you sure you want to delete this asset?')) {
                                                        deleteAsset.mutate(asset.id);
                                                    }
                                                }} className="p-1 hover:bg-destructive/10 rounded-lg transition-colors group/trash">
                                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/trash:text-destructive transition-colors" />
                                                </button>
                                            </div>
                                            <p className="font-bold text-sm truncate mb-1">{asset.name}</p>
                                            <p className="text-[10px] text-muted-foreground/60 font-medium tabular-nums">
                                                Added {new Date(asset.createdAt).toLocaleDateString()}
                                            </p>
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
                    <div className="p-8 space-y-8 animate-in fade-in duration-300">
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
                                        className="p-5 border-2 border-border/50 rounded-2xl bg-muted/10 group relative overflow-hidden flex items-center justify-between"
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
                                            className="p-3 bg-background border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/20 rounded-xl transition-all shadow-sm group/trash"
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
                    <div className="p-8 space-y-8 animate-in fade-in duration-300">
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
                    <div className="p-8 space-y-8 animate-in fade-in duration-300">
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

            {participant && (
                <EditParticipantModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    participant={participant as any}
                />
            )}
        </div>
    );
}

export default ParticipantProfilePage;
