import { LayoutDashboard } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-neutral-400">Overview of your event operations.</p>
            </div>

            <EmptyState
                title="Welcome to the Dashboard"
                description="This will be your hub for high-level event metrics and quick actions."
                icon={LayoutDashboard}
                action={{
                    label: 'Get Started',
                    onClick: () => console.log('Get Started clicked')
                }}
            />
        </div>
    );
}
