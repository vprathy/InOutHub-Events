import { ACT_POLICY_REQUIREMENT_TYPE_MAP } from '@/lib/requirementPolicies';

export type RequirementTone = 'default' | 'good' | 'warning' | 'critical' | 'info';
export type RequirementStatus = 'missing' | 'submitted' | 'pending_review' | 'approved' | 'rejected' | 'auto_complete';
export type RequirementTarget = 'workspace' | 'assets' | 'cast';

export interface RequirementRow {
    key: string;
    label: string;
    detail: string;
    actionLabel: string;
    status: RequirementStatus;
    tone: RequirementTone;
    target: RequirementTarget;
    policyCode?: string | null;
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

function buildGenericRequirementRow({
    key,
    label,
    detail,
    actionLabel,
    status,
    target,
    policyCode,
}: {
    key: string;
    label: string;
    detail: string;
    actionLabel: string;
    status: RequirementStatus;
    target: RequirementTarget;
    policyCode?: string | null;
}): RequirementRow {
    return {
        key,
        label,
        detail,
        actionLabel,
        status,
        tone: getRequirementStatusMeta(status).tone,
        target,
        policyCode: policyCode || null,
    };
}

function getPolicyTarget(inputType?: string | null, category?: string | null): RequirementTarget {
    if (inputType === 'file_upload' || category === 'media' || category === 'waiver' || category === 'technical') {
        return 'assets';
    }
    return 'workspace';
}

function getParticipantAssignmentStatus(participant: any, code: string): RequirementStatus | null {
    const assignments = Array.isArray(participant?.requirementAssignments) ? participant.requirementAssignments : [];
    const match = assignments.find((assignment: any) => assignment.policyCode === code);
    return (match?.status as RequirementStatus) || null;
}

function getPolicyBackedParticipantAssetType(policy: { code?: string | null; category?: string | null; input_type?: string | null }) {
    if (policy.code === 'participant_waiver' || policy.category === 'waiver') return 'waiver';
    if (policy.code === 'participant_photo' || policy.category === 'media') return 'photo';
    if (policy.input_type === 'file_upload') return 'other';
    return null;
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
    const activePolicies = Array.isArray(participant?.activeRequirementPolicies)
        ? participant.activeRequirementPolicies.filter((policy: any) => policy.code !== 'special_request_reviewed')
        : [];
    const activePolicyAssetTypes = new Set(
        activePolicies
            .map((policy: any) => getPolicyBackedParticipantAssetType(policy))
            .filter((assetType: string | null): assetType is string => !!assetType)
    );
    const waiverAssets = (participant?.assets || []).filter((asset: any) => asset.type === 'waiver');
    const photoAssets = (participant?.assets || []).filter((asset: any) => asset.type === 'photo');

    activePolicies.forEach((policy: any) => {
        if (policy.code === 'guardian_contact_complete') {
            const guardianStatus = getParticipantAssignmentStatus(participant, policy.code)
                || (!participant?.isMinor
                    ? 'auto_complete'
                    : (!!participant.guardianName && !!participant.guardianPhone ? 'auto_complete' : 'missing'));
            rows.push(buildGenericRequirementRow({
                key: 'guardian-contact',
                label: policy.label,
                detail: guardianStatus === 'approved' || guardianStatus === 'auto_complete'
                    ? 'Guardian name and phone are captured for this participant.'
                    : 'Guardian name and phone are still required before this participant is cleared.',
                actionLabel: guardianStatus === 'approved' || guardianStatus === 'auto_complete' ? 'View' : 'Update',
                status: guardianStatus,
                target: 'workspace',
                policyCode: policy.code,
            }));
            return;
        }

        if (policy.code === 'participant_waiver') {
            const waiverStatus = getParticipantAssignmentStatus(participant, policy.code)
                || (() => {
                    if (waiverAssets.some((asset: any) => asset.status === 'approved')) return 'approved';
                    if (waiverAssets.some((asset: any) => asset.status === 'pending_review')) return 'pending_review';
                    if (waiverAssets.some((asset: any) => asset.status === 'uploaded')) return 'submitted';
                    if (waiverAssets.some((asset: any) => asset.status === 'rejected')) return 'rejected';
                    return 'missing';
                })();
            rows.push(buildGenericRequirementRow({
                key: 'participant-waiver',
                label: policy.label,
                detail: waiverStatus === 'approved' || waiverStatus === 'auto_complete'
                    ? 'A waiver artifact is already attached for this participant.'
                    : 'A waiver artifact still needs to be uploaded or reviewed.',
                actionLabel: waiverStatus === 'approved' || waiverStatus === 'auto_complete' ? 'View Waiver' : 'Upload Waiver',
                status: waiverStatus,
                target: 'assets',
                policyCode: policy.code,
            }));
            return;
        }

        if (policy.code === 'participant_photo') {
            const photoStatus = getParticipantAssignmentStatus(participant, policy.code)
                || (() => {
                    if (photoAssets.some((asset: any) => asset.status === 'approved')) return 'approved';
                    if (photoAssets.some((asset: any) => asset.status === 'pending_review')) return 'pending_review';
                    if (photoAssets.some((asset: any) => asset.status === 'uploaded')) return 'submitted';
                    if (photoAssets.some((asset: any) => asset.status === 'rejected')) return 'rejected';
                    return 'missing';
                })();
            rows.push(buildGenericRequirementRow({
                key: 'participant-photo',
                label: policy.label,
                detail: photoStatus === 'approved' || photoStatus === 'auto_complete'
                    ? 'A participant photo is already attached and approved.'
                    : 'A participant photo still needs to be uploaded or reviewed.',
                actionLabel: photoStatus === 'approved' || photoStatus === 'auto_complete' ? 'View Photo' : 'Upload Photo',
                status: photoStatus,
                target: 'assets',
                policyCode: policy.code,
            }));
            return;
        }

        if (policy.code === 'identity_check') {
            const identityStatus = getParticipantAssignmentStatus(participant, policy.code)
                || (participant?.identityVerified ? 'approved' : 'missing');
            rows.push(buildGenericRequirementRow({
                key: 'identity-check',
                label: policy.label,
                detail: identityStatus === 'approved' || identityStatus === 'auto_complete'
                    ? 'Identity verification is already marked complete.'
                    : 'Identity verification still needs an operator review.',
                actionLabel: identityStatus === 'approved' || identityStatus === 'auto_complete' ? 'View' : 'Review',
                status: identityStatus,
                target: 'workspace',
                policyCode: policy.code,
            }));
            return;
        }

        const genericStatus = getParticipantAssignmentStatus(participant, policy.code) || 'missing';
        rows.push(buildGenericRequirementRow({
            key: `participant-policy-${policy.code}`,
            label: policy.label,
            detail: policy.description || 'Requirement needs follow-up on this participant record.',
            actionLabel: genericStatus === 'approved' || genericStatus === 'auto_complete' ? 'View' : 'Review',
            status: genericStatus,
            target: getPolicyTarget(policy.input_type, policy.category),
            policyCode: policy.code,
        }));
    });

    (participant?.templatedAssets || []).forEach(({ template, fulfillment }: any) => {
        const templateAssetType = template?.assetType || null;
        const isSyntheticPolicyTemplate = typeof template?.id === 'string' && template.id.startsWith('policy-');
        const duplicatesActivePolicy = !!templateAssetType && activePolicyAssetTypes.has(templateAssetType);

        if (isSyntheticPolicyTemplate || duplicatesActivePolicy) {
            return;
        }

        const mappedStatus = mapParticipantAssetStatusToRequirementStatus(fulfillment?.status);
        rows.push({
            key: `template-${template.id}`,
            label: template.name,
            detail: template.description || 'Required participant item',
            actionLabel: fulfillment ? 'Replace' : 'Upload',
            status: mappedStatus,
            tone: getRequirementStatusMeta(mappedStatus).tone,
            target: 'assets',
            policyCode: `template_${template.id}`,
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
    const activePolicies = Array.isArray(act?.activeRequirementPolicies)
        ? act.activeRequirementPolicies.filter((policy: any) => ['ACT_AUDIO', 'ACT_INTRO'].includes(policy.code))
        : [];
    const rows: RequirementRow[] = [];

    activePolicies.forEach((policy: any) => {
        const legacyRequirementType = ACT_POLICY_REQUIREMENT_TYPE_MAP[policy.code];
        const assignmentStatus = getActAssignmentStatus(act, policy.code);
        const matchingRequirement = legacyRequirementType
            ? (act?.requirements || []).find((requirement: any) => requirement.requirementType === legacyRequirementType)
            : null;
        const derivedStatus = assignmentStatus
            || (() => {
                if (policy.code === 'ACT_INTRO') {
                    return act?.hasApprovedIntro ? 'approved' : act?.hasIntroRequirement ? 'pending_review' : 'missing';
                }
                if (policy.code === 'ACT_AUDIO') {
                    return act?.hasMusicTrack ? 'submitted' : 'missing';
                }
                if (matchingRequirement?.fulfilled) return 'approved';
                if (matchingRequirement?.fileUrl || matchingRequirement) return 'submitted';
                return 'missing';
            })();

        let detail = policy.description || 'Requirement needs follow-up on this performance.';
        let actionLabel = 'Review';
        let target: RequirementTarget = getPolicyTarget(policy.input_type, policy.category);

        if (policy.code === 'ACT_INTRO') {
            detail = derivedStatus === 'approved'
                ? 'Intro composition has already been approved for playback.'
                : derivedStatus === 'pending_review' || derivedStatus === 'submitted'
                    ? 'An intro exists but still needs approval before showtime.'
                    : 'No approved intro is attached to this performance yet.';
            actionLabel = 'Open Intro';
        } else if (policy.code === 'ACT_AUDIO') {
            detail = derivedStatus === 'approved' || derivedStatus === 'submitted'
                ? 'A performance music file is attached and ready for review or playback.'
                : 'This performance still needs a music file upload.';
            actionLabel = derivedStatus === 'approved' || derivedStatus === 'submitted' ? 'View Music' : 'Add Music';
        } else if (policy.code === 'ACT_POSTER' || policy.code === 'ACT_GENERATIVE' || policy.code === 'ACT_GENERATIVE_AUDIO' || policy.code === 'ACT_GENERATIVE_VIDEO' || policy.code === 'ACT_WAIVER') {
            actionLabel = derivedStatus === 'approved' || derivedStatus === 'submitted' ? 'View Media' : 'Add Media';
        }

        rows.push(buildGenericRequirementRow({
            key: `act-policy-${policy.code.toLowerCase()}`,
            label: policy.label,
            detail,
            actionLabel,
            status: derivedStatus,
            target,
            policyCode: policy.code,
        }));
    });

    return sortRequirementRows(rows);
}
