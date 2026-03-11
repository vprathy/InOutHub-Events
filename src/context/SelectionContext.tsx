import React, { createContext, useContext, useState, useEffect } from 'react';

interface SelectionContextType {
    organizationId: string | null;
    eventId: string | null;
    setOrganizationId: (id: string | null) => void;
    setEventId: (id: string | null) => void;
    isLoading: boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [organizationId, setOrgId] = useState<string | null>(null);
    const [eventId, setEvId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount, validating the cached org ID still exists in DB.
    // This prevents stale IDs from ghost/deleted orgs causing RLS failures.
    useEffect(() => {
        const savedOrg = localStorage.getItem('inouthub_org_id');
        const savedEvent = localStorage.getItem('inouthub_event_id');

        if (!savedOrg) {
            setIsLoading(false);
            return;
        }

        import('../lib/supabase').then(async ({ supabase }) => {
            try {
                const { data } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('id', savedOrg)
                    .maybeSingle();

                if (data) {
                    // Org still exists — restore both cached values
                    setOrgId(savedOrg);
                    if (savedEvent) setEvId(savedEvent);
                } else {
                    // Org is gone — clear stale cache silently
                    localStorage.removeItem('inouthub_org_id');
                    localStorage.removeItem('inouthub_event_id');
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
            localStorage.removeItem('inouthub_event_id');
        }
    };

    const setEventId = (id: string | null) => {
        setEvId(id);
        if (id) {
            localStorage.setItem('inouthub_event_id', id);
        } else {
            localStorage.removeItem('inouthub_event_id');
        }
    };

    return (
        <SelectionContext.Provider value={{ organizationId, eventId, setOrganizationId, setEventId, isLoading }}>
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
