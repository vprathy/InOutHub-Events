import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import ActsPage from '@/pages/ActsPage';
import { PerformanceProfilePage } from '@/pages/PerformanceProfilePage';
import ParticipantsPage from '@/pages/ParticipantsPage';
import { ParticipantProfilePage } from '@/pages/ParticipantProfilePage';
import LineupPage from '@/pages/LineupPage';
import StageConsolePage from '@/pages/StageConsolePage';
import DevQuickLogin from '@/pages/dev/DevQuickLogin';

import OrgSelectionPage from '@/pages/selection/OrgSelectionPage';
import EventSelectionPage from '@/pages/selection/EventSelectionPage';
import IntroVideoPrototype from '@/pages/IntroVideoPrototype';
import { SelectionGuard } from '@/components/selection/SelectionGuard';

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
                element: <ParticipantsPage />,
            },
            {
                path: 'participants/:participantId',
                element: <ParticipantProfilePage />,
            },
            {
                path: 'acts',
                element: <ActsPage />,
            },
            {
                path: 'acts/:actId',
                element: <PerformanceProfilePage />,
            },
            {
                path: 'lineup',
                element: <LineupPage />,
            },
            {
                path: 'stage-console',
                element: <StageConsolePage />,
            },
        ],
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
    // Development-only routes
    ...(import.meta.env.DEV ? [
        {
            path: '/dev/login',
            element: <DevQuickLogin />,
        },
        {
            path: '/prototype/intro',
            element: <IntroVideoPrototype />,
        },
    ] : []),
]);
