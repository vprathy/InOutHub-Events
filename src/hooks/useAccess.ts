import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Organization Members
export function useOrgMembers(organizationId: string | null) {
    return useQuery({
        queryKey: ['org-members', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];

            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    id,
                    role,
                    user_profiles:user_id ( id, email, first_name, last_name )
                `)
                .eq('organization_id', organizationId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!organizationId
    });
}

// Assign Org Role
export function useAssignOrgRole(organizationId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ email, role }: { email: string, role: string }) => {
            if (!organizationId) throw new Error('No organization selected');

            const { error } = await supabase.rpc('assign_org_role', {
                p_org_id: organizationId,
                p_target_email: email,
                p_role: role
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
        }
    });
}

// Remove Org Member
export function useRemoveOrgMember(organizationId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (memberId: string) => {
            const { error } = await supabase
                .from('organization_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
        }
    });
}

// Event Members
export function useEventMembers(eventId: string | null) {
    return useQuery({
        queryKey: ['event-members', eventId],
        queryFn: async () => {
            if (!eventId) return [];

            const { data, error } = await supabase
                .from('event_members')
                .select(`
                    id,
                    role,
                    user_profiles:user_id ( id, email, first_name, last_name )
                `)
                .eq('event_id', eventId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!eventId
    });
}

// Assign Event Role
export function useAssignEventRole(eventId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ email, role }: { email: string, role: string }) => {
            if (!eventId) throw new Error('No event selected');

            const { error } = await supabase.rpc('assign_event_role', {
                p_event_id: eventId,
                p_target_email: email,
                p_role: role
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-members', eventId] });
        }
    });
}

// Remove Event Member
export function useRemoveEventMember(eventId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (memberId: string) => {
            const { error } = await supabase
                .from('event_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-members', eventId] });
        }
    });
}
