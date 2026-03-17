import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ORGANIZATION_STORAGE_KEY = 'inouthub_org_id';
const EVENT_STORAGE_KEY = 'inouthub_event_id';
const EVENT_TIMEZONE_STORAGE_KEY = 'inouthub_event_timezone';
const SELECTION_OWNER_STORAGE_KEY = 'inouthub_selection_user_id';

function clearStoredSelection() {
    localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
    localStorage.removeItem(EVENT_STORAGE_KEY);
    localStorage.removeItem(EVENT_TIMEZONE_STORAGE_KEY);
    localStorage.removeItem(SELECTION_OWNER_STORAGE_KEY);
}

interface SelectionContextType {
    organizationId: string | null;
    eventId: string | null;
    eventTimezone: string | null;
    setOrganizationId: (id: string | null) => void;
    setEventId: (id: string | null, timeZone?: string | null) => void;
    clearSelection: () => void;
    isLoading: boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [organizationId, setOrgId] = useState<string | null>(null);
    const [eventId, setEvId] = useState<string | null>(null);
    const [eventTimezone, setEventTimezone] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount, validating the cached org ID still exists in DB.
    // This prevents stale IDs from ghost/deleted orgs or previous-user sessions causing RLS failures.
    useEffect(() => {
        const savedOrg = localStorage.getItem(ORGANIZATION_STORAGE_KEY);
        const savedEvent = localStorage.getItem(EVENT_STORAGE_KEY);
        const savedEventTimezone = localStorage.getItem(EVENT_TIMEZONE_STORAGE_KEY);
        const savedSelectionOwner = localStorage.getItem(SELECTION_OWNER_STORAGE_KEY);

        if (!savedOrg) {
            setIsLoading(false);
            return;
        }

        void (async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user || savedSelectionOwner !== user.id) {
                    clearStoredSelection();
                    return;
                }

                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('id', savedOrg)
                    .maybeSingle();

                if (!orgData) {
                    clearStoredSelection();
                    return;
                }

                setOrgId(savedOrg);

                if (!savedEvent) {
                    return;
                }

                const { data: eventData } = await supabase
                    .from('events')
                    .select('id, organization_id, timezone')
                    .eq('id', savedEvent)
                    .maybeSingle();

                if (eventData && eventData.organization_id === savedOrg) {
                    setEvId(savedEvent);
                    setEventTimezone(eventData.timezone || savedEventTimezone);
                    return;
                }

                localStorage.removeItem(EVENT_STORAGE_KEY);
                localStorage.removeItem(EVENT_TIMEZONE_STORAGE_KEY);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!organizationId && !eventId) {
            localStorage.removeItem(SELECTION_OWNER_STORAGE_KEY);
            return;
        }

        void (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                localStorage.setItem(SELECTION_OWNER_STORAGE_KEY, user.id);
            }
        })();
    }, [organizationId, eventId]);

    const setOrganizationId = (id: string | null) => {
        setOrgId(id);
        if (id) {
            localStorage.setItem(ORGANIZATION_STORAGE_KEY, id);
        } else {
            localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
            // Clearing org should clear event too
            setEvId(null);
            setEventTimezone(null);
            localStorage.removeItem(EVENT_STORAGE_KEY);
            localStorage.removeItem(EVENT_TIMEZONE_STORAGE_KEY);
        }
    };

    const setEventId = (id: string | null, timeZone?: string | null) => {
        setEvId(id);
        if (id) {
            localStorage.setItem(EVENT_STORAGE_KEY, id);
            if (timeZone) {
                setEventTimezone(timeZone);
                localStorage.setItem(EVENT_TIMEZONE_STORAGE_KEY, timeZone);
            }
        } else {
            setEventTimezone(null);
            localStorage.removeItem(EVENT_STORAGE_KEY);
            localStorage.removeItem(EVENT_TIMEZONE_STORAGE_KEY);
        }
    };

    const clearSelection = () => {
        setOrgId(null);
        setEvId(null);
        setEventTimezone(null);
        clearStoredSelection();
    };

    return (
        <SelectionContext.Provider value={{ organizationId, eventId, eventTimezone, setOrganizationId, setEventId, clearSelection, isLoading }}>
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
