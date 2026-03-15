export const DEFAULT_EVENT_TIMEZONE = 'America/New_York';

function getFormatter(
    timeZone: string,
    options: Intl.DateTimeFormatOptions,
) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        ...options,
    });
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
    const parts = getFormatter(timeZone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
    );

    return (asUtc - date.getTime()) / 60000;
}

export function localInputToEventIso(localValue?: string | null, timeZone = DEFAULT_EVENT_TIMEZONE) {
    if (!localValue) return null;
    const match = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return localValue;

    const [, year, month, day, hour, minute] = match;
    const utcGuess = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        0,
    ));
    const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
    return new Date(utcGuess.getTime() - offsetMinutes * 60000).toISOString();
}

export function formatEventDateTime(
    dateString?: string | null,
    timeZone = DEFAULT_EVENT_TIMEZONE,
    includeZone = true,
) {
    if (!dateString) return 'Not scheduled';
    const normalized = dateString.includes('T') && dateString.length === 16
        ? `${dateString}:00`
        : dateString.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return getFormatter(timeZone, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: includeZone ? 'short' : undefined,
    }).format(date);
}

export function formatEventTime(
    dateString?: string | null,
    timeZone = DEFAULT_EVENT_TIMEZONE,
    includeZone = false,
) {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--:--';
    return getFormatter(timeZone, {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: includeZone ? 'short' : undefined,
    }).format(date);
}

export function formatNowInEventTime(timeZone = DEFAULT_EVENT_TIMEZONE) {
    return formatEventTime(new Date().toISOString(), timeZone, true);
}
