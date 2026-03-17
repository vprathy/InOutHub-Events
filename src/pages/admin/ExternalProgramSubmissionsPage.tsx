import { AlertCircle } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';

export default function ExternalProgramSubmissionsPage() {
    const { eventId } = useSelection();
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);

    if (!eventId) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-sm font-medium text-muted-foreground">Select an event to view external submission access.</p>
            </div>
        );
    }

    if (currentEventRole !== 'EventAdmin') {
        return (
            <div className="mx-auto flex max-w-3xl flex-col space-y-4 pb-20">
                <PageHeader
                    title="External Program Intake"
                    subtitle="Admin-only surface for external team review and roster onboarding."
                    align="left"
                />

                <Card className="p-5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-black tracking-tight text-foreground">Admin-only surface</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                External team approval and post-approval roster onboarding require EventAdmin access for this event.
                                Current access: <span className="font-bold text-foreground">{currentEventRole || 'No event role'}</span>.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col space-y-4 pb-20">
            <PageHeader
                title="External Program Intake"
                subtitle="This admin-only workflow is not included in the current production repair commit."
                align="left"
                status={
                    <div className="rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                        Admin only
                    </div>
                }
            />

            <Card className="p-5">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                        <p className="text-sm font-black tracking-tight text-foreground">Temporarily simplified for deployment safety</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            The auth rollout repair keeps this route protected and available only to EventAdmin users, but removes the unfinished submission workflow
                            dependencies from the production build. The full external-team flow remains local work and can be restored in a separate clean commit.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
