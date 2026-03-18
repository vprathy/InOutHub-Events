export type ParticipantOperationalStatus =
    | 'active'
    | 'inactive'
    | 'withdrawn'
    | 'refunded'
    | 'missing_from_source'
    | null
    | undefined;

export function isOperationalParticipantStatus(status: ParticipantOperationalStatus) {
    return !status || status === 'active';
}
