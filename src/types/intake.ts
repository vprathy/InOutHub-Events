export type IntakeSeverity = 'info' | 'warning' | 'error' | 'success';

export type IntakeOutcomeAction = 're_authenticate' | 'fix_mapping' | 'check_network' | 'acknowledge_warnings' | 'none';

/**
 * Canonical outcome contract for InOutHub intake operations.
 * This ensures backend truth is surfaced to the operator with clear visibility
 * into blocking vs non-blocking issues.
 */
export interface IntakeOutcome {
    status: 'success' | 'success_with_warnings' | 'blocked' | 'failed';
    severity: IntakeSeverity;
    message: string;
    description?: string;
    nextAction: IntakeOutcomeAction;
    importRunId?: string;
    warningCount: number;
    blockingIssues: string[]; // Reasons why the import was stopped (e.g. wrong headers, row limit exceeded)
    stats?: {
        new: number;
        updated: number;
        missing: number;
        processed: number;
    };
}

/**
 * Logic to derive if a run should be considered stale from the operator's perspective.
 */
export function isImportRunStale(run: { status: string; started_at: string }): boolean {
    if (run.status !== 'running') return false;
    const startTime = new Date(run.started_at).getTime();
    const now = Date.now();
    const diffMinutes = (now - startTime) / (1000 * 60);
    return diffMinutes > 15; // 15-minute threshold for stale runs
}
