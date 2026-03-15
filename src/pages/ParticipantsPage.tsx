import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useParticipantsQuery } from '@/hooks/useParticipants';
import { useSelection } from '@/context/SelectionContext';
import { ImportParticipantsModal } from '@/components/participants/ImportParticipantsModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    Users,
    RefreshCw,
    AlertCircle,
    Search,
    User,
    Loader2,
    Phone,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowUpRight,
    Plus,
    Database,
    ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAssignToAct, useAddParticipantNote } from '@/hooks/useParticipants';
import { useActsQuery } from '@/hooks/useActs';

export default function ParticipantsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { eventId } = useSelection();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'unassigned' | 'special' | 'ready' | 'no_phone' | 'identity_pending'>('all');
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

    // Mutations/Hooks
    const { data: allActs } = useActsQuery(eventId || '');
    const assignMutation = useAssignToAct(assigningParticipant || '');
    const noteMutation = useAddParticipantNote(notingParticipant || '');

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        const actionParam = searchParams.get('action');

        if (filterParam && ['all', 'missing', 'unassigned', 'special', 'ready', 'no_phone', 'identity_pending'].includes(filterParam)) {
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

    const getReadinessScore = (p: any) => {
        if (!p.assetStats?.total) return 0;
        const assetScore = (p.assetStats.approved || 0) / p.assetStats.total;
        const actScore = p.actCount ? 1 : 0;
        return (assetScore + actScore) / 2;
    };

    const stats = {
        total: participants?.length || 0,
        assigned: participants?.filter(p => (p.actCount || 0) > 0).length || 0,
        missing: participants?.filter(p => (p.assetStats?.missing || 0) > 0).length || 0,
        unassigned: participants?.filter(p => !p.actCount).length || 0,
        special: participants?.filter(p => p.hasSpecialRequests).length || 0
    };

    const filteredParticipants = participants?.filter(p => {
        const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'missing') return (p.assetStats?.missing || 0) > 0;
        if (activeFilter === 'unassigned') return !p.actCount;
        if (activeFilter === 'special') return p.hasSpecialRequests;
        if (activeFilter === 'ready') return (p.assetStats?.missing === 0 && p.assetStats?.total > 0) && (p.actCount || 0) > 0;
        if (activeFilter === 'no_phone') return !p.guardianPhone;
        if (activeFilter === 'identity_pending') return !p.identityVerified;

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

    const { data: eventData } = useQuery({
        queryKey: ['event-metadata', eventId],
        queryFn: async () => {
            if (!eventId) return null;
            const { data } = await supabase.from('events').select('last_synced_at, source_url').eq('id', eventId).single();
            return data;
        },
        enabled: !!eventId
    });

    if (isLoading || !eventId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading roster...</p>
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

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Event Roster</h1>
                    <div className="flex flex-col space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">
                            {participants?.length || 0} People on Roster
                        </p>
                        {eventId && (
                            <div className={`flex items-center text-[10px] font-bold uppercase tracking-tighter ${isSyncOld(eventData?.last_synced_at || null) ? 'text-amber-500 animate-pulse' : 'text-emerald-500/80'}`}>
                                <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isSyncOld(eventData?.last_synced_at || null) ? 'animate-spin-slow' : ''}`} />
                                {eventData?.last_synced_at ? `Synced ${formatLastSynced(eventData.last_synced_at)}` : 'Sync Required'}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('action', 'import');
                        setSearchParams(nextParams, { replace: true });
                        setIsImportModalOpen(true);
                    }}
                    className="flex items-center space-x-2 bg-primary text-primary-foreground h-9 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Now</span>
                </button>
            </div>

            {/* Operational Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div onClick={() => updateFilter('all')} className={`p-3 rounded-lg border transition-all cursor-pointer antialiased ${activeFilter === 'all' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border hover:border-primary/50'}`}>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Total</p>
                        <p className="text-xl font-bold mt-0.5">{stats.total}</p>
                    </div>
                    <div onClick={() => updateFilter('unassigned')} className={`p-3 rounded-lg border transition-all cursor-pointer antialiased ${activeFilter === 'unassigned' ? 'bg-indigo-500/5 border-indigo-500 shadow-sm' : 'bg-card border-border hover:border-indigo-500/50'}`}>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-600">Needs Placement</p>
                        <p className="text-xl font-bold mt-0.5">{stats.unassigned}</p>
                    </div>
                    <div onClick={() => updateFilter('missing')} className={`p-3 rounded-lg border transition-all cursor-pointer antialiased ${activeFilter === 'missing' ? 'bg-amber-500/5 border-amber-500 shadow-sm' : 'bg-card border-border hover:border-amber-500/50'}`}>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-amber-600">Docs Pending</p>
                        <p className="text-xl font-bold mt-0.5">{stats.missing}</p>
                    </div>
                    <div onClick={() => updateFilter('special')} className={`p-3 rounded-lg border transition-all cursor-pointer antialiased ${activeFilter === 'special' ? 'bg-rose-500/5 border-rose-500 shadow-sm' : 'bg-card border-border hover:border-rose-500/50'}`}>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-rose-600">Special</p>
                        <p className="text-xl font-bold mt-0.5">{stats.special}</p>
                    </div>
                    <div onClick={() => updateFilter('ready')} className={`p-3 rounded-lg border transition-all cursor-pointer antialiased ${activeFilter === 'ready' ? 'bg-emerald-500/5 border-emerald-500 shadow-sm' : 'bg-card border-border hover:border-emerald-500/50'}`}>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-600">Assigned</p>
                        <p className="text-xl font-bold mt-0.5">{stats.assigned}</p>
                    </div>
                </div>

            {/* Search, Sort and Quick Filters */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Find someone on the roster..."
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
                            <option value="readiness">Ready</option>
                            <option value="recent">Recent</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                    <button
                        onClick={() => updateFilter('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => updateFilter('ready')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${activeFilter === 'ready' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready</span>
                    </button>
                    <button
                        onClick={() => updateFilter('missing')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${activeFilter === 'missing' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Docs Pending</span>
                    </button>
                    <button
                        onClick={() => updateFilter('unassigned')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${activeFilter === 'unassigned' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        <User className="w-3.5 h-3.5" />
                        <span>Needs Placement</span>
                    </button>
                    <button
                        onClick={() => updateFilter('special')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${activeFilter === 'special' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Special Requests</span>
                    </button>
                    <button
                        onClick={() => updateFilter('no_phone')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${activeFilter === 'no_phone' ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        <Phone className="w-3.5 h-3.5" />
                        <span>No Phone</span>
                    </button>
                    <button
                        onClick={() => updateFilter('identity_pending')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${activeFilter === 'identity_pending' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105' : 'bg-card text-muted-foreground border border-border hover:bg-accent'}`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Identity Verification Needed</span>
                    </button>
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
                            label: 'Import Participants',
                            onClick: () => {
                                const nextParams = new URLSearchParams(searchParams);
                                nextParams.set('action', 'import');
                                setSearchParams(nextParams, { replace: true });
                                setIsImportModalOpen(true);
                            }
                        }}
                    />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredParticipants?.map((participant) => {
                        const isExpanded = expandedId === participant.id;
                        const isReady = (participant.assetStats?.missing === 0 && participant.assetStats?.total > 0) && (participant.actCount || 0) > 0;

                        return (
                            <div
                                key={participant.id}
                                className={`group bg-card rounded-lg border transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-primary/20 border-primary/50 shadow-md' : 'border-border hover:border-primary/40 shadow-sm antialiased'}`}
                            >
                                {/* Compact Card Top */}
                                <div
                                    className="p-3 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : participant.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isReady ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm tracking-tight text-foreground">{participant.firstName} {participant.lastName}</h3>
                                                <div className="flex items-center space-x-1.5 mt-0.5">
                                                    {participant.age && (
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{participant.age} yrs</span>
                                                    )}
                                                    <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                                        {participant.actCount ? `${participant.actCount} Acts` : 'Needs Placement'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            {isReady ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] h-5 px-2 font-bold uppercase rounded-md">
                                                    Ready
                                                </Badge>
                                            ) : (participant.assetStats?.missing || 0) > 0 ? (
                                                <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] h-5 px-2 font-bold uppercase rounded-md">
                                                    Requires Work
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-muted text-muted-foreground border-none text-[9px] h-5 px-2 font-bold uppercase rounded-md">
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Info Tags */}
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {participant.actCount ? (
                                            <div className="flex items-center px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[9px] font-bold uppercase">
                                                <User className="w-3 h-3 mr-1" />
                                                {participant.actCount} Acts
                                            </div>
                                        ) : (
                                            <div className="flex items-center px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[9px] font-bold uppercase">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Needs Placement
                                            </div>
                                        )}
                                        {participant.hasSpecialRequests && (
                                            <div className="flex items-center px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[9px] font-bold uppercase">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Review
                                            </div>
                                        )}
                                        {participant.assetStats?.missing ? (
                                            <div className="flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[9px] font-bold uppercase">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {participant.assetStats.missing} Docs
                                            </div>
                                        ) : null}
                                        {!participant.guardianPhone && (
                                            <div className="flex items-center px-1.5 py-0.5 rounded-md bg-slate-700/10 text-slate-600 text-[9px] font-bold uppercase">
                                                <Phone className="w-3 h-3 mr-1" />
                                                No Phone
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Thumb-Friendly Action Bar */}
                                <div className="px-3 py-2.5 flex items-center justify-between border-t border-border/50 bg-accent/10">
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
                                            className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center text-indigo-600 shadow-sm hover:border-indigo-500/50 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAssigningParticipant(participant.id);
                                            }}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
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
                                                    <p className="text-sm font-bold text-right">Parent/Guardian</p>
                                                </div>
                                            </div>

                                            {/* Asset List Status */}
                                            <div className="space-y-2 pt-2 border-t border-border/50">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Asset Readiness</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${participant.assetStats?.approved && participant.assetStats.approved > 0 ? 'bg-emerald-500' : 'bg-muted'}`} />
                                                        <span className="text-xs font-bold">{participant.assetStats?.approved || 0} Approved</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${participant.assetStats?.missing && participant.assetStats.missing > 0 ? 'bg-amber-500' : 'bg-muted'}`} />
                                                        <span className="text-xs font-bold">{participant.assetStats?.missing || 0} Forms Pending</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Internal Note Summary */}
                                            {participant.notes && (
                                                <div className="p-3 rounded-lg bg-white/50 border border-border/50 mt-2">
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
                                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${noteCategory === cat ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
