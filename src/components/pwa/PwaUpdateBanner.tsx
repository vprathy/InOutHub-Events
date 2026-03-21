import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';

export function PwaUpdateBanner() {
    const [dismissed, setDismissed] = useState(false);
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const autoRefreshTimeoutRef = useRef<number | null>(null);
    const updateCheckIntervalRef = useRef<number | null>(null);
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (!registration || updateCheckIntervalRef.current !== null) {
                return;
            }

            // Poll for a new worker so long-lived PWA sessions refresh without manual intervention.
            updateCheckIntervalRef.current = window.setInterval(() => {
                void registration.update();
            }, 60_000);
        },
    });

    useEffect(() => {
        if (needRefresh) {
            setDismissed(false);
        }
    }, [needRefresh, version]);

    useEffect(() => {
        if (!needRefresh) {
            if (autoRefreshTimeoutRef.current !== null) {
                window.clearTimeout(autoRefreshTimeoutRef.current);
                autoRefreshTimeoutRef.current = null;
            }
            return;
        }

        const appliedVersion = sessionStorage.getItem('inouthub-pwa-version');
        if (appliedVersion === version) {
            return;
        }

        autoRefreshTimeoutRef.current = window.setTimeout(() => {
            sessionStorage.setItem('inouthub-pwa-version', version);
            void updateServiceWorker(true);
        }, 1500);

        return () => {
            if (autoRefreshTimeoutRef.current !== null) {
                window.clearTimeout(autoRefreshTimeoutRef.current);
                autoRefreshTimeoutRef.current = null;
            }
        };
    }, [needRefresh, updateServiceWorker, version]);

    useEffect(() => {
        return () => {
            if (autoRefreshTimeoutRef.current !== null) {
                window.clearTimeout(autoRefreshTimeoutRef.current);
            }
            if (updateCheckIntervalRef.current !== null) {
                window.clearInterval(updateCheckIntervalRef.current);
            }
        };
    }, []);

    if (!needRefresh || dismissed) return null;

    return (
        <div className="fixed inset-x-3 bottom-20 z-[80] mx-auto max-w-md rounded-3xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Update Ready</p>
                    <p className="text-sm font-semibold text-foreground">A newer app version is available.</p>
                    <p className="text-xs text-muted-foreground">Refresh to load the latest build and clear stale cached views. v{version}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                    aria-label="Dismiss update prompt"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-4 flex gap-3">
                <Button
                    className="min-h-[44px] flex-1 rounded-2xl font-black uppercase tracking-[0.18em]"
                    onClick={() => updateServiceWorker(true)}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh App
                </Button>
                <Button
                    variant="outline"
                    className="min-h-[44px] rounded-2xl px-4 font-black uppercase tracking-[0.18em]"
                    onClick={() => setDismissed(true)}
                >
                    Later
                </Button>
            </div>
        </div>
    );
}
