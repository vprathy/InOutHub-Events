import { useParams, useNavigate } from 'react-router-dom';
import { useActDetail, useAddActReadinessPractice, useAddActReadinessItem, useAddActReadinessIssue } from '@/hooks/useActs';
import {
    Users,
    Settings,
    FileText,
    ChevronLeft,
    Clock,
    Timer,
    Info,
    CheckCircle,
    AlertCircle,
    UserPlus,
    Music,
    MonitorPlay,
    ChevronRight,
    CalendarClock,
    ListChecks,
    TriangleAlert,
    Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IntroVideoBuilder } from '@/components/acts/IntroVideoBuilder';
import { UploadActAssetModal } from '@/components/acts/UploadActAssetModal';
import { AddParticipantToActModal } from '@/components/acts/AddParticipantToActModal';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatReadinessDate, getActReadinessLabel } from '@/lib/actReadiness';
import { buildActRequirementRows, getRequirementStatusMeta, type RequirementRow } from '@/lib/requirementsPrototype';
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard } from '@/components/ui/OperationalCards';
import { AssetPreviewModal } from '@/components/ui/AssetPreviewModal';
import { useSelection } from '@/context/SelectionContext';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';

type TabType = 'workspace' | 'cast' | 'assets';

export function PerformanceProfilePage() {
    const { actId } = useParams();
    const navigate = useNavigate();
    const { organizationId } = useSelection();
    const [activeTab, setActiveTab] = useState<TabType>('workspace');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [addRole, setAddRole] = useState<'Performer' | 'Manager'>('Performer');
    const [previewAsset, setPreviewAsset] = useState<{ url: string; title: string } | null>(null);
    const { data: act, isLoading } = useActDetail(actId || null);
    const capabilities = useEventCapabilities(act?.eventId || null, organizationId || null);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium">Loading Performance Workspace...</p>
            </div>
        );
    }

    if (!act) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertCircle size={48} className="text-destructive" />
                <h2 className="text-2xl font-bold">Performance Not Found</h2>
                <Button onClick={() => navigate('/performances')}>Back to Performances</Button>
            </div>
        );
    }

    const requirementRows = buildActRequirementRows(act);
    const unresolvedRequirementRows = requirementRows.filter((row) => !['approved', 'auto_complete'].includes(row.status));
    const nextRequirementRow = unresolvedRequirementRows[0] || requirementRows[0] || null;
    const introRequirement = (act.requirements || []).find((requirement: any) => requirement.requirementType === 'IntroComposition');
    const canManageReadiness = capabilities.canManageReadiness;
    const canManageActCast = capabilities.canManageActCast;
    const canManageActMedia = capabilities.canManageActMedia;
    const headerSummaryItems = [
        { label: 'Cast', value: `${act.participants.length}`, helper: act.participants.length === 1 ? 'assigned person' : 'assigned people', icon: Users },
        { label: 'Show', value: `${act.durationMinutes}m`, helper: 'scheduled performance', icon: Timer },
        { label: 'Setup', value: `${act.setupTimeMinutes}m`, helper: 'operator-managed handoff', icon: Clock },
        { label: 'Intro', value: introRequirement?.fulfilled ? 'Approved' : introRequirement ? 'Draft' : 'Open', helper: introRequirement?.fulfilled ? 'ready for console' : 'review in intro studio', icon: MonitorPlay },
    ];
    const handleRequirementAction = (row: RequirementRow) => {
        setActiveTab(row.target);
    };

    return (
        <div className="flex flex-col space-y-5 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col space-y-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/performances')}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group p-0 h-auto self-start"
                >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Performances
                </Button>

                <PageHeader
                    title={act.name}
                    subtitle={`${act.participants.length} cast members assigned • ${getActReadinessLabel(act.readinessSummary?.state)} • ${introRequirement?.fulfilled ? 'intro approved' : 'intro still needs review'}`}
                    status={
                        <div className="w-full rounded-2xl border border-border/40 bg-muted/20 p-3">
                            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                                {headerSummaryItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="rounded-2xl border border-border/50 bg-background/80 p-3">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Icon className="h-3.5 w-3.5" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em]">{item.label}</p>
                                            </div>
                                            <p className="mt-2 text-lg font-black tracking-tight text-foreground">{item.value}</p>
                                            <p className="mt-1 text-xs font-medium text-muted-foreground">{item.helper}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="min-h-11 rounded-xl border-none bg-emerald-500/10 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                                    {getActReadinessLabel(act.readinessSummary?.state)}
                                </Badge>
                                <Badge variant="outline" className="min-h-11 rounded-xl border-none bg-muted px-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                    Live status changes like wait, in, back, and ready belong in show-day execution, not this prep screen.
                                </Badge>
                            </div>
                        </div>
                    }
                />
            </div>

            <div className="relative">
                <div className="flex items-center space-x-1 bg-muted/40 p-1.5 rounded-2xl border border-border/40 w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory antialiased shadow-inner">
                    <button
                        onClick={() => setActiveTab('workspace')}
                        data-tab="overview"
                        className={`whitespace-nowrap px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 border ${activeTab === 'workspace' ? 'bg-background text-primary shadow-lg border-primary/20 scale-[1.02]' : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/60 hover:text-foreground'}`}
                    >
                        <Info size={14} />
                        Prep Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab('cast')}
                        data-tab="cast"
                        className={`whitespace-nowrap px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 border ${activeTab === 'cast' ? 'bg-background text-primary shadow-lg border-primary/20 scale-[1.02]' : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/60 hover:text-foreground'}`}
                    >
                        <Users size={14} />
                        Team
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        data-tab="assets"
                        className={`whitespace-nowrap px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 border ${activeTab === 'assets' ? 'bg-background text-primary shadow-lg border-primary/20 scale-[1.02]' : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/60 hover:text-foreground'}`}
                    >
                        <Music size={14} />
                        Intro & Media
                    </button>
                </div>
                <div className="pointer-events-none absolute inset-y-1 left-1 w-6 rounded-l-2xl bg-gradient-to-r from-background/75 to-transparent sm:hidden" />
                <div className="pointer-events-none absolute inset-y-1 right-1 w-8 rounded-r-2xl bg-gradient-to-l from-background via-background/70 to-transparent sm:hidden" />
            </div>

            {/* Tab Content */}
            <div className="mt-2">
                {activeTab === 'workspace' && <WorkspaceTab act={act} onRequirementAction={handleRequirementAction} nextRequirementRow={nextRequirementRow} canManageReadiness={canManageReadiness} />}
                {activeTab === 'cast' && <CastTab participants={act.participants} canManageActCast={canManageActCast} onAddParticipant={(role) => {
                    setAddRole(role);
                    setIsAddParticipantOpen(true);
                }} />}
                {activeTab === 'assets' && <AssetsTab act={act} canManageActMedia={canManageActMedia} onOpenAssetManager={() => setIsUploadOpen(true)} onPreviewAsset={(url, title) => setPreviewAsset({ url, title })} />}
            </div>

            {canManageActMedia ? <UploadActAssetModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                actId={act.id}
                actName={act.name}
                eventId={act.eventId}
            /> : null}
            {canManageActCast ? <AddParticipantToActModal
                isOpen={isAddParticipantOpen}
                onClose={() => setIsAddParticipantOpen(false)}
                actId={act.id}
                actName={act.name}
                eventId={act.eventId}
                role={addRole}
                roleOptions={addRole === 'Manager' ? ['Manager', 'Choreographer', 'Support', 'Crew'] : ['Performer']}
                title={addRole === 'Manager' ? `Add Performance Team Member to: ${act.name}` : `Add Performer to: ${act.name}`}
            /> : null}
            <AssetPreviewModal
                isOpen={!!previewAsset}
                onClose={() => setPreviewAsset(null)}
                url={previewAsset?.url || null}
                title={previewAsset?.title || 'Performance Media'}
            />
        </div>
    );
}

function ReadinessTab({ act, canManageReadiness }: { act: any; canManageReadiness: boolean }) {
    const addPractice = useAddActReadinessPractice(act.id, act.eventId);
    const addItem = useAddActReadinessItem(act.id, act.eventId);
    const addIssue = useAddActReadinessIssue(act.id, act.eventId);
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [practiceForm, setPracticeForm] = useState({
        venueName: '',
        address: '',
        roomArea: '',
        parkingNote: '',
        specialInstructions: '',
        contactName: '',
        contactPhone: '',
        startsAt: '',
        endsAt: '',
        status: 'planned',
        notes: '',
        expectedFor: '',
    });
    const [itemForm, setItemForm] = useState({
        category: 'prep_task',
        title: '',
        notes: '',
        status: 'needed',
        ownerLabel: '',
        dueAt: '',
    });
    const [issueForm, setIssueForm] = useState({
        issueType: 'other',
        title: '',
        details: '',
        severity: 'medium',
        status: 'open',
        ownerLabel: '',
        dueAt: '',
        resolutionNote: '',
    });
    const resetPracticeForm = () => setPracticeForm({
        venueName: '',
        address: '',
        roomArea: '',
        parkingNote: '',
        specialInstructions: '',
        contactName: '',
        contactPhone: '',
        startsAt: '',
        endsAt: '',
        status: 'planned',
        notes: '',
        expectedFor: '',
    });
    const resetItemForm = () => setItemForm({
        category: 'prep_task',
        title: '',
        notes: '',
        status: 'needed',
        ownerLabel: '',
        dueAt: '',
    });
    const resetIssueForm = () => setIssueForm({
        issueType: 'other',
        title: '',
        details: '',
        severity: 'medium',
        status: 'open',
        ownerLabel: '',
        dueAt: '',
        resolutionNote: '',
    });

    return (
        <div className="space-y-5">
            <div className="surface-panel rounded-[1.2rem] p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button className="h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.18em]" onClick={() => setShowPracticeModal(true)} disabled={!canManageReadiness}>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Add Practice
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.18em]" onClick={() => setShowItemModal(true)} disabled={!canManageReadiness}>
                    <ListChecks className="mr-2 h-4 w-4" />
                    Add Checklist Item
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl border-amber-500/20 bg-amber-500/5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 hover:bg-amber-500/10" onClick={() => setShowIssueModal(true)} disabled={!canManageReadiness}>
                    <TriangleAlert className="mr-2 h-4 w-4" />
                    Raise Issue
                    </Button>
                </div>
            </div>

            <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">
                            <CalendarClock className="h-4 w-4 text-primary" />
                            Next Practice
                        </h3>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">The next confirmed prep touchpoint for this act.</p>
                    </div>
                    {act.readinessSummary?.nextPractice ? (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                            {act.readinessSummary.nextPractice.status}
                        </Badge>
                    ) : null}
                </div>
                {act.readinessSummary?.nextPractice ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-border/50 bg-muted/10 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-base font-black tracking-tight text-foreground">{act.readinessSummary.nextPractice.venueName}</p>
                            {act.readinessSummary.nextPractice.expectedFor ? (
                                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.16em]">
                                    {act.readinessSummary.nextPractice.expectedFor}
                                </Badge>
                            ) : null}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">When</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                    {formatReadinessDate(act.readinessSummary.nextPractice.startsAt)}
                                    {act.readinessSummary.nextPractice.endsAt ? ` - ${formatReadinessDate(act.readinessSummary.nextPractice.endsAt)}` : ''}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Where</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                    {[act.readinessSummary.nextPractice.address, act.readinessSummary.nextPractice.roomArea].filter(Boolean).join(' • ') || 'Location details pending'}
                                </p>
                            </div>
                        </div>
                        {(act.readinessSummary.nextPractice.parkingNote || act.readinessSummary.nextPractice.specialInstructions) ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {act.readinessSummary.nextPractice.parkingNote ? (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Parking / Drop-Off</p>
                                        <p className="mt-1 text-sm font-medium text-foreground">{act.readinessSummary.nextPractice.parkingNote}</p>
                                    </div>
                                ) : null}
                                {act.readinessSummary.nextPractice.specialInstructions ? (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Instructions</p>
                                        <p className="mt-1 text-sm font-medium text-foreground">{act.readinessSummary.nextPractice.specialInstructions}</p>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {(act.readinessSummary.nextPractice.contactName || act.readinessSummary.nextPractice.contactPhone) ? (
                            <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Contact</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                    {[act.readinessSummary.nextPractice.contactName, act.readinessSummary.nextPractice.contactPhone].filter(Boolean).join(' • ')}
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm font-medium text-muted-foreground">
                        No practice scheduled yet.
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card className="p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">
                                <ListChecks className="h-4 w-4 text-primary" />
                                Checklist
                            </h3>
                            <p className="mt-1 text-xs font-medium text-muted-foreground">What is still needed before this act is ready.</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                            {act.readinessItems?.length || 0} items
                        </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                        {(act.readinessItems || []).length > 0 ? act.readinessItems.map((item: any) => (
                            <div key={item.id} className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{item.title}</p>
                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{item.category.replace(/_/g, ' ')}</p>
                                    </div>
                                    <Badge className={`${item.status === 'ready' ? 'bg-emerald-500/10 text-emerald-600' : item.status === 'missing' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'} border-none text-[10px] font-black uppercase tracking-[0.16em]`}>
                                        {item.status.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                                {(item.ownerLabel || item.dueAt || item.notes) ? (
                                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                        {item.ownerLabel ? <p><span className="font-black uppercase tracking-[0.16em] text-[10px]">Owner</span> {item.ownerLabel}</p> : null}
                                        {item.dueAt ? <p><span className="font-black uppercase tracking-[0.16em] text-[10px]">Due</span> {formatReadinessDate(item.dueAt)}</p> : null}
                                        {item.notes ? <p className="text-foreground/80">{item.notes}</p> : null}
                                    </div>
                                ) : null}
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm font-medium text-muted-foreground">
                                No checklist items yet.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">
                                <TriangleAlert className="h-4 w-4 text-amber-600" />
                                Open Issues
                            </h3>
                            <p className="mt-1 text-xs font-medium text-muted-foreground">What is at risk, who owns it, and what needs escalation.</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                            {(act.readinessIssues || []).filter((issue: any) => issue.status !== 'resolved').length} open
                        </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                        {(act.readinessIssues || []).length > 0 ? act.readinessIssues.map((issue: any) => (
                            <div key={issue.id} className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{issue.title}</p>
                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{issue.issueType.replace(/_/g, ' ')}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge className={`${issue.severity === 'high' ? 'bg-rose-500/10 text-rose-600' : issue.severity === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'} border-none text-[10px] font-black uppercase tracking-[0.16em]`}>
                                            {issue.severity}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                            {issue.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                </div>
                                {(issue.ownerLabel || issue.dueAt || issue.details || issue.resolutionNote) ? (
                                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                        {issue.ownerLabel ? <p><span className="font-black uppercase tracking-[0.16em] text-[10px]">Owner</span> {issue.ownerLabel}</p> : null}
                                        {issue.dueAt ? <p><span className="font-black uppercase tracking-[0.16em] text-[10px]">Due</span> {formatReadinessDate(issue.dueAt)}</p> : null}
                                        {issue.details ? <p className="text-foreground/80">{issue.details}</p> : null}
                                        {issue.resolutionNote ? <p className="text-foreground/80"><span className="font-black uppercase tracking-[0.16em] text-[10px]">Resolution</span> {issue.resolutionNote}</p> : null}
                                    </div>
                                ) : null}
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm font-medium text-muted-foreground">
                                No open readiness issues.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <Modal isOpen={showPracticeModal} onClose={() => { setShowPracticeModal(false); resetPracticeForm(); }} title="Add Practice">
                <form
                    className="mt-4 space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        await addPractice.mutateAsync({
                            venueName: practiceForm.venueName,
                            address: practiceForm.address || null,
                            roomArea: practiceForm.roomArea || null,
                            parkingNote: practiceForm.parkingNote || null,
                            specialInstructions: practiceForm.specialInstructions || null,
                            contactName: practiceForm.contactName || null,
                            contactPhone: practiceForm.contactPhone || null,
                            startsAt: practiceForm.startsAt,
                            endsAt: practiceForm.endsAt || null,
                            status: practiceForm.status as any,
                            notes: practiceForm.notes || null,
                            expectedFor: practiceForm.expectedFor || null,
                        });
                        resetPracticeForm();
                        setShowPracticeModal(false);
                    }}
                >
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Venue name" value={practiceForm.venueName} onChange={(e) => setPracticeForm((current) => ({ ...current, venueName: e.target.value }))} required />
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Address" value={practiceForm.address} onChange={(e) => setPracticeForm((current) => ({ ...current, address: e.target.value }))} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Room / area" value={practiceForm.roomArea} onChange={(e) => setPracticeForm((current) => ({ ...current, roomArea: e.target.value }))} />
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Expected for" value={practiceForm.expectedFor} onChange={(e) => setPracticeForm((current) => ({ ...current, expectedFor: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={practiceForm.startsAt} onChange={(e) => setPracticeForm((current) => ({ ...current, startsAt: e.target.value }))} required />
                        <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={practiceForm.endsAt} onChange={(e) => setPracticeForm((current) => ({ ...current, endsAt: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Contact name" value={practiceForm.contactName} onChange={(e) => setPracticeForm((current) => ({ ...current, contactName: e.target.value }))} />
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Contact phone" value={practiceForm.contactPhone} onChange={(e) => setPracticeForm((current) => ({ ...current, contactPhone: e.target.value }))} />
                    </div>
                    <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={practiceForm.status} onChange={(e) => setPracticeForm((current) => ({ ...current, status: e.target.value }))}>
                        <option value="planned">Planned</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="changed">Changed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Parking / drop-off note" value={practiceForm.parkingNote} onChange={(e) => setPracticeForm((current) => ({ ...current, parkingNote: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Special instructions" value={practiceForm.specialInstructions} onChange={(e) => setPracticeForm((current) => ({ ...current, specialInstructions: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Practice notes" value={practiceForm.notes} onChange={(e) => setPracticeForm((current) => ({ ...current, notes: e.target.value }))} />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => { setShowPracticeModal(false); resetPracticeForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={addPractice.isPending || !practiceForm.venueName || !practiceForm.startsAt}>{addPractice.isPending ? 'Saving...' : 'Save Practice'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showItemModal} onClose={() => { setShowItemModal(false); resetItemForm(); }} title="Add Checklist Item">
                <form
                    className="mt-4 space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        await addItem.mutateAsync({
                            category: itemForm.category as any,
                            title: itemForm.title,
                            notes: itemForm.notes || null,
                            status: itemForm.status as any,
                            ownerLabel: itemForm.ownerLabel || null,
                            dueAt: itemForm.dueAt || null,
                        });
                        resetItemForm();
                        setShowItemModal(false);
                    }}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={itemForm.category} onChange={(e) => setItemForm((current) => ({ ...current, category: e.target.value }))}>
                            <option value="prep_task">Preparation task</option>
                            <option value="costume">Costume</option>
                            <option value="prop">Prop</option>
                            <option value="music">Music</option>
                            <option value="shoes">Shoes / accessories</option>
                            <option value="printout">Printout / script</option>
                            <option value="other">Other</option>
                        </select>
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={itemForm.status} onChange={(e) => setItemForm((current) => ({ ...current, status: e.target.value }))}>
                            <option value="needed">Needed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="ready">Ready</option>
                            <option value="missing">Missing</option>
                        </select>
                    </div>
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Checklist item title" value={itemForm.title} onChange={(e) => setItemForm((current) => ({ ...current, title: e.target.value }))} required />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Owner" value={itemForm.ownerLabel} onChange={(e) => setItemForm((current) => ({ ...current, ownerLabel: e.target.value }))} />
                        <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={itemForm.dueAt} onChange={(e) => setItemForm((current) => ({ ...current, dueAt: e.target.value }))} />
                    </div>
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm((current) => ({ ...current, notes: e.target.value }))} />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => { setShowItemModal(false); resetItemForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={addItem.isPending || !itemForm.title}>{addItem.isPending ? 'Saving...' : 'Save Item'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showIssueModal} onClose={() => { setShowIssueModal(false); resetIssueForm(); }} title="Raise Issue">
                <form
                    className="mt-4 space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        await addIssue.mutateAsync({
                            issueType: issueForm.issueType as any,
                            title: issueForm.title,
                            details: issueForm.details || null,
                            severity: issueForm.severity as any,
                            status: issueForm.status as any,
                            ownerLabel: issueForm.ownerLabel || null,
                            dueAt: issueForm.dueAt || null,
                            resolutionNote: issueForm.resolutionNote || null,
                        });
                        resetIssueForm();
                        setShowIssueModal(false);
                    }}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.issueType} onChange={(e) => setIssueForm((current) => ({ ...current, issueType: e.target.value }))}>
                            <option value="participant_unavailable">Participant unavailable</option>
                            <option value="missing_costume">Missing costume</option>
                            <option value="missing_prop">Missing prop</option>
                            <option value="music_not_final">Music not final</option>
                            <option value="intro_media_pending">Intro / media pending</option>
                            <option value="parent_coordination">Parent coordination</option>
                            <option value="timing">Timing issue</option>
                            <option value="rehearsal_conflict">Rehearsal conflict</option>
                            <option value="lineup">Lineup concern</option>
                            <option value="organizer_support">Organizer support needed</option>
                            <option value="other">Other</option>
                        </select>
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.severity} onChange={(e) => setIssueForm((current) => ({ ...current, severity: e.target.value }))}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.status} onChange={(e) => setIssueForm((current) => ({ ...current, status: e.target.value }))}>
                            <option value="open">Open</option>
                            <option value="watching">Watching</option>
                            <option value="blocked">Blocked</option>
                            <option value="resolved">Resolved</option>
                        </select>
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Owner" value={issueForm.ownerLabel} onChange={(e) => setIssueForm((current) => ({ ...current, ownerLabel: e.target.value }))} />
                    </div>
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Issue title" value={issueForm.title} onChange={(e) => setIssueForm((current) => ({ ...current, title: e.target.value }))} required />
                    <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.dueAt} onChange={(e) => setIssueForm((current) => ({ ...current, dueAt: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Details" value={issueForm.details} onChange={(e) => setIssueForm((current) => ({ ...current, details: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Resolution note" value={issueForm.resolutionNote} onChange={(e) => setIssueForm((current) => ({ ...current, resolutionNote: e.target.value }))} />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => { setShowIssueModal(false); resetIssueForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={addIssue.isPending || !issueForm.title}>{addIssue.isPending ? 'Saving...' : 'Save Issue'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}


function WorkspaceTab({ act, onRequirementAction, nextRequirementRow, canManageReadiness }: { act: any; onRequirementAction: (row: RequirementRow) => void; nextRequirementRow: RequirementRow | null; canManageReadiness: boolean }) {
    const readinessState = getActReadinessLabel(act.readinessSummary?.state);
    const openIssueCount = act.readinessSummary?.openIssueCount || 0;
    const openPrepCount = act.readinessSummary?.incompleteChecklistCount || act.readinessSummary?.missingChecklistCount || 0;
    const introRequirement = (act.requirements || []).find((requirement: any) => requirement.requirementType === 'IntroComposition');
    const introActionLabel = introRequirement?.fulfilled ? 'Open Approved Intro' : introRequirement ? 'Review Intro Draft' : 'Prepare Performance Intro';

    return (
        <div className="space-y-4">
            {nextRequirementRow ? (() => {
                const meta = getRequirementStatusMeta(nextRequirementRow.status as any);
                return (
                    <OperationalResponseCard
                        label="Next Launch Action"
                        detail={`${nextRequirementRow.label} • ${nextRequirementRow.detail}`}
                        count={meta.label}
                        tone={meta.tone === 'critical' ? 'critical' : meta.tone === 'warning' ? 'warning' : meta.tone === 'good' ? 'good' : 'default'}
                        action={nextRequirementRow.actionLabel}
                        onClick={() => onRequirementAction(nextRequirementRow)}
                    />
                );
            })() : (
                <OperationalEmptyResponse
                    title="Prep Clear"
                    detail="No launch-critical follow-up is blocking this performance right now."
                />
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <OperationalMetricCard label="Prep State" value={readinessState} icon={CheckCircle} tone={readinessState === 'Needs Attention' ? 'critical' : readinessState === 'Watch List' ? 'warning' : 'good'} />
                <OperationalMetricCard label="Open Prep" value={openPrepCount} icon={ListChecks} tone={openPrepCount > 0 ? 'warning' : 'good'} />
                <OperationalMetricCard label="Open Issues" value={openIssueCount} icon={TriangleAlert} tone={openIssueCount > 0 ? 'critical' : 'good'} />
                <OperationalMetricCard label="Next Practice" value={act.readinessSummary?.nextPractice ? 'Scheduled' : 'None'} icon={CalendarClock} tone={act.readinessSummary?.nextPractice ? 'info' : 'default'} />
            </div>

            <Card className="overflow-hidden border-rose-500/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-rose-950/30 text-white">
                <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Intro Approval</p>
                            <h3 className="mt-2 text-xl font-black tracking-tight">{introRequirement?.fulfilled ? 'Approved intro is ready for stage' : introRequirement ? 'Draft is waiting for admin approval' : 'No approved intro is attached yet'}</h3>
                            <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">
                                Keep intro approval visible here so admins do not have to dig through multiple taps before deciding what to approve.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="min-h-11 rounded-2xl border-white/15 bg-white/10 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/15"
                            onClick={() => {
                                const introRow = buildActRequirementRows(act).find((row) => row.policyCode === 'ACT_INTRO');
                                if (introRow) onRequirementAction(introRow);
                            }}
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {introActionLabel}
                        </Button>
                    </div>
                </div>
            </Card>

            <ReadinessTab act={act} canManageReadiness={canManageReadiness} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <Card className={`space-y-3 ${act.notes ? 'p-5' : 'p-4'}`}>
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-primary" />
                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">
                            Director's Notes
                        </h3>
                    </div>
                    {act.notes ? (
                        <div className="rounded-xl bg-muted/30 p-4 text-sm font-medium leading-relaxed text-foreground/80">
                            {act.notes}
                        </div>
                    ) : (
                        <OperationalEmptyResponse
                            title="No Notes"
                            detail="No technical or creative notes are recorded for this performance yet."
                        />
                    )}
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5 flex flex-col items-center justify-center text-center space-y-1.5 border-primary/10 bg-primary/[0.02]">
                        <Clock size={22} className="text-primary mb-1" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Setup Time</p>
                        <h4 className="text-2xl font-black">{act.setupTimeMinutes} <span className="text-sm font-medium">mins</span></h4>
                        <p className="text-[11px] font-medium text-muted-foreground">Operator-managed handoff buffer</p>
                    </Card>
                    <Card className="p-5 flex flex-col items-center justify-center text-center space-y-1.5 border-primary/10 bg-primary/[0.02]">
                        <Timer size={22} className="text-primary mb-1" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Show Time</p>
                        <h4 className="text-2xl font-black">{act.durationMinutes} <span className="text-sm font-medium">mins</span></h4>
                        <p className="text-[11px] font-medium text-muted-foreground">Operator-managed scheduled duration</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function CastTab({ participants, onAddParticipant, canManageActCast }: { participants: any[]; onAddParticipant: (role: 'Performer' | 'Manager') => void; canManageActCast: boolean }) {
    const navigate = useNavigate();

    const team = participants.filter(p => ['Manager', 'Choreographer', 'Support', 'Crew'].includes(p.role));
    const performers = participants.filter(p => !['Manager', 'Choreographer', 'Support', 'Crew'].includes(p.role));

    return (
        <div className="space-y-6">
            {/* Team Section */}
            <Card className="overflow-hidden border-primary/20 bg-primary/[0.01]">
                <div className="p-6 border-b border-primary/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Settings size={20} className="text-primary" />
                        Performance Team Managers
                    </h3>
                    <div className="flex gap-2">
                        {canManageActCast ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-11 w-11 rounded-full border-primary/20 px-0 hover:bg-primary/5 sm:h-10 sm:w-auto sm:rounded-lg sm:px-3"
                            onClick={() => onAddParticipant('Manager')}
                            aria-label="Add team member"
                            title="Add team member"
                        >
                            <UserPlus size={16} className="sm:mr-2" />
                            <span className="hidden sm:inline">Add Team Member</span>
                        </Button>
                        ) : null}
                    </div>
                </div>
                <div className="divide-y divide-primary/5">
                    {team.length > 0 ? team.map((p) => (
                        <ParticipantRow key={p.id} p={p} navigate={navigate} />
                    )) : (
                        <div className="p-8 text-center text-muted-foreground italic text-sm">
                            No team leads assigned yet.
                        </div>
                    )}
                </div>
            </Card>

            {/* Performers Section */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-border flex items-start justify-between gap-4">
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                        <Users size={20} className="text-primary" />
                        Cast / Performers
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-11 rounded-full px-3 font-black text-primary text-[10px] uppercase tracking-widest bg-primary/5 hover:bg-primary/10 transition-all sm:h-10 sm:rounded-lg"
                            onClick={() => navigate('/participants?filter=unassigned')}
                        >
                            <Info size={14} className="sm:mr-1.5" />
                            <span className="hidden sm:inline">Review Unassigned</span>
                        </Button>
                        {canManageActCast ? (
                        <Button
                            size="sm"
                            className="h-11 w-11 rounded-full px-0 sm:h-10 sm:w-auto sm:rounded-lg sm:px-3 font-black uppercase tracking-widest text-[10px]"
                            onClick={() => onAddParticipant('Performer')}
                            aria-label="Add performer"
                            title="Add performer"
                        >
                            <UserPlus size={16} className="sm:mr-2" />
                            <span className="hidden sm:inline">Add Performer</span>
                        </Button>
                        ) : null}
                    </div>
                </div>
                <div className="divide-y divide-border">
                    {performers.length > 0 ? performers.map((p) => (
                        <ParticipantRow key={p.id} p={p} navigate={navigate} />
                    )) : (
                        <div className="p-8 text-center text-muted-foreground italic text-sm">
                            No performers assigned yet.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function ParticipantRow({ p, navigate }: { p: any, navigate: any }) {
    const assets = Array.isArray(p.assets) ? p.assets : [];
    const approvedPhotos = assets.filter((a: any) => a.type === 'photo' && a.status === 'approved').length;
    const pendingPhotos = assets.filter((a: any) => a.type === 'photo' && ['pending_review', 'uploaded'].includes(a.status)).length;
    const statusLabel = approvedPhotos > 0 ? 'Ready' : pendingPhotos > 0 ? 'Photo Review' : 'Photo Missing';

    return (
        <div
            className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
            onClick={() => navigate(`/participants/${p.participantId}`)}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                    {p.firstName[0]}{p.lastName[0]}
                </div>
                <div>
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {p.firstName} {p.lastName}
                    </h4>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${['Manager', 'Choreographer', 'Support', 'Crew'].includes(p.role)
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            {p.role || "Performer"}
                        </span>
                    </div>
                </div>
            </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">Follow-Up</p>
                        <p className="text-xs font-bold">{p.guardianPhone || "Needs contact info"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card">
                    {approvedPhotos > 0 ? (
                        <CheckCircle size={12} className="text-emerald-500" />
                    ) : (
                        <AlertCircle size={12} className="text-amber-500" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {statusLabel}
                    </span>
                </div>
            </div>
        </div>
    );
}

function AssetsTab({ act, onOpenAssetManager, onPreviewAsset, canManageActMedia }: { act: any, onOpenAssetManager: () => void, onPreviewAsset: (url: string, title: string) => void, canManageActMedia: boolean }) {
    const requirementRows = buildActRequirementRows(act);
    const mediaRows = requirementRows.filter((row) =>
        row.policyCode === 'ACT_AUDIO'
        || row.policyCode === 'ACT_INTRO'
        || (row.target === 'assets' && row.policyCode !== null)
    );
    const fileBackedRequirements = (act.requirements || []).filter((requirement: any) => !!requirement.fileUrl);
    const mediaRecordCount = (act.assets || []).length;
    const nextMediaRow = mediaRows.find((row) => !['approved', 'auto_complete'].includes(row.status)) || mediaRows[0] || null;
    const introRow = mediaRows.find((row) => row.policyCode === 'ACT_INTRO') || null;
    const audioRow = mediaRows.find((row) => row.policyCode === 'ACT_AUDIO') || null;

    const scrollToIntroBuilder = () => {
        const builder = document.getElementById('intro-builder');
        if (!builder) return;
        builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="space-y-6">
            {nextMediaRow ? (() => {
                const meta = getRequirementStatusMeta(nextMediaRow.status as any);
                const isIntro = nextMediaRow.policyCode === 'ACT_INTRO';
                return (
                    <OperationalResponseCard
                        label="Next Media Action"
                        detail={`${nextMediaRow.label} • ${nextMediaRow.detail}`}
                        count={meta.label}
                        tone={meta.tone === 'critical' ? 'critical' : meta.tone === 'warning' ? 'warning' : meta.tone === 'good' ? 'good' : 'default'}
                        action={isIntro ? 'Open Intro' : 'Review Media'}
                        onClick={() => {
                            if (isIntro) {
                                scrollToIntroBuilder();
                            } else if (fileBackedRequirements[0]?.fileUrl) {
                                onPreviewAsset(fileBackedRequirements[0].fileUrl, fileBackedRequirements[0].requirementType);
                            } else {
                                onOpenAssetManager();
                            }
                        }}
                    />
                );
            })() : (
                <OperationalEmptyResponse
                    title="Media Clear"
                    detail="No media or intro follow-up is blocking this performance right now."
                />
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <OperationalMetricCard label="Media Records" value={mediaRecordCount} icon={Music} tone="default" />
                <OperationalMetricCard label="Preview Files" value={fileBackedRequirements.length} icon={MonitorPlay} tone={fileBackedRequirements.length > 0 ? 'info' : 'default'} />
                <OperationalMetricCard label="Intro" value={introRow?.status === 'approved' ? 'Ready' : 'Open'} icon={MonitorPlay} tone={introRow?.status === 'approved' ? 'good' : 'warning'} />
                <OperationalMetricCard label="Music" value={audioRow?.status === 'approved' || audioRow?.status === 'submitted' ? 'Ready' : 'Open'} icon={Music} tone={audioRow?.status === 'approved' || audioRow?.status === 'submitted' ? 'good' : 'warning'} />
            </div>

            <Card className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Music size={20} className="text-primary" />
                            Intro and Media Workspace
                            </h3>
                        <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                            Keep all performance media and intro review in one lane instead of splitting it into separate sections.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 rounded-xl px-3 text-primary font-black text-xs uppercase tracking-[0.16em]"
                            onClick={scrollToIntroBuilder}
                        >
                            Open Intro
                        </Button>
                        {canManageActMedia ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11 rounded-xl px-3 font-black text-xs uppercase tracking-[0.16em]"
                            onClick={onOpenAssetManager}
                        >
                            Add Media
                        </Button>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-3">
                    {mediaRows.length > 0 ? mediaRows.map((row) => {
                        const meta = getRequirementStatusMeta(row.status as any);
                        const isIntro = row.policyCode === 'ACT_INTRO';
                        const isAudio = row.policyCode === 'ACT_AUDIO';
                        return (
                            <button
                                key={row.key}
                                className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-accent/30"
                                onClick={() => {
                                    if (isIntro) {
                                        scrollToIntroBuilder();
                                    } else if (fileBackedRequirements[0]?.fileUrl) {
                                        onPreviewAsset(fileBackedRequirements[0].fileUrl, fileBackedRequirements[0].requirementType);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIntro ? 'bg-primary/10 text-primary' : isAudio ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                        {isIntro ? <MonitorPlay size={16} /> : isAudio ? <Music size={16} /> : <Settings size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm">{row.label}</p>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.16em]">
                                                {meta.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-medium text-muted-foreground">{row.detail}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                        );
                    }) : (
                        <OperationalEmptyResponse title="No Media Gates" detail="No media readiness items are listed for this performance yet." />
                    )}
                </div>

                <div className="space-y-3 border-t border-border/50 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Uploaded Media</p>
                    {(act.assets || []).length > 0 ? (act.assets || []).map((asset: any) => (
                        <div key={asset.id} className="rounded-xl border border-border/50 bg-background/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Music size={16} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{asset.assetName}</p>
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Master Track</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                    Ready
                                </Badge>
                            </div>
                        </div>
                    )) : (
                        <OperationalEmptyResponse title="No Media Records" detail="No act-level media records have been added yet." />
                    )}

                    {fileBackedRequirements.length > 0 ? (
                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Previewable Files</p>
                            {fileBackedRequirements.map((requirement: any) => (
                                <button
                                    key={`preview-${requirement.id}`}
                                    onClick={() => onPreviewAsset(requirement.fileUrl, requirement.requirementType)}
                                    className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border bg-background/70 p-4 text-left transition-colors hover:bg-accent/30"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{requirement.requirementType.replace(/_/g, ' ')}</p>
                                        <p className="mt-1 text-xs font-medium text-muted-foreground">{requirement.description || 'Open the uploaded file in-app.'}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </Card>

            {/* Intro Video Builder Section */}
            <Card id="intro-builder" className="p-1 border shadow-xl bg-card/50 scroll-mt-28">
                <IntroVideoBuilder actId={act.id} />
            </Card>
        </div>
    );
}
