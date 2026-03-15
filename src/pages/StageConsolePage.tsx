import { MonitorPlay, LayoutGrid, Loader2, ShieldAlert, RefreshCw, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSelection } from '@/context/SelectionContext';
import { useStagesQuery } from '@/hooks/useStages';
import { useStageConsole } from '@/hooks/useStageConsole';
import { LivePerformanceController } from '@/components/console/LivePerformanceController';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLineupQuery } from '@/hooks/useLineup';
import { scanLineup } from '@/lib/optimizer';
import { useNavigate } from 'react-router-dom';

const getStageConsoleStorageKey = (eventId: string | null) => eventId ? `stage-console:selected-stage:${eventId}` : null;

export default function StageConsolePage() {
    const { eventId } = useSelection();
    const navigate = useNavigate();
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    const { data: stages, isLoading: isLoadingStages } = useStagesQuery(eventId || '');
    const {
        stageState,
        current,
        next,
        upcoming,
        hasLineup,
        hasRecoveredCurrent,
        currentLineupPointerMissing,
        driftMinutes,
        isOvertime,
        overtimeMinutes,
        isLoading,
        isStageActionPending,
        actions
    } = useStageConsole(selectedStageId);

    const { data: lineup } = useLineupQuery(selectedStageId);
    const insights = lineup ? scanLineup(lineup) : [];
    const criticalRisks = insights.filter(i => i.level === 'high' || i.level === 'critical').length;

    // Restore stage selection when returning to the console for the same event.
    useEffect(() => {
        if (!stages || stages.length === 0) return;

        const storageKey = getStageConsoleStorageKey(eventId);
        const savedStageId = storageKey ? window.localStorage.getItem(storageKey) : null;
        const hasSavedStage = Boolean(savedStageId && stages.some((stage) => stage.id === savedStageId));

        if (!selectedStageId) {
            setSelectedStageId(hasSavedStage ? savedStageId! : stages[0].id);
            return;
        }

        if (!stages.some((stage) => stage.id === selectedStageId)) {
            setSelectedStageId(hasSavedStage ? savedStageId! : stages[0].id);
        }
    }, [eventId, stages, selectedStageId]);

    useEffect(() => {
        const storageKey = getStageConsoleStorageKey(eventId);
        if (!storageKey || !selectedStageId) return;
        window.localStorage.setItem(storageKey, selectedStageId);
    }, [eventId, selectedStageId]);

    if (!eventId) {
        return (
            <EmptyState
                title="No Event Selected"
                description="Please select an event to access the Live Console."
                icon={MonitorPlay}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Live Console</h1>
                    <p className="text-muted-foreground">Real-time show execution and stage control.</p>
                </div>

                {criticalRisks > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 animate-in fade-in slide-in-from-top-2">
                        <ShieldAlert size={16} className="text-rose-600" />
                        <span className="text-sm font-bold">{criticalRisks} Operational {criticalRisks === 1 ? 'Risk' : 'Risks'} Detected</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-[10px] uppercase font-black px-3 hover:bg-rose-100 text-rose-800"
                            onClick={() => navigate('/lineup')}
                        >
                            Fix in Lineup
                        </Button>
                    </div>
                )}
            </div>

            {/* Stage Selector */}
            <div className="flex flex-wrap gap-2 pb-2">
                {isLoadingStages ? (
                    <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
                ) : (
                    stages?.map(stage => (
                        <Button
                            key={stage.id}
                            variant={selectedStageId === stage.id ? 'default' : 'outline'}
                            onClick={() => setSelectedStageId(stage.id)}
                            className={`h-11 rounded-xl px-4 text-sm font-bold ${selectedStageId === stage.id ? '' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={16} className="mr-2" />
                            {stage.name}
                        </Button>
                    ))
                )}
            </div>

            {selectedStageId && !isLoading && !hasLineup ? (
                <EmptyState
                    title="No Lineup Loaded"
                    description="This stage has no scheduled performances yet. Add acts in Show Flow before using the console."
                    icon={MonitorPlay}
                    action={{
                        label: 'Open Show Flow',
                        onClick: () => navigate('/lineup'),
                    }}
                />
            ) : null}

            {selectedStageId && !isLoading && hasRecoveredCurrent ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-800">
                    <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Recovered Live Position</p>
                        <p className="text-sm font-medium">The console restored the live run from the current lineup after a refresh or reconnect.</p>
                    </div>
                </div>
            ) : null}

            {selectedStageId && !isLoading && currentLineupPointerMissing ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-rose-800">
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Stage State Drift</p>
                        <p className="text-sm font-medium">The saved live pointer no longer matched the lineup. The console recovered to keep rehearsal moving.</p>
                    </div>
                </div>
            ) : null}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium">Initializing console...</p>
                </div>
            ) : selectedStageId && hasLineup ? (
                <LivePerformanceController
                    current={current}
                    next={next}
                    upcoming={upcoming}
                    status={stageState?.status || 'Idle'}
                    isStageActionPending={isStageActionPending}
                    driftMinutes={driftMinutes}
                    isOvertime={isOvertime}
                    overtimeMinutes={overtimeMinutes}
                    actions={actions}
                />
            ) : (
                <EmptyState
                    title="Stage Inactive"
                    description="Select a stage above to begin controlling the live show state and cues."
                    icon={MonitorPlay}
                />
            )}
        </div>
    );
}
