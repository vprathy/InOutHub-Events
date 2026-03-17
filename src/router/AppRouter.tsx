import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import ActsPage from '@/pages/ActsPage';
import DevQuickLogin from '@/pages/dev/DevQuickLogin';
import LoginPage from '@/pages/auth/LoginPage';

import OrgSelectionPage from '@/pages/selection/OrgSelectionPage';
import EventSelectionPage from '@/pages/selection/EventSelectionPage';
import { SelectionGuard } from '@/components/selection/SelectionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Loader2 } from 'lucide-react';
import { isDevLoginEnabled } from '@/lib/authConfig';

const ParticipantsPage = lazy(() => import('@/pages/ParticipantsPage'));
const ParticipantProfilePage = lazy(() => import('@/pages/ParticipantProfilePage').then((module) => ({ default: module.ParticipantProfilePage })));
const PerformanceProfilePage = lazy(() => import('@/pages/PerformanceProfilePage').then((module) => ({ default: module.PerformanceProfilePage })));
const LineupPage = lazy(() => import('@/pages/LineupPage'));
const StageConsolePage = lazy(() => import('@/pages/StageConsolePage'));
const IntroVideoPrototype = lazy(() => import('@/pages/IntroVideoPrototype'));
const ExternalProgramSubmissionsPage = lazy(() => import('@/pages/admin/ExternalProgramSubmissionsPage'));
const LandingPageMidnight = lazy(() => import('@/pages/marketing/LandingPageMidnight'));
const LandingPageV3 = lazy(() => import('@/pages/marketing/LandingPageV3'));
const CompetitionLandingPage = lazy(() => import('@/pages/marketing/CompetitionLandingPage'));

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
            <AuthGuard>
                <SelectionGuard>
                    <AppShell />
                </SelectionGuard>
            </AuthGuard>
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
            {
                path: 'admin/external-submissions',
                element: (
                    <LazyRoute>
                        <ExternalProgramSubmissionsPage />
                    </LazyRoute>
                ),
            },
        ],
    },
    {
        path: '/dev/login',
        element: isDevLoginEnabled ? <DevQuickLogin /> : <Navigate to="/login" replace />,
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/landing-midnight',
        element: (
            <LazyRoute>
                <LandingPageMidnight />
            </LazyRoute>
        ),
    },
    {
        path: '/landing-v3',
        element: (
            <LazyRoute>
                <LandingPageV3 />
            </LazyRoute>
        ),
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
        path: '/competition/landing',
        element: (
            <LazyRoute>
                <CompetitionLandingPage />
            </LazyRoute>
        ),
    },
    {
        path: '/select-org',
        element: (
            <AuthGuard>
                <OrgSelectionPage />
            </AuthGuard>
        ),
    },
    {
        path: '/select-event',
        element: (
            <AuthGuard>
                <SelectionGuard>
                    <EventSelectionPage />
                </SelectionGuard>
            </AuthGuard>
        ),
    },
]);
