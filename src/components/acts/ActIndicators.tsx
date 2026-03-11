import { Users, FileText, Music, AlertCircle, MessageSquare } from 'lucide-react';

interface ActIndicatorsProps {
    participantCount: number;
    hasTechnicalRider: boolean;
    hasMusicTrack: boolean;
    missingAssetCount: number;
    specialRequestCount: number;
}

export function ActIndicators({
    participantCount,
    hasTechnicalRider,
    hasMusicTrack,
    missingAssetCount,
    specialRequestCount
}: ActIndicatorsProps) {
    return (
        <div className="flex items-center space-x-2">
            {/* Special Requests Flag */}
            {specialRequestCount > 0 && (
                <div
                    className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-amber-500/20"
                    title={`${specialRequestCount} participants have special requests`}
                >
                    <MessageSquare className="w-3 h-3" />
                    <span>Reqs</span>
                </div>
            )}

            {/* Missing Forms Alert */}
            {missingAssetCount > 0 && (
                <div
                    className="flex items-center space-x-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-rose-500/20"
                    title={`${missingAssetCount} participants have pending forms`}
                >
                    <AlertCircle className="w-3 h-3" />
                    <span>Forms</span>
                </div>
            )}

            {/* Technical Rider Status */}
            <div
                className={`p-1.5 rounded-lg transition-colors border ${hasTechnicalRider ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-muted/50 text-muted-foreground/30 border-transparent'
                    }`}
                title={hasTechnicalRider ? 'Tech Rider Received' : 'No Tech Rider'}
            >
                <FileText className="w-3.5 h-3.5" />
            </div>

            {/* Music Sync Status */}
            <div
                className={`p-1.5 rounded-lg transition-colors border ${hasMusicTrack ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted/50 text-muted-foreground/30 border-transparent'
                    }`}
                title={hasMusicTrack ? 'Music Track Uploaded' : 'No Music'}
            >
                <Music className="w-3.5 h-3.5" />
            </div>

            {/* Participant Count */}
            <div className="flex items-center space-x-1 px-2 py-1 bg-secondary rounded-lg text-xs font-bold text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{participantCount}</span>
            </div>
        </div>
    );
}
