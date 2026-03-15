import { useParams, useNavigate } from 'react-router-dom';
import { useActDetail, useUpdateActStatus } from '@/hooks/useActs';
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
    ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatusPicker } from '@/components/acts/StatusPicker';
import { IntroVideoBuilder } from '@/components/acts/IntroVideoBuilder';
import { UploadActAssetModal } from '@/components/acts/UploadActAssetModal';
import { AddParticipantToActModal } from '@/components/acts/AddParticipantToActModal';

type TabType = 'overview' | 'cast' | 'assets';

export function PerformanceProfilePage() {
    const { actId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [addRole, setAddRole] = useState<'Performer' | 'Manager'>('Performer');
    const { data: act, isLoading } = useActDetail(actId || null);
    const { mutate: updateStatus, isPending } = useUpdateActStatus();

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
                <Button onClick={() => navigate('/acts')}>Back to Performances</Button>
            </div>
        );
    }

    const introRequirement = (act.requirements || []).find((req: any) => req.requirementType === 'IntroComposition');
    const hasMusicTrack = (act.assets || []).some((asset: any) =>
        asset.assetType === 'Audio' || asset.assetName?.toLowerCase().includes('music')
    );
    const introState = introRequirement?.fulfilled
        ? { label: 'Approved', tone: 'ready' as const }
        : introRequirement
            ? { label: 'Pending', tone: 'warning' as const }
            : { label: 'Needs Intro', tone: 'missing' as const };
    const readinessItems = [
        {
            label: 'Music',
            value: hasMusicTrack ? 'Uploaded' : 'Missing',
            tone: hasMusicTrack ? 'ready' as const : 'missing' as const,
        },
        {
            label: 'Cast',
            value: act.participants.length > 0 ? `${act.participants.length} assigned` : 'Needs cast',
            tone: act.participants.length > 0 ? 'ready' as const : 'missing' as const,
        },
        {
            label: 'Intro',
            value: introState.label,
            tone: introState.tone,
        },
    ];

    return (
        <div className="flex flex-col space-y-5 max-w-5xl mx-auto pb-20">
            {/* Operational Header - Unified Strip */}
            <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/acts')}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group p-0 h-auto"
                    >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Performances
                    </Button>
                </div>

                {/* Unified Badge Strip - High Density Cockpit */}
                <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/20 rounded-xl border border-border/40 overflow-x-auto scrollbar-hide">
                    <div className="min-w-[180px]">
                        <StatusPicker
                            currentStatus={act.arrivalStatus}
                            onStatusChange={(status) => updateStatus({ actId: act.id, status })}
                            isLoading={isPending}
                        />
                    </div>
                    
                    <Badge variant="outline" className="px-3 h-7 text-[9px] font-black tracking-widest uppercase rounded-lg bg-primary/5 text-primary border-none shrink-0 antialiased">
                        PERFORMANCE
                    </Badge>

                    <Badge variant="outline" className={`px-3 h-7 text-[9px] font-black tracking-widest uppercase rounded-lg border-none shrink-0 antialiased ${act.arrivalStatus === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/50 text-muted-foreground'}`}>
                        {act.arrivalStatus === 'Ready' ? 'Operational' : 'Draft Mode'}
                    </Badge>

                    {act.durationMinutes && (
                        <Badge variant="outline" className="px-3 h-7 text-[9px] font-black tracking-widest uppercase rounded-lg bg-muted text-muted-foreground border-none shrink-0 tabular-nums">
                            <Clock size={10} className="mr-1.5" />
                            {act.durationMinutes}m
                        </Badge>
                    )}

                    <Badge variant="outline" className="px-3 h-7 text-[9px] font-black tracking-widest uppercase rounded-lg bg-muted text-muted-foreground border-none shrink-0">
                        <Users size={10} className="mr-1.5" />
                        {act.participants.length} Cast
                    </Badge>
                </div>
            </div>

            {/* Title Section */}
            <div className="space-y-1 px-1">
                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{act.name}</h1>
                <p className="text-xs font-medium text-muted-foreground">{act.participants.length} active cast members assigned</p>
            </div>

            <Card className="border-border/50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                        {readinessItems.map((item) => (
                            <div
                                key={item.label}
                                className={`rounded-xl border px-3 py-2 ${item.tone === 'ready'
                                    ? 'border-emerald-500/20 bg-emerald-500/5'
                                    : item.tone === 'warning'
                                        ? 'border-amber-500/20 bg-amber-500/5'
                                        : 'border-rose-500/20 bg-rose-500/5'
                                    }`}
                            >
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-sm font-bold text-foreground">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        className="h-11 rounded-xl border-primary/20 bg-primary/5 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
                        onClick={() => setActiveTab('assets')}
                    >
                        Review Media & Intro
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </Card>

            {/* Navigation Tabs - Swippable Cockpit */}
            <div className="relative">
                <div className="flex items-center space-x-1 bg-muted/40 p-1 rounded-2xl border border-border/40 w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory antialiased shadow-inner">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`whitespace-nowrap px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 ${activeTab === 'overview' ? 'bg-background text-primary shadow-lg border border-primary/20 scale-[1.02]' : 'text-muted-foreground/60 hover:text-foreground'}`}
                    >
                        <Info size={14} />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('cast')}
                        className={`whitespace-nowrap px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 ${activeTab === 'cast' ? 'bg-background text-primary shadow-lg border border-primary/20 scale-[1.02]' : 'text-muted-foreground/60 hover:text-foreground'}`}
                    >
                        <Users size={14} />
                        Team
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`whitespace-nowrap px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 ${activeTab === 'assets' ? 'bg-background text-primary shadow-lg border border-primary/20 scale-[1.02]' : 'text-muted-foreground/60 hover:text-foreground'}`}
                    >
                        <Music size={14} />
                        Media & Intro
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${introState.tone === 'ready'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : introState.tone === 'warning'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}>
                            {introState.label}
                        </span>
                    </button>
                </div>
                <div className="pointer-events-none absolute inset-y-1 left-1 w-6 rounded-l-2xl bg-gradient-to-r from-background/75 to-transparent sm:hidden" />
                <div className="pointer-events-none absolute inset-y-1 right-1 w-8 rounded-r-2xl bg-gradient-to-l from-background via-background/70 to-transparent sm:hidden" />
            </div>

            {/* Tab Content */}
            <div className="mt-2">
                {activeTab === 'overview' && <OverviewTab act={act} />}
                {activeTab === 'cast' && <CastTab participants={act.participants} onAddParticipant={(role) => {
                    setAddRole(role);
                    setIsAddParticipantOpen(true);
                }} />}
                {activeTab === 'assets' && <AssetsTab act={act} onOpenAssetManager={() => setIsUploadOpen(true)} />}
            </div>

            <UploadActAssetModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                actId={act.id}
                actName={act.name}
                eventId={act.eventId}
            />
            <AddParticipantToActModal
                isOpen={isAddParticipantOpen}
                onClose={() => setIsAddParticipantOpen(false)}
                actId={act.id}
                actName={act.name}
                eventId={act.eventId}
                role={addRole}
                title={addRole === 'Manager' ? `Add Team Member to: ${act.name}` : `Add Performer to: ${act.name}`}
            />
        </div>
    );
}


function OverviewTab({ act }: { act: any }) {
    return (
        <div className="space-y-4">
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
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-3 text-sm font-medium text-muted-foreground">
                        No technical notes recorded for this performance.
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className="p-5 flex flex-col items-center justify-center text-center space-y-1.5 border-primary/10 bg-primary/[0.02]">
                    <Clock size={22} className="text-primary mb-1" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Setup Time</p>
                    <h4 className="text-2xl font-black">{act.setupTimeMinutes} <span className="text-sm font-medium">mins</span></h4>
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center text-center space-y-1.5 border-primary/10 bg-primary/[0.02]">
                    <Timer size={22} className="text-primary mb-1" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Show Time</p>
                    <h4 className="text-2xl font-black">{act.durationMinutes} <span className="text-sm font-medium">mins</span></h4>
                </Card>
            </div>
        </div>
    );
}

function CastTab({ participants, onAddParticipant }: { participants: any[]; onAddParticipant: (role: 'Performer' | 'Manager') => void }) {
    const navigate = useNavigate();

    const team = participants.filter(p => ['Manager', 'Choreographer', 'Support'].includes(p.role));
    const performers = participants.filter(p => !['Manager', 'Choreographer', 'Support'].includes(p.role));

    return (
        <div className="space-y-6">
            {/* Team Section */}
            <Card className="overflow-hidden border-primary/20 bg-primary/[0.01]">
                <div className="p-6 border-b border-primary/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Settings size={20} className="text-primary" />
                        Performance Team
                    </h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-11 font-bold border-primary/20 hover:bg-primary/5" onClick={() => onAddParticipant('Manager')}>
                            <UserPlus size={16} className="mr-2" />
                            Add Team Member
                        </Button>
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
                <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                        <Users size={20} className="text-primary" />
                        Cast / Performers
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="font-black text-primary text-[10px] uppercase tracking-widest bg-primary/5 hover:bg-primary/10 transition-all w-full sm:w-auto order-2 sm:order-1 h-11"
                            onClick={() => navigate('/participants?filter=unassigned')}
                        >
                            <Info size={14} className="mr-1.5" />
                            Review Unassigned
                        </Button>
                        <Button size="sm" className="font-black uppercase tracking-widest text-[10px] w-full sm:w-auto order-1 sm:order-2 h-11" onClick={() => onAddParticipant('Performer')}>
                            <UserPlus size={16} className="mr-2" />
                            Add Performer
                        </Button>
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
    const hasApprovedAssets = Array.isArray(p.assets) && p.assets.length > 0 && p.assets.every((a: any) => a.status === 'approved');

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
                        <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${['Manager', 'Choreographer'].includes(p.role)
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
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">Contact</p>
                        <p className="text-xs font-bold">{p.guardianPhone || "No Phone"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card">
                        {hasApprovedAssets ? (
                            <CheckCircle size={12} className="text-emerald-500" />
                        ) : (
                            <AlertCircle size={12} className="text-amber-500" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {hasApprovedAssets ? 'Ready' : 'Incomplete'}
                        </span>
                    </div>
                </div>
            </div>
    );
}

function AssetsTab({ act, onOpenAssetManager }: { act: any, onOpenAssetManager: () => void }) {
    const scrollToIntroBuilder = () => {
        const builder = document.getElementById('intro-builder');
        if (!builder) return;
        builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Music size={20} className="text-primary" />
                            Music & Audio
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 text-primary font-black text-xs"
                            onClick={onOpenAssetManager}
                        >
                            Manage
                        </Button>
                    </div>
                    <p className="text-xs font-medium leading-5 text-muted-foreground">
                        Keep the act record simple here. Track music and stage media, then use approved participant photos below when you are ready to build an intro.
                    </p>
                    <div className="space-y-3">
                        {(act.assets || []).length > 0 ? (act.assets || []).map((asset: any) => (
                            <div key={asset.id} className="p-4 border border-border rounded-xl flex items-center justify-between bg-muted/20">
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
                        )) : (
                            <div className="text-center py-8 text-muted-foreground font-medium italic">
                                No act media uploaded yet.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Settings size={20} className="text-primary" />
                            Stage Requirements
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 text-primary font-black text-xs"
                            onClick={scrollToIntroBuilder}
                        >
                            Manage
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {(act.requirements || []).length > 0 ? (act.requirements || []).map((req: any) => {
                            let displayDescription = req.description;
                            let isIntro = req.requirementType === 'IntroComposition';
                            
                            // Try to parse JSON to see if it's a hidden metadata field
                            try {
                                if (req.description?.startsWith('{')) {
                                    const parsed = JSON.parse(req.description);
                                    if (isIntro) {
                                        displayDescription = `Composed with ${parsed.selectedAssetIds?.length || 0} performers`;
                                    } else {
                                        displayDescription = "Technical Configuration";
                                    }
                                }
                            } catch (e) {
                                // Fallback to raw description if not JSON
                            }

                            return (
                                <div key={req.id} className="p-4 border border-border rounded-xl flex items-center justify-between bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIntro ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {isIntro ? <MonitorPlay size={16} /> : <Settings size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">
                                                {isIntro ? "Intro Composition" : req.requirementType}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium">{displayDescription}</p>
                                        </div>
                                    </div>
                                    <div className={req.fulfilled ? "text-emerald-500" : "text-amber-500"}>
                                        {req.fulfilled ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-8 text-muted-foreground font-medium italic">
                                No tech requirements listed.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Intro Video Builder Section */}
            <Card id="intro-builder" className="p-1 border shadow-xl bg-card/50 scroll-mt-28">
                <IntroVideoBuilder actId={act.id} />
            </Card>
        </div>
    );
}
