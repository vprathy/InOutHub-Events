import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Plus, Loader2, ChevronRight, LogOut, Edit2, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { CreateOrgModal } from '@/components/selection/CreateOrgModal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ManageOrgAccessModal } from '@/components/selection/ManageOrgAccessModal';
import { ShieldAlert } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAppSignOut } from '@/hooks/useAppSignOut';
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
    const signOut = useAppSignOut();

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

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
            <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <BrandMark size="md" showLabel className="justify-center" />
                    </div>
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
                        <Landmark className="w-7 h-7" />
                    </div>
                    <PageHeader
                        title="Select Organization"
                        subtitle="Choose an organization to manage events"
                        align="center"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : orgs.length === 0 ? (
                        <div className="col-span-full rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Landmark className="h-7 w-7" />
                            </div>
                            <h2 className="text-xl font-black text-foreground">No organizations available</h2>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                                {isSuperAdmin
                                    ? 'No organizations exist yet for this environment. Create one to continue.'
                                    : 'This account is signed in, but does not have organization access yet. Ask an administrator to grant access and then refresh this screen.'}
                            </p>
                            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                                {isDevLoginEnabled ? (
                                    <button
                                        onClick={() => navigate('/dev/login')}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>Back to Dev Login</span>
                                    </button>
                                ) : null}
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
                                    className="group flex items-center justify-between p-6 bg-card border border-border rounded-[2rem] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all text-left min-h-[44px]"
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
                                className="flex items-center justify-center space-x-3 p-6 border-4 border-dashed border-muted rounded-[2rem] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all font-black uppercase tracking-widest text-xs min-h-[44px]"
                            >
                                <Plus className="w-6 h-6" />
                                <span>Create New Organization</span>
                            </button>
                        </>
                    )}
                </div>

                <div className="pt-8 border-t border-border flex justify-center">
                    <button
                        onClick={handleLogout}
                        className="h-12 px-8 flex items-center justify-center space-x-3 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
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
