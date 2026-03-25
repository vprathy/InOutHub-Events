import { supabase } from '@/lib/supabase';
import type { Json, TablesInsert } from '@/types/database.types';

export type ClientErrorFeatureArea =
    | 'import_data'
    | 'performance_requests';

export type ClientErrorSeverity = 'warning' | 'error' | 'critical';

export type ReportClientErrorInput = {
    featureArea: ClientErrorFeatureArea;
    message: string;
    error?: unknown;
    severity?: ClientErrorSeverity;
    route?: string | null;
    organizationId?: string | null;
    eventId?: string | null;
    orgRole?: string | null;
    eventRole?: string | null;
    context?: Record<string, unknown>;
};

export type ClientErrorReportResult = {
    supportCode: string;
    recorded: boolean;
};

function normalizeFeaturePrefix(featureArea: ClientErrorFeatureArea) {
    if (featureArea === 'performance_requests') return 'PRQ';
    return 'IMP';
}

function buildSupportCode(featureArea: ClientErrorFeatureArea) {
    const prefix = normalizeFeaturePrefix(featureArea);
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${datePart}-${randomPart}`;
}

function serializeError(error: unknown) {
    if (!error) return null;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack || null,
        };
    }
    if (typeof error === 'object') {
        try {
            return JSON.parse(JSON.stringify(error));
        } catch {
            return { value: String(error) };
        }
    }
    return { value: String(error) };
}

function toJsonSafe(value: unknown): Json {
    if (value === null) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map((entry) => toJsonSafe(entry));
    if (typeof value === 'object') {
        const record: Record<string, Json | undefined> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            record[key] = toJsonSafe(entry);
        }
        return record;
    }
    return String(value);
}

export async function reportClientError(input: ReportClientErrorInput): Promise<ClientErrorReportResult> {
    const supportCode = buildSupportCode(input.featureArea);
    const payload: TablesInsert<'client_error_events'> = {
        support_code: supportCode,
        organization_id: input.organizationId || null,
        event_id: input.eventId || null,
        feature_area: input.featureArea,
        severity: input.severity || 'error',
        route: input.route || (typeof window !== 'undefined' ? window.location.pathname : null),
        message: input.message,
        error_context: toJsonSafe({
            error: serializeError(input.error),
            context: input.context || {},
        }),
        correlation_id: supportCode,
        event_role: input.eventRole || null,
        org_role: input.orgRole || null,
        pwa_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    try {
        const { error } = await supabase.from('client_error_events').insert(payload);
        if (error) throw error;
        return { supportCode, recorded: true };
    } catch (error) {
        console.error('[client-error-events] Failed to report error:', error);
        return { supportCode, recorded: false };
    }
}
