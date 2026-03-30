import { Trash2, GripVertical, Clock, ArrowUpToLine } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { LineupSlot } from '@/types/domain';
import type { FlowInsight } from '@/lib/optimizer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatEventTime } from '@/lib/eventTime';

interface LineupItemCardProps {
    slot: LineupSlot;
    orderIndex: number;
    risk?: FlowInsight;
    onRemove?: () => void;
    onMoveToTop?: () => void;
    onDragStart?: (event: ReactPointerEvent<HTMLElement>) => void;
    lockedReason?: string | null;
}

export function LineupItemCard({ slot, orderIndex, risk, onRemove, onMoveToTop, onDragStart, lockedReason }: LineupItemCardProps) {
    const duration = slot.act.durationMinutes;
    const setupTime = slot.act.setupTimeMinutes || 0;
    const lockedLabel = lockedReason === 'Live on stage now'
        ? 'Live'
        : lockedReason
            ? 'Backstage Locked'
            : null;
    const compactMeta = [
        `${slot.act.participants?.length || 0} performers`,
        `${duration}m performance`,
        setupTime > 0 ? `${setupTime}m setup` : null,
        risk ? risk.title : null,
    ].filter(Boolean).join(' • ');

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
    const handleDragStart = lockedReason || !onDragStart
        ? undefined
        : (event: ReactPointerEvent<HTMLElement>) => {
            event.preventDefault();
            onDragStart(event);
        };

    return (
        <Card className={`group overflow-hidden border-border/50 hover:border-primary/30 transition-all ${isCritical ? 'surface-critical' :
                isMedium ? 'surface-warning' :
                    'bg-card shadow-sm'
            }`}>
            <div className="flex">
                {/* Drag Handle - Tactile Grip area */}
                <div
                    onPointerDownCapture={handleDragStart}
                    className={`flex min-h-[112px] w-16 flex-col items-center justify-center gap-2 border-r border-border/20 bg-muted/40 px-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary select-none touch-none ${lockedReason ? 'cursor-not-allowed opacity-45' : 'cursor-grab active:cursor-grabbing'}`}
                    style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    aria-hidden="true"
                >
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground/80">{orderIndex}</span>
                    <GripVertical size={22} />
                </div>
                <div
                    className={`flex-1 p-4 ${lockedReason ? '' : 'cursor-grab active:cursor-grabbing'}`}
                    onPointerDownCapture={handleDragStart}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-black text-primary">
                                <Clock size={14} className="mr-1.5" />
                                {formatEventTime(slot.scheduledStartTime, undefined, true)}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${readinessTone}`}>
                                {readinessLabel}
                            </span>
                            {lockedLabel ? (
                                <Badge variant="outline" className="surface-warning text-[9px] font-black uppercase tracking-[0.16em]">
                                    {lockedLabel}
                                </Badge>
                            ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {orderIndex > 1 && onMoveToTop ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={onMoveToTop}
                                    disabled={Boolean(lockedReason)}
                                    className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                                    title="Move to top"
                                >
                                    <ArrowUpToLine size={16} />
                                </Button>
                            ) : null}
                            {onRemove ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={onRemove}
                                    className="h-9 w-9 rounded-lg text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                    title="Remove from stage"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-xl font-bold tracking-tight text-foreground">
                                {slot.act.name}
                            </h3>
                            <p className="truncate text-sm text-muted-foreground">
                                {compactMeta}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`h-1 w-full mt-auto ${isCritical ? 'bg-rose-500' :
                    isMedium ? 'bg-amber-500' :
                        slot.act.arrivalStatus === 'Ready' ? 'bg-emerald-500/80' : 'bg-transparent'
                }`} />
        </Card>
    );
}
