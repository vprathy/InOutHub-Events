import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { buildLoginRedirectTo } from '@/lib/authConfig';

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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

    const handleMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim()) return;

        setStatus('loading');
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

        setStatus('success');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center">
                    <BrandMark size="md" showLabel className="justify-center" />
                </div>

                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                    <div className="space-y-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Operator Access</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tight text-foreground">Sign In</h1>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Use your work email to receive a secure magic link.
                            </p>
                        </div>
                    </div>

                    <form className="mt-6 space-y-4" onSubmit={handleMagicLink}>
                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                Work Email
                            </label>
                            <Input
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                placeholder="name@organization.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="h-12 rounded-2xl"
                                required
                            />
                        </div>

                        {status === 'success' ? (
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
                                Magic link sent. Check your email and open it on this device to continue.
                            </div>
                        ) : null}

                        {status === 'error' ? (
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">
                                {errorMessage}
                            </div>
                        ) : null}

                        <Button type="submit" className="h-12 w-full rounded-2xl" disabled={status === 'loading'}>
                            {status === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Email Magic Link
                        </Button>
                    </form>

                    <p className="mt-4 text-center text-xs font-medium leading-5 text-muted-foreground">
                        If you have not been granted organization or event access yet, sign in first and then contact an admin to complete access assignment.
                    </p>
                </div>
            </div>
        </div>
    );
}
