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
const REQUEST_HEADER_ALIASES = {
    title: ['performance title', 'performance name', 'act title', 'act name', 'dance title', 'item title', 'title', 'performance', 'act', 'item', 'program name', 'program title'],
    leadName: ['requester name', 'requestor name', 'submitted by', 'primary contact name', 'primary contact', 'contact name', 'lead name', 'lead contact', 'teacher name', 'coach name', 'director name', 'manager name', 'team manager', 'name'],
    leadFirstName: ['requester first name', 'requestor first name', 'primary contact first name', 'contact first name', 'lead first name', 'manager first name', 'teacher first name', 'first name'],
    leadLastName: ['requester last name', 'requestor last name', 'primary contact last name', 'contact last name', 'lead last name', 'manager last name', 'teacher last name', 'last name'],
    leadEmail: ['requester email', 'requestor email', 'primary contact email', 'contact email', 'lead email', 'manager email', 'teacher email', 'email address', 'email'],
    leadPhone: ['requester phone', 'requestor phone', 'primary contact phone', 'contact phone', 'lead phone', 'manager phone', 'teacher phone', 'phone number', 'phone', 'mobile'],
    durationMinutes: ['duration estimate minutes', 'duration minutes', 'duration', 'runtime', 'length'],
    musicSupplied: ['music supplied', 'music submitted', 'music included', 'music?'],
    rosterSupplied: ['roster supplied', 'cast supplied', 'roster included', 'participants supplied'],
    notes: ['notes', 'comments', 'special notes', 'special requests', 'description'],
    sourceAnchor: ['submission id', 'request id', 'entry id', 'row id', 'timestamp', 'order id'],
}

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

function isLikelyBooleanFlag(value: string) {
    const normalized = value.trim().toLowerCase()
    return ['yes', 'no', 'true', 'false', 'y', 'n', '1', '0', 'supplied', 'missing', 'included'].includes(normalized)
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

function assessParticipantImport(headers: string[], rows: Record<string, string>[], savedProfile?: Record<string, string>) {
    const { profile, gaps } = inferProfile(headers, rows, savedProfile)
    const normalizedHeaders = headers.map((header) => normalizeHeader(header))

    const participantSignalCount = [
        profile.firstName || profile.lastName || profile.fullName ? 1 : 0,
        profile.phone ? 1 : 0,
        profile.guardianName || profile.parentFirstName || profile.parentLastName ? 1 : 0,
        profile.studentId || profile.submissionId ? 1 : 0,
        profile.specialRequest ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0)

    const performanceKeywords = ['performance', 'act', 'dance', 'item', 'duration', 'runtime', 'music', 'song', 'lead', 'teacher', 'team', 'program']
    const performanceSignalCount = normalizedHeaders.filter((header) => performanceKeywords.some((keyword) => header.includes(keyword))).length

    let probableTarget: 'participants' | 'performance_requests' | 'unknown' = 'participants'
    if (!(profile.firstName || profile.lastName || profile.fullName) && performanceSignalCount >= 2) {
        probableTarget = 'performance_requests'
    } else if (!(profile.firstName || profile.lastName || profile.fullName) && participantSignalCount <= 1) {
        probableTarget = 'unknown'
    }

    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (participantSignalCount >= 4) confidence = 'high'
    else if (participantSignalCount >= 2) confidence = 'medium'

    const blockingIssues: string[] = []
    if (!(profile.firstName || profile.lastName || profile.fullName)) {
        blockingIssues.push('Participant name columns were not recognized, so this file cannot be trusted as a participant import yet.')
    }
    if (probableTarget === 'performance_requests') {
        blockingIssues.push('This file looks more like performance-request data than a participant roster. Switch the intake target instead of importing it here.')
    }

    if (rows.length > 5000) {
        blockingIssues.push(`The file contains ${rows.length} rows, which exceeds the interactive sync limit of 5,000. Please split the file or contact support for a background ingest.`)
    }

    // Phase 1 Internal Duplicate Detection (Warn only in gaps unless excessive)
    const seenAnchors = new Set<string>()
    let internalDuplicateCount = 0
    for (const row of rows.slice(0, 1000)) { // Sample first 1k for performance
        const read = (field: string) => profile[field] ? String(row[profile[field]!] || '').trim() : ''
        const fName = read('firstName') || read('fullName')
        const phone = read('phone')
        const anchor = `${fName}:${phone}`.toLowerCase()
        if (seenAnchors.has(anchor)) {
            internalDuplicateCount++
        }
        seenAnchors.add(anchor)
    }

    if (internalDuplicateCount > 10) {
        gaps.push(`Detected ${internalDuplicateCount}+ duplicate participants within the source file. Verify the source data to avoid overlapping records.`)
    }

    return { profile, gaps, confidence, probableTarget, blockingIssues }
}

function inferPerformanceRequestProfile(headers: string[], rows: Record<string, string>[], savedProfile?: Record<string, string>) {
    const profile: Record<string, string | undefined> = {}
    const assignedHeaders = new Set<string>()

    for (const [field, header] of Object.entries(savedProfile || {})) {
        if (header && headers.includes(header)) {
            profile[field] = header
            assignedHeaders.add(header)
        }
    }

    const headerMatches: Array<[string, string[], RegExp | undefined]> = [
        ['title', REQUEST_HEADER_ALIASES.title, /\b(performance|act|dance|item|title|program)\b/],
        ['leadName', REQUEST_HEADER_ALIASES.leadName, /\b(requester|requestor|submitted|primary|contact|lead|teacher|coach|director|manager)\b.*\bname\b/],
        ['leadFirstName', REQUEST_HEADER_ALIASES.leadFirstName, /\b(requester|requestor|primary|contact|lead|teacher|coach|director|manager)\b.*\bfirst\b.*\bname\b/],
        ['leadLastName', REQUEST_HEADER_ALIASES.leadLastName, /\b(requester|requestor|primary|contact|lead|teacher|coach|director|manager)\b.*\blast\b.*\bname\b/],
        ['leadEmail', REQUEST_HEADER_ALIASES.leadEmail, /\bemail\b/],
        ['leadPhone', REQUEST_HEADER_ALIASES.leadPhone, /\b(phone|mobile|cell)\b/],
        ['durationMinutes', REQUEST_HEADER_ALIASES.durationMinutes, /\b(duration|runtime|length)\b/],
        ['musicSupplied', REQUEST_HEADER_ALIASES.musicSupplied, /\bmusic\b/],
        ['rosterSupplied', REQUEST_HEADER_ALIASES.rosterSupplied, /\b(roster|cast|participant)\b.*\b(supplied|included)\b/],
        ['notes', REQUEST_HEADER_ALIASES.notes, /\b(notes|comments|description|request)\b/],
        ['sourceAnchor', REQUEST_HEADER_ALIASES.sourceAnchor, /\b(submission|request|entry|row|timestamp|order)\b/],
    ]

    for (const [field, aliases, fallbackPattern] of headerMatches) {
        if (profile[field]) continue
        const detected = detectHeader(headers, aliases, fallbackPattern)
        if (detected && !assignedHeaders.has(detected)) {
            profile[field] = detected
            assignedHeaders.add(detected)
        }
    }

    for (const header of headers) {
        if (assignedHeaders.has(header)) continue
        const values = getSampleValues(rows, header)
        if (!profile.durationMinutes && scoreFieldByValues('age', values) >= 0.6) {
            profile.durationMinutes = header
            assignedHeaders.add(header)
            continue
        }
        if (!profile.leadEmail && values.length > 0 && values.filter(isLikelyEmail).length / values.length >= 0.6) {
            profile.leadEmail = header
            assignedHeaders.add(header)
            continue
        }
        if (!profile.leadPhone && values.length > 0 && values.filter(isLikelyPhone).length / values.length >= 0.6) {
            profile.leadPhone = header
            assignedHeaders.add(header)
            continue
        }
        if (!profile.musicSupplied && values.length > 0 && values.filter(isLikelyBooleanFlag).length / values.length >= 0.6) {
            profile.musicSupplied = header
            assignedHeaders.add(header)
        }
    }

    const gaps: string[] = []
    if (!profile.title) gaps.push('Performance title column was not recognized automatically.')
    if (!profile.leadName && !(profile.leadFirstName && profile.leadLastName) && !profile.leadEmail) gaps.push('Lead contact columns were not recognized automatically.')
    return { profile, gaps }
}

function assessPerformanceRequestImport(headers: string[], rows: Record<string, string>[], savedProfile?: Record<string, string>) {
    const { profile, gaps } = inferPerformanceRequestProfile(headers, rows, savedProfile)
    const normalizedHeaders = headers.map((header) => normalizeHeader(header))

    const requestSignalCount = [
        profile.title ? 1 : 0,
        profile.leadName || (profile.leadFirstName && profile.leadLastName) || profile.leadEmail ? 1 : 0,
        profile.durationMinutes ? 1 : 0,
        profile.musicSupplied || profile.rosterSupplied ? 1 : 0,
        profile.sourceAnchor ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0)

    const participantKeywords = ['guardian', 'parent', 'student age', 'first name', 'last name', 'participant first name']
    const participantSignalCount = normalizedHeaders.filter((header) => participantKeywords.some((keyword) => header.includes(keyword))).length

    let probableTarget: 'participants' | 'performance_requests' | 'unknown' = 'performance_requests'
    if (!profile.title && participantSignalCount >= 2) probableTarget = 'participants'
    else if (!profile.title && requestSignalCount <= 1) probableTarget = 'unknown'

    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (requestSignalCount >= 4) confidence = 'high'
    else if (requestSignalCount >= 2) confidence = 'medium'

    const blockingIssues: string[] = []
    if (!profile.title) {
        blockingIssues.push('Performance title column was not recognized, so this file cannot be trusted as a performance-request import yet.')
    }
    if (probableTarget === 'participants') {
        blockingIssues.push('This file looks more like participant roster data than a performance-request intake. Switch the intake target instead of importing it here.')
    }
    if (rows.length > 5000) {
        blockingIssues.push(`The file contains ${rows.length} rows, which exceeds the interactive sync limit of 5,000. Please split the file or contact support for a background ingest.`)
    }

    return { profile, gaps, confidence, probableTarget, blockingIssues }
}

function coerceBooleanFlag(value: string) {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    return ['yes', 'true', 'y', '1', 'supplied', 'included', 'uploaded'].includes(normalized)
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

    let runTrackingClient: ReturnType<typeof createClient> | null = null
    let trackedImportRunId: string | null = null
    let trackedEventId: string | null = null
    let trackedOrganizationId: string | null = null
    let trackedUserId: string | null = null

    try {
        const authHeader = req.headers.get('Authorization')
        console.log('Authorization Header present:', !!authHeader)

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader! } } }
        )
        runTrackingClient = supabaseClient

        // 1. Get User and verify role
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            console.error('getUser Error:', userError)
            throw new Error(`Unauthorized: ${userError?.message || 'No user session found'}`)
        }
        trackedUserId = user.id

        const body = await req.json()
        const {
            sheetId,
            eventId,
            dryRun = true,
            savedMapping,
            intakeTarget = 'participants',
            headers: providedHeaders,
            rows: providedRows,
            importMethod: requestedImportMethod,
            sourceName: providedSourceName,
            sourceId: providedSourceId,
            sourceInstance: providedSourceInstance,
        } = body
        trackedEventId = eventId ?? null
        const importMethod = requestedImportMethod || (sheetId ? 'google_sheet' : 'spreadsheet_upload')
        if (!eventId || (!sheetId && !Array.isArray(providedRows))) {
            console.log('Missing body params:', { eventId: !!eventId, sheetId: !!sheetId, rows: Array.isArray(providedRows) })
            throw new Error('Missing eventId and import source payload')
        }

        // Verify EventAdmin role OR Super Admin
        const { data: role, error: roleError } = await supabaseClient.rpc('auth_event_role', { p_event_id: eventId })
        const { data: isSuperAdmin } = await supabaseClient.rpc('auth_is_super_admin')

        if (roleError || (role !== 'EventAdmin' && !isSuperAdmin)) {
            console.error('Role Verification Failed:', { role, isSuperAdmin, roleError })
            throw new Error(`Unauthorized: Administrative access required (Currently: ${role || 'None'})`)
        }

        let headers: string[] = []
        let parsedRows: Record<string, string>[] = []
        let sourceInstance = providedSourceInstance || sheetId || providedSourceName || 'spreadsheet-upload'

        if (sheetId) {
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

            headers = rows[0]
            const bodyRows = rows.slice(1)
            parsedRows = bodyRows.map((row: string[]) => {
                const rowData: Record<string, string> = {}
                headers.forEach((h: string, i: number) => {
                    rowData[h] = row[i] || ''
                })
                return rowData
            })
        } else {
            const inputRows = Array.isArray(providedRows) ? providedRows : []
            headers = Array.isArray(providedHeaders) && providedHeaders.length > 0
                ? providedHeaders.map((header) => String(header))
                : Object.keys((inputRows[0] as Record<string, unknown>) || {})

            parsedRows = inputRows.map((row) => {
                const rowData: Record<string, string> = {}
                headers.forEach((header) => {
                    rowData[header] = toText((row as Record<string, unknown>)[header])
                })
                return rowData
            })

            if (parsedRows.length === 0 || headers.length === 0) {
                return new Response(JSON.stringify({ success: true, stats: { total: 0, new: 0, updated: 0, missing: 0 }, message: 'No data found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
        }
        const assessment = intakeTarget === 'performance_requests'
            ? assessPerformanceRequestImport(headers, parsedRows, savedMapping)
            : assessParticipantImport(headers, parsedRows, savedMapping)
        const { profile, gaps, confidence, probableTarget, blockingIssues } = assessment

        const { data: eventRecord, error: eventError } = await supabaseClient
            .from('events')
            .select('organization_id')
            .eq('id', eventId)
            .single()

        if (eventError || !eventRecord) {
            throw new Error(`Unable to resolve event context: ${eventError?.message || 'Missing event'}`)
        }
        trackedOrganizationId = eventRecord.organization_id

        const { data: sourceRows } = await (supabaseClient as any)
            .from('event_sources')
            .select('id, name, config')
            .eq('event_id', eventId)

        const matchedSource = ((sourceRows as any[]) || []).find((source) =>
            (sheetId && source.config?.sheetId === sheetId) || (providedSourceId && source.id === providedSourceId)
        )
        let importRunId: string | null = null
        const eventSourceId = matchedSource?.id || providedSourceId || null
        const resolvedSourceName = matchedSource?.name || providedSourceName || (sheetId ? 'Google Sheet Import' : 'Spreadsheet Upload')
        const sourceReference = sheetId || sourceInstance

        if (!dryRun) {
            const { data: importRun, error: importRunError } = await (supabaseClient as any)
                .from('import_runs')
                .insert({
                    organization_id: eventRecord.organization_id,
                    event_id: eventId,
                    event_source_id: eventSourceId,
                    import_target: intakeTarget,
                    import_method: importMethod,
                    source_name: resolvedSourceName,
                    source_instance: sourceReference,
                    status: blockingIssues.length > 0 ? 'blocked' : 'running',
                    probable_target: probableTarget,
                    confidence,
                    blocking_issues: blockingIssues,
                    source_snapshot: {
                        headers,
                        mapping: profile,
                        gaps,
                        sheetId: sheetId || null,
                        sourceName: resolvedSourceName,
                        sourceInstance: sourceReference,
                    },
                    initiated_by: user.id,
                })
                .select('id')
                .single()

            if (importRunError) throw importRunError
            importRunId = importRun.id
            trackedImportRunId = importRun.id
        }

        if (blockingIssues.length > 0) {
            if (importRunId) {
                await (supabaseClient as any)
                    .from('import_runs')
                    .update({
                        status: 'blocked',
                        error_message: blockingIssues[0],
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', importRunId)

                await (supabaseClient as any)
                    .from('intake_audit_events')
                    .insert({
                        organization_id: eventRecord.organization_id,
                        event_id: eventId,
                        import_run_id: importRunId,
                        entity_type: 'import_run',
                        entity_id: importRunId,
                        action: 'blocked',
                        note: blockingIssues[0],
                        metadata: { probableTarget, confidence, sourceReference },
                        performed_by: user.id,
                    })
            }
            throw new Error(blockingIssues[0])
        }

        if (intakeTarget === 'performance_requests') {
            const requests = parsedRows.map((rowData) => {
                const read = (header?: string) => (header ? String(rowData[header] || '').trim() : '')
                const title = read(profile.title)
                const combinedLeadName = [read(profile.leadFirstName), read(profile.leadLastName)].filter(Boolean).join(' ').trim()
                const leadName = read(profile.leadName) || combinedLeadName
                const leadEmail = read(profile.leadEmail)
                const leadPhone = read(profile.leadPhone)
                const durationRaw = read(profile.durationMinutes)
                const durationEstimate = Number(durationRaw)
                const sourceAnchor = read(profile.sourceAnchor)
                const fallbackAnchor = [
                    title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    leadEmail.toLowerCase(),
                    leadPhone.replace(/\D/g, '').slice(-4),
                ].filter(Boolean).join(':')

                return {
                    organization_id: eventRecord.organization_id,
                    event_id: eventId,
                    import_run_id: importRunId,
                    event_source_id: eventSourceId,
                    source_anchor: sourceAnchor || fallbackAnchor || null,
                    title: title || 'Untitled Request',
                    lead_name: leadName || null,
                    lead_email: leadEmail || null,
                    lead_phone: leadPhone || null,
                    duration_estimate_minutes: Number.isFinite(durationEstimate) && durationEstimate > 0 ? durationEstimate : 5,
                    music_supplied: coerceBooleanFlag(read(profile.musicSupplied)),
                    roster_supplied: coerceBooleanFlag(read(profile.rosterSupplied)),
                    notes: read(profile.notes) || null,
                    raw_payload: Object.fromEntries(
                        Object.entries(rowData).map(([k, v]) => [
                            k,
                            typeof v === 'string' && v.length > 512 ? v.substring(0, 512) + '... [truncated]' : v
                        ])
                    )
                }
            }).filter((request) => request.title !== 'Untitled Request' || request.lead_name || request.source_anchor)

            // Deduplicate requests by source_anchor to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
            const deduplicatedRequestsMap = new Map()
            for (const request of requests) {
                if (request.source_anchor) {
                    deduplicatedRequestsMap.set(request.source_anchor, request)
                }
            }
            const deduplicatedRequests = Array.from(deduplicatedRequestsMap.values())

            const anchors = deduplicatedRequests.map((request) => request.source_anchor).filter(Boolean)
            const { data: existingRecords, error: fetchError } = await (supabaseClient as any)
                .from('performance_requests')
                .select('id, source_anchor, request_status, conversion_status, converted_act_id')
                .eq('event_id', eventId)
                .eq('event_source_id', eventSourceId)
                .in('source_anchor', anchors)

            if (fetchError) throw fetchError

            const existingByAnchor = new Map((existingRecords || []).map((row: any) => [row.source_anchor, row]))
            const newAnchors = anchors.filter((anchor) => !existingByAnchor.has(anchor))

            if (dryRun) {
                return new Response(JSON.stringify({
                    success: true,
                    stats: {
                        total: deduplicatedRequests.length,
                        new: newAnchors.length,
                        updated: deduplicatedRequests.length - newAnchors.length,
                        missing: 0
                    },
                    mapping: profile,
                    gaps,
                    probableTarget,
                    confidence,
                    headers,
                    preview: deduplicatedRequests.slice(0, 5),
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const { error: upsertError } = await (supabaseClient as any)
                .from('performance_requests')
                .upsert(deduplicatedRequests, {
                    onConflict: 'event_id,event_source_id,source_anchor'
                })

            if (upsertError) throw upsertError

            const { data: currentRows, error: currentRowsError } = await (supabaseClient as any)
                .from('performance_requests')
                .select('id, source_anchor, request_status, conversion_status, converted_act_id')
                .eq('event_id', eventId)
                .eq('event_source_id', eventSourceId)
                .in('source_anchor', anchors)

            if (currentRowsError) throw currentRowsError

            const currentByAnchor = new Map((currentRows || []).map((row: any) => [row.source_anchor, row]))

            if (importRunId) {
                const importRunRecords = deduplicatedRequests.map((request) => {
                    const previous = existingByAnchor.get(request.source_anchor)
                    const current = currentByAnchor.get(request.source_anchor)
                    return {
                        import_run_id: importRunId,
                        entity_type: 'performance_request',
                        entity_id: current?.id || null,
                        entity_key: request.source_anchor,
                        action: previous ? 'updated' : 'created',
                        before_data: previous || null,
                        after_data: current || null,
                    }
                })

                const { error: runRecordError } = await (supabaseClient as any)
                    .from('import_run_records')
                    .insert(importRunRecords)

                if (runRecordError) throw runRecordError

                const stats = {
                    total: deduplicatedRequests.length,
                    new: newAnchors.length,
                    updated: deduplicatedRequests.length - newAnchors.length,
                    missing: 0
                }

                const { error: finalizeError } = await (supabaseClient as any)
                    .from('import_runs')
                    .update({
                        status: 'succeeded',
                        stats,
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', importRunId)

                if (finalizeError) throw finalizeError

                const { error: auditError } = await (supabaseClient as any)
                    .from('intake_audit_events')
                    .insert({
                        organization_id: eventRecord.organization_id,
                        event_id: eventId,
                        import_run_id: importRunId,
                        entity_type: 'import_run',
                        entity_id: importRunId,
                        action: 'completed',
                        note: sheetId ? 'Google Sheet performance request refresh completed.' : 'Spreadsheet performance request import completed.',
                        metadata: { stats, probableTarget, confidence, sourceReference },
                        performed_by: user.id,
                    })

                if (auditError) throw auditError
            }

            return new Response(JSON.stringify({
                success: true,
                stats: {
                    total: deduplicatedRequests.length,
                    new: newAnchors.length,
                    updated: deduplicatedRequests.length - newAnchors.length,
                    missing: 0
                },
                mapping: profile,
                gaps,
                probableTarget,
                confidence,
                headers,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

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
                source_system: sheetId ? 'google-sheets' : 'spreadsheet-upload',
                source_instance: sourceReference,
                source_anchor_type: anchorType,
                source_anchor_value: anchorValue,
                source_imported_at: new Date().toISOString(),
                special_request_raw: specialRequestRaw || null,
                special_request_source_column: profile.specialRequest || null,
                has_special_requests: hasSpecialRequests,
                src_raw: Object.fromEntries(
                    Object.entries(rowData).map(([k, v]) => [
                        k, 
                        typeof v === 'string' && v.length > 512 ? v.substring(0, 512) + '... [truncated]' : v
                    ])
                )
            }
        }).filter(p => p.first_name !== 'Unknown' || p.last_name !== 'Participant')

        // Deduplicate participants to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const deduplicatedParticipantsMap = new Map()
        for (const p of participants) {
            deduplicatedParticipantsMap.set(p.source_anchor_value, p)
        }
        const deduplicatedParticipants = Array.from(deduplicatedParticipantsMap.values())

        const incomingAnchors = new Set(deduplicatedParticipants.map(p => p.source_anchor_value))

        const { data: existingRecords, error: fetchError } = await supabaseClient
            .from('participants')
            .select('source_anchor_value, status, id')
            .eq('event_id', eventId)
            .eq('source_instance', sourceReference)
            .eq('source_system', sheetId ? 'google-sheets' : 'spreadsheet-upload')

        if (fetchError) throw fetchError

        const existingAnchors = new Set(existingRecords?.map(r => r.source_anchor_value) || [])
        const missingAnchors = [...existingAnchors].filter(a => !incomingAnchors.has(a))
        const newAnchors = [...incomingAnchors].filter(a => !existingAnchors.has(a))
        const updatedAnchors = [...incomingAnchors].filter(a => existingAnchors.has(a))

        if (dryRun) {
            return new Response(JSON.stringify({
                success: true,
                stats: {
                    total: deduplicatedParticipants.length,
                    new: newAnchors.length,
                    updated: updatedAnchors.length,
                    missing: missingAnchors.length
                },
                mapping: profile,
                gaps,
                probableTarget,
                confidence,
                headers,
                preview: deduplicatedParticipants.slice(0, 5),
                missingPreview: missingAnchors.slice(0, 5)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const now = new Date().toISOString()
        const participantsToUpsert = deduplicatedParticipants.map(p => {
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

        const { data: currentRows, error: currentRowsError } = await supabaseClient
            .from('participants')
            .select('id, source_anchor_value, status')
            .eq('event_id', eventId)
            .eq('source_instance', sourceReference)
            .eq('source_system', sheetId ? 'google-sheets' : 'spreadsheet-upload')
            .in('source_anchor_value', [...incomingAnchors])

        if (currentRowsError) throw currentRowsError

        const currentByAnchor = new Map((currentRows || []).map((row) => [row.source_anchor_value, row]))

        if (importRunId) {
            const importedParticipantIds = (currentRows || []).map((row) => row.id)
            if (importedParticipantIds.length > 0) {
                const { error: lineageError } = await (supabaseClient as any)
                    .from('participants')
                    .update({ last_import_run_id: importRunId })
                    .in('id', importedParticipantIds)

                if (lineageError) throw lineageError
            }

            const newParticipantIds = newAnchors
                .map((anchor) => currentByAnchor.get(anchor)?.id)
                .filter(Boolean)

            if (newParticipantIds.length > 0) {
                const { error: createLineageError } = await (supabaseClient as any)
                    .from('participants')
                    .update({ created_by_import_run_id: importRunId })
                    .in('id', newParticipantIds)

                if (createLineageError) throw createLineageError
            }
        }

        if (missingAnchors.length > 0) {
            await supabaseClient
                .from('participants')
                .update({
                    status: 'missing_from_source',
                    ...(importRunId ? { last_import_run_id: importRunId } : {})
                })
                .eq('event_id', eventId)
                .eq('source_instance', sourceReference)
                .in('source_anchor_value', missingAnchors)
                .neq('status', 'missing_from_source')
        }

        if (importRunId) {
            const importRunRecords = deduplicatedParticipants.map((participant) => {
                const previous = existingRecords?.find((row) => row.source_anchor_value === participant.source_anchor_value)
                const current = currentByAnchor.get(participant.source_anchor_value)
                return {
                    import_run_id: importRunId,
                    entity_type: 'participant',
                    entity_id: current?.id || null,
                    entity_key: participant.source_anchor_value,
                    action: previous ? 'updated' : 'created',
                    before_data: previous ? { id: previous.id, status: previous.status } : null,
                    after_data: current ? { id: current.id, status: current.status } : null,
                }
            })

            const missingRunRecords = missingAnchors.map((anchor) => {
                const previous = existingRecords?.find((row) => row.source_anchor_value === anchor)
                return {
                    import_run_id: importRunId,
                    entity_type: 'participant',
                    entity_id: previous?.id || null,
                    entity_key: anchor,
                    action: 'missing_from_source',
                    before_data: previous ? { id: previous.id, status: previous.status } : null,
                    after_data: { status: 'missing_from_source' },
                }
            })

            const { error: runRecordError } = await (supabaseClient as any)
                .from('import_run_records')
                .insert([...importRunRecords, ...missingRunRecords])

            if (runRecordError) throw runRecordError

            const stats = {
                total: deduplicatedParticipants.length,
                new: newAnchors.length,
                updated: updatedAnchors.length,
                missing: missingAnchors.length
            }

            const { error: finalizeError } = await (supabaseClient as any)
                .from('import_runs')
                .update({
                    status: 'succeeded',
                    stats,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', importRunId)

            if (finalizeError) throw finalizeError

            const { error: auditError } = await (supabaseClient as any)
                .from('intake_audit_events')
                .insert({
                    organization_id: eventRecord.organization_id,
                    event_id: eventId,
                    import_run_id: importRunId,
                    entity_type: 'import_run',
                    entity_id: importRunId,
                    action: 'completed',
                    note: sheetId ? 'Google Sheet participant refresh completed.' : 'Spreadsheet participant import completed.',
                    metadata: { stats, probableTarget, confidence, sourceReference },
                    performed_by: user.id,
                })

            if (auditError) throw auditError
        }

        return new Response(JSON.stringify({
            success: true,
            stats: {
                total: deduplicatedParticipants.length,
                new: newAnchors.length,
                updated: updatedAnchors.length,
                missing: missingAnchors.length
            },
            mapping: profile,
            gaps,
            probableTarget,
            confidence,
            headers,
            message: 'Sync completed successfully'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Edge Function error:', error)
        if (trackedImportRunId && runTrackingClient) {
            await (runTrackingClient as any)
                .from('import_runs')
                .update({
                    status: 'failed',
                    error_message: error.message || 'Google Sheet import failed',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', trackedImportRunId)

            if (trackedEventId && trackedOrganizationId) {
                await (runTrackingClient as any)
                    .from('intake_audit_events')
                    .insert({
                        organization_id: trackedOrganizationId,
                        event_id: trackedEventId,
                        import_run_id: trackedImportRunId,
                        entity_type: 'import_run',
                        entity_id: trackedImportRunId,
                        action: 'failed',
                        note: error.message || 'Google Sheet import failed',
                        metadata: { source: 'import-participants edge function' },
                        performed_by: trackedUserId,
                    })
            }
        }
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
