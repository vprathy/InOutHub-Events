import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Landmark, Calendar, LogOut, Settings, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSelection } from '@/context/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { BrandMark } from '@/components/branding/BrandMark';
import { useAppSignOut } from '@/hooks/useAppSignOut';
import { isDevLoginEnabled } from '@/lib/authConfig';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ManageOrgAccessModal } from '@/components/selection/ManageOrgAccessModal';
import { ManageEventAccessModal } from '@/components/selection/ManageEventAccessModal';

export function Header() {
    const { organizationId, eventId } = useSelection();
    const navigate = useNavigate();
    const signOut = useAppSignOut();
    const { user } = useAuth();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isOrgAccessOpen, setIsOrgAccessOpen] = useState(false);
    const [isEventAccessOpen, setIsEventAccessOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
        return fullName || profile?.email || user?.email || 'Signed In';
    }, [profile?.email, profile?.first_name, profile?.last_name, user?.email]);

    const emailLabel = profile?.email || user?.email || null;
    const appVariantLabel = (import.meta.env.VITE_APP_VARIANT_LABEL || '').trim();
    const initials = useMemo(() => {
        const source = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || displayName;
        return source
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || 'IU';
    }, [displayName, profile?.first_name, profile?.last_name]);
    const canManageOrgAccess = currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const canManageEventAccess = currentEventRole === 'EventAdmin' || canManageOrgAccess;

    return (
        <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-3 shadow-sm backdrop-blur sm:h-16 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <BrandMark size="sm" className="shrink-0 sm:hidden" />
                    <BrandMark size="sm" showLabel className="hidden shrink-0 sm:flex" />
                    {appVariantLabel ? (
                        <span className="inline-flex min-h-[22px] items-center rounded-full border border-border/60 bg-muted/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">
                            {appVariantLabel}
                        </span>
                    ) : null}
                </div>

                {selectionNames?.orgName && (
                    <div className="flex min-w-0 sm:hidden">
                        <button
                            onClick={() => navigate(eventId ? '/select-event' : '/select-org')}
                            className="flex min-h-[40px] max-w-[160px] items-center gap-2 rounded-xl px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {selectionNames.eventName ? (
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                            ) : (
                                <Landmark className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                            <span className="truncate">{selectionNames.eventName || selectionNames.orgName}</span>
                        </button>
                    </div>
                )}

                {selectionNames?.orgName && (
                    <div className="hidden min-w-0 items-center space-x-1 text-[10px] font-bold uppercase tracking-wider sm:flex sm:space-x-2 sm:text-sm">
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

            <div className="ml-2 flex shrink-0 items-center space-x-1 sm:space-x-2">
                {canManageEventAccess && eventId ? (
                    <button
                        onClick={() => navigate('/requirements')}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10 sm:min-h-[44px] sm:px-3"
                        aria-label="Manage Requirements"
                        title="Manage Requirements"
                    >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        <span>Reqs</span>
                    </button>
                ) : null}
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-[10px] font-black uppercase tracking-[0.18em] text-foreground sm:h-9 sm:w-9 sm:rounded-xl sm:text-xs">
                            {initials}
                        </div>
                    </button>

                    {isProfileMenuOpen ? (
                        <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl z-[100] animate-in slide-in-from-top-2 duration-150">
                            <div className="border-b border-border/60 px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-sm font-black uppercase tracking-[0.18em] text-foreground">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-foreground">{displayName}</p>
                                        {emailLabel ? <p className="truncate text-xs text-muted-foreground">{emailLabel}</p> : null}
                                    </div>
                                </div>
                            </div>

                            <div className="px-2 py-2">
                                <div className="mb-2 rounded-xl border border-border/60 bg-background/50 px-3 py-3">
                                    <div className="mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Appearance</p>
                                        <p className="text-xs text-muted-foreground">Light, dark, or system mode.</p>
                                    </div>
                                    <ThemeToggle />
                                </div>
                                {canManageOrgAccess ? (
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            setIsOrgAccessOpen(true);
                                        }}
                                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span>Manage Org Access</span>
                                    </button>
                                ) : null}
                                {canManageEventAccess && eventId ? (
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            setIsEventAccessOpen(true);
                                        }}
                                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span>Manage Event Access</span>
                                    </button>
                                ) : null}
                                {canManageEventAccess && eventId ? (
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            navigate('/requirements');
                                        }}
                                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span>Manage Requirements</span>
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        setIsSettingsOpen(true);
                                    }}
                                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>Profile</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        void handleLogout();
                                    }}
                                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {isSettingsOpen ? (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="space-y-1">
                            <h2 className="text-xl font-black tracking-tight text-foreground">Profile & Settings</h2>
                            <p className="text-sm text-muted-foreground">Prototype account controls for the app shell.</p>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 text-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-foreground">Session Behavior</p>
                                        <p className="text-sm text-muted-foreground">Authentication persists across the current device context, and inactivity still signs out after 30 minutes.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                                <p className="text-sm font-black text-foreground">Signed In As</p>
                                <p className="mt-1 text-sm text-muted-foreground">{displayName}</p>
                                {emailLabel ? <p className="text-sm text-muted-foreground">{emailLabel}</p> : null}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="min-h-[44px] rounded-2xl bg-muted px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-accent"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <ManageOrgAccessModal
                isOpen={isOrgAccessOpen}
                onClose={() => setIsOrgAccessOpen(false)}
            />
            <ManageEventAccessModal
                isOpen={isEventAccessOpen}
                onClose={() => setIsEventAccessOpen(false)}
            />
        </header>
    );
}
