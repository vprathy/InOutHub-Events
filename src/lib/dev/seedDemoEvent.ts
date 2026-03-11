import { SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

export async function seedDemoEvent(supabase: SupabaseClient, orgId: string) {
    // 4. Create Event
    console.log('📅 Creating Event...');
    const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
            organization_id: orgId,
            name: 'ZiffyVolve Talent Showcase MVP 2026',
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
    console.log('👥 Generating 50 Participants...');
    const participantsData = Array.from({ length: 50 }).map(() => ({
        event_id: event.id,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        guardian_name: Math.random() > 0.7 ? faker.person.fullName() : null,
        guardian_phone: Math.random() > 0.7 ? faker.phone.number({ style: 'national' }) : null,
        notes: Math.random() > 0.8 ? faker.lorem.sentence() : null
    }));

    const { data: participants, error: partError } = await supabase.from('participants').insert(participantsData).select();
    if (partError) throw partError;

    // 7. Create Acts
    console.log('🎬 Generating 15 Acts...');
    const statuses = ['Not Arrived', 'Arrived', 'Backstage', 'Ready'];
    const actTypes = ['Band', 'Solo Singer', 'Dance Troupe', 'Comedy Routine', 'Magic Show', 'Theater Monologue', 'Acapella Group'];

    const actsData = Array.from({ length: 15 }).map(() => ({
        event_id: event.id,
        name: `The ${faker.word.adjective()} ${faker.helpers.arrayElement(actTypes)}`,
        duration_minutes: faker.helpers.arrayElement([5, 10, 15, 20]),
        setup_time_minutes: faker.helpers.arrayElement([2, 5, 10]),
        arrival_status: faker.helpers.arrayElement(statuses),
        notes: Math.random() > 0.5 ? faker.lorem.sentence() : null
    }));

    const { data: acts, error: actsError } = await supabase.from('acts').insert(actsData).select();
    if (actsError) throw actsError;

    // 8. Link Participants, Assets, and Requirements
    console.log('🔗 Wiring Act Participants and Assets...');
    for (const act of acts) {
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
