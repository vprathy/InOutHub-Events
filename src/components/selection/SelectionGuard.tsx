import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelection } from '@/context/SelectionContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface SelectionGuardProps {
    children: React.ReactNode;
}

export function SelectionGuard({ children }: SelectionGuardProps) {
    const { organizationId, eventId, setEventId, isLoading: contextLoading } = useSelection();
    const location = useLocation();

    // Verify Hierarchy: Does the event actually belong to the org?
    const { isLoading: verificationLoading } = useQuery({
        queryKey: ['verify-hierarchy', organizationId, eventId],
        queryFn: async () => {
            if (!organizationId || !eventId) return true;

            const { data } = await supabase
                .from('events')
                .select('organization_id')
                .eq('id', eventId)
                .maybeSingle();

            if (data && data.organization_id !== organizationId) {
                // Mismatch detected! Clear the event ID
                setEventId(null);
                return false;
            }
            return true;
        },
        enabled: !!organizationId && !!eventId,
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    if (contextLoading || (organizationId && eventId && verificationLoading)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    // If no org selected, go to org selection
    if (!organizationId) {
        return <Navigate to="/select-org" state={{ from: location }} replace />;
    }

    // If no event selected, go to event selection (unless we are ALREADY there or at org selection)
    if (!eventId && location.pathname !== '/select-event') {
        return <Navigate to="/select-event" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
