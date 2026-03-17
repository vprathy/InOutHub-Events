import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, Smartphone } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

function isStandaloneDisplayMode() {
    if (typeof window === 'undefined') return false;

    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
    const standaloneNavigator = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    return standaloneMedia || standaloneNavigator;
}

export default function AuthCompletePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    const nextPath = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const next = params.get('next');
        return next && next.startsWith('/') ? next : '/dashboard';
    }, [location.search]);

    const isStandalone = useMemo(() => isStandaloneDisplayMode(), []);

    useEffect(() => {
        if (!isLoading && isAuthenticated && isStandalone) {
            navigate(nextPath, { replace: true });
        }
    }, [isAuthenticated, isLoading, isStandalone, navigate, nextPath]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">Completing sign in...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex justify-center">
                        <BrandMark size="md" showLabel className="justify-center" />
                    </div>

                    <div className="rounded-[2rem] border border-border bg-card p-6 text-center shadow-sm">
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Sign-in link incomplete</h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            This link did not finish the sign-in session. Return to InOutHub and request a new sign-in link.
                        </p>
                        <Button className="mt-6 h-12 w-full rounded-2xl" onClick={() => navigate(`/login?next=${encodeURIComponent(nextPath)}`, { replace: true })}>
                            Request New Sign-In Link
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center">
                    <BrandMark size="md" showLabel className="justify-center" />
                </div>

                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                    <div className="space-y-4 text-center">
                        <div className="mx-auto inline-flex rounded-full bg-emerald-500/10 p-3 text-emerald-600">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tight text-foreground">Sign-in complete</h1>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Your sign-in worked. If you installed InOutHub on your phone, switch back to the app now to continue there.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <div className="flex items-start gap-3">
                            <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Installed App</p>
                                <p className="text-sm text-foreground">
                                    Reopen the installed InOutHub app on your phone. Your session should now be ready there.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button className="mt-6 h-12 w-full rounded-2xl" onClick={() => navigate(nextPath, { replace: true })}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Continue In Browser
                    </Button>

                    <p className="mt-4 text-center text-xs font-medium leading-5 text-muted-foreground">
                        If the installed app does not pick up the session immediately, reopen it once and then continue from the event you were working on.
                    </p>
                </div>
            </div>
        </div>
    );
}
