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
    const { actId, testOnly = false, manualPrompt } = body
    if (!actId && !manualPrompt) throw new Error('actId or manualPrompt is required')

    // 2. GCP Authentication
    const saKey = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY') || '{}')
    if (!saKey.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY secret is not set')

    const accessToken = await getGcpAccessToken(saKey)
    const projectId = saKey.project_id
    const location = 'us-central1'

    let finalPrompt = manualPrompt;
    let actName = "Dynamic Performance";

    if (!manualPrompt) {
      // 1. Fetch act context
      const { data: act, error: actError } = await supabaseClient
        .from('acts')
        .select(`name, act_participants ( participants (first_name, last_name) )`)
        .eq('id', actId)
        .single()

      if (actError) throw actError
      actName = act.name;

      const performers =
        act.act_participants
          ?.map((p: any) => `${p.participants.first_name} ${p.participants.last_name}`)
          .join(', ') || 'Various Performers'
      
      // STAGE 1: Call Gemini to engineer a safe, cinematic prompt
      console.log(`[VertexPipeline] Stage 1: Calling Gemini for prompt engineering...`)
      const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash-001:generateContent`
      
      const geminiPayload = {
        contents: [{
          role: "user",
          parts: [{ 
            text: `Act Name: "${act.name}"
            Performers: ${performers}
            
            Task: Write a high-fidelity image generation prompt for a cinematic theatrical poster for this act. 
            Rules:
            1. Use professional architectural and stage lighting terms (High-key, Rim lighting, Haze).
            2. FOCUS on artistic aesthetics and performance energy.
            3. CRITICAL: Ensure the prompt is safe for all audiences and avoids any keywords related to violence, weapons, or danger.
            4. Output ONLY the prompt string. No conversational filler or markdown.`
          }]
        }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
      }

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      })

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json()
        finalPrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `A cinematic theatrical poster for "${act.name}" featuring ${performers}.`;
        console.log(`[VertexPipeline] Gemini Prompt: ${finalPrompt}`)
      } else {
        console.warn(`[VertexPipeline] Gemini Failed, falling back to template.`)
        finalPrompt = `A cinematic theatrical poster for "${act.name}" featuring ${performers}.`;
      }
    }

    // STAGE 2: Call Imagen with the engineered prompt (March 2026 GA Spec)
    const imagenUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-4.0-fast-generate-001:generateImages`

    const imagenPayload = {
      prompt: finalPrompt,
      aspectRatio: '1:1',
      sampleCount: 1,
      outputMimeType: 'image/png',
      // Adds the "Safety Shield" configured in GCP Console
      safetySetting: 'block_only_high',
      personGeneration: 'allow_all' // Ensures performers' faces aren't blocked as "celebrities"
    }

    console.log(`[VertexPipeline] Stage 2: Calling Imagen 4.0 Fast (GA Spec)...`)

    const response = await fetch(imagenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imagenPayload),
    })

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        // Handle Safety Filter Blocks gracefully for the demo
        if (response.status === 400 && JSON.stringify(errBody).includes('SAFETY')) {
            console.warn(`[VertexPipeline] Safety Block triggered for prompt. Returning isPending state.`);
            return new Response(
                JSON.stringify({ 
                    status: 'Success', 
                    isPending: true, 
                    message: 'Reviewing for Brand Safety' 
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
            )
        }
        throw new Error(`Vertex AI Error: ${response.status} - ${JSON.stringify(errBody)}`)
    }

    const result = await response.json()
    // In the generateImages spec, the response structure is flattened
    // Result contains an array of images: { predictions: [{ bytesBase64: "..." }] } or { images: [{ bytesBase64: "..." }] }
    // Based on the GA spec, we check for 'predictions' or 'images'
    const base64Data = result.predictions?.[0]?.bytesBase64 || result.images?.[0]?.bytesBase64
    
    // Check for empty payload despite 200 (Vertex sometimes does this for safety)
    if (!base64Data) {
        return new Response(
            JSON.stringify({ 
                status: 'Success', 
                isPending: true, 
                message: 'Reviewing for Brand Safety' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
    }

    // 4. Persistence
    const bucketName = 'participant-assets';
    const filePath = `acts/${actId || 'system'}/poster_${Date.now()}.png`
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    const { error: uploadError } = await supabaseClient
      .storage
      .from(bucketName)
      .upload(filePath, binaryData, { contentType: 'image/png', upsert: true })

    if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabaseClient.storage.from(bucketName).getPublicUrl(filePath)

    // 5. Database Linkage
    await supabaseClient
      .from('act_requirements')
      .insert({
        act_id: actId,
        requirement_type: 'Generative',
        description: `AI Poster: ${actName}`,
        file_url: publicUrl,
        fulfilled: true
      })

    return new Response(
      JSON.stringify({ status: 'Assets Generated', publicUrl, isPending: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[VertexPipeline] Critical Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
