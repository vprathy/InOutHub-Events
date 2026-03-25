import type { Database } from '@/types/database.types';
import type { ResolvedRequirementPolicy } from '@/lib/requirementPolicies';

// ==========================================
// 1. CONSTANTS & TYPES
// ==========================================

export const OrganizationRole = {
    Owner: 'Owner',
    Admin: 'Admin',
    Member: 'Member',
} as const;
export type OrganizationRole = typeof OrganizationRole[keyof typeof OrganizationRole];

export const PerformanceRole = {
    Manager: 'Manager',
    Choreographer: 'Choreographer',
    Performer: 'Performer',
    Support: 'Support',
    Crew: 'Crew',
} as const;
export type PerformanceRole = typeof PerformanceRole[keyof typeof PerformanceRole];

export const ArrivalStatus = {
    NotArrived: 'Not Arrived',
    Arrived: 'Arrived',
    Backstage: 'Backstage',
    Ready: 'Ready',
} as const;
export type ArrivalStatus = typeof ArrivalStatus[keyof typeof ArrivalStatus];

export const RequirementType = {
    Audio: 'Audio',
    Lighting: 'Lighting',
    Microphone: 'Microphone',
    Video: 'Video',
    Waiver: 'Waiver',
    Poster: 'Poster',
    Generative: 'Generative',
    GenerativeVideo: 'Generative_Video',
    GenerativeAudio: 'Generative_Audio',
    IntroComposition: 'IntroComposition',
} as const;
export type RequirementType = typeof RequirementType[keyof typeof RequirementType];

export const StageStatus = {
    Idle: 'Idle',
    Active: 'Active',
    Paused: 'Paused',
    Finished: 'Finished',
} as const;
export type StageStatus = typeof StageStatus[keyof typeof StageStatus];

export const ExecutionStatus = {
    Queued: 'Queued',
    Backstage: 'Backstage',
    OnDeck: 'On Deck',
    Live: 'Live',
    Completed: 'Completed',
} as const;
export type ExecutionStatus = typeof ExecutionStatus[keyof typeof ExecutionStatus];

export const AssetLevel = {
    Organization: 'Organization',
    Event: 'Event',
    Act: 'Act',
    Participant: 'Participant',
} as const;
export type AssetLevel = typeof AssetLevel[keyof typeof AssetLevel];

// ==========================================
// 2. RAW DATABASE MODELS
// ==========================================

export type DbOrganization = Database['public']['Tables']['organizations']['Row'];
export type DbUserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type DbOrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type DbEvent = Database['public']['Tables']['events']['Row'];
export type DbParticipant = Database['public']['Tables']['participants']['Row'];
export type DbStage = Database['public']['Tables']['stages']['Row'];
export type DbAct = Database['public']['Tables']['acts']['Row'];
export type DbActParticipant = Database['public']['Tables']['act_participants']['Row'];
export type DbActAsset = Database['public']['Tables']['act_assets']['Row'];
export type DbActRequirement = Database['public']['Tables']['act_requirements']['Row'];
export type DbLineupItem = Database['public']['Tables']['lineup_items']['Row'];
export type DbStageState = Database['public']['Tables']['stage_state']['Row'];

// ==========================================
// 3. FRONTEND DOMAIN MODELS (Combined/Nested)
// ==========================================

export interface Act {
    id: string;
    eventId: string;
    name: string;
    durationMinutes: number;
    setupTimeMinutes: number;
    arrivalStatus: ArrivalStatus;
    notes: string | null;
}

export interface ActDetails extends Act {
    participants?: ActParticipantDetail[];
    assets?: ActAsset[];
    requirements?: ActRequirement[];
    requirementAssignments?: Array<{
        id: string;
        status: string;
        notes?: string | null;
        evidenceSummary?: any;
        policyCode?: string | null;
        policyLabel?: string | null;
        inputType?: string | null;
        reviewMode?: string | null;
        blockingLevel?: string | null;
    }>;
    readinessPractices?: ActPracticeSession[];
    readinessItems?: ActReadinessItem[];
    readinessIssues?: ActReadinessIssue[];
    readinessSummary?: ActReadinessSummary;
    activeRequirementPolicies?: ResolvedRequirementPolicy[];
}

export interface ActWithCounts extends Act {
    participantCount: number;
    managerName?: string | null;
    contactPhone?: string | null;
    approvedPhotoCount?: number;
    assetCount: number;
    requirementCount: number;
    hasTechnicalRider: boolean;
    hasMusicTrack: boolean;
    hasIntroRequirement: boolean;
    hasApprovedIntro: boolean;
    requirementAssignments?: Array<{
        id: string;
        status: string;
        notes?: string | null;
        evidenceSummary?: any;
        policyCode?: string | null;
        policyLabel?: string | null;
        inputType?: string | null;
        reviewMode?: string | null;
        blockingLevel?: string | null;
    }>;
    introBackgroundUrl?: string | null;
    missingAssetCount: number;
    specialRequestCount: number;
    readinessState?: ActReadinessState;
    nextPracticeStartsAt?: string | null;
    nextPracticeStatus?: ActPracticeStatus | null;
    openIssueCount?: number;
    missingChecklistCount?: number;
    introEligible?: boolean;
    activeRequirementPolicies?: ResolvedRequirementPolicy[];
}

export interface ActParticipantDetail {
    id: string;
    participantId: string;
    firstName: string;
    lastName: string;
    role: PerformanceRole | string;
    guardianName?: string | null;
    guardianPhone?: string | null;
}

export interface ActAsset {
    id: string;
    assetName: string;
    assetType: string;
    notes: string | null;
}

export interface ActRequirement {
    id: string;
    requirementType: RequirementType;
    description: string;
    fileUrl: string | null;
    fulfilled: boolean | null;
}

export type ActReadinessState = 'On Track' | 'At Risk' | 'Blocked';
export type ActPracticeStatus = 'planned' | 'confirmed' | 'changed' | 'cancelled';
export type ActReadinessItemStatus = 'needed' | 'in_progress' | 'ready' | 'missing';
export type ActReadinessIssueStatus = 'open' | 'watching' | 'blocked' | 'resolved';
export type ActReadinessIssueSeverity = 'low' | 'medium' | 'high';

export interface ActPracticeSession {
    id: string;
    actId: string;
    expectedFor: string | null;
    venueName: string;
    address: string | null;
    roomArea: string | null;
    parkingNote: string | null;
    specialInstructions: string | null;
    contactName: string | null;
    contactPhone: string | null;
    startsAt: string;
    endsAt: string | null;
    status: ActPracticeStatus;
    notes: string | null;
}

export interface ActReadinessItem {
    id: string;
    actId: string;
    practiceId?: string | null;
    category: 'costume' | 'prop' | 'music' | 'shoes' | 'printout' | 'prep_task' | 'other';
    title: string;
    notes: string | null;
    status: ActReadinessItemStatus;
    ownerUserId?: string | null;
    ownerLabel?: string | null;
    dueAt?: string | null;
    sortOrder: number;
}

export interface ActReadinessIssue {
    id: string;
    actId: string;
    practiceId?: string | null;
    issueType: 'participant_unavailable' | 'missing_costume' | 'missing_prop' | 'music_not_final' | 'intro_media_pending' | 'parent_coordination' | 'timing' | 'rehearsal_conflict' | 'lineup' | 'organizer_support' | 'other';
    title: string;
    details: string | null;
    severity: ActReadinessIssueSeverity;
    status: ActReadinessIssueStatus;
    ownerUserId?: string | null;
    ownerLabel?: string | null;
    dueAt?: string | null;
    escalateToUserId?: string | null;
    resolutionNote?: string | null;
}

export interface ActReadinessSummary {
    state: ActReadinessState;
    nextPractice: ActPracticeSession | null;
    openIssueCount: number;
    missingChecklistCount: number;
    incompleteChecklistCount: number;
}

export interface IntroCurationItem {
    id: string;
    pacing: string;
    focalPoint: string;
    timing: number;
    narrative: string;
}

export interface IntroMediaRef {
    fileUrl: string | null;
    source: string | null;
    stylePreset?: string | null;
    optional?: boolean;
}

export interface IntroCreditLine {
    key: string;
    label: string;
    value: string;
}

export interface IntroGenerationMeta {
    status: 'not_started' | 'preparing' | 'ready_for_review' | 'approved' | 'failed';
    fingerprint: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    lastDurationMs?: number | null;
    lastPreparedAt: string | null;
    totalAttempts?: number;
    failedAttempts?: number;
    dailyPrepareCount: number;
    dailyPrepareDate: string | null;
    cooldownUntil: string | null;
    statusMessage?: string | null;
    lastError?: string | null;
}

export interface IntroComposition {
    version: string;
    selectedAssetIds: string[];
    curation: IntroCurationItem[];
    background: IntroMediaRef;
    audio: IntroMediaRef;
    credits?: IntroCreditLine[];
    generation?: IntroGenerationMeta;
    approved: boolean;
    lastUpdated: string;
}

export interface Participant {
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    age: number | null;
    email?: string | null;
    isMinor: boolean;
    guardianName: string | null;
    guardianPhone: string | null;
    guardianRelationship?: string | null;
    notes: string | null;
    hasSpecialRequests?: boolean;
    specialRequestRaw?: string | null;
    openSpecialRequestCount?: number;
    resolvedSpecialRequestCount?: number;
    status: 'active' | 'inactive' | 'withdrawn' | 'refunded' | 'missing_from_source';
    identityVerified?: boolean;
    identityNotes?: string | null;
    photoUrl?: string | null;
    actCount?: number;
    assetStats?: {
        total: number;
        approved: number;
        pending: number;
        missing: number;
    };
    requirementAssignments?: Array<{
        id: string;
        status: string;
        notes?: string | null;
        evidenceSummary?: any;
        policyCode?: string | null;
        policyLabel?: string | null;
        inputType?: string | null;
        reviewMode?: string | null;
        blockingLevel?: string | null;
        source?: 'bridge';
    }>;
    assets?: ParticipantAsset[];
    activeRequirementPolicies?: ResolvedRequirementPolicy[];
    sourceSystem: string | null;
    sourceInstance: string | null;
    sourceAnchorType: string | null;
    sourceAnchorValue: string | null;
    sourceImportedAt: string | null;
    sourceLastSeenAt: string | null;
    srcRaw: any | null;
    isPIIUnmasked?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export const AssetStatus = {
    Missing: 'missing',
    Uploaded: 'uploaded',
    PendingReview: 'pending_review',
    Approved: 'approved',
    Rejected: 'rejected',
} as const;
export type AssetStatus = typeof AssetStatus[keyof typeof AssetStatus];

export interface AssetTemplate {
    id: string;
    orgId?: string | null;
    eventId?: string | null;
    actId?: string | null;
    name: string;
    description: string | null;
    assetType: 'waiver' | 'photo' | 'intro_media' | 'other';
    targetLevel: 'Organization' | 'Event' | 'Act' | 'Participant';
    isRequired: boolean;
    createdAt: string;
}

export interface ParticipantAsset {
    id: string;
    participantId: string;
    templateId?: string | null;
    name: string;
    type: 'waiver' | 'photo' | 'intro_media' | 'other';
    fileUrl: string | null;
    status: AssetStatus;
    reviewNotes?: string | null;
    createdAt: string;
}

export interface ParticipantNote {
    id: string;
    participantId: string;
    authorId: string | null;
    category: 'internal' | 'special_request' | 'operational';
    content: string;
    isResolved: boolean;
    resolvedAt: string | null;
    resolvedBy: string | null;
    createdAt: string;
}

export interface OperationalContact {
    contactName: string;
    contactRole: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    priority: number;
}

export interface ParticipantDetail extends Participant {
    acts: {
        id: string;
        name: string;
        arrivalStatus: ArrivalStatus;
        role: string;
    }[];
    assets: ParticipantAsset[];
    templatedAssets?: {
        template: AssetTemplate;
        fulfillment: ParticipantAsset | null;
    }[];
    siblings?: {
        id: string;
        firstName: string;
        lastName: string;
        status: Participant['status'];
    }[];
    operationalNotes: ParticipantNote[];
    operationalContacts?: OperationalContact[];
    auditLogs: any[];
}

export interface PerformanceRequest {
    id: string;
    organizationId: string;
    eventId: string;
    importRunId: string | null;
    eventSourceId: string | null;
    sourceAnchor: string | null;
    title: string;
    leadName: string | null;
    leadEmail: string | null;
    leadPhone: string | null;
    durationEstimateMinutes: number;
    musicSupplied: boolean;
    rosterSupplied: boolean;
    notes: string | null;
    rawPayload: any;
    requestStatus: 'pending' | 'reviewed' | 'approved' | 'rejected';
    conversionStatus: 'not_started' | 'converted' | 'failed';
    convertedActId: string | null;
    convertedActName?: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    convertedAt: string | null;
    convertedBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    importInsights?: Array<{
        label: string;
        value: string;
        sourceKey?: string | null;
    }>;
}

export interface IntakeAuditEvent {
    id: string;
    entityId: string | null;
    entityType: string;
    action: string;
    note: string | null;
    beforeData: any;
    afterData: any;
    metadata: any;
    performedAt: string;
    performedBy: string | null;
    actorName: string | null;
    actorEmail: string | null;
}

export interface StageConsoleState {
    id: string;
    name: string;
    description: string | null;
    status: StageStatus;
    currentLineupItemId: string | null;
    currentAct?: Act | null;
}

export interface LineupSlot {
    id: string;
    stageId: string;
    actId: string;
    scheduledStartTime: string;
    sortOrder: number;
    executionStatus: string;
    act: ActDetails;
}
