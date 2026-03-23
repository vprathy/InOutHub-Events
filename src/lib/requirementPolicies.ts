import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type RequirementPolicy = Database['public']['Tables']['requirement_policies']['Row'];
export type RequirementSubjectType = RequirementPolicy['subject_type'];

export type ResolvedRequirementPolicy = RequirementPolicy & {
    source: 'org' | 'event';
    inheritedFromOrg: boolean;
};

export function normalizeRequirementPolicyCode(code?: string | null) {
    if (code === 'identity_verified') return 'identity_check';
    return code || null;
}

export const ACT_POLICY_REQUIREMENT_TYPE_MAP: Record<string, string> = {
    ACT_AUDIO: 'Audio',
    ACT_INTRO: 'IntroComposition',
    ACT_LIGHTING: 'Lighting',
    ACT_MICROPHONE: 'Microphone',
    ACT_VIDEO: 'Video',
    ACT_POSTER: 'Poster',
    ACT_GENERATIVE: 'Generative',
    ACT_GENERATIVE_AUDIO: 'Generative_Audio',
    ACT_GENERATIVE_VIDEO: 'Generative_Video',
    ACT_WAIVER: 'Waiver',
};

export function resolveRequirementPolicies(
    orgPolicies: RequirementPolicy[] | null | undefined,
    eventPolicies: RequirementPolicy[] | null | undefined,
): ResolvedRequirementPolicy[] {
    const resolved = new Map<string, ResolvedRequirementPolicy>();

    (orgPolicies || [])
        .filter((policy) => policy.is_active)
        .forEach((policy) => {
            const normalizedCode = normalizeRequirementPolicyCode(policy.code);
            if (!normalizedCode) return;

            resolved.set(normalizedCode, {
                ...policy,
                code: normalizedCode,
                source: 'org',
                inheritedFromOrg: false,
            });
        });

    (eventPolicies || [])
        .filter((policy) => policy.is_active)
        .forEach((policy) => {
            const normalizedCode = normalizeRequirementPolicyCode(policy.code);
            if (!normalizedCode) return;

            resolved.set(normalizedCode, {
                ...policy,
                code: normalizedCode,
                source: 'event',
                inheritedFromOrg: false,
            });
        });

    return Array.from(resolved.values()).sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.label.localeCompare(b.label);
    });
}

export async function fetchResolvedRequirementPolicies(
    eventId: string,
    subjectType: RequirementSubjectType,
): Promise<ResolvedRequirementPolicy[]> {
    const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('organization_id')
        .eq('id', eventId)
        .single();

    if (eventError) throw eventError;

    const organizationId = eventData.organization_id;

    const [{ data: orgPolicies, error: orgError }, { data: eventPolicies, error: scopedError }] = await Promise.all([
        supabase
            .from('requirement_policies')
            .select('*')
            .eq('organization_id', organizationId)
            .is('event_id', null)
            .eq('subject_type', subjectType)
            .eq('is_active', true),
        supabase
            .from('requirement_policies')
            .select('*')
            .eq('event_id', eventId)
            .eq('subject_type', subjectType)
            .eq('is_active', true),
    ]);

    if (orgError) throw orgError;
    if (scopedError) throw scopedError;

    return resolveRequirementPolicies(orgPolicies || [], eventPolicies || []);
}
