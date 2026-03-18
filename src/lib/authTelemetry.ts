import { supabase } from '@/lib/supabase';

const APP_SESSION_ID_KEY = 'inouthub_app_session_id';
const PENDING_MAGIC_LINK_KEY = 'inouthub_pending_magic_link';

type AuthEventType = 'magic_link_requested' | 'login_completed' | 'logout' | 'session_timeout';
type SessionEndReason = 'logout' | 'timed_out' | 'revoked' | 'replaced' | 'ended';

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

function getDeviceInfo() {
    if (typeof window === 'undefined') return {};

    return {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        platform: window.navigator.platform,
        screen: {
            width: window.screen.width,
            height: window.screen.height,
        },
    };
}

export function rememberMagicLinkRequest(email: string) {
    writeSessionStorage(PENDING_MAGIC_LINK_KEY, JSON.stringify({
        email,
        requestedAt: new Date().toISOString(),
    }));
}

export async function flushPendingMagicLinkRequest(contextEventId?: string | null) {
    const raw = readSessionStorage(PENDING_MAGIC_LINK_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw) as { requestedAt?: string };
        await logAuthEvent('magic_link_requested', {
            contextEventId,
            createdAt: parsed.requestedAt,
        });
    } finally {
        removeSessionStorage(PENDING_MAGIC_LINK_KEY);
    }
}

export async function logAuthEvent(
    eventType: AuthEventType,
    options?: { contextEventId?: string | null; createdAt?: string }
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
