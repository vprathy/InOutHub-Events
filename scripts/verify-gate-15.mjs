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
const VALIDATION_ACT_NAME = process.env.GATE15_ACT_NAME || 'The strong Solo Singer'
const FUNCTION_PATH = '/functions/v1/intro-capabilities'
const BACKGROUND_POLL_RETRIES = 12
const BACKGROUND_POLL_INTERVAL_MS = 5000

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function invokeIntroCapability(accessToken, body) {
  const response = await fetch(`${supabaseUrl}${FUNCTION_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
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

async function fetchCandidateActs() {
  const { data: acts, error } = await supabase
    .from('acts')
    .select('id, name, event_id')
    .order('name', { ascending: true })

  if (error) throw error
  return acts || []
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureBackgroundReady(accessToken, actId, existingComposition) {
  const existingBackgroundUrl = existingComposition?.background?.fileUrl || null

  if (existingBackgroundUrl) {
    return {
      ok: true,
      status: 200,
      detail: {
        skipped: true,
        reason: 'background_already_present',
        composition: existingComposition,
      },
    }
  }

  const generationResult = await invokeIntroCapability(accessToken, {
    action: 'generateIntroBackground',
    actId,
    stylePreset: 'theatrical-safe',
  })

  if (!generationResult.ok) {
    return {
      ok: false,
      status: generationResult.status,
      detail: generationResult.data,
    }
  }

  let latestDetail = generationResult.data
  let backgroundUrl = generationResult.data?.composition?.background?.fileUrl || null

  if (!backgroundUrl) {
    for (let attempt = 1; attempt <= BACKGROUND_POLL_RETRIES; attempt += 1) {
      await sleep(BACKGROUND_POLL_INTERVAL_MS)

      const pollResult = await invokeIntroCapability(accessToken, {
        action: 'getIntroComposition',
        actId,
      })

      latestDetail = pollResult.data
      backgroundUrl = pollResult.data?.composition?.background?.fileUrl || null

      if (!pollResult.ok) {
        return {
          ok: false,
          status: pollResult.status,
          detail: pollResult.data,
        }
      }

      if (backgroundUrl) {
        return {
          ok: true,
          status: pollResult.status,
          detail: {
            ...pollResult.data,
            polling: {
              attempts: attempt,
              completed: true,
            },
          },
        }
      }
    }
  }

  if (!backgroundUrl) {
    return {
      ok: false,
      status: 202,
      detail: {
        ...latestDetail,
        polling: {
          attempts: BACKGROUND_POLL_RETRIES,
          completed: false,
        },
        error: {
          code: 'BACKGROUND_PENDING',
          message: 'Background generation did not publish a safe image within the verification window',
        },
      },
    }
  }

  return {
    ok: true,
    status: generationResult.status,
    detail: generationResult.data,
  }
}

async function enrichAct(act) {
  const { data: actParticipants, error: actParticipantError } = await supabase
    .from('act_participants')
    .select('participant_id')
    .eq('act_id', act.id)

  if (actParticipantError) throw actParticipantError

  const participantIds = (actParticipants || []).map((row) => row.participant_id)
  const castCount = participantIds.length

  let approvedPhotoAssets = []
  if (participantIds.length > 0) {
    const { data: assets, error: assetError } = await supabase
      .from('participant_assets')
      .select('id, participant_id, name, status, type, file_url')
      .in('participant_id', participantIds)
      .eq('type', 'photo')
      .eq('status', 'approved')

    if (assetError) throw assetError
    approvedPhotoAssets = assets || []
  }

  const { data: lineupItems, error: lineupError } = await supabase
    .from('lineup_items')
    .select('id, stage_id')
    .eq('act_id', act.id)
    .limit(1)

  if (lineupError) throw lineupError

  return {
    ...act,
    castCount,
    approvedPhotoAssets,
    lineupItem: lineupItems?.[0] || null,
  }
}

async function resolveValidationTarget() {
  const acts = await fetchCandidateActs()

  const namedAct = acts.find((act) => act.name === VALIDATION_ACT_NAME)
  const namedCandidate = namedAct ? await enrichAct(namedAct) : null

  if (namedCandidate && namedCandidate.castCount >= 1 && namedCandidate.approvedPhotoAssets.length >= 2) {
    return {
      strategy: 'named_validation_act',
      target: namedCandidate,
      blocker: null,
    }
  }

  const enriched = []
  for (const act of acts) {
    enriched.push(await enrichAct(act))
  }

  const fallbackCandidate = enriched.find(
    (act) => act.castCount >= 1 && act.approvedPhotoAssets.length >= 2 && act.lineupItem,
  )

  if (fallbackCandidate) {
    return {
      strategy: namedCandidate ? 'fallback_rehearsal_act' : 'fallback_rehearsal_act_no_named_match',
      target: fallbackCandidate,
      blocker: namedCandidate
        ? {
            type: 'named_validation_act_not_ready',
            actId: namedCandidate.id,
            actName: namedCandidate.name,
            castCount: namedCandidate.castCount,
            approvedPhotoCount: namedCandidate.approvedPhotoAssets.length,
            hasLineupItem: Boolean(namedCandidate.lineupItem),
          }
        : null,
    }
  }

  return {
    strategy: 'no_rehearsal_ready_act',
    target: null,
    blocker: {
      type: 'missing_gate15_prereqs',
      namedActFound: Boolean(namedCandidate),
      namedAct: namedCandidate
        ? {
            id: namedCandidate.id,
            name: namedCandidate.name,
            castCount: namedCandidate.castCount,
            approvedPhotoCount: namedCandidate.approvedPhotoAssets.length,
            hasLineupItem: Boolean(namedCandidate.lineupItem),
          }
        : null,
      sampleActs: enriched.slice(0, 10).map((act) => ({
        id: act.id,
        name: act.name,
        castCount: act.castCount,
        approvedPhotoCount: act.approvedPhotoAssets.length,
        hasLineupItem: Boolean(act.lineupItem),
      })),
    },
  }
}

async function main() {
  console.log('Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })

  if (authError) {
    console.error('Authentication failed:', authError.message)
    process.exit(1)
  }

  const accessToken = authData.session?.access_token
  if (!accessToken) {
    console.error('Missing access token for verification user')
    process.exit(1)
  }

  console.log('Authenticated as', authData.user?.email)

  const resolution = await resolveValidationTarget()

  if (!resolution.target) {
    console.log(JSON.stringify({
      overall: 'BLOCKED',
      reason: 'No act currently satisfies Gate 15 prerequisites in this environment',
      desiredValidationActName: VALIDATION_ACT_NAME,
      resolution,
    }, null, 2))
    process.exit(2)
  }

  const target = resolution.target
  const selectedAssetIds = target.approvedPhotoAssets.slice(0, 2).map((asset) => asset.id)

  const steps = []

  const buildResult = await invokeIntroCapability(accessToken, {
    action: 'buildIntroComposition',
    actId: target.id,
    selectedAssetIds,
  })
  steps.push({
    step: 'buildIntroComposition',
    ok: buildResult.ok,
    status: buildResult.status,
    detail: buildResult.data,
  })

  const curateResult = await invokeIntroCapability(accessToken, {
    action: 'curateIntroPhotos',
    actId: target.id,
    assetIds: selectedAssetIds,
  })
  steps.push({
    step: 'curateIntroPhotos',
    ok: curateResult.ok,
    status: curateResult.status,
    detail: curateResult.data,
  })

  const backgroundResult = await ensureBackgroundReady(
    accessToken,
    target.id,
    curateResult.data?.composition ?? buildResult.data?.composition ?? null,
  )
  steps.push({
    step: 'generateIntroBackground',
    ok: backgroundResult.ok,
    status: backgroundResult.status,
    detail: backgroundResult.detail,
  })

  const approveResult = await invokeIntroCapability(accessToken, {
    action: 'approveIntroComposition',
    actId: target.id,
  })
  steps.push({
    step: 'approveIntroComposition',
    ok: approveResult.ok,
    status: approveResult.status,
    detail: approveResult.data,
  })

  const playableResult = await invokeIntroCapability(accessToken, {
    action: 'getPlayableIntro',
    actId: target.id,
  })
  steps.push({
    step: 'getPlayableIntro',
    ok: playableResult.ok,
    status: playableResult.status,
    detail: playableResult.data,
  })

  const failed = steps.filter((step) => !step.ok)

  console.log(JSON.stringify({
    overall: failed.length === 0 ? 'PASS' : 'FAIL',
    desiredValidationActName: VALIDATION_ACT_NAME,
    resolution: {
      strategy: resolution.strategy,
      blocker: resolution.blocker,
    },
    target: {
      actId: target.id,
      actName: target.name,
      eventId: target.event_id,
      castCount: target.castCount,
      approvedPhotoCount: target.approvedPhotoAssets.length,
      lineupStageId: target.lineupItem?.stage_id || null,
      selectedAssetIds,
    },
    steps,
  }, null, 2))

  await supabase.auth.signOut()

  if (failed.length > 0) {
    process.exit(3)
  }
}

main().catch(async (error) => {
  console.error(JSON.stringify({ fatal: error.message || String(error) }, null, 2))
  try {
    await supabase.auth.signOut()
  } catch (_error) {
    // ignore
  }
  process.exit(1)
})
