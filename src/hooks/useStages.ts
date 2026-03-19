import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useCreateStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ eventId, name, description }: {
            eventId: string;
            name: string;
            description?: string | null;
        }) => {
            const { data, error } = await supabase
                .from('stages')
                .insert({
                    event_id: eventId,
                    name: name.trim(),
                    description: description?.trim() || null,
                })
                .select('*')
                .single();

            if (error) throw error;
            return data as DbStage;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stages', variables.eventId] });
        },
    });
}

export function useUpdateStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stageId, name, description }: {
            stageId: string;
            eventId: string;
            name: string;
            description?: string | null;
        }) => {
            const { data, error } = await supabase
                .from('stages')
                .update({
                    name: name.trim(),
                    description: description?.trim() || null,
                })
                .eq('id', stageId)
                .select('*')
                .single();

            if (error) throw error;
            return data as DbStage;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stages', variables.eventId] });
        },
    });
}
