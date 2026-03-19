import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import {
  Loader2,
  Check,
  Play,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  LayoutPanelTop,
  WandSparkles,
  ChevronDown,
  ChevronUp,
  Music4,
} from 'lucide-react';
import type { IntroComposition, IntroCurationItem } from '@/types/domain';
import { IntroVideoPlayer } from '@/components/console/IntroVideoPlayer';
import {
  approveIntroComposition,
  buildIntroComposition,
  curateIntroPhotos,
  generateIntroAudio,
  generateIntroBackground,
  getIntroComposition,
  IntroCapabilityError,
  prepareIntroAutopilot,
} from '@/lib/introCapabilities';

interface ParticipantAsset {
  id: string;
  name: string;
  file_url: string;
  status: string | null;
  participant_id: string;
  participant?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface IntroVideoBuilderProps {
  actId: string;
  onComplete?: (url: string) => void;
}

const BACKGROUND_POLL_LIMIT = 12;
const BACKGROUND_POLL_INTERVAL_MS = 5000;
const TITLE_CARD_SECONDS = 3;
const OUTRO_HOLD_SECONDS = 2;

function getAssetDisplayLabel(asset: ParticipantAsset, index: number) {
  const participantName = [asset.participant?.first_name, asset.participant?.last_name].filter(Boolean).join(' ').trim();
  return participantName || asset.name?.trim() || `Performer ${index + 1}`;
}

function BrokenAssetTile({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center bg-muted text-muted-foreground ${compact ? 'gap-1 px-2 py-3' : 'gap-2 px-3 py-4'}`}>
      <ImageIcon className={compact ? 'h-4 w-4 opacity-60' : 'h-8 w-8 opacity-50'} />
      <span className={`text-center font-black uppercase tracking-[0.18em] ${compact ? 'text-[8px]' : 'text-[10px]'}`}>Asset Unavailable</span>
      <span className={`text-center ${compact ? 'text-[8px]' : 'text-[11px]'} leading-tight`}>{label}</span>
    </div>
  );
}

function formatDurationMs(value?: number | null) {
  if (!value || value <= 0) return null;
  const seconds = Math.max(1, Math.round(value / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatElapsedSince(value?: string | null) {
  if (!value) return null;
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  return formatDurationMs(diffMs);
}

function formatStoryboardTimestamp(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const IntroVideoBuilder: React.FC<IntroVideoBuilderProps> = ({ actId }) => {
  const [assets, setAssets] = useState<ParticipantAsset[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [compositionState, setCompositionState] = useState<IntroComposition | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundSource, setBackgroundSource] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isCurating, setIsCurating] = useState(false);
  const [curationSuggestions, setCurationSuggestions] = useState<IntroCurationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [compositionId, setCompositionId] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [brokenAssetIds, setBrokenAssetIds] = useState<string[]>([]);
  const [isBackgroundBroken, setIsBackgroundBroken] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState<'idle' | 'pending' | 'ready' | 'timed_out'>('idle');
  const [backgroundPollCount, setBackgroundPollCount] = useState(0);
  const [isRefreshingBackground, setIsRefreshingBackground] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [telemetryInsights, setTelemetryInsights] = useState<{
    averageDurationMs: number | null;
    successRate: number | null;
    sampleCount: number;
  }>({ averageDurationMs: null, successRate: null, sampleCount: 0 });
  const backgroundPollIntervalRef = useRef<number | null>(null);

  const hasSelectedAssets = selectedIds.length > 0;
  const hasCuration = curationSuggestions.length > 0;
  const hasBackground = Boolean(backgroundUrl);
  const generationMeta = compositionState?.generation;
  const hasPreview = hasSelectedAssets || hasBackground;
  const isPreparing = isCurating || isGeneratingBackground || backgroundStatus === 'pending' || generationMeta?.status === 'preparing';
  const backgroundSourceLabel = backgroundSource === 'fallback_background'
    ? 'Fallback Backdrop'
    : backgroundSource === 'generated_background' || backgroundSource === 'generative_background'
      ? 'AI Backdrop'
      : backgroundSource === 'intro_requirement'
        ? 'Saved Backdrop'
        : hasBackground
          ? 'Backdrop Ready'
          : 'Needed for stage approval';
  const audioSourceLabel = audioSource === 'act_audio_requirement'
    ? 'Performance Music Linked'
    : audioSource === 'generated_tts'
      ? 'Legacy Generated Audio'
      : audioUrl
        ? 'Audio Ready'
        : 'No performance audio linked yet';
  const approvalBlockers = [
    !hasSelectedAssets ? 'Select at least one approved participant photo.' : null,
    hasSelectedAssets && !hasCuration ? 'Prepare the intro so photos are arranged for playback.' : null,
    hasCuration && !hasBackground ? 'Finish the intro background before approval.' : null,
  ].filter(Boolean) as string[];
  const elapsedPrepareTime = generationMeta?.status === 'preparing' ? formatElapsedSince(generationMeta.startedAt || generationMeta.lastPreparedAt) : null;
  const lastPrepareDuration = formatDurationMs(generationMeta?.lastDurationMs);
  const estimatedReadyTime = formatDurationMs(telemetryInsights.averageDurationMs);
  const actSuccessRate = generationMeta?.totalAttempts
    ? Math.max(0, Math.round(((generationMeta.totalAttempts - (generationMeta.failedAttempts || 0)) / generationMeta.totalAttempts) * 100))
    : null;
  const eventFailureRate = telemetryInsights.successRate != null
    ? Math.max(0, 100 - Math.round(telemetryInsights.successRate))
    : null;
  const actFailureRate = actSuccessRate != null
    ? Math.max(0, 100 - actSuccessRate)
    : null;
  const previewParticipants = assets.map((asset, index) => ({
    id: asset.participant_id,
    firstName: asset.participant?.first_name || getAssetDisplayLabel(asset, index),
    lastName: asset.participant?.last_name || '',
    assets: [{ id: asset.id, fileUrl: asset.file_url }],
  }));
  const playbackComposition: IntroComposition | null = compositionState
    ? {
        ...compositionState,
        selectedAssetIds: selectedIds,
        curation: curationSuggestions,
        background: {
          ...compositionState.background,
          fileUrl: backgroundUrl,
          source: backgroundSource,
        },
        audio: {
          ...compositionState.audio,
          fileUrl: audioUrl,
          source: audioSource,
        },
      }
    : null;
  const totalStoryboardSeconds = curationSuggestions.reduce((sum, suggestion) => sum + (suggestion.timing || 3), 0);
  const totalPlaybackSeconds = curationSuggestions.length > 0
    ? TITLE_CARD_SECONDS + totalStoryboardSeconds + OUTRO_HOLD_SECONDS
    : 0;
  const hasTimingChanges = JSON.stringify(curationSuggestions.map(({ id, timing }) => ({ id, timing })))
    !== JSON.stringify((compositionState?.curation || []).map(({ id, timing }) => ({ id, timing })));
  const storyboardFrames = curationSuggestions.map((suggestion, index) => {
    const asset = assets.find((candidate) => candidate.id === suggestion.id);
    const cueStartSeconds = TITLE_CARD_SECONDS
      + curationSuggestions
        .slice(0, index)
        .reduce((sum, item) => sum + (item.timing || 3), 0);

    return {
      id: suggestion.id,
      index,
      asset,
      label: asset ? getAssetDisplayLabel(asset, index) : `Performer ${index + 1}`,
      cueStartSeconds,
      cueStartLabel: formatStoryboardTimestamp(cueStartSeconds),
      timing: suggestion.timing || 3,
      pacing: suggestion.pacing || 'Cinematic',
      focalPoint: suggestion.focalPoint || 'Center',
      narrative: suggestion.narrative || 'Spotlight moment',
    };
  });

  const syncFromComposition = (composition: IntroComposition, nextCompositionId: string | null) => {
    setCompositionState(composition);
    setCompositionId(nextCompositionId);
    setBackgroundUrl(composition.background.fileUrl);
    setBackgroundSource(composition.background.source ?? null);
    setAudioUrl(composition.audio.fileUrl);
    setAudioSource(composition.audio.source ?? null);
    setIsApproved(composition.approved);
    setSelectedIds(composition.selectedAssetIds || []);
    setCurationSuggestions(composition.curation || []);
    setIsBackgroundBroken(false);
    setBackgroundStatus(
      composition.generation?.status === 'preparing'
        ? 'pending'
        : composition.background.fileUrl
          ? 'ready'
          : 'idle'
    );
  };

  const resetCompositionState = () => {
    if (backgroundPollIntervalRef.current) {
      window.clearInterval(backgroundPollIntervalRef.current);
      backgroundPollIntervalRef.current = null;
    }
    setSelectedIds([]);
    setCompositionState(null);
    setBackgroundUrl(null);
    setBackgroundSource(null);
    setAudioUrl(null);
    setAudioSource(null);
    setCurationSuggestions([]);
    setCompositionId(null);
    setIsApproved(false);
    setInfoMessage(null);
    setBrokenAssetIds([]);
    setIsBackgroundBroken(false);
    setBackgroundStatus('idle');
    setBackgroundPollCount(0);
    setIsRefreshingBackground(false);
  };

  const orderSelectedIdsByCuration = (currentSelectedIds: string[], suggestions: IntroCurationItem[]) => {
    const suggestedIds = suggestions
      .map((suggestion) => suggestion.id)
      .filter((id) => currentSelectedIds.includes(id));

    const remainingIds = currentSelectedIds.filter((id) => !suggestedIds.includes(id));

    return [...suggestedIds, ...remainingIds];
  };

  useEffect(() => {
    init();
  }, [actId]);

  useEffect(() => {
    return () => {
      if (backgroundPollIntervalRef.current) {
        window.clearInterval(backgroundPollIntervalRef.current);
        backgroundPollIntervalRef.current = null;
      }
    };
  }, []);

  const init = async () => {
    setIsLoading(true);
    resetCompositionState();
    setErrorMessage(null);
    try {
      await fetchAssets();
      await fetchComposition();
      await fetchTelemetryInsights();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load intro composition');
    }
    setIsLoading(false);
  };

  const fetchAssets = async () => {
    const { data: actParts, error: partsError } = await supabase
      .from('act_participants')
      .select('participant_id')
      .eq('act_id', actId);

    if (partsError) return;
    const pIds = actParts.map(p => p.participant_id);
    setParticipantCount(pIds.length);

    const { data: participantAssets, error: assetError } = await supabase
      .from('participant_assets')
      .select('id, name, file_url, status, participant_id, participant:participants(first_name, last_name)')
      .in('participant_id', pIds)
      .eq('type', 'photo')
      .eq('status', 'approved');

    if (!assetError) setAssets(participantAssets || []);
  };

  const fetchComposition = async () => {
    const result = await getIntroComposition(actId);
    syncFromComposition(result.composition, result.compositionId);
  };

  const fetchTelemetryInsights = async () => {
    const { data: currentAct, error: currentActError } = await supabase
      .from('acts')
      .select('event_id')
      .eq('id', actId)
      .single();

    if (currentActError || !currentAct?.event_id) return;

    const { data: eventActs, error: eventActsError } = await supabase
      .from('acts')
      .select('act_requirements(description, requirement_type)')
      .eq('event_id', currentAct.event_id);

    if (eventActsError) return;

    const compositions = (eventActs || [])
      .flatMap((act: any) => act.act_requirements || [])
      .filter((requirement: any) => requirement.requirement_type === 'IntroComposition')
      .map((requirement: any) => {
        try {
          return JSON.parse(requirement.description || '{}') as IntroComposition;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as IntroComposition[];

    const durations = compositions
      .map((composition) => composition.generation?.lastDurationMs)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    const attempts = compositions.reduce((sum, composition) => sum + (composition.generation?.totalAttempts || 0), 0);
    const failedAttempts = compositions.reduce((sum, composition) => sum + (composition.generation?.failedAttempts || 0), 0);

    setTelemetryInsights({
      averageDurationMs: durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
      successRate: attempts > 0 ? ((attempts - failedAttempts) / attempts) * 100 : null,
      sampleCount: compositions.length,
    });
  };

  const clearBackgroundPolling = () => {
    if (backgroundPollIntervalRef.current) {
      window.clearInterval(backgroundPollIntervalRef.current);
      backgroundPollIntervalRef.current = null;
    }
  };

  const refreshBackgroundStatus = async (manual = false) => {
    if (manual) {
      setIsRefreshingBackground(true);
      setErrorMessage(null);
    }

    try {
      const refreshed = await getIntroComposition(actId);
      syncFromComposition(refreshed.composition, refreshed.compositionId);

      if (refreshed.composition.background.fileUrl) {
        clearBackgroundPolling();
        setBackgroundStatus('ready');
        setInfoMessage('Intro preview updated. Review it before stage approval.');
        return true;
      }

      return false;
    } catch (error) {
      if (manual) {
        setErrorMessage(error instanceof Error ? error.message : 'Background status refresh failed');
      }
      return false;
    } finally {
      if (manual) {
        setIsRefreshingBackground(false);
      }
    }
  };

  const startBackgroundPolling = () => {
    clearBackgroundPolling();
    setBackgroundStatus('pending');
    setBackgroundPollCount(0);

    backgroundPollIntervalRef.current = window.setInterval(async () => {
      setBackgroundPollCount((currentCount) => currentCount + 1);

      const foundBackground = await refreshBackgroundStatus(false);
      if (foundBackground) {
        return;
      }

      setBackgroundPollCount((currentCount) => {
        if (currentCount >= BACKGROUND_POLL_LIMIT) {
          clearBackgroundPolling();
          setBackgroundStatus('timed_out');
          setInfoMessage('The backdrop is still publishing. Check once more before trying approval again.');
        }
        return currentCount;
      });
    }, BACKGROUND_POLL_INTERVAL_MS);
  };

  const saveComposition = async ({
    approved = false,
    selectedAssetIds = selectedIds,
    curation = curationSuggestions,
    fileUrl = backgroundUrl,
  }: {
    approved?: boolean;
    selectedAssetIds?: string[];
    curation?: IntroCurationItem[];
    fileUrl?: string | null;
  } = {}) => {
    setIsSaving(true);
    setErrorMessage(null);
    const metadata: IntroComposition = {
      version: '2026-03-18',
      selectedAssetIds,
      curation,
      background: {
        fileUrl,
        source: fileUrl ? backgroundSource ?? 'generated_background' : null,
        stylePreset: null,
      },
      audio: {
        fileUrl: audioUrl,
        source: audioUrl ? audioSource : null,
        optional: true,
      },
      credits: compositionState?.credits || [],
      generation: compositionState?.generation,
      approved,
      lastUpdated: new Date().toISOString()
    };
    try {
      const result = approved
        ? await approveIntroComposition(actId)
        : await buildIntroComposition(actId, metadata.selectedAssetIds, {
            curation: metadata.curation,
            background: metadata.background,
            audio: metadata.audio,
          });

      syncFromComposition(result.composition, result.compositionId);

      if (approved) {
        setInfoMessage('Intro approved for stage playback.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save intro composition');
    } finally {
      setIsSaving(false);
    }
  };

  const generateBackground = async () => {
    setIsGeneratingBackground(true);
    setErrorMessage(null);
    setInfoMessage(null);
    clearBackgroundPolling();
    setBackgroundPollCount(0);
    try {
      const previousBackgroundUrl = backgroundUrl;
      const result = await generateIntroBackground(actId);
      syncFromComposition(result.composition, result.compositionId);

      if (result.isPending) {
        setBackgroundStatus('pending');
        setInfoMessage(result.message || 'Background generation is still processing.');
        startBackgroundPolling();
      } else if (!result.composition.background.fileUrl || result.composition.background.fileUrl === previousBackgroundUrl) {
        setBackgroundStatus('timed_out');
        setInfoMessage('Background request completed, but no new image was published yet.');
      } else {
        setBackgroundStatus('ready');
        setInfoMessage(result.message || 'Intro draft is ready for review.');
      }
    } catch (err) {
      setBackgroundStatus(backgroundUrl ? 'ready' : 'idle');
      setErrorMessage(err instanceof Error ? err.message : 'Background generation failed');
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const syncPerformanceAudio = async () => {
    setIsGeneratingAudio(true);
    setErrorMessage(null);
    try {
      const result = await generateIntroAudio(actId);
      syncFromComposition(result.composition, result.compositionId);
      setInfoMessage(result.message || 'Performance audio linked.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Performance audio sync failed');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const curateAssets = async (assetIds = selectedIds) => {
    if (assetIds.length === 0) return false;
    setIsCurating(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const result = await curateIntroPhotos(actId, assetIds);
      syncFromComposition(result.composition, result.compositionId);
      return true;
    } catch (err) {
      const message = err instanceof IntroCapabilityError ? err.message : err instanceof Error ? err.message : 'Curation failed';
      setErrorMessage(message);
      return false;
    } finally {
      setIsCurating(false);
    }
  };

  const prepareIntro = async () => {
    if (isApproved) {
      setInfoMessage('This intro is already approved. Use review instead of preparing a new draft.');
      return;
    }

    if (assets.length === 0) {
      setErrorMessage(
        participantCount === 0
          ? 'Add cast before preparing an intro.'
          : 'Approve at least one participant photo before preparing an intro.',
      );
      return;
    }

    setErrorMessage(null);
    setInfoMessage('Preparing the intro draft in the background.');
    setIsCurating(true);
    try {
      const result = await prepareIntroAutopilot(actId);
      syncFromComposition(result.composition, result.compositionId);
      if (result.isPending) {
        setBackgroundStatus('pending');
        setInfoMessage(result.message || 'Intro draft is still preparing in the background.');
        startBackgroundPolling();
      } else {
        setBackgroundStatus(result.composition.background.fileUrl ? 'ready' : 'idle');
        setInfoMessage(result.message || 'Intro draft is ready for review.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Intro preparation failed');
    } finally {
      setIsCurating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => orderSelectedIdsByCuration(prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id], []));
    setCurationSuggestions([]);
    setIsApproved(false);
    setErrorMessage(null);
  };

  const markAssetBroken = (id: string) => {
    setBrokenAssetIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const updateSceneTiming = (assetId: string, timing: number) => {
    setCurationSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === assetId ? { ...suggestion, timing } : suggestion,
      ),
    );
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  const liveStatus = (generationMeta?.status as string | undefined)
    || (isApproved
      ? 'approved'
      : isPreparing
        ? 'preparing'
        : hasBackground && hasCuration
          ? 'ready_for_review'
          : compositionId
            ? 'ready_for_review'
            : 'not_started');
  const statusLabel = liveStatus === 'approved'
    ? 'Approved'
    : liveStatus === 'preparing'
      ? 'Preparing'
      : liveStatus === 'ready_for_review'
        ? 'Ready for Review'
        : 'Not Started';
  const primaryActionLabel = isApproved ? 'Approved for Stage' : hasBackground && hasCuration ? 'Approve for Stage' : 'Prepare Performance Intro';

  return (
    <>
      <Card className="space-y-5 rounded-[2rem] border-border/60 bg-card/80 p-5 shadow-xl shadow-slate-900/10 dark:shadow-black/30">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 text-primary">
                <LayoutPanelTop className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Intro Studio</p>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Prepare Performance Intro</h2>
              </div>
              <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                isApproved
                  ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
                  : isPreparing
                    ? 'border border-amber-500/25 bg-amber-500/10 text-amber-600'
                    : hasBackground && hasCuration
                      ? 'border border-primary/25 bg-primary/10 text-primary'
                      : 'border border-border/80 bg-muted/40 text-muted-foreground'
              }`}>
                {statusLabel}
              </div>
            </div>
            <p className="max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
              One pass prepares the cast photos, links the uploaded performance music, builds the backdrop, and leaves you with a draft to review before stage approval.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant={isApproved ? 'outline' : 'default'}
              onClick={() => {
                if (hasBackground && hasCuration && !isApproved) {
                  void saveComposition({ approved: true });
                  return;
                }
                if (!isApproved) {
                  void prepareIntro();
                  return;
                }
                setIsPreviewOpen(true);
              }}
              disabled={isPreparing || isSaving || (isApproved && !hasPreview)}
              className={`min-h-[44px] rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.18em] ${isApproved ? 'border-border/80' : 'shadow-lg shadow-primary/20'}`}
            >
              {isPreparing || isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isApproved ? <Play className="mr-2 h-4 w-4" /> : hasBackground && hasCuration ? <Check className="mr-2 h-4 w-4" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              {primaryActionLabel}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (hasBackground && hasCuration) {
                  setIsPreviewOpen(true);
                } else {
                  void prepareIntro();
                }
              }}
              disabled={isPreparing || (!hasPreview && assets.length === 0)}
              className="min-h-[44px] rounded-2xl border-border/80 px-5 text-[10px] font-black uppercase tracking-[0.18em]"
            >
              {hasBackground && hasCuration ? <Play className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {hasBackground && hasCuration ? 'Preview' : 'Prepare'}
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <Card className="flex items-start gap-3 rounded-2xl border-rose-500/20 bg-rose-500/5 p-4 text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">Intro Error</p>
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          </Card>
        ) : null}

        {infoMessage ? (
          <Card className="flex items-start gap-3 rounded-2xl border-blue-500/20 bg-blue-500/5 p-4 text-blue-700">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">Intro Update</p>
              <p className="text-sm font-medium">{infoMessage}</p>
            </div>
          </Card>
        ) : null}

        {(backgroundStatus === 'pending' || backgroundStatus === 'timed_out') && !hasBackground ? (
          <Card className={`flex flex-col gap-3 rounded-2xl border p-4 ${backgroundStatus === 'pending' ? 'border-amber-500/20 bg-amber-500/5 text-amber-700' : 'border-rose-500/20 bg-rose-500/5 text-rose-700'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                  {backgroundStatus === 'pending' ? 'Intro Background Pending' : 'Background Still Missing'}
                </p>
                <p className="text-sm font-medium">
                  {backgroundStatus === 'pending'
                    ? `The intro draft is still publishing its backdrop. Poll ${backgroundPollCount}/${BACKGROUND_POLL_LIMIT}.`
                    : 'No safe background published inside the wait window. Check once, then pause instead of repeatedly regenerating.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshBackgroundStatus(true)}
              disabled={isRefreshingBackground}
              className="min-h-[44px] self-start rounded-2xl border-border/80 px-4 font-bold"
            >
              {isRefreshingBackground ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
              Check Status
            </Button>
          </Card>
        ) : null}

        <div className="grid gap-3 rounded-3xl border border-border/60 bg-muted/10 p-4 sm:grid-cols-3">
          <div className={`rounded-2xl border px-4 py-3 ${hasSelectedAssets ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/60 bg-background/70'}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Photos</p>
            <p className="mt-1 text-sm font-bold text-foreground">{hasSelectedAssets ? `${selectedIds.length} approved photos staged` : 'Waiting for approved photos'}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${hasBackground ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Backdrop</p>
            <p className="mt-1 text-sm font-bold text-foreground">{backgroundSourceLabel}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${audioUrl ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/60 bg-background/70'}`}>
            <div className="flex items-center gap-2">
              <Music4 className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Audio</p>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">{audioSourceLabel}</p>
          </div>
        </div>

        <Card className="rounded-2xl border-border/60 bg-muted/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Intro Confidence</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {generationMeta?.statusMessage || (
                  estimatedReadyTime
                    ? `Usually ready in ~${estimatedReadyTime}${telemetryInsights.sampleCount > 0 ? ` across ${telemetryInsights.sampleCount} recent intros` : ''}.`
                    : isPreparing
                      ? 'Preparing intro draft…'
                      : 'Ready for review actions.'
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTelemetry((current) => !current)}
              className="min-h-[44px] rounded-xl border-border/80 px-4 text-[10px] font-black uppercase tracking-[0.18em]"
            >
              {showTelemetry ? 'Hide Timing Details' : 'Timing Details'}
            </Button>
          </div>
          {(showTelemetry || isPreparing) ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-bold text-foreground">{statusLabel}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Elapsed</p>
                <p className="mt-1 text-sm font-bold text-foreground">{elapsedPrepareTime || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Usually Ready</p>
                <p className="mt-1 text-sm font-bold text-foreground">{estimatedReadyTime || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Event Success</p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {telemetryInsights.successRate != null ? `${Math.round(telemetryInsights.successRate)}%` : '—'}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {telemetryInsights.sampleCount > 0
                    ? `${telemetryInsights.sampleCount} recent intros${eventFailureRate != null ? ` • ${eventFailureRate}% failure rate` : ''}`
                    : 'No event sample yet'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">This Act</p>
                <p className="mt-1 text-sm font-bold text-foreground">{actSuccessRate != null ? `${actSuccessRate}%` : '—'}</p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {generationMeta?.totalAttempts
                    ? `${generationMeta.totalAttempts} attempts${actFailureRate != null ? ` • ${actFailureRate}% failure rate` : ''}`
                    : 'No act attempts yet'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Last Build</p>
                <p className="mt-1 text-sm font-bold text-foreground">{lastPrepareDuration || '—'}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative aspect-video overflow-hidden rounded-[2rem] border-slate-900/80 bg-slate-950 shadow-2xl">
            {backgroundUrl && !isBackgroundBroken ? (
              <img
                src={backgroundUrl}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
                onError={() => setIsBackgroundBroken(true)}
                alt="Intro background preview"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-20" />
                  <p className="text-sm font-bold opacity-30">PREVIEW APPEARS AFTER PREP</p>
                </div>
              </div>
            )}

            <div className="relative z-10 flex h-full w-full items-center justify-center">
              {selectedIds.length > 0 ? (
                <div className="flex gap-3 p-4">
                  {selectedIds.slice(0, 4).map((id, idx) => {
                    const asset = assets.find(a => a.id === id);
                    return (
                      <div key={id} className="relative h-28 w-20 overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-lg backdrop-blur-md">
                        {asset ? (
                          brokenAssetIds.includes(asset.id) ? (
                            <BrokenAssetTile label={getAssetDisplayLabel(asset, idx)} compact />
                          ) : (
                            <img
                              src={asset.file_url}
                              className="h-full w-full object-cover opacity-80"
                              onError={() => markAssetBroken(asset.id)}
                              alt={getAssetDisplayLabel(asset, idx)}
                            />
                          )
                        ) : null}
                      </div>
                    );
                  })}
                  {selectedIds.length > 4 ? (
                    <div className="flex h-28 w-10 items-center justify-center text-[10px] font-black text-white/60">+{selectedIds.length - 4}</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.24em]">Preview Ready After Prep</div>
              )}
            </div>
            {hasBackground ? (
              <div className="absolute left-4 top-4 z-20">
                <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${backgroundSource === 'fallback_background' ? 'bg-amber-500/90 text-black' : 'bg-emerald-500/90 text-black'}`}>
                  {backgroundSource === 'fallback_background' ? 'Fallback Backdrop' : 'Draft Ready'}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-4 rounded-[2rem] border-border/60 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Review</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">Keep the default surface to one decision.</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                Prepare once, preview the result, then approve only when the stage version feels right.
              </p>
            </div>

            <div className="space-y-3">
              {curationSuggestions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Scenes</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{curationSuggestions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Timing</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{totalPlaybackSeconds > 0 ? `${totalPlaybackSeconds}s playback` : 'Awaiting scenes'}</p>
                    {totalPlaybackSeconds > 0 ? (
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                        {TITLE_CARD_SECONDS}s title • {totalStoryboardSeconds}s scenes • {OUTRO_HOLD_SECONDS}s close
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Audio</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{audioSourceLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Backdrop</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{backgroundSourceLabel}</p>
                  </div>
                </div>
              ) : null}

              {compositionState?.credits && compositionState.credits.length > 0 ? (
                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Credits</p>
                  <div className="mt-3 space-y-2">
                    {compositionState.credits.map((line) => (
                      <div key={line.key} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{line.label}</p>
                        <p className="text-right text-sm font-semibold text-foreground">{line.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {storyboardFrames.length > 0 ? (
                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Storyboard Timeline</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        Playback matches this cue order when the operator taps preview or stage intro.
                      </p>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Opens with a {TITLE_CARD_SECONDS}s title card at 0:00
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {storyboardFrames.map((frame) => (
                      <div key={`${frame.id}-${frame.index}`} className="rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Frame {frame.index + 1}</p>
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                                Cue {frame.cueStartLabel}
                              </span>
                              <span className="rounded-full bg-background px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-foreground/70">
                                {frame.timing}s hold
                              </span>
                            </div>
                            <p className="text-sm font-bold text-foreground">{frame.narrative}</p>
                            <p className="text-xs text-muted-foreground">
                              {frame.label} • {frame.pacing} • {frame.focalPoint}
                            </p>
                          </div>

                          {!isApproved ? (
                            <div className="flex flex-wrap gap-2">
                              {[2, 3, 4, 5].map((seconds) => (
                                <button
                                  key={`${frame.id}-${seconds}`}
                                  type="button"
                                  onClick={() => updateSceneTiming(frame.id, seconds)}
                                  className={`min-h-[36px] rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
                                    frame.timing === seconds
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                  }`}
                                >
                                  {seconds}s
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Final Cue</p>
                      <p className="text-sm font-semibold text-foreground">
                        Outro holds at {formatStoryboardTimestamp(TITLE_CARD_SECONDS + totalStoryboardSeconds)} for {OUTRO_HOLD_SECONDS}s
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {curationSuggestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
                  Intro prep will arrange the approved cast photos automatically.
                </div>
              ) : null}

              {hasTimingChanges && !isApproved ? (
                <Button
                  variant="outline"
                  onClick={() => void saveComposition()}
                  disabled={isSaving || isPreparing}
                  className="min-h-[44px] rounded-2xl border-primary/30 bg-primary/5 px-4 font-bold text-primary"
                >
                  {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Save Preview Timing
                </Button>
              ) : null}
            </div>

            {!isApproved && approvalBlockers.length > 0 ? (
              <p className="text-xs font-medium leading-relaxed text-amber-700">
                Approval is blocked until: {approvalBlockers.join(' ')}
              </p>
            ) : null}
          </Card>
        </div>

        <div className="border-t border-border/60 pt-4">
          <button
            onClick={() => setShowAdvanced((current) => !current)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? 'Hide Advanced Controls' : 'Advanced Controls'}
          </button>

          {showAdvanced ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => void syncPerformanceAudio()}
                  disabled={isGeneratingAudio || isApproved}
                  className="min-h-[44px] rounded-2xl border-border/80 px-4 font-bold"
                >
                  {isGeneratingAudio ? <Loader2 className="mr-2 animate-spin" /> : <Music4 className="mr-2" />}
                  Refresh Performance Audio
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void curateAssets()}
                  disabled={isCurating || selectedIds.length === 0 || isApproved}
                  className="min-h-[44px] rounded-2xl border-border/80 px-4 font-bold"
                >
                  {isCurating ? <Loader2 className="mr-2 animate-spin" /> : <WandSparkles className="mr-2" />}
                  Re-Curate Photos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void generateBackground()}
                  disabled={isGeneratingBackground || isApproved}
                  className="min-h-[44px] rounded-2xl border-border/80 px-4 font-bold"
                >
                  {isGeneratingBackground ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                  Refresh Backdrop
                </Button>
              </div>

              {assets.length === 0 ? (
                <Card className="rounded-3xl border-dashed bg-muted/5 p-8 text-center text-muted-foreground">
                  {participantCount === 0
                    ? 'No cast is assigned to this performance yet. Add performers before building an intro.'
                    : 'No approved participant photos found for this performance. Approve at least one participant photo before building an intro.'}
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {assets.map((asset, index) => (
                    <div
                      key={asset.id}
                      onClick={() => !isApproved && toggleSelect(asset.id)}
                      className={`group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-3xl border-2 bg-muted/20 transition-all ${selectedIds.includes(asset.id) ? 'border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/10' : 'border-border/60 hover:border-primary/40'} ${isApproved ? 'cursor-default' : ''}`}
                    >
                      {brokenAssetIds.includes(asset.id) ? (
                        <BrokenAssetTile label={getAssetDisplayLabel(asset, index)} />
                      ) : (
                        <img
                          src={asset.file_url}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          alt={getAssetDisplayLabel(asset, index)}
                          onError={() => markAssetBroken(asset.id)}
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-3 pt-10">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Asset {index + 1}</p>
                        <p className="truncate text-sm font-bold text-white">{getAssetDisplayLabel(asset, index)}</p>
                      </div>
                      {selectedIds.includes(asset.id) ? (
                        <div className="absolute right-3 top-3 rounded-full bg-primary p-1 text-white shadow-lg">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <Modal isOpen={isPreviewOpen && !playbackComposition} onClose={() => setIsPreviewOpen(false)} title="Intro Preview">
        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-border/60 bg-slate-950">
            {backgroundUrl && !isBackgroundBroken ? (
              <img
                src={backgroundUrl}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
                alt="Intro preview"
              />
            ) : null}
            <div className="relative z-10 flex h-full items-center justify-center">
              {selectedIds.length > 0 ? (
                <div className="flex gap-3 p-4">
                  {selectedIds.slice(0, 4).map((id, idx) => {
                    const asset = assets.find((item) => item.id === id);
                    return asset ? (
                      <div key={id} className="h-28 w-20 overflow-hidden rounded-2xl border border-white/20 bg-black/40">
                        <img src={asset.file_url} alt={getAssetDisplayLabel(asset, idx)} className="h-full w-full object-cover opacity-80" />
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Prepare the intro to preview it</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Photos</p>
              <p className="mt-1 text-sm font-bold">{selectedIds.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Backdrop</p>
              <p className="mt-1 text-sm font-bold">{backgroundSourceLabel}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Audio</p>
              <p className="mt-1 text-sm font-bold">{audioSourceLabel}</p>
            </div>
          </div>
          {compositionState?.credits && compositionState.credits.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Credit Order</p>
              <div className="mt-3 space-y-2">
                {compositionState.credits.map((line) => (
                  <div key={`preview-${line.key}`} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{line.label}</p>
                    <p className="text-right text-sm font-semibold text-foreground">{line.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {isPreviewOpen && playbackComposition ? (
        <IntroVideoPlayer
          composition={playbackComposition}
          actName={compositionState?.credits?.find((line) => line.key === 'performance')?.value || 'Performance Intro'}
          participants={previewParticipants}
          onClose={() => setIsPreviewOpen(false)}
          defaultFullscreen={false}
        />
      ) : null}
    </>
  );
};
