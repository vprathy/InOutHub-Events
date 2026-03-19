import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProfileConfirmationGate } from '@/components/auth/ProfileConfirmationGate';

export const AppShell: React.FC = () => {
    return (
        <div className="app-shell-bg min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 transition-colors relative">
            <Header />
            <ProfileConfirmationGate />

            <main className="relative flex-1 w-full max-w-screen-xl mx-auto px-4 pt-2 pb-6 pb-24 font-sans sm:px-6 sm:pt-3 sm:pb-8">
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
};
