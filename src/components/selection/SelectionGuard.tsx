import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelection } from '../../context/SelectionContext';
import { Loader2 } from 'lucide-react';

interface SelectionGuardProps {
    children: React.ReactNode;
}

export function SelectionGuard({ children }: SelectionGuardProps) {
    const { organizationId, eventId, isLoading } = useSelection();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    // If no org selected, go to org selection
    if (!organizationId) {
        return <Navigate to="/select-org" state={{ from: location }} replace />;
    }

    // If no event selected, go to event selection (unless we are ALREADY there or at org selection)
    if (!eventId && location.pathname !== '/select-event') {
        return <Navigate to="/select-event" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
