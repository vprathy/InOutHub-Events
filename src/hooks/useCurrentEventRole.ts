import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCurrentEventRole(eventId: string | null) {
    return useQuery({
        queryKey: ['current-event-role', eventId],
        queryFn: async () => {
            if (!eventId) return null;
            const { data, error } = await (supabase as any).rpc('auth_event_role', {
                p_event_id: eventId,
            });

            if (error) throw error;
            return data as string | null;
        },
        enabled: !!eventId,
    });
}
