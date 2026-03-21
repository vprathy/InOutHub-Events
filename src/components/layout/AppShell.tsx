import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SectionIdentityStrip } from '@/components/layout/sectionIdentity';

export const AppShell: React.FC = () => {
    const location = useLocation();
    const isSelectionRoute = location.pathname === '/select-org' || location.pathname === '/select-event';

    return (
        <div className="app-shell-bg min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 transition-colors relative">
            <Header />
            {!isSelectionRoute ? <SectionIdentityStrip /> : null}

            <main className={`relative flex-1 w-full max-w-screen-xl mx-auto px-4 font-sans sm:px-6 ${isSelectionRoute ? 'pt-4 pb-10 sm:pt-6 sm:pb-12' : 'pt-2 pb-24 sm:pt-3 sm:pb-8'}`}>
                <Outlet />
            </main>

            {!isSelectionRoute ? <BottomNav /> : null}
        </div>
    );
};
