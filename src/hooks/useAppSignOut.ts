import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';

export function useAppSignOut() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { clearSelection } = useSelection();

    return async () => {
        await supabase.auth.signOut();
        clearSelection();
        queryClient.clear();
        navigate('/login', { replace: true });
    };
}
