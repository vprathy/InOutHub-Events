import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INTRO_REQUIREMENT_TYPE = 'IntroComposition'
const TRUST_HEADER = 'inouthub-internal-2026-v16'
const INTRO_COMPOSITION_VERSION = '2026-03-13'
const MIN_PLAYABLE_ASSET_COUNT = 1

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

interface IntroComposition {
  version: string
  selectedAssetIds: string[]
  curation: IntroCurationItem[]
  background: IntroMediaRef
  audio: IntroMediaRef
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
