import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AssetTemplate, AssetLevel } from '@/types/domain';

export function useAssetTemplatesQuery(targetId: string, level: AssetLevel) {
    return useQuery({
        queryKey: ['asset-templates', targetId, level],
        queryFn: async () => {
            let query = supabase.from('asset_templates').select('*');

            if (level === 'Organization') query = query.eq('org_id', targetId);
            else if (level === 'Event') query = query.eq('event_id', targetId);
            else if (level === 'Act') query = query.eq('act_id', targetId);

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            return (data as any[]).map((row): AssetTemplate => ({
                id: row.id,
                orgId: row.org_id,
                eventId: row.event_id,
                actId: row.act_id,
                name: row.name,
                description: row.description,
                assetType: row.asset_type as any,
                targetLevel: row.target_level as any,
                isRequired: !!row.is_required,
                createdAt: row.created_at
            }));
        },
        enabled: !!targetId,
    });
}

export function useCreateAssetTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (template: Partial<AssetTemplate>) => {
            if (!template.name) throw new Error('Template name is required');

            const { data, error } = await supabase
                .from('asset_templates')
                .insert([{
                    name: template.name,
                    description: template.description,
                    org_id: template.orgId,
                    event_id: template.eventId,
                    act_id: template.actId,
                    asset_type: template.assetType,
                    target_level: template.targetLevel,
                    is_required: template.isRequired
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            const targetId = variables.orgId || variables.eventId || variables.actId;
            const level = variables.targetLevel;
            if (targetId && level) {
                queryClient.invalidateQueries({ queryKey: ['asset-templates', targetId, level] });
            }
        },
    });
}

export function useAssignTemplateBulk() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templateId, targetId, targetLevel }: { templateId: string, targetId: string, targetLevel: string }) => {
            const { error } = await supabase.rpc('assign_asset_template_bulk', {
                p_template_id: templateId,
                p_target_id: targetId,
                p_target_level: targetLevel
            });

            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate participants and assets as they might have new missing records
            queryClient.invalidateQueries({ queryKey: ['participants'] });
            queryClient.invalidateQueries({ queryKey: ['participant-assets'] });
        },
    });
}
