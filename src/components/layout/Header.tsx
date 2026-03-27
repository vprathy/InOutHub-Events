import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Calendar, LogOut, ShieldCheck, Moon, UserRound } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { BrandMark } from '@/components/branding/BrandMark';
import { useAppSignOut } from '@/hooks/useAppSignOut';
import { isDevLoginEnabled } from '@/lib/authConfig';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ManageOrgAccessModal } from '@/components/selection/ManageOrgAccessModal';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useTheme } from '@/components/theme/ThemeProvider';

export function Header() {
    const { organizationId, eventId } = useSelection();
    const navigate = useNavigate();
    const location = useLocation();
    const signOut = useAppSignOut();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isOrgAccessOpen, setIsOrgAccessOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { data: isSuperAdmin = false } = useIsSuperAdmin();

    const handleLogout = async () => {
        await signOut();
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

    const { data: profile } = useQuery({
        queryKey: ['header-user-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data } = await supabase
                .from('user_profiles')
                .select('first_name, last_name, email')
                .eq('id', user.id)
                .maybeSingle();

            return data;
        },
        enabled: !!user,
    });

    const { data: previousLoginAt } = useQuery({
        queryKey: ['header-previous-login', user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await supabase
                .from('auth_events')
                .select('created_at')
                .eq('user_id', user.id)
                .eq('event_type', 'login_completed')
                .order('created_at', { ascending: false })
                .limit(2);

            if (error) throw error;
            if (!data?.length) return null;

            return data[1]?.created_at || null;
        },
        enabled: !!user,
    });

    const { data: currentOrgRole } = useQuery({
        queryKey: ['header-current-org-role', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await (supabase as any).rpc('auth_org_role', {
                p_org_id: organizationId,
            });
            if (error) throw error;
            return data as string | null;
        },
        enabled: !!organizationId,
    });

    const { data: currentEventRole } = useQuery({
        queryKey: ['header-current-event-role', eventId],
        queryFn: async () => {
            if (!eventId) return null;
            const { data, error } = await (supabase as any).rpc('auth_event_role', {
                p_event_id: eventId,
            });
            if (error) throw error;
            return data as string | null;
        },
        enabled: !!eventId,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        if (isProfileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileMenuOpen]);

    const displayName = useMemo(() => {
        const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
        if (fullName) return fullName;

        const metadataName = ((user as any)?.user_metadata?.full_name as string | undefined)?.trim();
        if (metadataName) return metadataName;

        const emailSource = profile?.email || user?.email || '';
        if (emailSource) {
            const localPart = emailSource.split('@')[0] || '';
            const normalized = localPart
                .replace(/[._-]+/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase())
                .trim();
            if (normalized) return normalized;
        }

        return 'Signed In User';
    }, [profile?.email, profile?.first_name, profile?.last_name, user]);

    const emailLabel = profile?.email || user?.email || null;
    const appVariantLabel = (import.meta.env.VITE_APP_VARIANT_LABEL || '').trim();
    const canManageOrgAccess = isSuperAdmin || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const canManageEventAccess = isSuperAdmin || currentEventRole === 'EventAdmin' || canManageOrgAccess;
    const isSelectionRoute = location.pathname === '/select-org' || location.pathname === '/select-event';
    const themeActionLabel = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    const lastLoginLabel = useMemo(() => {
        const raw = previousLoginAt;
        if (!raw) return null;
        const value = new Date(raw);
        if (Number.isNaN(value.getTime())) return null;
        const sameDay = new Date().toDateString() === value.toDateString();
        const time = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(value);
        if (sameDay) return `Last login: Today, ${time}`;
        const day = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
        }).format(value);
        return `Last login: ${day}, ${time}`;
    }, [previousLoginAt]);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur">
            <div className="mx-auto flex h-14 w-full min-w-0 max-w-screen-xl items-center justify-between px-4 sm:h-16 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
                <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
                    <BrandMark size="sm" showLabel className="shrink-0" />
                    {appVariantLabel && !isSelectionRoute ? (
                        <span className="inline-flex min-h-[22px] items-center rounded-full border border-border/60 bg-muted/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">
                            {appVariantLabel}
                        </span>
                    ) : null}
                </div>

                {selectionNames?.orgName && !isSelectionRoute && (
                    <div className="flex min-w-0">
                        <button
                            onClick={() => navigate('/select-org')}
                            className="flex min-h-[44px] max-w-[210px] items-center gap-2 rounded-2xl border border-border/70 bg-background/75 px-3 py-2 text-left transition-colors hover:bg-muted/70 sm:max-w-[260px]"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                {selectionNames.eventName ? (
                                    <Calendar className="h-4 w-4" />
                                ) : (
                                    <Landmark className="h-4 w-4" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                                <p className="truncate text-sm font-bold text-foreground">{selectionNames.eventName || selectionNames.orgName}</p>
                            </div>
                        </button>
                    </div>
                )}
                </div>

                <div className="ml-2 flex shrink-0 items-center space-x-1 sm:space-x-2">
                {isDevLoginEnabled ? (
                    <button
                        onClick={() => navigate('/dev/login')}
                        className="hidden h-11 rounded-xl bg-muted px-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:block"
                    >
                        DEV
                    </button>
                ) : null}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen((open) => !open)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-11 sm:w-11"
                            title="Profile Menu"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-9 sm:w-9">
                                <UserRound className="h-4 w-4" />
                            </div>
                        </button>

                    {isProfileMenuOpen ? (
                        <div className="absolute right-0 mt-2 z-[100] w-72 overflow-hidden rounded-[1.35rem] border border-border/80 bg-card shadow-2xl animate-in slide-in-from-top-2 duration-150">
                            <div className="border-b border-border/60 px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-foreground">{displayName}</p>
                                        {emailLabel ? <p className="truncate text-xs text-muted-foreground">{emailLabel}</p> : null}
                                        {lastLoginLabel ? <p className="mt-1 text-xs text-muted-foreground">{lastLoginLabel}</p> : null}
                                    </div>
                                </div>
                            </div>

                            <div className="px-2 py-2">
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Moon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1">{themeActionLabel}</span>
                                </button>
                                {!isSelectionRoute && canManageEventAccess && eventId && !canManageOrgAccess ? (
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            navigate('/admin/access');
                                        }}
                                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span>Event Access</span>
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        void handleLogout();
                                    }}
                                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            </div>

            <ManageOrgAccessModal
                isOpen={isOrgAccessOpen}
                onClose={() => setIsOrgAccessOpen(false)}
            />
        </header>
    );
}
