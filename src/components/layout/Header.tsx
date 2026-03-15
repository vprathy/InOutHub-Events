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
        <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-3 shadow-sm backdrop-blur sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center space-x-2 sm:space-x-4">
                <BrandMark size="sm" className="shrink-0 sm:hidden" />
                <BrandMark size="sm" showLabel className="hidden shrink-0 sm:flex" />

                {selectionNames?.orgName && (
                    <div className="flex min-w-0 items-center space-x-1 text-[10px] font-bold uppercase tracking-wider sm:space-x-2 sm:text-sm">
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                        <button
                            onClick={() => navigate('/select-org')}
                            className="flex min-h-[44px] max-w-[88px] items-center space-x-1 rounded-xl px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:max-w-none sm:space-x-2 sm:px-3"
                        >
                            <Landmark className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{selectionNames.orgName}</span>
                        </button>

                        {selectionNames.eventName && (
                            <>
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                                <button
                                    onClick={() => navigate('/select-event')}
                                    className="flex min-h-[44px] max-w-[112px] items-center space-x-1 rounded-xl px-2 py-2 text-primary transition-colors hover:bg-muted sm:max-w-none sm:space-x-2 sm:px-3"
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
                <div className="hidden sm:block">
                    <ThemeToggle />
                </div>
                <button
                    onClick={() => navigate('/dev/login')}
                    className="hidden h-11 rounded-xl bg-muted px-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:block"
                >
                    DEV
                </button>
                <button
                    onClick={handleLogout}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                    title="Sign Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
