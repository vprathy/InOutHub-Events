import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';
import { ensureUserSession, endUserSession, logAuthEvent, touchUserSession } from '@/lib/authTelemetry';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { clearSelection, eventId } = useSelection();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const previousUserIdRef = useRef<string | null>(null);
    const idleTimeoutRef = useRef<number | null>(null);
    const lastTouchAtRef = useRef<number>(0);

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (!isMounted) return;

            if (error) {
                clearSelection();
                setSession(null);
                setUser(null);
                setIsLoading(false);
                return;
            }

            if (!data.session) {
                clearSelection();
            }
            previousUserIdRef.current = data.session?.user?.id ?? null;
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setIsLoading(false);
        };

        void initializeAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isMounted) return;

            const nextUserId = nextSession?.user?.id ?? null;
            const didUserChange = Boolean(previousUserIdRef.current && nextUserId && previousUserIdRef.current !== nextUserId);

            if (!nextSession || didUserChange) {
                clearSelection();
            }

            previousUserIdRef.current = nextUserId;
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [clearSelection]);

    useEffect(() => {
        if (!session) {
            if (idleTimeoutRef.current) {
                window.clearTimeout(idleTimeoutRef.current);
                idleTimeoutRef.current = null;
            }
            return;
        }

        const resetIdleTimer = () => {
            if (idleTimeoutRef.current) {
                window.clearTimeout(idleTimeoutRef.current);
            }

            idleTimeoutRef.current = window.setTimeout(() => {
                void (async () => {
                    await logAuthEvent('session_timeout', { contextEventId: eventId });
                    await endUserSession('timed_out');
                    await supabase.auth.signOut();
                })();
            }, IDLE_TIMEOUT_MS);
        };

        const touchSession = () => {
            const now = Date.now();
            if (now - lastTouchAtRef.current < 60_000) return;
            lastTouchAtRef.current = now;
            void touchUserSession({ activeEventId: eventId });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                resetIdleTimer();
                touchSession();
            }
        };

        const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'focus'];
        events.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer, { passive: true }));
        events.forEach((eventName) => window.addEventListener(eventName, touchSession, { passive: true }));
        document.addEventListener('visibilitychange', handleVisibilityChange);
        resetIdleTimer();
        void ensureUserSession(eventId);

        return () => {
            if (idleTimeoutRef.current) {
                window.clearTimeout(idleTimeoutRef.current);
                idleTimeoutRef.current = null;
            }
            events.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
            events.forEach((eventName) => window.removeEventListener(eventName, touchSession));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [eventId, session]);

    useEffect(() => {
        if (!session) return;
        void ensureUserSession(eventId);
    }, [eventId, session]);

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                isLoading,
                isAuthenticated: !!session,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
