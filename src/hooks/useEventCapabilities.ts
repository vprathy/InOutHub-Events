import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useOnboardingCapabilities } from '@/hooks/useOnboardingCapabilities';

export function useEventCapabilities(eventId: string | null, organizationId: string | null) {
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();
    const onboardingCapabilities = useOnboardingCapabilities(organizationId, eventId);

    const isOrgAdmin = currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const isEventAdmin = currentEventRole === 'EventAdmin';
    const isStageManager = currentEventRole === 'StageManager';
    const isActAdmin = currentEventRole === 'ActAdmin';
    const isMember = currentEventRole === 'Member';
    const isAdmin = isSuperAdmin || isOrgAdmin || isEventAdmin;

    return {
        currentEventRole,
        currentOrgRole,
        isSuperAdmin,
        isOrgAdmin,
        isEventAdmin,
        isStageManager,
        isActAdmin,
        isMember,
        isAdmin,
        isLoading: isLoadingEventRole || isLoadingOrgRole || isLoadingSuperAdmin || onboardingCapabilities.isLoading,
        canViewAdminModule: isAdmin,
        canSyncParticipants: isAdmin && onboardingCapabilities.canUseImports,
        canManageRoster: isAdmin,
        canManageParticipantOps: isAdmin || isStageManager,
        canManageParticipantRecords: isAdmin,
        canCreateActs: isAdmin,
        canManageActs: isAdmin || isActAdmin,
        canManageActCast: isAdmin || isActAdmin,
        canManageActMedia: isAdmin || isActAdmin,
        canManageReadiness: isAdmin || isStageManager || isActAdmin,
        canManageLineup: isAdmin,
        canOperateStage: isAdmin || isStageManager,
        canViewGuardianPII: isAdmin,
        isPendingReview: onboardingCapabilities.isPendingReview,
        canCreateFirstOrganization: onboardingCapabilities.canCreateFirstOrganization,
        canManageInvites: onboardingCapabilities.canManageInvites,
        canUseImports: onboardingCapabilities.canUseImports,
        canUsePremiumGeneration: onboardingCapabilities.canUsePremiumGeneration,
    };
}
