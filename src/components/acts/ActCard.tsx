import { useState } from 'react';
import type { ActWithCounts } from '@/types/domain';
import { ActIndicators } from '@/components/acts/ActIndicators';
import { Clock, Info, ExternalLink, UserPlus, Music, CheckCircle2, Loader2, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AddParticipantToActModal } from './AddParticipantToActModal';
import { UploadActAssetModal } from './UploadActAssetModal';
import { useUpdateActStatus } from '@/hooks/useActs';
import { IntroVideoPlayer } from '@/components/console/IntroVideoPlayer';
import { getPlayableIntro } from '@/lib/introCapabilities';
import type { IntroComposition } from '@/types/domain';

interface ActCardProps {
    act: ActWithCounts;
}

export function ActCard({ act }: ActCardProps) {
    const navigate = useNavigate();
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [playableIntro, setPlayableIntro] = useState<{
        composition: IntroComposition;
        actName: string;
        participants: any[];
    } | null>(null);
    const updateStatus = useUpdateActStatus();

    const isReady = act.arrivalStatus === 'Ready';
    const primaryMeta = [`${act.durationMinutes}m`, `${act.setupTimeMinutes}m setup`];
    const secondaryMeta = `${act.participantCount} performers`;
    const readinessItems = [
        {
            label: 'Cast',
            value: act.participantCount > 0 ? `${act.participantCount} assigned` : 'Needs cast',
            tone: act.participantCount > 0 ? 'ok' : 'warn',
            icon: UserPlus,
        },
        {
            label: 'Intro',
            value: act.hasApprovedIntro ? 'Approved' : 'Pending',
            tone: act.hasApprovedIntro ? 'ok' : 'warn',
            icon: MonitorPlay,
        },
        {
            label: 'Music',
            value: act.hasMusicTrack ? 'Uploaded' : 'Missing',
            tone: act.hasMusicTrack ? 'ok' : 'warn',
            icon: Music,
        },
    ] as const;

    const handleToggleReady = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateStatus.mutate({
            actId: act.id,
            status: isReady ? 'Arrived' : 'Ready'
        });
    };

    const handlePlayIntro = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!act.hasApprovedIntro || isPreviewLoading) return;

        setIsPreviewLoading(true);
        setPreviewError(null);
        try {
            const result = await getPlayableIntro(act.id);
            setPlayableIntro({
                composition: result.composition,
                actName: result.actName,
                participants: result.participants,
            });
        } catch (error) {
            setPreviewError(error instanceof Error ? error.message : 'Intro preview failed');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    return (
        <div
            className={`bg-card border rounded-[1.5rem] p-4 shadow-sm transition-all hover:border-primary/40 flex flex-col space-y-3 cursor-pointer group relative overflow-hidden ${isReady ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border'
                }`}
            onClick={() => navigate(`/acts/${act.id}`)}
        >
            {act.introBackgroundUrl ? (
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                    <img src={act.introBackgroundUrl} className="w-full h-full object-cover blur-2xl scale-105" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                </div>
            ) : null}

            {/* Ready Glow */}
            {isReady && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            )}

            {/* Top Section: Name and Indicators */}
            <div className="space-y-2.5">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                            <h3 className="text-lg font-black leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 sm:line-clamp-1">
                                {act.name}
                            </h3>
                            <ExternalLink size={14} className="mt-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground font-black uppercase tracking-widest">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span>{primaryMeta[0]}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-primary" />
                                <span>{primaryMeta[1]}</span>
                            </div>
                            <span className="text-[11px] font-bold normal-case tracking-normal text-muted-foreground/80">
                                {secondaryMeta}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleReady}
                        disabled={updateStatus.isPending}
                        className={`min-h-[44px] shrink-0 self-start rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${isReady
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-secondary text-muted-foreground border-border/50 hover:border-emerald-500/50 hover:text-emerald-600'
                            }`}
                    >
                        <span className="inline-flex items-center gap-2">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isReady ? 'animate-pulse' : ''}`} />
                            {isReady ? 'Stage Ready' : 'Mark Ready'}
                        </span>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {readinessItems.map((item) => {
                        const Icon = item.icon;
                        const toneClasses = item.tone === 'ok'
                            ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700'
                            : 'border-amber-500/25 bg-amber-500/5 text-amber-700';
                        return (
                            <div
                                key={item.label}
                                className={`rounded-2xl border px-3 py-2 ${toneClasses}`}
                            >
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]">
                                    <Icon className="h-3.5 w-3.5" />
                                    <span>{item.label}</span>
                                </div>
                                <p className="mt-1 text-sm font-bold tracking-tight text-foreground">{item.value}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="overflow-x-auto pb-1">
                    <ActIndicators
                        participantCount={act.participantCount}
                        hasMusicTrack={act.hasMusicTrack}
                        hasTechnicalRider={act.hasTechnicalRider}
                        missingAssetCount={act.missingAssetCount}
                        specialRequestCount={act.specialRequestCount}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] rounded-2xl border-primary/20 hover:border-primary bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest shadow-sm shadow-primary/5"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/acts/${act.id}`);
                    }}
                >
                    <MonitorPlay className="w-3.5 h-3.5 mr-2" />
                    Open Workspace
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] rounded-2xl border-border/50 hover:border-primary/50 bg-muted/20 text-[10px] font-black uppercase tracking-widest shadow-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAddParticipantOpen(true);
                    }}
                >
                    <UserPlus className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span className="truncate">Add Performer</span>
                </Button>
            </div>

            {act.hasApprovedIntro ? (
                <div className="relative z-10 overflow-hidden rounded-[1.5rem] border border-primary/20 bg-slate-950">
                    {act.introBackgroundUrl ? (
                        <img src={act.introBackgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/5" />
                    <button
                        onClick={handlePlayIntro}
                        disabled={isPreviewLoading}
                        className="group/intro relative flex min-h-[128px] w-full items-end overflow-hidden p-4 text-left transition hover:border-primary/60 disabled:cursor-wait disabled:opacity-80"
                    >
                        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
                            Intro Ready
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl transition group-hover/intro:scale-105">
                                {isPreviewLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <MonitorPlay className="h-6 w-6" />}
                            </div>
                        </div>
                        <div className="relative z-10 flex w-full items-end justify-between gap-3">
                            <div className="max-w-[70%]">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                                    {isPreviewLoading ? 'Loading Preview' : 'Preview Intro'}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-white/85">
                                    Open the approved intro from this card.
                                </p>
                            </div>
                            <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20">
                                Play
                            </span>
                        </div>
                    </button>
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        {previewError ? (
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100">
                                {previewError}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {/* Tactical Action Bar */}
            <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={`min-h-[44px] rounded-2xl border-border/50 hover:border-primary/50 bg-muted/20 text-[10px] font-black uppercase tracking-widest shadow-sm ${!act.hasMusicTrack ? 'border-rose-500/30 text-rose-600 bg-rose-500/5' : ''
                        }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsUploadOpen(true);
                    }}
                >
                    <Music className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span className="truncate">Update Music</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hidden min-h-[44px] rounded-2xl border border-dashed border-border/60 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground sm:flex"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/acts/${act.id}`);
                    }}
                >
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    <span className="truncate">Open Details</span>
                </Button>
            </div>

            {/* Modals */}
            <AddParticipantToActModal
                isOpen={isAddParticipantOpen}
                onClose={() => setIsAddParticipantOpen(false)}
                actId={act.id}
                actName={act.name}
                eventId={act.eventId}
            />
            <UploadActAssetModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                actId={act.id}
                actName={act.name}
                eventId={act.eventId}
            />
            {playableIntro ? (
                <IntroVideoPlayer
                    composition={playableIntro.composition}
                    actName={playableIntro.actName}
                    participants={playableIntro.participants}
                    defaultFullscreen={false}
                    onClose={() => setPlayableIntro(null)}
                />
            ) : null}
        </div>
    );
}
