import type { ActWithCounts } from '@/types/domain';
import { ChevronRight, MonitorPlay, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatReadinessDate } from '@/lib/actReadiness';

interface ActCardProps {
    act: ActWithCounts;
    isExpanded: boolean;
    onToggle: () => void;
    onUploadMusic?: (act: ActWithCounts) => void;
}

export function ActCard({ act, isExpanded, onToggle, onUploadMusic }: ActCardProps) {
    const gapCount = [act.participantCount === 0, !act.hasMusicTrack, act.missingAssetCount > 0, act.hasIntroRequirement && !act.hasApprovedIntro].filter(Boolean).length;
    const sizeLine = `${act.participantCount} performer${act.participantCount === 1 ? '' : 's'} • ${act.durationMinutes}m show`;

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
        if (act.arrivalStatus === 'Ready' && isOperationallyReady) return 'Ready';
        return 'On track';
    })();
    const collapsedLead = act.managerName ? `Lead: ${act.managerName}` : 'No lead';
    const collapsedSummary = gapCount > 0
        ? `${collapsedLead} • ${sizeLine} • ${gapCount} gap${gapCount === 1 ? '' : 's'}`
        : `${collapsedLead} • ${sizeLine} • Ready`;
    const managerLine = act.managerName || 'Not assigned';
    const contactLine = act.contactPhone || 'No contact';
    const primaryAction = (() => {
        if (hasMusicGap) {
            return {
                label: 'Upload Music',
                kind: 'upload' as const,
            };
        }
        if (hasCastGap) {
            return {
                label: 'Review Cast',
                to: `/performances/${act.id}`,
                kind: 'link' as const,
                icon: ChevronRight,
            };
        }
        if (hasPrepGap) {
            return {
                label: 'Review Prep',
                to: `/performances/${act.id}`,
                kind: 'link' as const,
                icon: ChevronRight,
            };
        }
        if (act.hasApprovedIntro) {
            return {
                label: 'Open Intro',
                to: `/performances/${act.id}?tab=assets#intro-builder`,
                kind: 'link' as const,
                icon: MonitorPlay,
            };
        }
        return {
            label: act.hasIntroRequirement ? 'Review Intro' : 'Prepare Intro',
            to: `/performances/${act.id}?tab=assets#intro-builder`,
            kind: 'link' as const,
            icon: Sparkles,
        };
    })();
    const PrimaryActionIcon = primaryAction.kind === 'link' ? primaryAction.icon : null;

    const accentLineClass = overallState.tone === 'ready'
        ? 'bg-emerald-500'
        : overallState.tone === 'blocked'
            ? 'bg-rose-500'
            : overallState.tone === 'risk'
                ? 'bg-amber-500'
                : 'bg-border';

    return (
        <div
            className={`surface-panel relative flex flex-col overflow-hidden rounded-[1.35rem] border px-3.5 py-3 shadow-sm transition-all hover:border-primary/40 group ${isExpanded ? 'ring-2 ring-primary/15 border-primary/40' : ''}`}
        >
            <div className="relative z-10 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                    <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${act.name}`}
                        onClick={onToggle}
                    >
                        <div className="min-w-0">
                            <h3 className="text-lg font-black leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {act.name}
                            </h3>
                            <p className="mt-0.5 text-sm font-medium leading-6 text-muted-foreground line-clamp-1">
                                {collapsedSummary}
                            </p>
                        </div>
                    </button>
                    <Link
                        to={`/performances/${act.id}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                        aria-label={`Open ${act.name}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <ChevronRight size={16} />
                    </Link>
                </div>

                {isExpanded ? (
                    <div className="space-y-2.5 border-t border-border/70 pt-2.5">
                        <div className="divide-y divide-border/70 rounded-xl border border-border/70 bg-background/30">
                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Critical Gap</p>
                                <p className="truncate text-sm font-semibold text-foreground">{primaryReason}</p>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Lead</p>
                                <p className="truncate text-sm font-medium text-foreground">{managerLine}</p>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Contact</p>
                                <p className="truncate text-sm font-medium text-foreground">{contactLine}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        {primaryAction.kind === 'upload' ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onUploadMusic?.(act);
                                }}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/15"
                                aria-label={`Upload music for ${act.name}`}
                            >
                                <MonitorPlay className="h-3.5 w-3.5" />
                                {primaryAction.label}
                            </button>
                        ) : (
                            <Link
                                to={primaryAction.to}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/15"
                                aria-label={`${primaryAction.label} for ${act.name}`}
                                onClick={(event) => event.stopPropagation()}
                            >
                                {PrimaryActionIcon ? <PrimaryActionIcon className="h-3.5 w-3.5" /> : null}
                                {primaryAction.label}
                            </Link>
                        )}
                        {act.contactPhone ? (
                            <a
                                href={`tel:${act.contactPhone}`}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/15"
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Call ${act.managerName ? 'lead' : 'contact'} for ${act.name}`}
                            >
                                <Phone className="h-3.5 w-3.5" />
                                {act.managerName ? 'Call Lead' : 'Call Contact'}
                            </a>
                        ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-1 ${accentLineClass}`} />
        </div>
    );
}
