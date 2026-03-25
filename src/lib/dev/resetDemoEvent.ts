import { supabase } from '@/lib/supabase';
import { DEV_FIXTURE_EVENT_NAME, DEV_FIXTURE_ORGANIZATION_NAME } from '@/lib/dev/constants';
import { seedDemoEvent } from '@/lib/dev/seedDemoEvent';
import { getDemoEvent } from '@/lib/dev/getDemoEvent';

export async function resetDemoEvent() {
    if (!import.meta.env.DEV) {
        console.warn('resetDemoEvent was called outside of DEV mode. Aborting.');
        return;
    }

    try {
        console.log(`🔥 Initiating ${DEV_FIXTURE_EVENT_NAME} fixture reset...`);

        // 1. Get the current demo event context, or create the dedicated fixture if it does not exist yet.
        let eventId: string | null = null;
        let organizationId: string;

        try {
            const fixture = await getDemoEvent();
            eventId = fixture.eventId;
            organizationId = fixture.organizationId;
        } catch {
            console.log(`🧱 ${DEV_FIXTURE_EVENT_NAME} fixture missing. Creating a dedicated dev fixture event...`);

            const { data: existingOrg, error: existingOrgError } = await supabase
                .from('organizations')
                .select('id')
                .eq('name', DEV_FIXTURE_ORGANIZATION_NAME)
                .maybeSingle();

            if (existingOrgError) {
                throw new Error(`Failed to look up fixture organization: ${existingOrgError.message}`);
            }

            if (existingOrg?.id) {
                organizationId = existingOrg.id;
            } else {
                const { data: createdOrg, error: createOrgError } = await supabase
                    .from('organizations')
                    .insert({ name: DEV_FIXTURE_ORGANIZATION_NAME })
                    .select('id')
                    .single();

                if (createOrgError || !createdOrg) {
                    throw new Error(`Failed to create fixture organization: ${createOrgError?.message || 'unknown error'}`);
                }

                organizationId = createdOrg.id;
            }

            await seedDemoEvent(supabase, organizationId);
            console.log(`✅ ${DEV_FIXTURE_EVENT_NAME} fixture created.`);
            return true;
        }

        // 2. Cascade delete will handle all children
        console.log(`🧨 Deleting ${DEV_FIXTURE_EVENT_NAME} and cascading all fixture children...`);
        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (deleteError) {
            throw new Error(`Failed to delete event: ${deleteError.message}`);
        }

        // 3. Re-run seed to put everything back perfectly
        console.log('🔄 Rebuilding Event via Seed...');
        await seedDemoEvent(supabase, organizationId);

        console.log(`✅ ${DEV_FIXTURE_EVENT_NAME} fixture reset complete!`);
        return true;
    } catch (err: any) {
        console.error('❌ Error during reset:', err.message);
        throw err;
    }
}
