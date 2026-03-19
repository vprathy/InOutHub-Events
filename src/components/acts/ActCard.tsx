import type { ActWithCounts } from '@/types/domain';
import { ChevronRight, MonitorPlay, Music, Sparkles, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatReadinessDate, getActReadinessLabel } from '@/lib/actReadiness';

interface ActCardProps {
    act: ActWithCounts;
    isExpanded: boolean;
    onToggle: () => void;
}

export function ActCard({ act, isExpanded, onToggle }: ActCardProps) {
    const metaLine = `${act.participantCount} performer${act.participantCount === 1 ? '' : 's'} • ${act.durationMinutes}m show • ${act.setupTimeMinutes}m setup`;

    const hasCastGap = act.participantCount === 0;
    const hasMusicGap = !act.hasMusicTrack;
    const hasPrepGap = act.missingAssetCount > 0;
    const hasIntroPending = act.hasIntroRequirement && !act.hasApprovedIntro;
    const isOperationallyReady = !hasCastGap && !hasMusicGap && !hasPrepGap;

    const overallState = hasCastGap
        ? { label: 'Needs Cast', tone: 'blocked' as const }
        : hasMusicGap && hasPrepGap
            ? { label: 'Needs Attention', tone: 'blocked' as const }
            : hasMusicGap
                ? { label: 'Music Missing', tone: 'blocked' as const }
                : hasPrepGap
                    ? { label: 'Prep Gaps', tone: 'risk' as const }
                    : hasIntroPending
                        ? { label: 'Intro Pending', tone: 'risk' as const }
                        : act.arrivalStatus === 'Ready' && isOperationallyReady
                            ? { label: 'Stage Ready', tone: 'ready' as const }
                            : { label: 'On Track', tone: 'track' as const };

    const primaryReason = (() => {
        if (hasCastGap) return 'No performers assigned yet';
        if (hasPrepGap && hasMusicGap) return 'Cast approvals and music missing';
        if (hasPrepGap) return 'Cast approvals pending';
        if (hasMusicGap) return 'Music missing';
        if (hasIntroPending) return 'Intro ready for approval';
        if (act.nextPracticeStartsAt) return `Next practice ${formatReadinessDate(act.nextPracticeStartsAt)}`;
        if (act.arrivalStatus === 'Ready' && isOperationallyReady) return 'Ready for stage and console flow';
        return 'Ready for workspace review';
    })();

    const criticalInfoLine = `${metaLine} • ${primaryReason}`;

    const stateClasses = overallState.tone === 'ready'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
        : overallState.tone === 'blocked'
            ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
            : overallState.tone === 'risk'
                ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                : 'border-primary/20 bg-primary/10 text-primary';

    const accentLineClass = overallState.tone === 'ready'
        ? 'bg-emerald-500'
        : overallState.tone === 'blocked'
            ? 'bg-rose-500'
            : overallState.tone === 'risk'
                ? 'bg-amber-500'
                : 'bg-border';

    const expandedActions = [
        act.hasApprovedIntro
            ? {
                label: 'Open Intro',
                to: `/performances/${act.id}?tab=assets#intro-builder`,
                tone: 'primary' as const,
                icon: MonitorPlay,
            }
            : {
                label: act.hasIntroRequirement ? 'Review Intro' : 'Prepare Intro',
                to: `/performances/${act.id}?tab=assets#intro-builder`,
                tone: 'primary' as const,
                icon: Sparkles,
            },
        {
            label: 'Open Workspace',
            to: `/performances/${act.id}`,
            tone: 'default' as const,
            icon: ChevronRight,
        },
        ...(act.hasApprovedIntro ? [{
            label: 'Console',
            to: '/console',
            tone: 'default' as const,
            icon: MonitorPlay,
        }] : []),
    ];

    return (
        <div
            className={`surface-panel relative flex cursor-pointer flex-col space-y-3 overflow-hidden rounded-[1.5rem] border px-4 py-4 shadow-sm transition-all hover:border-primary/40 group ${isExpanded ? 'ring-2 ring-primary/15 border-primary/40' : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${act.name}`}
            onClick={onToggle}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onToggle();
                }
            }}
        >
            <div className="relative z-10 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-black leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {act.name}
                            </h3>
                            <ChevronRight size={16} className={`mt-1 shrink-0 text-muted-foreground/70 transition-all group-hover:text-primary ${isExpanded ? 'rotate-90 text-primary' : 'group-hover:translate-x-0.5'}`} />
                        </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${stateClasses}`}>
                        {overallState.label}
                    </span>
                </div>

                <p className="text-sm font-medium leading-6 text-muted-foreground line-clamp-2">
                    {criticalInfoLine}
                </p>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <p className="text-[9px] font-black uppercase tracking-[0.16em]">Cast</p>
                        </div>
                        <p className="mt-1 text-sm font-black text-foreground">{act.participantCount}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Music className="h-3.5 w-3.5" />
                            <p className="text-[9px] font-black uppercase tracking-[0.16em]">Music</p>
                        </div>
                        <p className="mt-1 text-sm font-black text-foreground">{act.hasMusicTrack ? 'Ready' : 'Missing'}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <TriangleAlert className="h-3.5 w-3.5" />
                            <p className="text-[9px] font-black uppercase tracking-[0.16em]">Prep</p>
                        </div>
                        <p className="mt-1 text-sm font-black text-foreground">{act.missingAssetCount > 0 ? `${act.missingAssetCount} to review` : getActReadinessLabel(act.readinessState)}</p>
                    </div>
                </div>

                {isExpanded ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/40 px-3.5 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Next Actions</p>
                        <div className="flex flex-wrap gap-2">
                            {expandedActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link
                                        key={`${act.id}-${action.label}`}
                                        to={action.to}
                                        className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
                                            action.tone === 'primary'
                                                ? 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
                                                : 'border border-border bg-background text-foreground hover:bg-accent'
                                        }`}
                                        aria-label={`${action.label} for ${act.name}`}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <Icon className="h-3.5 w-3.5" />
                                            {action.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-1 ${accentLineClass}`} />
        </div>
    );
}
