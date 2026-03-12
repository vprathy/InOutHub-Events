import type { ActWithCounts } from '@/types/domain';
import { ActIndicators } from '@/components/acts/ActIndicators';
import { Clock, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActCardProps {
    act: ActWithCounts;
}

export function ActCard({ act }: ActCardProps) {
    const navigate = useNavigate();

    return (
        <div
            className="bg-card border border-border rounded-[2rem] p-6 shadow-sm transition-all hover:border-primary/40 flex flex-col space-y-3 cursor-pointer group min-h-[44px]"
            onClick={() => navigate(`/acts/${act.id}`)}
        >
            {/* Top Section: Name and Indicators */}
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors truncate">{act.name}</h3>
                        <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground font-black uppercase tracking-widest">
                        <div className="flex items-center space-x-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>{act.durationMinutes}m</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <Info className="w-4 h-4 text-primary" />
                            <span>{act.setupTimeMinutes}m Setup</span>
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

        </div>
    );
}
