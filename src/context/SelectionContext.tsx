import React, { createContext, useContext, useState, useEffect } from 'react';

interface SelectionContextType {
    organizationId: string | null;
    eventId: string | null;
    eventTimezone: string | null;
    setOrganizationId: (id: string | null) => void;
    setEventId: (id: string | null, timeZone?: string | null) => void;
    isLoading: boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [organizationId, setOrgId] = useState<string | null>(null);
    const [eventId, setEvId] = useState<string | null>(null);
    const [eventTimezone, setEventTimezone] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount, validating the cached org ID still exists in DB.
    // This prevents stale IDs from ghost/deleted orgs causing RLS failures.
    useEffect(() => {
        const savedOrg = localStorage.getItem('inouthub_org_id');
        const savedEvent = localStorage.getItem('inouthub_event_id');
        const savedEventTimezone = localStorage.getItem('inouthub_event_timezone');

        if (!savedOrg) {
            setIsLoading(false);
            return;
        }

        import('../lib/supabase').then(async ({ supabase }) => {
            try {
                // Validate Org exists
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('id', savedOrg)
                    .maybeSingle();

                if (orgData) {
                    setOrgId(savedOrg);

                    // If we have a saved event, validate it belongs to this org
                    if (savedEvent) {
                        const { data: eventData } = await supabase
                            .from('events')
                            .select('id, organization_id, timezone')
                            .eq('id', savedEvent)
                            .maybeSingle();

                        if (eventData && eventData.organization_id === savedOrg) {
                            setEvId(savedEvent);
                            setEventTimezone(eventData.timezone || savedEventTimezone);
                        } else {
                            localStorage.removeItem('inouthub_event_id');
                            localStorage.removeItem('inouthub_event_timezone');
                        }
                    }
                } else {
                    // Org is gone — clear everything
                    localStorage.removeItem('inouthub_org_id');
                    localStorage.removeItem('inouthub_event_id');
                    localStorage.removeItem('inouthub_event_timezone');
                }
            } finally {
                setIsLoading(false);
            }
        });
    }, []);

    const setOrganizationId = (id: string | null) => {
        setOrgId(id);
        if (id) {
            localStorage.setItem('inouthub_org_id', id);
        } else {
            localStorage.removeItem('inouthub_org_id');
            // Clearing org should clear event too
            setEvId(null);
            setEventTimezone(null);
            localStorage.removeItem('inouthub_event_id');
            localStorage.removeItem('inouthub_event_timezone');
        }
    };

    const setEventId = (id: string | null, timeZone?: string | null) => {
        setEvId(id);
        if (id) {
            localStorage.setItem('inouthub_event_id', id);
            if (timeZone) {
                setEventTimezone(timeZone);
                localStorage.setItem('inouthub_event_timezone', timeZone);
            }
        } else {
            setEventTimezone(null);
            localStorage.removeItem('inouthub_event_id');
            localStorage.removeItem('inouthub_event_timezone');
        }
    };

    return (
        <SelectionContext.Provider value={{ organizationId, eventId, eventTimezone, setOrganizationId, setEventId, isLoading }}>
            {children}
        </SelectionContext.Provider>
    );
}

export function useSelection() {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
}
