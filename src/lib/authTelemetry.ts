import { supabase } from '@/lib/supabase';

const APP_SESSION_ID_KEY = 'inouthub_app_session_id';
const PENDING_AUTH_EVENTS_KEY = 'inouthub_pending_auth_events';

type AuthEventType =
    | 'magic_link_requested'
    | 'email_code_requested'
    | 'email_code_verified'
    | 'google_login_started'
    | 'google_login_completed'
    | 'install_help_opened'
    | 'profile_check_shown'
    | 'profile_check_completed'
    | 'login_completed'
    | 'logout'
    | 'session_timeout';
type SessionEndReason = 'logout' | 'timed_out' | 'revoked' | 'replaced' | 'ended';
type AuthEventMetadata = Record<string, unknown>;

function readSessionStorage(key: string) {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
}

function writeSessionStorage(key: string, value: string) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, value);
}

function removeSessionStorage(key: string) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
}

function getDisplayMode() {
    if (typeof window === 'undefined') return 'unknown';

    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
    const standaloneNavigator = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (standaloneMedia || standaloneNavigator) return 'standalone';
    return 'browser';
}

function getDeviceType() {
    if (typeof window === 'undefined') return 'unknown';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
}

function getDeviceInfo() {
    if (typeof window === 'undefined') return {};

    return {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        platform: window.navigator.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        displayMode: getDisplayMode(),
        deviceType: getDeviceType(),
        pwaVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
        screen: {
            width: window.screen.width,
            height: window.screen.height,
        },
    };
}

function readPendingAuthEvents(): Array<{ eventType: AuthEventType; metadata?: AuthEventMetadata; createdAt?: string }> {
    const raw = readSessionStorage(PENDING_AUTH_EVENTS_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as Array<{ eventType: AuthEventType; metadata?: AuthEventMetadata; createdAt?: string }>;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writePendingAuthEvents(events: Array<{ eventType: AuthEventType; metadata?: AuthEventMetadata; createdAt?: string }>) {
    writeSessionStorage(PENDING_AUTH_EVENTS_KEY, JSON.stringify(events));
}

export function queuePendingAuthEvent(
    eventType: AuthEventType,
    metadata?: AuthEventMetadata
) {
    const pending = readPendingAuthEvents();
    pending.push({
        eventType,
        metadata,
        createdAt: new Date().toISOString(),
    });
    writePendingAuthEvents(pending);
}

export function rememberMagicLinkRequest(email: string) {
    queuePendingAuthEvent('email_code_requested', { email });
}

export async function flushPendingAuthEvents(contextEventId?: string | null) {
    const pending = readPendingAuthEvents();
    if (!pending.length) return;

    try {
        for (const event of pending) {
            await logAuthEvent(event.eventType, {
                contextEventId,
                createdAt: event.createdAt,
                metadata: event.metadata ?? undefined,
            });
        }
    } finally {
        removeSessionStorage(PENDING_AUTH_EVENTS_KEY);
    }
}

export async function logAuthEvent(
    eventType: AuthEventType,
    options?: { contextEventId?: string | null; createdAt?: string; metadata?: AuthEventMetadata }
) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('auth_events').insert({
        user_id: user.id,
        context_event_id: options?.contextEventId ?? null,
        event_type: eventType,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
        metadata: {
            ...getDeviceInfo(),
            ...(options?.metadata ?? {}),
        },
        created_at: options?.createdAt,
    });
}

export async function ensureUserSession(activeEventId?: string | null) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    let sessionId = readSessionStorage(APP_SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        writeSessionStorage(APP_SESSION_ID_KEY, sessionId);
        await supabase.from('user_sessions').insert({
            id: sessionId,
            user_id: user.id,
            active_event_id: activeEventId ?? null,
            status: 'active',
            device_info: getDeviceInfo(),
            is_offline_mode: typeof navigator !== 'undefined' ? !navigator.onLine : false,
        });
        return sessionId;
    }

    await touchUserSession({ activeEventId });
    return sessionId;
}

export async function touchUserSession(options?: { activeEventId?: string | null }) {
    const sessionId = readSessionStorage(APP_SESSION_ID_KEY);
    if (!sessionId) return;

    await supabase
        .from('user_sessions')
        .update({
            active_event_id: options?.activeEventId ?? null,
            status: 'active',
            is_offline_mode: typeof navigator !== 'undefined' ? !navigator.onLine : false,
            last_active_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
}

export async function endUserSession(reason: SessionEndReason) {
    const sessionId = readSessionStorage(APP_SESSION_ID_KEY);
    if (!sessionId) return;

    await supabase
        .from('user_sessions')
        .update({
            status: reason === 'timed_out' ? 'timed_out' : 'ended',
            ended_reason: reason,
            ended_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

    removeSessionStorage(APP_SESSION_ID_KEY);
}
