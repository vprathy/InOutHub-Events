import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Loader2, ChevronRight, ChevronLeft, Edit2, Archive, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSelection } from '../../context/SelectionContext';
import { CreateEventModal } from '../../components/selection/CreateEventModal';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { ManageEventAccessModal } from '../../components/selection/ManageEventAccessModal';
import { ShieldAlert } from 'lucide-react';

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

    const handleBack = () => {
        setOrganizationId(null);
        navigate('/select-org');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Select Event</h1>
                    <p className="text-sm text-muted-foreground">Select an active event to manage</p>
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

                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : (
                            <>
                                {events.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => handleSelect(event.id)}
                                        className="w-full group flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">{event.name}</p>
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No Date Set'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
                                    </button>
                                ))}

                                <button
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all font-bold text-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>Create New Event</span>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="pt-4 border-t border-border">
                        <button
                            onClick={handleBack}
                            className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
