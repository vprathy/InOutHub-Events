import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { seedDemoEvent } from '@/lib/dev/seedDemoEvent';

// Load the Vite .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

// Since our DEV ONLY RLS policies are `USING (true)`, the anon key works perfectly for seeding locally.
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Starting database seed...');

    // 1. Wipe existing data (cascading deletes will handle the rest)
    console.log('🧹 Cleaning old data...');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Create Organization
    console.log('🏢 Creating Demo Organization...');
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: 'ZiffyVolve Productions' })
        .select()
        .single();

    if (orgError) throw orgError;

    // 3. Link existing Dev Login Users
    console.log('🔗 Linking Dev Users to Organization...');
    const { data: users } = await supabase.from('user_profiles').select('id, email');

    if (users && users.length > 0) {
        const members = users.map(u => ({
            organization_id: org.id,
            user_id: u.id,
            role: u.email === 'vinay.prathy@ziffyvolve.com' ? 'Owner' : 'StageManager'
        }));
        await supabase.from('organization_members').insert(members);
    } else {
        console.log('⚠️ No existing user profiles found to link. Sign up via Dev Login first next time!');
    }

    // 4. Create Event
    console.log('📅 Creating Event...');
    const { error: eventError } = await supabase
        .from('events')
        .insert({
            organization_id: org.id,
            name: 'ZiffyVolve Talent Showcase MVP 2026',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
        })
        .select()
        .single();

    if (eventError) throw eventError;

    // Let the shared core module handle the rest of the generation (stages, acts, etc)
    await seedDemoEvent(supabase, org.id);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
