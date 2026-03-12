import {
    LayoutDashboard,
    Mic2,
    Plus,
    ChevronRight,
    Play,
    ShieldAlert,
    FileCheck
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
        return <div className="animate-pulse space-y-8">
            <div className="h-20 bg-muted rounded-3xl w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-40 bg-muted rounded-[2.5rem]" />
                <div className="h-40 bg-muted rounded-[2.5rem]" />
                <div className="h-40 bg-muted rounded-[2.5rem]" />
            </div>
        </div>;
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header section with operational status */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">Control Panel</h1>
                    <p className="text-muted-foreground font-medium">Real-time event pulse & operation metrics.</p>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl border border-emerald-500/20">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">Active Ops</span>
                </div>
            </div>

            {/* Readiness Radar (High Contrast) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <RadarCard
                    label="Show Flow"
                    value={`${radar?.acts.ready}/${radar?.acts.total}`}
                    subtext="Acts Ready"
                    percent={radar?.acts.total ? (radar.acts.ready / radar.acts.total) * 100 : 0}
                    icon={Mic2}
                    color="blue"
                    onClick={() => navigate('/lineup')}
                />
                <RadarCard
                    label="Compliance"
                    value={`${radar?.assets.fulfilled}/${radar?.assets.totalRequired}`}
                    subtext="Waivers approved"
                    percent={radar?.overallReadiness || 0}
                    icon={FileCheck}
                    color="emerald"
                    onClick={() => navigate('/participants')}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card/50 border border-border/50 p-4 rounded-3xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arrived</p>
                    <p className="text-2xl font-black tracking-tighter">{radar?.acts.arrived}</p>
                </div>
                <div className="bg-card/50 border border-border/50 p-4 rounded-3xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-black tracking-tighter">{radar?.assets.pending}</p>
                </div>
                <div className="bg-card/50 border border-border/50 p-4 rounded-3xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Cast</p>
                    <p className="text-2xl font-black tracking-tighter">{radar?.participants.total}</p>
                </div>
                <div className="bg-card/50 border border-border/50 p-4 rounded-3xl text-orange-500">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Missing Assets</p>
                    <p className="text-2xl font-black tracking-tighter">{radar?.assets.missing}</p>
                </div>
            </div>

            {/* Quick Actions (Thumb Zone Optimized) */}
            <div className="space-y-4 pt-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Operational Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionCard
                        title="Live Stage Console"
                        description="Direct stage orchestration & timing"
                        icon={Play}
                        onClick={() => navigate('/stage-console')}
                        variant="primary"
                    />
                    <ActionCard
                        title="Import Roster"
                        description="Harden your data from sheets"
                        icon={Plus}
                        onClick={() => navigate('/participants?action=import')}
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
            className={`relative overflow-hidden bg-card border p-6 rounded-[2.5rem] space-y-6 transition-all hover:border-primary/50 hover:shadow-xl active:scale-[0.98] text-left group
                ${isAlert ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-border'}
            `}
        >
            <div className="flex items-start justify-between">
                <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${activeColor}`}>
                    <Icon className="w-8 h-8" />
                </div>
                <div className="text-right">
                    <span className="text-4xl font-black tracking-tighter leading-none block">{value}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{subtext}</span>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest">{label}</h3>
                <div className="h-3 bg-muted rounded-full overflow-hidden border border-border/50">
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
                w-full text-left p-6 rounded-[2rem] border transition-all active:scale-[0.98] flex items-center justify-between group
                ${isPrimary
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 hover:brightness-110'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'}
            `}
        >
            <div className="flex items-center space-x-5">
                <div className={`p-4 rounded-2xl ${isPrimary ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-black uppercase tracking-tight text-lg leading-tight">{title}</h3>
                    <p className={`text-sm font-medium ${isPrimary ? 'text-white/70' : 'text-muted-foreground'}`}>{description}</p>
                </div>
            </div>
            <ChevronRight className={`w-6 h-6 transition-transform group-hover:translate-x-1 ${isPrimary ? 'opacity-40' : 'text-muted-foreground'}`} />
        </button>
    );
}
