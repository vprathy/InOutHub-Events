import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Plus, Loader2, ChevronRight, Edit2, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { CreateOrgModal } from '@/components/selection/CreateOrgModal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ManageOrgAccessModal } from '@/components/selection/ManageOrgAccessModal';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { isDevLoginEnabled } from '@/lib/authConfig';
import { OperationalMetricCard } from '@/components/ui/OperationalCards';

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

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <OperationalMetricCard label="Organizations" value={isLoading ? '...' : orgs.length} icon={Landmark} tone="default" />
                <OperationalMetricCard label="Access" value={isSuperAdmin ? 'Admin' : 'Member'} icon={ShieldAlert} tone={isSuperAdmin ? 'info' : 'default'} />
            </div>

            <div className="surface-panel rounded-[1.35rem] p-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Access Context</p>
                    <h2 className="text-lg font-black tracking-tight text-foreground">Choose the organization tied to the events you need to manage.</h2>
                    <p className="text-sm text-muted-foreground">If you only work with one organization, this should usually be quick.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        <div className="surface-panel col-span-full flex justify-center rounded-[2rem] py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : orgs.length === 0 ? (
                        <div className="surface-panel col-span-full rounded-[2rem] p-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
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
                                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>{isDevLoginEnabled ? 'Use Another Account' : 'Back to Sign In'}</span>
                                </button>
                                <button
                                    onClick={() => void fetchOrgs()}
                                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    <span>Refresh Organizations</span>
                                </button>
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/5"
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
                                    className="group surface-panel flex items-center justify-between p-6 rounded-[2rem] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all text-left min-h-[44px]"
                                >
                                    <div className="flex items-center space-x-5">
                                        <div className="p-4 rounded-2xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <Landmark className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-lg text-foreground leading-tight">{org.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mt-1">
                                                {isSuperAdmin ? 'Super Admin' : org.organization_members[0]?.role || 'Owner'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                        <div onClick={(e) => e.stopPropagation()}>
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
                            ))}

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="surface-panel flex items-center justify-center space-x-3 rounded-[2rem] border-2 border-dashed border-muted p-6 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary min-h-[44px]"
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
