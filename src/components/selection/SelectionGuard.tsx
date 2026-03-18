import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelection } from '@/context/SelectionContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface SelectionGuardProps {
    children: React.ReactNode;
}

export function SelectionGuard({ children }: SelectionGuardProps) {
    const { organizationId, eventId, setOrganizationId, setEventId, isLoading: contextLoading } = useSelection();
    const location = useLocation();

    const { data: autoOrg, isLoading: autoOrgLoading } = useQuery({
        queryKey: ['auto-select-org'],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return null;

            const { data: superAdminRows, error: superAdminError } = await supabase
                .from('app_super_admins')
                .select('user_id')
                .eq('user_id', user.id)
                .limit(1);

            if (superAdminError) throw superAdminError;

            const isSuperAdmin = Boolean(superAdminRows?.length);
            const orgQuery = isSuperAdmin
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

            return data && data.length === 1 ? data[0] : null;
        },
        enabled: !contextLoading && !organizationId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: autoEvent, isLoading: autoEventLoading } = useQuery({
        queryKey: ['auto-select-event', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;

            const { data, error } = await supabase
                .from('events')
                .select('id, timezone')
                .eq('organization_id', organizationId)
                .order('start_date', { ascending: false });

            if (error) throw error;

            return data && data.length === 1 ? data[0] : null;
        },
        enabled: !contextLoading && !!organizationId && !eventId,
        staleTime: 1000 * 60 * 5,
    });

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

    const shouldAutoSelectOrg = !organizationId && !!autoOrg?.id;
    const shouldAutoSelectEvent = !!organizationId && !eventId && !!autoEvent?.id;

    useEffect(() => {
        if (shouldAutoSelectOrg && autoOrg?.id) {
            setOrganizationId(autoOrg.id);
        }
    }, [autoOrg?.id, setOrganizationId, shouldAutoSelectOrg]);

    useEffect(() => {
        if (shouldAutoSelectEvent && autoEvent?.id) {
            setEventId(autoEvent.id, autoEvent.timezone);
        }
    }, [autoEvent?.id, autoEvent?.timezone, setEventId, shouldAutoSelectEvent]);

    if (
        contextLoading ||
        (!organizationId && autoOrgLoading) ||
        (organizationId && !eventId && autoEventLoading) ||
        shouldAutoSelectOrg ||
        shouldAutoSelectEvent ||
        (organizationId && eventId && verificationLoading)
    ) {
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
