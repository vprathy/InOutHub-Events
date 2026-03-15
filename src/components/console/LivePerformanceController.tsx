import { Play, SkipForward, Pause, Square, Users, Clock, Timer, AlertCircle, CheckCircle2, ChevronRight, Activity, Wifi, WifiOff, MonitorPlay } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusPicker } from '@/components/acts/StatusPicker';
import { useUpdateActStatus } from '@/hooks/useActs';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { IntroVideoPlayer } from './IntroVideoPlayer';
import type { IntroComposition } from '@/types/domain';
import { getPlayableIntro } from '@/lib/introCapabilities';

interface LivePerformanceControllerProps {
    current: any;
    next: any;
    upcoming: any;
    status: string;
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
}

const formatSafeTime = (dateString: string | null | undefined) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    driftMinutes, isOvertime, overtimeMinutes,
    actions
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
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
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
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-12 py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    START SHOW
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* System Status & Pace Dashboard */}
            <div className="flex justify-between items-center bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Live Execution Pace</p>
                        <h4 className="text-sm font-bold flex items-center gap-2">
                            {isOvertime ? (
                                <span className="text-rose-600 flex items-center">
                                    <AlertCircle size={14} className="mr-1" /> RUNNING OVER (+{overtimeMinutes}m)
                                </span>
                            ) : driftMinutes > 5 ? (
                                <span className="text-amber-600 flex items-center">
                                    <Clock size={14} className="mr-1" /> DELAYED (+{driftMinutes}m)
                                </span>
                            ) : (
                                <span className="text-emerald-600 flex items-center">
                                    <CheckCircle2 size={14} className="mr-1" /> ON TRACK
                                </span>
                            )}
                        </h4>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right flex items-center gap-3 pr-6 border-r border-border">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">System Status</p>
                            <p className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                                {isOnline ? 'Live Network' : 'Offline Mode'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Current Time</p>
                        <p className="text-lg font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>

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
                                    {isIntroReady && (
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={handlePlayIntro}
                                            disabled={isLoadingIntro}
                                            className="h-8 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 hover:text-rose-400 font-black text-[10px] tracking-[0.2em] rounded-full px-4 gap-2 flex flex-col items-center justify-center leading-none"
                                        >
                                            <div className="flex items-center gap-2">
                                                <MonitorPlay size={14} /> {isLoadingIntro ? 'LOADING INTRO' : 'PLAY INTRO'}
                                            </div>
                                            <span className="text-[8px] opacity-40 font-black uppercase tracking-widest mt-0.5">Step 4: Play</span>
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
                                        <Button onClick={actions.pauseShow} variant="outline" className="flex-1 sm:flex-none h-11 border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-bold gap-2">
                                            <Pause size={18} fill="currentColor" /> PAUSE
                                        </Button>
                                    ) : (
                                        <Button onClick={actions.resumeShow} className="flex-1 sm:flex-none h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                                            <Play size={18} fill="currentColor" /> RESUME
                                        </Button>
                                    )}
                                    <Button onClick={actions.resetShow} variant="outline" className="h-11 border-neutral-700 text-neutral-500 hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10 font-bold">
                                        <Square size={18} fill="currentColor" />
                                    </Button>
                                </div>
                                <Button
                                    onClick={actions.nextPerformance}
                                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-2 px-8 py-6 text-lg rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                                >
                                    <SkipForward size={24} fill="currentColor" /> NEXT PERFORMANCE
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
                        <IntroVideoPlayer 
                            composition={playableIntro.composition}
                            actName={playableIntro.actName}
                            participants={playableIntro.participants}
                            onClose={() => {
                                setShowIntro(false);
                                setPlayableIntro(null);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
