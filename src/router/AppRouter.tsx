import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import ActsPage from '@/pages/ActsPage';
import DevQuickLogin from '@/pages/dev/DevQuickLogin';

import OrgSelectionPage from '@/pages/selection/OrgSelectionPage';
import EventSelectionPage from '@/pages/selection/EventSelectionPage';
import { SelectionGuard } from '@/components/selection/SelectionGuard';
import { Loader2 } from 'lucide-react';

const ParticipantsPage = lazy(() => import('@/pages/ParticipantsPage'));
const ParticipantProfilePage = lazy(() => import('@/pages/ParticipantProfilePage').then((module) => ({ default: module.ParticipantProfilePage })));
const PerformanceProfilePage = lazy(() => import('@/pages/PerformanceProfilePage').then((module) => ({ default: module.PerformanceProfilePage })));
const LineupPage = lazy(() => import('@/pages/LineupPage'));
const StageConsolePage = lazy(() => import('@/pages/StageConsolePage'));
const IntroVideoPrototype = lazy(() => import('@/pages/IntroVideoPrototype'));

function RouteLoader() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <SelectionGuard>
                <AppShell />
            </SelectionGuard>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: 'dashboard',
                element: <DashboardPage />,
            },
            {
                path: 'participants',
                element: (
                    <LazyRoute>
                        <ParticipantsPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'participants/:participantId',
                element: (
                    <LazyRoute>
                        <ParticipantProfilePage />
                    </LazyRoute>
                ),
            },
            {
                path: 'acts',
                element: <ActsPage />,
            },
            {
                path: 'acts/:actId',
                element: (
                    <LazyRoute>
                        <PerformanceProfilePage />
                    </LazyRoute>
                ),
            },
            {
                path: 'lineup',
                element: (
                    <LazyRoute>
                        <LineupPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'stage-console',
                element: (
                    <LazyRoute>
                        <StageConsolePage />
                    </LazyRoute>
                ),
            },
        ],
    },
    {
        path: '/dev/login',
        element: <DevQuickLogin />,
    },
    {
        path: '/login',
        element: <Navigate to="/dev/login" replace />,
    },
    {
        path: '/prototype/intro',
        element: (
            <LazyRoute>
                <IntroVideoPrototype />
            </LazyRoute>
        ),
    },
    {
        path: '/select-org',
        element: <OrgSelectionPage />,
    },
    {
        path: '/select-event',
        element: (
            <SelectionGuard>
                <EventSelectionPage />
            </SelectionGuard>
        ),
    },
]);
