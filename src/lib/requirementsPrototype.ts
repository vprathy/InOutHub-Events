export type RequirementTone = 'default' | 'good' | 'warning' | 'critical' | 'info';
export type RequirementStatus = 'missing' | 'submitted' | 'pending_review' | 'approved' | 'rejected' | 'auto_complete';

export interface RequirementRow {
    key: string;
    label: string;
    detail: string;
    actionLabel: string;
    status: RequirementStatus;
    tone: RequirementTone;
}

export interface ParticipantReadinessSummary {
    status: 'cleared' | 'attention' | 'on_track';
    badgeLabel: string;
    followUpLabel: string;
    followUpDetail: string;
    followUpTone: string;
    quickReadLabel: string;
    quickReadDetail: string;
    openCount: number;
}

function getActAssignmentStatus(act: any, code: string): RequirementStatus | null {
    const assignments = Array.isArray(act?.requirementAssignments) ? act.requirementAssignments : [];
    const match = assignments.find((assignment: any) => assignment.policyCode === code);
    return (match?.status as RequirementStatus) || null;
}

const statusMeta: Record<RequirementStatus, { label: string; tone: RequirementTone }> = {
    missing: { label: 'Missing', tone: 'warning' },
    submitted: { label: 'Submitted', tone: 'info' },
    pending_review: { label: 'Needs Review', tone: 'warning' },
    approved: { label: 'Accepted', tone: 'good' },
    rejected: { label: 'Rejected', tone: 'critical' },
    auto_complete: { label: 'Complete', tone: 'good' },
};

export function getRequirementStatusMeta(status: RequirementStatus) {
    return statusMeta[status];
}

function mapParticipantAssetStatusToRequirementStatus(status?: string | null): RequirementStatus {
    if (status === 'approved') return 'approved';
    if (status === 'pending_review') return 'pending_review';
    if (status === 'rejected') return 'rejected';
    if (status === 'uploaded') return 'submitted';
    return 'missing';
}

function getParticipantAssignmentStatus(participant: any, code: string): RequirementStatus | null {
    const assignments = Array.isArray(participant?.requirementAssignments) ? participant.requirementAssignments : [];
    const match = assignments.find((assignment: any) => assignment.policyCode === code);
    return (match?.status as RequirementStatus) || null;
}

function sortRequirementRows(rows: RequirementRow[]) {
    const statusWeight: Record<RequirementStatus, number> = {
        missing: 5,
        rejected: 4,
        pending_review: 3,
        submitted: 2,
        approved: 1,
        auto_complete: 0,
    };

    const toneWeight: Record<RequirementTone, number> = {
        critical: 4,
        warning: 3,
        info: 2,
        default: 1,
        good: 0,
    };

    return [...rows].sort((a, b) => {
        const statusDiff = statusWeight[b.status] - statusWeight[a.status];
        if (statusDiff !== 0) return statusDiff;

        const toneDiff = toneWeight[b.tone] - toneWeight[a.tone];
        if (toneDiff !== 0) return toneDiff;

        return a.label.localeCompare(b.label);
    });
}

export function buildParticipantRequirementRows(participant: any): RequirementRow[] {
    const rows: RequirementRow[] = [];
    const specialRequestNotes = Array.isArray(participant?.operationalNotes)
        ? participant.operationalNotes.filter((note: any) => note.category === 'special_request')
        : [];
    const unresolvedSpecialRequests = specialRequestNotes.filter((note: any) => !note.isResolved);
    const resolvedSpecialRequests = specialRequestNotes.filter((note: any) => note.isResolved);

    if (participant?.isMinor) {
        const guardianStatus = getParticipantAssignmentStatus(participant, 'guardian_contact_complete')
            || (!!participant.guardianName && !!participant.guardianPhone ? 'auto_complete' : 'missing');
        rows.push({
            key: 'guardian-contact',
            label: 'Guardian Contact',
            detail: guardianStatus === 'approved' || guardianStatus === 'auto_complete'
                ? 'Guardian name and phone are captured for this participant.'
                : 'Guardian name and phone are still required before this participant is cleared.',
            actionLabel: guardianStatus === 'approved' || guardianStatus === 'auto_complete' ? 'View' : 'Update',
            status: guardianStatus,
            tone: getRequirementStatusMeta(guardianStatus).tone,
        });
    }

    if (participant?.hasSpecialRequests) {
        const specialRequestStatus = getParticipantAssignmentStatus(participant, 'special_request_reviewed')
            || (unresolvedSpecialRequests.length > 0
                ? 'pending_review'
                : resolvedSpecialRequests.length > 0
                    ? 'approved'
                    : 'missing');
        rows.push({
            key: 'special-request',
            label: 'Special Request Review',
            detail: specialRequestStatus === 'approved' || specialRequestStatus === 'auto_complete'
                ? 'The special request has been reviewed and closed on this participant record.'
                : specialRequestStatus === 'pending_review'
                    ? 'A special request follow-up is open and still needs closure.'
                    : 'Special request follow-up should be logged before performance day.',
            actionLabel: specialRequestStatus === 'approved' || specialRequestStatus === 'auto_complete'
                ? 'View Closure'
                : specialRequestStatus === 'pending_review'
                    ? 'Resolve Request'
                    : 'Log Review',
            status: specialRequestStatus,
            tone: getRequirementStatusMeta(specialRequestStatus).tone,
        });
    }

    (participant?.templatedAssets || []).forEach(({ template, fulfillment }: any) => {
        const mappedStatus = mapParticipantAssetStatusToRequirementStatus(fulfillment?.status);
        rows.push({
            key: `template-${template.id}`,
            label: template.name,
            detail: template.description || 'Required participant item',
            actionLabel: fulfillment ? 'Replace' : 'Upload',
            status: mappedStatus,
            tone: getRequirementStatusMeta(mappedStatus).tone,
        });
    });

    return sortRequirementRows(rows);
}

export function buildParticipantReadinessSummary(participant: any): ParticipantReadinessSummary {
    const rows = buildParticipantRequirementRows(participant);
    const docsStatus = getParticipantAssignmentStatus(participant, 'participant_docs_clear');
    const docsOpenCount = (participant?.assetStats?.missing || 0) + (participant?.assetStats?.pending || 0);
    const actCount = participant?.actCount || 0;

    if (actCount === 0) {
        return {
            status: 'attention',
            badgeLabel: 'Needs Placement',
            followUpLabel: 'Choose a Performance',
            followUpDetail: 'This participant is not assigned to an act yet.',
            followUpTone: 'border-orange-500/25 bg-orange-500/5 text-orange-700',
            quickReadLabel: 'Rostered only',
            quickReadDetail: docsOpenCount > 0 ? `${docsOpenCount} approval item${docsOpenCount > 1 ? 's' : ''} open` : 'Ready to place into an act',
            openCount: Math.max(1, docsOpenCount),
        };
    }

    const highestPriorityRow = rows[0] || null;
    const docsNeedReview = docsStatus === 'missing' || docsStatus === 'pending_review' || docsStatus === 'rejected';
    if (docsNeedReview) {
        return {
            status: 'attention',
            badgeLabel: 'Requires Work',
            followUpLabel: 'Approvals Pending',
            followUpDetail: docsOpenCount > 0
                ? `${docsOpenCount} approval item${docsOpenCount > 1 ? 's still need' : ' still needs'} review.`
                : 'Required participant evidence still needs review.',
            followUpTone: 'border-amber-500/25 bg-amber-500/5 text-amber-700',
            quickReadLabel: `${actCount} act${actCount > 1 ? 's' : ''}`,
            quickReadDetail: docsOpenCount > 0 ? `${docsOpenCount} approval item${docsOpenCount > 1 ? 's' : ''} open` : 'Review participant evidence',
            openCount: Math.max(1, docsOpenCount),
        };
    }

    if (highestPriorityRow && ['missing', 'pending_review', 'rejected', 'submitted'].includes(highestPriorityRow.status)) {
        const toneClass = highestPriorityRow.tone === 'critical'
                ? 'border-rose-600/25 bg-rose-600/5 text-rose-700'
                : highestPriorityRow.tone === 'warning'
                ? 'border-amber-500/25 bg-amber-500/5 text-amber-700'
                : 'border-sky-500/25 bg-sky-500/5 text-sky-700';
        return {
            status: 'attention',
            badgeLabel: highestPriorityRow.status === 'pending_review' || highestPriorityRow.status === 'submitted' ? 'Requires Work' : 'Pending',
            followUpLabel: highestPriorityRow.label,
            followUpDetail: highestPriorityRow.detail,
            followUpTone: toneClass,
            quickReadLabel: `${actCount} act${actCount > 1 ? 's' : ''}`,
            quickReadDetail: docsOpenCount > 0 ? `${docsOpenCount} approval item${docsOpenCount > 1 ? 's' : ''} open` : 'Follow-up needed before show day',
            openCount: 1 + docsOpenCount,
        };
    }

    return {
        status: 'cleared',
        badgeLabel: 'Cleared',
        followUpLabel: 'Cleared',
        followUpDetail: actCount > 0
            ? `${actCount} act${actCount > 1 ? 's are' : ' is'} already linked and no immediate participant blockers are open.`
            : 'No immediate blockers on this participant record.',
        followUpTone: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700',
        quickReadLabel: `${actCount} act${actCount > 1 ? 's' : ''}`,
        quickReadDetail: participant?.assetStats?.approved
            ? `${participant.assetStats.approved} approval${participant.assetStats.approved > 1 ? 's' : ''} cleared`
            : 'Ready for show-day flow',
        openCount: 0,
    };
}

export function buildActRequirementRows(act: any): RequirementRow[] {
    const participantRows = Array.isArray(act?.participants) ? act.participants : [];
    const performers = participantRows.filter((participant: any) => !['Manager', 'Choreographer', 'Support', 'Crew'].includes(participant.role));
    const castClear = performers.length > 0 && performers.every((participant: any) => {
        const assets = Array.isArray(participant.assets) ? participant.assets : [];
        return assets.length > 0 && assets.every((asset: any) => asset.status === 'approved');
    });
    const teamCount = participantRows.filter((participant: any) => ['Manager', 'Choreographer', 'Support', 'Crew'].includes(participant.role)).length;
    const castCount = performers.length;
    const introAssignmentStatus = getActAssignmentStatus(act, 'ACT_INTRO');
    const audioAssignmentStatus = getActAssignmentStatus(act, 'ACT_AUDIO');
    const techAssignmentStatuses = ['ACT_LIGHTING', 'ACT_MICROPHONE', 'ACT_VIDEO']
        .map((code) => getActAssignmentStatus(act, code))
        .filter(Boolean) as RequirementStatus[];

    const introStatus =
        introAssignmentStatus ||
        (act?.hasApprovedIntro ? 'approved' : act?.hasIntroRequirement ? 'pending_review' : 'missing');
    const musicStatus =
        audioAssignmentStatus ||
        (act?.hasMusicTrack ? 'submitted' : 'missing');
    const stageTechStatus =
        techAssignmentStatuses.find((status) => status === 'missing' || status === 'rejected') ||
        techAssignmentStatuses.find((status) => status === 'pending_review' || status === 'submitted') ||
        techAssignmentStatuses.find((status) => status === 'approved') ||
        (act?.hasTechnicalRider ? 'submitted' : 'missing');

    return sortRequirementRows([
        {
            key: 'cast-clear',
            label: 'Cast Clearance',
            detail: castCount === 0
                ? 'No performers are assigned to this performance yet.'
                : castClear
                ? 'Assigned cast members are clear on current participant requirements.'
                : 'One or more assigned participants still have approvals or docs unresolved.',
            actionLabel: castCount === 0 ? 'Add Cast' : 'Review Cast',
            status: castCount === 0 ? 'missing' : castClear ? 'approved' : 'pending_review',
            tone: castCount === 0 ? 'critical' : castClear ? 'good' : 'warning',
        },
        {
            key: 'music-submitted',
            label: 'Music Submitted',
            detail: musicStatus === 'approved' || musicStatus === 'submitted'
                ? 'A music or audio record is already attached to this performance.'
                : 'This performance still needs a music or audio record.',
            actionLabel: musicStatus === 'approved' || musicStatus === 'submitted' ? 'View Music' : 'Add Music',
            status: musicStatus,
            tone: getRequirementStatusMeta(musicStatus).tone,
        },
        {
            key: 'intro-approved',
            label: 'Intro Approved',
            detail: introStatus === 'approved'
                ? 'Intro composition has already been approved for playback.'
                : introStatus === 'pending_review' || introStatus === 'submitted'
                    ? 'An intro exists but still needs approval before showtime.'
                    : 'No approved intro is attached to this performance yet.',
            actionLabel: 'Open Intro',
            status: introStatus,
            tone: getRequirementStatusMeta(introStatus).tone,
        },
        {
            key: 'stage-tech',
            label: 'Stage Tech Confirmed',
            detail: stageTechStatus === 'approved' || stageTechStatus === 'submitted'
                ? 'A stage-tech requirement or rider record is already attached.'
                : 'Microphone, lighting, or stage setup details still need confirmation.',
            actionLabel: 'Review Tech',
            status: stageTechStatus,
            tone: getRequirementStatusMeta(stageTechStatus).tone,
        },
        {
            key: 'support-team',
            label: 'Support Team',
            detail: teamCount > 0
                ? `${teamCount} team contact${teamCount > 1 ? 's are' : ' is'} already linked to this performance.`
                : 'No manager, choreographer, or support contact is linked yet.',
            actionLabel: teamCount > 0 ? 'View Team' : 'Add Team',
            status: teamCount > 0 ? 'submitted' : castCount > 0 ? 'missing' : 'auto_complete',
            tone: teamCount > 0 ? 'info' : castCount > 0 ? 'warning' : 'good',
        },
    ]);
}
