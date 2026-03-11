import { supabase } from '../supabase';
import { seedDemoEvent } from './seedDemoEvent';
import { getDemoEvent } from './getDemoEvent';

export async function resetDemoEvent() {
    if (!import.meta.env.DEV) {
        console.warn('resetDemoEvent was called outside of DEV mode. Aborting.');
        return;
    }

    try {
        console.log('🔥 Initiating Demo Event Reset...');

        // 1. Get the current demo event context
        const { eventId, organizationId } = await getDemoEvent();

        // 2. Cascade delete will handle all children
        console.log('🧨 Deleting Event and cascading all children...');
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

        console.log('✅ Demo Event Reset Complete!');
        return true;
    } catch (err: any) {
        console.error('❌ Error during reset:', err.message);
        throw err;
    }
}
