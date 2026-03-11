import { MonitorPlay, LayoutGrid, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSelection } from '@/context/SelectionContext';
import { useStagesQuery } from '@/hooks/useStages';
import { useStageConsole } from '@/hooks/useStageConsole';
import { LivePerformanceController } from '@/components/console/LivePerformanceController';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function StageConsolePage() {
    const { eventId } = useSelection();
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    const { data: stages, isLoading: isLoadingStages } = useStagesQuery(eventId || '');
    const {
        stageState,
        current,
        next,
        upcoming,
        isLoading,
        actions
    } = useStageConsole(selectedStageId);

    // Auto-select first stage if none selected
    useEffect(() => {
        if (!selectedStageId && stages && stages.length > 0) {
            setSelectedStageId(stages[0].id);
        }
    }, [stages, selectedStageId]);

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
                            className={selectedStageId === stage.id ? '' : 'border-border text-muted-foreground hover:text-foreground'}
                        >
                            <LayoutGrid size={16} className="mr-2" />
                            {stage.name}
                        </Button>
                    ))
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium">Initializing console...</p>
                </div>
            ) : selectedStageId ? (
                <LivePerformanceController
                    current={current}
                    next={next}
                    upcoming={upcoming}
                    status={stageState?.status || 'Idle'}
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
