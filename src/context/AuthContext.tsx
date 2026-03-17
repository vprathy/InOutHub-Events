import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSelection } from '@/context/SelectionContext';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { clearSelection } = useSelection();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setIsLoading(false);
        };

        void initializeAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isMounted) return;
            if (!nextSession) {
                clearSelection();
            }
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [clearSelection]);

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
