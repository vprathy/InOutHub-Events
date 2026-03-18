import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { endUserSession, logAuthEvent } from '@/lib/authTelemetry';

export function useAppSignOut() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { clearSelection, eventId } = useSelection();

    return async () => {
        await logAuthEvent('logout', { contextEventId: eventId });
        await endUserSession('logout');
        await supabase.auth.signOut();
        clearSelection();
        queryClient.clear();
        navigate('/login', { replace: true });
    };
}
