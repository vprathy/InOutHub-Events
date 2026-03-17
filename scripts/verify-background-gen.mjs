import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const EMAIL = process.env.SMOKE_TEST_EMAIL || 'vinay.prathy@ziffyvolve.com'
const PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'password123!'

const ACT_ID = '17b9a622-1dc1-491c-b36b-dc75b43352ba'

async function verifyBackgroundGen() {
  console.log('Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })

  if (authError) {
    console.error('Authentication failed:', authError.message)
    process.exit(1)
  }

  console.log('Authenticated as', authData.user?.email)
  console.log('\nTesting Background Generation for actId:', ACT_ID)

  console.log('--- Invoking generateIntroBackground ---')
  const res = await supabase.functions.invoke('intro-capabilities', {
    body: {
      action: 'generateIntroBackground',
      actId: ACT_ID,
      stylePreset: 'theatrical-safe'
    }
  })

  if (res.error) {
    console.error('Action Failed:', res.error)
    process.exit(1)
  }

  console.log('Response:', JSON.stringify(res.data, null, 2))
  
  if (res.data.isPending) {
    console.log('\nResult: PENDING (Reviewing for Brand Safety - Deployed logic is live)');
  } else if (res.data.composition?.background?.fileUrl) {
    console.log('\nResult: SUCCESS (Background generated and live)');
  } else {
    console.log('\nResult: UNKNOWN STATE');
  }
}

verifyBackgroundGen()
