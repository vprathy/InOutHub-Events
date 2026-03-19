import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('This script is intended for post-login telemetry verification with service-role read access.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type Args = {
  email: string | null;
  minutes: number;
};

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const REQUIRED_METADATA_KEYS = [
  'displayMode',
  'deviceType',
  'pwaVersion',
  'viewport',
  'screen',
] as const;

function parseArgs(argv: string[]): Args {
  let email: string | null = null;
  let minutes = 30;

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--email') {
      email = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (current === '--minutes') {
      const parsed = Number(argv[i + 1] ?? '30');
      minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
      i += 1;
    }
  }

  return { email, minutes };
}

function formatTimestamp(value: string | null) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function isRecord(value: Json | undefined): value is Record<string, Json> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function main() {
  const { email, minutes } = parseArgs(process.argv.slice(2));

  if (!email) {
    console.error('Usage: npx tsx scripts/verify-auth-telemetry.ts --email operator@example.com [--minutes 30]');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const windowStartIso = new Date(Date.now() - minutes * 60_000).toISOString();

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profileError) {
    console.error(`Failed to resolve user profile: ${profileError.message}`);
    process.exit(1);
  }

  if (!profile?.id) {
    console.error(`No user profile found for ${normalizedEmail}`);
    process.exit(1);
  }

  const { data: authEvents, error: authEventsError } = await supabase
    .from('auth_events')
    .select('event_type, context_event_id, created_at, metadata')
    .eq('user_id', profile.id)
    .gte('created_at', windowStartIso)
    .order('created_at', { ascending: false })
    .limit(20);

  if (authEventsError) {
    console.error(`Failed to query auth_events: ${authEventsError.message}`);
    process.exit(1);
  }

  const { data: userSessions, error: userSessionsError } = await supabase
    .from('user_sessions')
    .select('id, status, active_event_id, started_at, last_active_at, ended_at, ended_reason, is_offline_mode, device_info')
    .eq('user_id', profile.id)
    .order('started_at', { ascending: false })
    .limit(5);

  if (userSessionsError) {
    console.error(`Failed to query user_sessions: ${userSessionsError.message}`);
    process.exit(1);
  }

  console.log(`Telemetry verification window: last ${minutes} minute(s)`);
  console.log(`User: ${normalizedEmail}`);
  console.log('');

  if (!authEvents || authEvents.length === 0) {
    console.error('No auth_events found in the requested time window.');
    process.exit(1);
  }

  console.log('Recent auth events:');
  for (const event of authEvents) {
    const metadata = isRecord(event.metadata as Json | undefined) ? (event.metadata as Record<string, Json>) : null;
    const metadataKeys = metadata ? Object.keys(metadata).sort().join(', ') : 'none';
    console.log(`- ${formatTimestamp(event.created_at)} :: ${event.event_type} :: metadata keys: ${metadataKeys}`);
  }

  const observedEventTypes = new Set(authEvents.map((event) => event.event_type));
  const expectedAnyOf = ['email_code_requested', 'email_code_verified', 'login_completed'];
  const missingExpected = expectedAnyOf.filter((eventType) => !observedEventTypes.has(eventType));

  const metadataBearingEvents = authEvents.filter((event) => isRecord(event.metadata as Json | undefined));
  const metadataCoverage = metadataBearingEvents.map((event) => {
    const metadata = event.metadata as Record<string, Json>;
    return {
      eventType: event.event_type,
      createdAt: event.created_at,
      missingKeys: REQUIRED_METADATA_KEYS.filter((key) => !(key in metadata)),
    };
  });

  console.log('');
  console.log('Metadata coverage:');
  for (const result of metadataCoverage) {
    console.log(`- ${result.eventType} @ ${formatTimestamp(result.createdAt)} :: missing ${result.missingKeys.length ? result.missingKeys.join(', ') : 'none'}`);
  }

  console.log('');
  console.log('Recent user sessions:');
  if (!userSessions || userSessions.length === 0) {
    console.log('- none');
  } else {
    for (const session of userSessions) {
      const deviceInfo = isRecord(session.device_info as Json | undefined) ? (session.device_info as Record<string, Json>) : null;
      const displayMode = deviceInfo && typeof deviceInfo.displayMode === 'string' ? deviceInfo.displayMode : 'unknown';
      const deviceType = deviceInfo && typeof deviceInfo.deviceType === 'string' ? deviceInfo.deviceType : 'unknown';
      console.log(`- ${session.id} :: ${session.status} :: started ${formatTimestamp(session.started_at)} :: last active ${formatTimestamp(session.last_active_at)} :: ${displayMode}/${deviceType}`);
    }
  }

  let hasFailure = false;

  if (missingExpected.length > 0) {
    hasFailure = true;
    console.error('');
    console.error(`Missing expected OTP event(s): ${missingExpected.join(', ')}`);
  }

  const missingMetadataCoverage = metadataCoverage.filter((result) => result.missingKeys.length > 0);
  if (missingMetadataCoverage.length > 0) {
    hasFailure = true;
    console.error('');
    console.error('One or more events are missing expected metadata keys.');
  }

  if (!userSessions || userSessions.length === 0) {
    hasFailure = true;
    console.error('');
    console.error('No user_sessions rows found for this user.');
  }

  console.log('');
  if (hasFailure) {
    console.error('Telemetry verification failed.');
    process.exit(1);
  }

  console.log('Telemetry verification passed.');
}

void main();
