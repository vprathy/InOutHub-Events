import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DbStage } from '@/types/domain';

export function useStagesQuery(eventId: string) {
    return useQuery({
        queryKey: ['stages', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stages')
                .select('*')
                .eq('event_id', eventId)
                .order('name');

            if (error) throw error;
            return data as DbStage[];
        },
        enabled: !!eventId,
    });
}
