import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Building2,
    Calendar,
    Check,
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

type Stage = 'organization' | 'event';

interface WorkspaceSelectionSurfaceProps {
    stage: Stage;
}

interface OrganizationRecord {
    id: string;
    name: string;
    roleLabel: string;
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

    const [orgs, setOrgs] = useState<OrganizationRecord[]>([]);
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<EditableOrganization | null>(null);
    const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);

    useEffect(() => {
        void fetchOrgs();
    }, []);

    useEffect(() => {
        if (stage !== 'event') return;
        if (!organizationId) {
            navigate('/select-org', { replace: true, state: location.state });
            return;
        }
        void fetchEvents(organizationId);
    }, [stage, organizationId, navigate, location.state]);

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
                roleLabel: userIsSuperAdmin ? 'Super Admin' : org.organization_members?.[0]?.role || 'Member',
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
        setOrganizationId(orgId);
        setEventId(null);
        navigate('/select-event', { state: location.state });
    };

    const handleChangeOrg = () => {
        setEventId(null);
        setOrganizationId(null);
        navigate('/select-org', { replace: true, state: location.state });
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
                    <button
                        key={org.id}
                        onClick={() => handleOrgSelect(org.id)}
                        className="surface-panel flex min-h-[72px] w-full items-center justify-between gap-3 rounded-[1.5rem] border-border/60 px-5 py-4 text-left transition-colors hover:border-primary/35"
                    >
                        <div className="flex flex-1 min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="block max-w-full truncate whitespace-nowrap text-[1.1rem] font-black leading-tight text-foreground">{org.name}</p>
                                <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                                    {org.roleLabel}
                                </p>
                            </div>
                        </div>
                        {isSuperAdmin || org.roleLabel === 'Owner' || org.roleLabel === 'Admin' ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openOrgEditor({ id: org.id, name: org.name });
                                }}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={`Edit ${org.name}`}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        ) : null}
                    </button>
                ))}
            </div>
        );
    };

    const renderEvents = () => {
        if (isLoadingEvents) {
            return (
                <div className="surface-panel flex justify-center rounded-[1.5rem] py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }

        if (events.length === 0) {
            return (
                <div className="surface-panel rounded-[1.5rem] p-6 text-center">
                    <p className="text-sm font-bold text-foreground">No events yet in this organization.</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isSuperAdmin ? 'Create an event to continue into the app.' : 'Ask an administrator to add event access, then refresh.'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {events.map((event) => (
                    <button
                        key={event.id}
                        onClick={() => handleEventSelect(event.id, event.timezone)}
                        className="surface-panel w-full rounded-[1.35rem] px-5 py-4 text-left transition-colors hover:border-primary/35"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-1 min-w-0 items-start gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="block max-w-full truncate whitespace-nowrap text-base font-black leading-tight text-foreground">{event.name}</p>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="truncate">{formatDateRange(event.start_date, event.end_date)}</span>
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
                            {canEditOrganization ? (
                                <button
                                    type="button"
                                    onClick={(clickEvent) => {
                                        clickEvent.stopPropagation();
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
        );
    };

    return (
        <>
            <div className="mx-auto w-full max-w-2xl space-y-5 pb-20">
                <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-1">
                        <h1 className="text-[2rem] font-black tracking-tight text-foreground">
                            {stage === 'event' ? 'Choose Event' : 'Select Workspace'}
                        </h1>
                        {stage === 'organization' ? (
                            <p className="text-sm text-muted-foreground">Choose your organization</p>
                        ) : null}
                    </div>

                    {stage === 'organization' ? (
                        <button
                            onClick={() => setSearchOpen((open) => !open)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={searchOpen ? 'Hide organization search' : 'Search organizations'}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>

                {stage === 'organization' && searchOpen ? (
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

                {stage === 'event' && selectedOrg ? (
                    <button
                        onClick={handleChangeOrg}
                        className="surface-panel w-full rounded-[1.5rem] border-primary/35 px-4 py-3 text-left transition-colors hover:border-primary/50"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-1 min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="block max-w-full truncate whitespace-nowrap text-[1.05rem] font-black leading-tight text-foreground">{selectedOrg.name}</p>
                                    <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                                        {selectedOrg.roleLabel}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-primary">
                                <Check className="h-4 w-4 shrink-0" />
                            </div>
                        </div>
                    </button>
                ) : null}

                {stage === 'organization' ? renderOrgList() : renderEvents()}
            </div>

            {isSuperAdmin ? (
                <button
                    onClick={() => (stage === 'organization' ? setIsCreateOrgOpen(true) : setIsCreateEventOpen(true))}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-black/10 transition-colors hover:opacity-95"
                    aria-label={stage === 'organization' ? 'Create organization' : 'Create event'}
                >
                    <Plus className="h-5 w-5 stroke-[2.75]" />
                </button>
            ) : null}

            <CreateOrgModal
                isOpen={isCreateOrgOpen}
                onClose={() => {
                    setIsCreateOrgOpen(false);
                    setEditingOrg(null);
                }}
                initialData={editingOrg}
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
