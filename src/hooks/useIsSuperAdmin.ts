import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useIsSuperAdmin() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['is-super-admin', user?.id],
        queryFn: async () => {
            if (!user?.id) return false;

            const { data, error } = await supabase
                .from('app_super_admins')
                .select('user_id')
                .eq('user_id', user.id)
                .limit(1);

            if (error) throw error;
            return Boolean(data?.length);
        },
        enabled: !!user?.id,
    });
}
