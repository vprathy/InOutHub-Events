import { useNavigate } from 'react-router-dom';
import { ChevronRight, Landmark, Calendar, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSelection } from '@/context/SelectionContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrandMark } from '@/components/branding/BrandMark';

export function Header() {
    const { organizationId, eventId, setOrganizationId } = useSelection();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setOrganizationId(null);
        queryClient.clear();
        navigate('/dev/login');
    };

    // Fetch names for breadcrumb
    const { data: selectionNames } = useQuery({
        queryKey: ['selection-names', organizationId, eventId],
        queryFn: async () => {
            if (!organizationId) return null;

            const { data: org } = await supabase.from('organizations').select('name').eq('id', organizationId).single();

            let eventName = null;
            if (eventId) {
                const { data: event } = await supabase
                    .from('events')
                    .select('name, organization_id')
                    .eq('id', eventId)
                    .maybeSingle();

                // Only show event name if it belongs to this organization
                if (event && event.organization_id === organizationId) {
                    eventName = event.name;
                }
            }

            return { orgName: org?.name, eventName };
        },
        enabled: !!organizationId
    });

    return (
        <header className="sticky top-0 w-full h-16 bg-background/95 backdrop-blur shadow-sm border-b border-border z-50 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
                <BrandMark size="sm" showLabel className="shrink-0" />

                {selectionNames?.orgName && (
                    <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-sm font-bold uppercase tracking-wider overflow-hidden">
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                        <button
                            onClick={() => navigate('/select-org')}
                            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground min-h-[44px] max-w-[80px] sm:max-w-none"
                        >
                            <Landmark className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{selectionNames.orgName}</span>
                        </button>

                        {selectionNames.eventName && (
                            <>
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                                <button
                                    onClick={() => navigate('/select-event')}
                                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted transition-colors text-primary min-h-[44px] max-w-[100px] sm:max-w-none"
                                >
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{selectionNames.eventName}</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-2">
                <ThemeToggle />
                <button
                    onClick={() => navigate('/dev/login')}
                    className="h-11 px-4 rounded-xl bg-muted text-[11px] font-black tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                    DEV
                </button>
                <button
                    onClick={handleLogout}
                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Sign Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
