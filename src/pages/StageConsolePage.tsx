import { MonitorPlay } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export default function StageConsolePage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Stage Console</h1>
                <p className="text-neutral-400">Real-time stage management and execution.</p>
            </div>

            <EmptyState
                title="Stage Inactive"
                description="Select a stage to begin controlling the live show state and cues."
                icon={MonitorPlay}
                action={{
                    label: 'Select Stage',
                    onClick: () => console.log('Select Stage clicked')
                }}
            />
        </div>
    );
}
