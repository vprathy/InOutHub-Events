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
    MoreVertical
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatusPicker } from '@/components/acts/StatusPicker';
import { IntroVideoBuilder } from '@/components/acts/IntroVideoBuilder';

type TabType = 'overview' | 'cast' | 'assets';

export function PerformanceProfilePage() {
    const { actId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
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

    return (
        <div className="flex flex-col space-y-6 max-w-5xl mx-auto pb-20">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical size={18} />
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
                <h1 className="text-4xl font-black tracking-tighter text-foreground antialiased italic">{act.name}</h1>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">{act.participants.length} Active Cast Members Assigned</p>
            </div>

            {/* Navigation Tabs - Swippable Cockpit */}
            <div className="flex items-center space-x-1 bg-muted/40 p-1 rounded-2xl border border-border/40 w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory antialiased shadow-inner">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`whitespace-nowrap px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 ${activeTab === 'overview' ? 'bg-background text-primary shadow-lg border border-primary/20 scale-[1.02]' : 'text-muted-foreground/60 hover:text-foreground'}`}
                >
                    <Info size={14} />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('cast')}
                    className={`whitespace-nowrap px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 ${activeTab === 'cast' ? 'bg-background text-primary shadow-lg border border-primary/20 scale-[1.02]' : 'text-muted-foreground/60 hover:text-foreground'}`}
                >
                    <Users size={14} />
                    Cast & Crew
                </button>
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`whitespace-nowrap px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex-shrink-0 snap-center flex items-center gap-2 ${activeTab === 'assets' ? 'bg-background text-primary shadow-lg border border-primary/20 scale-[1.02]' : 'text-muted-foreground/60 hover:text-foreground'}`}
                >
                    <Music size={14} />
                    Assets
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-2">
                {activeTab === 'overview' && <OverviewTab act={act} />}
                {activeTab === 'cast' && <CastTab participants={act.participants} />}
                {activeTab === 'assets' && <AssetsTab act={act} />}
            </div>
        </div>
    );
}


function OverviewTab({ act }: { act: any }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileText size={20} className="text-primary" />
                        Director's Notes
                    </h3>
                    <div className="p-4 bg-muted/30 rounded-xl text-foreground/80 leading-relaxed font-medium">
                        {act.notes || "No technical notes provided for this performance."}
                    </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-6 flex flex-col items-center justify-center text-center space-y-2 border-primary/10 bg-primary/[0.02]">
                        <Clock size={24} className="text-primary mb-1" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Setup Time</p>
                        <h4 className="text-2xl font-black">{act.setupTimeMinutes} <span className="text-sm font-medium">mins</span></h4>
                    </Card>
                    <Card className="p-6 flex flex-col items-center justify-center text-center space-y-2 border-primary/10 bg-primary/[0.02]">
                        <Timer size={24} className="text-primary mb-1" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Show Time</p>
                        <h4 className="text-2xl font-black">{act.durationMinutes} <span className="text-sm font-medium">mins</span></h4>
                    </Card>
                </div>
            </div>

            <div className="space-y-6">
                <Card className="p-6 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Readiness Signal</h3>
                    <div className="space-y-4">
                        <ReadinessItem
                            label="Personnel Readiness"
                            status={act.participants.every((p: any) => p.status === 'active') ? 'ready' : 'warning'}
                        />
                        <ReadinessItem
                            label="Music & Media"
                            status={act.assets.length > 0 ? 'ready' : 'missing'}
                        />
                        <ReadinessItem
                            label="Stage Requirements"
                            status={act.requirements.length > 0 ? 'ready' : 'info'}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}

function CastTab({ participants }: { participants: any[] }) {
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
                        <Button size="sm" variant="outline" className="font-bold border-primary/20 hover:bg-primary/5">
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
                        <Button size="sm" variant="ghost" className="font-black text-primary text-[10px] uppercase tracking-widest bg-primary/5 hover:bg-primary/10 transition-all w-full sm:w-auto order-2 sm:order-1 h-9">
                            <Info size={14} className="mr-1.5" />
                            AI Suggest Cast
                        </Button>
                        <Button size="sm" className="font-black uppercase tracking-widest text-[10px] w-full sm:w-auto order-1 sm:order-2 h-9">
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
                    {p.assets?.every((a: any) => a.status === 'approved') ? (
                        <CheckCircle size={12} className="text-emerald-500" />
                    ) : (
                        <AlertCircle size={12} className="text-amber-500" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {p.assets?.every((a: any) => a.status === 'approved') ? 'Ready' : 'Incomplete'}
                    </span>
                </div>
            </div>
        </div>
    );
}

function AssetsTab({ act }: { act: any }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Music size={20} className="text-primary" />
                            Music & Audio
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary font-black text-xs">Manage</Button>
                    </div>
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
                        <Button variant="ghost" size="sm" className="text-primary font-black text-xs">Manage</Button>
                    </div>
                    <div className="space-y-3">
                        {(act.requirements || []).length > 0 ? (act.requirements || []).map((req: any) => (
                            <div key={req.id} className="p-4 border border-border rounded-xl flex items-center justify-between bg-muted/20">
                                <div>
                                    <p className="font-bold text-sm">{req.requirementType}</p>
                                    <p className="text-xs text-muted-foreground font-medium">{req.description}</p>
                                </div>
                                <div className={req.fulfilled ? "text-emerald-500" : "text-amber-500"}>
                                    {req.fulfilled ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-muted-foreground font-medium italic">
                                No tech requirements listed.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Intro Video Builder Section */}
            <Card className="p-1 border shadow-xl bg-card/50">
                <IntroVideoBuilder actId={act.id} />
            </Card>
        </div>
    );
}

function ReadinessItem({ label, status }: { label: string, status: 'ready' | 'warning' | 'missing' | 'info' }) {
    const colors = {
        ready: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        missing: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        info: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10">
            <span className="text-xs font-bold text-foreground/70">{label}</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${colors[status]}`}>
                {status === 'ready' ? <CheckCircle size={10} /> : status === 'missing' ? <AlertCircle size={10} /> : <Info size={10} />}
                {status}
            </div>
        </div>
    );
}
