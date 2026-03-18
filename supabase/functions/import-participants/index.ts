import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as djwt from "https://deno.land/x/djwt@v2.4/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const HEADER_ALIASES = {
    firstName: ['student full name first name', 'student first name', 'participant first name', 'first name', 'firstname', 'first_name'],
    lastName: ['student full name last name', 'student last name', 'participant last name', 'last name', 'lastname', 'last_name'],
    fullName: ['student full name', 'participant full name', 'participant name', 'student name', 'full name', 'name'],
    parentFirstName: ['parent name first name', 'guardian first name', 'parent first', 'guardian first'],
    parentLastName: ['parent name last name', 'guardian last name', 'parent last', 'guardian last'],
    guardianName: ['guardian name', 'parent name', 'parent full name', 'guardian fullname'],
    phone: ['phone number', 'guardian phone', 'parent phone', 'phone', 'mobile', 'cell'],
    email: ['email address', 'parent email', 'guardian email', 'email'],
    age: ['age', 'student age'],
    notes: ['notes', 'comments', 'comment', 'operator notes'],
    studentId: ['student id', 'member id', 'participant id', 'registration id'],
    submissionId: ['submission id', 'timestamp', 'order id', 'order number', 'confirmation number'],
    products: ['my products products', 'products', 'product', 'class', 'group'],
    specialRequest: ['special request', 'special request?', 'special requests', 'medical notes', 'medical', 'dietary', 'accommodation', 'accommodations'],
}

const VALUE_HINTS = {
    specialRequest: ['add', 'include', 'need', 'needs', 'request', 'allergy', 'medical', 'dietary', 'accommodation', 'group', 'please'],
    products: ['group', 'class', 'product', 'package', 'level'],
    notes: ['note', 'notes', 'comment', 'comments', 'request'],
}

const VALUE_INFERENCE_FIELDS = ['phone', 'email', 'age', 'specialRequest', 'fullName', 'guardianName', 'studentId', 'submissionId', 'products', 'notes'] as const

function normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function splitFullName(fullName: string) {
    const parts = fullName.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { firstName: '', lastName: '' }
    if (parts.length === 1) return { firstName: parts[0], lastName: '' }
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1],
    }
}

function toText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function detectHeader(headers: string[], aliases: string[], fallbackPattern?: RegExp) {
    const normalized = new Map(headers.map((header) => [header, normalizeHeader(header)]))
    for (const alias of aliases) {
        const match = headers.find((header) => normalized.get(header) === alias)
        if (match) return match
    }
    if (fallbackPattern) {
        return headers.find((header) => fallbackPattern.test(normalizeHeader(header)))
    }
    return undefined
}

function isLikelyPhone(value: string) {
    const digits = value.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
}

function isLikelyEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isLikelyAge(value: string) {
    const numeric = Number(value)
    return Number.isInteger(numeric) && numeric >= 1 && numeric <= 99
}

function isLikelyFullName(value: string) {
    return /^[A-Za-z'.-]+(?:\s+[A-Za-z'.-]+){1,3}$/.test(value)
}

function isLikelyIdentifier(value: string) {
    return /^[A-Za-z0-9:_-]{4,}$/.test(value) && /\d/.test(value)
}

function isLikelySubmissionId(value: string) {
    return isLikelyIdentifier(value) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value) || /\d{4}-\d{2}-\d{2}/.test(value)
}

function isLikelyLongText(value: string) {
    return value.length >= 12 && /\s/.test(value)
}

function getSampleValues(rows: Record<string, string>[], header: string) {
    return rows.map((row) => toText(row[header])).filter(Boolean).slice(0, 20)
}

function scoreFieldByValues(field: string, values: string[]) {
    if (values.length === 0) return 0
    const ratio = (predicate: (value: string) => boolean) => values.filter(predicate).length / values.length
    const avgLength = values.reduce((total, value) => total + value.length, 0) / values.length
    const hints = VALUE_HINTS[field as keyof typeof VALUE_HINTS] || []
    const hintRatio = hints.length
        ? values.filter((value) => hints.some((hint) => value.toLowerCase().includes(hint))).length / values.length
        : 0

    switch (field) {
        case 'phone':
            return ratio(isLikelyPhone)
        case 'email':
            return ratio(isLikelyEmail)
        case 'age':
            return ratio(isLikelyAge)
        case 'fullName':
        case 'guardianName':
            return ratio(isLikelyFullName)
        case 'studentId':
            return ratio(isLikelyIdentifier)
        case 'submissionId':
            return ratio(isLikelySubmissionId)
        case 'specialRequest':
            return ratio(isLikelyLongText) * 0.6 + hintRatio * 0.4
        case 'products':
            return hintRatio * 0.45 + (avgLength >= 4 && avgLength <= 40 ? 0.25 : 0) + (values.length >= 2 ? 0.15 : 0)
        case 'notes':
            return ratio(isLikelyLongText) * 0.7 + hintRatio * 0.3
        default:
            return 0
    }
}

function inferHeaderByValues(headers: string[], rows: Record<string, string>[], assignedHeaders: Set<string>, field: string) {
    let bestHeader: string | undefined
    let bestScore = 0
    for (const header of headers) {
        if (assignedHeaders.has(header)) continue
        const values = getSampleValues(rows, header)
        const score = scoreFieldByValues(field, values)
        if (score > bestScore) {
            bestHeader = header
            bestScore = score
        }
    }
    const threshold = field === 'specialRequest' || field === 'notes' || field === 'products' ? 0.45 : 0.6
    return bestScore >= threshold ? bestHeader : undefined
}

function inferProfile(headers: string[], rows: Record<string, string>[], savedProfile?: Record<string, string>) {
    const profile: Record<string, string | undefined> = {}
    const assignedHeaders = new Set<string>()

    for (const [field, header] of Object.entries(savedProfile || {})) {
        if (header && headers.includes(header)) {
            profile[field] = header
            assignedHeaders.add(header)
        }
    }

    const headerMatches: Array<[string, string[], RegExp | undefined]> = [
        ['firstName', HEADER_ALIASES.firstName, undefined],
        ['lastName', HEADER_ALIASES.lastName, undefined],
        ['fullName', HEADER_ALIASES.fullName, /\b(student|participant)?\s*name\b/],
        ['parentFirstName', HEADER_ALIASES.parentFirstName, undefined],
        ['parentLastName', HEADER_ALIASES.parentLastName, undefined],
        ['guardianName', HEADER_ALIASES.guardianName, undefined],
        ['phone', HEADER_ALIASES.phone, /\b(phone|mobile|cell)\b/],
        ['email', HEADER_ALIASES.email, undefined],
        ['age', HEADER_ALIASES.age, undefined],
        ['notes', HEADER_ALIASES.notes, undefined],
        ['studentId', HEADER_ALIASES.studentId, undefined],
        ['submissionId', HEADER_ALIASES.submissionId, undefined],
        ['products', HEADER_ALIASES.products, undefined],
        ['specialRequest', HEADER_ALIASES.specialRequest, /\b(special|medical|dietary|accommodation|request)\b/],
    ]

    for (const [field, aliases, fallbackPattern] of headerMatches) {
        if (profile[field]) continue
        const detected = detectHeader(headers, aliases, fallbackPattern)
        if (detected && !assignedHeaders.has(detected)) {
            profile[field] = detected
            assignedHeaders.add(detected)
        }
    }

    for (const field of VALUE_INFERENCE_FIELDS) {
        if (profile[field]) continue
        const inferred = inferHeaderByValues(headers, rows, assignedHeaders, field)
        if (inferred) {
            profile[field] = inferred
            assignedHeaders.add(inferred)
        }
    }

    const gaps: string[] = []
    if (!profile.firstName && !profile.lastName && !profile.fullName) {
        gaps.push('Participant name columns were not recognized automatically.')
    }
    if (!profile.phone) {
        gaps.push('Guardian or contact phone column was not recognized.')
    }
    if (!profile.specialRequest) {
        gaps.push('Special request column was not recognized.')
    }

    return { profile, gaps }
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
        const { sheetId, eventId, dryRun = true, savedMapping } = body
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
        const parsedRows = bodyRows.map((row: string[]) => {
            const rowData: Record<string, string> = {}
            headers.forEach((h: string, i: number) => {
                rowData[h] = row[i] || ''
            })
            return rowData
        })
        const { profile, gaps } = inferProfile(headers, parsedRows, savedMapping)

        const participants = parsedRows.map(rowData => {

            const read = (header?: string) => (header ? String(rowData[header] || '').trim() : '')
            let firstName = read(profile.firstName)
            let lastName = read(profile.lastName)
            const fullName = read(profile.fullName)
            if ((!firstName || !lastName) && fullName) {
                const parsed = splitFullName(fullName)
                firstName ||= parsed.firstName
                lastName ||= parsed.lastName
            }

            const pFirst = read(profile.parentFirstName)
            const pLast = read(profile.parentLastName)
            const guardianName = pFirst || pLast ? `${pFirst} ${pLast}`.trim() : read(profile.guardianName)
            const phone = read(profile.phone)
            const email = read(profile.email)

            const specialRequestRaw = read(profile.specialRequest) || null
            const hasSpecialRequests = !!(specialRequestRaw && specialRequestRaw.trim())

            let anchorType = 'natural'
            let anchorValue = ''

            const submissionId = read(profile.submissionId)
            const studentId = read(profile.studentId)

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

            const age = read(profile.age)
            const products = read(profile.products)
            const notesParts = []
            if (studentId) notesParts.push(`[ID: ${studentId}]`)
            if (age) notesParts.push(`[Age: ${age}]`)
            if (email) notesParts.push(`[Email: ${email}]`)
            if (specialRequestRaw) notesParts.push(specialRequestRaw)
            if (products) notesParts.push(`[Products: ${products}]`)
            const explicitNotes = read(profile.notes)
            if (explicitNotes) notesParts.push(explicitNotes)

            return {
                event_id: eventId,
                first_name: firstName || 'Unknown',
                last_name: lastName || 'Participant',
                guardian_name: guardianName || null,
                guardian_phone: phone || null,
                notes: notesParts.join(' ') || null,
                source_system: 'google-sheets',
                source_instance: sheetId,
                source_anchor_type: anchorType,
                source_anchor_value: anchorValue,
                source_imported_at: new Date().toISOString(),
                special_request_raw: specialRequestRaw || null,
                special_request_source_column: profile.specialRequest || null,
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
                mapping: profile,
                gaps,
                headers,
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
            mapping: profile,
            gaps,
            headers,
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
