import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Plus, Loader2, ChevronRight, Edit2, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { CreateOrgModal } from '@/components/selection/CreateOrgModal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ManageOrgAccessModal } from '@/components/selection/ManageOrgAccessModal';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { isDevLoginEnabled } from '@/lib/authConfig';

export default function OrgSelectionPage() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isManageAccessOpen, setIsManageAccessOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<{ id: string; name: string } | null>(null);
    const { setOrganizationId } = useSelection();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchOrgs();
    }, []);

    async function fetchOrgs() {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            const { data: superAdminRows, error: superAdminError } = await supabase
                .from('app_super_admins')
                .select('user_id')
                .eq('user_id', user.id)
                .limit(1);

            if (superAdminError) throw superAdminError;

            const userIsSuperAdmin = Boolean(superAdminRows?.length);
            setIsSuperAdmin(userIsSuperAdmin);

            const orgQuery = userIsSuperAdmin
                ? supabase
                    .from('organizations')
                    .select('id, name')
                    .order('name')
                : supabase
                    .from('organizations')
                    .select(`
                      id,
                      name,
                      organization_members!inner (
                        role
                      )
                    `)
                    .order('name');

            const { data, error } = await orgQuery;

            if (error) throw error;
            setOrgs(data || []);
        } catch (err) {
            console.error('Error fetching orgs:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSelect = (id: string) => {
        setOrganizationId(id);
        navigate('/select-event', { state: location.state });
    };

    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>, id: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect(id);
        }
    };

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Select Organization"
                subtitle="Choose the organization you want to work in."
            />

            <div className="surface-panel rounded-[1.35rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Organization Triage</p>
                        <h2 className="text-lg font-black tracking-tight text-foreground">Pick the organization that owns the event work you need right now.</h2>
                        <p className="text-sm text-muted-foreground">
                            Keep this screen focused on selection. Admin actions stay secondary and only appear when needed.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        <span className="rounded-full border border-border/70 bg-background px-3 py-2">
                            {isLoading ? 'Loading' : `${orgs.length} ${orgs.length === 1 ? 'Org' : 'Orgs'}`}
                        </span>
                        <span className="rounded-full border border-border/70 bg-background px-3 py-2">
                            {isSuperAdmin ? 'Admin Access' : 'Member Access'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-1">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Available Organizations</p>
                    <p className="mt-1 text-sm text-muted-foreground">Tap a card to continue to event selection.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void fetchOrgs()}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh</span>
                    </button>
                    {isSuperAdmin ? (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create</span>
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        <div className="surface-panel col-span-full flex justify-center rounded-[1.5rem] py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : orgs.length === 0 ? (
                        <div className="surface-panel col-span-full rounded-[1.5rem] p-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground">
                                <Landmark className="h-7 w-7" />
                            </div>
                            <h2 className="text-xl font-black text-foreground">No organizations available</h2>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                                {isSuperAdmin
                                    ? 'No organizations exist yet for this environment. Create one to continue.'
                                    : 'This account signed in successfully, but it does not have organization access yet. Ask an administrator to add access, then refresh this screen or try a different account.'}
                            </p>
                            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                                    <button
                                        onClick={() => navigate('/login', { replace: true })}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>{isDevLoginEnabled ? 'Use Another Account' : 'Back to Sign In'}</span>
                                    </button>
                                    <button
                                        onClick={() => void fetchOrgs()}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        <span>Refresh Organizations</span>
                                    </button>
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/5"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Create Organization</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {orgs.map((org) => (
                                <div
                                    key={org.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelect(org.id)}
                                    onKeyDown={(event) => handleCardKeyDown(event, org.id)}
                                    className="group surface-panel rounded-[1.5rem] p-4 text-left transition-colors hover:border-primary/40"
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-primary">
                                                    <Landmark className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-lg font-black leading-tight text-foreground">{org.name}</p>
                                                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                        {isSuperAdmin ? 'Super Admin' : org.organization_members[0]?.role || 'Owner'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => {
                                                    setOrganizationId(org.id);
                                                    setIsManageAccessOpen(true);
                                                }}
                                                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                            >
                                                <ShieldCheck className="h-4 w-4" />
                                                <span>Access</span>
                                            </button>
                                            <div>
                                                <ActionMenu
                                                    options={[
                                                        {
                                                            label: 'Edit Name',
                                                            icon: <Edit2 className="w-4 h-4" />,
                                                            onClick: () => {
                                                                setEditingOrg({ id: org.id, name: org.name });
                                                                setIsCreateModalOpen(true);
                                                            }
                                                        },
                                                        {
                                                            label: 'Manage Access',
                                                            icon: <ShieldAlert className="w-4 h-4" />,
                                                            onClick: () => {
                                                                setOrganizationId(org.id);
                                                                setIsManageAccessOpen(true);
                                                            }
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="surface-panel flex items-center justify-center space-x-3 rounded-[1.5rem] border-2 border-dashed border-muted p-6 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary min-h-[44px]"
                            >
                                <Plus className="w-6 h-6" />
                                <span>Create New Organization</span>
                            </button>
                        </>
                    )}
            </div>

            <CreateOrgModal
                isOpen={isCreateModalOpen}
                initialData={editingOrg}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingOrg(null);
                }}
                onSuccess={(id) => {
                    if (editingOrg) {
                        fetchOrgs();
                        setIsCreateModalOpen(false);
                        setEditingOrg(null);
                    } else {
                        handleSelect(id);
                    }
                }}
            />

            <ManageOrgAccessModal
                isOpen={isManageAccessOpen}
                onClose={() => {
                    setIsManageAccessOpen(false);
                    // clear org id if we didn't actually select it to navigate
                    setOrganizationId(null);
                }}
            />
        </div>
    );
}
