import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as djwt from "https://deno.land/x/djwt@v2.4/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper to get Google Access Token using Service Account (Deno Native)
async function getGoogleAccessToken(serviceAccount: any) {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
    }

    const pemHeader = "-----BEGIN PRIVATE KEY-----"
    const pemFooter = "-----END PRIVATE KEY-----"
    const pemContents = serviceAccount.private_key
        .replace(pemHeader, "")
        .replace(pemFooter, "")
        .replaceAll("\\n", "\n")
        .replace(/\s/g, "")

    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i)
    }

    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    )

    const jwt = await djwt.create({ alg: "RS256", typ: "JWT" }, payload, key)

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    })

    const data = await response.json()
    if (data.error) throw new Error(`Google Auth Failed: ${data.error_description || data.error}`)
    return data.access_token
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        console.log('Authorization Header present:', !!authHeader)

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader! } } }
        )

        // 1. Get User and verify role
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            console.error('getUser Error:', userError)
            throw new Error(`Unauthorized: ${userError?.message || 'No user session found'}`)
        }

        const body = await req.json()
        const { sheetId, eventId, dryRun = true } = body
        if (!eventId || !sheetId) {
            console.log('Missing body params:', { eventId: !!eventId, sheetId: !!sheetId })
            throw new Error('Missing eventId or sheetId')
        }

        // Verify EventAdmin role OR Super Admin
        const { data: role, error: roleError } = await supabaseClient.rpc('auth_event_role', { p_event_id: eventId })
        const { data: isSuperAdmin } = await supabaseClient.rpc('auth_is_super_admin')

        if (roleError || (role !== 'EventAdmin' && !isSuperAdmin)) {
            console.error('Role Verification Failed:', { role, isSuperAdmin, roleError })
            throw new Error(`Unauthorized: Administrative access required (Currently: ${role || 'None'})`)
        }

        // 2. Auth with Google Sheets API using Service Account
        let serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
        if (!serviceAccountJson) {
            const serviceRoleClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )
            const { data: config } = await serviceRoleClient
                .from('internal_config')
                .select('value')
                .eq('key', 'google_service_account_json')
                .single()

            if (config?.value) {
                serviceAccountJson = typeof config.value === 'string' ? config.value : JSON.stringify(config.value)
            }
        }

        if (!serviceAccountJson) throw new Error('Google Service Account JSON not found')

        const serviceAccount = JSON.parse(serviceAccountJson)
        const accessToken = await getGoogleAccessToken(serviceAccount)

        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z`
        const response = await fetch(sheetsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!response.ok) {
            const errBody = await response.text()
            throw new Error(`Failed to fetch sheet: ${errBody}`)
        }

        const data = await response.json()
        const rows = data.values || []

        if (rows.length < 2) {
            return new Response(JSON.stringify({ success: true, stats: { total: 0, new: 0, updated: 0, missing: 0 }, message: 'No data found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const headers = rows[0]
        const bodyRows = rows.slice(1)

        const participants = bodyRows.map(row => {
            const rowData: Record<string, string> = {}
            headers.forEach((h: string, i: number) => {
                rowData[h] = row[i] || ''
            })

            const firstName = rowData['Student Full Name - First Name'] || rowData['First Name'] || rowData['firstName'] || rowData['first_name'] || ''
            const lastName = rowData['Student Full Name - Last Name'] || rowData['Last Name'] || rowData['lastName'] || rowData['last_name'] || ''
            const pFirst = rowData['Parent Name - First Name'] || ''
            const pLast = rowData['Parent Name - Last Name'] || ''
            const guardianName = pFirst && pLast ? `${pFirst} ${pLast}` : (rowData['Guardian Name'] || rowData['guardianName'] || '')
            const phone = rowData['Phone Number'] || rowData['Guardian Phone'] || rowData['guardianPhone'] || ''
            const email = rowData['Email'] || ''

            const specialRequestHeader = headers.find(h => /special|request|medical|dietary|note|comment/i.test(h))
            const specialRequestRaw = specialRequestHeader ? rowData[specialRequestHeader] : null
            const hasSpecialRequests = !!(specialRequestRaw && specialRequestRaw.trim())

            let anchorType = 'natural'
            let anchorValue = ''

            const submissionId = rowData['Submission ID'] || rowData['Timestamp'] || rowData['Order ID'] || rowData['Order Number']
            const studentId = rowData['Student ID'] || rowData['Member ID']

            if (submissionId) {
                anchorType = 'submission'
                const normName = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z]/g, '')
                anchorValue = `${submissionId}:${normName}`
            } else if (studentId) {
                anchorType = 'student'
                anchorValue = String(studentId)
            } else {
                anchorType = 'natural'
                const normName = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z]/g, '')
                const last4 = String(phone).replace(/\D/g, '').slice(-4)
                anchorValue = `${normName}:${last4}`
            }

            const age = rowData['Age']
            const products = rowData['My Products: Products'] || ''
            const notesParts = []
            if (studentId) notesParts.push(`[ID: ${studentId}]`)
            if (age) notesParts.push(`[Age: ${age}]`)
            if (email) notesParts.push(`[Email: ${email}]`)
            if (specialRequestRaw) notesParts.push(specialRequestRaw)
            if (products) notesParts.push(`[Products: ${products}]`)

            return {
                event_id: eventId,
                first_name: firstName || 'Unknown',
                last_name: lastName || 'Participant',
                guardian_name: guardianName || null,
                guardian_phone: phone || null,
                notes: notesParts.join(' ') || rowData['Notes'] || null,
                source_system: 'google-sheets',
                source_instance: sheetId,
                source_anchor_type: anchorType,
                source_anchor_value: anchorValue,
                source_imported_at: new Date().toISOString(),
                special_request_raw: specialRequestRaw || null,
                special_request_source_column: specialRequestHeader || null,
                has_special_requests: hasSpecialRequests,
                src_raw: rowData
            }
        }).filter(p => p.first_name !== 'Unknown' || p.last_name !== 'Participant')

        const incomingAnchors = new Set(participants.map(p => p.source_anchor_value))

        const { data: existingRecords, error: fetchError } = await supabaseClient
            .from('participants')
            .select('source_anchor_value, status, id')
            .eq('event_id', eventId)
            .eq('source_instance', sheetId)
            .eq('source_system', 'google-sheets')

        if (fetchError) throw fetchError

        const existingAnchors = new Set(existingRecords?.map(r => r.source_anchor_value) || [])
        const missingAnchors = [...existingAnchors].filter(a => !incomingAnchors.has(a))
        const newAnchors = [...incomingAnchors].filter(a => !existingAnchors.has(a))
        const updatedAnchors = [...incomingAnchors].filter(a => existingAnchors.has(a))

        if (dryRun) {
            return new Response(JSON.stringify({
                success: true,
                stats: {
                    total: participants.length,
                    new: newAnchors.length,
                    updated: updatedAnchors.length,
                    missing: missingAnchors.length
                },
                preview: participants.slice(0, 5),
                missingPreview: missingAnchors.slice(0, 5)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const now = new Date().toISOString()
        const participantsToUpsert = participants.map(p => {
            let status = 'active'
            const raw = p.src_raw as any
            const statusSignal = (raw['Status'] || raw['Payment Status'] || raw['Canceled'] || '').toLowerCase()
            if (statusSignal.includes('refund') || statusSignal.includes('cancel')) status = 'refunded'
            else if (statusSignal.includes('withdraw') || statusSignal.includes('drop')) status = 'withdrawn'

            return {
                ...p,
                status,
                source_last_seen_at: now
            }
        })

        const { error: insertError } = await supabaseClient
            .from('participants')
            .upsert(participantsToUpsert, {
                onConflict: 'event_id, source_system, source_instance, source_anchor_type, source_anchor_value'
            })

        if (insertError) throw insertError

        if (missingAnchors.length > 0) {
            await supabaseClient
                .from('participants')
                .update({ status: 'missing_from_source' })
                .eq('event_id', eventId)
                .eq('source_instance', sheetId)
                .in('source_anchor_value', missingAnchors)
                .neq('status', 'missing_from_source')
        }

        return new Response(JSON.stringify({
            success: true,
            stats: {
                total: participants.length,
                new: newAnchors.length,
                updated: updatedAnchors.length,
                missing: missingAnchors.length
            },
            message: 'Sync completed successfully'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Edge Function error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
