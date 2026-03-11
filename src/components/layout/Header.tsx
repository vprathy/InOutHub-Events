import { useNavigate } from 'react-router-dom';
import { Radio, ChevronRight, Landmark, Calendar, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSelection } from '@/context/SelectionContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <span className="font-bold tracking-tight text-foreground hidden sm:inline-block">
                        InOutHub <span className="text-muted-foreground font-medium">Events</span>
                    </span>
                </div>

                {selectionNames?.orgName && (
                    <div className="hidden md:flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <button
                            onClick={() => navigate('/select-org')}
                            className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Landmark className="w-3 h-3" />
                            <span>{selectionNames.orgName}</span>
                        </button>

                        {selectionNames.eventName && (
                            <>
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                <button
                                    onClick={() => navigate('/select-event')}
                                    className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-primary"
                                >
                                    <Calendar className="w-3 h-3" />
                                    <span>{selectionNames.eventName}</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-3">
                <ThemeToggle />
                <button
                    onClick={() => navigate('/dev/login')}
                    className="px-3 py-1.5 rounded-full bg-muted text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                    DEV
                </button>
                <button
                    onClick={handleLogout}
                    className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Sign Out"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
