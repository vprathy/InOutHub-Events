import { ListOrdered } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export default function LineupPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Lineup</h1>
                <p className="text-neutral-400">View and adjust the performance schedule.</p>
            </div>

            <EmptyState
                title="Schedule is Empty"
                description="Plan your event by adding acts to the stages and setting their performance times."
                icon={ListOrdered}
                action={{
                    label: 'Build Lineup',
                    onClick: () => console.log('Build Lineup clicked')
                }}
            />
        </div>
    );
}
