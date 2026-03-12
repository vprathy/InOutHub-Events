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
        <div className="flex items-center space-x-1.5">
            {/* Special Requests Flag */}
            {specialRequestCount > 0 && (
                <div
                    className="flex items-center space-x-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-amber-500/20"
                    title={`${specialRequestCount} participants have special requests`}
                >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Req</span>
                </div>
            )}

            {/* Missing Forms Alert */}
            {missingAssetCount > 0 && (
                <div
                    className="flex items-center space-x-1 px-1.5 py-0.5 bg-rose-500/10 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-rose-500/20"
                    title={`${missingAssetCount} participants have pending forms`}
                >
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>Forms</span>
                </div>
            )}

            {/* Technical Rider Status */}
            <div
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-lg transition-all border ${hasTechnicalRider ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-sm' : 'bg-muted/30 text-muted-foreground/30 border-transparent shadow-none'
                    }`}
                title={hasTechnicalRider ? 'Tech Rider Received' : 'No Tech Rider'}
            >
                <FileText className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Tech</span>
            </div>

            {/* Music Sync Status */}
            <div
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-lg transition-all border ${hasMusicTrack ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-none'
                    }`}
                title={hasMusicTrack ? 'Music Track Uploaded' : 'No Music Uploaded'}
            >
                <Music className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Music</span>
            </div>

            {/* Participant Count */}
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-secondary/50 rounded-lg text-[9px] font-black uppercase tracking-tighter text-muted-foreground border border-border/50">
                <Users className="w-2.5 h-2.5" />
                <span>{participantCount}</span>
            </div>
        </div>
    );
}
