import type {
    ActPracticeSession,
    ActReadinessIssue,
    ActReadinessItem,
    ActReadinessState,
    ActReadinessSummary,
} from '@/types/domain';
import { formatEventDateTime } from '@/lib/eventTime';

export function getNextPractice(practices: ActPracticeSession[] = []): ActPracticeSession | null {
    const now = Date.now();
    const ordered = [...practices].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return ordered.find((practice) => new Date(practice.startsAt).getTime() >= now && practice.status !== 'cancelled') || ordered[0] || null;
}

export function deriveActReadinessSummary({
    practices = [],
    items = [],
    issues = [],
    participantCount = 0,
    missingParticipantAssetCount = 0,
    hasMusicTrack = false,
    hasIntroRequirement = false,
    hasApprovedIntro = false,
}: {
    practices?: ActPracticeSession[];
    items?: ActReadinessItem[];
    issues?: ActReadinessIssue[];
    participantCount?: number;
    missingParticipantAssetCount?: number;
    hasMusicTrack?: boolean;
    hasIntroRequirement?: boolean;
    hasApprovedIntro?: boolean;
}): ActReadinessSummary {
    const nextPractice = getNextPractice(practices);
    const openIssues = issues.filter((issue) => issue.status !== 'resolved');
    const missingChecklistCount = items.filter((item) => item.status === 'missing').length;
    const incompleteChecklistCount = items.filter((item) => item.status !== 'ready').length;
    const blockingIssueCount = openIssues.filter((issue) => issue.severity === 'high' || issue.status === 'blocked').length;
    const blockingDependencyCount =
        (participantCount === 0 ? 1 : 0) +
        (missingParticipantAssetCount > 0 ? 1 : 0) +
        (!hasMusicTrack ? 1 : 0);
    const atRiskDependency = hasIntroRequirement && !hasApprovedIntro;
    const atRiskSignals =
        openIssues.length > 0 ||
        items.some((item) => item.status === 'needed' || item.status === 'in_progress') ||
        nextPractice?.status === 'changed' ||
        atRiskDependency;

    let state: ActReadinessState = 'On Track';
    if (blockingIssueCount > 0 || missingChecklistCount > 0 || blockingDependencyCount > 0) {
        state = 'Blocked';
    } else if (atRiskSignals) {
        state = 'At Risk';
    }

    return {
        state,
        nextPractice,
        openIssueCount: openIssues.length,
        missingChecklistCount,
        incompleteChecklistCount,
    };
}

export function formatReadinessDate(dateString?: string | null) {
    return formatEventDateTime(dateString);
}

export function getActReadinessLabel(state?: ActReadinessState | null) {
    if (state === 'Blocked') return 'Needs Attention';
    if (state === 'At Risk') return 'Watch List';
    return 'On Track';
}
