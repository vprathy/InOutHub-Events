import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Loader2, ChevronRight, ChevronLeft, Edit2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { CreateEventModal } from '@/components/selection/CreateEventModal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ManageEventAccessModal } from '@/components/selection/ManageEventAccessModal';
import { ShieldAlert } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { PageHeader } from '@/components/layout/PageHeader';

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
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
            <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <BrandMark size="md" showLabel className="justify-center" />
                    </div>
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
                        <Calendar className="w-7 h-7" />
                    </div>
                    <PageHeader
                        title="Select Event"
                        subtitle="Select an event to manage"
                        align="center"
                    />
                </div>

                <div className="w-full">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Available Events
                        </span>
                        <button
                            onClick={() => void fetchEvents()}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Refresh</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            <div className="col-span-full flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : events.length === 0 ? (
                            <div className="col-span-full rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                    <Calendar className="h-7 w-7" />
                                </div>
                                <h2 className="text-xl font-black text-foreground">No events available</h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                                    This account is signed in, but there are no accessible events in the selected organization yet. Ask an admin for event access or refresh after access is granted.
                                </p>
                                <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                                    <button
                                        onClick={() => void fetchEvents()}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        <span>Refresh Events</span>
                                    </button>
                                    <button
                                        onClick={handleBack}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
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
                                        className="group flex items-center justify-between p-6 bg-card border border-border rounded-[2rem] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all text-left min-h-[44px]"
                                    >
                                        <div className="flex items-center space-x-5">
                                            <div className="p-4 rounded-2xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-lg text-foreground leading-tight">{event.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mt-1">
                                                    {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No Date Set'}
                                                    {event.timezone ? ` • ${event.timezone.split('/').pop()?.replace('_', ' ')}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                            <div onClick={(e) => e.stopPropagation()}>
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
                                ))}

                                <button
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="flex items-center justify-center space-x-3 p-6 border-4 border-dashed border-muted rounded-[2rem] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all font-black uppercase tracking-widest text-xs min-h-[44px]"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span>Create New Event</span>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="pt-8 border-t border-border flex justify-center">
                        <button
                            onClick={handleBack}
                            className="h-12 px-8 flex items-center justify-center space-x-3 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
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
        </div>
    );
}
