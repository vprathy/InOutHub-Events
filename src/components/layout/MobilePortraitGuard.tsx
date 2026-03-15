import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

const MOBILE_MEDIA = '(max-width: 767px)';

export function MobilePortraitGuard() {
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(MOBILE_MEDIA);
        const supportsTouch = navigator.maxTouchPoints > 0;

        const syncState = async () => {
            const isMobile = mediaQuery.matches && supportsTouch;
            const isLandscape = window.innerWidth > window.innerHeight;
            const orientationApi = screen.orientation as ScreenOrientation & {
                lock?: (orientation: string) => Promise<void>;
                unlock?: () => void;
            };

            if (isMobile && orientationApi?.lock) {
                try {
                    await orientationApi.lock('portrait-primary');
                } catch {
                    // Unsupported in some browsers or contexts.
                }
            } else if (!isMobile && orientationApi?.unlock) {
                orientationApi.unlock();
            }

            setIsBlocked(isMobile && isLandscape);
        };

        void syncState();
        window.addEventListener('resize', syncState);
        window.addEventListener('orientationchange', syncState);

        return () => {
            window.removeEventListener('resize', syncState);
            window.removeEventListener('orientationchange', syncState);
        };
    }, []);

    if (!isBlocked) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-5 text-center backdrop-blur">
            <div className="max-w-xs space-y-3 rounded-[1.5rem] border border-border bg-card px-5 py-6 shadow-xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Smartphone className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-lg font-black tracking-tight text-foreground">Use Portrait Mode</h2>
                    <p className="text-sm font-medium text-muted-foreground">
                        Mobile screens stay in portrait for live operations. Rotate your phone upright to continue.
                    </p>
                </div>
            </div>
        </div>
    );
}
