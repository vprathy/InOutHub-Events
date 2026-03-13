import type { Database } from '@/types/database.types';

// ==========================================
// 1. CONSTANTS & TYPES
// ==========================================
// We define strict union types for string fields with CHECK constraints in the database.
// This provides type safety and autocomplete in the UI layer.

export const OrganizationRole = {
    Owner: 'Owner',
    Admin: 'Admin',
    StageManager: 'StageManager',
    ActAdmin: 'ActAdmin',
} as const;
export type OrganizationRole = typeof OrganizationRole[keyof typeof OrganizationRole];

export const PerformanceRole = {
    Manager: 'Manager',
    Choreographer: 'Choreographer',
    Performer: 'Performer',
    Support: 'Support',
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

/**
 * ExecutionStatus reflects the tactile state of an act during a live show.
 * Queued: Initial state.
 * Backstage: Checked in and physically present at the venue.
 * OnDeck: Next in line, standing by the stage entrance.
 * Live: Currently performing on stage.
 * Completed: Performance finished.
 */
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
// These map 1:1 with the rows returned by Supabase.

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
// The UI rarely needs a raw table row. It needs compound objects (e.g., an Act with its Participants and Requirements attached).
// We define those composite interfaces here.

/**
 * The core operational token used throughout the React UI. Represents the base Act row.
 */
export interface Act {
    id: string;
    eventId: string;
    name: string;
    durationMinutes: number;
    setupTimeMinutes: number;
    arrivalStatus: ArrivalStatus;
    notes: string | null;
}

/**
 * A richer Act model that includes nested relations fetched via Supabase joins.
 */
export interface ActDetails extends Act {
    participants?: ActParticipantDetail[];
    assets?: ActAsset[];
    requirements?: ActRequirement[];
}

/**
 * Optimized model for scannable operational lists.
 * Provides counts and status flags without the overhead of full nested arrays.
 */
export interface ActWithCounts extends Act {
    participantCount: number;
    assetCount: number;
    requirementCount: number;
    // Core readiness indicators
    hasTechnicalRider: boolean;
    hasMusicTrack: boolean;
    // Operational readiness
    missingAssetCount: number;
    specialRequestCount: number;
}

/**
 * Represents a Participant cleanly mapped to the UI, including their role in a specific Act.
 */
export interface ActParticipantDetail {
    id: string; // The act_participants.id
    participantId: string; // The participants.id
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

export interface IntroCurationItem {
    id: string;
    pacing: string;
    focalPoint: string;
    timing: number;
    narrative: string;
}

export interface IntroComposition {
    selectedAssetIds: string[];
    curation: IntroCurationItem[];
    lastUpdated: string;
}

export interface Participant {
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    age: number | null;
    isMinor: boolean;
    guardianName: string | null;
    guardianPhone: string | null;
    guardianRelationship?: string | null;
    notes: string | null;
    hasSpecialRequests?: boolean;
    specialRequestRaw?: string | null;
    status: 'active' | 'inactive' | 'withdrawn' | 'refunded' | 'missing_from_source';
    identityVerified?: boolean;
    identityNotes?: string | null;
    // Operational metadata (injected for roster/summary)
    actCount?: number;
    assetStats?: {
        total: number;
        approved: number;
        pending: number;
        missing: number;
    };
    // Trust-First Source Tracking
    sourceSystem: string | null;
    sourceInstance: string | null;
    sourceAnchorType: string | null;
    sourceAnchorValue: string | null;
    sourceImportedAt: string | null;
    sourceLastSeenAt: string | null;
    srcRaw: any | null;
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
    auditLogs: any[];
    actRequirements?: ActRequirement[];
}

/**
 * A Stage and its current live status, representing the real-time operational state used by the Stage Console.
 */
export interface StageConsoleState {
    id: string;
    name: string;
    description: string | null;
    status: StageStatus;
    currentLineupItemId: string | null;
    // Often, we want to know what Act is currently on stage
    currentAct?: Act | null;
}

/**
 * A scheduled item in a lineup, joining the Act details to the schedule time.
 */
export interface LineupSlot {
    id: string;
    stageId: string;
    actId: string;
    scheduledStartTime: string; // ISO String
    sortOrder: number;
    executionStatus: string;
    act: ActDetails; // The nested act details
}
