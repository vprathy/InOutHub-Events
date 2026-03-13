import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const EMAIL = process.env.SMOKE_TEST_EMAIL || 'vinay.prathy@ziffyvolve.com'
const PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'password123!'
const INTRO_CAPABILITIES_PATH = '/functions/v1/intro-capabilities'

async function invokeFunctionRaw({ accessToken, body }) {
  const response = await fetch(`${supabaseUrl}${INTRO_CAPABILITIES_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  let data = null
  try {
    data = await response.json()
  } catch (_error) {
    data = null
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  }
}

async function main() {
  const authClient = createClient(supabaseUrl, supabaseAnonKey)

  let {
    data: signInData,
    error: signInError,
  } = await authClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })

  if (signInError && /Invalid login credentials/i.test(signInError.message)) {
    const signUp = await authClient.auth.signUp({
      email: EMAIL,
      password: PASSWORD,
    })
    if (signUp.error) throw signUp.error
    ;({
      data: signInData,
      error: signInError,
    } = await authClient.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    }))
  }

  if (signInError) throw signInError

  const accessToken = signInData.session?.access_token
  if (!accessToken) throw new Error('No access token returned for smoke test user')

  const { data: acts, error: actsError } = await authClient.from('acts').select('id,name').limit(1)
  if (actsError) throw actsError

  const actId = acts?.[0]?.id
  if (!actId) throw new Error('No act found for smoke test')

  const tests = []

  const unauth = await invokeFunctionRaw({
    body: { action: 'getIntroComposition', actId },
  })
  tests.push({
    test: 'unauth getIntroComposition',
    ok: unauth.status === 401 && unauth.data?.error?.code === 'UNAUTHORIZED',
    detail: unauth.data?.error || { status: unauth.status, body: unauth.data },
  })

  const getComposition = await invokeFunctionRaw({
    accessToken,
    body: { action: 'getIntroComposition', actId },
  })
  tests.push({
    test: 'auth getIntroComposition normalized shape',
    ok:
      getComposition.status === 200 &&
      Boolean(getComposition.data?.composition) &&
      Array.isArray(getComposition.data.composition.selectedAssetIds) &&
      typeof getComposition.data.composition.approved === 'boolean' &&
      typeof getComposition.data.composition.version === 'string' &&
      typeof getComposition.data.composition.background === 'object' &&
      typeof getComposition.data.composition.audio === 'object',
    detail: getComposition.data?.composition || { status: getComposition.status, body: getComposition.data },
  })

  const invalidCurate = await invokeFunctionRaw({
    accessToken,
    body: {
      action: 'curateIntroPhotos',
      actId,
      assetIds: ['00000000-0000-0000-0000-000000000000'],
    },
  })
  tests.push({
    test: 'curateIntroPhotos rejects invalid asset',
    ok:
      invalidCurate.status === 400 &&
      invalidCurate.data?.error?.code === 'INVALID_ASSET_SELECTION',
    detail: invalidCurate.data?.error || { status: invalidCurate.status, body: invalidCurate.data },
  })

  const approveIncomplete = await invokeFunctionRaw({
    accessToken,
    body: { action: 'approveIntroComposition', actId },
  })
  tests.push({
    test: 'approveIntroComposition rejects incomplete composition',
    ok:
      approveIncomplete.status === 400 &&
      ['INCOMPLETE_COMPOSITION', 'INVALID_ASSET_SELECTION'].includes(approveIncomplete.data?.error?.code),
    detail: approveIncomplete.data?.error || { status: approveIncomplete.status, body: approveIncomplete.data },
  })

  const playableDraft = await invokeFunctionRaw({
    accessToken,
    body: { action: 'getPlayableIntro', actId },
  })
  tests.push({
    test: 'getPlayableIntro rejects draft intro',
    ok:
      playableDraft.status === 400 &&
      ['INTRO_NOT_APPROVED', 'INCOMPLETE_COMPOSITION'].includes(playableDraft.data?.error?.code),
    detail: playableDraft.data?.error || { status: playableDraft.status, body: playableDraft.data },
  })

  console.log(JSON.stringify({ actId, tests }, null, 2))

  await authClient.auth.signOut()

  const failed = tests.filter((test) => !test.ok)
  if (failed.length > 0) {
    process.exit(2)
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error.message || String(error) }, null, 2))
  process.exit(1)
})
