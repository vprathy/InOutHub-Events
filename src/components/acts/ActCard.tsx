import type { ActWithCounts } from '@/types/domain';
import { ChevronRight, Music, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatReadinessDate } from '@/lib/actReadiness';

interface ActCardProps {
    act: ActWithCounts;
    isExpanded: boolean;
    onToggle: () => void;
}

export function ActCard({ act, isExpanded, onToggle }: ActCardProps) {
    const metaLine = `${act.participantCount} performer${act.participantCount === 1 ? '' : 's'} • ${act.durationMinutes}m`;

    const overallState = act.arrivalStatus === 'Ready'
        ? { label: 'Stage Ready', tone: 'ready' as const }
        : act.readinessState === 'Blocked'
            ? { label: 'Needs Attention', tone: 'blocked' as const }
            : act.readinessState === 'At Risk'
                ? { label: 'At Risk', tone: 'risk' as const }
                : { label: 'On Track', tone: 'track' as const };

    const primaryReason = (() => {
        if (act.participantCount === 0) return 'Needs cast';
        if (act.missingAssetCount > 0 && !act.hasMusicTrack) return 'Docs and music missing';
        if (act.missingAssetCount > 0) return 'Docs pending';
        if (!act.hasMusicTrack) return 'Music missing';
        if (act.hasIntroRequirement && !act.hasApprovedIntro) return 'Intro pending';
        if (act.nextPracticeStartsAt) return `Next practice ${formatReadinessDate(act.nextPracticeStartsAt)}`;
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

    return (
        <div
            className={`bg-card border rounded-[1.5rem] p-4 shadow-sm transition-all hover:border-primary/40 flex flex-col space-y-3 cursor-pointer group relative overflow-hidden ${overallState.tone === 'ready' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}
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
            {act.introBackgroundUrl ? (
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                    <img src={act.introBackgroundUrl} className="w-full h-full object-cover blur-2xl scale-105" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                </div>
            ) : null}

            {overallState.tone === 'ready' ? (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            ) : null}

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
                        <p className="mt-1 text-sm font-black text-foreground">{act.missingAssetCount > 0 ? `${act.missingAssetCount} open` : 'Clear'}</p>
                    </div>
                </div>

                {isExpanded ? (
                    <div className="rounded-2xl border border-border/70 bg-background/40 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 text-xs font-medium text-muted-foreground">
                                Open details to manage cast, readiness, and media.
                            </p>
                            <Link
                                to={`/performances/${act.id}`}
                                className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/15"
                                aria-label={`View details for ${act.name}`}
                                onClick={(event) => event.stopPropagation()}
                            >
                                View Details
                            </Link>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
