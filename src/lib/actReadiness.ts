import type {
    ActPracticeSession,
    ActReadinessIssue,
    ActReadinessItem,
    ActReadinessState,
    ActReadinessSummary,
} from '@/types/domain';

export function getNextPractice(practices: ActPracticeSession[] = []): ActPracticeSession | null {
    const now = Date.now();
    const ordered = [...practices].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return ordered.find((practice) => new Date(practice.startsAt).getTime() >= now && practice.status !== 'cancelled') || ordered[0] || null;
}

export function deriveActReadinessSummary({
    practices = [],
    items = [],
    issues = [],
}: {
    practices?: ActPracticeSession[];
    items?: ActReadinessItem[];
    issues?: ActReadinessIssue[];
}): ActReadinessSummary {
    const nextPractice = getNextPractice(practices);
    const openIssues = issues.filter((issue) => issue.status !== 'resolved');
    const missingChecklistCount = items.filter((item) => item.status === 'missing').length;
    const blockingIssueCount = openIssues.filter((issue) => issue.severity === 'high' || issue.status === 'blocked').length;
    const atRiskSignals =
        openIssues.length > 0 ||
        items.some((item) => item.status === 'needed' || item.status === 'in_progress') ||
        nextPractice?.status === 'changed';

    let state: ActReadinessState = 'On Track';
    if (blockingIssueCount > 0 || missingChecklistCount > 0) {
        state = 'Blocked';
    } else if (atRiskSignals) {
        state = 'At Risk';
    }

    return {
        state,
        nextPractice,
        openIssueCount: openIssues.length,
        missingChecklistCount,
    };
}

export function formatReadinessDate(dateString?: string | null) {
    if (!dateString) return 'Not scheduled';
    const normalized = dateString.includes('T') && dateString.length === 16
        ? `${dateString}:00`
        : dateString.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}
