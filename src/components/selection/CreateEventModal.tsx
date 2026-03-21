import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_EVENT_TIMEZONE, getSupportedEventTimezones } from '@/lib/eventTime';

function getTodayDateInputValue() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

interface CreateEventModalProps {
    organizationId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (event: { id: string; timezone: string }) => void;
    initialData?: { id: string; name: string; start_date: string | null; end_date?: string | null; timezone?: string | null } | null;
}

export function CreateEventModal({ organizationId, isOpen, onClose, onSuccess, initialData }: CreateEventModalProps) {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [venue, setVenue] = useState('');
    const [timeZone, setTimeZone] = useState(DEFAULT_EVENT_TIMEZONE);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const timezoneOptions = getSupportedEventTimezones();
    const todayDate = getTodayDateInputValue();

    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name);
            setStartDate(initialData.start_date || '');
            setEndDate(initialData.end_date || initialData.start_date || '');
            setVenue('');
            setTimeZone(initialData.timezone || DEFAULT_EVENT_TIMEZONE);
        } else if (isOpen && !initialData) {
            setName('');
            setStartDate('');
            setEndDate('');
            setVenue('');
            setTimeZone(DEFAULT_EVENT_TIMEZONE);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !organizationId) return;
        if (startDate && startDate < todayDate) {
            setError('Start date cannot be in the past.');
            return;
        }
        if (startDate && endDate && endDate < startDate) {
            setError('End date cannot be earlier than start date.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (initialData) {
                const { error: updateError } = await supabase
                    .from('events')
                    .update({
                        name,
                        start_date: startDate || null,
                        end_date: endDate || startDate || null,
                        timezone: timeZone,
                    })
                    .eq('id', initialData.id);

                if (updateError) throw updateError;
                onSuccess({ id: initialData.id, timezone: timeZone });
            } else {
                const { data: event, error: eventError } = await supabase
                    .from('events')
                    .insert({
                        name,
                        organization_id: organizationId,
                        start_date: startDate || null,
                        end_date: endDate || startDate || null,
                        timezone: timeZone,
                    })
                    .select()
                    .single();

                if (eventError) throw eventError;

                onSuccess({ id: event.id, timezone: event.timezone || timeZone });
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create event');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">
                        {initialData ? 'Edit Event' : 'New Event'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Name</label>
                            <input
                                autoFocus
                                required
                                type="text"
                                placeholder="e.g. Spring Showcase 2026"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={startDate}
                                    min={todayDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate || todayDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Timezone</label>
                            <select
                                value={timeZone}
                                onChange={(e) => setTimeZone(e.target.value)}
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            >
                                {timezoneOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Venue</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="e.g. City Auditorium"
                                    value={venue}
                                    onChange={(e) => setVenue(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !name}
                        className="w-full py-4 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{initialData ? 'Save Changes' : 'Create Event'}</span>}
                    </button>
                </form>
            </div>
        </div>
    );
}
