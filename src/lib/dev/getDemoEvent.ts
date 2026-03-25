import { supabase } from '@/lib/supabase';
import { DEV_FIXTURE_EVENT_NAME } from '@/lib/dev/constants';

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
        .eq('name', DEV_FIXTURE_EVENT_NAME)
        .single();

    if (error || !event) {
        throw new Error(
            `Dev fixture event "${DEV_FIXTURE_EVENT_NAME}" not found. ` +
            `Use "Reset Dev Fixture" on the Dev Login page to create or rebuild it.`
        );
    }

    return {
        eventId: event.id,
        organizationId: event.organization_id
    };
}
