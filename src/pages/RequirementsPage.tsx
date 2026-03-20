import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import type { Database } from '@/types/database.types';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { supabase } from '@/lib/supabase';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

type SubjectTab = 'participants' | 'acts';
type Scope = 'event' | 'org';
type PolicyRow = Database['public']['Tables']['requirement_policies']['Row'];

type RequirementPreset = {
    id: string;
    code: string;
    subjectType: 'participant' | 'act';
    label: string;
    description: string;
    appliesTo: string;
    category: PolicyRow['category'];
    inputType: string;
    required: boolean;
    needsReview: boolean;
    blocking: boolean;
    bulk: boolean;
    availabilityLabel?: string;
    optional?: boolean;
};

type ResolvedPreset = {
    preset: RequirementPreset;
    orgPolicy: PolicyRow | null;
    eventPolicy: PolicyRow | null;
    currentPolicy: PolicyRow | null;
    source: 'org' | 'event' | 'inherited' | 'recommended';
    isActive: boolean;
    hasConflict: boolean;
};

const participantPresets: RequirementPreset[] = [
    {
        id: 'guardian',
        code: 'guardian_contact_complete',
        subjectType: 'participant',
        label: 'Guardian Contact',
        description: 'Capture guardian name and phone before the participant is cleared.',
        appliesTo: 'Minors only',
        category: 'safety',
        inputType: 'field_complete',
        required: true,
        needsReview: false,
        blocking: true,
        bulk: false,
    },
    {
        id: 'waiver',
        code: 'participant_waiver',
        subjectType: 'participant',
        label: 'Waiver',
        description: 'Collect a signed waiver or release artifact for each participant who needs one.',
        appliesTo: 'All participants',
        category: 'waiver',
        inputType: 'file_upload',
        required: true,
        needsReview: true,
        blocking: true,
        bulk: true,
    },
    {
        id: 'special-request',
        code: 'special_request_reviewed',
        subjectType: 'participant',
        label: 'Special Request Review',
        description: 'Ensure accommodations or notes are acknowledged before scheduling.',
        appliesTo: 'Special requests only',
        category: 'readiness',
        inputType: 'manual_review',
        required: true,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
];

const participantOptionalAddOns: RequirementPreset[] = [
    {
        id: 'identity',
        code: 'identity_check',
        subjectType: 'participant',
        label: 'Identity Check',
        description: 'Optional manual verification step for orgs or events that explicitly want it in their readiness model.',
        appliesTo: 'Selected participants',
        category: 'identity',
        inputType: 'manual_review',
        required: true,
        needsReview: true,
        blocking: false,
        bulk: true,
        availabilityLabel: 'Admin Request',
        optional: true,
    },
];

const actPresets: RequirementPreset[] = [
    {
        id: 'music',
        code: 'ACT_AUDIO',
        subjectType: 'act',
        label: 'Music Submitted',
        description: 'Track the act audio source before lineup finalization.',
        appliesTo: 'All acts',
        category: 'media',
        inputType: 'file_upload',
        required: true,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
    {
        id: 'intro',
        code: 'ACT_INTRO',
        subjectType: 'act',
        label: 'Intro Approved',
        description: 'Require intro approval before the act is truly stage ready.',
        appliesTo: 'Acts with intro',
        category: 'media',
        inputType: 'manual_review',
        required: true,
        needsReview: true,
        blocking: true,
        bulk: false,
    },
    {
        id: 'tech',
        code: 'ACT_LIGHTING',
        subjectType: 'act',
        label: 'Stage Tech Confirmed',
        description: 'Confirm microphone, props, lighting, and other technical needs.',
        appliesTo: 'All acts',
        category: 'technical',
        inputType: 'manual_review',
        required: true,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
    {
        id: 'support',
        code: 'ACT_SUPPORT_TEAM',
        subjectType: 'act',
        label: 'Support Team',
        description: 'Ensure a manager, choreographer, or support lead is attached where needed.',
        appliesTo: 'Selected acts',
        category: 'admin',
        inputType: 'manual_review',
        required: false,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
];

function buildPolicyPayload(
    preset: RequirementPreset,
    scope: Scope,
    organizationId: string | null,
    eventId: string | null,
): Database['public']['Tables']['requirement_policies']['Insert'] {
    return {
        organization_id: scope === 'org' ? organizationId : null,
        event_id: scope === 'event' ? eventId : null,
        code: preset.code,
        subject_type: preset.subjectType,
        label: preset.label,
        description: preset.description,
        category: preset.category,
        input_type: preset.inputType,
        input_config: {},
        is_required: preset.required,
        review_mode: preset.needsReview ? 'review_required' : 'no_review',
        blocking_level: preset.blocking ? 'blocking' : 'none',
        allow_bulk_approve: preset.bulk,
        applies_when: {
            appliesTo: preset.appliesTo,
            optional: Boolean(preset.optional),
        },
        is_active: true,
        sort_order: 0,
    };
}

function toneForState(active: boolean, tone: 'default' | 'good' | 'warning' | 'critical' | 'info') {
    if (!active) return 'default';
    return tone;
}

export default function RequirementsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false } = useIsSuperAdmin();
    const [subjectTab, setSubjectTab] = useState<SubjectTab>('participants');
    const [scope, setScope] = useState<Scope>('event');
    const [message, setMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const canManageRequirements =
        isSuperAdmin || currentEventRole === 'EventAdmin' || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const canManageCurrentScope =
        scope === 'org'
            ? isSuperAdmin || currentOrgRole === 'Owner' || currentOrgRole === 'Admin'
            : isSuperAdmin || currentEventRole === 'EventAdmin' || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const subjectType = subjectTab === 'participants' ? 'participant' : 'act';

    const presets = useMemo(
        () => (subjectTab === 'participants' ? participantPresets : actPresets),
        [subjectTab]
    );
    const optionalPresets = useMemo(
        () => (subjectTab === 'participants' ? participantOptionalAddOns : []),
        [subjectTab]
    );
    const allPresets = useMemo(
        () => [...presets, ...optionalPresets],
        [optionalPresets, presets]
    );

    const { data: orgPolicies = [], isLoading: isLoadingOrgPolicies } = useQuery({
        queryKey: ['requirement-policies', 'org', organizationId, subjectType],
        queryFn: async () => {
            if (!organizationId) return [] as PolicyRow[];
            const { data, error } = await supabase
                .from('requirement_policies')
                .select('*')
                .eq('organization_id', organizationId)
                .is('event_id', null)
                .eq('subject_type', subjectType)
                .order('sort_order')
                .order('label');

            if (error) throw error;
            return (data || []) as PolicyRow[];
        },
        enabled: !!organizationId,
    });

    const { data: eventPolicies = [], isLoading: isLoadingEventPolicies } = useQuery({
        queryKey: ['requirement-policies', 'event', eventId, subjectType],
        queryFn: async () => {
            if (!eventId) return [] as PolicyRow[];
            const { data, error } = await supabase
                .from('requirement_policies')
                .select('*')
                .eq('event_id', eventId)
                .eq('subject_type', subjectType)
                .order('sort_order')
                .order('label');

            if (error) throw error;
            return (data || []) as PolicyRow[];
        },
        enabled: !!eventId,
    });

    const policyMutation = useMutation({
        mutationFn: async ({
            preset,
            nextActive,
            scopeToMutate,
            currentPolicy,
        }: {
            preset: RequirementPreset;
            nextActive: boolean;
            scopeToMutate: Scope;
            currentPolicy: PolicyRow | null;
        }) => {
            if (scopeToMutate === 'org' && !organizationId) {
                throw new Error('No organization selected');
            }
            if (scopeToMutate === 'event' && !eventId) {
                throw new Error('No event selected');
            }

            if (currentPolicy) {
                const { error } = await supabase
                    .from('requirement_policies')
                    .update({
                        is_active: nextActive,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', currentPolicy.id);

                if (error) throw error;
                return;
            }

            const payload = buildPolicyPayload(preset, scopeToMutate, organizationId, eventId);
            if (!nextActive) {
                payload.is_active = false;
            }

            const { error } = await supabase
                .from('requirement_policies')
                .insert(payload);

            if (error) throw error;
        },
        onSuccess: async () => {
            setErrorMessage(null);
            setMessage('Requirements updated.');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['requirement-policies', 'org', organizationId, subjectType] }),
                queryClient.invalidateQueries({ queryKey: ['requirement-policies', 'event', eventId, subjectType] }),
            ]);
        },
        onError: (error: Error) => {
            setMessage(null);
            setErrorMessage(error.message || 'Could not update requirement policy.');
        },
    });

    const resolvedPresets = useMemo<ResolvedPreset[]>(() => {
        return allPresets.map((preset) => {
            const orgPolicy = orgPolicies.find((policy) => policy.code === preset.code) || null;
            const eventPolicy = eventPolicies.find((policy) => policy.code === preset.code) || null;
            const hasConflict = Boolean(orgPolicy && eventPolicy);

            if (scope === 'org') {
                return {
                    preset,
                    orgPolicy,
                    eventPolicy,
                    currentPolicy: orgPolicy,
                    source: orgPolicy ? 'org' : 'recommended',
                    isActive: Boolean(orgPolicy?.is_active),
                    hasConflict,
                };
            }

            if (orgPolicy) {
                return {
                    preset,
                    orgPolicy,
                    eventPolicy,
                    currentPolicy: orgPolicy,
                    source: 'inherited',
                    isActive: Boolean(orgPolicy.is_active),
                    hasConflict,
                };
            }

            return {
                preset,
                orgPolicy,
                eventPolicy,
                currentPolicy: eventPolicy,
                source: eventPolicy ? 'event' : 'recommended',
                isActive: Boolean(eventPolicy?.is_active),
                hasConflict,
            };
        });
    }, [allPresets, eventPolicies, orgPolicies, scope]);

    const summary = useMemo(() => {
        const activePresets = resolvedPresets.filter((preset) => preset.isActive);
        return {
            total: activePresets.length,
            blocking: activePresets.filter((preset) => preset.currentPolicy?.blocking_level === 'blocking' || (!preset.currentPolicy && preset.preset.blocking)).length,
            review: activePresets.filter((preset) => preset.currentPolicy?.review_mode === 'review_required' || (!preset.currentPolicy && preset.preset.needsReview)).length,
            bulk: activePresets.filter((preset) => preset.currentPolicy?.allow_bulk_approve || (!preset.currentPolicy && preset.preset.bulk)).length,
        };
    }, [resolvedPresets]);

    const destinationLabel =
        subjectTab === 'participants' ? 'Participants Workspace' : 'Performance Workspace';
    const primaryPresets = resolvedPresets.filter((preset) => !preset.preset.optional);
    const optionalResolvedPresets = resolvedPresets.filter((preset) => preset.preset.optional);
    const isLoadingPolicies = isLoadingOrgPolicies || (scope === 'event' && isLoadingEventPolicies);

    return (
        <div className="space-y-4 pb-12">
            <PageHeader
                title="Manage Requirements"
                subtitle={
                    canManageRequirements
                        ? 'Real readiness policies for org baselines and event-specific additions.'
                        : 'View-only preview of the active readiness policies for this org and event.'
                }
            />

            {errorMessage ? (
                <div className="surface-panel flex items-start gap-3 rounded-[1.2rem] border border-rose-500/20 bg-rose-500/5 p-3.5 text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            ) : null}

            {message ? (
                <div className="surface-panel rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-sm font-medium text-emerald-700">
                    {message}
                </div>
            ) : null}

            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 rounded-[1.15rem] bg-muted/35 p-1.5">
                    <button
                        onClick={() => setScope('event')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            scope === 'event' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                        }`}
                    >
                        This Event
                    </button>
                    <button
                        onClick={() => setScope('org')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            scope === 'org' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                        }`}
                    >
                        All Events In Org
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-[1.15rem] bg-muted/35 p-1.5">
                    <button
                        onClick={() => setSubjectTab('participants')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            subjectTab === 'participants'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground'
                        }`}
                    >
                        Participants
                    </button>
                    <button
                        onClick={() => setSubjectTab('acts')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            subjectTab === 'acts'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground'
                        }`}
                    >
                        Acts / Performances
                    </button>
                </div>
            </div>

            <div className="surface-panel rounded-[1.2rem] border p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Preset Coverage
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            {summary.blocking > 0
                                ? `${summary.blocking} blocking rules are active for ${
                                      subjectTab === 'participants' ? 'participant' : 'performance'
                                  } readiness.`
                                : 'No active rules are currently enabled for this scope.'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {scope === 'event'
                                ? 'Event rules inherit active org baselines and may only add event-specific policies.'
                                : 'Organization rules become the baseline for every event in this organization.'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(subjectTab === 'participants' ? '/participants' : '/performances')}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-primary"
                    >
                        Open {destinationLabel}
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <SummaryPill label="Active" value={summary.total} tone="default" />
                    <SummaryPill label="Blocking" value={summary.blocking} tone={summary.blocking > 0 ? 'critical' : 'good'} />
                    <SummaryPill label="Needs Review" value={summary.review} tone={summary.review > 0 ? 'warning' : 'good'} />
                    <SummaryPill label="Bulk Actions" value={summary.bulk} tone={summary.bulk > 0 ? 'info' : 'default'} />
                </div>
            </div>

            {scope === 'event' ? (
                <div className="surface-panel flex items-start gap-3 rounded-[1.2rem] border border-primary/10 bg-primary/5 p-3.5 text-primary">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium">
                        Org rules lock the baseline for this event. Event-level rules here are additive only and cannot override inherited org codes.
                    </p>
                </div>
            ) : null}

            {isLoadingPolicies ? (
                <div className="surface-panel flex justify-center rounded-[1.2rem] border py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="space-y-2.5">
                        {primaryPresets.map((resolvedPreset) => (
                            <PolicyCard
                                key={resolvedPreset.preset.id}
                                resolvedPreset={resolvedPreset}
                                canManageCurrentScope={canManageCurrentScope}
                                scope={scope}
                                isPending={policyMutation.isPending}
                                onToggle={(nextActive) => {
                                    setMessage(null);
                                    setErrorMessage(null);
                                    void policyMutation.mutate({
                                        preset: resolvedPreset.preset,
                                        nextActive,
                                        scopeToMutate: scope,
                                        currentPolicy: scope === 'org' ? resolvedPreset.orgPolicy : resolvedPreset.eventPolicy,
                                    });
                                }}
                                onOpenWorkspace={() => navigate(subjectTab === 'participants' ? '/participants' : '/performances')}
                            />
                        ))}
                    </div>

                    {optionalResolvedPresets.length > 0 ? (
                        <div className="surface-panel rounded-[1.2rem] border p-3.5">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                    Optional Admin Add-Ons
                                </p>
                                <p className="text-sm font-semibold text-foreground">
                                    Keep extra verification steps out of the default operator workflow until an admin explicitly turns them on.
                                </p>
                            </div>

                            <div className="mt-3 space-y-2.5">
                                {optionalResolvedPresets.map((resolvedPreset) => (
                                    <PolicyCard
                                        key={resolvedPreset.preset.id}
                                        resolvedPreset={resolvedPreset}
                                        canManageCurrentScope={canManageCurrentScope}
                                        scope={scope}
                                        isPending={policyMutation.isPending}
                                        onToggle={(nextActive) => {
                                            setMessage(null);
                                            setErrorMessage(null);
                                            void policyMutation.mutate({
                                                preset: resolvedPreset.preset,
                                                nextActive,
                                                scopeToMutate: scope,
                                                currentPolicy: scope === 'org' ? resolvedPreset.orgPolicy : resolvedPreset.eventPolicy,
                                            });
                                        }}
                                        onOpenWorkspace={() => navigate('/participants')}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}

function PolicyCard({
    resolvedPreset,
    canManageCurrentScope,
    scope,
    isPending,
    onToggle,
    onOpenWorkspace,
}: {
    resolvedPreset: ResolvedPreset;
    canManageCurrentScope: boolean;
    scope: Scope;
    isPending: boolean;
    onToggle: (nextActive: boolean) => void;
    onOpenWorkspace: () => void;
}) {
    const { preset, currentPolicy, source, isActive, hasConflict } = resolvedPreset;

    const sourceLabel = source === 'org'
        ? 'Org Baseline'
        : source === 'event'
            ? 'Event Rule'
            : source === 'inherited'
                ? 'Inherited'
                : preset.optional
                    ? preset.availabilityLabel || 'Optional'
                    : 'Recommended';

    const sourceTone = source === 'org'
        ? 'bg-primary/10 text-primary'
        : source === 'event'
            ? 'bg-sky-500/10 text-sky-700'
            : source === 'inherited'
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-muted text-muted-foreground';

    const actionDisabled = isPending || (scope === 'event' && source === 'inherited');
    const actionLabel = scope === 'event' && source === 'inherited'
        ? 'Inherited From Org'
        : isActive
            ? 'Turn Off'
            : source === 'recommended'
                ? 'Turn On'
                : 'Turn On';

    return (
        <div className="surface-panel rounded-[1.2rem] border px-3.5 py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-foreground">{preset.label}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${sourceTone}`}>
                            {sourceLabel}
                        </span>
                        <span className="rounded-full bg-black/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                            {preset.appliesTo}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{currentPolicy?.description || preset.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                        <StateChip
                            label="Required"
                            active={currentPolicy ? currentPolicy.is_required : preset.required}
                            tone={toneForState(currentPolicy ? currentPolicy.is_required : preset.required, 'good')}
                        />
                        <StateChip
                            label="Review"
                            active={currentPolicy ? currentPolicy.review_mode === 'review_required' : preset.needsReview}
                            tone={toneForState(currentPolicy ? currentPolicy.review_mode === 'review_required' : preset.needsReview, 'warning')}
                        />
                        <StateChip
                            label="Blocks"
                            active={currentPolicy ? currentPolicy.blocking_level === 'blocking' : preset.blocking}
                            tone={toneForState(currentPolicy ? currentPolicy.blocking_level === 'blocking' : preset.blocking, 'critical')}
                        />
                        <StateChip
                            label="Bulk"
                            active={currentPolicy ? currentPolicy.allow_bulk_approve : preset.bulk}
                            tone={toneForState(currentPolicy ? currentPolicy.allow_bulk_approve : preset.bulk, 'info')}
                        />
                        <StateChip label="Active" active={isActive} tone={toneForState(isActive, 'good')} />
                    </div>
                    {hasConflict ? (
                        <p className="text-xs font-medium text-amber-700">
                            Legacy conflict detected: both org and event rules exist for this code. The org baseline should win.
                        </p>
                    ) : null}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                    {canManageCurrentScope ? (
                        <button
                            onClick={() => onToggle(!isActive)}
                            disabled={actionDisabled}
                            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 text-[10px] font-black uppercase tracking-[0.18em] ${
                                actionDisabled
                                    ? 'border-border/50 bg-muted text-muted-foreground'
                                    : isActive
                                        ? 'border-border/60 bg-background/70 text-foreground/70'
                                        : 'border-primary/20 bg-primary/5 text-primary'
                            }`}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : actionLabel}
                        </button>
                    ) : null}
                    <button
                        onClick={onOpenWorkspace}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-border/60 bg-background/70 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70"
                        aria-label={`Open ${preset.label}`}
                    >
                        Open
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'default' | 'good' | 'warning' | 'critical' | 'info';
}) {
    const toneClasses = {
        default: 'bg-muted/60 text-foreground',
        good: 'bg-emerald-500/10 text-emerald-700',
        warning: 'bg-orange-500/10 text-orange-700',
        critical: 'bg-rose-500/10 text-rose-700',
        info: 'bg-sky-500/10 text-sky-700',
    };

    return (
        <div className={`rounded-[1rem] px-3 py-3 ${toneClasses[tone]}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.18em]">{label}</p>
            <p className="mt-1 text-lg font-black tracking-tight">{value}</p>
        </div>
    );
}

function StateChip({
    label,
    active,
    tone,
}: {
    label: string;
    active: boolean;
    tone: 'default' | 'good' | 'warning' | 'critical' | 'info';
}) {
    const toneClasses = {
        default: 'bg-muted text-muted-foreground',
        good: 'bg-emerald-500/10 text-emerald-700',
        warning: 'bg-orange-500/10 text-orange-700',
        critical: 'bg-rose-500/10 text-rose-700',
        info: 'bg-sky-500/10 text-sky-700',
    };

    return (
        <span
            className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.16em] ${toneClasses[tone]}`}
        >
            {label}: {active ? 'On' : 'Off'}
        </span>
    );
}
