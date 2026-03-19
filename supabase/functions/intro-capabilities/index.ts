import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INTRO_REQUIREMENT_TYPE = 'IntroComposition'
const TRUST_HEADER = 'inouthub-internal-2026-v16'
const INTRO_COMPOSITION_VERSION = '2026-03-18'
const MIN_PLAYABLE_ASSET_COUNT = 1
const INTRO_PREP_COOLDOWN_MS = 10 * 60 * 1000
const INTRO_PREP_DAILY_LIMIT = 3

class IntroCapabilityError extends Error {
  code: string
  details?: Record<string, unknown>

  constructor(message: string, code = 'INTRO_CAPABILITY_ERROR', details?: Record<string, unknown>) {
    super(message)
    this.name = 'IntroCapabilityError'
    this.code = code
    this.details = details
  }
}

interface IntroCurationItem {
  id: string
  pacing: string
  focalPoint: string
  timing: number
  narrative: string
}

interface IntroMediaRef {
  fileUrl: string | null
  source: string | null
  stylePreset?: string | null
  optional?: boolean
}

interface IntroCreditLine {
  key: string
  label: string
  value: string
}

interface IntroGenerationMeta {
  status: 'not_started' | 'preparing' | 'ready_for_review' | 'approved' | 'failed'
  fingerprint: string | null
  startedAt?: string | null
  completedAt?: string | null
  lastDurationMs?: number | null
  lastPreparedAt: string | null
  totalAttempts?: number
  failedAttempts?: number
  dailyPrepareCount: number
  dailyPrepareDate: string | null
  cooldownUntil: string | null
  statusMessage?: string | null
  lastError?: string | null
}

interface IntroComposition {
  version: string
  selectedAssetIds: string[]
  curation: IntroCurationItem[]
  background: IntroMediaRef
  audio: IntroMediaRef
  credits?: IntroCreditLine[]
  generation?: IntroGenerationMeta
  approved: boolean
  lastUpdated: string
}

function createDefaultComposition(): IntroComposition {
  return {
    version: INTRO_COMPOSITION_VERSION,
    selectedAssetIds: [],
    curation: [],
    background: {
      fileUrl: null,
      source: null,
      stylePreset: null,
    },
    audio: {
      fileUrl: null,
      source: null,
      optional: true,
    },
    credits: [],
    generation: {
      status: 'not_started',
      fingerprint: null,
      startedAt: null,
      completedAt: null,
      lastDurationMs: null,
      lastPreparedAt: null,
      totalAttempts: 0,
      failedAttempts: 0,
      dailyPrepareCount: 0,
      dailyPrepareDate: null,
      cooldownUntil: null,
      statusMessage: null,
      lastError: null,
    },
    approved: false,
    lastUpdated: new Date().toISOString(),
  }
}

function normalizeComposition(raw: unknown, fallback?: Partial<IntroComposition>): IntroComposition {
  const base = createDefaultComposition()
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const fallbackBackground = fallback?.background?.fileUrl ?? null
  const fallbackAudio = fallback?.audio?.fileUrl ?? null

  return {
    version: typeof parsed.version === 'string' ? parsed.version : INTRO_COMPOSITION_VERSION,
    selectedAssetIds: Array.isArray(parsed.selectedAssetIds) ? parsed.selectedAssetIds.filter((id) => typeof id === 'string') : [],
    curation: Array.isArray(parsed.curation)
      ? parsed.curation
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const value = item as Record<string, unknown>
            return {
              id: String(value.id ?? ''),
              pacing: String(value.pacing ?? 'cinematic'),
              focalPoint: String(value.focalPoint ?? 'center'),
              timing: typeof value.timing === 'number' ? value.timing : Number(value.timing ?? 3) || 3,
              narrative: String(value.narrative ?? 'Performer spotlight'),
            }
          })
          .filter((item) => item.id.length > 0)
      : [],
    background: {
      fileUrl:
        parsed.background && typeof parsed.background === 'object' && typeof (parsed.background as Record<string, unknown>).fileUrl === 'string'
          ? String((parsed.background as Record<string, unknown>).fileUrl)
          : fallbackBackground,
      source:
        parsed.background && typeof parsed.background === 'object' && typeof (parsed.background as Record<string, unknown>).source === 'string'
          ? String((parsed.background as Record<string, unknown>).source)
          : fallback?.background?.source ?? null,
      stylePreset:
        parsed.background && typeof parsed.background === 'object' && typeof (parsed.background as Record<string, unknown>).stylePreset === 'string'
          ? String((parsed.background as Record<string, unknown>).stylePreset)
          : fallback?.background?.stylePreset ?? null,
    },
    audio: {
      fileUrl:
        parsed.audio && typeof parsed.audio === 'object' && typeof (parsed.audio as Record<string, unknown>).fileUrl === 'string'
          ? String((parsed.audio as Record<string, unknown>).fileUrl)
          : fallbackAudio,
      source:
        parsed.audio && typeof parsed.audio === 'object' && typeof (parsed.audio as Record<string, unknown>).source === 'string'
          ? String((parsed.audio as Record<string, unknown>).source)
          : fallback?.audio?.source ?? null,
      optional:
        parsed.audio && typeof parsed.audio === 'object' && typeof (parsed.audio as Record<string, unknown>).optional === 'boolean'
          ? Boolean((parsed.audio as Record<string, unknown>).optional)
          : true,
    },
    credits: Array.isArray(parsed.credits)
      ? parsed.credits
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const value = item as Record<string, unknown>
            return {
              key: String(value.key ?? ''),
              label: String(value.label ?? ''),
              value: String(value.value ?? ''),
            }
          })
          .filter((item) => item.key && item.label && item.value)
      : fallback?.credits ?? [],
    generation: {
      status:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).status === 'string'
          ? String((parsed.generation as Record<string, unknown>).status) as IntroGenerationMeta['status']
          : fallback?.generation?.status ?? (fallback?.approved ? 'approved' : base.generation.status),
      fingerprint:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).fingerprint === 'string'
          ? String((parsed.generation as Record<string, unknown>).fingerprint)
          : fallback?.generation?.fingerprint ?? null,
      startedAt:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).startedAt === 'string'
          ? String((parsed.generation as Record<string, unknown>).startedAt)
          : fallback?.generation?.startedAt ?? null,
      completedAt:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).completedAt === 'string'
          ? String((parsed.generation as Record<string, unknown>).completedAt)
          : fallback?.generation?.completedAt ?? null,
      lastDurationMs:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).lastDurationMs === 'number'
          ? Number((parsed.generation as Record<string, unknown>).lastDurationMs)
          : fallback?.generation?.lastDurationMs ?? null,
      lastPreparedAt:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).lastPreparedAt === 'string'
          ? String((parsed.generation as Record<string, unknown>).lastPreparedAt)
          : fallback?.generation?.lastPreparedAt ?? null,
      totalAttempts:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).totalAttempts === 'number'
          ? Number((parsed.generation as Record<string, unknown>).totalAttempts)
          : fallback?.generation?.totalAttempts ?? 0,
      failedAttempts:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).failedAttempts === 'number'
          ? Number((parsed.generation as Record<string, unknown>).failedAttempts)
          : fallback?.generation?.failedAttempts ?? 0,
      dailyPrepareCount:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).dailyPrepareCount === 'number'
          ? Number((parsed.generation as Record<string, unknown>).dailyPrepareCount)
          : fallback?.generation?.dailyPrepareCount ?? 0,
      dailyPrepareDate:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).dailyPrepareDate === 'string'
          ? String((parsed.generation as Record<string, unknown>).dailyPrepareDate)
          : fallback?.generation?.dailyPrepareDate ?? null,
      cooldownUntil:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).cooldownUntil === 'string'
          ? String((parsed.generation as Record<string, unknown>).cooldownUntil)
          : fallback?.generation?.cooldownUntil ?? null,
      statusMessage:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).statusMessage === 'string'
          ? String((parsed.generation as Record<string, unknown>).statusMessage)
          : fallback?.generation?.statusMessage ?? null,
      lastError:
        parsed.generation && typeof parsed.generation === 'object' && typeof (parsed.generation as Record<string, unknown>).lastError === 'string'
          ? String((parsed.generation as Record<string, unknown>).lastError)
          : fallback?.generation?.lastError ?? null,
    },
    approved: typeof parsed.approved === 'boolean' ? parsed.approved : fallback?.approved ?? base.approved,
    lastUpdated: typeof parsed.lastUpdated === 'string' ? parsed.lastUpdated : new Date().toISOString(),
  }
}

function orderSelectedIdsByCuration(selectedAssetIds: string[], curation: IntroCurationItem[]) {
  const suggestedIds = curation.map((item) => item.id).filter((id) => selectedAssetIds.includes(id))
  const remainingIds = selectedAssetIds.filter((id) => !suggestedIds.includes(id))
  return [...suggestedIds, ...remainingIds]
}

function buildFallbackCuration(assetIds: string[]): IntroCurationItem[] {
  return assetIds.map((id, index) => ({
    id,
    pacing: 'cinematic',
    focalPoint: 'center',
    timing: 3,
    narrative: index === 0 ? 'Performer spotlight' : 'Performance energy',
  }))
}

function buildFallbackBackgroundDataUrl(actName: string, stylePreset: string) {
  const safeActName = actName.replace(/[<>&"]/g, '').slice(0, 48) || 'Live Performance'
  const safeStyle = stylePreset.replace(/[<>&"]/g, '').slice(0, 32) || 'theatrical-safe'
  const accent = safeStyle === 'theatrical-safe' ? '#f59e0b' : '#38bdf8'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.38" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <rect width="1280" height="720" fill="url(#glow)" />
      <circle cx="260" cy="168" r="148" fill="${accent}" opacity="0.12" />
      <circle cx="1050" cy="132" r="104" fill="#f97316" opacity="0.10" />
      <circle cx="1090" cy="566" r="182" fill="#22c55e" opacity="0.08" />
      <path d="M140 600 C 320 440, 530 420, 690 560 S 1000 700, 1160 530" fill="none" stroke="${accent}" stroke-opacity="0.34" stroke-width="14" stroke-linecap="round" />
      <path d="M180 650 C 390 500, 620 488, 810 618 S 1030 742, 1180 590" fill="none" stroke="#f97316" stroke-opacity="0.18" stroke-width="8" stroke-linecap="round" />
      <rect x="122" y="92" width="1036" height="536" rx="36" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
      <text x="640" y="308" text-anchor="middle" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="72" font-weight="700">${safeActName}</text>
      <text x="640" y="374" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="6">INTRO BACKDROP</text>
      <text x="640" y="420" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">Launch-safe fallback generated locally while AI background review is pending</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function normalizeCurationSuggestions(rawSuggestions: unknown, assetIds: string[]): IntroCurationItem[] {
  const fallbackById = new Map(buildFallbackCuration(assetIds).map((item) => [item.id, item]))
  const suggestionSource =
    rawSuggestions && typeof rawSuggestions === 'object' && Array.isArray((rawSuggestions as Record<string, unknown>).suggestions)
      ? ((rawSuggestions as Record<string, unknown>).suggestions as unknown[])
      : []

  const normalized = suggestionSource
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const value = item as Record<string, unknown>
      const id = typeof value.id === 'string' ? value.id : ''
      if (!id || !fallbackById.has(id)) return null

      return {
        id,
        pacing: typeof value.pacing === 'string' && value.pacing.length > 0 ? value.pacing : fallbackById.get(id)!.pacing,
        focalPoint:
          typeof value.focalPoint === 'string' && value.focalPoint.length > 0 ? value.focalPoint : fallbackById.get(id)!.focalPoint,
        timing: typeof value.timing === 'number' ? value.timing : Number(value.timing ?? fallbackById.get(id)!.timing) || fallbackById.get(id)!.timing,
        narrative:
          typeof value.narrative === 'string' && value.narrative.length > 0 ? value.narrative : fallbackById.get(id)!.narrative,
      }
    })
    .filter((item): item is IntroCurationItem => Boolean(item))

  if (normalized.length === 0) {
    return buildFallbackCuration(assetIds)
  }

  const normalizedIds = new Set(normalized.map((item) => item.id))
  const missingFallbacks = buildFallbackCuration(assetIds).filter((item) => !normalizedIds.has(item.id))
  return [...normalized, ...missingFallbacks]
}

async function invokeGenerationCapability(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-act-assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'x-inouthub-trust': TRUST_HEADER,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Internal intro generation failed (${response.status})`)
  }

  return data
}

function createErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const code = error instanceof IntroCapabilityError ? error.code : 'INTRO_CAPABILITY_ERROR'
  const details = error instanceof IntroCapabilityError ? error.details ?? null : null
  const status = code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : 400

  return new Response(
    JSON.stringify({ error: { code, message, details } }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
  )
}

async function fetchIntroRequirement(supabaseClient: ReturnType<typeof createClient>, actId: string) {
  const { data, error } = await supabaseClient
    .from('act_requirements')
    .select('*')
    .eq('act_id', actId)
    .eq('requirement_type', INTRO_REQUIREMENT_TYPE)
    .maybeSingle()

  if (error) throw error
  return data
}

async function fetchActName(supabaseClient: ReturnType<typeof createClient>, actId: string) {
  const { data, error } = await supabaseClient
    .from('acts')
    .select('name')
    .eq('id', actId)
    .single()

  if (error) throw error
  return data?.name || 'Live Performance'
}

async function fetchActIntroContext(supabaseClient: ReturnType<typeof createClient>, actId: string) {
  const { data, error } = await supabaseClient
    .from('acts')
    .select(`
      name,
      notes,
      event:events(
        organization:organizations(name)
      ),
      act_participants(
        role,
        participant:participants(first_name, last_name)
      )
    `)
    .eq('id', actId)
    .single()

  if (error) throw error

  return {
    actName: data.name || 'Live Performance',
    notes: data.notes || null,
    presenterName: data.event?.organization?.name || null,
    participantRows: (data.act_participants || []).map((row: any) => ({
      role: row.role,
      firstName: row.participant?.first_name || '',
      lastName: row.participant?.last_name || '',
    })),
  }
}

function buildIntroCredits(context: {
  actName: string
  presenterName: string | null
  participantRows: Array<{ role: string; firstName: string; lastName: string }>
}) {
  const fullName = (row: { firstName: string; lastName: string }) => `${row.firstName} ${row.lastName}`.trim()
  const namesForRole = (roles: string[]) =>
    context.participantRows
      .filter((row) => roles.includes(row.role))
      .map(fullName)
      .filter(Boolean)

  const leadNames = namesForRole(['Manager'])
  const choreographerNames = namesForRole(['Choreographer'])
  const supportNames = namesForRole(['Support', 'Crew'])
  const performerNames = namesForRole(['Performer'])

  const lines: IntroCreditLine[] = []
  if (context.presenterName) {
    lines.push({ key: 'presenter', label: 'Presented By', value: context.presenterName })
  }
  lines.push({ key: 'performance', label: 'Performance', value: context.actName })
  if (leadNames.length > 0) {
    lines.push({ key: 'lead', label: 'Lead', value: leadNames.join(', ') })
  }
  if (choreographerNames.length > 0) {
    lines.push({ key: 'choreography', label: 'Choreography', value: choreographerNames.join(', ') })
  }
  if (supportNames.length > 0) {
    lines.push({ key: 'support', label: 'Support', value: supportNames.join(', ') })
  }
  if (performerNames.length > 0) {
    const performerValue = performerNames.length <= 4
      ? performerNames.join(', ')
      : `${performerNames.slice(0, 4).join(', ')} + ${performerNames.length - 4} more`
    lines.push({ key: 'performers', label: 'Performers', value: performerValue })
  }

  return lines
}

function buildIntroFingerprint(args: {
  actName: string
  selectedAssetIds: string[]
  audioFileUrl: string | null
  credits: IntroCreditLine[]
}) {
  return JSON.stringify({
    actName: args.actName,
    selectedAssetIds: [...args.selectedAssetIds].sort(),
    audioFileUrl: args.audioFileUrl,
    credits: args.credits.map((line) => `${line.key}:${line.value}`),
  })
}

function applyGenerationGuard(composition: IntroComposition, fingerprint: string) {
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  const generation = composition.generation || createDefaultComposition().generation

  if (composition.approved || generation.status === 'approved') {
    throw new IntroCapabilityError('This intro is already approved. Regenerate only if you intentionally want a new draft.', 'INTRO_ALREADY_APPROVED')
  }

  if (generation.fingerprint === fingerprint && generation.cooldownUntil && new Date(generation.cooldownUntil).getTime() > now) {
    throw new IntroCapabilityError('Meaningful intro inputs have not changed since the last prep. Review the current draft before regenerating.', 'INTRO_NO_MEANINGFUL_CHANGE')
  }

  if (generation.cooldownUntil && new Date(generation.cooldownUntil).getTime() > now) {
    const minutesLeft = Math.ceil((new Date(generation.cooldownUntil).getTime() - now) / 60000)
    throw new IntroCapabilityError(`Intro prep just ran. Review the draft before regenerating again in about ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`, 'INTRO_COOLDOWN_ACTIVE')
  }

  const dailyCount = generation.dailyPrepareDate === today ? generation.dailyPrepareCount : 0
  if (dailyCount >= INTRO_PREP_DAILY_LIMIT) {
    throw new IntroCapabilityError(`This performance already hit the ${INTRO_PREP_DAILY_LIMIT}-run intro prep limit for today. Review the current draft instead of burning more credits.`, 'INTRO_DAILY_LIMIT_REACHED')
  }

  return {
    generation,
    today,
    nextDailyCount: dailyCount + 1,
  }
}

async function fetchLatestRequirement(
  supabaseClient: ReturnType<typeof createClient>,
  actId: string,
  requirementType: string,
) {
  const { data, error } = await supabaseClient
    .from('act_requirements')
    .select('*')
    .eq('act_id', actId)
    .eq('requirement_type', requirementType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function fetchActAssetMap(supabaseClient: ReturnType<typeof createClient>, actId: string) {
  const { data: actParticipants, error: participantError } = await supabaseClient
    .from('act_participants')
    .select('participant_id')
    .eq('act_id', actId)

  if (participantError) throw participantError

  const participantIds = (actParticipants || []).map((item) => item.participant_id)

  if (participantIds.length === 0) {
    return new Map<string, { id: string; participant_id: string; file_url: string; status: string | null }>()
  }

  const { data: assets, error: assetError } = await supabaseClient
    .from('participant_assets')
    .select('id, participant_id, file_url, status, type')
    .in('participant_id', participantIds)
    .eq('type', 'photo')
    .eq('status', 'approved')

  if (assetError) throw assetError

  return new Map((assets || []).map((asset) => [asset.id, asset]))
}

async function fetchCurrentComposition(supabaseClient: ReturnType<typeof createClient>, actId: string) {
  const introRequirement = await fetchIntroRequirement(supabaseClient, actId)
  const uploadedAudio = await fetchLatestRequirement(supabaseClient, actId, 'Audio')
  const latestAudio = await fetchLatestRequirement(supabaseClient, actId, 'Generative_Audio')
  const latestBackground = await fetchLatestRequirement(supabaseClient, actId, 'Generative')

  let parsedDescription: unknown = {}
  if (introRequirement?.description?.startsWith('{')) {
    try {
      parsedDescription = JSON.parse(introRequirement.description)
    } catch (_error) {
      parsedDescription = {}
    }
  }

  const composition = normalizeComposition(parsedDescription, {
    background: {
      fileUrl: introRequirement?.file_url ?? latestBackground?.file_url ?? null,
      source: introRequirement?.file_url ? 'intro_requirement' : latestBackground?.file_url ? 'generative_background' : null,
      stylePreset: null,
    },
    audio: {
      fileUrl: uploadedAudio?.file_url ?? latestAudio?.file_url ?? null,
      source: uploadedAudio?.file_url
        ? 'act_audio_requirement'
        : latestAudio?.file_url
          ? 'generated_tts'
          : null,
      optional: true,
    },
    approved: Boolean(introRequirement?.fulfilled),
  })

  if (composition.generation?.status === 'preparing' && composition.background.fileUrl) {
    composition.generation = {
      ...composition.generation,
      status: composition.approved ? 'approved' : 'ready_for_review',
      lastError: null,
    }
  }

  return {
    introRequirement,
    composition,
  }
}

async function saveComposition(
  supabaseClient: ReturnType<typeof createClient>,
  actId: string,
  composition: IntroComposition,
  existingId?: string | null,
) {
  const payload = {
    act_id: actId,
    requirement_type: INTRO_REQUIREMENT_TYPE,
    description: JSON.stringify(composition),
    file_url: composition.background.fileUrl,
    fulfilled: composition.approved,
  }

  if (existingId) {
    const { data, error } = await supabaseClient
      .from('act_requirements')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabaseClient
    .from('act_requirements')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

async function fetchPlayableParticipants(supabaseClient: ReturnType<typeof createClient>, actId: string) {
  const { data, error } = await supabaseClient
    .from('acts')
    .select(`
      name,
      act_participants(
        participant:participants(
          first_name,
          last_name,
          participant_assets(id, file_url, status, type)
        )
      )
    `)
    .eq('id', actId)
    .single()

  if (error) throw error

  return {
    actName: data.name,
    participants: (data.act_participants || []).map((entry: any) => ({
      firstName: entry.participant.first_name,
      lastName: entry.participant.last_name,
      assets: (entry.participant.participant_assets || [])
        .filter((asset: any) => asset.status === 'approved' && asset.type === 'photo')
        .map((asset: any) => ({
          id: asset.id,
          fileUrl: asset.file_url,
        })),
    })),
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new IntroCapabilityError('Supabase service configuration is missing', 'CONFIGURATION_ERROR')
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new IntroCapabilityError('Authorization header is required', 'UNAUTHORIZED')
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) {
      throw new IntroCapabilityError(`Unauthorized: ${userError?.message || 'No user session found'}`, 'UNAUTHORIZED')
    }

    const body = await req.json().catch(() => ({}))
    const { action, actId } = body as { action?: string; actId?: string }

    if (!action || !actId) {
      throw new IntroCapabilityError('action and actId are required', 'INVALID_REQUEST')
    }

    if (action === 'getIntroComposition') {
      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)
      return new Response(
        JSON.stringify({
          composition,
          compositionId: introRequirement?.id ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'curateIntroPhotos') {
      const assetIds = Array.isArray(body.assetIds) ? body.assetIds.filter((id): id is string => typeof id === 'string') : []
      if (assetIds.length < MIN_PLAYABLE_ASSET_COUNT) {
        throw new IntroCapabilityError('At least one approved asset is required for curation', 'INVALID_ASSET_SELECTION', {
          minAssetCount: MIN_PLAYABLE_ASSET_COUNT,
        })
      }

      const actAssetMap = await fetchActAssetMap(supabaseClient, actId)
      if (!assetIds.every((id) => actAssetMap.has(id))) {
        throw new IntroCapabilityError('Selected assets must belong to approved participant photos for this act', 'INVALID_ASSET_SELECTION')
      }

      const generationResult = await invokeGenerationCapability(supabaseUrl, serviceRoleKey, {
        actId,
        mode: 'Curation',
        assetIds,
      })

      const rawSuggestions =
        typeof generationResult.suggestions === 'string'
          ? JSON.parse(generationResult.suggestions.replace(/```json|```/g, ''))
          : generationResult.suggestions

      const curation = normalizeCurationSuggestions(rawSuggestions, assetIds)
      const orderedSelectedIds = orderSelectedIdsByCuration(assetIds, curation)
      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)

      const updatedComposition = normalizeComposition(
        {
          ...composition,
          selectedAssetIds: orderedSelectedIds,
          curation,
          credits: composition.credits,
          approved: false,
          lastUpdated: new Date().toISOString(),
        },
        {
          background: composition.background,
          audio: composition.audio,
          approved: false,
        },
      )

      const saved = await saveComposition(supabaseClient, actId, updatedComposition, introRequirement?.id)

      return new Response(
        JSON.stringify({
          composition: updatedComposition,
          compositionId: saved.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'generateIntroBackground') {
      const stylePreset = typeof body.stylePreset === 'string' ? body.stylePreset : 'theatrical-safe'
      const generationResult = await invokeGenerationCapability(supabaseUrl, serviceRoleKey, {
        actId,
        mode: 'Background',
      })

      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)
      const shouldUseFallbackBackground = !generationResult.publicUrl && !composition.background.fileUrl
      const fallbackBackgroundUrl = shouldUseFallbackBackground
        ? buildFallbackBackgroundDataUrl(await fetchActName(supabaseClient, actId), stylePreset)
        : null
      const resolvedBackgroundUrl = generationResult.publicUrl ?? composition.background.fileUrl ?? fallbackBackgroundUrl
      const resolvedBackgroundSource = generationResult.publicUrl
        ? 'generated_background'
        : composition.background.fileUrl
          ? composition.background.source
          : fallbackBackgroundUrl
            ? 'fallback_background'
            : composition.background.source
      const updatedComposition = normalizeComposition(
        {
          ...composition,
          background: {
            fileUrl: resolvedBackgroundUrl,
            source: resolvedBackgroundSource,
            stylePreset,
          },
          generation: {
            ...(composition.generation || createDefaultComposition().generation),
            status: resolvedBackgroundUrl ? 'ready_for_review' : 'preparing',
            completedAt: resolvedBackgroundUrl ? new Date().toISOString() : composition.generation?.completedAt ?? null,
            statusMessage: resolvedBackgroundUrl ? 'Backdrop ready for review.' : 'Backdrop is still publishing.',
            lastError: null,
          },
          approved: false,
          lastUpdated: new Date().toISOString(),
        },
        {
          audio: composition.audio,
          approved: false,
        },
      )

      const saved = await saveComposition(supabaseClient, actId, updatedComposition, introRequirement?.id)

      return new Response(
        JSON.stringify({
          composition: updatedComposition,
          compositionId: saved.id,
          isPending: Boolean(generationResult.isPending && !fallbackBackgroundUrl),
          message: fallbackBackgroundUrl
            ? 'AI background is still pending review. A launch-safe fallback backdrop was prepared for rehearsal.'
            : generationResult.message ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'generateIntroAudio') {
      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)
      const uploadedAudio = await fetchLatestRequirement(supabaseClient, actId, 'Audio')

      if (!uploadedAudio?.file_url) {
        throw new IntroCapabilityError(
          'Upload the performance music file first. The intro now uses the act audio file instead of generated voice.',
          'MISSING_AUDIO_SOURCE',
        )
      }

      const updatedComposition = normalizeComposition(
        {
          ...composition,
          audio: {
            fileUrl: uploadedAudio.file_url,
            source: 'act_audio_requirement',
            optional: true,
          },
          generation: {
            ...(composition.generation || createDefaultComposition().generation),
            statusMessage: 'Performance audio linked.',
            lastError: null,
          },
          lastUpdated: new Date().toISOString(),
        },
        {
          background: composition.background,
          approved: composition.approved,
        },
      )

      const saved = await saveComposition(supabaseClient, actId, updatedComposition, introRequirement?.id)

      return new Response(
        JSON.stringify({
          composition: updatedComposition,
          compositionId: saved.id,
          isPending: false,
          message: 'Performance audio linked from the uploaded act music file.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'buildIntroComposition') {
      const selectedAssetIds = Array.isArray(body.selectedAssetIds)
        ? body.selectedAssetIds.filter((id): id is string => typeof id === 'string')
        : []
      const overrides = body.overrides && typeof body.overrides === 'object' ? (body.overrides as Record<string, unknown>) : {}

      const actAssetMap = await fetchActAssetMap(supabaseClient, actId)
      if (selectedAssetIds.length > 0 && !selectedAssetIds.every((id) => actAssetMap.has(id))) {
        throw new IntroCapabilityError('Selected assets must belong to approved participant photos for this act', 'INVALID_ASSET_SELECTION')
      }

      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)
      const updatedComposition = normalizeComposition(
        {
          ...composition,
          selectedAssetIds,
          curation: Array.isArray(overrides.curation) ? overrides.curation : composition.curation,
          background: overrides.background && typeof overrides.background === 'object' ? overrides.background : composition.background,
          audio: overrides.audio && typeof overrides.audio === 'object' ? overrides.audio : composition.audio,
          credits: Array.isArray((overrides as Record<string, unknown>).credits) ? ((overrides as Record<string, unknown>).credits as IntroCreditLine[]) : composition.credits,
          approved: false,
          lastUpdated: new Date().toISOString(),
        },
        {
          background: composition.background,
          audio: composition.audio,
          approved: false,
        },
      )

      const saved = await saveComposition(supabaseClient, actId, updatedComposition, introRequirement?.id)

      return new Response(
        JSON.stringify({
          composition: updatedComposition,
          compositionId: saved.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'approveIntroComposition') {
      const actAssetMap = await fetchActAssetMap(supabaseClient, actId)
      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)

      if (composition.selectedAssetIds.length === 0) {
        throw new IntroCapabilityError('At least one selected asset is required before approval', 'INCOMPLETE_COMPOSITION', {
          minAssetCount: MIN_PLAYABLE_ASSET_COUNT,
        })
      }

      if (!composition.selectedAssetIds.every((id) => actAssetMap.has(id))) {
        throw new IntroCapabilityError('Approved intros must only reference approved participant assets assigned to the act', 'INVALID_ASSET_SELECTION')
      }

      if (!composition.background.fileUrl) {
        throw new IntroCapabilityError('A safe intro background is required before approval', 'INCOMPLETE_COMPOSITION')
      }

      if (composition.curation.length === 0) {
        throw new IntroCapabilityError('Curation metadata is required before approval', 'INCOMPLETE_COMPOSITION')
      }

      const updatedComposition = normalizeComposition(
        {
          ...composition,
          generation: {
            ...(composition.generation || createDefaultComposition().generation),
            status: 'approved',
            completedAt: new Date().toISOString(),
            statusMessage: 'Approved for stage playback.',
            lastError: null,
          },
          approved: true,
          lastUpdated: new Date().toISOString(),
        },
        {
          background: composition.background,
          audio: composition.audio,
          approved: true,
        },
      )

      const saved = await saveComposition(supabaseClient, actId, updatedComposition, introRequirement?.id)

      return new Response(
        JSON.stringify({
          composition: updatedComposition,
          compositionId: saved.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'prepareIntroAutopilot') {
      const startedAt = new Date().toISOString()
      const startedAtMs = Date.now()
      const { introRequirement, composition } = await fetchCurrentComposition(supabaseClient, actId)
      const priorGeneration = composition.generation || createDefaultComposition().generation

      try {
        const actAssetMap = await fetchActAssetMap(supabaseClient, actId)
        const selectedAssetIds = Array.from(actAssetMap.keys())
        if (selectedAssetIds.length < MIN_PLAYABLE_ASSET_COUNT) {
          throw new IntroCapabilityError('Approve at least one participant photo before preparing an intro.', 'INVALID_ASSET_SELECTION', {
            minAssetCount: MIN_PLAYABLE_ASSET_COUNT,
          })
        }

        const context = await fetchActIntroContext(supabaseClient, actId)
        const uploadedAudio = await fetchLatestRequirement(supabaseClient, actId, 'Audio')
        const credits = buildIntroCredits(context)
        const fingerprint = buildIntroFingerprint({
          actName: context.actName,
          selectedAssetIds,
          audioFileUrl: uploadedAudio?.file_url ?? composition.audio.fileUrl ?? null,
          credits,
        })
        const guard = applyGenerationGuard(composition, fingerprint)

        const curationGenerationResult = await invokeGenerationCapability(supabaseUrl, serviceRoleKey, {
          actId,
          mode: 'Curation',
          assetIds: selectedAssetIds,
        })
        const rawSuggestions =
          typeof curationGenerationResult.suggestions === 'string'
            ? JSON.parse(curationGenerationResult.suggestions.replace(/```json|```/g, ''))
            : curationGenerationResult.suggestions
        const curation = normalizeCurationSuggestions(rawSuggestions, selectedAssetIds)
        const orderedSelectedIds = orderSelectedIdsByCuration(selectedAssetIds, curation)

        const backgroundGenerationResult = await invokeGenerationCapability(supabaseUrl, serviceRoleKey, {
          actId,
          mode: 'Background',
        })
        const shouldUseFallbackBackground = !backgroundGenerationResult.publicUrl && !composition.background.fileUrl
        const fallbackBackgroundUrl = shouldUseFallbackBackground
          ? buildFallbackBackgroundDataUrl(context.actName, 'theatrical-safe')
          : null
        const resolvedBackgroundUrl = backgroundGenerationResult.publicUrl ?? composition.background.fileUrl ?? fallbackBackgroundUrl
        const resolvedBackgroundSource = backgroundGenerationResult.publicUrl
          ? 'generated_background'
          : composition.background.fileUrl
            ? composition.background.source
            : fallbackBackgroundUrl
              ? 'fallback_background'
              : composition.background.source

        const nowIso = new Date().toISOString()
        const completedAt = new Date().toISOString()
        const updatedComposition = normalizeComposition(
          {
            ...composition,
            selectedAssetIds: orderedSelectedIds,
            curation,
            background: {
              fileUrl: resolvedBackgroundUrl,
              source: resolvedBackgroundSource,
              stylePreset: 'theatrical-safe',
            },
            audio: {
              fileUrl: uploadedAudio?.file_url ?? composition.audio.fileUrl ?? null,
              source: uploadedAudio?.file_url ? 'act_audio_requirement' : composition.audio.source,
              optional: true,
            },
            credits,
            generation: {
              ...priorGeneration,
              status: resolvedBackgroundUrl ? 'ready_for_review' : 'preparing',
              fingerprint,
              startedAt,
              completedAt: resolvedBackgroundUrl ? completedAt : null,
              lastDurationMs: resolvedBackgroundUrl ? Date.now() - startedAtMs : null,
              lastPreparedAt: nowIso,
              totalAttempts: (priorGeneration.totalAttempts || 0) + 1,
              failedAttempts: priorGeneration.failedAttempts || 0,
              dailyPrepareCount: guard.nextDailyCount,
              dailyPrepareDate: guard.today,
              cooldownUntil: new Date(Date.now() + INTRO_PREP_COOLDOWN_MS).toISOString(),
              statusMessage: resolvedBackgroundUrl
                ? 'Draft prepared and ready for review.'
                : 'Draft is still preparing in the background.',
              lastError: null,
            },
            approved: false,
            lastUpdated: nowIso,
          },
          {
            approved: false,
          },
        )

        const saved = await saveComposition(supabaseClient, actId, updatedComposition, introRequirement?.id)

        return new Response(
          JSON.stringify({
            composition: updatedComposition,
            compositionId: saved.id,
            isPending: Boolean(backgroundGenerationResult.isPending && !resolvedBackgroundUrl),
            message: resolvedBackgroundUrl
              ? 'Intro draft prepared. Review the credits and preview before stage approval.'
              : 'Intro draft is still preparing in the background.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      } catch (error) {
        const failedComposition = normalizeComposition(
          {
            ...composition,
            generation: {
              ...priorGeneration,
              status: 'failed',
              startedAt,
              completedAt: new Date().toISOString(),
              lastDurationMs: Date.now() - startedAtMs,
              totalAttempts: (priorGeneration.totalAttempts || 0) + 1,
              failedAttempts: (priorGeneration.failedAttempts || 0) + 1,
              statusMessage: 'Intro prep failed. Review the error before trying again.',
              lastError: error instanceof Error ? error.message : 'Intro preparation failed',
            },
            approved: false,
            lastUpdated: new Date().toISOString(),
          },
          {
            approved: false,
          },
        )
        await saveComposition(supabaseClient, actId, failedComposition, introRequirement?.id ?? null)
        throw error
      }
    }

    if (action === 'getPlayableIntro') {
      const actAssetMap = await fetchActAssetMap(supabaseClient, actId)
      const { composition } = await fetchCurrentComposition(supabaseClient, actId)

      if (!composition.approved) {
        throw new IntroCapabilityError('Intro composition is not approved for stage playback', 'INTRO_NOT_APPROVED')
      }

      if (composition.selectedAssetIds.length < MIN_PLAYABLE_ASSET_COUNT) {
        throw new IntroCapabilityError('Playable intro requires at least one selected asset', 'INCOMPLETE_COMPOSITION', {
          minAssetCount: MIN_PLAYABLE_ASSET_COUNT,
        })
      }

      if (!composition.background.fileUrl) {
        throw new IntroCapabilityError('Playable intro requires a background reference', 'INCOMPLETE_COMPOSITION')
      }

      if (!composition.selectedAssetIds.every((id) => actAssetMap.has(id))) {
        throw new IntroCapabilityError('Playable intro contains assets that are no longer valid for this act', 'INVALID_ASSET_SELECTION')
      }

      const playableComposition = normalizeComposition(
        {
          ...composition,
          selectedAssetIds: composition.selectedAssetIds.filter((id) => actAssetMap.has(id)),
        },
        {
          background: composition.background,
          audio: composition.audio,
          approved: composition.approved,
        },
      )

      const playableData = await fetchPlayableParticipants(supabaseClient, actId)

      return new Response(
        JSON.stringify({
          composition: playableComposition,
          actName: playableData.actName,
          participants: playableData.participants,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    throw new IntroCapabilityError(`Unsupported intro capability: ${action}`, 'UNSUPPORTED_ACTION')
  } catch (error: unknown) {
    return createErrorResponse(error)
  }
})
