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
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {/* Special Requests Flag */}
            {specialRequestCount > 0 && (
                <div
                    className="flex min-h-[28px] items-center space-x-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-amber-600"
                    title={`${specialRequestCount} participants have special requests`}
                >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Requests</span>
                </div>
            )}

            {/* Missing Docs Alert */}
            {missingAssetCount > 0 && (
                <div
                    className="flex min-h-[28px] items-center space-x-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-rose-600"
                    title={`${missingAssetCount} participants have docs or approvals still pending`}
                >
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>Docs</span>
                </div>
            )}

            {/* Technical Rider Status */}
            <div
                className={`hidden min-h-[28px] items-center space-x-1 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-tighter transition-all sm:flex ${hasTechnicalRider ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-sm' : 'bg-muted/30 text-muted-foreground/40 border-transparent shadow-none'
                    }`}
                title={hasTechnicalRider ? 'Tech Rider Received' : 'No Tech Rider'}
            >
                <FileText className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Tech</span>
            </div>

            {/* Music Sync Status */}
            <div
                className={`flex min-h-[28px] items-center space-x-1 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-tighter transition-all ${hasMusicTrack ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-none'
                    }`}
                title={hasMusicTrack ? 'Music Track Uploaded' : 'No Music Uploaded'}
            >
                <Music className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Music</span>
            </div>

            {/* Participant Count */}
            <div className="flex min-h-[28px] items-center space-x-1 rounded-lg border border-border/50 bg-secondary/50 px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                <Users className="w-2.5 h-2.5" />
                <span>{participantCount} Cast</span>
            </div>
        </div>
    );
}
