import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Plus, Loader2, ChevronRight, LogOut, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSelection } from '../../context/SelectionContext';
import { CreateOrgModal } from '../../components/selection/CreateOrgModal';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { ManageOrgAccessModal } from '../../components/selection/ManageOrgAccessModal';
import { ShieldAlert } from 'lucide-react';

export default function OrgSelectionPage() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isManageAccessOpen, setIsManageAccessOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<{ id: string; name: string } | null>(null);
    const { setOrganizationId } = useSelection();
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrgs();
    }, []);

    async function fetchOrgs() {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/dev/login');
                return;
            }

            const { data, error } = await supabase
                .from('organizations')
                .select(`
          id,
          name,
          organization_members!inner (
            role
          )
        `);

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
        navigate('/select-event');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/dev/login');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
                        <Landmark className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Select Organization</h1>
                    <p className="text-sm text-muted-foreground">Choose an organization to manage events</p>
                </div>

                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : (
                        <>
                            {orgs.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => handleSelect(org.id)}
                                    className="w-full group flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <Landmark className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{org.name}</p>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                                {org.organization_members[0]?.role || 'Owner'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
                                                        // Temporarily set context to view access, but don't navigate
                                                        setOrganizationId(org.id);
                                                        setIsManageAccessOpen(true);
                                                    }
                                                }
                                            ]}
                                        />
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all font-bold text-sm"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create New Organization</span>
                            </button>
                        </>
                    )}
                </div>

                <div className="pt-4 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
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
