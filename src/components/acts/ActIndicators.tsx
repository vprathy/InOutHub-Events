import { Users, FileText, Music } from 'lucide-react';

interface ActIndicatorsProps {
    participantCount: number;
    hasTechnicalRider: boolean;
    hasMusicTrack: boolean;
}

export function ActIndicators({ participantCount, hasTechnicalRider, hasMusicTrack }: ActIndicatorsProps) {
    return (
        <div className="flex items-center space-x-3">
            {/* Participant Count */}
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-secondary rounded-full text-xs font-medium text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{participantCount}</span>
            </div>

            {/* Music Sync Status */}
            <div
                className={`p-1.5 rounded-full transition-colors ${hasMusicTrack ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                title={hasMusicTrack ? 'Music Track Uploaded' : 'Music Missing'}
            >
                <Music className="w-3.5 h-3.5" />
            </div>

            {/* Technical Rider Status */}
            <div
                className={`p-1.5 rounded-full transition-colors ${hasTechnicalRider ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                title={hasTechnicalRider ? 'Tech Rider Received' : 'No Tech Rider'}
            >
                <FileText className="w-3.5 h-3.5" />
            </div>
        </div>
    );
}
