import { supabase } from '@/lib/supabase';

export interface DemoEventContext {
    eventId: string;
    organizationId: string;
}

/**
 * DEV ONLY helper to retrieve the primary demo event context.
 * Used by query hooks and dev utilities to avoid hardcoding UUIDs.
 */
export async function getDemoEvent(): Promise<DemoEventContext> {
    const { data: event, error } = await supabase
        .from('events')
        .select('id, organization_id')
        .eq('name', 'ZiffyVolve Talent Showcase MVP 2026')
        .single();

    if (error || !event) {
        throw new Error(
            `Demo Event "ZiffyVolve Talent Showcase MVP 2026" not found. ` +
            `Please run the seed script or click "Reset Demo Event" on the Dev Login page.`
        );
    }

    return {
        eventId: event.id,
        organizationId: event.organization_id
    };
}
