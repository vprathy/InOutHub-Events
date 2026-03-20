import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Loader2, ChevronRight, ChevronLeft, Edit2, RefreshCw, UsersRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { CreateEventModal } from '@/components/selection/CreateEventModal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ManageEventAccessModal } from '@/components/selection/ManageEventAccessModal';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

function formatDateOnly(value: string | null | undefined) {
    if (!value) return 'No Date Set';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;

    return new Intl.DateTimeFormat('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
    if (!startDate) return 'No Date Set';
    if (!endDate || endDate === startDate) return formatDateOnly(startDate);
    return `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`;
}

export default function EventSelectionPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isManageAccessOpen, setIsManageAccessOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any | null>(null);
    const { organizationId, setEventId, setOrganizationId } = useSelection();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!organizationId) {
            navigate('/select-org');
            return;
        }
        fetchEvents();
    }, [organizationId, navigate]);

    async function fetchEvents() {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('organization_id', organizationId!)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSelect = (id: string, timeZone?: string | null) => {
        setEventId(id, timeZone);
        const destination = location.state?.from;
        const nextPath = destination?.pathname
            ? `${destination.pathname || ''}${destination.search || ''}${destination.hash || ''}`
            : '/dashboard';
        navigate(nextPath, { replace: true });
    };

    const handleCardKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLElement>, id: string) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault();
            const selectedEvent = events.find((entry) => entry.id === id);
            handleSelect(id, selectedEvent?.timezone);
        }
    };

    const handleBack = () => {
        setOrganizationId(null);
        navigate('/select-org');
    };

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Select Event"
                subtitle="Choose the event you want to operate."
            />

            <div className="surface-panel rounded-[1.35rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Event Triage</p>
                        <h2 className="text-lg font-black tracking-tight text-foreground">Choose the event you are actively operating right now.</h2>
                        <p className="text-sm text-muted-foreground">Keep this screen focused on event selection. Access and edit tools stay visible, but secondary.</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        <span className="rounded-full border border-border/70 bg-background px-3 py-2">
                            {isLoading ? 'Loading' : `${events.length} ${events.length === 1 ? 'Event' : 'Events'}`}
                        </span>
                        <span className="rounded-full border border-border/70 bg-background px-3 py-2">Active Context</span>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Available Events</p>
                        <p className="mt-1 text-sm text-muted-foreground">Tap a card to open the working event.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void fetchEvents()}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={() => {
                                setEditingEvent(null);
                                setIsCreateModalOpen(true);
                            }}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            <div className="surface-panel col-span-full flex justify-center rounded-[1.5rem] py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : events.length === 0 ? (
                            <div className="surface-panel col-span-full rounded-[1.5rem] p-8 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground">
                                    <Calendar className="h-7 w-7" />
                                </div>
                                <h2 className="text-xl font-black text-foreground">No events available</h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                                    This account is signed in, but there are no accessible events in the selected organization yet. Ask an admin for event access, then refresh this screen.
                                </p>
                                <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                                    <button
                                        onClick={() => void fetchEvents()}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        <span>Refresh Events</span>
                                    </button>
                                    <button
                                        onClick={handleBack}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span>Switch Organization</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSelect(event.id, event.timezone)}
                                        onKeyDown={(keyboardEvent) => handleCardKeyDown(keyboardEvent, event.id)}
                                        className="group surface-panel rounded-[1.5rem] p-4 text-left transition-colors hover:border-primary/40"
                                    >
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-primary">
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-lg font-black leading-tight text-foreground">{event.name}</p>
                                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                            {formatDateRange(event.start_date, event.end_date)}
                                                            {event.timezone ? ` • ${event.timezone.split('/').pop()?.replace('_', ' ')}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEventId(event.id, event.timezone);
                                                        navigate('/access');
                                                    }}
                                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                                                    aria-label={`Open access for ${event.name}`}
                                                >
                                                    <UsersRound className="h-4 w-4" />
                                                    <span>Access</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEventId(event.id, event.timezone);
                                                        setIsManageAccessOpen(true);
                                                    }}
                                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                                                >
                                                    <ShieldCheck className="h-4 w-4" />
                                                    <span>Quick Grant</span>
                                                </button>
                                                <div>
                                                    <ActionMenu
                                                        options={[
                                                            {
                                                                label: 'Edit Event',
                                                                icon: <Edit2 className="w-4 h-4" />,
                                                                onClick: () => {
                                                                    setEditingEvent(event);
                                                                    setIsCreateModalOpen(true);
                                                                }
                                                            },
                                                            {
                                                                label: 'Manage Access',
                                                                icon: <ShieldAlert className="w-4 h-4" />,
                                                                onClick: () => {
                                                                    setEventId(event.id, event.timezone);
                                                                    setIsManageAccessOpen(true);
                                                                }
                                                            }
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="surface-panel flex items-center justify-center space-x-3 rounded-[1.5rem] border-2 border-dashed border-muted p-6 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary min-h-[44px]"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span>Create New Event</span>
                                </button>
                            </>
                        )}
                    </div>

                <div className="pt-2 flex justify-start">
                    <button
                        onClick={handleBack}
                        className="h-11 px-4 flex items-center justify-center space-x-2 rounded-2xl border border-border text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Switch Organization</span>
                    </button>
                </div>
            </div>

            {organizationId && (
                <CreateEventModal
                    organizationId={organizationId}
                    isOpen={isCreateModalOpen}
                    initialData={editingEvent}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingEvent(null);
                    }}
                    onSuccess={({ id, timezone }) => {
                        if (editingEvent) {
                            fetchEvents();
                            setIsCreateModalOpen(false);
                            setEditingEvent(null);
                        } else {
                            handleSelect(id, timezone);
                        }
                    }}
                />
            )}

            <ManageEventAccessModal
                isOpen={isManageAccessOpen}
                onClose={() => {
                    setIsManageAccessOpen(false);
                    setEventId(null);
                }}
            />
        </div>
    );
}
