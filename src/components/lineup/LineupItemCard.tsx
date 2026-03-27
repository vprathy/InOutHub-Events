import { Trash2, GripVertical, Clock, ArrowUpToLine } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { LineupSlot } from '@/types/domain';
import type { FlowInsight } from '@/lib/optimizer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { formatEventTime } from '@/lib/eventTime';
import { OperationalResponseCard } from '@/components/ui/OperationalCards';

interface LineupItemCardProps {
    slot: LineupSlot;
    orderIndex: number;
    risk?: FlowInsight;
    onRemove?: () => void;
    onMoveToTop?: () => void;
    onDragStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    lockedReason?: string | null;
}

export function LineupItemCard({ slot, orderIndex, risk, onRemove, onMoveToTop, onDragStart, lockedReason }: LineupItemCardProps) {
    const duration = slot.act.durationMinutes;
    const setupTime = slot.act.setupTimeMinutes || 0;

    const isCritical = risk?.level === 'critical';
    const isMedium = risk?.level === 'medium' || risk?.level === 'high';
    const readinessLabel = slot.act.arrivalStatus === 'Ready'
        ? 'Stage Ready'
        : slot.act.arrivalStatus === 'Arrived'
            ? 'Arrived'
            : slot.act.arrivalStatus === 'Backstage'
                ? 'Backstage'
                : 'Not Ready';
    const readinessTone = slot.act.arrivalStatus === 'Ready'
        ? 'surface-good'
        : slot.act.arrivalStatus === 'Arrived' || slot.act.arrivalStatus === 'Backstage'
            ? 'surface-warning'
            : 'surface-metric text-muted-foreground';

    return (
        <Card className={`group overflow-hidden border-border/50 hover:border-primary/30 transition-all ${isCritical ? 'surface-critical' :
                isMedium ? 'surface-warning' :
                    'bg-card shadow-sm'
            }`}>
            <div className="flex">
                {/* Drag Handle - Tactile Grip area */}
                <button
                    type="button"
                    onPointerDownCapture={
                        lockedReason || !onDragStart
                            ? undefined
                            : (event) => {
                                event.preventDefault();
                                onDragStart(event);
                            }
                    }
                    disabled={Boolean(lockedReason)}
                    className={`flex min-h-[112px] w-16 flex-col items-center justify-center gap-2 border-r border-border/20 bg-muted/40 px-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary select-none touch-none ${lockedReason ? 'cursor-not-allowed opacity-45' : 'cursor-grab active:cursor-grabbing'}`}
                    style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    aria-label={`Reorder performance ${orderIndex}`}
                >
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground/80">{orderIndex}</span>
                    <GripVertical size={22} />
                </button>
                <div className="flex-1 p-4 lg:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-black text-primary">
                                <Clock size={14} className="mr-1.5" />
                                {formatEventTime(slot.scheduledStartTime, undefined, true)}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${readinessTone}`}>
                                {readinessLabel}
                            </span>
                            {lockedReason ? (
                                <Badge variant="outline" className="surface-warning text-[9px] font-black uppercase tracking-[0.16em]">
                                    Locked
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-0.5 border-border shadow-none">
                                    {duration}m Performance
                                </Badge>
                                {setupTime > 0 && (
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider py-0.5 bg-muted text-muted-foreground shadow-none">
                                        +{setupTime}m Setup
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                                    {slot.act.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {slot.act.participants?.length || 0} performers
                                    {setupTime > 0 ? ` • ${setupTime} minute setup` : ''}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between lg:justify-end lg:items-start lg:flex-row gap-3">
                            <AnimatePresence>
                                {risk && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="max-w-[220px]"
                                    >
                                        <OperationalResponseCard
                                            label={risk.title}
                                            detail={risk.description}
                                            tone={isCritical ? 'critical' : 'warning'}
                                            className="px-3 py-2"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center gap-2">
                                {orderIndex > 1 && onMoveToTop ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onMoveToTop}
                                        disabled={Boolean(lockedReason)}
                                        className="h-10 rounded-xl border-border/60 px-3 text-[10px] font-black uppercase tracking-[0.18em]"
                                    >
                                        <ArrowUpToLine size={14} className="mr-2" />
                                        Top
                                    </Button>
                                ) : null}
                                {onRemove ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onRemove}
                                        className="h-10 w-10 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 border border-transparent hover:border-rose-200 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    {lockedReason ? (
                        <div className="surface-warning mt-3 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]">
                            {lockedReason}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className={`h-1 w-full mt-auto ${isCritical ? 'bg-rose-500' :
                    isMedium ? 'bg-amber-500' :
                        slot.act.arrivalStatus === 'Ready' ? 'bg-emerald-500/80' : 'bg-transparent'
                }`} />
        </Card>
    );
}
