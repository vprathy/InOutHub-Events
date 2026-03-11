import { GripVertical, ChevronUp, ChevronDown, XCircle, Timer, Clock as ClockIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { type LineupSlot } from '@/types/domain';

interface LineupItemCardProps {
    slot: LineupSlot;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onRemove?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
}

export function LineupItemCard({
    slot,
    onMoveUp,
    onMoveDown,
    onRemove,
    isFirst,
    isLast
}: LineupItemCardProps) {
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const totalDuration = slot.act.durationMinutes + slot.act.setupTimeMinutes;

    return (
        <Card className="p-4 relative hover:border-primary/50 transition-colors group">
            <div className="flex items-center gap-4">
                {/* Drag Handle (Visual for V1, functional later) */}
                <div className="text-muted-foreground group-hover:text-foreground transition-colors cursor-grab active:cursor-grabbing">
                    <GripVertical size={20} />
                </div>

                {/* Performance Time */}
                <div className="flex flex-col items-center min-w-[70px] border-r border-border pr-4">
                    <span className="text-lg font-bold text-foreground tracking-tight">
                        {formatTime(slot.scheduledStartTime)}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1 border-border text-muted-foreground">
                        {totalDuration}m
                    </Badge>
                </div>

                {/* Act Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-foreground truncate">{slot.act.name}</h3>
                        <div className="flex items-center gap-1.5 ml-1">
                            {slot.act.arrivalStatus === 'Ready' && (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 px-1.5">
                                    Ready
                                </Badge>
                            )}
                            {slot.act.arrivalStatus === 'Arrived' && (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] py-0 px-1.5">
                                    Arrived
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1">
                            <Timer size={12} className="text-primary/70" />
                            <span>{slot.act.durationMinutes}m duration</span>
                        </div>
                        <div className="flex items-center gap-1 border-l border-border pl-3">
                            <ClockIcon size={12} className="text-primary/70" />
                            <span>{slot.act.setupTimeMinutes}m setup</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <div className="flex flex-col gap-1 mr-2 border-r border-border pr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={onMoveUp}
                            disabled={isFirst}
                        >
                            <ChevronUp size={18} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={onMoveDown}
                            disabled={isLast}
                        >
                            <ChevronDown size={18} />
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={onRemove}
                    >
                        <XCircle size={20} />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
