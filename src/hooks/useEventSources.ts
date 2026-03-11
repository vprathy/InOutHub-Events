import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type EventSource = {
    id: string;
    eventId: string;
    name: string;
    type: 'google_sheet' | 'csv';
    config: {
        sheetId?: string;
        url?: string;
        fileName?: string;
        rowCount?: number;
    };
    lastSyncedAt: string | null;
    createdAt: string;
};

export function useEventSources(eventId: string) {
    const queryClient = useQueryClient();

    const sourcesQuery = useQuery({
        queryKey: ['event-sources', eventId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('event_sources')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return (data as any[]).map((row): EventSource => ({
                id: row.id,
                eventId: row.event_id,
                name: row.name,
                type: row.type,
                config: row.config,
                lastSyncedAt: row.last_synced_at,
                createdAt: row.created_at,
            }));
        },
        enabled: !!eventId,
    });

    const addSourceMutation = useMutation({
        mutationFn: async (source: Omit<EventSource, 'id' | 'lastSyncedAt' | 'createdAt'>) => {
            const { data, error } = await (supabase as any)
                .from('event_sources')
                .insert({
                    event_id: source.eventId,
                    name: source.name,
                    type: source.type,
                    config: source.config,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-sources', eventId] });
        },
    });

    const removeSourceMutation = useMutation({
        mutationFn: async (sourceId: string) => {
            const { error } = await (supabase as any)
                .from('event_sources')
                .delete()
                .eq('id', sourceId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-sources', eventId] });
        },
    });

    const updateSourceSyncMutation = useMutation({
        mutationFn: async ({ sourceId, lastSyncedAt }: { sourceId: string; lastSyncedAt: string }) => {
            const { error } = await (supabase as any)
                .from('event_sources')
                .update({ last_synced_at: lastSyncedAt })
                .eq('id', sourceId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-sources', eventId] });
        },
    });

    return {
        sources: sourcesQuery.data || [],
        isLoading: sourcesQuery.isLoading,
        error: sourcesQuery.error,
        addSource: addSourceMutation.mutateAsync,
        removeSource: removeSourceMutation.mutateAsync,
        updateSourceSyncStatus: updateSourceSyncMutation.mutateAsync,
        isAdding: addSourceMutation.isPending,
        isRemoving: removeSourceMutation.isPending,
    };
}
