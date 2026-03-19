import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Loader2, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { buildLoginRedirectTo } from '@/lib/authConfig';
import { rememberMagicLinkRequest } from '@/lib/authTelemetry';
import { OperationalResponseCard } from '@/components/ui/OperationalCards';

function isStandaloneDisplayMode() {
    if (typeof window === 'undefined') return false;

    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
    const standaloneNavigator = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    return standaloneMedia || standaloneNavigator;
}

function isMobileLikeDevice() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 768px)').matches ?? false;
}

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [codeRequestedFor, setCodeRequestedFor] = useState<string | null>(null);
    const [showInstallHelp, setShowInstallHelp] = useState(false);
    const [showPrimarySignIn, setShowPrimarySignIn] = useState(true);
    const [showSecondarySignIn, setShowSecondarySignIn] = useState(false);
    const [status, setStatus] = useState<'idle' | 'google-loading' | 'code-loading' | 'verify-loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const nextPath = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const next = params.get('next');
        return next && next.startsWith('/') ? next : '/';
    }, [location.search]);

    const isStandalone = useMemo(() => isStandaloneDisplayMode(), []);
    const shouldShowInstallPrompt = useMemo(() => !isStandalone && isMobileLikeDevice(), [isStandalone]);

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

    const handleRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim()) return;

        const normalizedEmail = email.trim().toLowerCase();
        setStatus('code-loading');
        setErrorMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
                shouldCreateUser: false,
                emailRedirectTo: buildLoginRedirectTo(nextPath),
            },
        });

        if (error) {
            setStatus('error');
            setErrorMessage(error.message || 'Could not send email code.');
            return;
        }

        rememberMagicLinkRequest(normalizedEmail);
        setCodeRequestedFor(normalizedEmail);
        setOtpCode('');
        setStatus('success');
    };

    const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!codeRequestedFor || otpCode.trim().length < 6) return;

        setStatus('verify-loading');
        setErrorMessage('');

        const { error } = await supabase.auth.verifyOtp({
            email: codeRequestedFor,
            token: otpCode.trim(),
            type: 'email',
        });

        if (error) {
            setStatus('error');
            setErrorMessage(error.message || 'Could not verify email code.');
            return;
        }

        setStatus('idle');
        navigate(nextPath, { replace: true });
    };

    const handleUseDifferentEmail = () => {
        setCodeRequestedFor(null);
        setOtpCode('');
        setStatus('idle');
        setErrorMessage('');
    };

    const togglePrimarySignIn = () => {
        setShowPrimarySignIn((current) => {
            const next = !current;
            if (next) {
                setShowSecondarySignIn(false);
            }
            return next;
        });
    };

    const toggleSecondarySignIn = () => {
        setShowSecondarySignIn((current) => {
            const next = !current;
            if (next) {
                setShowPrimarySignIn(false);
            }
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[22rem] space-y-4">
                <div className="flex justify-center">
                    <BrandMark size="lg" showLabel className="justify-center" />
                </div>

                <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
                    <div className="space-y-2 text-center">
                        <div className="space-y-2">
                            <h1 className="text-lg font-bold tracking-tight text-foreground">Sign in to continue</h1>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-border bg-background/70">
                            <button
                                type="button"
                                onClick={togglePrimarySignIn}
                                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Email code</p>
                                    <p className="text-xs text-muted-foreground">
                                        {codeRequestedFor ? `Continue with ${codeRequestedFor}` : 'Primary sign-in'}
                                    </p>
                                </div>
                                {showPrimarySignIn ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </button>

                            {showPrimarySignIn ? (
                                <div className="space-y-3 border-t border-border px-4 pb-3 pt-3">
                                    {!codeRequestedFor ? (
                                        <form className="space-y-3" onSubmit={handleRequestCode}>
                                            <div className="space-y-1.5">
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
                                                    className="h-11 rounded-2xl"
                                                    required
                                                />
                                            </div>

                                            {status === 'error' ? (
                                                <OperationalResponseCard
                                                    label="Sign-In Error"
                                                    detail={errorMessage}
                                                    tone="critical"
                                                />
                                            ) : null}

                                            <p className="text-center text-xs font-medium leading-5 text-muted-foreground">
                                                Watch for an email from Supabase. If it does not appear, check your junk folder.
                                            </p>

                                            <Button type="submit" className="h-11 w-full rounded-2xl" disabled={status === 'google-loading' || status === 'code-loading' || status === 'verify-loading'}>
                                                {status === 'code-loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                                Send Email Code
                                            </Button>
                                        </form>
                                    ) : (
                                        <form className="space-y-3" onSubmit={handleVerifyCode}>
                                            <OperationalResponseCard
                                                label="Email Code Sent"
                                                detail={`Enter the 6-digit code sent to ${codeRequestedFor}. Watch for an email from Supabase. If it does not appear, check your junk folder.`}
                                                tone="good"
                                            />

                                            <div className="space-y-1.5">
                                                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                                    One-Time Code
                                                </label>
                                                <Input
                                                    type="text"
                                                    autoComplete="one-time-code"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    placeholder="123456"
                                                    value={otpCode}
                                                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="h-11 rounded-2xl text-center text-lg tracking-[0.35em]"
                                                    required
                                                />
                                            </div>

                                            {status === 'error' ? (
                                                <OperationalResponseCard
                                                    label="Code Error"
                                                    detail={errorMessage}
                                                    tone="critical"
                                                />
                                            ) : null}

                                            <Button type="submit" className="h-11 w-full rounded-2xl" disabled={status === 'google-loading' || status === 'code-loading' || status === 'verify-loading' || otpCode.trim().length < 6}>
                                                {status === 'verify-loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                Verify Code
                                            </Button>

                                            <Button type="button" variant="outline" className="h-11 w-full rounded-2xl" onClick={handleUseDifferentEmail} disabled={status === 'verify-loading'}>
                                                Use Different Email
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="rounded-2xl border border-border bg-background/70">
                            <button
                                type="button"
                                onClick={toggleSecondarySignIn}
                                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Other sign-in options</p>
                                    <p className="text-xs text-muted-foreground">Google sign-in</p>
                                </div>
                                {showSecondarySignIn ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </button>

                            {showSecondarySignIn ? (
                                <div className="space-y-3 border-t border-border px-4 pb-3 pt-3">
                                    <p className="text-xs font-medium leading-5 text-muted-foreground">
                                        Sign in with Google.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 w-full rounded-2xl border-border bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900"
                                        onClick={handleGoogleSignIn}
                                        disabled={status === 'google-loading' || status === 'code-loading' || status === 'verify-loading'}
                                    >
                                        {status === 'google-loading' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
                                                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3.01h3.87c2.26-2.08 3.56-5.14 3.56-8.66Z"/>
                                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3.01c-1.07.72-2.45 1.14-4.06 1.14-3.12 0-5.76-2.11-6.7-4.95H1.3v3.11A11.99 11.99 0 0 0 12 24Z"/>
                                                <path fill="#FBBC05" d="M5.3 14.27A7.2 7.2 0 0 1 4.93 12c0-.79.14-1.55.37-2.27V6.62H1.3A11.99 11.99 0 0 0 0 12c0 1.93.46 3.76 1.3 5.38l4-3.11Z"/>
                                                <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.13 15.23 0 12 0A11.99 11.99 0 0 0 1.3 6.62l4 3.11c.94-2.84 3.58-4.96 6.7-4.96Z"/>
                                            </svg>
                                        )}
                                        Continue with Google
                                    </Button>
                                </div>
                            ) : null}
                        </div>

                        {shouldShowInstallPrompt ? (
                            <div className="rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-center">
                                <p className="text-[13px] leading-5 text-foreground">
                                    Install InOutHub Events on your Home Screen for faster access on this device.
                                    {' '}
                                    <button
                                        type="button"
                                        onClick={() => setShowInstallHelp(true)}
                                        className="font-semibold text-primary underline underline-offset-4"
                                    >
                                        How to add it
                                    </button>
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <Modal isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} title="Add To Home Screen">
                <div className="space-y-4 text-base leading-7 text-foreground">
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
                        <Smartphone className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="font-semibold">iPhone</p>
                            <p className="text-muted-foreground">Tap Share, then choose <span className="font-semibold text-foreground">Add to Home Screen</span>.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
                        <Smartphone className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="font-semibold">Android</p>
                            <p className="text-muted-foreground">Open the browser menu, then choose <span className="font-semibold text-foreground">Add to Home Screen</span> or <span className="font-semibold text-foreground">Install app</span>.</p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
