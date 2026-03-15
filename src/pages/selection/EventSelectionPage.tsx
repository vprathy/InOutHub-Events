import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Loader2, ChevronRight, ChevronLeft, Edit2, Archive, RefreshCw } from 'lucide-react';
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
    const [showArchived, setShowArchived] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any | null>(null);
    const { organizationId, setEventId, setOrganizationId } = useSelection();
    const navigate = useNavigate();

    useEffect(() => {
        if (!organizationId) {
            navigate('/select-org');
            return;
        }
        fetchEvents();
    }, [organizationId, showArchived]);

    async function fetchEvents() {
        setIsLoading(true);
        try {
            let query = supabase
                .from('events')
                .select('*')
                .eq('organization_id', organizationId!)
                .order('start_date', { ascending: false });

            if (!showArchived) {
                query = query.eq('status', 'active');
            }

            const { data, error } = await query;

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const toggleEventStatus = async (eventId: string, newStatus: 'active' | 'archived') => {
        try {
            const { error } = await supabase
                .from('events')
                .update({ status: newStatus })
                .eq('id', eventId);
            if (error) throw error;
            fetchEvents();
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    const handleSelect = (id: string) => {
        setEventId(id);
        navigate('/dashboard');
    };

    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>, id: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect(id);
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
                        subtitle="Select an active event to manage"
                        align="center"
                    />
                </div>

                <div className="w-full">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {showArchived ? 'All Events' : 'Active Events'}
                        </span>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                            {showArchived ? 'Hide Archived' : 'Show Archived'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            <div className="col-span-full flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : (
                            <>
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSelect(event.id)}
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
                                                        event.status === 'active' || !event.status ? {
                                                            label: 'Archive Event',
                                                            icon: <Archive className="w-4 h-4" />,
                                                            onClick: () => toggleEventStatus(event.id, 'archived')
                                                        } : {
                                                            label: 'Unarchive Event',
                                                            icon: <RefreshCw className="w-4 h-4" />,
                                                            onClick: () => toggleEventStatus(event.id, 'active')
                                                        },
                                                        {
                                                            label: 'Manage Access',
                                                            icon: <ShieldAlert className="w-4 h-4" />,
                                                            onClick: () => {
                                                                setEventId(event.id);
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
                        onSuccess={(id) => {
                            if (editingEvent) {
                                fetchEvents();
                                setIsCreateModalOpen(false);
                                setEditingEvent(null);
                            } else {
                                handleSelect(id);
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
