import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';

type SubjectTab = 'participants' | 'acts';

type RequirementPreset = {
    id: string;
    label: string;
    description: string;
    appliesTo: string;
    required: boolean;
    needsReview: boolean;
    blocking: boolean;
    bulk: boolean;
    availabilityLabel?: string;
};

const participantPresets: RequirementPreset[] = [
    {
        id: 'guardian',
        label: 'Guardian Contact',
        description: 'Capture guardian name and phone before the participant is cleared.',
        appliesTo: 'Minors only',
        required: true,
        needsReview: false,
        blocking: true,
        bulk: false,
    },
    {
        id: 'waiver',
        label: 'Waiver',
        description: 'Collect a signed waiver or release artifact for each participant who needs one.',
        appliesTo: 'All participants',
        required: true,
        needsReview: true,
        blocking: true,
        bulk: true,
    },
    {
        id: 'special-request',
        label: 'Special Request Review',
        description: 'Ensure accommodations or notes are acknowledged before scheduling.',
        appliesTo: 'Special requests only',
        required: true,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
];

const participantOptionalAddOns: RequirementPreset[] = [
    {
        id: 'identity',
        label: 'Identity Check',
        description: 'Optional manual verification step for orgs or events that explicitly want it in their readiness model.',
        appliesTo: 'Selected participants',
        required: true,
        needsReview: true,
        blocking: false,
        bulk: true,
        availabilityLabel: 'Admin Request',
    },
];

const actPresets: RequirementPreset[] = [
    {
        id: 'music',
        label: 'Music Submitted',
        description: 'Track the act audio source before lineup finalization.',
        appliesTo: 'All acts',
        required: true,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
    {
        id: 'intro',
        label: 'Intro Approved',
        description: 'Require intro approval before the act is truly stage ready.',
        appliesTo: 'Acts with intro',
        required: true,
        needsReview: true,
        blocking: true,
        bulk: false,
    },
    {
        id: 'tech',
        label: 'Stage Tech Confirmed',
        description: 'Confirm microphone, props, lighting, and other technical needs.',
        appliesTo: 'All acts',
        required: true,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
    {
        id: 'support',
        label: 'Support Team',
        description: 'Ensure a manager, choreographer, or support lead is attached where needed.',
        appliesTo: 'Selected acts',
        required: false,
        needsReview: false,
        blocking: false,
        bulk: false,
    },
];

export default function RequirementsPage() {
    const navigate = useNavigate();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole } = useCurrentOrgRole(organizationId || null);
    const [subjectTab, setSubjectTab] = useState<SubjectTab>('participants');
    const [scope, setScope] = useState<'event' | 'org'>('event');

    const canManageRequirements =
        currentEventRole === 'EventAdmin' || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const presets = useMemo(
        () => (subjectTab === 'participants' ? participantPresets : actPresets),
        [subjectTab]
    );
    const optionalPresets = useMemo(
        () => (subjectTab === 'participants' ? participantOptionalAddOns : []),
        [subjectTab]
    );
    const summary = useMemo(
        () => ({
            total: presets.length,
            blocking: presets.filter((preset) => preset.blocking).length,
            review: presets.filter((preset) => preset.needsReview).length,
            bulk: presets.filter((preset) => preset.bulk).length,
        }),
        [presets]
    );
    const destinationLabel =
        subjectTab === 'participants' ? 'Participants Workspace' : 'Performance Workspace';

    return (
        <div className="space-y-4 pb-12">
            <PageHeader
                title="Manage Requirements"
                subtitle={
                    canManageRequirements
                        ? 'Preset-driven rules for participant and performance readiness.'
                        : 'View-only preview of participant and performance requirement presets.'
                }
            />

            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 rounded-[1.15rem] bg-muted/35 p-1.5">
                    <button
                        onClick={() => setScope('event')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            scope === 'event' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                        }`}
                    >
                        This Event
                    </button>
                    <button
                        onClick={() => setScope('org')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            scope === 'org' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                        }`}
                    >
                        All Events In Org
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-[1.15rem] bg-muted/35 p-1.5">
                    <button
                        onClick={() => setSubjectTab('participants')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            subjectTab === 'participants'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground'
                        }`}
                    >
                        Participants
                    </button>
                    <button
                        onClick={() => setSubjectTab('acts')}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                            subjectTab === 'acts'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground'
                        }`}
                    >
                        Acts / Performances
                    </button>
                </div>
            </div>

            <div className="surface-panel rounded-[1.2rem] border p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Preset Coverage
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            {summary.blocking > 0
                                ? `${summary.blocking} blocking rules are active for ${
                                      subjectTab === 'participants' ? 'participant' : 'performance'
                                  } readiness.`
                                : 'No blocking rules are active in this preset set.'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {scope === 'event'
                                ? 'Editing the current event lens.'
                                : 'Reviewing the organization-wide rule lens.'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(subjectTab === 'participants' ? '/participants' : '/performances')}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-primary"
                    >
                        Open {destinationLabel}
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <SummaryPill label="Presets" value={summary.total} tone="default" />
                    <SummaryPill
                        label="Blocking"
                        value={summary.blocking}
                        tone={summary.blocking > 0 ? 'critical' : 'good'}
                    />
                    <SummaryPill
                        label="Needs Review"
                        value={summary.review}
                        tone={summary.review > 0 ? 'warning' : 'good'}
                    />
                    <SummaryPill
                        label="Bulk Actions"
                        value={summary.bulk}
                        tone={summary.bulk > 0 ? 'info' : 'default'}
                    />
                </div>
            </div>

            <div className="space-y-2.5">
                {presets.map((preset) => (
                    <div key={preset.id} className="surface-panel rounded-[1.2rem] border px-3.5 py-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-black text-foreground">{preset.label}</p>
                                    <span className="rounded-full bg-black/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        {preset.appliesTo}
                                    </span>
                                </div>
                                <p className="line-clamp-1 text-sm text-muted-foreground">{preset.description}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    <StateChip
                                        label="Required"
                                        active={preset.required}
                                        tone={preset.required ? 'good' : 'default'}
                                    />
                                    <StateChip
                                        label="Review"
                                        active={preset.needsReview}
                                        tone={preset.needsReview ? 'warning' : 'default'}
                                    />
                                    <StateChip
                                        label="Blocks"
                                        active={preset.blocking}
                                        tone={preset.blocking ? 'critical' : 'default'}
                                    />
                                    <StateChip
                                        label="Bulk"
                                        active={preset.bulk}
                                        tone={preset.bulk ? 'info' : 'default'}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(subjectTab === 'participants' ? '/participants' : '/performances')}
                                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1 rounded-xl border border-border/60 bg-background/70 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70 sm:w-auto sm:self-center"
                                aria-label={`Open ${preset.label}`}
                            >
                                Open
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {optionalPresets.length > 0 ? (
                <div className="surface-panel rounded-[1.2rem] border p-3.5">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Optional Admin Add-Ons
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            Keep extra verification steps out of the default operator workflow until an admin
                            explicitly wants them.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            This keeps the participant workspace focused on placement, approvals, and safety during
                            Phase 1 rollout.
                        </p>
                    </div>

                    <div className="mt-3 space-y-2.5">
                        {optionalPresets.map((preset) => (
                            <div
                                key={preset.id}
                                className="rounded-[1.2rem] border border-border/60 bg-background/70 px-3.5 py-3.5"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-black text-foreground">
                                                {preset.label}
                                            </p>
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                                                {preset.availabilityLabel}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <StateChip
                                                label="Review"
                                                active={preset.needsReview}
                                                tone={preset.needsReview ? 'warning' : 'default'}
                                            />
                                            <StateChip
                                                label="Bulk"
                                                active={preset.bulk}
                                                tone={preset.bulk ? 'info' : 'default'}
                                            />
                                            <StateChip label="Default Surface" active={false} tone="default" />
                                        </div>
                                    </div>
                                    <div className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary sm:w-auto">
                                        Admin Request
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function SummaryPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'default' | 'good' | 'warning' | 'critical' | 'info';
}) {
    const toneClasses = {
        default: 'bg-muted/60 text-foreground',
        good: 'bg-emerald-500/10 text-emerald-700',
        warning: 'bg-orange-500/10 text-orange-700',
        critical: 'bg-rose-500/10 text-rose-700',
        info: 'bg-sky-500/10 text-sky-700',
    };

    return (
        <div className={`rounded-[1rem] px-3 py-3 ${toneClasses[tone]}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.18em]">{label}</p>
            <p className="mt-1 text-lg font-black tracking-tight">{value}</p>
        </div>
    );
}

function StateChip({
    label,
    active,
    tone,
}: {
    label: string;
    active: boolean;
    tone: 'default' | 'good' | 'warning' | 'critical' | 'info';
}) {
    const toneClasses = {
        default: 'bg-muted text-muted-foreground',
        good: 'bg-emerald-500/10 text-emerald-700',
        warning: 'bg-orange-500/10 text-orange-700',
        critical: 'bg-rose-500/10 text-rose-700',
        info: 'bg-sky-500/10 text-sky-700',
    };

    return (
        <span
            className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.16em] ${toneClasses[tone]}`}
        >
            {label}: {active ? 'On' : 'Off'}
        </span>
    );
}
