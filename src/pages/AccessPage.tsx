import { useMemo, useState } from 'react';
import { Loader2, ShieldCheck, UserPlus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useAssignEventRole, useEventMembers, usePendingEventAccess, useRemoveEventMember } from '@/hooks/useAccess';
import { Button } from '@/components/ui/Button';

type AccessRole = 'EventAdmin' | 'StageManager' | 'ActAdmin' | 'Member';

export default function AccessPage() {
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: members = [], isLoading: isLoadingMembers } = useEventMembers(eventId || null);
    const { data: pendingAccess = [], isLoading: isLoadingPending } = usePendingEventAccess(eventId || null);
    const { mutateAsync: assignRole, isPending: isAssigning } = useAssignEventRole(eventId || null);
    const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveEventMember(eventId || null);

    const [email, setEmail] = useState('');
    const [role, setRole] = useState<AccessRole>('StageManager');
    const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [draftRoles, setDraftRoles] = useState<Record<string, AccessRole>>({});

    const canManageAccess =
        currentEventRole === 'EventAdmin' || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';

    const filteredMembers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return members;
        return members.filter((member: any) =>
            member.user_profiles?.email?.toLowerCase().includes(query)
            || member.role?.toLowerCase().includes(query)
        );
    }, [members, searchQuery]);

    const filteredPending = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return pendingAccess;
        return pendingAccess.filter((pending: any) =>
            pending.normalized_email?.toLowerCase().includes(query)
            || pending.target_role?.toLowerCase().includes(query)
        );
    }, [pendingAccess, searchQuery]);

    if (!eventId || isLoadingEventRole || isLoadingOrgRole) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canManageAccess) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Access"
                    subtitle="Event access requires EventAdmin or org admin authority."
                />
                <div className="surface-panel rounded-[1.35rem] border p-6 text-sm text-muted-foreground">
                    This event does not grant you access-management permissions.
                </div>
            </div>
        );
    }

    const handleQuickGrant = async (event: React.FormEvent) => {
        event.preventDefault();
        setNotice(null);

        try {
            const result = await assignRole({ email, role });
            setNotice({ tone: 'success', message: result?.message || `${role} access saved.` });
            setEmail('');
            setRole('StageManager');
        } catch (error: any) {
            setNotice({ tone: 'error', message: error?.message || 'Could not save event access.' });
        }
    };

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Access"
                subtitle="Quick event access, pending sign-ins, and current event roles."
            />

            {notice ? (
                <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold ${
                    notice.tone === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700'
                        : 'border-destructive/20 bg-destructive/5 text-destructive'
                }`}>
                    {notice.message}
                </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
                <div className="surface-panel rounded-[1.35rem] p-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Quick Grant</p>
                        <p className="text-sm text-muted-foreground">
                            Grant event access in one step. Org membership is added automatically if needed.
                        </p>
                    </div>
                    <form onSubmit={handleQuickGrant} className="mt-4 space-y-3">
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as AccessRole)}
                            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="EventAdmin">Event Admin</option>
                            <option value="StageManager">Stage Manager</option>
                            <option value="ActAdmin">Act Admin</option>
                            <option value="Member">Member</option>
                        </select>
                        <Button type="submit" className="h-11 w-full" disabled={isAssigning || !email.trim()}>
                            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Grant Access
                        </Button>
                    </form>
                    <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-[11px] font-medium leading-5 text-primary">
                        If the email has not signed in yet, access stays pending until first sign-in.
                    </div>
                </div>

                <div className="surface-panel rounded-[1.35rem] p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Search Access</p>
                            <p className="text-sm text-muted-foreground">Find current event roles and pending access by email.</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current</p>
                            <p className="text-lg font-black text-foreground">{members.length}</p>
                        </div>
                    </div>
                    <div className="relative mt-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search email or role"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                <section className="surface-panel rounded-[1.35rem] p-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">Pending Access</h2>
                    </div>
                    {isLoadingPending ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : filteredPending.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">No pending sign-ins for this event.</p>
                    ) : (
                        <div className="mt-4 space-y-2.5">
                            {filteredPending.map((pending: any) => (
                                <div key={pending.id} className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                                    <p className="text-sm font-bold text-foreground">{pending.normalized_email}</p>
                                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        {pending.target_role} • {pending.grant_type === 'manual' ? 'Pending Grant' : 'Pending Baseline'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="surface-panel rounded-[1.35rem] p-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">Current Event Access</h2>
                    </div>
                    {isLoadingMembers ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">No event access rows yet.</p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {filteredMembers.map((member: any) => {
                                const nextRole = draftRoles[member.id] || member.role;
                                const isAutomated = member.grant_type === 'automated';
                                return (
                                    <div key={member.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{member.user_profiles?.email}</p>
                                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                                    {member.role} • {isAutomated ? 'Automated Baseline' : 'Manual'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:min-w-[220px]">
                                                <select
                                                    value={nextRole}
                                                    onChange={(e) => setDraftRoles((current) => ({ ...current, [member.id]: e.target.value as AccessRole }))}
                                                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                >
                                                    <option value="EventAdmin">Event Admin</option>
                                                    <option value="StageManager">Stage Manager</option>
                                                    <option value="ActAdmin">Act Admin</option>
                                                    <option value="Member">Member</option>
                                                </select>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="h-11 flex-1"
                                                        disabled={isAssigning || nextRole === member.role}
                                                        onClick={async () => {
                                                            setNotice(null);
                                                            try {
                                                                const result = await assignRole({
                                                                    email: member.user_profiles?.email,
                                                                    role: nextRole,
                                                                });
                                                                setNotice({ tone: 'success', message: result?.message || 'Access updated.' });
                                                            } catch (error: any) {
                                                                setNotice({ tone: 'error', message: error?.message || 'Could not update role.' });
                                                            }
                                                        }}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-11 px-3"
                                                        disabled={isRemoving || isAutomated}
                                                        onClick={async () => {
                                                            setNotice(null);
                                                            try {
                                                                await removeMember(member.id);
                                                                setNotice({ tone: 'success', message: `Manual event access removed for ${member.user_profiles?.email}.` });
                                                            } catch (error: any) {
                                                                setNotice({ tone: 'error', message: error?.message || 'Could not remove manual access.' });
                                                            }
                                                        }}
                                                        title={isAutomated ? 'Automated baseline access is source-managed.' : 'Remove manual event access'}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
