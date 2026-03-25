import {
    Calendar,
    ClipboardCheck,
    Database,
    Edit,
    Funnel,
    LayoutDashboard,
    ListOrdered,
    MonitorPlay,
    Music,
    RefreshCw,
    Search,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelection } from '@/context/SelectionContext';
import { useEventCapabilities } from '@/hooks/useEventCapabilities';
import { useEventSources } from '@/hooks/useEventSources';
import { useSyncGoogleSheet } from '@/hooks/useParticipants';

type SectionIdentity = {
    key: string;
    label: string;
    group: string;
    hint: string;
    subtitle?: string;
    icon: LucideIcon;
    shellClassName: string;
    iconClassName: string;
    badgeClassName: string;
};

const SECTION_IDENTITIES: SectionIdentity[] = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        group: 'Overview',
        hint: 'Event pulse',
        subtitle: 'What needs attention now',
        icon: LayoutDashboard,
        shellClassName:
            'border-sky-500/15 bg-[linear-gradient(90deg,rgba(14,165,233,0.10),rgba(56,189,248,0.05)_42%,transparent)] dark:bg-[linear-gradient(90deg,rgba(56,189,248,0.18),rgba(59,130,246,0.06)_45%,transparent)]',
        iconClassName: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        badgeClassName: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
        key: 'participants',
        label: 'Participants',
        group: 'People Ops',
        hint: 'Roster & clearance',
        subtitle: 'Manage participants and readiness',
        icon: Users,
        shellClassName:
            'border-indigo-500/15 bg-[linear-gradient(90deg,rgba(99,102,241,0.12),rgba(125,211,252,0.08)_42%,rgba(255,255,255,0.02)_72%,transparent)] dark:bg-[linear-gradient(90deg,rgba(129,140,248,0.22),rgba(56,189,248,0.08)_45%,transparent)]',
        iconClassName: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
        badgeClassName: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    },
    {
        key: 'performances',
        label: 'Performances',
        group: 'Act Prep',
        hint: 'Cast, media, readiness',
        subtitle: 'Manage cast, media and act readiness',
        icon: ListOrdered,
        shellClassName:
            'border-fuchsia-500/15 bg-[linear-gradient(90deg,rgba(217,70,239,0.10),rgba(251,146,60,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(232,121,249,0.18),rgba(251,191,36,0.05)_45%,transparent)]',
        iconClassName: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
        badgeClassName: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
    },
    {
        key: 'show-flow',
        label: 'Show Flow',
        group: 'Scheduling',
        hint: 'Stages & order',
        subtitle: 'Set the running order and clean the queue',
        icon: Calendar,
        shellClassName:
            'border-amber-500/15 bg-[linear-gradient(90deg,rgba(245,158,11,0.10),rgba(16,185,129,0.04)_48%,transparent)] dark:bg-[linear-gradient(90deg,rgba(251,191,36,0.18),rgba(52,211,153,0.05)_48%,transparent)]',
        iconClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    {
        key: 'console',
        label: 'Live Console',
        group: 'Execution',
        hint: 'Current cue control',
        subtitle: 'Run the show and keep the next cue visible',
        icon: MonitorPlay,
        shellClassName:
            'border-emerald-500/15 bg-[linear-gradient(90deg,rgba(16,185,129,0.12),rgba(45,212,191,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(52,211,153,0.18),rgba(45,212,191,0.05)_45%,transparent)]',
        iconClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        badgeClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
        key: 'access',
        label: 'Access',
        group: 'Admin',
        hint: 'Staffing & roles',
        subtitle: 'Manage event roles, pending access, and staffing',
        icon: ShieldCheck,
        shellClassName:
            'border-teal-500/15 bg-[linear-gradient(90deg,rgba(20,184,166,0.12),rgba(6,182,212,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(45,212,191,0.18),rgba(34,211,238,0.05)_45%,transparent)]',
        iconClassName: 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300',
        badgeClassName: 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    },
    {
        key: 'requirements',
        label: 'Requirements',
        group: 'Admin',
        hint: 'Policy controls',
        subtitle: 'Choose what people and performances need',
        icon: ClipboardCheck,
        shellClassName:
            'border-rose-500/15 bg-[linear-gradient(90deg,rgba(244,63,94,0.10),rgba(251,146,60,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(251,113,133,0.18),rgba(251,191,36,0.05)_45%,transparent)]',
        iconClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        badgeClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    {
        key: 'import-data',
        label: 'Import Data',
        group: 'Admin',
        hint: 'Intake & mapping',
        subtitle: 'Connect imports, review mappings, and refresh source data',
        icon: Database,
        shellClassName:
            'border-cyan-500/15 bg-[linear-gradient(90deg,rgba(6,182,212,0.12),rgba(59,130,246,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(34,211,238,0.18),rgba(59,130,246,0.05)_45%,transparent)]',
        iconClassName: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        badgeClassName: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    },
    {
        key: 'performance-requests',
        label: 'Performance Requests',
        group: 'Admin',
        hint: 'Review & convert',
        subtitle: 'Review requests before they become performances',
        icon: Music,
        shellClassName:
            'border-violet-500/15 bg-[linear-gradient(90deg,rgba(139,92,246,0.12),rgba(236,72,153,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(167,139,250,0.18),rgba(244,114,182,0.05)_45%,transparent)]',
        iconClassName: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
        badgeClassName: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    {
        key: 'admin',
        label: 'Admin',
        group: 'Admin',
        hint: 'Privileged controls',
        subtitle: 'Administrative controls for staffing and readiness',
        icon: ShieldCheck,
        shellClassName:
            'border-slate-500/15 bg-[linear-gradient(90deg,rgba(71,85,105,0.16),rgba(20,184,166,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(100,116,139,0.24),rgba(45,212,191,0.05)_45%,transparent)]',
        iconClassName: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-200',
        badgeClassName: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-200',
    },
];

function matchSection(pathname: string) {
    if (pathname.startsWith('/participants')) return 'participants';
    if (pathname.startsWith('/performances') || pathname.startsWith('/acts')) return 'performances';
    if (pathname.startsWith('/show-flow') || pathname.startsWith('/lineup')) return 'show-flow';
    if (pathname.startsWith('/stage-console')) return 'console';
    if (pathname.startsWith('/admin/access') || pathname === '/access') return 'access';
    if (pathname.startsWith('/admin/import-data')) return 'import-data';
    if (pathname.startsWith('/admin/performance-requests')) return 'performance-requests';
    if (pathname.startsWith('/admin/requirements') || pathname === '/requirements') return 'requirements';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    return null;
}

function formatSyncTimestamp(value: string | null | undefined) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export function getSectionIdentity(pathname: string): SectionIdentity | null {
    const sectionKey = matchSection(pathname);
    if (!sectionKey) return null;
    return SECTION_IDENTITIES.find((section) => section.key === sectionKey) || null;
}

export function useSectionIdentity() {
    const location = useLocation();
    return getSectionIdentity(location.pathname);
}

export function SectionIdentityStrip() {
    const section = useSectionIdentity();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { eventId } = useSelection();
    const capabilities = useEventCapabilities(eventId || null, null);
    const { sources, updateSourceSyncStatus } = useEventSources(eventId || '');
    const syncSheet = useSyncGoogleSheet(eventId || '');

    if (!section) return null;

    const isParticipants = section.key === 'participants';
    const isParticipantDetail = isParticipants && /^\/participants\/[^/]+$/.test(location.pathname);
    const isPerformances = section.key === 'performances';
    const isRequirements = section.key === 'requirements';
    const isPerformanceRequests = section.key === 'performance-requests';
    const canManageSources = capabilities.canSyncParticipants;
    const canEditParticipant = capabilities.canManageParticipantRecords;
    const canUsePremiumGeneration = capabilities.canUsePremiumGeneration;

    const openSources = () => {
        const nextParams = new URLSearchParams();
        nextParams.set('action', 'import');
        navigate(`/admin/import-data?${nextParams.toString()}`);
    };

    const openParticipantEdit = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('action', 'edit-profile');
        setSearchParams(nextParams, { replace: true });
    };

    const openPerformanceAction = (action: 'prepare-intros') => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('action', action);
        setSearchParams(nextParams, { replace: true });
    };

    const performanceRequestSources = sources.filter((source) => source.config.intakeTarget === 'performance_requests');
    const primaryPerformanceRequestSource = performanceRequestSources.length === 1 ? performanceRequestSources[0] : null;

    const syncPerformanceRequestSource = async () => {
        if (!primaryPerformanceRequestSource?.config.sheetId) {
            navigate('/admin/import-data');
            return;
        }

        const result = await syncSheet.mutateAsync({
            sheetId: primaryPerformanceRequestSource.config.sheetId,
            savedMapping: primaryPerformanceRequestSource.config?.inferredMapping,
            intakeTarget: 'performance_requests',
        });

        await updateSourceSyncStatus({
            sourceId: primaryPerformanceRequestSource.id,
            lastSyncedAt: new Date().toISOString(),
            config: {
                ...primaryPerformanceRequestSource.config,
                inferredMapping: result.mapping,
                mappingGaps: result.gaps || [],
                detectedHeaders: result.headers || [],
                mappingUpdatedAt: new Date().toISOString(),
            },
        });
    };

    const toggleRequirementsPanel = (panel: 'req-search' | 'req-filter') => {
        const nextParams = new URLSearchParams(searchParams);
        if (nextParams.get('panel') === panel) {
            nextParams.delete('panel');
        } else {
            nextParams.set('panel', panel);
        }
        setSearchParams(nextParams, { replace: true });
    };

    return (
        <div className={`sticky top-14 z-40 border-b py-1 backdrop-blur-xl sm:top-16 sm:py-1.5 ${section.shellClassName}`}>
            <div className="mx-auto flex w-full min-w-0 max-w-screen-xl items-center justify-between gap-3 px-4 sm:px-6">
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="min-w-0 flex-1 text-left outline-none focus:outline-none focus-visible:outline-none"
                    aria-label={`Scroll to top of ${section.label}`}
                >
                    <div className="min-w-0">
                        <p className="truncate text-[24px] font-black leading-tight tracking-tight text-foreground">
                            {section.label}
                        </p>
                        {section.subtitle ? (
                            <p className="mt-0.5 truncate text-sm font-semibold leading-tight text-muted-foreground">
                                {section.subtitle}
                            </p>
                        ) : null}
                    </div>
                </button>
                {isParticipants ? (
                    <div className="flex shrink-0 items-center gap-2 self-center">
                        {isParticipantDetail ? canEditParticipant ? (
                            <button
                                type="button"
                                onClick={openParticipantEdit}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-sm font-bold text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                                aria-label="Edit this profile"
                            >
                                <Edit className="h-4 w-4 text-primary" />
                                <span>Edit Profile</span>
                            </button>
                        ) : null : canManageSources ? (
                            <button
                                type="button"
                                onClick={openSources}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-sm font-bold text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                                aria-label="Open import data"
                            >
                                <Database className="h-4 w-4 text-primary" />
                                <span>Import Data</span>
                            </button>
                        ) : null}
                    </div>
                ) : isPerformances ? (
                    <div className="flex shrink-0 items-center gap-2 self-center">
                        {canUsePremiumGeneration ? (
                            <button
                                type="button"
                                onClick={() => openPerformanceAction('prepare-intros')}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                                aria-label="Prepare intros"
                            >
                                <Music className="h-4 w-4 text-primary" />
                                <span>Prepare Intros</span>
                            </button>
                        ) : null}
                    </div>
                ) : isRequirements ? (
                    <div className="flex shrink-0 items-center gap-2 self-center">
                        <button
                            type="button"
                            onClick={() => toggleRequirementsPanel('req-search')}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                            aria-label="Search requirements"
                            title="Search requirements"
                        >
                            <Search className="h-4 w-4 text-primary" />
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleRequirementsPanel('req-filter')}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                            aria-label="Filter requirements"
                            title="Filter requirements"
                        >
                            <Funnel className="h-4 w-4 text-primary" />
                        </button>
                    </div>
                ) : isPerformanceRequests ? (
                    <div className="flex shrink-0 items-center gap-2 self-center">
                        {primaryPerformanceRequestSource ? (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void syncPerformanceRequestSource()}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                                    aria-label="Sync source"
                                >
                                    <RefreshCw className={`h-4 w-4 text-primary ${syncSheet.isPending ? 'animate-spin' : ''}`} />
                                    <span>Sync Source</span>
                                </button>
                                <span className="hidden text-xs text-muted-foreground sm:inline">
                                    {syncSheet.isPending
                                        ? 'Syncing now...'
                                        : formatSyncTimestamp(primaryPerformanceRequestSource.lastSyncedAt)
                                            ? `Last synced ${formatSyncTimestamp(primaryPerformanceRequestSource.lastSyncedAt)}`
                                            : 'Never synced'}
                                </span>
                            </div>
                        ) : canManageSources ? (
                            <button
                                type="button"
                                onClick={openSources}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/20 hover:bg-background/85"
                                aria-label="Open import data"
                            >
                                <Database className="h-4 w-4 text-primary" />
                                <span>Import Data</span>
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div className={`hidden min-h-[30px] items-center rounded-full border px-2.5 text-[9px] font-black uppercase tracking-[0.18em] md:inline-flex ${section.badgeClassName}`}>
                        {section.hint}
                    </div>
                )}
            </div>
        </div>
    );
}
