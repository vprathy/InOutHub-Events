import { useEffect } from 'react';
import { useSelection } from '@/context/SelectionContext';
import { supabase } from '@/lib/supabase';

/**
 * usePwaManifest
 * 
 * This hook implements the "Manifest-Driven" architecture by:
 * 1. Detecting the active event from the selection context.
 * 2. Fetching all media asset URLs (Audio/Video) associated with the event's acts.
 * 3. Communicating with the Service Worker to pre-cache these assets locally.
 * 
 * This ensures field resilience even if the network is unstable during the show.
 */
export function usePwaManifest() {
    const { eventId } = useSelection();

    useEffect(() => {
        if (!eventId) return;

        const fetchAndCacheAssets = async () => {
            try {
                // 1. Get all acts for the event
                const { data: acts, error: actsError } = await supabase
                    .from('acts')
                    .select('id')
                    .eq('event_id', eventId);

                if (actsError || !acts || acts.length === 0) return;

                const actIds = acts.map(a => a.id);

                // 2. Get all file URLs for these acts
                const { data: requirements, error: reqError } = await supabase
                    .from('act_requirements')
                    .select('file_url')
                    .in('act_id', actIds)
                    .not('file_url', 'is', null);

                if (reqError || !requirements) return;

                const urls = requirements
                    .map(r => r.file_url)
                    .filter((url): url is string => !!url);

                if (urls.length === 0) return;

                // 3. Send to Service Worker
                if ('serviceWorker' in navigator) {
                    // Wait for the SW to be ready/active
                    const registration = await navigator.serviceWorker.ready;
                    if (registration.active) {
                        console.log(`[PWA] Broadcasting ${urls.length} event assets to SW for pre-caching.`);
                        registration.active.postMessage({
                            type: 'CACHE_EVENT_ASSETS',
                            payload: { urls }
                        });
                    }
                }
            } catch (err) {
                console.error('[PWA] Manifest sync failed:', err);
            }
        };

        fetchAndCacheAssets();
    }, [eventId]);
}
