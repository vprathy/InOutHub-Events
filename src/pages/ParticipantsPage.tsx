import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useParticipantsQuery } from '@/hooks/useParticipants';
import { useSelection } from '@/context/SelectionContext';
import { ImportParticipantsModal } from '@/components/participants/ImportParticipantsModal';
import { AddParticipantModal } from '@/components/participants/AddParticipantModal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    Users,
    RefreshCw,
    Search,
    User,
    Loader2,
    Phone,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowUpRight,
    Database,
    ChevronDown,
    Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAssignToAct, useAddParticipantNote } from '@/hooks/useParticipants';
import { useActsQuery } from '@/hooks/useActs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useEventSources } from '@/hooks/useEventSources';
import { isOperationalParticipantStatus } from '@/lib/participantStatus';
import { buildParticipantReadinessSummary } from '@/lib/requirementsPrototype';
import { OperationalEmptyResponse, OperationalMetricCard, OperationalResponseCard } from '@/components/ui/OperationalCards';

export default function ParticipantsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { eventId } = useSelection();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'unassigned' | 'special' | 'ready' | 'no_phone' | 'at_risk'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'age' | 'readiness' | 'recent'>('name');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { data: participants, isLoading, error } = useParticipantsQuery(eventId || '');

    // Quick Action State
    const [assigningParticipant, setAssigningParticipant] = useState<string | null>(null);
    const [notingParticipant, setNotingParticipant] = useState<string | null>(null);
    const [selectedActId, setSelectedActId] = useState('');
    const [actSearchQuery, setActSearchQuery] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteCategory, setNoteCategory] = useState<'operational' | 'internal' | 'special_request'>('operational');
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const canManageSync = currentEventRole === 'EventAdmin';
    const { sources } = useEventSources(eventId || '');

    // Mutations/Hooks
    const { data: allActs } = useActsQuery(eventId || '');
    const assignMutation = useAssignToAct(assigningParticipant || '');
    const noteMutation = useAddParticipantNote(notingParticipant || '');

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        const actionParam = searchParams.get('action');

        if (filterParam && ['all', 'missing', 'unassigned', 'special', 'ready', 'no_phone', 'at_risk'].includes(filterParam)) {
            setActiveFilter(filterParam as typeof activeFilter);
        }

        if (actionParam === 'import') {
            setIsImportModalOpen(true);
        }
    }, [searchParams]);

    const updateFilter = (nextFilter: typeof activeFilter) => {
        setActiveFilter(nextFilter);
        const nextParams = new URLSearchParams(searchParams);
        if (nextFilter === 'all') {
            nextParams.delete('filter');
        } else {
            nextParams.set('filter', nextFilter);
        }
        setSearchParams(nextParams, { replace: true });
    };

    const handleAssign = async () => {
        if (!assigningParticipant || !selectedActId) return;
        await assignMutation.mutateAsync({ actId: selectedActId });
        setAssigningParticipant(null);
        setSelectedActId('');
        setActSearchQuery('');
    };

    const handleAddNote = async () => {
        if (!notingParticipant || !noteContent.trim()) return;
        await noteMutation.mutateAsync({ content: noteContent, category: noteCategory });
        setNotingParticipant(null);
        setNoteContent('');
    };

    const isParticipantReady = (participant: any) => buildParticipantReadinessSummary(participant).status === 'cleared';

    const getReadinessScore = (p: any) => {
        const summary = buildParticipantReadinessSummary(p);
        if (summary.status === 'cleared') return 1;
        if (summary.status === 'on_track') return 0.65;
        return p.actCount ? 0.35 : 0;
    };

    const operationalParticipants = useMemo(
        () => (participants || []).filter((participant) => isOperationalParticipantStatus(participant.status)),
        [participants]
    );
    const stats = {
        total: operationalParticipants.length || 0,
        assigned: operationalParticipants.filter(p => (p.actCount || 0) > 0).length || 0,
        ready: operationalParticipants.filter((participant) => isParticipantReady(participant)).length || 0,
        missing: operationalParticipants.filter(p => ((p.assetStats?.missing || 0) > 0) || ((p.assetStats?.pending || 0) > 0)).length || 0,
        unassigned: operationalParticipants.filter(p => !p.actCount).length || 0,
        special: operationalParticipants.filter(p => p.hasSpecialRequests).length || 0,
        atRisk: operationalParticipants.filter(p => p.isMinor && (!p.guardianName || !p.guardianPhone)).length || 0,
    };
    const participantResponseItems = [
        {
            key: 'at_risk' as const,
            label: 'Minor Safety Follow-Up',
            detail: 'Guardian name and phone still need to be completed before these participants are clear.',
            count: stats.atRisk,
            tone: 'critical' as const,
            action: 'Open safety follow-up',
        },
        {
            key: 'missing' as const,
            label: 'Approvals Pending',
            detail: 'Uploaded docs or evidence still need review before clearance is fully in place.',
            count: stats.missing,
            tone: 'warning' as const,
            action: 'Review approvals',
        },
        {
            key: 'unassigned' as const,
            label: 'Needs Placement',
            detail: 'These participants have not been assigned into a performance yet.',
            count: stats.unassigned,
            tone: 'warning' as const,
            action: 'Place participants',
        },
        {
            key: 'special' as const,
            label: 'Special Requests',
            detail: 'Review these requests before final scheduling and show-day clearance.',
            count: stats.special,
            tone: 'info' as const,
            action: 'Review requests',
        },
    ].filter((item) => item.count > 0).slice(0, 3);
    const filteredParticipants = participants?.filter(p => {
        const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter !== 'all' && !isOperationalParticipantStatus(p.status)) return false;
        if (activeFilter === 'missing') return ((p.assetStats?.missing || 0) > 0) || ((p.assetStats?.pending || 0) > 0);
        if (activeFilter === 'unassigned') return !p.actCount;
        if (activeFilter === 'special') return p.hasSpecialRequests;
        if (activeFilter === 'ready') return isParticipantReady(p);
        if (activeFilter === 'no_phone') return !p.guardianPhone;
        if (activeFilter === 'at_risk') return p.isMinor && (!p.guardianName || !p.guardianPhone);

        return true;
    }).sort((a, b) => {
        if (sortBy === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        if (sortBy === 'age') return (b.age || 0) - (a.age || 0);
        if (sortBy === 'readiness') return getReadinessScore(b) - getReadinessScore(a);
        if (sortBy === 'recent') return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        return 0;
    });

    const visibleActs = useMemo(() => {
        if (!allActs) return [];
        const query = actSearchQuery.trim().toLowerCase();
        if (!query) return allActs;
        return allActs.filter((act) => act.name.toLowerCase().includes(query));
    }, [actSearchQuery, allActs]);

    if (isLoading || !eventId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading participants...</p>
            </div>
        );
    }

    const formatLastSynced = (dateStr: string | null) => {
        if (!dateStr) return 'Never Synced';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleDateString();
    };

    const isSyncOld = (dateStr: string | null) => {
        if (!dateStr) return true;
        const diffMs = new Date().getTime() - new Date(dateStr).getTime();
        return diffMs > 2 * 60 * 60 * 1000; // 2 hours
    };

    const lastSyncedAt = sources.reduce<string | null>((latest, source) => {
        if (!source.lastSyncedAt) return latest;
        if (!latest) return source.lastSyncedAt;
        return new Date(source.lastSyncedAt).getTime() > new Date(latest).getTime() ? source.lastSyncedAt : latest;
    }, null);

    return (
            <div className="flex flex-col space-y-5">
            <div className="space-y-3">
                <PageHeader
                    title="Participants"
                    subtitle={`${stats.total} in play • ${stats.unassigned} need placement • ${stats.missing} approvals open`}
                    actions={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                onClick={() => setIsAddParticipantOpen(true)}
                                className="flex h-11 w-full items-center justify-center space-x-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-[11px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10 sm:w-auto"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Participant</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!canManageSync) return;
                                    const nextParams = new URLSearchParams(searchParams);
                                    nextParams.set('action', 'import');
                                    setSearchParams(nextParams, { replace: true });
                                    setIsImportModalOpen(true);
                                }}
                                disabled={!canManageSync}
                                className={`flex h-11 w-full items-center justify-center space-x-2 rounded-xl px-4 text-[11px] font-black uppercase tracking-widest transition-all sm:w-auto ${canManageSync ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Open Sync Tools</span>
                            </button>
                        </div>
                    }
                    status={eventId ? (
                        <div className={`inline-flex items-center text-[10px] font-bold uppercase tracking-tighter ${isSyncOld(lastSyncedAt) ? 'text-amber-500 animate-pulse' : 'text-emerald-500/80'}`}>
                            <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isSyncOld(lastSyncedAt) ? 'animate-spin-slow' : ''}`} />
                            {lastSyncedAt ? `Synced ${formatLastSynced(lastSyncedAt)}` : 'Sync Required'}
                        </div>
                    ) : null}
                />
                {!canManageSync ? (
                    <p className="text-xs font-medium text-muted-foreground">
                        Sync tools are limited to EventAdmin for this event. Current access: {currentEventRole || 'No event role'}.
                    </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <OperationalMetricCard label="Participants" value={stats.total} icon={Users} tone="default" onClick={() => updateFilter('all')} />
                    <OperationalMetricCard label="Needs Placement" value={stats.unassigned} icon={User} tone="warning" onClick={() => updateFilter('unassigned')} />
                    <OperationalMetricCard label="Approvals" value={stats.missing} icon={Clock} tone="warning" onClick={() => updateFilter('missing')} />
                    <OperationalMetricCard label="Safety" value={stats.atRisk} icon={AlertTriangle} tone={stats.atRisk > 0 ? 'critical' : 'good'} onClick={() => updateFilter('at_risk')} />
                </div>

                <div className="space-y-2">
                    <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Needs Response</p>
                    {participantResponseItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {participantResponseItems.map((item) => (
                                <OperationalResponseCard
                                    key={item.key}
                                    label={item.label}
                                    detail={item.detail}
                                    count={item.count}
                                    tone={item.tone}
                                    action={item.action}
                                    onClick={() => updateFilter(item.key)}
                                />
                            ))}
                        </div>
                    ) : (
                        <OperationalEmptyResponse
                            title="No Escalations"
                            detail="Nothing urgent is demanding a participant follow-up right now."
                        />
                    )}
                </div>
            </div>

            {/* Search, Sort and Quick Filters */}
            <div className="surface-panel space-y-3 rounded-[1.35rem] p-3">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Find a participant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 h-10 bg-card border border-border rounded-lg text-sm focus:outline-none transition-all font-medium antialiased"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 h-10 text-[10px] font-bold uppercase tracking-wider focus:outline-none transition-all cursor-pointer antialiased"
                        >
                            <option value="name">Name</option>
                            <option value="age">Age</option>
                            <option value="readiness">Clearance</option>
                            <option value="recent">Recent</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => updateFilter('all')}
                        className={`min-h-11 rounded-full px-4 text-xs font-bold whitespace-nowrap transition-all ${activeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'surface-metric text-muted-foreground hover:bg-accent'}`}
                    >
                        All
                        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'all' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>{stats.total}</span>
                    </button>
                    <button
                        onClick={() => updateFilter('missing')}
                        className={`flex min-h-11 items-center space-x-1.5 rounded-full px-4 text-xs font-bold whitespace-nowrap transition-all ${activeFilter === 'missing' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'surface-metric text-muted-foreground hover:bg-accent'}`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Approvals Pending</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'missing' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>{stats.missing}</span>
                    </button>
                    <button
                        onClick={() => updateFilter('unassigned')}
                        className={`flex min-h-11 items-center space-x-1.5 rounded-full px-4 text-xs font-bold whitespace-nowrap transition-all ${activeFilter === 'unassigned' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'surface-metric text-muted-foreground hover:bg-accent'}`}
                    >
                        <User className="w-3.5 h-3.5" />
                        <span>Needs Placement</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'unassigned' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>{stats.unassigned}</span>
                    </button>
                    <button
                        onClick={() => updateFilter('at_risk')}
                        className={`flex min-h-11 items-center space-x-1.5 rounded-full px-4 text-xs font-bold whitespace-nowrap transition-all ${activeFilter === 'at_risk' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'surface-metric text-muted-foreground hover:bg-accent'}`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>At Risk</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === 'at_risk' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>{stats.atRisk}</span>
                    </button>
                    <div className="relative shrink-0">
                        <select
                            value={['special', 'ready', 'no_phone'].includes(activeFilter) ? activeFilter : ''}
                            onChange={(e) => updateFilter((e.target.value || 'all') as typeof activeFilter)}
                            className="min-h-11 appearance-none rounded-full border border-border bg-card pl-4 pr-9 text-xs font-bold uppercase tracking-wider text-muted-foreground focus:outline-none"
                        >
                            <option value="">More Filters</option>
                            <option value="special">Special Requests ({stats.special})</option>
                            <option value="no_phone">Missing Guardian Phone</option>
                            <option value="ready">Cleared</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                </div>
            </div>

            {error ? (
                <EmptyState
                    title="Connection Error"
                    description="We couldn't load the participants. Please check your connection."
                    icon={Users}
                />
            ) : !participants || participants.length === 0 ? (
                <EmptyState
                        title="No Participants Found"
                        description="Sync your participant list from a Google Sheet or CSV to get started."
                        icon={Users}
                        action={{
                            label: canManageSync ? 'Import Participants' : 'Sync Requires Event Admin',
                            onClick: () => {
                                if (!canManageSync) return;
                                const nextParams = new URLSearchParams(searchParams);
                                nextParams.set('action', 'import');
                                setSearchParams(nextParams, { replace: true });
                                setIsImportModalOpen(true);
                            }
                        }}
                    />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredParticipants?.map((participant) => {
                        const isExpanded = expandedId === participant.id;
                        const readiness = buildParticipantReadinessSummary(participant);
                        const isReady = readiness.status === 'cleared';
                        const approvalsPendingCount = (participant.assetStats?.pending || 0) + (participant.assetStats?.missing || 0);

                        return (
                            <div
                                key={participant.id}
                                className={`group bg-card rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-primary/20 border-primary/50 shadow-md' : 'border-border hover:border-primary/40 shadow-sm antialiased'}`}
                            >
                                {/* Compact Card Top */}
                                <div
                                    className="p-3 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : participant.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isReady ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm tracking-tight text-foreground">{participant.firstName} {participant.lastName}</h3>
                                                <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap">
                                                    {participant.age && (
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{participant.age} yrs</span>
                                                    )}
                                                    {participant.age ? <span className="w-0.5 h-0.5 rounded-full bg-border" /> : null}
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                                        {participant.actCount ? `${participant.actCount} Acts` : 'Needs Placement'}
                                                    </span>
                                                    {participant.isMinor ? (
                                                        <>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                                            <span className="text-[10px] font-medium text-muted-foreground uppercase">Minor</span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {isReady ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] h-5 px-2 font-bold uppercase rounded-md">
                                                    {readiness.badgeLabel}
                                                </Badge>
                                            ) : readiness.status === 'attention' ? (
                                                <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] h-5 px-2 font-bold uppercase rounded-md">
                                                    {readiness.badgeLabel}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-muted text-muted-foreground border-none text-[9px] h-5 px-2 font-bold uppercase rounded-md">
                                                    {readiness.badgeLabel}
                                                </Badge>
                                            )}
                                            <button
                                                className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wide text-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/participants/${participant.id}`);
                                                }}
                                            >
                                                <span>Open</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div className={`sm:col-span-2 rounded-xl border px-3 py-2.5 ${readiness.followUpTone}`}>
                                            <p className="text-[9px] font-black uppercase tracking-[0.18em]">Primary Follow-Up</p>
                                            <p className="mt-1 text-xs font-bold">{readiness.followUpLabel}</p>
                                            <p className="mt-1 text-xs leading-5 text-foreground/80">{readiness.followUpDetail}</p>
                                        </div>
                                        <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
                                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Quick Read</p>
                                            <p className="mt-1 text-xs font-bold text-foreground">{readiness.quickReadLabel}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{readiness.quickReadDetail}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Thumb-Friendly Action Bar */}
                                <div className="px-3 py-2.5 flex items-center justify-between border-t border-border/50 bg-accent/10">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            className="h-11 rounded-xl bg-indigo-600 px-3 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-indigo-500 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAssigningParticipant(participant.id);
                                            }}
                                        >
                                            Place
                                        </button>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {participant.guardianPhone && (
                                            <a
                                                href={`tel:${participant.guardianPhone}`}
                                                className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        <button
                                            className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center text-primary shadow-sm hover:border-primary/50 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNotingParticipant(participant.id);
                                            }}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            className="flex items-center space-x-1.5 h-11 px-4 bg-background border border-border rounded-xl text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm hover:bg-accent transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/participants/${participant.id}`);
                                            }}
                                        >
                                            <span>Details</span>
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Inline Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="p-4 rounded-xl bg-accent/30 space-y-4">
                                            {/* Guardian Info */}
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Guardian</p>
                                                    <p className="text-sm font-bold">{participant.guardianName || 'Unknown'}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase text-right">Relationship</p>
                                                    <p className="text-sm font-bold text-right">{participant.guardianRelationship || 'Parent/Guardian'}</p>
                                                </div>
                                            </div>

                                            {/* Assignment and blocker status */}
                                            <div className="space-y-2 pt-2 border-t border-border/50">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Assignment & Follow-Up</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${(participant.actCount || 0) > 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                        <span className="text-xs font-bold">{participant.actCount ? `${participant.actCount} Act${participant.actCount > 1 ? 's' : ''}` : 'Needs Placement'}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${participant.hasSpecialRequests ? 'bg-rose-500' : 'bg-muted'}`} />
                                                        <span className="text-xs font-bold">{participant.hasSpecialRequests ? 'Special Requests' : 'No Special Requests'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Document status */}
                                            <div className="space-y-2 pt-2 border-t border-border/50">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Docs & Approvals</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${participant.assetStats?.approved && participant.assetStats.approved > 0 ? 'bg-emerald-500' : 'bg-muted'}`} />
                                                        <span className="text-xs font-bold">{participant.assetStats?.approved || 0} Approved</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${approvalsPendingCount > 0 ? 'bg-amber-500' : 'bg-muted'}`} />
                                                        <span className="text-xs font-bold">{approvalsPendingCount} Approvals Pending</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {participant.isMinor && (!participant.guardianName || !participant.guardianPhone) && (
                                                <div className="p-3 rounded-lg border border-rose-600/20 bg-rose-600/5">
                                                    <p className="text-[10px] font-bold uppercase text-rose-700 tracking-widest mb-1">Minor Safety Follow-Up</p>
                                                    <p className="text-xs text-rose-700/90">Guardian name and phone need to be completed before the participant is considered clear.</p>
                                                </div>
                                            )}

                                            {/* Internal Note Summary */}
                                            {participant.notes && (
                                                <div className="mt-2 rounded-lg border border-border/50 bg-background/70 p-3">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Last Internal Note</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{participant.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ImportParticipantsModal
                eventId={eventId}
                isOpen={isImportModalOpen}
                onClose={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete('action');
                    setSearchParams(nextParams, { replace: true });
                    setIsImportModalOpen(false);
                }}
            />
            <AddParticipantModal
                eventId={eventId}
                isOpen={isAddParticipantOpen}
                onClose={() => setIsAddParticipantOpen(false)}
            />

            {/* Quick Assign Modal */}
            <Modal
                isOpen={!!assigningParticipant}
                onClose={() => setAssigningParticipant(null)}
                title="Add to Performance"
            >
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">Select a performance to assign this person to.</p>
                    <input
                        type="text"
                        value={actSearchQuery}
                        onChange={(e) => setActSearchQuery(e.target.value)}
                        placeholder="Search performances..."
                        className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="space-y-2">
                        {visibleActs.map(act => (
                            <button
                                key={act.id}
                                onClick={() => setSelectedActId(act.id)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selectedActId === act.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${selectedActId === act.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold">{act.name}</span>
                                </div>
                                {selectedActId === act.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                            </button>
                        ))}
                        {visibleActs.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm font-medium text-muted-foreground">
                                No performances match "{actSearchQuery}".
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={() => {
                            setAssigningParticipant(null);
                            setSelectedActId('');
                            setActSearchQuery('');
                        }}>Cancel</Button>
                        <Button onClick={handleAssign} disabled={!selectedActId || assignMutation.isPending}>
                            {assignMutation.isPending ? 'Assigning...' : 'Confirm Placement'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Quick Note Modal */}
            <Modal
                isOpen={!!notingParticipant}
                onClose={() => setNotingParticipant(null)}
                title="Quick Operational Note"
            >
                <div className="space-y-4 py-4">
                    <div className="flex p-1 bg-muted rounded-xl space-x-1">
                        {(['operational', 'internal', 'special_request'] as const).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setNoteCategory(cat)}
                                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${noteCategory === cat ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {cat.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Type your note here..."
                        className="w-full h-32 p-4 bg-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={() => setNotingParticipant(null)}>Cancel</Button>
                        <Button onClick={handleAddNote} disabled={!noteContent.trim() || noteMutation.isPending}>
                            {noteMutation.isPending ? 'Saving...' : 'Save Note'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
