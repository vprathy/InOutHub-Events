type RawRow = Record<string, unknown>;

export type ParticipantImportField =
    | 'firstName'
    | 'lastName'
    | 'fullName'
    | 'parentFirstName'
    | 'parentLastName'
    | 'guardianName'
    | 'phone'
    | 'email'
    | 'age'
    | 'notes'
    | 'studentId'
    | 'submissionId'
    | 'products'
    | 'specialRequest';

export type ParticipantImportProfile = Partial<Record<ParticipantImportField, string>>;
export type ParticipantImportAssessment = {
    profile: ParticipantImportProfile;
    gaps: string[];
    confidence: 'high' | 'medium' | 'low';
    probableTarget: 'participants' | 'performance_requests' | 'unknown';
    blockingIssues: string[];
};

export type PerformanceRequestImportField =
    | 'title'
    | 'leadName'
    | 'leadEmail'
    | 'leadPhone'
    | 'durationMinutes'
    | 'musicSupplied'
    | 'rosterSupplied'
    | 'notes'
    | 'sourceAnchor';

export type PerformanceRequestImportProfile = Partial<Record<PerformanceRequestImportField, string>>;
export type PerformanceRequestImportAssessment = {
    profile: PerformanceRequestImportProfile;
    gaps: string[];
    confidence: 'high' | 'medium' | 'low';
    probableTarget: 'performance_requests' | 'participants' | 'unknown';
    blockingIssues: string[];
};

const HEADER_ALIASES: Record<ParticipantImportField, string[]> = {
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
};

const VALUE_HINTS: Partial<Record<ParticipantImportField, string[]>> = {
    specialRequest: ['add', 'include', 'need', 'needs', 'request', 'allergy', 'medical', 'dietary', 'accommodation', 'group', 'please'],
    products: ['group', 'class', 'product', 'package', 'level'],
    notes: ['note', 'notes', 'comment', 'comments', 'request'],
};

const VALUE_INFERENCE_FIELDS: ParticipantImportField[] = [
    'phone',
    'email',
    'age',
    'specialRequest',
    'fullName',
    'guardianName',
    'studentId',
    'submissionId',
    'products',
    'notes',
];

const REQUEST_HEADER_ALIASES: Record<PerformanceRequestImportField, string[]> = {
    title: ['program name', 'program title', 'performance title', 'performance name', 'act title', 'act name', 'dance title', 'item title', 'title', 'performance', 'act', 'item'],
    leadName: ['requester name', 'requestor name', 'submitted by', 'primary contact name', 'primary contact', 'contact name', 'lead name', 'lead contact', 'teacher name', 'coach name', 'director name', 'manager name', 'team manager', 'name'],
    leadEmail: ['requester email', 'requestor email', 'primary contact email', 'contact email', 'lead email', 'manager email', 'teacher email', 'email address', 'email'],
    leadPhone: ['requester phone', 'requestor phone', 'primary contact phone', 'contact phone', 'lead phone', 'manager phone', 'teacher phone', 'phone number', 'phone', 'mobile'],
    durationMinutes: ['duration estimate minutes', 'duration minutes', 'duration', 'runtime', 'length'],
    musicSupplied: ['music supplied', 'music submitted', 'music included', 'music?'],
    rosterSupplied: ['roster supplied', 'cast supplied', 'roster included', 'participants supplied'],
    notes: ['notes', 'comments', 'special notes', 'special requests', 'description'],
    sourceAnchor: ['submission id', 'request id', 'entry id', 'row id', 'timestamp', 'order id'],
};

function normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toText(value: unknown) {
    return value == null ? '' : String(value).trim();
}

function splitFullName(fullName: string) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1],
    };
}

function detectHeader(headers: string[], aliases: string[], fallbackPattern?: RegExp) {
    const normalized = new Map(headers.map((header) => [header, normalizeHeader(header)]));

    for (const alias of aliases) {
        const match = headers.find((header) => normalized.get(header) === alias);
        if (match) return match;
    }

    if (fallbackPattern) {
        return headers.find((header) => fallbackPattern.test(normalizeHeader(header)));
    }

    return undefined;
}

function isLikelyPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}

function isLikelyEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLikelyAge(value: string) {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 1 && numeric <= 99;
}

function isLikelyFullName(value: string) {
    return /^[A-Za-z'.-]+(?:\s+[A-Za-z'.-]+){1,3}$/.test(value);
}

function isLikelyIdentifier(value: string) {
    return /^[A-Za-z0-9:_-]{4,}$/.test(value) && /\d/.test(value);
}

function isLikelySubmissionId(value: string) {
    return isLikelyIdentifier(value) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value) || /\d{4}-\d{2}-\d{2}/.test(value);
}

function isLikelyLongText(value: string) {
    return value.length >= 12 && /\s/.test(value);
}

function isLikelyBooleanFlag(value: string) {
    const normalized = value.trim().toLowerCase();
    return ['yes', 'no', 'true', 'false', 'y', 'n', '1', '0', 'supplied', 'missing', 'included'].includes(normalized);
}

function getSampleValues(rows: RawRow[], header: string) {
    return rows
        .map((row) => toText(row[header]))
        .filter(Boolean)
        .slice(0, 20);
}

function scoreFieldByValues(field: ParticipantImportField, values: string[]) {
    if (values.length === 0) return 0;

    const ratio = (predicate: (value: string) => boolean) => values.filter(predicate).length / values.length;
    const avgLength = values.reduce((total, value) => total + value.length, 0) / values.length;
    const hintRatio = (VALUE_HINTS[field] || []).length
        ? values.filter((value) => (VALUE_HINTS[field] || []).some((hint) => value.toLowerCase().includes(hint))).length / values.length
        : 0;

    switch (field) {
        case 'phone':
            return ratio(isLikelyPhone);
        case 'email':
            return ratio(isLikelyEmail);
        case 'age':
            return ratio(isLikelyAge);
        case 'fullName':
        case 'guardianName':
            return ratio(isLikelyFullName);
        case 'studentId':
            return ratio(isLikelyIdentifier);
        case 'submissionId':
            return ratio(isLikelySubmissionId);
        case 'specialRequest':
            return ratio(isLikelyLongText) * 0.6 + hintRatio * 0.4;
        case 'products':
            return hintRatio * 0.45 + (avgLength >= 4 && avgLength <= 40 ? 0.25 : 0) + (values.length >= 2 ? 0.15 : 0);
        case 'notes':
            return ratio(isLikelyLongText) * 0.7 + hintRatio * 0.3;
        default:
            return 0;
    }
}

function inferHeaderByValues(args: {
    headers: string[];
    rows: RawRow[];
    assignedHeaders: Set<string>;
    field: ParticipantImportField;
}) {
    const { headers, rows, assignedHeaders, field } = args;

    let bestHeader: string | undefined;
    let bestScore = 0;

    for (const header of headers) {
        if (assignedHeaders.has(header)) continue;
        const values = getSampleValues(rows, header);
        const score = scoreFieldByValues(field, values);
        if (score > bestScore) {
            bestHeader = header;
            bestScore = score;
        }
    }

    const threshold = field === 'specialRequest' || field === 'notes' || field === 'products' ? 0.45 : 0.6;
    return bestScore >= threshold ? bestHeader : undefined;
}

export function inferParticipantImportProfile(
    headers: string[],
    rows: RawRow[] = [],
    savedProfile?: ParticipantImportProfile
) {
    const profile: ParticipantImportProfile = {};
    const assignedHeaders = new Set<string>();

    const savedFields = Object.entries(savedProfile || {}) as Array<[ParticipantImportField, string]>;
    for (const [field, header] of savedFields) {
        if (header && headers.includes(header)) {
            profile[field] = header;
            assignedHeaders.add(header);
        }
    }

    const headerCandidates: Array<[ParticipantImportField, string[] | undefined, RegExp | undefined]> = [
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
    ];

    for (const [field, aliases, fallbackPattern] of headerCandidates) {
        if (profile[field]) continue;
        const detected = detectHeader(headers, aliases || [], fallbackPattern);
        if (detected && !assignedHeaders.has(detected)) {
            profile[field] = detected;
            assignedHeaders.add(detected);
        }
    }

    for (const field of VALUE_INFERENCE_FIELDS) {
        if (profile[field]) continue;
        const inferred = inferHeaderByValues({ headers, rows, assignedHeaders, field });
        if (inferred) {
            profile[field] = inferred;
            assignedHeaders.add(inferred);
        }
    }

    const gaps: string[] = [];
    if (!profile.firstName && !profile.lastName && !profile.fullName) {
        gaps.push('Participant name columns were not recognized automatically.');
    }
    if (!profile.phone) {
        gaps.push('Guardian or contact phone column was not recognized.');
    }
    if (!profile.specialRequest) {
        gaps.push('Special request column was not recognized.');
    }

    return { profile, gaps };
}

export function assessParticipantImport(
    headers: string[],
    rows: RawRow[] = [],
    savedProfile?: ParticipantImportProfile
): ParticipantImportAssessment {
    const { profile, gaps } = inferParticipantImportProfile(headers, rows, savedProfile);
    const normalizedHeaders = headers.map((header) => normalizeHeader(header));

    const participantSignalCount = [
        profile.firstName || profile.lastName || profile.fullName ? 1 : 0,
        profile.phone ? 1 : 0,
        profile.guardianName || profile.parentFirstName || profile.parentLastName ? 1 : 0,
        profile.studentId || profile.submissionId ? 1 : 0,
        profile.specialRequest ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);

    const performanceKeywords = ['performance', 'act', 'dance', 'item', 'duration', 'runtime', 'music', 'song', 'lead', 'teacher', 'team', 'program'];
    const performanceSignalCount = normalizedHeaders.filter((header) => performanceKeywords.some((keyword) => header.includes(keyword))).length;

    let probableTarget: ParticipantImportAssessment['probableTarget'] = 'participants';
    if (!(profile.firstName || profile.lastName || profile.fullName) && performanceSignalCount >= 2) {
        probableTarget = 'performance_requests';
    } else if (!(profile.firstName || profile.lastName || profile.fullName) && participantSignalCount <= 1) {
        probableTarget = 'unknown';
    }

    let confidence: ParticipantImportAssessment['confidence'] = 'low';
    if (participantSignalCount >= 4) confidence = 'high';
    else if (participantSignalCount >= 2) confidence = 'medium';

    const blockingIssues: string[] = [];
    if (!(profile.firstName || profile.lastName || profile.fullName)) {
        blockingIssues.push('Participant name columns were not recognized, so this file cannot be trusted as a participant import yet.');
    }
    if (probableTarget === 'performance_requests') {
        blockingIssues.push('This file looks more like performance-request data than a participant roster. Switch the intake target instead of importing it here.');
    }

    if (rows.length > 2000) {
        blockingIssues.push(`The file contains ${rows.length} rows, which exceeds the browser upload limit of 2,000. Please split the file or use the Google Sheet sync for larger datasets.`);
    }

    // Phase 1 Internal Duplicate Detection (Warn only in gaps unless excessive)
    const seenAnchors = new Set<string>();
    let internalDuplicateCount = 0;
    for (const row of rows.slice(0, 1000)) { // Sample first 1k for performance
        const read = (field: ParticipantImportField) => profile[field] ? String(row[profile[field]!] || '').trim() : '';
        const fName = read('firstName') || read('fullName');
        const phone = read('phone');
        const anchor = `${fName}:${phone}`.toLowerCase();
        if (anchor !== ':' && seenAnchors.has(anchor)) {
            internalDuplicateCount++;
        }
        seenAnchors.add(anchor);
    }

    if (internalDuplicateCount > 10) {
        gaps.push(`Detected ${internalDuplicateCount}+ duplicate participants within the source file. Verify the source data to avoid overlapping records.`);
    }

    return {
        profile,
        gaps,
        confidence,
        probableTarget,
        blockingIssues,
    };
}

export function inferPerformanceRequestImportProfile(
    headers: string[],
    rows: RawRow[] = [],
    savedProfile?: PerformanceRequestImportProfile
) {
    const profile: PerformanceRequestImportProfile = {};
    const assignedHeaders = new Set<string>();

    const savedFields = Object.entries(savedProfile || {}) as Array<[PerformanceRequestImportField, string]>;
    for (const [field, header] of savedFields) {
        if (header && headers.includes(header)) {
            profile[field] = header;
            assignedHeaders.add(header);
        }
    }

    const headerCandidates: Array<[PerformanceRequestImportField, string[] | undefined, RegExp | undefined]> = [
        ['title', REQUEST_HEADER_ALIASES.title, /\b(performance|act|dance|item|title|program)\b/],
        ['leadName', REQUEST_HEADER_ALIASES.leadName, /\b(requester|requestor|submitted|primary|contact|lead|teacher|coach|director|manager)\b.*\bname\b/],
        ['leadEmail', REQUEST_HEADER_ALIASES.leadEmail, /\b(email)\b/],
        ['leadPhone', REQUEST_HEADER_ALIASES.leadPhone, /\b(phone|mobile|cell)\b/],
        ['durationMinutes', REQUEST_HEADER_ALIASES.durationMinutes, /\b(duration|runtime|length)\b/],
        ['musicSupplied', REQUEST_HEADER_ALIASES.musicSupplied, /\bmusic\b/],
        ['rosterSupplied', REQUEST_HEADER_ALIASES.rosterSupplied, /\b(roster|cast|participant)\b.*\b(supplied|included)\b/],
        ['notes', REQUEST_HEADER_ALIASES.notes, /\b(notes|comments|description|request)\b/],
        ['sourceAnchor', REQUEST_HEADER_ALIASES.sourceAnchor, /\b(submission|request|entry|row|timestamp|order)\b.*\b(id)?\b/],
    ];

    for (const [field, aliases, fallbackPattern] of headerCandidates) {
        if (profile[field]) continue;
        const detected = detectHeader(headers, aliases || [], fallbackPattern);
        if (detected && !assignedHeaders.has(detected)) {
            profile[field] = detected;
            assignedHeaders.add(detected);
        }
    }

    for (const header of headers) {
        if (assignedHeaders.has(header)) continue;
        const values = getSampleValues(rows, header);
        if (!profile.durationMinutes && scoreFieldByValues('age', values) >= 0.6) {
            profile.durationMinutes = header;
            assignedHeaders.add(header);
            continue;
        }
        if (!profile.leadEmail && values.length > 0 && values.filter(isLikelyEmail).length / values.length >= 0.6) {
            profile.leadEmail = header;
            assignedHeaders.add(header);
            continue;
        }
        if (!profile.leadPhone && values.length > 0 && values.filter(isLikelyPhone).length / values.length >= 0.6) {
            profile.leadPhone = header;
            assignedHeaders.add(header);
            continue;
        }
        if (!profile.musicSupplied && values.length > 0 && values.filter(isLikelyBooleanFlag).length / values.length >= 0.6) {
            profile.musicSupplied = header;
            assignedHeaders.add(header);
            continue;
        }
    }

    const gaps: string[] = [];
    if (!profile.title) {
        gaps.push('Performance title column was not recognized automatically.');
    }
    if (!profile.leadName && !profile.leadEmail) {
        gaps.push('Lead contact columns were not recognized automatically.');
    }

    return { profile, gaps };
}

export function assessPerformanceRequestImport(
    headers: string[],
    rows: RawRow[] = [],
    savedProfile?: PerformanceRequestImportProfile
): PerformanceRequestImportAssessment {
    const { profile, gaps } = inferPerformanceRequestImportProfile(headers, rows, savedProfile);
    const normalizedHeaders = headers.map((header) => normalizeHeader(header));

    const requestSignalCount = [
        profile.title ? 1 : 0,
        profile.leadName || profile.leadEmail ? 1 : 0,
        profile.durationMinutes ? 1 : 0,
        profile.musicSupplied || profile.rosterSupplied ? 1 : 0,
        profile.sourceAnchor ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);

    const participantKeywords = ['guardian', 'parent', 'student age', 'first name', 'last name', 'participant first name'];
    const participantSignalCount = normalizedHeaders.filter((header) => participantKeywords.some((keyword) => header.includes(keyword))).length;

    let probableTarget: PerformanceRequestImportAssessment['probableTarget'] = 'performance_requests';
    if (!profile.title && participantSignalCount >= 2) {
        probableTarget = 'participants';
    } else if (!profile.title && requestSignalCount <= 1) {
        probableTarget = 'unknown';
    }

    let confidence: PerformanceRequestImportAssessment['confidence'] = 'low';
    if (requestSignalCount >= 4) confidence = 'high';
    else if (requestSignalCount >= 2) confidence = 'medium';

    const blockingIssues: string[] = [];
    if (!profile.title) {
        blockingIssues.push('Performance title column was not recognized, so this file cannot be trusted as a performance-request import yet.');
    }
    if (probableTarget === 'participants') {
        blockingIssues.push('This file looks more like participant roster data than a performance-request intake. Switch the intake target instead of importing it here.');
    }
    if (rows.length > 2000) {
        blockingIssues.push(`The file contains ${rows.length} rows, which exceeds the browser upload limit of 2,000. Please split the file or use the Google Sheet sync for larger datasets.`);
    }

    return {
        profile,
        gaps,
        confidence,
        probableTarget,
        blockingIssues,
    };
}

export function mapImportedParticipantRow(args: {
    eventId: string;
    sourceSystem: 'spreadsheet-upload' | 'google-sheets';
    sourceInstance: string;
    row: RawRow;
    profile: ParticipantImportProfile;
}) {
    const { eventId, sourceSystem, sourceInstance, row, profile } = args;

    const read = (header?: string) => (header ? toText(row[header]) : '');

    let firstName = read(profile.firstName);
    let lastName = read(profile.lastName);
    const fullName = read(profile.fullName);
    if ((!firstName || !lastName) && fullName) {
        const parsed = splitFullName(fullName);
        firstName ||= parsed.firstName;
        lastName ||= parsed.lastName;
    }

    const parentFirstName = read(profile.parentFirstName);
    const parentLastName = read(profile.parentLastName);
    const guardianName =
        parentFirstName || parentLastName
            ? `${parentFirstName} ${parentLastName}`.trim()
            : read(profile.guardianName);
    const phone = read(profile.phone);
    const email = read(profile.email);
    const studentId = read(profile.studentId);
    const submissionId = read(profile.submissionId);
    const specialRequestRaw = read(profile.specialRequest);
    const hasSpecialRequests = Boolean(specialRequestRaw);
    const age = read(profile.age);
    const products = read(profile.products);
    const notes = read(profile.notes);

    let anchorType = 'natural';
    let anchorValue = '';

    if (submissionId) {
        anchorType = 'submission';
        const normName = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z]/g, '');
        anchorValue = `${submissionId}:${normName}`;
    } else if (studentId) {
        anchorType = 'student';
        anchorValue = studentId;
    } else {
        const normName = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z]/g, '');
        const last4 = phone.replace(/\D/g, '').slice(-4);
        anchorValue = `${normName}:${last4}`;
    }

    const notesParts: string[] = [];
    if (studentId) notesParts.push(`[ID: ${studentId}]`);
    if (age) notesParts.push(`[Age: ${age}]`);
    if (email) notesParts.push(`[Email: ${email}]`);
    if (specialRequestRaw) notesParts.push(specialRequestRaw);
    if (products) notesParts.push(`[Products: ${products}]`);
    if (notes) notesParts.push(notes);

    return {
        event_id: eventId,
        first_name: firstName || 'Unknown',
        last_name: lastName || 'Participant',
        guardian_name: guardianName || null,
        guardian_phone: phone || null,
        notes: notesParts.join(' ').trim() || null,
        source_system: sourceSystem,
        source_instance: sourceInstance,
        source_anchor_type: anchorType,
        source_anchor_value: anchorValue,
        special_request_raw: specialRequestRaw || null,
        special_request_source_column: profile.specialRequest || null,
        has_special_requests: hasSpecialRequests,
        src_raw: Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
                k,
                typeof v === 'string' && v.length > 512 ? v.substring(0, 512) + '... [truncated]' : v
            ])
        ) as any,
    };
}

function coerceBooleanFlag(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ['yes', 'true', 'y', '1', 'supplied', 'included', 'uploaded'].includes(normalized);
}

export function mapImportedPerformanceRequestRow(args: {
    eventId: string;
    organizationId: string;
    sourceSystem: 'spreadsheet-upload' | 'google-sheets';
    eventSourceId?: string | null;
    importRunId?: string | null;
    row: RawRow;
    profile: PerformanceRequestImportProfile;
}) {
    const { eventId, organizationId, row, profile, eventSourceId = null, importRunId = null } = args;

    const read = (header?: string) => (header ? toText(row[header]) : '');
    const title = read(profile.title);
    const leadName = read(profile.leadName);
    const leadEmail = read(profile.leadEmail);
    const leadPhone = read(profile.leadPhone);
    const durationRaw = read(profile.durationMinutes);
    const parsedDuration = Number(durationRaw);
    const sourceAnchor = read(profile.sourceAnchor);
    const notes = read(profile.notes);

    const fallbackAnchor = [
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        leadEmail.toLowerCase(),
        leadPhone.replace(/\D/g, '').slice(-4),
    ]
        .filter(Boolean)
        .join(':');

    return {
        organization_id: organizationId,
        event_id: eventId,
        import_run_id: importRunId,
        event_source_id: eventSourceId,
        source_anchor: sourceAnchor || fallbackAnchor || null,
        title: title || 'Untitled Request',
        lead_name: leadName || null,
        lead_email: leadEmail || null,
        lead_phone: leadPhone || null,
        duration_estimate_minutes: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 5,
        music_supplied: coerceBooleanFlag(read(profile.musicSupplied)),
        roster_supplied: coerceBooleanFlag(read(profile.rosterSupplied)),
        notes: notes || null,
        raw_payload: Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
                k,
                typeof v === 'string' && v.length > 512 ? `${v.substring(0, 512)}... [truncated]` : v,
            ])
        ) as any,
    };
}
