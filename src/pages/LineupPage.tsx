import { useState, useEffect, useMemo } from 'react';
import { ListOrdered, Plus, LayoutGrid, Calendar, Sparkles, Loader2, PencilLine } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useCreateStage, useStagesQuery, useUpdateStage } from '@/hooks/useStages';
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
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard } from '@/components/ui/OperationalCards';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';
import { InlineInfoTip } from '@/components/ui/InlineInfoTip';

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
    onRemove?: () => void;
    onMoveToTop?: () => void;
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
    const capabilities = useEventCapabilities(eventId || null, null);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [stageDrafts, setStageDrafts] = useState<Record<string, string>>({});
    const [stageError, setStageError] = useState<string | null>(null);

    const { data: stages, isLoading: isLoadingStages } = useStagesQuery(eventId || '');
    const createStage = useCreateStage();
    const updateStage = useUpdateStage();
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
    const selectedStage = stages?.find((stage) => stage.id === selectedStageId) || null;
    const stageStatusLabel = !selectedStageId
        ? 'No stage selected'
        : stageState?.status === 'Active'
            ? 'Live now'
            : stageState?.status === 'Paused'
                ? 'Paused'
                : 'Planning';
    const stageStatusToneClass = !selectedStageId
        ? 'text-muted-foreground border-border/60 bg-background/60'
        : stageState?.status === 'Active'
            ? 'text-emerald-700 border-emerald-500/20 bg-emerald-500/10 dark:text-emerald-300'
            : stageState?.status === 'Paused'
                ? 'text-orange-700 border-orange-500/20 bg-orange-500/10 dark:text-orange-300'
                : 'text-sky-700 border-sky-500/20 bg-sky-500/10 dark:text-sky-300';

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

    useEffect(() => {
        if (!stages) return;
        setStageDrafts(
            stages.reduce<Record<string, string>>((acc, stage) => {
                acc[stage.id] = stage.name;
                return acc;
            }, {}),
        );
    }, [stages]);

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

    const handleCreateStage = async () => {
        if (!eventId) return;
        const trimmedName = newStageName.trim();
        if (!trimmedName) {
            setStageError('Enter a stage name before saving.');
            return;
        }

        setStageError(null);

        try {
            const stage = await createStage.mutateAsync({
                eventId,
                name: trimmedName,
            });
            setSelectedStageId(stage.id);
            setNewStageName('');
        } catch (error: any) {
            setStageError(error.message || 'Unable to create stage right now.');
        }
    };

    const handleRenameStage = async (stageId: string) => {
        if (!eventId || !stages) return;
        const trimmedName = stageDrafts[stageId]?.trim();
        const currentStage = stages.find((stage) => stage.id === stageId);

        if (!currentStage) return;
        if (!trimmedName) {
            setStageError('Stage names cannot be empty.');
            return;
        }
        if (trimmedName === currentStage.name) return;

        setStageError(null);

        try {
            await updateStage.mutateAsync({
                stageId,
                eventId,
                name: trimmedName,
                description: currentStage.description,
            });
        } catch (error: any) {
            setStageError(error.message || 'Unable to rename this stage right now.');
        }
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
        <div className="space-y-4 pb-24">
            <PageHeader
                title="Show Flow"
                subtitle="Set the running order, review conflicts, and keep the future queue clean."
            />

            {!capabilities.canManageLineup ? (
                <div className="surface-panel rounded-[1.2rem] border border-amber-500/20 bg-amber-500/5 p-3.5 text-sm font-medium text-amber-700">
                    Show Flow is view-only for your current access level. EventAdmin is required to add stages, change order, or remove performances.
                </div>
            ) : null}

            <div className="sticky top-0 z-20 space-y-0">
                <div className="px-1">
                    <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1 overflow-x-auto pb-0.5">
                            <div className="inline-flex min-w-full items-end rounded-t-[0.95rem] border border-b-0 border-border/70 bg-background/35 px-1 pt-1">
                                {isLoadingStages ? (
                                    <div className="h-9 w-36 animate-pulse rounded-t-[0.78rem] bg-muted" />
                                ) : stages && stages.length > 0 ? (
                                    stages.map((stage) => {
                                        const isActive = selectedStageId === stage.id;

                                        return (
                                            <button
                                                key={stage.id}
                                                type="button"
                                                onClick={() => setSelectedStageId(stage.id)}
                                                className={`min-h-9 shrink-0 rounded-t-[0.78rem] border border-transparent px-4 text-center text-[11px] font-black uppercase tracking-[0.14em] transition-colors duration-200 ${
                                                    isActive
                                                        ? 'border-border/70 border-b-card bg-card text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {stage.name}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <span className="px-4 pb-3 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                        No stages yet
                                    </span>
                                )}
                            </div>
                        </div>
                        {capabilities.canManageLineup ? (
                            <button
                                type="button"
                                onClick={() => setIsStageModalOpen(true)}
                                className="inline-flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded-[0.95rem] border border-border/70 bg-background/70 text-foreground transition-colors hover:bg-accent/40"
                                aria-label="Add stage"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="surface-panel surface-section-show-flow space-y-3 rounded-[1.35rem] rounded-tl-none p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <h2 className="truncate text-lg font-black tracking-tight text-foreground">
                                {selectedStage?.name || 'Select a stage'}
                            </h2>
                            <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.16em] ${stageStatusToneClass}`}>
                                {stageStatusLabel}
                            </span>
                        </div>
                        <InlineInfoTip
                            align="right"
                            label="Stage flow"
                            body="Switch stages here, add a new stage with the plus button, and tune the running order below for the selected stage."
                        />
                    </div>
                    {lineup && lineup.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <OperationalMetricCard label="Performances" value={lineup.length} icon={ListOrdered} tone="default" compact />
                            <OperationalMetricCard label="Run Minutes" value={totalDuration} icon={Sparkles} tone="info" compact />
                            <OperationalMetricCard label="Stage Ready" value={readyCount} icon={Sparkles} tone="good" compact />
                            <OperationalMetricCard
                                label={criticalRisks > 0 ? 'Needs Review' : 'Estimated End'}
                                value={criticalRisks > 0 ? criticalRisks : formatEventTime(estimatedEndTime.toISOString(), undefined, true)}
                                icon={Calendar}
                                tone={criticalRisks > 0 ? 'critical' : 'default'}
                                compact
                            />
                        </div>
                    ) : selectedStageId ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-4 text-sm text-muted-foreground">
                            No performances are scheduled on this stage yet.
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-4 text-sm text-muted-foreground">
                            Choose a stage to load its metrics and running order.
                        </div>
                    )}
                </div>
            </div>

            {criticalRisks > 0 ? (
                <OperationalResponseCard
                    label="Flow Review"
                    detail={`${criticalRisks} lineup item${criticalRisks === 1 ? '' : 's'} need order or readiness review before the stage plan is locked.`}
                    count={criticalRisks}
                    tone="critical"
                    action={showReview ? 'Hide review details' : 'Open review details'}
                    onClick={() => setShowReview(!showReview)}
                />
            ) : (
                <OperationalEmptyResponse
                    title="No Escalations"
                    detail="Nothing urgent is demanding a lineup change right now."
                />
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-sm font-medium text-muted-foreground">
                        {isLiveRun ? 'Current and near-future slots stay locked while the stage is live.' : 'Drag the numbered rail on the left to reorder future items.'}
                    </span>
                    <InlineInfoTip
                        align="right"
                        label={isLiveRun ? 'Live reorder rules' : 'Reorder lineup'}
                        body={
                            isLiveRun
                                ? `Only the future queue can be reordered while the show is live. Acts within the next ${coordinationLeadMinutes} minutes stay locked for backstage coordination.`
                                : 'Drag from the numbered rail on the left edge of a card to reorder this stage lineup.'
                        }
                    />
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
                                    <div className="rounded-2xl border border-orange-500/15 bg-orange-500/5 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Locked Now</p>
                                                <p className="mt-1 text-sm text-foreground">Current and near-future items stay fixed for live coordination.</p>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                                                {lockedPrefixItems.length} item{lockedPrefixItems.length === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    </div>
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
                                                onRemove={capabilities.canManageLineup ? () => removeLineupItem.mutate({ id: slot.id, stageId: selectedStageId }) : undefined}
                                            />
                                        );
                                    })}
                                </div>
                            ) : null}

                            {reorderableItems.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Future Queue</p>
                                                <p className="mt-1 text-sm text-foreground">
                                                    {capabilities.canManageLineup ? 'Drag to reorder the upcoming flow.' : 'Upcoming items in the stage queue.'}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                                                {reorderableItems.length} item{reorderableItems.length === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    </div>
                                    <Reorder.Group
                                        axis="y"
                                        values={reorderableItems}
                                        onReorder={capabilities.canManageLineup ? handleReorder : () => undefined}
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
                                                        onMoveToTop={capabilities.canManageLineup ? () => moveSlotToTop(slot.id) : undefined}
                                                        onRemove={capabilities.canManageLineup ? () => removeLineupItem.mutate({ id: slot.id, stageId: selectedStageId }) : undefined}
                                                    />
                                                );
                                            })}
                                        </AnimatePresence>
                                    </Reorder.Group>
                                </div>
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
                                disabled={!capabilities.canManageLineup}
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

            {selectedStageId && capabilities.canManageLineup ? (
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-4 z-30 inline-flex min-h-12 items-center gap-1.5 rounded-full border border-primary/30 bg-primary px-3.5 text-primary-foreground shadow-lg shadow-black/10 transition-colors hover:opacity-95"
                >
                    <Plus size={18} className="shrink-0" />
                    Add Performance
                </Button>
            ) : null}

            <Modal
                isOpen={isStageModalOpen}
                onClose={() => {
                    setIsStageModalOpen(false);
                    setStageError(null);
                    setNewStageName('');
                }}
                title="Stage Setup"
            >
                <div className="space-y-5">
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Create Stage</p>
                        <p className="mt-1 text-sm text-muted-foreground">Keep Phase 1 simple: add the stages your lineup and console will use.</p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Input
                                value={newStageName}
                                onChange={(event) => setNewStageName(event.target.value)}
                                placeholder="Main Stage"
                                className="h-11 rounded-xl"
                            />
                            <Button
                                onClick={handleCreateStage}
                                disabled={!eventId || createStage.isPending}
                                className="min-h-11 rounded-xl px-5"
                            >
                                {createStage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} className="mr-2" />}
                                Add Stage
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current Stages</p>
                            <p className="mt-1 text-sm text-muted-foreground">Rename stages here. Performances stay assigned through the stage lineup.</p>
                        </div>
                        <div className="space-y-3">
                            {isLoadingStages ? (
                                <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">Loading stages...</div>
                            ) : stages && stages.length > 0 ? (
                                stages.map((stage) => {
                                    const hasChanges = stageDrafts[stage.id]?.trim() && stageDrafts[stage.id]?.trim() !== stage.name;
                                    const isSaving = updateStage.isPending && updateStage.variables?.stageId === stage.id;

                                    return (
                                        <div key={stage.id} className="rounded-2xl border border-border bg-background/70 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {selectedStageId === stage.id ? 'Active in Show Flow now' : 'Available to select'}
                                                    </p>
                                                </div>
                                                {selectedStageId === stage.id ? (
                                                    <Badge className="shrink-0 bg-primary/10 text-primary">Active</Badge>
                                                ) : null}
                                            </div>
                                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                                <Input
                                                    value={stageDrafts[stage.id] || ''}
                                                    onChange={(event) =>
                                                        setStageDrafts((current) => ({
                                                            ...current,
                                                            [stage.id]: event.target.value,
                                                        }))
                                                    }
                                                    className="h-11 rounded-xl"
                                                    aria-label={`Stage name for ${stage.name}`}
                                                />
                                                <Button
                                                    variant={hasChanges ? 'default' : 'outline'}
                                                    onClick={() => handleRenameStage(stage.id)}
                                                    disabled={!hasChanges || isSaving}
                                                    className="min-h-11 rounded-xl px-4"
                                                >
                                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <PencilLine size={16} className="mr-2" />}
                                                    Save
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                    No stages yet. Add your first stage above so Show Flow and Console have a home.
                                </div>
                            )}
                        </div>
                    </div>

                    {stageError ? (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {stageError}
                        </div>
                    ) : null}
                </div>
            </Modal>
        </div>
    );
}
