import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v5.2.2/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- GCP Service Account Auth (JWT → Access Token) ---
async function getGcpAccessToken(saKeyJson: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const privateKey = await importPKCS8(saKeyJson.private_key, 'RS256')

  const jwt = await new SignJWT({
    iss: saKeyJson.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: saKeyJson.token_uri,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const tokenRes = await fetch(saKeyJson.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    throw new Error(`GCP Token Exchange Failed: ${tokenRes.status} - ${errText}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

// --- Main Handler ---
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json().catch(() => ({}))
    const { actId, testOnly = false, bucket = 'participant-assets' } = body
    if (!actId) throw new Error('actId is required')

    // 1. Fetch act context
    const { data: act, error: actError } = await supabaseClient
      .from('acts')
      .select(`name, act_participants ( participants (first_name, last_name) )`)
      .eq('id', actId)
      .single()

    if (actError) throw actError

    const performers =
      act.act_participants
        ?.map((p: any) => `${p.participants.first_name} ${p.participants.last_name}`)
        .join(', ') || 'Various Performers'

    // 2. GCP Authentication via JWT exchange
    const saKey = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY') || '{}')
    if (!saKey.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY secret is not set or is missing private_key')

    const accessToken = await getGcpAccessToken(saKey)
    const projectId = saKey.project_id
    const location = 'us-central1'

    console.log(`[VertexPipeline] GCP Auth OK. Project: ${projectId}`)

    // 3. Minimal Vertex AI call (Imagen 3)
    const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`

    const payload = {
      instances: [
        { prompt: `A cinematic theatrical poster for \"${act.name}\" featuring ${performers}.` },
      ],
      parameters: { sampleCount: 1, aspectRatio: '1:1', outputMimeType: 'image/png' },
    }

    console.log(`[VertexPipeline] Calling Vertex AI...`)

    const response = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`Vertex AI Error: ${response.status} - ${errBody}`)
    }

    const result = await response.json()
    const base64Data = result.predictions?.[0]?.bytesBase64
    if (!base64Data) throw new Error('Vertex AI returned no image data')

    console.log(`[VertexPipeline] Success! Image received. Saving to storage...`)

    if (testOnly) {
      return new Response(
        JSON.stringify({
          status: 'Stage 1: Connectivity Success',
          projectId,
          model: 'imagen-3.0-generate-001',
          predictionCount: 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // 4. Persistence to Supabase Storage
    const filePath = `acts/${actId}/poster_${Date.now()}.png`
    
    // Convert base64 to Uint8Array for upload
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from(bucket)
      .upload(filePath, binaryData, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) throw new Error(`Storage Upload Failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabaseClient
      .storage
      .from(bucket)
      .getPublicUrl(filePath)

    // 5. Link to Act in DB
    const { error: dbError } = await supabaseClient
      .from('act_requirements')
      .insert({
        act_id: actId,
        requirement_type: 'Generative',
        description: 'AI-Generated Cinematic Poster',
        file_url: publicUrl,
        fulfilled: true
      })

    if (dbError) throw new Error(`Database Linkage Failed: ${dbError.message}`)

    return new Response(
      JSON.stringify({
        status: 'Assets Generated',
        message: 'AI Intro Assets Ready',
        publicUrl,
        bucket,
        filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[VertexPipeline] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
