import {
    Calendar,
    ClipboardCheck,
    LayoutDashboard,
    ListOrdered,
    MonitorPlay,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
        icon: ClipboardCheck,
        shellClassName:
            'border-rose-500/15 bg-[linear-gradient(90deg,rgba(244,63,94,0.10),rgba(251,146,60,0.04)_44%,transparent)] dark:bg-[linear-gradient(90deg,rgba(251,113,133,0.18),rgba(251,191,36,0.05)_45%,transparent)]',
        iconClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        badgeClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    {
        key: 'admin',
        label: 'Admin',
        group: 'Admin',
        hint: 'Privileged controls',
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
    if (pathname.startsWith('/admin/requirements') || pathname === '/requirements') return 'requirements';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    return null;
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

    if (!section) return null;

    return (
        <div className={`sticky top-14 z-40 border-b py-1 backdrop-blur-xl sm:top-16 sm:py-1.5 ${section.shellClassName}`}>
            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-3 px-4 text-left outline-none focus:outline-none focus-visible:outline-none sm:px-6"
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
                <div className={`hidden min-h-[30px] items-center rounded-full border px-2.5 text-[9px] font-black uppercase tracking-[0.18em] md:inline-flex ${section.badgeClassName}`}>
                    {section.hint}
                </div>
            </button>
        </div>
    );
}
