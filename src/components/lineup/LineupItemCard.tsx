import { Trash2, GripVertical, Clock, AlertCircle, AlertTriangle, ArrowUpToLine } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { LineupSlot } from '@/types/domain';
import type { FlowInsight } from '@/lib/optimizer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface LineupItemCardProps {
    slot: LineupSlot;
    orderIndex: number;
    risk?: FlowInsight;
    onRemove: () => void;
    onMoveToTop?: () => void;
    onDragStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function LineupItemCard({ slot, orderIndex, risk, onRemove, onMoveToTop, onDragStart }: LineupItemCardProps) {
    const startTime = new Date(slot.scheduledStartTime);
    const duration = slot.act.durationMinutes;
    const setupTime = slot.act.setupTimeMinutes || 0;

    const isCritical = risk?.level === 'critical';
    const isMedium = risk?.level === 'medium' || risk?.level === 'high';

    return (
        <Card className={`group overflow-hidden border-border/50 hover:border-primary/30 transition-all ${isCritical ? 'bg-rose-500/5 border-rose-500/30' :
                isMedium ? 'bg-amber-500/5 border-amber-500/30' :
                    'bg-card shadow-sm'
            }`}>
            <div className="flex">
                {/* Drag Handle - Tactile Grip area */}
                <button
                    type="button"
                    onPointerDown={onDragStart}
                    className="flex w-16 flex-col items-center justify-center gap-2 border-r border-border/20 bg-muted/40 px-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary cursor-grab active:cursor-grabbing touch-none"
                    aria-label={`Reorder performance ${orderIndex}`}
                >
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground/80">{orderIndex}</span>
                    <GripVertical size={22} />
                </button>
                <div className="flex-1 p-4 lg:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-primary">
                                #{orderIndex}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                Flow Position
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-4 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-sm font-black">
                                    <Clock size={14} className="mr-1.5" />
                                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
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
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center text-xs text-muted-foreground font-medium">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${slot.act.arrivalStatus === 'Ready' ? 'bg-green-500' :
                                                slot.act.arrivalStatus === 'Arrived' ? 'bg-blue-500' : 'bg-muted'
                                            }`} />
                                        {slot.act.arrivalStatus}
                                    </div>
                                    <div className="h-1 w-1 rounded-full bg-border" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {slot.act.participants?.length || 0} Performers
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-end justify-between lg:justify-end lg:items-start lg:flex-row gap-3">
                            <AnimatePresence>
                                {risk && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`flex items-start gap-2 px-3 py-2 rounded-xl border ${isCritical ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                                                'bg-amber-500/10 border-amber-500/20 text-amber-700'
                                            }`}
                                    >
                                        {isCritical ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase leading-none mb-1">{risk.title}</span>
                                            <span className="text-[10px] opacity-80 leading-tight max-w-[150px]">{risk.description}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center gap-2">
                                {orderIndex > 1 && onMoveToTop ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onMoveToTop}
                                        className="h-10 rounded-xl border-border/60 px-3 text-[10px] font-black uppercase tracking-[0.18em]"
                                    >
                                        <ArrowUpToLine size={14} className="mr-2" />
                                        Top
                                    </Button>
                                ) : null}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onRemove}
                                    className="h-10 w-10 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 border border-transparent hover:border-rose-200 transition-all"
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Health Indicator (Bottom Accent) */}
            <div className={`h-1.5 w-full mt-auto ${isCritical ? 'bg-rose-500' :
                    isMedium ? 'bg-amber-500' :
                        slot.act.arrivalStatus === 'Ready' ? 'bg-green-500' : 'bg-transparent'
                }`} />
        </Card>
    );
}
