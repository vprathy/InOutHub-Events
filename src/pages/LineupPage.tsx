import { useState, useEffect, useMemo } from 'react';
import { ListOrdered, Plus, LayoutGrid, Calendar, Timer, Clock as ClockIcon, Sparkles } from 'lucide-react';
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
import { Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import type { LineupSlot } from '@/types/domain';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatEventTime } from '@/lib/eventTime';

function SortableLineupItem({
    slot,
    orderIndex,
    risk,
    onRemove,
    onMoveToTop,
    lockedReason,
}: {
    slot: LineupSlot;
    orderIndex: number;
    risk?: ReturnType<typeof scanLineup>[number];
    onRemove: () => void;
    onMoveToTop: () => void;
    lockedReason?: string | null;
}) {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={slot}
            dragListener={false}
            dragControls={dragControls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="touch-pan-y"
        >
            <LineupItemCard
                slot={slot}
                orderIndex={orderIndex}
                risk={risk}
                onDragStart={(event) => dragControls.start(event)}
                onMoveToTop={onMoveToTop}
                lockedReason={lockedReason}
                onRemove={onRemove}
            />
        </Reorder.Item>
    );
}

export default function LineupPage() {
    const { eventId } = useSelection();
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: stages, isLoading: isLoadingStages } = useStagesQuery(eventId || '');
    const { data: lineup, isLoading: isLoadingLineup } = useLineupQuery(selectedStageId);
    const { data: allEventLineup } = useAllEventLineupQuery(eventId || '');
    const { data: stageState } = useQuery({
        queryKey: ['stage_state', selectedStageId],
        queryFn: async () => {
            if (!selectedStageId) return null;
            const { data, error } = await supabase
                .from('stage_state')
                .select('*')
                .eq('stage_id', selectedStageId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!selectedStageId,
    });

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
    const readyCount = lineup?.filter((slot) => slot.act.arrivalStatus === 'Ready').length || 0;
    const isLiveRun = stageState?.status === 'Active' || stageState?.status === 'Paused';
    const liveIndex = localItems.findIndex((item) => item.id === stageState?.current_lineup_item_id);

    const totalDuration = useMemo(() =>
        lineup?.reduce((acc, slot) =>
            acc + (slot.act.durationMinutes || 0) + (slot.act.setupTimeMinutes || 0), 0
        ) || 0,
        [lineup]);

    const coordinationLeadMinutes = 10;
    const reorderStartIndex = useMemo(() => {
        if (!isLiveRun) return 0;
        const futureStartIndex = liveIndex >= 0 ? liveIndex + 1 : 0;
        const now = Date.now();
        for (let index = futureStartIndex; index < localItems.length; index += 1) {
            const slot = localItems[index];
            const minutesUntil = Math.floor((new Date(slot.scheduledStartTime).getTime() - now) / 60000);
            const threshold = Math.max(coordinationLeadMinutes, slot.act.setupTimeMinutes || 0);
            if (minutesUntil > threshold) {
                return index;
            }
        }
        return localItems.length;
    }, [isLiveRun, liveIndex, localItems]);

    const lockedPrefixItems = useMemo(
        () => localItems.slice(0, reorderStartIndex),
        [localItems, reorderStartIndex],
    );
    const reorderableItems = useMemo(
        () => localItems.slice(reorderStartIndex),
        [localItems, reorderStartIndex],
    );

    const estimatedEndTime = new Date();
    estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + totalDuration);

    // Auto-select first stage if none selected
    useEffect(() => {
        if (!selectedStageId && stages && stages.length > 0) {
            setSelectedStageId(stages[0].id);
        }
    }, [stages, selectedStageId]);

    const persistReorder = async (reorderedSuffix: typeof localItems) => {
        const mergedItems = [...lockedPrefixItems, ...reorderedSuffix];
        setLocalItems(mergedItems);
        if (!selectedStageId) return;

        const updates = mergedItems.map((item, index) => ({
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

    const handleReorder = async (newItems: typeof localItems) => {
        await persistReorder(newItems);
    };

    const moveSlotToTop = async (slotId: string) => {
        const currentItems = [...reorderableItems];
        const sourceIndex = currentItems.findIndex((item) => item.id === slotId);
        if (sourceIndex <= 0) return;

        const [slot] = currentItems.splice(sourceIndex, 1);
        currentItems.unshift(slot);
        await persistReorder(currentItems);
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
            <PageHeader
                title="Show Flow"
                subtitle="Schedule and organize performances across stages."
                actions={
                    <div className="flex flex-col gap-2 sm:flex-row md:w-auto">
                        {lineup && lineup.length > 0 && (
                            <Button
                                variant={showReview ? "default" : "outline"}
                                onClick={() => setShowReview(!showReview)}
                                className={`h-11 w-full gap-2 sm:w-auto ${showReview ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                            >
                                <Sparkles size={18} className={showReview ? 'animate-pulse' : ''} />
                                {showReview ? 'Hide Analysis' : 'Review Flow'}
                                {criticalRisks > 0 && !showReview && (
                                    <Badge className="ml-1 bg-amber-600 px-1.5 py-0 min-w-[1.25rem] h-5">{criticalRisks}</Badge>
                                )}
                            </Button>
                        )}
                        {selectedStageId && (
                            <Button onClick={() => setIsAddModalOpen(true)} className="h-11 w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 self-start md:self-auto px-6 sm:w-auto">
                                <Plus size={18} /> Add Performance
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Stage Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {isLoadingStages ? (
                    <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
                ) : (
                    stages?.map(stage => (
                        <Button
                            key={stage.id}
                            variant={selectedStageId === stage.id ? 'default' : 'outline'}
                            onClick={() => setSelectedStageId(stage.id)}
                            className={`h-11 shrink-0 ${selectedStageId === stage.id ? '' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={16} className="mr-2" />
                            {stage.name}
                        </Button>
                    ))
                )}
            </div>

            {/* Program Duration Dashboard */}
            {lineup && lineup.length > 0 && (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <Card className="p-4 bg-card/60 border-border/50 flex items-center space-x-3 min-h-[110px]">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <ListOrdered size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scheduled Acts</p>
                            <h2 className="text-xl sm:text-2xl font-black text-foreground">{lineup.length}</h2>
                        </div>
                    </Card>
                    <Card className="p-4 bg-primary/5 border-primary/10 flex items-center space-x-3 min-h-[110px]">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Timer size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Total Stage Duration</p>
                            <h2 className="text-xl sm:text-2xl font-black text-primary">{totalDuration} <span className="text-sm font-medium">mins</span></h2>
                        </div>
                    </Card>
                    <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 flex items-center space-x-3 min-h-[110px]">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Ready To Run</p>
                            <h2 className="text-xl sm:text-2xl font-black text-emerald-600">{readyCount}</h2>
                        </div>
                    </Card>
                    <Card className={`p-4 border-border/50 flex items-center space-x-3 min-h-[110px] ${criticalRisks > 0 ? 'bg-rose-500/5 border-rose-500/20 col-span-2 xl:col-span-1' : 'bg-muted/30'}`}>
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground">
                            <ClockIcon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {criticalRisks > 0 ? 'Critical Conflicts' : 'Estimated End Time'}
                            </p>
                            <h2 className={`text-xl sm:text-2xl font-black ${criticalRisks > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                                {criticalRisks > 0 ? criticalRisks : formatEventTime(estimatedEndTime.toISOString(), undefined, true)}
                                {criticalRisks > 0 ? <span className="ml-2 text-sm font-medium">High Alert</span> : null}
                            </h2>
                        </div>
                    </Card>
                </div>
            )}

            {/* Lineup List */}
                <div className="space-y-3">
                    <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Stage Flow</p>
                            <h2 className="text-lg font-black tracking-tight text-foreground">
                                {stages?.find((stage) => stage.id === selectedStageId)?.name || 'Selected Stage'}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-muted-foreground">
                                {isLiveRun ? 'Only the future queue can be reordered while the show is live.' : 'Drag from the numbered handle to reorder this stage lineup.'}
                            </p>
                            {isLiveRun ? (
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                                    Acts within the next {coordinationLeadMinutes} minutes stay locked for backstage coordination.
                                </p>
                            ) : null}
                        </div>
                    </div>
                    {selectedStageId ? (
                        isLoadingLineup ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl border border-border" />
                            ))}
                        </div>
                    ) : localItems.length > 0 ? (
                        <div className="space-y-3">
                            {lockedPrefixItems.length > 0 ? (
                                <div className="space-y-3">
                                    {lockedPrefixItems.map((slot, index) => {
                                        const risk = showReview ? insights.find(i => i.affectedSlotIds.includes(slot.id)) : undefined;
                                        const isCurrent = isLiveRun && index === liveIndex;
                                        const lockedReason = isCurrent
                                            ? 'Live on stage now'
                                            : isLiveRun
                                                ? 'Locked for backstage coordination'
                                                : null;

                                        return (
                                            <LineupItemCard
                                                key={slot.id}
                                                slot={slot}
                                                orderIndex={index + 1}
                                                risk={risk}
                                                lockedReason={lockedReason}
                                                onRemove={() => removeLineupItem.mutate({ id: slot.id, stageId: selectedStageId })}
                                            />
                                        );
                                    })}
                                </div>
                            ) : null}

                            {reorderableItems.length > 0 ? (
                                <Reorder.Group
                                    axis="y"
                                    values={reorderableItems}
                                    onReorder={handleReorder}
                                    className="space-y-3"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {reorderableItems.map((slot) => {
                                            const risk = showReview ? insights.find(i => i.affectedSlotIds.includes(slot.id)) : undefined;
                                            const overallIndex = localItems.findIndex((item) => item.id === slot.id) + 1;
                                            return (
                                                <SortableLineupItem
                                                    key={slot.id}
                                                    slot={slot}
                                                    orderIndex={overallIndex}
                                                    risk={risk}
                                                    onMoveToTop={() => moveSlotToTop(slot.id)}
                                                    onRemove={() => removeLineupItem.mutate({ id: slot.id, stageId: selectedStageId })}
                                                />
                                            );
                                        })}
                                    </AnimatePresence>
                                </Reorder.Group>
                            ) : null}
                        </div>
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
