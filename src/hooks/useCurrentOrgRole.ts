import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCurrentOrgRole(organizationId: string | null) {
    return useQuery({
        queryKey: ['current-org-role', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await (supabase as any).rpc('auth_org_role', {
                p_org_id: organizationId,
            });

            if (error) throw error;
            return data as string | null;
        },
        enabled: !!organizationId,
    });
}
