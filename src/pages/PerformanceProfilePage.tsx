import { useParams, useNavigate } from 'react-router-dom';
import { useActDetail, useAddActReadinessPractice, useAddActReadinessItem, useAddActReadinessIssue } from '@/hooks/useActs';
import {
    Settings,
    AlertCircle,
    UserPlus,
    Music,
    ChevronRight,
    CalendarClock,
    ListChecks,
    TriangleAlert,
    Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IntroVideoBuilder } from '@/components/acts/IntroVideoBuilder';
import { UploadActAssetModal } from '@/components/acts/UploadActAssetModal';
import { AddParticipantToActModal } from '@/components/acts/AddParticipantToActModal';
import { Modal } from '@/components/ui/Modal';
import { formatReadinessDate } from '@/lib/actReadiness';
import { buildActRequirementRows, getRequirementStatusMeta } from '@/lib/requirementsPrototype';
import { AssetPreviewModal } from '@/components/ui/AssetPreviewModal';
import { useSelection } from '@/context/SelectionContext';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';

export function PerformanceProfilePage() {
    const { actId } = useParams();
    const navigate = useNavigate();
    const { organizationId } = useSelection();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [addRole, setAddRole] = useState<'Performer' | 'Manager'>('Performer');
    const [previewAsset, setPreviewAsset] = useState<{ url: string; title: string } | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const { data: act, isLoading } = useActDetail(actId || null);
    const capabilities = useEventCapabilities(act?.eventId || null, organizationId || null);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!act) {
        return (
            <div className="p-8 text-center bg-destructive/10 rounded-xl border border-destructive/20 max-w-2xl mx-auto mt-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Performance Not Found</h2>
                <p className="text-muted-foreground mb-6">The record might have been deleted or you may not have permission to view it.</p>
                <Button onClick={() => navigate('/performances')}>Return to Performances</Button>
            </div>
        );
    }

    const requirementRows = buildActRequirementRows(act);
    const unresolvedRequirementRows = requirementRows.filter((row) => !['approved', 'auto_complete'].includes(row.status));
    const introRequirement = (act.requirements || []).find((requirement: any) => requirement.requirementType === 'IntroComposition');
    const canManageReadiness = capabilities.canManageReadiness;
    const canManageActCast = capabilities.canManageActCast;
    const canManageActMedia = capabilities.canManageActMedia;

    const openIssueCount = act.readinessSummary?.openIssueCount || 0;
    const openPrepCount = act.readinessSummary?.incompleteChecklistCount || act.readinessSummary?.missingChecklistCount || 0;

    const readinessTone = unresolvedRequirementRows.some(r => r.status === 'missing')
        ? 'critical' as const
        : unresolvedRequirementRows.length > 0 || openIssueCount > 0
            ? 'warning' as const
            : 'good' as const;

    const readinessLabel = readinessTone === 'critical'
        ? 'Blocked'
        : readinessTone === 'warning'
            ? 'Needs Attention'
            : 'Ready';

    const toggleSection = (key: string) => {
        setActiveSection((current) => current === key ? null : key);
    };

    const mediaRows = requirementRows.filter((row) =>
        row.policyCode === 'ACT_AUDIO'
        || row.policyCode === 'ACT_INTRO'
        || (row.target === 'assets' && row.policyCode !== null)
    );
    const fileBackedRequirements = (act.requirements || []).filter((requirement: any) => !!requirement.fileUrl);

    const scrollToIntroBuilder = () => {
        const builder = document.getElementById('intro-builder');
        if (!builder) return;
        builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const team = act.participants.filter((p: any) => ['Manager', 'Choreographer', 'Support', 'Crew'].includes(p.role));
    const performers = act.participants.filter((p: any) => !['Manager', 'Choreographer', 'Support', 'Crew'].includes(p.role));

    return (
        <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 space-y-3 px-4 pb-20 duration-500 md:px-0">
            {/* ── WHO + STATE ── */}
            <div className="rounded-2xl border border-border/40 bg-card/80 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-xl font-black tracking-tight text-foreground">
                            {act.name}
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {performers.length} performer{performers.length === 1 ? '' : 's'} • {team.length} team • {act.durationMinutes}m show • {act.setupTimeMinutes}m setup
                            {introRequirement?.fulfilled ? ' • Intro approved' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-border/40 pt-2">
                    <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                        readinessTone === 'critical'
                            ? 'text-destructive'
                            : readinessTone === 'warning'
                                ? 'text-orange-600'
                                : 'text-emerald-600'
                    }`}>
                        {readinessLabel}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                        {readinessTone === 'critical'
                            ? `${unresolvedRequirementRows.length} blocker${unresolvedRequirementRows.length === 1 ? '' : 's'} need action now`
                            : readinessTone === 'warning'
                                ? `${Math.max(unresolvedRequirementRows.length, openIssueCount, openPrepCount)} item${Math.max(unresolvedRequirementRows.length, openIssueCount, openPrepCount) === 1 ? '' : 's'} need review`
                                : 'No blockers open'}
                    </p>
                    {introRequirement && !introRequirement.fulfilled ? (
                        <Button
                            variant="outline"
                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={scrollToIntroBuilder}
                        >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                            Review Intro
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* ── ACTION ── */}
            <div className="space-y-2">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Action</p>

                <div className="rounded-2xl border border-border/50 bg-card/80 p-4">
                    {requirementRows.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {requirementRows.map((row) => {
                                const meta = getRequirementStatusMeta(row.status);
                                const isOpen = activeSection === row.key;
                                return (
                                    <div key={row.key} className={isOpen ? 'bg-primary/5' : ''}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(row.key)}
                                            className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left"
                                        >
                                            <p className="min-w-0 truncate text-sm font-bold text-foreground">{row.label}</p>
                                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-[0.16em] ${
                                                meta.tone === 'critical'
                                                    ? 'text-destructive'
                                                    : meta.tone === 'warning'
                                                        ? 'text-orange-600'
                                                        : meta.tone === 'good'
                                                            ? 'text-emerald-600'
                                                            : 'text-primary'
                                            }`}>
                                                {meta.label}
                                            </span>
                                        </button>
                                        {isOpen ? (
                                            <div className="border-t border-border/50 py-4">
                                                <p className="text-sm text-muted-foreground">{row.detail}</p>
                                                {row.policyCode === 'ACT_INTRO' ? (
                                                    <div className="mt-3">
                                                        <Button
                                                            variant="outline"
                                                            className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                            onClick={scrollToIntroBuilder}
                                                        >
                                                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                                            {introRequirement?.fulfilled ? 'Open Approved Intro' : 'Open Intro Studio'}
                                                        </Button>
                                                    </div>
                                                ) : row.policyCode === 'ACT_AUDIO' ? (
                                                    <div className="mt-3">
                                                        {canManageActMedia ? (
                                                            <Button
                                                                variant="outline"
                                                                className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                                                onClick={() => setIsUploadOpen(true)}
                                                            >
                                                                <Music className="mr-1.5 h-3.5 w-3.5" />
                                                                Upload Music
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No requirement gates are active for this performance.</p>
                    )}
                </div>
            </div>
            {/* ── REFERENCE ── */}
            <div className="space-y-2">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Reference</p>

                {/* Readiness: Practices, Checklist, Issues */}
                <ReadinessSection act={act} canManageReadiness={canManageReadiness} />

                {/* Cast */}
                <details className="group rounded-2xl border border-border/40 bg-card px-3 py-2">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 transition-colors hover:bg-accent/10">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">Cast & Team</p>
                            <p className="text-xs text-muted-foreground">{performers.length} performers • {team.length} team</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Open</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                        </div>
                    </summary>
                    <div className="border-t border-border/50 pt-3 space-y-4">
                        {canManageActCast ? (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => { setAddRole('Performer'); setIsAddParticipantOpen(true); }}>
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Performer
                                </Button>
                                <Button variant="outline" className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => { setAddRole('Manager'); setIsAddParticipantOpen(true); }}>
                                    <Settings className="mr-1.5 h-3.5 w-3.5" />
                                    Add Team Member
                                </Button>
                            </div>
                        ) : null}
                        {team.length > 0 ? (
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Team</p>
                                {team.map((p: any) => (
                                    <ParticipantRow key={p.id} p={p} navigate={navigate} />
                                ))}
                            </div>
                        ) : null}
                        <div className="space-y-1">
                            {performers.length > 0 ? (
                                <>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Performers</p>
                                    {performers.map((p: any) => (
                                        <ParticipantRow key={p.id} p={p} navigate={navigate} />
                                    ))}
                                </>
                            ) : (
                                <p className="py-4 text-center text-sm text-muted-foreground">No performers assigned yet.</p>
                            )}
                        </div>
                    </div>
                </details>

                {/* Media & Assets */}
                <details className="group rounded-2xl border border-border/40 bg-card px-3 py-2">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 transition-colors hover:bg-accent/10">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">Media & Assets</p>
                            <p className="text-xs text-muted-foreground">{(act.assets || []).length} upload{(act.assets || []).length === 1 ? '' : 's'} • {fileBackedRequirements.length} preview file{fileBackedRequirements.length === 1 ? '' : 's'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Open</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                        </div>
                    </summary>
                    <div className="border-t border-border/50 pt-3 space-y-3">
                        {canManageActMedia ? (
                            <Button variant="outline" className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => setIsUploadOpen(true)}>
                                Add Asset / Upload Music
                            </Button>
                        ) : null}
                        {mediaRows.length > 0 ? (
                            <div className="divide-y divide-border/50">
                                {mediaRows.map((row) => {
                                    const meta = getRequirementStatusMeta(row.status as any);
                                    return (
                                        <button
                                            key={row.key}
                                            className="flex min-h-11 w-full items-center justify-between py-2 text-left transition-colors hover:bg-accent/20"
                                            onClick={() => {
                                                if (row.policyCode === 'ACT_INTRO') scrollToIntroBuilder();
                                                else if (fileBackedRequirements[0]?.fileUrl) setPreviewAsset({ url: fileBackedRequirements[0].fileUrl, title: fileBackedRequirements[0].requirementType });
                                            }}
                                        >
                                            <span className="min-w-0 truncate text-sm font-bold text-foreground">{row.label}</span>
                                            <span className={`ml-3 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] ${
                                                meta.tone === 'critical' ? 'text-destructive' : meta.tone === 'warning' ? 'text-orange-600' : meta.tone === 'good' ? 'text-emerald-600' : 'text-muted-foreground'
                                            }`}>{meta.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                        {(act.assets || []).length > 0 ? (
                            <div className="divide-y divide-border/50">
                                {(act.assets || []).map((asset: any) => (
                                    <div key={asset.id} className="flex min-h-11 items-center justify-between py-2">
                                        <span className="min-w-0 truncate text-sm font-bold text-foreground">{asset.assetName}</span>
                                        <span className="ml-3 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Ready</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        {fileBackedRequirements.length > 0 ? (
                            <div className="divide-y divide-border/50">
                                {fileBackedRequirements.map((requirement: any) => (
                                    <button
                                        key={`preview-${requirement.id}`}
                                        onClick={() => setPreviewAsset({ url: requirement.fileUrl, title: requirement.requirementType })}
                                        className="flex min-h-11 w-full items-center justify-between py-2 text-left transition-colors hover:bg-accent/20"
                                    >
                                        <span className="min-w-0 truncate text-sm font-bold text-foreground">{requirement.requirementType.replace(/_/g, ' ')}</span>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        {mediaRows.length === 0 && (act.assets || []).length === 0 && fileBackedRequirements.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">No media records have been added yet.</p>
                        ) : null}
                    </div>
                </details>

                {/* Director's Notes + Timing */}
                <details className="group rounded-2xl border border-border/40 bg-card px-3 py-2">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 transition-colors hover:bg-accent/10">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">Notes & Timing</p>
                            <p className="text-xs text-muted-foreground">{act.setupTimeMinutes}m setup • {act.durationMinutes}m show</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Open</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                        </div>
                    </summary>
                    <div className="border-t border-border/50 pt-3 space-y-3">
                        {act.notes ? (
                            <div className="text-sm leading-relaxed text-foreground/80">
                                {act.notes}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No director's notes recorded.</p>
                        )}
                    </div>
                </details>
            </div>

            {/* ── Intro Video Builder ── */}
            <Card id="intro-builder" className="border bg-card/50 scroll-mt-28">
                <IntroVideoBuilder actId={act.id} />
            </Card>

            {/* ── Modals ── */}
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

// ── ReadinessSection: Practices, Checklist, Issues ──
function ReadinessSection({ act, canManageReadiness }: { act: any; canManageReadiness: boolean }) {
    const addPractice = useAddActReadinessPractice(act.id, act.eventId);
    const addItem = useAddActReadinessItem(act.id, act.eventId);
    const addIssue = useAddActReadinessIssue(act.id, act.eventId);
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [practiceForm, setPracticeForm] = useState({
        venueName: '', address: '', roomArea: '', parkingNote: '', specialInstructions: '',
        contactName: '', contactPhone: '', startsAt: '', endsAt: '', status: 'planned', notes: '', expectedFor: '',
    });
    const [itemForm, setItemForm] = useState({
        category: 'prep_task', title: '', notes: '', status: 'needed', ownerLabel: '', dueAt: '',
    });
    const [issueForm, setIssueForm] = useState({
        issueType: 'other', title: '', details: '', severity: 'medium', status: 'open', ownerLabel: '', dueAt: '', resolutionNote: '',
    });
    const resetPracticeForm = () => setPracticeForm({
        venueName: '', address: '', roomArea: '', parkingNote: '', specialInstructions: '',
        contactName: '', contactPhone: '', startsAt: '', endsAt: '', status: 'planned', notes: '', expectedFor: '',
    });
    const resetItemForm = () => setItemForm({ category: 'prep_task', title: '', notes: '', status: 'needed', ownerLabel: '', dueAt: '' });
    const resetIssueForm = () => setIssueForm({ issueType: 'other', title: '', details: '', severity: 'medium', status: 'open', ownerLabel: '', dueAt: '', resolutionNote: '' });

    return (
        <>
            <details className="group rounded-2xl border border-border/40 bg-card px-3 py-2">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 transition-colors hover:bg-accent/10">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">Practices, Checklist & Issues</p>
                        <p className="text-xs text-muted-foreground">
                            {act.readinessSummary?.nextPractice ? 'Practice scheduled' : 'No practice'}
                            {' • '}
                            {act.readinessItems?.length || 0} checklist
                            {' • '}
                            {(act.readinessIssues || []).filter((i: any) => i.status !== 'resolved').length} open issues
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Open</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </div>
                </summary>
                <div className="border-t border-border/50 pt-3 space-y-4">
                    {canManageReadiness ? (
                        <div className="flex flex-wrap gap-2">
                            <Button className="min-h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.18em]" onClick={() => setShowPracticeModal(true)}>
                                <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Add Practice
                            </Button>
                            <Button variant="outline" className="min-h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.18em]" onClick={() => setShowItemModal(true)}>
                                <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Add Checklist Item
                            </Button>
                            <Button variant="outline" className="min-h-11 rounded-xl border-amber-500/20 bg-amber-500/5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 hover:bg-amber-500/10" onClick={() => setShowIssueModal(true)}>
                                <TriangleAlert className="mr-1.5 h-3.5 w-3.5" /> Raise Issue
                            </Button>
                        </div>
                    ) : null}

                    {/* Next Practice */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Next Practice</p>
                        {act.readinessSummary?.nextPractice ? (
                            <div className="mt-2 space-y-2">
                                <p className="text-sm font-bold text-foreground">{act.readinessSummary.nextPractice.venueName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatReadinessDate(act.readinessSummary.nextPractice.startsAt)}
                                    {act.readinessSummary.nextPractice.endsAt ? ` - ${formatReadinessDate(act.readinessSummary.nextPractice.endsAt)}` : ''}
                                    {act.readinessSummary.nextPractice.address ? ` • ${act.readinessSummary.nextPractice.address}` : ''}
                                </p>
                                {(act.readinessSummary.nextPractice.contactName || act.readinessSummary.nextPractice.contactPhone) ? (
                                    <p className="text-xs text-muted-foreground">Contact: {[act.readinessSummary.nextPractice.contactName, act.readinessSummary.nextPractice.contactPhone].filter(Boolean).join(' • ')}</p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">No practice scheduled yet.</p>
                        )}
                    </div>

                    {/* Checklist */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Checklist ({act.readinessItems?.length || 0})</p>
                        {(act.readinessItems || []).length > 0 ? (
                            <div className="mt-2 divide-y divide-border/50">
                                {act.readinessItems.map((item: any) => (
                                    <div key={item.id} className="flex min-h-11 items-center justify-between py-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                                            {item.ownerLabel ? <p className="text-xs text-muted-foreground">{item.ownerLabel}</p> : null}
                                        </div>
                                        <span className={`ml-3 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] ${item.status === 'ready' ? 'text-emerald-600' : item.status === 'missing' ? 'text-destructive' : 'text-orange-600'}`}>
                                            {item.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">No checklist items yet.</p>
                        )}
                    </div>

                    {/* Issues */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Issues ({(act.readinessIssues || []).filter((i: any) => i.status !== 'resolved').length} open)</p>
                        {(act.readinessIssues || []).length > 0 ? (
                            <div className="mt-2 divide-y divide-border/50">
                                {act.readinessIssues.map((issue: any) => (
                                    <div key={issue.id} className="flex min-h-11 items-center justify-between py-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-foreground">{issue.title}</p>
                                            {issue.ownerLabel ? <p className="text-xs text-muted-foreground">{issue.ownerLabel}</p> : null}
                                        </div>
                                        <div className="ml-3 flex shrink-0 items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${issue.severity === 'high' ? 'text-destructive' : issue.severity === 'medium' ? 'text-orange-600' : 'text-muted-foreground'}`}>{issue.severity}</span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{issue.status.replace(/_/g, ' ')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">No issues raised.</p>
                        )}
                    </div>
                </div>
            </details>

            {/* ── Modals for readiness ── */}
            <Modal isOpen={showPracticeModal} onClose={() => { setShowPracticeModal(false); resetPracticeForm(); }} title="Add Practice">
                <form
                    className="mt-4 space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        await addPractice.mutateAsync({
                            venueName: practiceForm.venueName, address: practiceForm.address || null, roomArea: practiceForm.roomArea || null,
                            parkingNote: practiceForm.parkingNote || null, specialInstructions: practiceForm.specialInstructions || null,
                            contactName: practiceForm.contactName || null, contactPhone: practiceForm.contactPhone || null,
                            startsAt: practiceForm.startsAt, endsAt: practiceForm.endsAt || null, status: practiceForm.status as any,
                            notes: practiceForm.notes || null, expectedFor: practiceForm.expectedFor || null,
                        });
                        resetPracticeForm();
                        setShowPracticeModal(false);
                    }}
                >
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Venue name" value={practiceForm.venueName} onChange={(e) => setPracticeForm((c) => ({ ...c, venueName: e.target.value }))} required />
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Address" value={practiceForm.address} onChange={(e) => setPracticeForm((c) => ({ ...c, address: e.target.value }))} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Room / area" value={practiceForm.roomArea} onChange={(e) => setPracticeForm((c) => ({ ...c, roomArea: e.target.value }))} />
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Expected for" value={practiceForm.expectedFor} onChange={(e) => setPracticeForm((c) => ({ ...c, expectedFor: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={practiceForm.startsAt} onChange={(e) => setPracticeForm((c) => ({ ...c, startsAt: e.target.value }))} required />
                        <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={practiceForm.endsAt} onChange={(e) => setPracticeForm((c) => ({ ...c, endsAt: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Contact name" value={practiceForm.contactName} onChange={(e) => setPracticeForm((c) => ({ ...c, contactName: e.target.value }))} />
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Contact phone" value={practiceForm.contactPhone} onChange={(e) => setPracticeForm((c) => ({ ...c, contactPhone: e.target.value }))} />
                    </div>
                    <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={practiceForm.status} onChange={(e) => setPracticeForm((c) => ({ ...c, status: e.target.value }))}>
                        <option value="planned">Planned</option><option value="confirmed">Confirmed</option><option value="changed">Changed</option><option value="cancelled">Cancelled</option>
                    </select>
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Parking / drop-off note" value={practiceForm.parkingNote} onChange={(e) => setPracticeForm((c) => ({ ...c, parkingNote: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Special instructions" value={practiceForm.specialInstructions} onChange={(e) => setPracticeForm((c) => ({ ...c, specialInstructions: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Practice notes" value={practiceForm.notes} onChange={(e) => setPracticeForm((c) => ({ ...c, notes: e.target.value }))} />
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
                        await addItem.mutateAsync({ category: itemForm.category as any, title: itemForm.title, notes: itemForm.notes || null, status: itemForm.status as any, ownerLabel: itemForm.ownerLabel || null, dueAt: itemForm.dueAt || null });
                        resetItemForm();
                        setShowItemModal(false);
                    }}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={itemForm.category} onChange={(e) => setItemForm((c) => ({ ...c, category: e.target.value }))}>
                            <option value="prep_task">Preparation task</option><option value="costume">Costume</option><option value="prop">Prop</option><option value="music">Music</option><option value="shoes">Shoes / accessories</option><option value="printout">Printout / script</option><option value="other">Other</option>
                        </select>
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={itemForm.status} onChange={(e) => setItemForm((c) => ({ ...c, status: e.target.value }))}>
                            <option value="needed">Needed</option><option value="in_progress">In Progress</option><option value="ready">Ready</option><option value="missing">Missing</option>
                        </select>
                    </div>
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Checklist item title" value={itemForm.title} onChange={(e) => setItemForm((c) => ({ ...c, title: e.target.value }))} required />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Owner" value={itemForm.ownerLabel} onChange={(e) => setItemForm((c) => ({ ...c, ownerLabel: e.target.value }))} />
                        <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={itemForm.dueAt} onChange={(e) => setItemForm((c) => ({ ...c, dueAt: e.target.value }))} />
                    </div>
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm((c) => ({ ...c, notes: e.target.value }))} />
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
                        await addIssue.mutateAsync({ issueType: issueForm.issueType as any, title: issueForm.title, details: issueForm.details || null, severity: issueForm.severity as any, status: issueForm.status as any, ownerLabel: issueForm.ownerLabel || null, dueAt: issueForm.dueAt || null, resolutionNote: issueForm.resolutionNote || null });
                        resetIssueForm();
                        setShowIssueModal(false);
                    }}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.issueType} onChange={(e) => setIssueForm((c) => ({ ...c, issueType: e.target.value }))}>
                            <option value="participant_unavailable">Participant unavailable</option><option value="missing_costume">Missing costume</option><option value="missing_prop">Missing prop</option>
                            <option value="music_not_final">Music not final</option><option value="intro_media_pending">Intro / media pending</option><option value="parent_coordination">Parent coordination</option>
                            <option value="timing">Timing issue</option><option value="rehearsal_conflict">Rehearsal conflict</option><option value="lineup">Lineup concern</option>
                            <option value="organizer_support">Organizer support needed</option><option value="other">Other</option>
                        </select>
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.severity} onChange={(e) => setIssueForm((c) => ({ ...c, severity: e.target.value }))}>
                            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.status} onChange={(e) => setIssueForm((c) => ({ ...c, status: e.target.value }))}>
                            <option value="open">Open</option><option value="watching">Watching</option><option value="blocked">Blocked</option><option value="resolved">Resolved</option>
                        </select>
                        <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Owner" value={issueForm.ownerLabel} onChange={(e) => setIssueForm((c) => ({ ...c, ownerLabel: e.target.value }))} />
                    </div>
                    <input className="w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Issue title" value={issueForm.title} onChange={(e) => setIssueForm((c) => ({ ...c, title: e.target.value }))} required />
                    <input type="datetime-local" className="w-full rounded-xl border border-border px-4 py-3 text-sm" value={issueForm.dueAt} onChange={(e) => setIssueForm((c) => ({ ...c, dueAt: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Details" value={issueForm.details} onChange={(e) => setIssueForm((c) => ({ ...c, details: e.target.value }))} />
                    <textarea className="min-h-[88px] w-full rounded-xl border border-border px-4 py-3 text-sm" placeholder="Resolution note" value={issueForm.resolutionNote} onChange={(e) => setIssueForm((c) => ({ ...c, resolutionNote: e.target.value }))} />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => { setShowIssueModal(false); resetIssueForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={addIssue.isPending || !issueForm.title}>{addIssue.isPending ? 'Saving...' : 'Save Issue'}</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

// ── ParticipantRow ──
function ParticipantRow({ p, navigate }: { p: any, navigate: any }) {
    const assets = Array.isArray(p.assets) ? p.assets : [];
    const approvedPhotos = assets.filter((a: any) => a.type === 'photo' && a.status === 'approved').length;
    const pendingPhotos = assets.filter((a: any) => a.type === 'photo' && ['pending_review', 'uploaded'].includes(a.status)).length;
    const statusLabel = approvedPhotos > 0 ? 'Ready' : pendingPhotos > 0 ? 'Review' : 'Missing';

    return (
        <button
            className="flex min-h-11 w-full items-center justify-between py-2 text-left transition-colors hover:bg-accent/20"
            onClick={() => navigate(`/participants/${p.participantId}`)}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black uppercase shrink-0">
                    {p.firstName[0]}{p.lastName[0]}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                        {p.firstName} {p.lastName}
                        <span className="font-medium text-muted-foreground"> · {p.role || 'Performer'}</span>
                    </p>
                </div>
            </div>
            <span className={`ml-3 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] ${approvedPhotos > 0 ? 'text-emerald-600' : pendingPhotos > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {statusLabel}
            </span>
        </button>
    );
}

export default PerformanceProfilePage;
