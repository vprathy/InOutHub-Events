import { Play, SkipForward, Pause, Square, Users, Clock, Timer, AlertCircle, CheckCircle2, Wifi, WifiOff, MonitorPlay, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusPicker } from '@/components/acts/StatusPicker';
import { useUpdateActStatus } from '@/hooks/useActs';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense, lazy, useState, useEffect } from 'react';
import type { IntroComposition } from '@/types/domain';
import { getPlayableIntro, prefetchPlayableIntro } from '@/lib/introCapabilities';
import { formatEventTime, formatNowInEventTime } from '@/lib/eventTime';

const IntroVideoPlayer = lazy(() => import('./IntroVideoPlayer').then((module) => ({ default: module.IntroVideoPlayer })));

interface LivePerformanceControllerProps {
    current: any;
    next: any;
    upcoming: any;
    status: string;
    isStageActionPending: boolean;
    driftMinutes: number;
    isOvertime: boolean;
    overtimeMinutes: number;
    actions: {
        startShow: () => void;
        nextPerformance: () => void;
        pauseShow: () => void;
        resumeShow: () => void;
        resetShow: () => void;
    };
    isReadOnly?: boolean;
}

const formatSafeTime = (dateString: string | null | undefined) => {
    if (!dateString) return "--:--";
    return formatEventTime(dateString, undefined, true);
};

const getBackgroundSourceLabel = (description: string | null | undefined) => {
    if (!description?.startsWith('{')) return null;
    try {
        const parsed = JSON.parse(description);
        const source = parsed?.background?.source;
        if (source === 'fallback_background') {
            return {
                label: 'Fallback Backdrop',
                className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            };
        }
        if (source === 'generated_background' || source === 'generative_background' || source === 'intro_requirement') {
            return {
                label: 'Backdrop Ready',
                className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            };
        }
        return null;
    } catch {
        return null;
    }
};

export function LivePerformanceController({
    current, next, upcoming, status,
    isStageActionPending,
    driftMinutes, isOvertime, overtimeMinutes,
    actions,
    isReadOnly = false,
}: LivePerformanceControllerProps) {
    const { mutate: updateStatus, isPending } = useUpdateActStatus();
    const [showIntro, setShowIntro] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [playableIntro, setPlayableIntro] = useState<{
        composition: IntroComposition;
        actName: string;
        participants: any[];
    } | null>(null);
    const [isLoadingIntro, setIsLoadingIntro] = useState(false);
    const [introError, setIntroError] = useState<string | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Selection logic for intro assets
    const requirements = current?.act?.requirements || [];
    const compositionReq = requirements.find((r: any) => r.requirementType === 'IntroComposition');
    const isIntroReady = compositionReq?.fulfilled && compositionReq?.description;
    const backgroundSourceBadge = getBackgroundSourceLabel(compositionReq?.description);
    
    // Background priority: Composition background > Generative background
    const currentPoster = compositionReq?.fileUrl || requirements.find((r: any) => r.requirementType === 'Generative')?.fileUrl;

    useEffect(() => {
        if (isIntroReady && current?.act?.id) {
            prefetchPlayableIntro(current.act.id);
        }
    }, [current?.act?.id, isIntroReady]);

    useEffect(() => {
        const nextIntroRequirement = next?.act?.requirements?.find((r: any) => r.requirementType === 'IntroComposition');
        if (next?.act?.id && nextIntroRequirement?.fulfilled) {
            prefetchPlayableIntro(next.act.id);
        }
    }, [next?.act?.id, next?.act?.requirements]);
    
    const handlePlayIntro = async () => {
        if (!current?.act?.id || isLoadingIntro) return;
        setIsLoadingIntro(true);
        setIntroError(null);
        try {
            const response = await getPlayableIntro(current.act.id);
            setPlayableIntro({
                composition: response.composition,
                actName: response.actName,
                participants: response.participants,
            });
            setShowIntro(true);
        } catch (error) {
            setIntroError(error instanceof Error ? error.message : 'Playable intro fetch failed');
        } finally {
            setIsLoadingIntro(false);
        }
    };

    if (status === 'Idle') {
        return (
            <div className="rounded-[2rem] border border-border/70 bg-card/70 p-8 text-center shadow-sm shadow-black/10">
                <div className="mx-auto flex max-w-xl flex-col items-center justify-center space-y-6">
                <div className="p-6 bg-primary/10 rounded-full text-primary animate-pulse">
                    <Play size={48} fill="currentColor" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Ready to Start?</h2>
                    <p className="text-muted-foreground max-w-sm">
                        Everything is set. Click below to start the show and activate the first performance.
                    </p>
                </div>
                <Button
                    size="lg"
                    onClick={actions.startShow}
                    disabled={isStageActionPending || isReadOnly}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-12 py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    {isReadOnly ? 'VIEW ONLY' : isStageActionPending ? 'STARTING...' : 'START SHOW'}
                </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-12">
            <div className="flex flex-col gap-6 relative">
                {introError ? (
                    <Card className="ml-8 p-3 border-amber-500/20 bg-amber-500/5 text-amber-700 text-sm font-medium">
                        {introError}
                    </Card>
                ) : null}
                <div className="absolute left-6 top-20 bottom-20 w-1 bg-gradient-to-b from-rose-500/30 via-primary/20 to-transparent" />

                {/* NOW STACK */}
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={current?.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative"
                    >
                        <div className="absolute -left-1 top-10 w-3 h-3 rounded-full bg-rose-500 z-10 border-2 border-background shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                        <Card className="bg-neutral-950 border-rose-500/30 overflow-hidden shadow-2xl ml-8 relative">
                            {/* Intro backdrop layer */}
                            {currentPoster && (
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                    <img src={currentPoster} className="w-full h-full object-cover blur-3xl scale-110" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                                </div>
                            )}

                            <div className="p-6 lg:p-8 space-y-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Badge className="bg-rose-500 text-white font-black px-3 py-0.5 text-[10px] tracking-widest border-none mb-2 animate-pulse">
                                            LIVE NOW
                                        </Badge>
                                        <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-tight">
                                            {current?.act?.name || "End of Show"}
                                        </h2>
                                        <div className="flex items-center gap-4 text-neutral-400 font-bold">
                                            <div className="flex items-center gap-2">
                                                <Timer size={18} className="text-primary" />
                                                <span className="text-sm">{current?.act?.durationMinutes || current?.act?.duration_minutes || 0}m Duration</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-l border-neutral-800 pl-4">
                                                <Users size={18} className="text-primary" />
                                                <span className="text-sm">{current?.act?.act_participants?.length || 0} Performers</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Scheduled</p>
                                        <p className="text-2xl font-black text-neutral-200">
                                            {formatSafeTime(current?.scheduledStartTime)}
                                        </p>
                                    </div>
                                </div>

                                {/* Director's Notes */}
                                {current?.act?.notes && (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                        <div className="text-xs text-amber-200/80">
                                            <p className="font-bold text-amber-500 uppercase text-[9px] tracking-widest mb-1">Director's Notes</p>
                                            {current.act.notes}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        {current?.act?.act_participants?.map((ap: any) => (
                                            <Badge key={ap.participantId || ap.id} variant="outline" className="bg-neutral-800 border-neutral-700 text-neutral-300 font-bold text-[10px]">
                                                {ap.firstName} {ap.lastName}
                                            </Badge>
                                        ))}
                                    </div>
                                    {backgroundSourceBadge ? (
                                        <div className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${backgroundSourceBadge.className}`}>
                                            {backgroundSourceBadge.label}
                                        </div>
                                    ) : null}
                                    {isReadOnly ? (
                                        <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                            View Only
                                        </div>
                                    ) : null}
                                {isIntroReady && (
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={handlePlayIntro}
                                            disabled={isLoadingIntro}
                                            className="min-h-11 rounded-full bg-rose-500/20 px-4 text-[10px] font-black tracking-[0.2em] text-rose-500 hover:bg-rose-500/30 hover:text-rose-400"
                                        >
                                            <div className="flex items-center gap-2">
                                                <MonitorPlay size={14} /> {isLoadingIntro ? 'LOADING INTRO' : 'PLAY INTRO'}
                                            </div>
                                        </Button>
                                    )}
                                    {!isIntroReady && current?.act?.id ? (
                                        <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                            Intro Pending Approval
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="bg-neutral-800/50 border-t border-neutral-800 p-4 lg:p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <div className="flex gap-2 w-full sm:w-auto">
                                    {status === 'Active' ? (
                                        <Button onClick={actions.pauseShow} disabled={isStageActionPending || isReadOnly} variant="outline" className="flex-1 sm:flex-none h-11 border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-bold gap-2">
                                            <Pause size={18} fill="currentColor" /> {isStageActionPending ? 'PAUSING...' : 'PAUSE'}
                                        </Button>
                                    ) : (
                                        <Button onClick={actions.resumeShow} disabled={isStageActionPending || isReadOnly} className="flex-1 sm:flex-none h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                                            <Play size={18} fill="currentColor" /> {isReadOnly ? 'VIEW ONLY' : isStageActionPending ? 'RESUMING...' : 'RESUME'}
                                        </Button>
                                    )}
                                    <Button onClick={actions.resetShow} disabled={isStageActionPending || isReadOnly} variant="outline" className="h-11 border-neutral-700 text-neutral-500 hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10 font-bold">
                                        <Square size={18} fill="currentColor" />
                                    </Button>
                                </div>
                                <Button
                                    onClick={actions.nextPerformance}
                                    disabled={isStageActionPending || isReadOnly}
                                    className="w-full sm:w-auto min-h-[56px] rounded-xl bg-primary px-8 text-lg font-black text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 gap-2"
                                >
                                    <SkipForward size={24} fill="currentColor" /> {isReadOnly ? 'VIEW ONLY' : isStageActionPending ? 'ADVANCING...' : 'NEXT PERFORMANCE'}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>

                {/* NEXT STACK */}
                <div className="relative">
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/40 z-10 border-2 border-background" />
                    <Card className="ml-8 p-5 border-primary/20 bg-primary/[0.02] border-l-4 border-l-primary shadow-sm">
                        {next ? (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] font-black tracking-widest border-primary/30 text-primary hover:bg-transparent uppercase">Next Up</Badge>
                                        <span className="text-xs text-muted-foreground font-bold">{formatSafeTime(next?.scheduledStartTime)}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-foreground">{next.act.name}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold">
                                        <div className="flex items-center gap-1"><Timer size={14} /> {next.act.durationMinutes || next.act.duration_minutes || 0}m</div>
                                        <div className="flex items-center gap-1 border-l border-border pl-3"><Clock size={14} /> {next.act.setupTimeMinutes || next.act.setup_time_minutes || 0}m Setup</div>
                                        {next.act.arrivalStatus === 'Ready' && (
                                            <div className="flex items-center gap-1 text-emerald-600 border-l border-border pl-3">
                                                <CheckCircle2 size={12} /> READY
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full sm:w-64 pt-4 sm:pt-0 sm:border-l sm:border-border sm:pl-6 space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Operational Status</p>
                                    <StatusPicker
                                        currentStatus={next.act.arrivalStatus}
                                        onStatusChange={(status) => updateStatus({ actId: next.act.id, status })}
                                        isLoading={isPending}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 text-center text-muted-foreground font-bold italic opacity-40">Finishing Stage Lineup</div>
                        )}
                    </Card>
                </div>

                {/* UPCOMING STACK */}
                <div className="relative opacity-60 hover:opacity-100 transition-opacity">
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-muted-foreground/20 z-10 border-2 border-background" />
                    <div className="ml-8 p-4 bg-muted/20 border border-muted-foreground/10 rounded-xl border-dashed">
                        {upcoming ? (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-background rounded-lg text-muted-foreground border border-border">
                                        <Users size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-muted-foreground">{upcoming.act.name}</h4>
                                        <p className="text-[10px] text-muted-foreground/70 font-medium">Coming after {next?.act?.name || "next act"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-muted-foreground/50">{formatSafeTime(upcoming?.scheduledStartTime)}</span>
                                    <ChevronRight size={14} className="text-muted-foreground/30" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">End of Lineup</div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showIntro && playableIntro && (
                        <Suspense
                            fallback={
                                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
                                    <MonitorPlay className="h-8 w-8 animate-pulse text-white" />
                                </div>
                            }
                        >
                            <IntroVideoPlayer 
                                composition={playableIntro.composition}
                                actName={playableIntro.actName}
                                participants={playableIntro.participants}
                                onClose={() => {
                                    setShowIntro(false);
                                    setPlayableIntro(null);
                                }}
                            />
                        </Suspense>
                    )}
                </AnimatePresence>
            </div>

            <div className="rounded-[1.25rem] border border-border/60 bg-card/50 p-3">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Live Status</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                    <ConsoleSignal
                        label="Pace"
                        value={isOvertime ? `+${overtimeMinutes}m` : driftMinutes > 5 ? `+${driftMinutes}m` : 'On Track'}
                        tone={isOvertime ? 'risk' : driftMinutes > 5 ? 'warning' : 'good'}
                        icon={isOvertime || driftMinutes > 5 ? AlertCircle : CheckCircle2}
                    />
                    <ConsoleSignal
                        label="Network"
                        value={isOnline ? 'Live' : 'Offline'}
                        tone={isOnline ? 'good' : 'risk'}
                        icon={isOnline ? Wifi : WifiOff}
                    />
                    <ConsoleSignal
                        label="Time"
                        value={formatNowInEventTime()}
                        tone="default"
                        icon={Clock}
                    />
                </div>
            </div>
        </div>
    );
}

function ConsoleSignal({ label, value, tone, icon: Icon }: any) {
    const toneClasses = tone === 'good'
        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
        : tone === 'warning'
            ? 'border-amber-500/20 bg-amber-500/5 text-amber-300'
            : tone === 'risk'
                ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                : 'border-border/50 bg-background/40 text-foreground';

    return (
        <div className={`rounded-xl border px-2.5 py-2.5 ${toneClasses}`}>
            <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-black/10 p-1.5">
                    <Icon size={14} />
                </div>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-[11px] font-black tracking-tight sm:text-sm">{value}</p>
        </div>
    );
}
