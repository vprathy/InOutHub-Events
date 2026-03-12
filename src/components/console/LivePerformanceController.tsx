import { Play, SkipForward, Pause, Square, Users, Clock, Timer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusPicker } from '@/components/acts/StatusPicker';
import { useUpdateActStatus } from '@/hooks/useActs';
import type { ActParticipantDetail } from '@/types/domain';

interface LivePerformanceControllerProps {
    current: any;
    next: any;
    upcoming: any;
    status: string;
    actions: {
        startShow: () => void;
        nextPerformance: () => void;
        pauseShow: () => void;
        resumeShow: () => void;
        resetShow: () => void;
    };
}

export function LivePerformanceController({ current, next, upcoming, status, actions }: LivePerformanceControllerProps) {
    const { mutate: updateStatus, isPending } = useUpdateActStatus();

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
        <div className="space-y-8">
            {/* Main Stage Area: NOW */}
            <div className="relative">
                <div className="absolute -top-3 left-6 z-10">
                    <Badge className="bg-rose-500 text-white font-black px-4 py-1 text-xs tracking-widest border-none shadow-lg animate-pulse">
                        LIVE NOW
                    </Badge>
                </div>
                <Card className="bg-neutral-900 border-rose-500/30 overflow-hidden shadow-2xl shadow-rose-500/10">
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h2 className="text-5xl font-black tracking-tighter text-white">
                                    {current?.act?.name || "No Active Performance"}
                                </h2>
                                <div className="flex items-center gap-4 text-neutral-400 font-bold mb-4">
                                    <div className="flex items-center gap-2">
                                        <Timer size={20} className="text-primary" />
                                        <span>{current?.act?.durationMinutes}m Duration</span>
                                    </div>
                                    <div className="flex items-center gap-2 border-l border-neutral-800 pl-4">
                                        <Users size={20} className="text-primary" />
                                        <span>{current?.act?.act_participants?.length || 0} Participants</span>
                                    </div>
                                </div>

                                {/* Participants List */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {current?.act?.act_participants?.map((ap: ActParticipantDetail) => (
                                        <Badge key={ap.participantId} variant="outline" className="bg-neutral-800 border-neutral-700 text-neutral-300 font-bold px-3 py-1">
                                            {ap.firstName} {ap.lastName}
                                        </Badge>
                                    ))}
                                    {(!current?.act?.act_participants || current.act.act_participants.length === 0) && (
                                        <span className="text-sm text-neutral-500 italic">No participants assigned</span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Scheduled Time</p>
                                <p className="text-3xl font-black text-neutral-200">
                                    {current?.scheduledStartTime ? new Date(current.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                </p>
                            </div>
                        </div>

                        {current?.act?.notes && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <div className="text-sm text-amber-200/80">
                                    <p className="font-bold text-amber-500 uppercase text-[10px] tracking-widest mb-1">Director's Notes</p>
                                    {current.act.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls Footer */}
                    <div className="bg-neutral-800/50 border-t border-neutral-800 p-6 flex items-center justify-between">
                        <div className="flex gap-4">
                            {status === 'Active' ? (
                                <Button
                                    onClick={actions.pauseShow}
                                    variant="outline"
                                    className="h-11 border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-bold gap-2 px-6"
                                >
                                    <Pause size={18} fill="currentColor" /> PAUSE
                                </Button>
                            ) : (
                                <Button
                                    onClick={actions.resumeShow}
                                    className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 px-6"
                                >
                                    <Play size={18} fill="currentColor" /> RESUME
                                </Button>
                            )}
                            <Button
                                onClick={actions.resetShow}
                                variant="outline"
                                className="h-11 border-neutral-700 text-neutral-500 hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10 font-bold gap-2"
                            >
                                <Square size={18} fill="currentColor" /> RESET
                            </Button>
                        </div>

                        <Button
                            onClick={actions.nextPerformance}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-2 px-10 py-6 text-lg rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <SkipForward size={24} fill="currentColor" /> NEXT PERFORMANCE
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Next and Upcoming */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NEXT */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                        <SkipForward size={12} className="text-primary" /> NEXT ON STAGE
                    </p>
                    <Card className="p-6 border-primary/20 bg-primary/[0.02] transition-colors hover:bg-primary/[0.04]">
                        {next ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black text-foreground">{next.act.name}</h3>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-bold">
                                            <div className="flex items-center gap-1">
                                                <Timer size={14} />
                                                <span>{next.act.durationMinutes}m</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{next.act.setupTimeMinutes}m Setup</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <Badge variant="outline" className="font-black text-[10px]">
                                            {new Date(next.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Badge>
                                        {next.act.arrivalStatus === 'Ready' && (
                                            <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 size={12} /> Ready
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Operational Status Workflow for Next Act */}
                                <div className="mt-6 pt-4 border-t border-primary/10">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Update Stage Status</p>
                                    <StatusPicker
                                        currentStatus={next.act.arrivalStatus}
                                        onStatusChange={(status) => updateStatus({ actId: next.act.id, status })}
                                        isLoading={isPending}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-muted-foreground font-bold italic py-2">Finishing Lineup...</div>
                        )}
                    </Card>
                </div>

                {/* UPCOMING */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">UPCOMING</p>
                    <Card className="p-6 bg-muted/30 border-dashed border-border group">
                        {upcoming ? (
                            <div className="flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">{upcoming.act.name}</h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">
                                        Estimated start: {new Date(upcoming.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="p-2 rounded-full bg-muted text-muted-foreground">
                                    <Users size={20} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground font-bold italic py-2 opacity-40">No further performances scheduled</div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
