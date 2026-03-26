import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelection } from '@/context/SelectionContext';
import { Loader2 } from 'lucide-react';
import { useOnboardingState } from '@/hooks/useOnboardingState';

interface SelectionGuardProps {
    children: React.ReactNode;
}

export function SelectionGuard({ children }: SelectionGuardProps) {
    const { organizationId, eventId, setOrganizationId, setEventId, isLoading: contextLoading } = useSelection();
    const location = useLocation();
    const onboarding = useOnboardingState(organizationId, eventId);
    const shouldAutoSelectOrg = !organizationId && !!onboarding.suggestedOrganizationId;
    const shouldAutoSelectEvent =
        !!(organizationId || onboarding.suggestedOrganizationId)
        && !eventId
        && !!onboarding.suggestedEvent?.id
        && location.pathname !== '/select-org';

    useEffect(() => {
        if (shouldAutoSelectOrg && onboarding.suggestedOrganizationId) {
            setOrganizationId(onboarding.suggestedOrganizationId);
        }
    }, [onboarding.suggestedOrganizationId, setOrganizationId, shouldAutoSelectOrg]);

    useEffect(() => {
        if (shouldAutoSelectEvent && onboarding.suggestedEvent?.id) {
            setEventId(onboarding.suggestedEvent.id, onboarding.suggestedEvent.timezone);
        }
    }, [onboarding.suggestedEvent?.id, onboarding.suggestedEvent?.timezone, setEventId, shouldAutoSelectEvent]);

    if (
        contextLoading ||
        onboarding.isLoading ||
        shouldAutoSelectOrg ||
        shouldAutoSelectEvent
    ) {
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

    if (!eventId && location.pathname !== '/select-org') {
        return <Navigate to="/select-org" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
