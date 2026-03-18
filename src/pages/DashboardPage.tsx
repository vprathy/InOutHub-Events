import {
    LayoutDashboard,
    Play,
    ShieldAlert,
    FileCheck,
    Users,
    ClipboardList,
    CalendarClock,
    Star,
} from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useDashboardRadar } from '@/hooks/useDashboardRadar';
import { useNavigate } from 'react-router-dom';
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard, type OperationalTone } from '@/components/ui/OperationalCards';

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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-28 bg-muted rounded-[1.5rem]" />
                ))}
            </div>
        </div>;
    }

    const metrics = [
        {
            label: 'Safety',
            value: radar?.participants.minorsAtRisk || 0,
            icon: ShieldAlert,
            tone: (radar?.participants.minorsAtRisk || 0) > 0 ? 'critical' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/participants?filter=at_risk'),
        },
        {
            label: 'Needs Placement',
            value: radar?.participants.unassigned || 0,
            icon: Users,
            tone: (radar?.participants.unassigned || 0) > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/participants?filter=unassigned'),
        },
        {
            label: 'Approvals',
            value: (radar?.assets.pending || 0) + (radar?.assets.missing || 0),
            icon: FileCheck,
            tone: ((radar?.assets.pending || 0) + (radar?.assets.missing || 0)) > 0 ? 'warning' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/participants?filter=missing'),
        },
        {
            label: 'Participants',
            value: radar?.participants.total || 0,
            icon: Users,
            tone: 'default' as OperationalTone,
            onClick: () => navigate('/participants'),
        },
        {
            label: 'Performances',
            value: radar?.acts.total || 0,
            icon: ClipboardList,
            tone: 'default' as OperationalTone,
            onClick: () => navigate('/performances'),
        },
        {
            label: 'Checked In',
            value: radar?.acts.arrived || 0,
            icon: CalendarClock,
            tone: 'info' as OperationalTone,
            onClick: () => navigate('/performances'),
        },
        {
            label: 'Show Ready',
            value: radar?.acts.ready || 0,
            icon: Play,
            tone: 'good' as OperationalTone,
            onClick: () => navigate('/stage-console'),
        },
        {
            label: 'Not Here',
            value: radar?.acts.arriving || 0,
            icon: Star,
            tone: (radar?.acts.arriving || 0) > 0 ? 'default' as OperationalTone : 'good' as OperationalTone,
            onClick: () => navigate('/performances'),
        },
    ];

    const responseQueue = [
        {
            label: 'Safety Follow-Up',
            detail: 'Minor participants are still missing guardian details that should be resolved before show day.',
            count: radar?.participants.minorsAtRisk || 0,
            tone: 'critical' as OperationalTone,
            action: 'Review Safety',
            onClick: () => navigate('/participants?filter=at_risk'),
        },
        {
            label: 'Performance Escalations',
            detail: (radar?.needsResponse.actIssueBlocked || 0) > 0
                ? 'Blocked or high-severity performance issues need operator follow-up.'
                : 'Open performance issues should be reviewed before they spread.',
            count: radar?.needsResponse.actIssueOpen || 0,
            tone: (radar?.needsResponse.actIssueBlocked || 0) > 0 ? 'critical' as OperationalTone : 'warning' as OperationalTone,
            action: 'Open Performances',
            onClick: () => navigate('/performances'),
        },
        {
            label: 'Special Request Review',
            detail: 'Participant accommodations still need a logged review or acknowledgement.',
            count: radar?.needsResponse.specialRequestReview || 0,
            tone: 'warning' as OperationalTone,
            action: 'Review Requests',
            onClick: () => navigate('/participants?filter=special'),
        },
        {
            label: 'Team Coverage Gaps',
            detail: 'Some performances have cast assigned but no manager, choreographer, or support lead.',
            count: radar?.needsResponse.teamCoverageGaps || 0,
            tone: 'warning' as OperationalTone,
            action: 'Review Performances',
            onClick: () => navigate('/performances'),
        },
        {
            label: 'Intro Approval Pending',
            detail: 'Intro compositions exist but still need review before showtime.',
            count: radar?.needsResponse.introPending || 0,
            tone: 'default' as OperationalTone,
            action: 'Open Performances',
            onClick: () => navigate('/performances'),
        },
    ]
        .filter((item) => item.count > 0)
        .sort((a, b) => {
            const weights: Record<OperationalTone, number> = { critical: 3, warning: 2, info: 1, good: 0, default: 0 };
            const toneDiff = weights[b.tone] - weights[a.tone];
            if (toneDiff !== 0) return toneDiff;
            return b.count - a.count;
        })
        .slice(0, 4);
    return (
        <div className="space-y-5 pb-12">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-[1.75rem]">
                        Dashboard
                    </h1>
                    <p className="text-sm font-semibold text-muted-foreground">
                        What needs attention now
                    </p>
                </div>
            </div>

            <div className="surface-panel rounded-[1.35rem] p-3">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Show Snapshot</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {metrics.map((metric) => (
                        <OperationalMetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            icon={metric.icon}
                            tone={metric.tone}
                            onClick={metric.onClick}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2 pt-0.5">
                <div className="space-y-1 px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Needs Response</h2>
                    <p className="text-xs text-muted-foreground">Top unresolved issues should show up here before you go hunting through the app.</p>
                </div>
                {responseQueue.length > 0 ? (
                    <div className="space-y-2.5">
                        {responseQueue.map((item) => (
                            <OperationalResponseCard
                                key={item.label}
                                label={item.label}
                                detail={item.detail}
                                count={item.count}
                                tone={item.tone}
                                action={item.action}
                                onClick={item.onClick}
                            />
                        ))}
                    </div>
                ) : (
                    <OperationalEmptyResponse
                        title="No Escalations"
                        detail="Nothing urgent is demanding a response right now."
                    />
                )}
            </div>
        </div>
    );
}
