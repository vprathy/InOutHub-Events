import { ShieldCheck, ClipboardCheck, UsersRound, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

export default function AdminPage() {
    const navigate = useNavigate();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();

    const canOpenAdmin =
        isSuperAdmin
        || currentEventRole === 'EventAdmin'
        || currentOrgRole === 'Owner'
        || currentOrgRole === 'Admin';

    if (isLoadingEventRole || isLoadingOrgRole || isLoadingSuperAdmin) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canOpenAdmin) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Admin"
                    subtitle="Administrative controls are available only to org admins, event admins, and super admins."
                />
                <div className="surface-panel rounded-[1.35rem] border p-6 text-sm text-muted-foreground">
                    This event context does not grant admin access.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Admin"
                subtitle="Administrative controls for event staffing and readiness policy management."
            />

            <div className="surface-panel surface-section-admin rounded-[1.35rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Admin Module</p>
                        <h2 className="text-lg font-black tracking-tight text-foreground">Choose the admin workflow you need for this org and event.</h2>
                        <p className="text-sm text-muted-foreground">
                            Access handles staffing and roles. Requirements controls readiness policies and inherited event baselines.
                        </p>
                    </div>
                    <div className="rounded-full border border-border/70 bg-background px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        {isSuperAdmin ? 'Super Admin' : currentOrgRole === 'Owner' || currentOrgRole === 'Admin' ? 'Org Admin' : 'Event Admin'}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <button
                    onClick={() => navigate('/admin/access')}
                    className="group surface-panel rounded-[1.5rem] p-5 text-left transition-colors hover:border-primary/40"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-primary">
                                <UsersRound className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-lg font-black leading-tight text-foreground">Access</p>
                                <p className="text-sm text-muted-foreground">
                                    Quick grant, pending sign-ins, and current event roles.
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/admin/requirements')}
                    className="group surface-panel rounded-[1.5rem] p-5 text-left transition-colors hover:border-primary/40"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-primary">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-lg font-black leading-tight text-foreground">Requirements</p>
                                <p className="text-sm text-muted-foreground">
                                    Org and event requirement policies that drive readiness workflows.
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                </button>
            </div>

            <div className="surface-panel rounded-[1.2rem] border p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p>
                        Dashboard remains the operational landing page. Admin is the dedicated home for privileged configuration and staffing controls.
                    </p>
                </div>
            </div>
        </div>
    );
}
