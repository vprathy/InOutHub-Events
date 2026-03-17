import * as XLSX from 'xlsx';

export interface ParsedRosterRow {
    sourceRowNumber: number;
    rawRow: Record<string, string>;
    mappedFirstName: string | null;
    mappedLastName: string | null;
    mappedGuardianName: string | null;
    mappedGuardianPhone: string | null;
    mappedNotes: string | null;
    reviewStatus: 'ready' | 'warning' | 'blocked';
    issueCodes: string[];
    sourceAnchorValue: string;
}

export interface ParsedRosterBatch {
    fileType: string;
    rows: ParsedRosterRow[];
    summary: {
        ready: number;
        warning: number;
        blocked: number;
    };
}

function parseDelimitedText(input: string, delimiter: string) {
    const rows: string[][] = [];
    let currentCell = '';
    let currentRow: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        const nextChar = input[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (!inQuotes && char === delimiter) {
            currentRow.push(currentCell);
            currentCell = '';
            continue;
        }

        if (!inQuotes && (char === '\n' || char === '\r')) {
            if (char === '\r' && nextChar === '\n') {
                i += 1;
            }
            currentRow.push(currentCell);
            if (currentRow.some((cell) => cell.trim().length > 0)) {
                rows.push(currentRow);
            }
            currentCell = '';
            currentRow = [];
            continue;
        }

        currentCell += char;
    }

    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
    }

    return rows;
}

function normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getCell(rawRow: Record<string, string>, matcher: (header: string) => boolean) {
    const key = Object.keys(rawRow).find((header) => matcher(normalizeHeader(header)));
    return key ? rawRow[key]?.trim() || '' : '';
}

function splitFullName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1],
    };
}

function buildSourceAnchorValue(fileName: string, sourceRowNumber: number, firstName: string, lastName: string) {
    const safeName = `${firstName}:${lastName}`.toLowerCase().replace(/[^a-z0-9:]+/g, '-');
    return `${fileName}:${sourceRowNumber}:${safeName || 'row'}`;
}

export async function parseRosterFile(file: File): Promise<ParsedRosterBatch> {
    let matrix: string[][];
    let fileType = 'text/csv';

    if (/\.(xlsx|xls)$/i.test(file.name)) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false }) as string[][];
        fileType = file.name.toLowerCase().endsWith('.xlsx')
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/vnd.ms-excel';
    } else {
        const text = await file.text();
        const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ',';
        matrix = parseDelimitedText(text, delimiter);
        fileType = delimiter === '\t' ? 'text/tab-separated-values' : 'text/csv';
    }

    if (matrix.length < 2) {
        throw new Error('The roster file needs a header row and at least one participant row.');
    }

    const headers = matrix[0].map((header) => header.trim());
    const dataRows = matrix.slice(1);

    const parsedRows = dataRows
        .map((cells, index): ParsedRosterRow | null => {
            const rawRow = headers.reduce<Record<string, string>>((result, header, cellIndex) => {
                result[header] = cells[cellIndex]?.trim() || '';
                return result;
            }, {});

            if (Object.values(rawRow).every((value) => value.length === 0)) {
                return null;
            }

            let firstName = getCell(rawRow, (header) => ['first name', 'firstname', 'given name', 'given'].includes(header));
            let lastName = getCell(rawRow, (header) => ['last name', 'lastname', 'surname', 'family name'].includes(header));
            const fullName = getCell(rawRow, (header) => ['name', 'participant name', 'performer name', 'student name'].includes(header));

            if ((!firstName || !lastName) && fullName) {
                const splitName = splitFullName(fullName);
                firstName = firstName || splitName.firstName;
                lastName = lastName || splitName.lastName;
            }

            const guardianName = getCell(rawRow, (header) => ['guardian name', 'parent name', 'contact name'].includes(header));
            const guardianPhone = getCell(rawRow, (header) => ['guardian phone', 'parent phone', 'phone', 'mobile'].includes(header));
            const notes = getCell(rawRow, (header) => ['notes', 'comment', 'comments', 'special requests'].includes(header));

            const issueCodes: string[] = [];
            let reviewStatus: ParsedRosterRow['reviewStatus'] = 'ready';

            if (!firstName || !lastName) {
                issueCodes.push('missing_name');
                reviewStatus = 'blocked';
            } else if (!guardianName && !guardianPhone) {
                issueCodes.push('missing_guardian_contact');
                reviewStatus = 'warning';
            }

            return {
                sourceRowNumber: index + 2,
                rawRow,
                mappedFirstName: firstName || null,
                mappedLastName: lastName || null,
                mappedGuardianName: guardianName || null,
                mappedGuardianPhone: guardianPhone || null,
                mappedNotes: notes || null,
                reviewStatus,
                issueCodes,
                sourceAnchorValue: buildSourceAnchorValue(file.name, index + 2, firstName, lastName),
            };
        })
        .filter(Boolean) as ParsedRosterRow[];

    return {
        fileType,
        rows: parsedRows,
        summary: {
            ready: parsedRows.filter((row) => row.reviewStatus === 'ready').length,
            warning: parsedRows.filter((row) => row.reviewStatus === 'warning').length,
            blocked: parsedRows.filter((row) => row.reviewStatus === 'blocked').length,
        },
    };
}
