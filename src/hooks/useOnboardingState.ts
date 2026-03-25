import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

export type OnboardingMode =
    | 'founder_onboarding'
    | 'pending_access'
    | 'org_selection'
    | 'event_onboarding'
    | 'event_selection'
    | 'ready';

export type OnboardingOrganization = {
    id: string;
    name: string;
    roleLabel: string;
    reviewStatus: string;
};

export type OnboardingEvent = {
    id: string;
    name: string;
    timezone: string | null;
};

export function useOnboardingState(organizationId: string | null, eventId: string | null) {
    const { user } = useAuth();
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();

    const organizationsQuery = useQuery({
        queryKey: ['onboarding-organizations', user?.id, isSuperAdmin],
        queryFn: async () => {
            if (!user?.id) return [] as OnboardingOrganization[];

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

            return ((data || []) as any[]).map((org) => ({
                id: org.id,
                name: org.name,
                reviewStatus: 'approved',
                roleLabel: isSuperAdmin ? 'Super Admin' : org.organization_members?.[0]?.role || 'Member',
            }));
        },
        enabled: !!user?.id && !isLoadingSuperAdmin,
    });

    const pendingAccessQuery = useQuery({
        queryKey: ['onboarding-pending-access', user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc('get_my_pending_access_count');
            if (error) throw error;
            return Number(data || 0);
        },
        enabled: !!user?.id && !isSuperAdmin && !isLoadingSuperAdmin,
    });

    const organizations = organizationsQuery.data || [];
    const resolvedOrganizationId = organizationId || (organizations.length === 1 ? organizations[0]?.id || null : null);

    const eventsQuery = useQuery({
        queryKey: ['onboarding-events', resolvedOrganizationId],
        queryFn: async () => {
            if (!resolvedOrganizationId) return [] as OnboardingEvent[];

            const { data, error } = await supabase
                .from('events')
                .select('id, name, timezone')
                .eq('organization_id', resolvedOrganizationId)
                .order('start_date', { ascending: false });

            if (error) throw error;
            return (data || []) as OnboardingEvent[];
        },
        enabled: !!resolvedOrganizationId,
    });

    const events = eventsQuery.data || [];
    const resolvedEventId = eventId || (events.length === 1 ? events[0]?.id || null : null);

    const selectedOrganization = useMemo(
        () => organizations.find((organization) => organization.id === resolvedOrganizationId) || null,
        [organizations, resolvedOrganizationId],
    );

    const mode = useMemo<OnboardingMode>(() => {
        if (!user) return 'ready';
        if (organizations.length === 0) {
            if (isSuperAdmin) return 'org_selection';
            return (pendingAccessQuery.data || 0) > 0 ? 'pending_access' : 'founder_onboarding';
        }
        if (!resolvedOrganizationId) {
            return 'org_selection';
        }
        if (events.length === 0) {
            return 'event_onboarding';
        }
        if (!resolvedEventId) {
            return 'event_selection';
        }
        return 'ready';
    }, [events.length, isSuperAdmin, organizations.length, pendingAccessQuery.data, resolvedEventId, resolvedOrganizationId, user]);

    return {
        isLoading:
            isLoadingSuperAdmin
            || organizationsQuery.isLoading
            || pendingAccessQuery.isLoading
            || eventsQuery.isLoading,
        user,
        isSuperAdmin,
        organizations,
        events,
        pendingAccessCount: pendingAccessQuery.data || 0,
        selectedOrganization,
        resolvedOrganizationId,
        resolvedEventId,
        suggestedOrganizationId: organizations.length === 1 ? organizations[0]?.id || null : null,
        suggestedEvent: events.length === 1 ? events[0] || null : null,
        mode,
    };
}
