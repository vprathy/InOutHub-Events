import { useNavigate } from 'react-router-dom';
import {
    ShieldAlert,
    Building2,
    CalendarDays,
    Mic2,
    Users,
    RefreshCw
} from 'lucide-react';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDevUserByRole } from '@/lib/dev/config';
import { resetDemoEvent } from '@/lib/dev/resetDemoEvent';
import { useSelection } from '@/context/SelectionContext';
import { useQueryClient } from '@tanstack/react-query';

const DEV_ROLES = [
    {
        id: 'super-admin',
        label: 'Super Admin',
        description: 'Platform operator. Bypasses all RBAC.',
        icon: ShieldAlert,
        color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
    },
    {
        id: 'org-owner',
        label: 'Org Owner',
        description: 'Full control over a specific Organization.',
        icon: Building2,
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    },
    {
        id: 'event-admin',
        label: 'Event Admin',
        description: 'Manages a specific Event and its rosters.',
        icon: CalendarDays,
        color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20',
    },
    {
        id: 'stage-manager',
        label: 'Stage Manager',
        description: 'Runs the Stage Console during execution.',
        icon: Mic2,
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    },
    {
        id: 'act-admin',
        label: 'Act Admin',
        description: 'Manages specific Acts and their participants.',
        icon: Users,
        color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
    }
];

export default function DevQuickLogin() {
    const navigate = useNavigate();
    const { setOrganizationId } = useSelection();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const withTimeout = async <T,>(promise: Promise<T>, label: string, timeoutMs = 12000): Promise<T> => {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                window.setTimeout(() => {
                    reject(new Error(`${label} timed out. Check network access to Supabase and retry.`));
                }, timeoutMs)
            ),
        ]);
    };


    const handleReset = async () => {
        setIsResetting(true);
        setError(null);
        setSuccess(null);
        try {
            await resetDemoEvent();
            setSuccess('Demo Event reset successfully!');
        } catch (err: any) {
            console.error('[DEV ONLY] Reset failed:', err);
            setError(err.message || 'Failed to reset demo event');
        } finally {
            setIsResetting(false);
        }
    };

    const handleSimulatedLogin = async (roleId: string) => {
        setIsLoading(roleId);
        setError(null);
        setSuccess(null);
        try {
            const credentials = getDevUserByRole(roleId);
            if (!credentials) throw new Error('Unknown Dev Role');

            console.log(`[DEV ONLY] Attempting login for: ${credentials.email}`);

            const signIn = async () =>
                withTimeout(
                    supabase.auth.signInWithPassword({
                        email: credentials.email,
                        password: credentials.password,
                    }),
                    'Sign in'
                );

            // Step 1: Try to sign in normally
            let { data: signInData, error: signInError } = await signIn();

            // Step 2: If the user doesn't exist yet, sign them up automatically!
            if (signInError && signInError.message.includes('Invalid login credentials')) {
                console.log(`[DEV ONLY] User not found, automatically registering ${credentials.email}...`);
                const { data: signUpData, error: signUpError } = await withTimeout(
                    supabase.auth.signUp({
                        email: credentials.email,
                        password: credentials.password,
                    }),
                    'Sign up'
                );

                if (signUpError) throw signUpError;
                if (!signUpData.session) {
                    ({ data: signInData, error: signInError } = await signIn());
                }
            } else if (signInError) {
                throw signInError;
            }

            if (signInError) {
                throw signInError;
            }

            const session = signInData?.session ?? (await supabase.auth.getSession()).data.session;
            if (!session) {
                throw new Error('Dev login did not establish an authenticated session. Retry login.');
            }

            console.log(`[DEV ONLY] Success! Logged in as: ${credentials.email}`);

            // Clear any previous session context and cache
            setOrganizationId(null);
            queryClient.clear();

            // After logging in, redirect to the main app dashboard
            navigate('/');

        } catch (err: any) {
            console.error('[DEV ONLY] Login failed:', err);
            setError(err.message || 'Failed to login');
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 flex flex-col items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Development Login</h1>
                    <p className="text-neutral-400 text-sm">
                        Quickly switch accounts for local testing. This screen is stripped from production builds.
                    </p>
                </div>

                <div className="space-y-3">
                    {error && (
                        <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-xl text-sm mb-4">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-4 rounded-xl text-sm mb-4">
                            {success}
                        </div>
                    )}

                    {DEV_ROLES.map((role) => {
                        const Icon = role.icon;
                        const isClickingThis = isLoading === role.id;

                        return (
                            <button
                                key={role.id}
                                onClick={() => handleSimulatedLogin(role.id)}
                                disabled={!!isLoading || isResetting}
                                className={`w-full flex items-center p-4 border rounded-xl transition-all duration-200 text-left ${isLoading && !isClickingThis ? 'opacity-50 cursor-not-allowed' : ''
                                    } ${role.color}`}
                            >
                                <div className="flex bg-neutral-900/50 p-3 rounded-lg mr-4">
                                    <Icon className={`w-6 h-6 ${isClickingThis ? 'animate-pulse' : ''}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {role.label} {isClickingThis && '(Loading...)'}
                                    </h3>
                                    <p className="text-sm opacity-80">{role.description}</p>
                                </div>
                            </button>
                        )
                    })}

                    <div className="pt-4 border-t border-neutral-800">
                        <button
                            onClick={handleReset}
                            disabled={isResetting || !!isLoading}
                            className="w-full flex items-center p-4 border rounded-xl transition-all duration-200 text-left bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20 disabled:opacity-50"
                        >
                            <div className="flex bg-neutral-900/50 p-3 rounded-lg mr-4">
                                <RefreshCw className={`w-6 h-6 ${isResetting ? 'animate-spin' : ''}`} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {isResetting ? 'Resetting...' : 'Reset Demo Event'}
                                </h3>
                                <p className="text-sm opacity-80">Wipes and recreates the ZiffyVolve MVP 2026 event.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
