import { SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

function createSvgPhotoDataUrl(label: string, accent: string) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
        <rect width="800" height="1200" fill="#0f172a" />
        <rect x="36" y="36" width="728" height="1128" rx="48" fill="#111827" stroke="${accent}" stroke-width="8" />
        <circle cx="400" cy="410" r="150" fill="#1f2937" stroke="${accent}" stroke-width="10" />
        <rect x="220" y="610" width="360" height="240" rx="120" fill="#1f2937" stroke="${accent}" stroke-width="10" />
        <text x="400" y="960" text-anchor="middle" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="48" font-weight="700">${label}</text>
        <text x="400" y="1025" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="28" letter-spacing="6">INTRO TEST ASSET</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createTextDataUrl(content: string, mimeType = 'text/plain') {
    const encodeBase64 = typeof btoa === 'function'
        ? btoa(content)
        : Buffer.from(content, 'utf-8').toString('base64');
    return `data:${mimeType};base64,${encodeBase64}`;
}

function createSilentAudioDataUrl() {
    const base64 =
        'UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
    return `data:audio/wav;base64,${base64}`;
}

function createSeedAssetUrl(type: string, label: string) {
    if (type === 'photo') {
        return createSvgPhotoDataUrl(label, '#38bdf8');
    }

    if (type === 'document') {
        return createTextDataUrl(`Demo document for ${label}.`, 'text/plain');
    }

    if (type === 'video') {
        return createTextDataUrl(`Demo video placeholder for ${label}.`, 'text/plain');
    }

    return createTextDataUrl(`Demo asset placeholder for ${label}.`, 'text/plain');
}

export async function seedDemoEvent(supabase: SupabaseClient, orgId: string) {
    // 4. Create Event
    console.log('📅 Creating Event...');
    const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
            organization_id: orgId,
            name: 'Demo Event',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
        })
        .select()
        .single();

    if (eventError) throw eventError;

    // 5. Create Stages
    console.log('🎭 Creating Stages...');
    const stagesData = [
        { event_id: event.id, name: 'Main Stage', description: 'The grand theater for premium acts.' },
        { event_id: event.id, name: 'Side Stage / Acoustic', description: 'Intimate setting for acoustic and spoken word.' }
    ];
    const { data: stages, error: stagesError } = await supabase.from('stages').insert(stagesData).select();
    if (stagesError) throw stagesError;

    // Init stage_states
    for (const stage of stages) {
        await supabase.from('stage_state').insert({ stage_id: stage.id, status: 'Idle' });
    }

    // 6. Create Participants
    console.log('👥 Generating 50 Participants (Standard + Deterministic)...');
    
    // First, create the deterministic test participant
    const victor = {
        event_id: event.id,
        first_name: 'Victor',
        last_name: 'Barrows',
        notes: 'Lead performer for sound check coordination.'
    };

    const introValidationParticipants = [
        {
            event_id: event.id,
            first_name: 'Fatima',
            last_name: 'Kulas',
            notes: 'Deterministic intro validation participant.'
        },
        {
            event_id: event.id,
            first_name: 'Lester',
            last_name: 'Wintheiser',
            notes: 'Deterministic intro validation participant.'
        },
        {
            event_id: event.id,
            first_name: 'Buddy',
            last_name: 'Ondricka',
            notes: 'Deterministic intro validation participant.'
        },
        {
            event_id: event.id,
            first_name: 'Margarita',
            last_name: 'Ankunding',
            notes: 'Deterministic intro validation participant.'
        },
        {
            event_id: event.id,
            first_name: 'Penny',
            last_name: 'Fisher',
            notes: 'Deterministic intro validation participant.'
        }
    ];

    const participantsData = [
        victor,
        ...introValidationParticipants,
        ...Array.from({ length: 44 }).map(() => ({
            event_id: event.id,
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            guardian_name: Math.random() > 0.7 ? faker.person.fullName() : null,
            guardian_phone: Math.random() > 0.7 ? faker.phone.number({ style: 'national' }) : null,
            notes: Math.random() > 0.8 ? faker.lorem.sentence() : null
        }))
    ];

    const { data: participants, error: partError } = await supabase.from('participants').insert(participantsData).select();
    if (partError) throw partError;

    // 7. Create Acts
    console.log('🎬 Generating 15 Acts...');
    const statuses = ['Not Arrived', 'Arrived', 'Backstage', 'Ready'];
    const actTypes = ['Band', 'Solo Singer', 'Dance Troupe', 'Comedy Routine', 'Magic Show', 'Theater Monologue', 'Acapella Group'];

    const actsData = [
        {
            event_id: event.id,
            name: 'The strong Solo Singer',
            duration_minutes: 10,
            setup_time_minutes: 2,
            arrival_status: 'Ready',
            notes: 'Deterministic validation act for Intro Builder and Stage Console.'
        },
        ...Array.from({ length: 14 }).map(() => ({
            event_id: event.id,
            name: `The ${faker.word.adjective()} ${faker.helpers.arrayElement(actTypes)}`,
            duration_minutes: faker.helpers.arrayElement([5, 10, 15, 20]),
            setup_time_minutes: faker.helpers.arrayElement([2, 5, 10]),
            arrival_status: faker.helpers.arrayElement(statuses),
            notes: Math.random() > 0.5 ? faker.lorem.sentence() : null
        }))
    ];

    const { data: acts, error: actsError } = await supabase.from('acts').insert(actsData).select();
    if (actsError) throw actsError;

    const deterministicParticipants = participants.slice(1, 6);

    // 8. Link Participants, Assets, and Requirements
    console.log('🔗 Wiring Act Participants and Assets...');
    for (const [index, act] of acts.entries()) {
        if (index === 0) {
            const introActParts = deterministicParticipants.map((participant) => ({
                act_id: act.id,
                participant_id: participant.id,
                role: 'Performer'
            }));
            await supabase.from('act_participants').insert(introActParts);

            await supabase.from('act_assets').insert({
                act_id: act.id,
                asset_name: 'Intro Narration Track',
                asset_type: 'Other',
                notes: 'Deterministic seed record for intro validation'
            });

            await supabase.from('act_requirements').insert([
                {
                    act_id: act.id,
                    requirement_type: 'Audio',
                    description: 'Deterministic uploaded performance audio for Intro Studio validation',
                    file_url: createSilentAudioDataUrl(),
                    fulfilled: true,
                },
                {
                    act_id: act.id,
                    requirement_type: 'Generative_Audio',
                    description: 'Legacy generated voice fallback for intro audio preference checks',
                    file_url: createSilentAudioDataUrl(),
                    fulfilled: true,
                },
                {
                    act_id: act.id,
                    requirement_type: 'Microphone',
                    description: '1 wireless mic needed',
                    fulfilled: true
                }
            ]);

            continue;
        }

        // Pick 1 to 5 random participants
        const actParts = faker.helpers.arrayElements(participants, faker.number.int({ min: 1, max: 5 })).map(p => ({
            act_id: act.id,
            participant_id: p.id,
            role: 'Performer'
        }));
        await supabase.from('act_participants').insert(actParts);

        // Random Asset
        if (Math.random() > 0.5) {
            await supabase.from('act_assets').insert({
                act_id: act.id,
                asset_name: faker.vehicle.bicycle(),
                asset_type: 'Prop',
                notes: 'Handle with care'
            });
        }

        // Random Requirement
        if (Math.random() > 0.5) {
            await supabase.from('act_requirements').insert({
                act_id: act.id,
                requirement_type: 'Microphone',
                description: `${faker.number.int({ min: 1, max: 4 })} wireless mics needed`,
                fulfilled: faker.datatype.boolean()
            });
        }
    }

    // 8b. Seed Participant Notes (for testing Resolve Note feature)
    console.log('📝 Seeding Participant Notes...');
    const noteCategories: ('operational' | 'internal' | 'special_request')[] = ['operational', 'internal', 'special_request'];
    const noteContents = [
        'Backstage arrival confirmed for sound check',
        'Requested extra mic stand for performance',
        'Dietary restriction: vegetarian meals only',
        'Needs wheelchair-accessible staging area',
        'Parent requested early pickup after act',
        'Costume change requires 5 min backstage hold',
        'Audio track submitted via email, pending review',
        'Requires translator for stage directions',
    ];

    const notesData = participants.slice(0, 10).flatMap(p => {
        const count = faker.number.int({ min: 1, max: 3 });
        return Array.from({ length: count }).map(() => ({
            participant_id: p.id,
            content: faker.helpers.arrayElement(noteContents),
            category: faker.helpers.arrayElement(noteCategories),
            is_resolved: Math.random() > 0.7,
        }));
    });

    const { error: notesError } = await supabase.from('participant_notes').insert(notesData);
    if (notesError) console.warn('⚠️ Notes seed warning:', notesError.message);

    // 8c. Seed Participant Assets (for testing Delete Asset feature)
    console.log('📎 Seeding Participant Assets...');
    const assetTypes = ['photo', 'document', 'video', 'other'];
    const assetStatuses: ('missing' | 'uploaded' | 'pending_review' | 'approved' | 'rejected')[] = ['missing', 'uploaded', 'pending_review', 'approved', 'rejected'];
    const assetNames = ['Headshot Photo', 'Signed Release Form', 'Performance Reel', 'Costume Reference', 'Music Track', 'ID Scan'];

    const assetsData = participants.slice(0, 15).flatMap(p => {
        const count = faker.number.int({ min: 1, max: 2 });
        return Array.from({ length: count }).map(() => {
            const type = faker.helpers.arrayElement(assetTypes);
            return {
                participant_id: p.id,
                name: faker.helpers.arrayElement(assetNames),
                type,
                status: faker.helpers.arrayElement(assetStatuses),
                file_url: createSeedAssetUrl(type, `${p.first_name} ${p.last_name}`),
            };
        });
    });

    const { error: assetsError } = await supabase.from('participant_assets').insert(assetsData);
    if (assetsError) console.warn('⚠️ Assets seed warning:', assetsError.message);

    const deterministicIntroAssets = [
        {
            participant_id: deterministicParticipants[0].id,
            name: 'Fatima Stage Portrait',
            type: 'photo',
            status: 'approved',
            file_url: createSvgPhotoDataUrl('Fatima Kulas', '#38bdf8'),
        },
        {
            participant_id: deterministicParticipants[1].id,
            name: 'Lester Stage Portrait',
            type: 'photo',
            status: 'approved',
            file_url: createSvgPhotoDataUrl('Lester Wintheiser', '#f59e0b'),
        },
        {
            participant_id: deterministicParticipants[2].id,
            name: 'Buddy Practice Snapshot',
            type: 'photo',
            status: 'pending_review',
            file_url: createSvgPhotoDataUrl('Buddy Ondricka', '#a855f7'),
        }
    ];

    const { error: introAssetError } = await supabase.from('participant_assets').insert(deterministicIntroAssets);
    if (introAssetError) console.warn('⚠️ Intro validation asset seed warning:', introAssetError.message);

    // 9. Generate Lineup Items
    console.log('📋 Building Schedule/Lineup...');
    let mainStageTime = new Date();
    mainStageTime.setHours(18, 0, 0, 0); // Start at 6 PM

    let sideStageTime = new Date();
    sideStageTime.setHours(18, 30, 0, 0); // Start at 6:30 PM

    const mainStageActs = acts.slice(0, 10);
    const sideStageActs = acts.slice(10, 15);

    const lineupInserts: any[] = [];

    // Main stage schedule
    mainStageActs.forEach((act, idx) => {
        lineupInserts.push({
            stage_id: stages[0].id,
            act_id: act.id,
            scheduled_start_time: new Date(mainStageTime).toISOString(),
            sort_order: idx
        });
        mainStageTime = new Date(mainStageTime.getTime() + (act.duration_minutes + act.setup_time_minutes) * 60000);
    });

    // Side stage schedule
    sideStageActs.forEach((act, idx) => {
        lineupInserts.push({
            stage_id: stages[1].id,
            act_id: act.id,
            scheduled_start_time: new Date(sideStageTime).toISOString(),
            sort_order: idx
        });
        sideStageTime = new Date(sideStageTime.getTime() + (act.duration_minutes + act.setup_time_minutes) * 60000);
    });

    await supabase.from('lineup_items').insert(lineupInserts);

    console.log('✅ Seed Demo Event complete!');
}
