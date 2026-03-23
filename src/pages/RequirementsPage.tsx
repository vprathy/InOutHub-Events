import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Funnel, Loader2, Search, X } from 'lucide-react';
import type { Database } from '@/types/database.types';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { supabase } from '@/lib/supabase';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { normalizeRequirementPolicyCode } from '@/lib/requirementPolicies';
import { InlineInfoTip } from '@/components/ui/InlineInfoTip';
import { useSearchParams } from 'react-router-dom';

type Scope = 'event' | 'org';
type GroupKey = 'org-people' | 'org-performances' | 'event-people' | 'event-performances';
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

function getResolvedPresetRank(preset: ResolvedPreset) {
    if (!preset.isActive) return 4;
    const currentPolicy = preset.currentPolicy;
    const blocking = currentPolicy?.blocking_level === 'blocking' || (!currentPolicy && preset.preset.blocking);
    const review = currentPolicy?.review_mode === 'review_required' || (!currentPolicy && preset.preset.needsReview);

    if (blocking) return 1;
    if (review) return 2;
    return 3;
}

function resolvePresetsForScope({
    scope,
    presets,
    orgPolicies,
    eventPolicies,
}: {
    scope: Scope;
    presets: RequirementPreset[];
    orgPolicies: PolicyRow[];
    eventPolicies: PolicyRow[];
}): ResolvedPreset[] {
    const safePresets = presets.filter(Boolean);
    const safeOrgPolicies = orgPolicies.filter((policy): policy is PolicyRow => Boolean(policy?.code));
    const safeEventPolicies = eventPolicies.filter((policy): policy is PolicyRow => Boolean(policy?.code));

    return safePresets.map((preset) => {
        const orgPolicy = safeOrgPolicies.find((policy) => normalizeRequirementPolicyCode(policy.code) === preset.code) || null;
        const eventPolicy = safeEventPolicies.find((policy) => normalizeRequirementPolicyCode(policy.code) === preset.code) || null;
        const hasConflict = Boolean(orgPolicy && eventPolicy);
        const activeOrgPolicy = orgPolicy?.is_active ? orgPolicy : null;

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

        if (activeOrgPolicy) {
            return {
                preset,
                orgPolicy,
                eventPolicy,
                currentPolicy: activeOrgPolicy,
                source: 'inherited',
                isActive: true,
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
}

function buildScopeSummary(resolvedPresets: ResolvedPreset[]) {
    const activePresets = resolvedPresets.filter((preset) => preset.isActive);
    const stopReadiness = activePresets.filter(
        (preset) => preset.currentPolicy?.blocking_level === 'blocking' || (!preset.currentPolicy && preset.preset.blocking)
    ).length;
    const needReviewOnly = activePresets.filter((preset) => {
        const isBlocking = preset.currentPolicy?.blocking_level === 'blocking' || (!preset.currentPolicy && preset.preset.blocking);
        const needsReview = preset.currentPolicy?.review_mode === 'review_required' || (!preset.currentPolicy && preset.preset.needsReview);
        return !isBlocking && needsReview;
    }).length;
    const standard = Math.max(activePresets.length - stopReadiness - needReviewOnly, 0);
    const breakdown = [
        stopReadiness > 0 ? `${stopReadiness} stop readiness` : null,
        needReviewOnly > 0 ? `${needReviewOnly} review` : null,
        standard > 0 ? `${standard} standard` : null,
    ].filter(Boolean) as string[];

    return {
        total: activePresets.length,
        stopReadiness,
        needReviewOnly,
        standard,
        bulk: activePresets.filter((preset) => preset.currentPolicy?.allow_bulk_approve || (!preset.currentPolicy && preset.preset.bulk)).length,
        sentence: breakdown.length > 0
            ? `${activePresets.length} active reqs (${breakdown.join(', ')})`
            : `${activePresets.length} active reqs`,
    };
}

function sortResolvedPresets(resolvedPresets: ResolvedPreset[]) {
    return [...resolvedPresets].sort((a, b) => {
        const rankDiff = getResolvedPresetRank(a) - getResolvedPresetRank(b);
        if (rankDiff !== 0) return rankDiff;
        return a.preset.label.localeCompare(b.preset.label);
    });
}

const guardianPreset: RequirementPreset = {
    id: 'guardian',
    code: 'guardian_contact_complete',
    subjectType: 'participant',
    label: 'Guardian Contact for Minors',
    description: 'Capture guardian name and phone before a minor is cleared.',
    appliesTo: 'Minors only',
    category: 'safety',
    inputType: 'field_complete',
    required: true,
    needsReview: false,
    blocking: true,
    bulk: false,
};

const waiverPreset: RequirementPreset = {
    id: 'waiver',
    code: 'participant_waiver',
    subjectType: 'participant',
    label: 'Waiver',
    description: 'Collect a signed waiver or release artifact.',
    appliesTo: 'All people',
    category: 'waiver',
    inputType: 'file_upload',
    required: true,
    needsReview: true,
    blocking: true,
    bulk: true,
};

const identityPreset: RequirementPreset = {
    id: 'identity',
    code: 'identity_check',
    subjectType: 'participant',
    label: 'Identity Check',
    description: 'Verify identity before the person is considered clear.',
    appliesTo: 'Selected people',
    category: 'identity',
    inputType: 'manual_review',
    required: true,
    needsReview: true,
    blocking: false,
    bulk: true,
    optional: true,
};

const introPreset: RequirementPreset = {
    id: 'intro',
    code: 'ACT_INTRO',
    subjectType: 'act',
    label: 'Intro Approved',
    description: 'Require intro approval before the performance is stage ready.',
    appliesTo: 'Performances with intro',
    category: 'media',
    inputType: 'manual_review',
    required: true,
    needsReview: true,
    blocking: true,
    bulk: false,
};

const musicPreset: RequirementPreset = {
    id: 'music',
    code: 'ACT_AUDIO',
    subjectType: 'act',
    label: 'Music File',
    description: 'Track the submitted performance music file.',
    appliesTo: 'All performances',
    category: 'media',
    inputType: 'file_upload',
    required: true,
    needsReview: true,
    blocking: false,
    bulk: false,
};

const photoPreset: RequirementPreset = {
    id: 'photo',
    code: 'participant_photo',
    subjectType: 'participant',
    label: 'Participant Photo',
    description: 'Collect a current participant photo for lineup and console use.',
    appliesTo: 'All people',
    category: 'media',
    inputType: 'file_upload',
    required: true,
    needsReview: true,
    blocking: false,
    bulk: true,
};

const orgPeoplePresets: RequirementPreset[] = [waiverPreset, guardianPreset, identityPreset, photoPreset];
const orgPerformancePresets: RequirementPreset[] = [introPreset, musicPreset];
const eventPeoplePresets: RequirementPreset[] = [photoPreset];
const eventPerformancePresets: RequirementPreset[] = [musicPreset];

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

function getRequirementMutationErrorMessage(error: Error) {
    const raw = error.message || 'Could not update requirement policy.';
    if (raw.includes('cannot override inherited organization policy')) {
        return 'This requirement is already controlled at the org level. Change it under Org Requirements instead of Event Requirements.';
    }
    return raw;
}

export default function RequirementsPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false } = useIsSuperAdmin();
    const [message, setMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'on' | 'off'>('all');
    const [openScopes, setOpenScopes] = useState<Record<Scope, boolean>>({ org: false, event: true });
    const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({
        'org-people': true,
        'org-performances': true,
        'event-people': true,
        'event-performances': true,
    });
    const toggleGroup = (key: GroupKey) => {
        setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
    };
    const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
    const openPanel = searchParams.get('panel');
    const isSearchPanelOpen = openPanel === 'req-search';
    const isFilterPanelOpen = openPanel === 'req-filter';

    const closeTopPanel = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('panel');
        setSearchParams(nextParams, { replace: true });
    };

    const canManageRequirements =
        isSuperAdmin || currentEventRole === 'EventAdmin' || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const canManageOrgScope = isSuperAdmin || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const canManageEventScope = isSuperAdmin || currentEventRole === 'EventAdmin' || canManageOrgScope;

    const { data: orgParticipantPolicies = [], isLoading: isLoadingOrgParticipantPolicies } = useQuery({
        queryKey: ['requirement-policies', 'org', organizationId, 'participant'],
        queryFn: async () => {
            if (!organizationId) return [] as PolicyRow[];
            const { data, error } = await supabase
                .from('requirement_policies')
                .select('*')
                .eq('organization_id', organizationId)
                .is('event_id', null)
                .eq('subject_type', 'participant')
                .order('sort_order')
                .order('label');

            if (error) throw error;
            return (data || []) as PolicyRow[];
        },
        enabled: !!organizationId,
    });

    const { data: orgActPolicies = [], isLoading: isLoadingOrgActPolicies } = useQuery({
        queryKey: ['requirement-policies', 'org', organizationId, 'act'],
        queryFn: async () => {
            if (!organizationId) return [] as PolicyRow[];
            const { data, error } = await supabase
                .from('requirement_policies')
                .select('*')
                .eq('organization_id', organizationId)
                .is('event_id', null)
                .eq('subject_type', 'act')
                .order('sort_order')
                .order('label');

            if (error) throw error;
            return (data || []) as PolicyRow[];
        },
        enabled: !!organizationId,
    });

    const { data: eventParticipantPolicies = [], isLoading: isLoadingEventParticipantPolicies } = useQuery({
        queryKey: ['requirement-policies', 'event', eventId, 'participant'],
        queryFn: async () => {
            if (!eventId) return [] as PolicyRow[];
            const { data, error } = await supabase
                .from('requirement_policies')
                .select('*')
                .eq('event_id', eventId)
                .eq('subject_type', 'participant')
                .order('sort_order')
                .order('label');

            if (error) throw error;
            return (data || []) as PolicyRow[];
        },
        enabled: !!eventId,
    });

    const { data: eventActPolicies = [], isLoading: isLoadingEventActPolicies } = useQuery({
        queryKey: ['requirement-policies', 'event', eventId, 'act'],
        queryFn: async () => {
            if (!eventId) return [] as PolicyRow[];
            const { data, error } = await supabase
                .from('requirement_policies')
                .select('*')
                .eq('event_id', eventId)
                .eq('subject_type', 'act')
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
                queryClient.invalidateQueries({ queryKey: ['requirement-policies', 'org', organizationId] }),
                queryClient.invalidateQueries({ queryKey: ['requirement-policies', 'event', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['participants', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['participant'] }),
                queryClient.invalidateQueries({ queryKey: ['acts', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['act'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard-radar', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard-special-requests', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard-participant-requirement-policies', eventId] }),
            ]);
        },
        onError: (error: Error) => {
            setMessage(null);
            setErrorMessage(getRequirementMutationErrorMessage(error));
        },
    });

    const orgPeopleResolved = useMemo(
        () => sortResolvedPresets(resolvePresetsForScope({
            scope: 'org',
            presets: orgPeoplePresets,
            orgPolicies: orgParticipantPolicies,
            eventPolicies: [],
        })),
        [orgParticipantPolicies],
    );
    const orgPerformancesResolved = useMemo(
        () => sortResolvedPresets(resolvePresetsForScope({
            scope: 'org',
            presets: orgPerformancePresets,
            orgPolicies: orgActPolicies,
            eventPolicies: [],
        })),
        [orgActPolicies],
    );
    const eventPeopleResolved = useMemo(
        () => sortResolvedPresets(resolvePresetsForScope({
            scope: 'event',
            presets: eventPeoplePresets,
            orgPolicies: orgParticipantPolicies,
            eventPolicies: eventParticipantPolicies,
        }).filter((preset) => preset.source !== 'inherited')),
        [eventParticipantPolicies, orgParticipantPolicies],
    );
    const eventPerformancesResolved = useMemo(
        () => sortResolvedPresets(resolvePresetsForScope({
            scope: 'event',
            presets: eventPerformancePresets,
            orgPolicies: orgActPolicies,
            eventPolicies: eventActPolicies,
        }).filter((preset) => preset.source !== 'inherited')),
        [eventActPolicies, orgActPolicies],
    );

    const filterResolvedPresets = (presets: ResolvedPreset[]) =>
        presets.filter((preset) => {
            const matchesSearch = !deferredSearchQuery
                || preset.preset.label.toLowerCase().includes(deferredSearchQuery)
                || preset.preset.description.toLowerCase().includes(deferredSearchQuery);
            if (!matchesSearch) return false;
            if (activeFilter === 'on') return preset.isActive;
            if (activeFilter === 'off') return !preset.isActive;
            return true;
        });

    const filteredOrgPeopleResolved = useMemo(() => filterResolvedPresets(orgPeopleResolved), [orgPeopleResolved, deferredSearchQuery, activeFilter]);
    const filteredOrgPerformancesResolved = useMemo(() => filterResolvedPresets(orgPerformancesResolved), [orgPerformancesResolved, deferredSearchQuery, activeFilter]);
    const filteredEventPeopleResolved = useMemo(() => filterResolvedPresets(eventPeopleResolved), [eventPeopleResolved, deferredSearchQuery, activeFilter]);
    const filteredEventPerformancesResolved = useMemo(() => filterResolvedPresets(eventPerformancesResolved), [eventPerformancesResolved, deferredSearchQuery, activeFilter]);

    const filteredOrgSummary = useMemo(
        () => buildScopeSummary([...filteredOrgPeopleResolved, ...filteredOrgPerformancesResolved]),
        [filteredOrgPeopleResolved, filteredOrgPerformancesResolved],
    );
    const filteredEventSummary = useMemo(
        () => buildScopeSummary([...filteredEventPeopleResolved, ...filteredEventPerformancesResolved]),
        [filteredEventPeopleResolved, filteredEventPerformancesResolved],
    );

    const isLoadingPolicies =
        isLoadingOrgParticipantPolicies
        || isLoadingOrgActPolicies
        || isLoadingEventParticipantPolicies
        || isLoadingEventActPolicies;

    return (
        <div className="min-w-0 space-y-4 overflow-x-hidden pb-12">
            <PageHeader
                title="Manage Requirements"
                subtitle={
                    canManageRequirements
                        ? 'Choose what people and performances need.'
                        : 'See what people and performances need.'
                }
            />

            {isSearchPanelOpen || isFilterPanelOpen ? (
                <div className="surface-panel rounded-[1.05rem] border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                {isSearchPanelOpen ? 'Search' : 'Filter'}
                            </p>
                            <p className="mt-1 text-sm font-medium text-foreground/80">
                                {isSearchPanelOpen ? 'Find a requirement quickly.' : 'Show only active or inactive requirements.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeTopPanel}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Close search and filter tools"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {isSearchPanelOpen ? (
                        <label className="relative mt-3 block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search requirements"
                                className="h-11 w-full rounded-xl border border-border/60 bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/30"
                            />
                        </label>
                    ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {([
                                { value: 'all', label: 'All' },
                                { value: 'on', label: 'On' },
                                { value: 'off', label: 'Off' },
                            ] as const).map((option) => {
                                const isActive = activeFilter === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setActiveFilter(option.value)}
                                        className={`inline-flex min-h-[40px] items-center rounded-xl border px-3 text-xs font-black uppercase tracking-[0.16em] ${
                                            isActive
                                                ? 'border-primary/25 bg-primary/12 text-primary'
                                                : 'border-border/60 bg-background/70 text-muted-foreground'
                                        }`}
                                    >
                                        <Funnel className="mr-2 h-3.5 w-3.5" />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}

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

            {isLoadingPolicies ? (
                <div className="surface-panel flex justify-center rounded-[1.2rem] border py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        <ScopeCard
                            title="Event Requirements"
                            summary={filteredEventSummary.sentence}
                            infoLabel="Event requirements"
                            infoBody="These requirements apply only to this event and affect readiness here without changing org-wide defaults."
                            note="Primary setup for this event"
                            tone="event"
                            isOpen={openScopes.event}
                            onToggle={() => setOpenScopes((current) => ({ ...current, event: !current.event }))}
                        >
                            <RequirementGroup
                                title="People"
                                isOpen={openGroups['event-people']}
                                onExpandToggle={() => toggleGroup('event-people')}
                                canManageScope={canManageEventScope}
                                resolvedPresets={filteredEventPeopleResolved}
                                scope="event"
                                isPending={policyMutation.isPending}
                                onPolicyToggle={(resolvedPreset, nextActive) => {
                                    setMessage(null);
                                    setErrorMessage(null);
                                    void policyMutation.mutate({
                                        preset: resolvedPreset.preset,
                                        nextActive,
                                        scopeToMutate: 'event',
                                        currentPolicy: resolvedPreset.eventPolicy,
                                    });
                                }}
                            />
                            <RequirementGroup
                                title="Performances"
                                isOpen={openGroups['event-performances']}
                                onExpandToggle={() => toggleGroup('event-performances')}
                                canManageScope={canManageEventScope}
                                resolvedPresets={filteredEventPerformancesResolved}
                                scope="event"
                                isPending={policyMutation.isPending}
                                onPolicyToggle={(resolvedPreset, nextActive) => {
                                    setMessage(null);
                                    setErrorMessage(null);
                                    void policyMutation.mutate({
                                        preset: resolvedPreset.preset,
                                        nextActive,
                                        scopeToMutate: 'event',
                                        currentPolicy: resolvedPreset.eventPolicy,
                                    });
                                }}
                            />
                        </ScopeCard>

                        <ScopeCard
                            title="Org Requirements"
                            summary={filteredOrgSummary.sentence}
                            infoLabel="Org requirements"
                            infoBody="Use org requirements only for org-wide safety, compliance, or liability checks that should apply to every event."
                            note="Use sparingly for org-wide risk controls"
                            tone="org"
                            isOpen={openScopes.org}
                            onToggle={() => setOpenScopes((current) => ({ ...current, org: !current.org }))}
                        >
                            <RequirementGroup
                                title="People"
                                isOpen={openGroups['org-people']}
                                onExpandToggle={() => toggleGroup('org-people')}
                                canManageScope={canManageOrgScope}
                                resolvedPresets={filteredOrgPeopleResolved}
                                scope="org"
                                isPending={policyMutation.isPending}
                                onPolicyToggle={(resolvedPreset, nextActive) => {
                                    setMessage(null);
                                    setErrorMessage(null);
                                    void policyMutation.mutate({
                                        preset: resolvedPreset.preset,
                                        nextActive,
                                        scopeToMutate: 'org',
                                        currentPolicy: resolvedPreset.orgPolicy,
                                    });
                                }}
                            />
                            <RequirementGroup
                                title="Performances"
                                isOpen={openGroups['org-performances']}
                                onExpandToggle={() => toggleGroup('org-performances')}
                                canManageScope={canManageOrgScope}
                                resolvedPresets={filteredOrgPerformancesResolved}
                                scope="org"
                                isPending={policyMutation.isPending}
                                onPolicyToggle={(resolvedPreset, nextActive) => {
                                    setMessage(null);
                                    setErrorMessage(null);
                                    void policyMutation.mutate({
                                        preset: resolvedPreset.preset,
                                        nextActive,
                                        scopeToMutate: 'org',
                                        currentPolicy: resolvedPreset.orgPolicy,
                                    });
                                }}
                            />
                        </ScopeCard>
                    </div>
                </>
            )}
        </div>
    );
}

function ScopeCard({
    title,
    summary,
    infoLabel,
    infoBody,
    note,
    isOpen,
    onToggle,
    tone = 'default',
    children,
}: {
    title: string;
    summary: string;
    infoLabel: string;
    infoBody: string;
    note?: string;
    isOpen: boolean;
    onToggle: () => void;
    tone?: 'default' | 'org' | 'event';
    children: React.ReactNode;
}) {
    const shellTone =
        tone === 'org'
            ? 'border-sky-500/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.06),rgba(14,165,233,0.02))] shadow-[0_10px_30px_-24px_rgba(14,165,233,0.45)]'
            : tone === 'event'
                ? 'border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))] shadow-[0_10px_30px_-24px_rgba(245,158,11,0.45)]'
                : 'bg-background/60';

    return (
        <section className={`surface-panel overflow-hidden rounded-[1.2rem] border ${shellTone}`}>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
            >
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
                    <p className="mt-1 text-sm font-medium text-foreground/85">{summary}</p>
                    {note ? (
                        <p className="mt-1 text-xs font-medium text-muted-foreground">{note}</p>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <InlineInfoTip label={infoLabel} body={infoBody} align="right" />
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen ? <div className="border-t border-border/50 px-4 py-2">{children}</div> : null}
        </section>
    );
}

function RequirementGroup({
    title,
    isOpen,
    onExpandToggle,
    canManageScope,
    resolvedPresets,
    scope,
    isPending,
    onPolicyToggle,
}: {
    title: string;
    isOpen: boolean;
    onExpandToggle: () => void;
    canManageScope: boolean;
    resolvedPresets: ResolvedPreset[];
    scope: Scope;
    isPending: boolean;
    onPolicyToggle: (resolvedPreset: ResolvedPreset, nextActive: boolean) => void;
}) {
    const groupSummary = buildScopeSummary(resolvedPresets).sentence;

    return (
        <section className="rounded-[0.95rem] border-b border-border/30 bg-background/78 px-3 last:border-b-0">
            <button
                type="button"
                onClick={onExpandToggle}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-3 py-3 text-left"
            >
                <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">{title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{groupSummary}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen ? (
                <div className="border-t border-border/40 pb-3">
                    <div className="grid grid-cols-[minmax(0,1fr),96px] items-center px-1 pb-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Requirement</p>
                        <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                    </div>
                    {resolvedPresets.length > 0 ? (
                        <div className="divide-y divide-border/35 rounded-[0.95rem] border border-border/40 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                            {resolvedPresets.map((resolvedPreset) => (
                                <PolicyCard
                                    key={resolvedPreset.preset.id}
                                    resolvedPreset={resolvedPreset}
                                    canManageCurrentScope={canManageScope}
                                    scope={scope}
                                    isPending={isPending}
                                    onToggle={(nextActive) => onPolicyToggle(resolvedPreset, nextActive)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="px-1 pt-2 text-sm text-muted-foreground">No event-specific requirements here.</p>
                    )}
                </div>
            ) : null}
        </section>
    );
}

function PolicyCard({
    resolvedPreset,
    canManageCurrentScope,
    scope,
    isPending,
    onToggle,
}: {
    resolvedPreset: ResolvedPreset;
    canManageCurrentScope: boolean;
    scope: Scope;
    isPending: boolean;
    onToggle: (nextActive: boolean) => void;
}) {
    const { preset, currentPolicy, source, isActive, hasConflict } = resolvedPreset;
    const reviewActive = isActive && (currentPolicy ? currentPolicy.review_mode === 'review_required' : preset.needsReview);
    const blockingActive = isActive && (currentPolicy ? currentPolicy.blocking_level === 'blocking' : preset.blocking);
    const summaryText = [
        source === 'inherited'
            ? 'From org'
            : source === 'event'
                ? 'For this event'
                : source === 'org'
                    ? 'Org default'
                    : preset.optional
                        ? 'Optional'
                        : 'Suggested',
        preset.appliesTo,
    ].join(' • ');

    const actionDisabled = isPending || (scope === 'event' && source === 'inherited');
    const actionLabel = isActive ? 'On' : 'Off';
    const statusTone = isActive
        ? blockingActive
            ? 'text-rose-700'
            : reviewActive
                ? 'text-orange-700'
                : 'text-primary'
        : 'text-muted-foreground';

    return (
        <div className="px-3 py-3">
            <div className="flex min-h-[52px] items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-foreground">{preset.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{summaryText}</p>
                    {hasConflict ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                            Org and event both define this requirement. Org should win.
                        </p>
                    ) : null}
                </div>
                {canManageCurrentScope ? (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        onClick={() => onToggle(!isActive)}
                        disabled={actionDisabled}
                        className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border transition-colors ${
                            actionDisabled
                                ? 'border-border/50 bg-muted/70'
                                : isActive
                                    ? 'border-emerald-500/35 bg-emerald-500/18'
                                    : 'border-slate-400/70 bg-slate-200/80 dark:border-slate-500/70 dark:bg-slate-700/80'
                        }`}
                        aria-label={`${isActive ? 'Turn off' : 'Turn on'} ${preset.label}`}
                        title={actionDisabled ? 'Inherited from org' : `${isActive ? 'Turn off' : 'Turn on'} ${preset.label}`}
                    >
                        {isPending ? (
                            <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <span className={`absolute left-2 text-[9px] font-black uppercase tracking-[0.14em] ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-300'}`}>
                                    {isActive ? 'On' : ''}
                                </span>
                                <span className={`absolute right-2 text-[9px] font-black uppercase tracking-[0.14em] ${!isActive ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-600/70 dark:text-emerald-300/70'}`}>
                                    {!isActive ? 'Off' : ''}
                                </span>
                                <span
                                    className={`absolute h-6 w-6 rounded-full shadow-sm transition-transform ${
                                        isActive ? 'bg-emerald-600' : 'bg-slate-600 dark:bg-slate-200'
                                    } ${
                                        isActive ? 'translate-x-[34px]' : 'translate-x-[3px]'
                                    }`}
                                />
                            </>
                        )}
                    </button>
                ) : (
                    <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${statusTone}`}>{actionLabel}</span>
                )}
            </div>
        </div>
    );
}
