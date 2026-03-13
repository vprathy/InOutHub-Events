import { useState } from 'react';
import type { ActWithCounts } from '@/types/domain';
import { ActIndicators } from '@/components/acts/ActIndicators';
import { Clock, Info, ExternalLink, UserPlus, Music, CheckCircle2, Sparkles, Loader2, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AddParticipantToActModal } from './AddParticipantToActModal';
import { UploadActAssetModal } from './UploadActAssetModal';
import { useUpdateActStatus } from '@/hooks/useActs';
import { supabase } from '@/lib/supabase';
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [playableIntro, setPlayableIntro] = useState<{
        composition: IntroComposition;
        actName: string;
        participants: any[];
    } | null>(null);
    const updateStatus = useUpdateActStatus();

    const isReady = act.arrivalStatus === 'Ready';

    const handleToggleReady = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateStatus.mutate({
            actId: act.id,
            status: isReady ? 'Arrived' : 'Ready'
        });
    };

    const handleGenerateAI = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isGenerating) return;

        setIsGenerating(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-act-assets', {
                body: { actId: act.id, mode: 'Manual' },
                headers: {
                    'x-inouthub-trust': 'inouthub-internal-2026-v16'
                }
            });

            if (error) throw error;
            console.log('[PWA] AI Generation initiated:', data);
        } catch (err) {
            console.error('[PWA] AI Generation failed:', err);
        } finally {
            setIsGenerating(false);
        }
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
            className={`bg-card border rounded-[2rem] p-6 shadow-sm transition-all hover:border-primary/40 flex flex-col space-y-4 cursor-pointer group relative overflow-hidden ${isReady ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border'
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
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors truncate">{act.name}</h3>
                        <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground font-black uppercase tracking-widest">
                        <div className="flex items-center space-x-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>{act.durationMinutes}m</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <Info className="w-4 h-4 text-primary" />
                            <span>{act.setupTimeMinutes}m Setup</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end space-y-3">
                    <ActIndicators
                        participantCount={act.participantCount}
                        hasMusicTrack={act.hasMusicTrack}
                        hasTechnicalRider={act.hasTechnicalRider}
                        missingAssetCount={act.missingAssetCount}
                        specialRequestCount={act.specialRequestCount}
                    />

                    {/* Stage Ready Toggle (Tactical) */}
                    <button
                        onClick={handleToggleReady}
                        disabled={updateStatus.isPending}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${isReady
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-secondary text-muted-foreground border-border/50 hover:border-emerald-500/50 hover:text-emerald-600'
                            }`}
                    >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isReady ? 'animate-pulse' : ''}`} />
                        <span>{isReady ? 'Stage Ready' : 'Mark Ready'}</span>
                    </button>
                </div>
            </div>

            {act.hasApprovedIntro ? (
                <div className="relative z-10 rounded-[1.6rem] border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Signature Intro</p>
                            <h4 className="text-lg font-black tracking-tight text-foreground">Preview directly from the performance card</h4>
                            <p className="text-xs font-medium text-muted-foreground">Run the approved intro here without opening the workspace first.</p>
                        </div>
                        <Button
                            onClick={handlePlayIntro}
                            disabled={isPreviewLoading}
                            className="h-11 rounded-2xl bg-primary px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                        >
                            {isPreviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MonitorPlay className="mr-2 h-4 w-4" />}
                            {isPreviewLoading ? 'Loading Intro' : 'Play AI Intro'}
                        </Button>
                    </div>
                    {previewError ? (
                        <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm font-medium text-rose-700">
                            {previewError}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {/* Tactical Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-11 lg:h-10 rounded-2xl border-border/50 hover:border-primary/50 bg-muted/20 text-[10px] font-black uppercase tracking-widest shadow-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAddParticipantOpen(true);
                    }}
                >
                    <UserPlus className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span className="truncate">Add Performer</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={`h-11 lg:h-10 rounded-2xl border-border/50 hover:border-primary/50 bg-muted/20 text-[10px] font-black uppercase tracking-widest shadow-sm ${!act.hasMusicTrack ? 'border-rose-500/30 text-rose-600 bg-rose-500/5' : ''
                        }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsUploadOpen(true);
                    }}
                >
                    <Music className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span className="truncate">Music/Tech</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-11 lg:h-10 rounded-2xl border-primary/20 hover:border-primary bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest shadow-sm shadow-primary/5 col-span-2 lg:col-span-1"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-primary" />
                    ) : (
                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                    )}
                    AI Intro Kit
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
