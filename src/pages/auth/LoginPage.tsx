import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { buildLoginRedirectTo } from '@/lib/authConfig';
import { rememberMagicLinkRequest } from '@/lib/authTelemetry';
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard } from '@/components/ui/OperationalCards';

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'google-loading' | 'magic-loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const nextPath = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const next = params.get('next');
        return next && next.startsWith('/') ? next : '/';
    }, [location.search]);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate(nextPath, { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate, nextPath]);

    const handleGoogleSignIn = async () => {
        setStatus('google-loading');
        setErrorMessage('');

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: buildLoginRedirectTo(nextPath),
                queryParams: {
                    prompt: 'select_account',
                },
            },
        });

        if (error) {
            setStatus('error');
            setErrorMessage(error.message || 'Could not start Google sign-in.');
            return;
        }
    };

    const handleMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim()) return;

        setStatus('magic-loading');
        setErrorMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: buildLoginRedirectTo(nextPath),
            },
        });

        if (error) {
            setStatus('error');
            setErrorMessage(error.message || 'Could not send magic link.');
            return;
        }

        rememberMagicLinkRequest(email.trim());
        setStatus('success');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-5">
                <div className="flex justify-center">
                    <BrandMark size="md" showLabel className="justify-center" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <OperationalMetricCard label="Access" value="Secure" icon={ShieldCheck} tone="good" />
                    <OperationalMetricCard label="Primary Path" value="Magic Link" icon={Mail} tone="info" />
                </div>

                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                    <div className="space-y-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Secure Sign In</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tight text-foreground">Sign in to InOutHub</h1>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Request a magic link to stay on the standard event-access path. Google sign-in remains available as a secondary option.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <form className="space-y-4" onSubmit={handleMagicLink}>
                            <div className="space-y-2">
                                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                    Email Address
                                </label>
                                <Input
                                    type="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="h-12 rounded-2xl"
                                    required
                                />
                            </div>

                            {status === 'success' ? (
                                <OperationalResponseCard
                                    label="Magic Link Sent"
                                    detail="Check your email and open the link on this device to continue."
                                    tone="good"
                                />
                            ) : null}

                            {status === 'error' ? (
                                <OperationalResponseCard
                                    label="Sign-In Error"
                                    detail={errorMessage}
                                    tone="critical"
                                />
                            ) : null}

                            <Button type="submit" className="h-12 w-full rounded-2xl" disabled={status === 'google-loading' || status === 'magic-loading'}>
                                {status === 'magic-loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Send Magic Link
                            </Button>
                        </form>

                        <OperationalEmptyResponse
                            title="Secondary Option"
                            detail="Use Google only if you prefer it and the consent-screen tradeoff is acceptable."
                        />

                        <Button type="button" variant="outline" className="h-12 w-full rounded-2xl" onClick={handleGoogleSignIn} disabled={status === 'google-loading' || status === 'magic-loading'}>
                            {status === 'google-loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4 fill-current" aria-hidden="true"><path d="M21.805 10.023h-9.18v3.955h5.27c-.227 1.27-.907 2.347-1.93 3.067v2.547h3.12c1.827-1.683 2.88-4.16 2.88-7.102 0-.663-.06-1.3-.16-1.927Z"/><path d="M12.625 22c2.61 0 4.8-.865 6.4-2.408l-3.12-2.547c-.866.58-1.974.923-3.28.923-2.52 0-4.654-1.703-5.417-3.99H4.003v2.628A9.67 9.67 0 0 0 12.625 22Z"/><path d="M7.208 13.978A5.8 5.8 0 0 1 6.905 12c0-.687.12-1.35.303-1.978V7.394H4.003A9.67 9.67 0 0 0 2.94 12c0 1.56.373 3.037 1.063 4.606l3.205-2.628Z"/><path d="M12.625 6.032c1.42 0 2.694.487 3.697 1.443l2.773-2.773C17.42 3.14 15.236 2 12.625 2a9.67 9.67 0 0 0-8.622 5.394l3.205 2.628c.763-2.287 2.897-3.99 5.417-3.99Z"/></svg>}
                            Continue With Google
                        </Button>
                    </div>

                    <p className="mt-4 text-center text-xs font-medium leading-5 text-muted-foreground">
                        If the installed app does not pick up the browser session cleanly, keep magic link as the primary sign-in path.
                    </p>
                    <p className="mt-2 text-center text-xs font-medium leading-5 text-muted-foreground">
                        Don't have access yet? Contact your organization or event admin to complete access setup.
                    </p>
                </div>
            </div>
        </div>
    );
}
