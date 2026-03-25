import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import ActsPage from '@/pages/ActsPage';
import DevQuickLogin from '@/pages/dev/DevQuickLogin';
import LoginPage from '@/pages/auth/LoginPage';
import AuthCompletePage from '@/pages/auth/AuthCompletePage';
import OrgSelectionPage from '@/pages/selection/OrgSelectionPage';
import EventSelectionPage from '@/pages/selection/EventSelectionPage';
import { SelectionGuard } from '@/components/selection/SelectionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Loader2 } from 'lucide-react';
import { isDevLoginEnabled } from '@/lib/authConfig';

const ParticipantsPage = lazy(() => import('@/pages/ParticipantsPage'));
const RequirementsPage = lazy(() => import('@/pages/RequirementsPage'));
const AccessPage = lazy(() => import('@/pages/AccessPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const ImportDataPage = lazy(() => import('@/pages/ImportDataPage'));
const PerformanceRequestsPage = lazy(() => import('@/pages/PerformanceRequestsPage'));
const ParticipantProfilePage = lazy(() => import('@/pages/ParticipantProfilePage'));
const PerformanceProfilePage = lazy(() => import('@/pages/PerformanceProfilePage'));
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

function PerformanceAliasRedirect() {
    const { actId } = useParams();
    return <Navigate to={actId ? `/performances/${actId}` : '/performances'} replace />;
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
                path: 'admin',
                element: (
                    <LazyRoute>
                        <AdminPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'admin/requirements',
                element: (
                    <LazyRoute>
                        <RequirementsPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'admin/import-data',
                element: (
                    <LazyRoute>
                        <ImportDataPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'admin/performance-requests',
                element: (
                    <LazyRoute>
                        <PerformanceRequestsPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'admin/access',
                element: (
                    <LazyRoute>
                        <AccessPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'requirements',
                element: <Navigate to="/admin/requirements" replace />,
            },
            {
                path: 'access',
                element: <Navigate to="/admin/access" replace />,
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
                path: 'performances',
                element: <ActsPage />,
            },
            {
                path: 'performances/:actId',
                element: (
                    <LazyRoute>
                        <PerformanceProfilePage />
                    </LazyRoute>
                ),
            },
            {
                path: 'show-flow',
                element: (
                    <LazyRoute>
                        <LineupPage />
                    </LazyRoute>
                ),
            },
            {
                path: 'acts',
                element: <Navigate to="/performances" replace />,
            },
            {
                path: 'acts/:actId',
                element: <PerformanceAliasRedirect />,
            },
            {
                path: 'lineup',
                element: <Navigate to="/show-flow" replace />,
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
                path: 'console',
                element: <Navigate to="/stage-console" replace />,
            },
            {
                path: '*',
                element: <Navigate to="/dashboard" replace />,
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
        path: '/auth/complete',
        element: <AuthCompletePage />,
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
        element: (
            <AuthGuard>
                <AppShell />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: <OrgSelectionPage />,
            },
        ],
    },
    {
        path: '/select-event',
        element: (
            <AuthGuard>
                <AppShell />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: <EventSelectionPage />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
