import type { ActWithCounts } from '@/types/domain';
import { useUpdateActStatus } from '@/hooks/useActs';
import { ActIndicators } from '@/components/acts/ActIndicators';
import { StatusPicker } from '@/components/acts/StatusPicker';
import { Clock, Info } from 'lucide-react';

interface ActCardProps {
    act: ActWithCounts;
}

export function ActCard({ act }: ActCardProps) {
    const { mutate: updateStatus, isPending } = useUpdateActStatus();

    return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm transition-all hover:border-primary/50 flex flex-col space-y-4">
            {/* Top Section: Name and Indicators */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold leading-tight">{act.name}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{act.durationMinutes}m duration</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Info className="w-3.5 h-3.5" />
                            <span>{act.setupTimeMinutes}m setup</span>
                        </div>
                    </div>
                </div>

                <ActIndicators
                    participantCount={act.participantCount}
                    hasMusicTrack={act.hasMusicTrack}
                    hasTechnicalRider={act.hasTechnicalRider}
                    missingAssetCount={act.missingAssetCount}
                    specialRequestCount={act.specialRequestCount}
                />
            </div>

            {/* Arrival Status Rapid Switcher */}
            <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Operational Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${act.arrivalStatus === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                        }`}>
                        {act.arrivalStatus}
                    </span>
                </div>
                <StatusPicker
                    currentStatus={act.arrivalStatus}
                    onStatusChange={(status) => updateStatus({ actId: act.id, status })}
                    isLoading={isPending}
                />
            </div>
        </div>
    );
}
