import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Loader2,
    MoreVertical,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { CreateOrgModal } from '@/components/selection/CreateOrgModal';
import { CreateEventModal } from '@/components/selection/CreateEventModal';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useOnboardingCapabilities } from '@/hooks/useOnboardingCapabilities';
import { useAppSignOut } from '@/hooks/useAppSignOut';

type Stage = 'organization' | 'event';

interface WorkspaceSelectionSurfaceProps {
    stage: Stage;
}

interface OrganizationRecord {
    id: string;
    name: string;
    roleLabel: string;
    reviewStatus: string;
}

interface EventRecord {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    timezone: string | null;
    status: 'live' | 'upcoming' | 'past';
}

interface EditableOrganization {
    id: string;
    name: string;
    reviewStatus: string;
}

interface EditableEvent {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    timezone: string | null;
}

function formatDateOnly(value: string | null | undefined) {
    if (!value) return 'No date set';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
    if (!startDate) return 'No date set';
    if (!endDate || endDate === startDate) return formatDateOnly(startDate);
    return `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`;
}

function getEventStatus(startDate?: string | null, endDate?: string | null): EventRecord['status'] {
    if (!startDate) return 'upcoming';

    const today = new Date();
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate || startDate}T23:59:59`).getTime();

    if (todayKey >= start && todayKey <= end) return 'live';
    if (todayKey < start) return 'upcoming';
    return 'past';
}

function eventStatusOrder(status: EventRecord['status']) {
    if (status === 'live') return 0;
    if (status === 'upcoming') return 1;
    return 2;
}

function statusBadgeClasses(status: EventRecord['status']) {
    if (status === 'live') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
    if (status === 'upcoming') return 'border-sky-500/30 bg-sky-500/10 text-sky-600';
    return 'border-border/70 bg-muted/60 text-muted-foreground';
}

export function WorkspaceSelectionSurface({ stage }: WorkspaceSelectionSurfaceProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { organizationId, setOrganizationId, setEventId } = useSelection();
    const signOut = useAppSignOut();

    const [orgs, setOrgs] = useState<OrganizationRecord[]>([]);
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<EditableOrganization | null>(null);
    const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);
    const onboarding = useOnboardingState(organizationId, null);
    const onboardingCapabilities = useOnboardingCapabilities(organizationId, null);

    useEffect(() => {
        void fetchOrgs();
    }, []);

    useEffect(() => {
        if (!organizationId) return;
        setExpandedOrgId(organizationId);
        void fetchEvents(organizationId);
    }, [organizationId]);

    useEffect(() => {
        if (stage === 'organization' && !organizationId && onboarding.suggestedOrganizationId) {
            handleOrgSelect(onboarding.suggestedOrganizationId);
        }
    }, [stage, organizationId, onboarding.suggestedOrganizationId]);

    async function fetchOrgs() {
        setIsLoadingOrgs(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

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
                ? supabase.from('organizations').select('id, name').order('name')
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

            const mapped = (data || []).map((org: any) => ({
                id: org.id,
                name: org.name,
                roleLabel: userIsSuperAdmin ? 'Admin' : org.organization_members?.[0]?.role || 'Member',
                reviewStatus: 'approved',
            }));

            setOrgs(mapped);
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setIsLoadingOrgs(false);
        }
    }

    async function fetchEvents(orgId: string) {
        setIsLoadingEvents(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id, name, start_date, end_date, timezone')
                .eq('organization_id', orgId);

            if (error) throw error;

            const mapped = (data || [])
                .map((event) => ({
                    ...event,
                    status: getEventStatus(event.start_date, event.end_date),
                }))
                .sort((a, b) => {
                    const statusDelta = eventStatusOrder(a.status) - eventStatusOrder(b.status);
                    if (statusDelta !== 0) return statusDelta;

                    const aTime = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
                    const bTime = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;

                    if (a.status === 'past' && b.status === 'past') return bTime - aTime;
                    return aTime - bTime;
                });

            setEvents(mapped);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setIsLoadingEvents(false);
        }
    }

    const filteredOrgs = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return orgs;
        return orgs.filter((org) => org.name.toLowerCase().includes(query));
    }, [orgs, searchQuery]);

    const selectedOrg = useMemo(
        () => orgs.find((org) => org.id === organizationId) || null,
        [orgs, organizationId],
    );
    const canEditOrganization = useMemo(
        () => isSuperAdmin || selectedOrg?.roleLabel === 'Owner' || selectedOrg?.roleLabel === 'Admin',
        [isSuperAdmin, selectedOrg?.roleLabel],
    );

    const handleOrgSelect = (orgId: string) => {
        const nextExpanded = expandedOrgId === orgId ? null : orgId;
        setExpandedOrgId(nextExpanded);

        if (nextExpanded) {
            if (organizationId !== orgId) {
                setOrganizationId(orgId);
                setEventId(null);
            }
            void fetchEvents(orgId);
            return;
        }

        if (organizationId === orgId) {
            setEventId(null);
        }
    };

    const openOrgEditor = (org: EditableOrganization) => {
        setEditingOrg(org);
        setIsCreateOrgOpen(true);
    };

    const openEventEditor = (event: EditableEvent) => {
        setEditingEvent(event);
        setIsCreateEventOpen(true);
    };

    const handleEventSelect = (eventId: string, timeZone?: string | null) => {
        setEventId(eventId, timeZone);
        const destination = location.state?.from;
        const nextPath = destination?.pathname
            ? `${destination.pathname || ''}${destination.search || ''}${destination.hash || ''}`
            : '/dashboard';
        navigate(nextPath, { replace: true });
    };

    const renderOrgList = () => {
        if (isLoadingOrgs) {
            return (
                <div className="surface-panel flex justify-center rounded-[1.5rem] py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }

        if (filteredOrgs.length === 0) {
            if (onboarding.mode === 'founder_onboarding') {
                return (
                    <div className="surface-panel rounded-[1.5rem] p-6 sm:p-7">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">First Workspace</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Start your organization</h2>
                        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                            Create your organization first, then add the first event. Your workspace opens immediately while pilot review happens in the background.
                        </p>
                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={() => setIsCreateOrgOpen(true)}
                                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
                            >
                                Create Organization
                            </button>
                        </div>
                    </div>
                );
            }

            if (onboarding.mode === 'pending_access') {
                return (
                    <div className="surface-panel rounded-[1.5rem] p-6 sm:p-7">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Invite Pending</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">We found access waiting for you</h2>
                        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                            Your first sign-in is complete, but the invited workspace is still syncing. Refresh in a moment, or sign out and retry with the invited email if this looks wrong.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
                            >
                                Refresh Access
                            </button>
                            <button
                                type="button"
                                onClick={() => void signOut()}
                                className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-black text-foreground"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="surface-panel rounded-[1.5rem] p-6 text-center">
                    <p className="text-sm font-bold text-foreground">
                        {searchQuery ? 'No organizations match that search.' : 'No organizations available yet.'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {searchQuery
                            ? 'Try a shorter search or clear the search field.'
                            : isSuperAdmin
                                ? 'Create an organization to continue.'
                                : 'Ask an administrator for organization access, then refresh this screen.'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {filteredOrgs.map((org) => (
                    <div
                        key={org.id}
                        className={`surface-panel overflow-hidden rounded-[1.5rem] border-border/60 transition-colors ${expandedOrgId === org.id ? 'border-primary/35' : 'hover:border-primary/35'}`}
                    >
                        <div className="flex items-center gap-3 px-5 py-3.5">
                            <button
                                type="button"
                                onClick={() => handleOrgSelect(org.id)}
                                className="flex min-h-[44px] flex-1 min-w-0 items-center gap-3 text-left"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="block max-w-full truncate whitespace-nowrap text-[1.05rem] font-black leading-tight text-foreground">{org.name}</p>
                                    <div className="mt-1 flex min-w-0 items-center gap-2">
                                        <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                                            {org.roleLabel}
                                        </p>
                                        {org.reviewStatus === 'pending_review' ? (
                                            <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                                                Pilot Review
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-primary">
                                    {organizationId === org.id ? <Check className="h-4 w-4 shrink-0" /> : null}
                                    {expandedOrgId === org.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                </div>
                            </button>
                            {isSuperAdmin || org.roleLabel === 'Owner' || org.roleLabel === 'Admin' ? (
                                <button
                                    type="button"
                                    onClick={() => openOrgEditor({ id: org.id, name: org.name, reviewStatus: org.reviewStatus })}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    aria-label={`Edit ${org.name}`}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>

                        {expandedOrgId === org.id ? (
                            <div className="border-t border-border/50 px-4 pb-4 pt-3">
                                {isLoadingEvents && organizationId === org.id ? (
                                    <div className="flex justify-center rounded-[1.25rem] py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : events.length === 0 ? (
                                    <div className="rounded-[1.25rem] border border-border/70 bg-background/60 p-4">
                                        <p className="text-sm font-bold text-foreground">No events yet in this organization.</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {isSuperAdmin || org.roleLabel === 'Owner' || org.roleLabel === 'Admin'
                                                ? 'Create the first event to open this workspace.'
                                                : 'An administrator needs to create the first event.'}
                                        </p>
                                        {isSuperAdmin || org.roleLabel === 'Owner' || org.roleLabel === 'Admin' ? (
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrganizationId(org.id);
                                                        setIsCreateEventOpen(true);
                                                    }}
                                                    className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
                                                >
                                                    Create Event
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {events.map((event) => (
                                            <button
                                                key={event.id}
                                                onClick={() => handleEventSelect(event.id, event.timezone)}
                                                className="surface-panel w-full rounded-[1.25rem] px-4 py-2.5 text-left transition-colors hover:border-primary/35"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                            <Calendar className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="block max-w-full truncate whitespace-nowrap text-base font-black leading-tight text-foreground">{event.name}</p>
                                                            <div className="mt-1 flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground sm:text-sm">
                                                                <span className="min-w-0 flex-1 truncate leading-5">{formatDateRange(event.start_date, event.end_date)}</span>
                                                                {event.status !== 'past' ? (
                                                                    <span
                                                                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusBadgeClasses(event.status)}`}
                                                                    >
                                                                        {event.status}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSuperAdmin || org.roleLabel === 'Owner' || org.roleLabel === 'Admin' ? (
                                                        <button
                                                            type="button"
                                                            onClick={(clickEvent) => {
                                                                clickEvent.stopPropagation();
                                                                setOrganizationId(org.id);
                                                                openEventEditor({
                                                                    id: event.id,
                                                                    name: event.name,
                                                                    start_date: event.start_date,
                                                                    end_date: event.end_date,
                                                                    timezone: event.timezone,
                                                                });
                                                            }}
                                                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            aria-label={`Edit ${event.name}`}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="mx-auto w-full max-w-2xl space-y-5 pb-20">
                <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-1">
                        <h1 className="text-[2rem] font-black tracking-tight text-foreground">
                            Select Workspace
                        </h1>
                        <p className="text-sm text-muted-foreground">Choose organization and event</p>
                    </div>

                    {onboarding.mode === 'org_selection' ? (
                        <button
                            onClick={() => setSearchOpen((open) => !open)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={searchOpen ? 'Hide organization search' : 'Search organizations'}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>

                {onboarding.mode === 'org_selection' && searchOpen ? (
                    <div className="surface-panel flex items-center gap-3 rounded-[1.2rem] px-4 py-3">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search organizations..."
                            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        {searchQuery ? (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label="Clear organization search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {renderOrgList()}
            </div>

            {(selectedOrg && canEditOrganization) || (!selectedOrg && (isSuperAdmin || onboardingCapabilities.canCreateFirstOrganization)) ? (
                <button
                    onClick={() => {
                        if (selectedOrg && canEditOrganization) {
                            setIsCreateEventOpen(true);
                            return;
                        }
                        setIsCreateOrgOpen(true);
                    }}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-black/10 transition-colors hover:opacity-95"
                    aria-label={selectedOrg && canEditOrganization ? 'Create event' : 'Create organization'}
                >
                    <Plus className="h-4.5 w-4.5 stroke-[2.75]" />
                </button>
            ) : null}

            <CreateOrgModal
                isOpen={isCreateOrgOpen}
                onClose={() => {
                    setIsCreateOrgOpen(false);
                    setEditingOrg(null);
                }}
                initialData={editingOrg}
                requiresReviewOnCreate={Boolean(!editingOrg && onboardingCapabilities.canCreateFirstOrganization)}
                onSuccess={(orgId) => {
                    void fetchOrgs();
                    const wasEditing = Boolean(editingOrg);
                    setEditingOrg(null);
                    if (!wasEditing) {
                        handleOrgSelect(orgId);
                    }
                }}
            />

            <CreateEventModal
                organizationId={organizationId || ''}
                isOpen={isCreateEventOpen}
                onClose={() => {
                    setIsCreateEventOpen(false);
                    setEditingEvent(null);
                }}
                initialData={editingEvent}
                onSuccess={(event) => {
                    if (organizationId) {
                        void fetchEvents(organizationId);
                    }
                    const wasEditing = Boolean(editingEvent);
                    setEditingEvent(null);
                    if (!wasEditing) {
                        handleEventSelect(event.id, event.timezone);
                    }
                }}
            />
        </>
    );
}
