import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Database, FileSpreadsheet, Link2, Loader2, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ImportParticipantsModal } from '@/components/participants/ImportParticipantsModal';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useEventSources } from '@/hooks/useEventSources';
import { OperationalMetricCard } from '@/components/ui/OperationalCards';
import { useOnboardingCapabilities } from '@/hooks/useOnboardingCapabilities';
import { Button } from '@/components/ui/Button';

export default function ImportDataPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { organizationId, eventId } = useSelection();
    const { data: currentEventRole, isLoading: isLoadingEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole, isLoading: isLoadingOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false, isLoading: isLoadingSuperAdmin } = useIsSuperAdmin();
    const { sources } = useEventSources(eventId || '');
    const [isMethodsOpen, setIsMethodsOpen] = useState(false);
    const onboardingCapabilities = useOnboardingCapabilities(organizationId || null, eventId || null);

    const canOpenAdmin =
        isSuperAdmin
        || currentEventRole === 'EventAdmin'
        || currentOrgRole === 'Owner'
        || currentOrgRole === 'Admin';

    const sourceStats = useMemo(() => {
        const total = sources.length;
        const withMappingGaps = sources.filter((source) => source.config.reviewRequired || (source.config.mappingGaps?.length || 0) > 0).length;
        const locked = sources.filter((source) => source.config.mappingMode === 'locked' && !source.config.reviewRequired).length;
        const trustedSynced = sources.filter((source) => source.config.mappingMode === 'locked' && !source.config.reviewRequired && !!source.lastSyncedAt).length;
        return { total, withMappingGaps, locked, trustedSynced };
    }, [sources]);
    const initialMode = searchParams.get('action') === 'import' ? 'add_source_select' : 'dashboard';
    const initialTarget = searchParams.get('target') === 'performance_requests' ? 'performance_requests' : 'participants';

    if (isLoadingEventRole || isLoadingOrgRole || isLoadingSuperAdmin || onboardingCapabilities.isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canOpenAdmin) {
        return (
            <div className="space-y-5">
                <PageHeader title="Import Data" subtitle="Source connections and mapping review are limited to event admins and organization admins." />
                <div className="surface-panel rounded-[1.35rem] border p-6 text-sm text-muted-foreground">
                    This event context does not grant import-management access.
                </div>
            </div>
        );
    }

    const importsLocked = !onboardingCapabilities.canUseImports;

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Import Data"
                subtitle="Add event files, review source mappings, and refresh imported data for this event."
                actions={importsLocked ? undefined : (
                    <Button
                        onClick={() => setSearchParams({ action: 'import' })}
                        className="h-11 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                    >
                        Add Import
                    </Button>
                )}
            />

            {importsLocked ? (
                <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                    Pilot review is still pending for this organization. Large imports and external source sync stay limited until internal approval is complete.
                </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
                <OperationalMetricCard
                    label="Connected Imports"
                    value={sourceStats.total}
                    icon={Database}
                    tone="default"
                    className="min-h-[80px]"
                />
                <OperationalMetricCard
                    label="Need Mapping Review"
                    value={sourceStats.withMappingGaps}
                    icon={Sparkles}
                    tone={sourceStats.withMappingGaps > 0 ? 'warning' : 'good'}
                    className="min-h-[80px]"
                />
                <OperationalMetricCard
                    label="Locked Sources"
                    value={sourceStats.locked}
                    icon={Link2}
                    tone={sourceStats.locked > 0 ? 'good' : 'default'}
                    className="min-h-[80px]"
                />
                <OperationalMetricCard
                    label="Trusted Sync Ready"
                    value={sourceStats.trustedSynced}
                    icon={FileSpreadsheet}
                    tone={sourceStats.trustedSynced > 0 ? 'good' : 'info'}
                    className="min-h-[80px]"
                />
            </div>

            <div className="space-y-3">
                {importsLocked ? null : (
                    <ImportParticipantsModal
                        eventId={eventId || ''}
                        isOpen
                        embedded
                        initialMode={initialMode}
                        initialTarget={initialTarget}
                        onClose={() => {
                            const nextParams = new URLSearchParams(searchParams);
                            nextParams.delete('action');
                            nextParams.delete('target');
                            setSearchParams(nextParams, { replace: true });
                        }}
                    />
                )}

                <button
                    type="button"
                    onClick={() => setIsMethodsOpen((current) => !current)}
                    className="surface-panel w-full rounded-[1.35rem] p-3.5 text-left sm:p-4"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Import Methods</p>
                            <p className="mt-1 text-[13px] font-semibold text-foreground sm:text-sm">This workspace is event-specific. Bring participant or performance-request data into this event only.</p>
                        </div>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isMethodsOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isMethodsOpen ? (
                        <div className="mt-3 space-y-2.5">
                            <div className="rounded-[1.1rem] border border-border/70 bg-background/80 p-3.5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl border border-border/70 bg-accent/15 p-3 text-primary">
                                        <Link2 className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-foreground">Connect Google Sheet</p>
                                        <p className="text-sm text-muted-foreground">Use when the source should stay refreshable over time.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-[1.1rem] border border-border/70 bg-background/80 p-3.5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl border border-border/70 bg-accent/15 p-3 text-primary">
                                        <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-foreground">Upload Spreadsheet</p>
                                        <p className="text-sm text-muted-foreground">Use for one-off event imports and manual external files.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </button>
            </div>
        </div>
    );
}
