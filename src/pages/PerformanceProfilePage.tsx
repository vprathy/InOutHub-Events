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
            {/* Header / Breadcrumbs */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/acts')}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft size={16} className="mr-1" />
                    Back to Performances
                </Button>
                <Button variant="ghost" size="icon">
                    <MoreVertical size={20} />
                </Button>
            </div>

            {/* Title & Status */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black px-3 py-1 tracking-widest text-[10px]">
                            PERFORMANCE
                        </Badge>
                        <Badge variant="secondary" className={`${act.arrivalStatus === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                            } font-bold`}>
                            {act.arrivalStatus}
                        </Badge>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-foreground">{act.name}</h1>
                    <div className="flex items-center gap-4 text-muted-foreground font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-primary/70" />
                            <span>{act.durationMinutes}m duration</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-border pl-4">
                            <Users size={16} className="text-primary/70" />
                            <span>{act.participants.length} Cast Members</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[240px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Operational State
                    </p>
                    <StatusPicker
                        currentStatus={act.arrivalStatus}
                        onStatusChange={(status) => updateStatus({ actId: act.id, status })}
                        isLoading={isPending}
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl w-fit">
                <TabButton
                    active={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    icon={<Info size={16} />}
                    label="Overview"
                />
                <TabButton
                    active={activeTab === 'cast'}
                    onClick={() => setActiveTab('cast')}
                    icon={<Users size={16} />}
                    label="Cast & Crew"
                />
                <TabButton
                    active={activeTab === 'assets'}
                    onClick={() => setActiveTab('assets')}
                    icon={<Music size={16} />}
                    label="Requirements"
                />
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

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            {icon}
            {label}
        </button>
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
    const [isAISuggesting, setIsAISuggesting] = useState(false);

    const team = participants.filter(p => ['Manager', 'Choreographer', 'Support'].includes(p.role));
    const performers = participants.filter(p => !['Manager', 'Choreographer', 'Support'].includes(p.role));

    const handleAISuggest = async () => {
        setIsAISuggesting(true);
        // Simulate an AI operation taking some time
        setTimeout(() => {
            alert('AI Suggestion completed: Recommended participants to cast are "John Doe" and "Jane Smith".');
            setIsAISuggesting(false);
        }, 1500);
    };

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
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Users size={20} className="text-primary" />
                        Cast / Performers
                    </h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="font-black text-primary text-xs bg-primary/5 hover:bg-primary/10 transition-all" onClick={handleAISuggest} disabled={isAISuggesting}>
                            <Info size={14} className="mr-1.5" />
                            {isAISuggesting ? 'Suggesting...' : 'AI Suggest Cast'}
                        </Button>
                        <Button size="sm" variant="outline" className="font-bold border-border">
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

            {/* Auto-Video Section */}
            <Card className="p-8 border-dashed border-2 border-primary/20 bg-primary/[0.02] flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-72 aspect-video bg-black rounded-2xl flex flex-col items-center justify-center text-white/50 relative overflow-hidden group border border-white/10 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 opacity-50" />
                    <Settings size={48} className="animate-spin-slow mb-2 relative z-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">AI Intro Preview</p>
                    <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/3" />
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    <div>
                        <Badge className="bg-primary/10 text-primary border-none mb-2 font-black text-[10px] tracking-widest px-3">
                            AUTOMATION ALPHA
                        </Badge>
                        <h3 className="text-3xl font-black tracking-tighter">Auto-Generated Performance Intro</h3>
                        <p className="text-muted-foreground font-medium mt-2 leading-relaxed">
                            The system is assembling a high-energy intro video using participant headshots, act music, and kinetic typography.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-xl border border-border">
                            <CheckCircle size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold text-foreground/80 lowercase">content scan: safe</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-xl border border-border">
                            <Users size={16} className="text-primary" />
                            <span className="text-xs font-bold text-foreground/80 lowercase">{act.participants.length} assets merged</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8">
                            Approve for Show
                        </Button>
                        <Button variant="outline" className="font-bold">
                            Customize Video
                        </Button>
                    </div>
                </div>
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
