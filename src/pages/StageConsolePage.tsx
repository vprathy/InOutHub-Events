import { MonitorPlay, LayoutGrid, Loader2, ShieldAlert } from 'lucide-react';
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
import { PageHeader } from '@/components/layout/PageHeader';
import { OperationalEmptyResponse, OperationalResponseCard } from '@/components/ui/OperationalCards';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';

const getStageConsoleStorageKey = (eventId: string | null) => eventId ? `stage-console:selected-stage:${eventId}` : null;

export default function StageConsolePage() {
    const { eventId } = useSelection();
    const capabilities = useEventCapabilities(eventId || null, null);
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
            <PageHeader
                title="Live Console"
                subtitle="Run the show, keep the next cue visible, and protect the live position."
                status={criticalRisks > 0 ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 animate-in fade-in slide-in-from-top-2">
                        <ShieldAlert size={16} className="text-rose-600" />
                        <span className="text-sm font-bold">{criticalRisks} Operational {criticalRisks === 1 ? 'Risk' : 'Risks'} Detected</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-[10px] uppercase font-black px-3 hover:bg-rose-100 text-rose-800"
                            onClick={() => navigate('/show-flow')}
                        >
                            Fix in Show Flow
                        </Button>
                    </div>
                ) : null}
            />

            {selectedStageId && !isLoading && currentLineupPointerMissing ? (
                <OperationalResponseCard
                    label="Lineup Out of Sync"
                    detail="The saved live pointer no longer matched the show order. The console recovered so the stage lead can keep moving."
                    tone="critical"
                    action="Review show flow"
                    onClick={() => navigate('/show-flow')}
                />
            ) : hasRecoveredCurrent ? (
                <OperationalResponseCard
                    label="Recovered Live Position"
                    detail="The console restored the current act after a refresh or reconnect."
                    tone="info"
                />
            ) : (
                <OperationalEmptyResponse
                    title="Console Ready"
                    detail="Current act, next cue, and safe controls are the only things that should compete for attention here."
                />
            )}

            {!capabilities.canOperateStage ? (
                <div className="surface-panel rounded-[1.2rem] border border-amber-500/20 bg-amber-500/5 p-3.5 text-sm font-medium text-amber-700">
                    Console controls are view-only for your current access level. StageManager or EventAdmin is required to drive live state.
                </div>
            ) : null}

            <div className="surface-panel surface-section-console space-y-3 rounded-[1.35rem] p-3">
                <div className="px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Stages</p>
                    <p className="text-sm font-semibold text-foreground">Pick the stage you are actively calling.</p>
                </div>
                <div className="flex flex-wrap gap-2">
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
            </div>

            {selectedStageId && !isLoading && !hasLineup ? (
                <EmptyState
                    title="No Lineup Loaded"
                    description="This stage has no scheduled performances yet. Add acts in Show Flow before using the console."
                    icon={MonitorPlay}
                    action={{
                        label: 'Open Show Flow',
                        onClick: () => navigate('/show-flow'),
                    }}
                />
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
                    isReadOnly={!capabilities.canOperateStage}
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
