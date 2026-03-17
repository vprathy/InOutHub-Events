import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export const AppShell: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 transition-colors">
            <Header />

            <main className="flex-1 w-full max-w-screen-xl mx-auto px-4 pt-3 pb-28 font-sans sm:px-6 sm:pt-4 sm:pb-10">
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
};
