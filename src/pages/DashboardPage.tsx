import {
    LayoutDashboard,
    Mic2,
    ChevronRight,
    Play,
    ShieldAlert,
    FileCheck,
    Users,
    ClipboardList
} from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useDashboardRadar } from '@/hooks/useDashboardRadar';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const { eventId } = useSelection();
    const navigate = useNavigate();

    const { data: radar, isLoading } = useDashboardRadar(eventId || '');

    if (!eventId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="p-4 rounded-3xl bg-primary/10 text-primary">
                    <LayoutDashboard className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-bold">Welcome to InOutHub</h1>
                <p className="text-muted-foreground max-w-xs">Please select an event to see your operations dashboard.</p>
                <button
                    onClick={() => navigate('/select-event')}
                    className="h-12 px-8 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                    Select Event
                </button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-20 bg-muted rounded-3xl w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-32 bg-muted rounded-[2rem]" />
                <div className="h-32 bg-muted rounded-[2rem]" />
                <div className="h-32 bg-muted rounded-[2rem]" />
            </div>
        </div>;
    }

    return (
        <div className="space-y-4 pb-12">
            {/* Header section with operational status */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic sm:text-4xl">Control Panel</h1>
                    <p className="max-w-md text-sm font-medium text-muted-foreground">Phone-first event pulse for placement, docs, and day-to-day manager follow-up.</p>
                </div>
                <div className="inline-flex items-center space-x-2 self-start rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-500">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">Active Ops</span>
                </div>
            </div>

            {/* Readiness Cards */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <RadarCard
                    label="Needs Placement"
                    value={radar?.participants.unassigned || 0}
                    subtext={`${radar?.participants.assigned || 0} already assigned`}
                    percent={radar?.participants.total ? ((radar.participants.total - radar.participants.unassigned) / radar.participants.total) * 100 : 0}
                    icon={Users}
                    color={radar?.participants.unassigned ? 'orange' : 'emerald'}
                    onClick={() => navigate('/participants?filter=unassigned')}
                    isAlert={!!radar?.participants.unassigned}
                />
                <RadarCard
                    label="Docs & Waivers"
                    value={(radar?.assets.pending || 0) + (radar?.assets.missing || 0)}
                    subtext={`${radar?.assets.fulfilled || 0} cleared`}
                    percent={radar?.overallReadiness || 0}
                    icon={FileCheck}
                    color={(radar?.assets.pending || radar?.assets.missing) ? 'orange' : 'emerald'}
                    onClick={() => navigate('/participants?filter=missing')}
                    isAlert={!!((radar?.assets.pending || 0) + (radar?.assets.missing || 0))}
                />
                <RadarCard
                    label="Safety"
                    value={radar?.participants.minorsAtRisk || 0}
                    subtext="Minors missing info"
                    percent={radar?.participants.minors ? ((radar.participants.minors - radar.participants.minorsAtRisk) / radar.participants.minors) * 100 : 100}
                    icon={ShieldAlert}
                    color={radar?.participants.minorsAtRisk ? "orange" : "emerald"}
                    onClick={() => navigate('/participants?filter=at-risk')}
                    isAlert={!!radar?.participants.minorsAtRisk}
                />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="bg-card/50 border border-border/50 p-2.5 rounded-2xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Arrived</p>
                    <p className="text-xl font-black tracking-tighter">{radar?.acts.arrived}</p>
                </div>
                <div className="bg-card/50 border border-border/50 p-2.5 rounded-2xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Stage Ready</p>
                    <p className="text-xl font-black tracking-tighter">{radar?.acts.ready}</p>
                </div>
                <div className="bg-card/50 border border-border/50 p-2.5 rounded-2xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Roster</p>
                    <p className="text-xl font-black tracking-tighter">{radar?.participants.total}</p>
                </div>
                <div className="bg-card/50 border border-border/50 p-2.5 rounded-2xl text-orange-500">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Docs Pending</p>
                    <p className="text-xl font-black tracking-tighter">{(radar?.assets.pending || 0) + (radar?.assets.missing || 0)}</p>
                </div>
            </div>

            {/* Quick Actions (Thumb Zone Optimized) */}
            <div className="space-y-3 pt-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Operational Links</h2>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <ActionCard
                        title="Participants"
                        description="Placement, docs, contacts, and safety follow-up"
                        icon={Users}
                        onClick={() => navigate('/participants')}
                        variant="primary"
                    />
                    <ActionCard
                        title="Performances"
                        description="Acts, notes, runtime, and intro readiness"
                        icon={ClipboardList}
                        onClick={() => navigate('/acts')}
                        variant="ghost"
                    />
                    <ActionCard
                        title="Show Flow"
                        description="Order acts and adjust the run of show"
                        icon={Mic2}
                        onClick={() => navigate('/lineup')}
                        variant="ghost"
                    />
                    <ActionCard
                        title="Stage Console"
                        description="Tablet-first live execution and timing"
                        icon={Play}
                        onClick={() => navigate('/stage-console')}
                        variant="ghost"
                    />
                </div>
            </div>
        </div>
    );
}

function RadarCard({ label, value, subtext, percent, icon: Icon, color, onClick, isAlert }: any) {
    const colors = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    const activeColor = colors[color as keyof typeof colors] || colors.blue;

    return (
        <button
            onClick={onClick}
            className={`relative overflow-hidden bg-card border p-3.5 rounded-[1.5rem] space-y-3 transition-all hover:border-primary/50 hover:shadow-xl active:scale-[0.98] text-left group
                ${isAlert ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-border'}
            `}
        >
            <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-2xl transition-transform group-hover:scale-110 ${activeColor}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black tracking-tighter leading-none block">{value}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{subtext}</span>
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-[11px] font-black uppercase tracking-widest">{label}</h3>
                <div className="h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${isAlert ? 'bg-orange-500' : 'bg-primary'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            {isAlert && (
                <div className="absolute top-0 right-0 p-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                </div>
            )}
        </button>
    );
}

function ActionCard({ title, description, icon: Icon, onClick, variant }: any) {
    const isPrimary = variant === 'primary';
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left p-3.5 rounded-[1.5rem] border transition-all active:scale-[0.98] flex items-center justify-between group
                ${isPrimary
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 hover:brightness-110'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'}
            `}
        >
            <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-2xl ${isPrimary ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors'}`}>
                    <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                    <h3 className="font-black uppercase tracking-tight text-sm leading-tight">{title}</h3>
                    <p className={`text-xs font-medium ${isPrimary ? 'text-white/70' : 'text-muted-foreground'}`}>{description}</p>
                </div>
            </div>
            <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isPrimary ? 'opacity-40' : 'text-muted-foreground'}`} />
        </button>
    );
}
