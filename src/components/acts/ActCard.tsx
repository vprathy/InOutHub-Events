import { useState } from 'react';
import type { ActWithCounts } from '@/types/domain';
import { ActIndicators } from '@/components/acts/ActIndicators';
import { Clock, Info, ExternalLink, UserPlus, Music, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AddParticipantToActModal } from './AddParticipantToActModal';
import { UploadActAssetModal } from './UploadActAssetModal';
import { useUpdateActStatus } from '@/hooks/useActs';
import { supabase } from '@/lib/supabase';

interface ActCardProps {
    act: ActWithCounts;
}

export function ActCard({ act }: ActCardProps) {
    const navigate = useNavigate();
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
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

    return (
        <div
            className={`bg-card border rounded-[2rem] p-6 shadow-sm transition-all hover:border-primary/40 flex flex-col space-y-4 cursor-pointer group relative overflow-hidden ${isReady ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border'
                }`}
            onClick={() => navigate(`/acts/${act.id}`)}
        >
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

            {/* Tactical Action Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
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
        </div>
    );
}
