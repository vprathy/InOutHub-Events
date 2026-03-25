import { useMemo } from 'react';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useOnboardingState } from '@/hooks/useOnboardingState';

export function useOnboardingCapabilities(organizationId: string | null, eventId: string | null) {
    const onboarding = useOnboardingState(organizationId, eventId);
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();

    const isOrgAdmin = currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const isEventAdmin = currentEventRole === 'EventAdmin';
    const isActAdmin = currentEventRole === 'ActAdmin';
    const isPendingReview = !isSuperAdmin && onboarding.selectedOrganization?.reviewStatus === 'pending_review';

    return useMemo(() => ({
        isLoading: onboarding.isLoading || isLoadingEventRole || isLoadingOrgRole || isLoadingSuperAdmin,
        isPendingReview,
        canCreateFirstOrganization: onboarding.mode === 'founder_onboarding' && !isSuperAdmin,
        canManageInvites: isSuperAdmin || ((isOrgAdmin || isEventAdmin) && !isPendingReview),
        canUseImports: isSuperAdmin || ((isOrgAdmin || isEventAdmin) && !isPendingReview),
        canUsePremiumGeneration: isSuperAdmin || ((isOrgAdmin || isEventAdmin || isActAdmin) && !isPendingReview),
    }), [isActAdmin, isEventAdmin, isLoadingEventRole, isLoadingOrgRole, isLoadingSuperAdmin, isOrgAdmin, isPendingReview, isSuperAdmin, onboarding.isLoading, onboarding.mode]);
}
