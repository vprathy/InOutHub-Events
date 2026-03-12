import { useState, useEffect, useMemo } from 'react';
import { ListOrdered, Plus, LayoutGrid, Calendar, Timer, Clock as ClockIcon, Sparkles, AlertTriangle } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useStagesQuery } from '@/hooks/useStages';
import {
    useLineupQuery,
    useAddLineupItem,
    useRemoveLineupItem,
    useUpdateLineupOrder,
    useAllEventLineupQuery
} from '@/hooks/useLineup';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LineupItemCard } from '@/components/lineup/LineupItemCard';
import { AddActToLineupModal } from '@/components/lineup/AddActToLineupModal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { scanLineup } from '@/lib/optimizer';
import { Reorder, AnimatePresence } from 'framer-motion';

export default function LineupPage() {
    const { eventId } = useSelection();
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: stages, isLoading: isLoadingStages } = useStagesQuery(eventId || '');
    const { data: lineup, isLoading: isLoadingLineup } = useLineupQuery(selectedStageId);
    const { data: allEventLineup } = useAllEventLineupQuery(eventId || '');

    const addLineupItem = useAddLineupItem();
    const updateLineupOrder = useUpdateLineupOrder();
    const removeLineupItem = useRemoveLineupItem();

    const [showReview, setShowReview] = useState(false);
    const [localItems, setLocalItems] = useState(lineup || []);

    // Sync local items when lineup data changes
    useEffect(() => {
        if (lineup) {
            setLocalItems(lineup);
        }
    }, [lineup]);

    const insights = useMemo(() => {
        if (!lineup) return [];
        return scanLineup(lineup, allEventLineup);
    }, [lineup, allEventLineup]);

    const criticalRisks = insights.filter(i => i.level === 'high' || i.level === 'critical').length;

    const totalDuration = useMemo(() =>
        lineup?.reduce((acc, slot) =>
            acc + (slot.act.durationMinutes || 0) + (slot.act.setupTimeMinutes || 0), 0
        ) || 0,
        [lineup]);

    const estimatedEndTime = new Date();
    estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + totalDuration);

    // Auto-select first stage if none selected
    useEffect(() => {
        if (!selectedStageId && stages && stages.length > 0) {
            setSelectedStageId(stages[0].id);
        }
    }, [stages, selectedStageId]);

    const handleReorder = async (newItems: typeof localItems) => {
        setLocalItems(newItems);
        if (!selectedStageId) return;

        // Calculate new sort orders (incremental by 10)
        const updates = newItems.map((item, index) => ({
            id: item.id,
            sortOrder: (index + 1) * 10
        }));

        try {
            await updateLineupOrder.mutateAsync({
                items: updates
            });
        } catch (error) {
            console.error('Failed to update lineup order:', error);
            // Revert on failure
            setLocalItems(lineup || []);
        }
    };

    const handleAddAct = async (actId: string) => {
        if (!selectedStageId) return;

        const nextOrder = lineup && lineup.length > 0
            ? Math.max(...lineup.map(item => item.sortOrder)) + 10
            : 10;

        await addLineupItem.mutateAsync({
            stageId: selectedStageId,
            actId,
            sortOrder: nextOrder
        });

        setIsAddModalOpen(false);
    };

    if (!eventId) {
        return (
            <EmptyState
                title="No Event Selected"
                description="Please select an event to manage its lineup."
                icon={Calendar}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Show Flow</h1>
                    <p className="text-muted-foreground">Schedule and organize performances across stages.</p>
                </div>

                <div className="flex items-center gap-2">
                    {lineup && lineup.length > 0 && (
                        <Button
                            variant={showReview ? "default" : "outline"}
                            onClick={() => setShowReview(!showReview)}
                            className={`h-11 gap-2 ${showReview ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                        >
                            <Sparkles size={18} className={showReview ? 'animate-pulse' : ''} />
                            {showReview ? 'Hide Analysis' : 'Review Flow'}
                            {criticalRisks > 0 && !showReview && (
                                <Badge className="ml-1 bg-amber-600 px-1.5 py-0 min-w-[1.25rem] h-5">{criticalRisks}</Badge>
                            )}
                        </Button>
                    )}
                    {selectedStageId && (
                        <Button onClick={() => setIsAddModalOpen(true)} className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 self-start md:self-auto px-6">
                            <Plus size={18} /> Add Performance
                        </Button>
                    )}
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
                            className={`h-11 ${selectedStageId === stage.id ? '' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={16} className="mr-2" />
                            {stage.name}
                        </Button>
                    ))
                )}
            </div>

            {/* Program Duration Dashboard */}
            {lineup && lineup.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="p-4 bg-primary/5 border-primary/10 flex items-center space-x-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Timer size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Total Stage Duration</p>
                            <h2 className="text-2xl font-black text-primary">{totalDuration} <span className="text-sm font-medium">mins</span></h2>
                        </div>
                    </Card>
                    <Card className="p-4 bg-muted/30 border-border/50 flex items-center space-x-4">
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground">
                            <ClockIcon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated End Time</p>
                            <h2 className="text-2xl font-black text-foreground">
                                {estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </h2>
                        </div>
                    </Card>
                    {criticalRisks > 0 && (
                        <Card className="p-4 bg-rose-500/5 border-rose-500/20 flex items-center space-x-4">
                            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Critical Conflicts</p>
                                <h2 className="text-2xl font-black text-rose-600">{criticalRisks} <span className="text-sm font-medium">High Alert</span></h2>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Lineup List */}
            <div className="space-y-3">
                {selectedStageId ? (
                    isLoadingLineup ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl border border-border" />
                            ))}
                        </div>
                    ) : localItems.length > 0 ? (
                        <Reorder.Group
                            axis="y"
                            values={localItems}
                            onReorder={handleReorder}
                            className="space-y-3"
                        >
                            <AnimatePresence mode="popLayout">
                                {localItems.map((slot) => {
                                    const risk = showReview ? insights.find(i => i.affectedSlotIds.includes(slot.id)) : undefined;
                                    return (
                                        <Reorder.Item
                                            key={slot.id}
                                            value={slot}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="cursor-default"
                                        >
                                            <LineupItemCard
                                                slot={slot}
                                                risk={risk}
                                                onRemove={() => removeLineupItem.mutate({ id: slot.id, stageId: selectedStageId })}
                                            />
                                        </Reorder.Item>
                                    );
                                })}
                            </AnimatePresence>
                        </Reorder.Group>
                    ) : (
                        <Card className="p-12 border-dashed border-border bg-transparent flex flex-col items-center justify-center text-center">
                            <ListOrdered size={48} className="text-muted-foreground/30 mb-4" />
                            <h3 className="text-xl font-semibold text-foreground">No performances scheduled</h3>
                            <p className="text-muted-foreground max-w-xs mt-2">
                                This stage doesn't have any performances in its flow yet.
                            </p>
                            <Button
                                variant="outline"
                                className="mt-6 border-border hover:bg-accent"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <Plus size={18} className="mr-2" /> Add the first performance
                            </Button>
                        </Card>
                    )
                ) : (
                    <EmptyState
                        title="No Stage Selected"
                        description="Select a stage above to view its scheduled items."
                        icon={LayoutGrid}
                    />
                )}
            </div>

            <AddActToLineupModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddAct}
                eventId={eventId}
            />
        </div>
    );
}
