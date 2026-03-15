import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Loader2, Check, Play, Sparkles, Image as ImageIcon, AlertCircle, LayoutPanelTop, WandSparkles } from 'lucide-react';
import type { IntroComposition, IntroCurationItem } from '@/types/domain';
import {
  approveIntroComposition,
  buildIntroComposition,
  curateIntroPhotos,
  generateIntroAudio,
  generateIntroBackground,
  getIntroComposition,
  IntroCapabilityError,
} from '@/lib/introCapabilities';

interface ParticipantAsset {
  id: string;
  name: string;
  file_url: string;
  status: string | null;
  participant_id: string;
}

interface IntroVideoBuilderProps {
  actId: string;
  onComplete?: (url: string) => void;
}

function getAssetDisplayLabel(asset: ParticipantAsset, index: number) {
  return asset.name?.trim() || `Performer ${index + 1}`;
}

function BrokenAssetTile({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-500 ${compact ? 'gap-1 px-2 py-3' : 'gap-2 px-3 py-4'}`}>
      <ImageIcon className={compact ? 'h-4 w-4 opacity-60' : 'h-8 w-8 opacity-50'} />
      <span className={`text-center font-black uppercase tracking-[0.18em] ${compact ? 'text-[8px]' : 'text-[10px]'}`}>Asset Unavailable</span>
      <span className={`text-center ${compact ? 'text-[8px]' : 'text-[11px]'} leading-tight`}>{label}</span>
    </div>
  );
}

export const IntroVideoBuilder: React.FC<IntroVideoBuilderProps> = ({ actId }) => {
  const [assets, setAssets] = useState<ParticipantAsset[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
  const hasSelectedAssets = selectedIds.length > 0;
  const hasCuration = curationSuggestions.length > 0;
  const hasBackground = Boolean(backgroundUrl);
  const canSaveDraft = !isApproved && (hasSelectedAssets || hasBackground);
  const canApprove = hasSelectedAssets && hasCuration && hasBackground && !isSaving && !isApproved;
  const approvalBlockers = [
    !hasSelectedAssets ? 'Select at least one approved participant photo.' : null,
    hasSelectedAssets && !hasCuration ? 'Arrange photos to create the playback order.' : null,
    hasCuration && !hasBackground ? 'Generate a safe intro background before approval.' : null,
  ].filter(Boolean) as string[];

  const resetCompositionState = () => {
    setSelectedIds([]);
    setBackgroundUrl(null);
    setAudioUrl(null);
    setCurationSuggestions([]);
    setCompositionId(null);
    setIsApproved(false);
    setInfoMessage(null);
    setBrokenAssetIds([]);
    setIsBackgroundBroken(false);
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

  const init = async () => {
    setIsLoading(true);
    resetCompositionState();
    setErrorMessage(null);
    try {
      await fetchAssets();
      await fetchComposition();
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
      .select('*')
      .in('participant_id', pIds)
      .eq('type', 'photo')
      .eq('status', 'approved');

    if (!assetError) setAssets(participantAssets || []);
  };

  const fetchComposition = async () => {
    const result = await getIntroComposition(actId);
    setCompositionId(result.compositionId);
    setBackgroundUrl(result.composition.background.fileUrl);
    setAudioUrl(result.composition.audio.fileUrl);
    setIsApproved(result.composition.approved);
    setSelectedIds(result.composition.selectedAssetIds || []);
    setCurationSuggestions(result.composition.curation || []);
    setIsBackgroundBroken(false);
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
      version: '2026-03-13',
      selectedAssetIds,
      curation,
      background: {
        fileUrl,
        source: backgroundUrl ? 'generated_background' : null,
        stylePreset: null,
      },
      audio: {
        fileUrl: audioUrl,
        source: audioUrl ? 'generated_tts' : null,
        optional: true,
      },
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

      setCompositionId(result.compositionId);
      setBackgroundUrl(result.composition.background.fileUrl);
      setAudioUrl(result.composition.audio.fileUrl);
      setSelectedIds(result.composition.selectedAssetIds);
      setCurationSuggestions(result.composition.curation);
      setIsApproved(result.composition.approved);
      setIsBackgroundBroken(false);
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
    try {
      const previousBackgroundUrl = backgroundUrl;
      const result = await generateIntroBackground(actId);
      setCompositionId(result.compositionId);
      setBackgroundUrl(result.composition.background.fileUrl);
      setAudioUrl(result.composition.audio.fileUrl);
      setIsApproved(result.composition.approved);
      setIsBackgroundBroken(false);

      if (result.isPending) {
        setInfoMessage(result.message || 'Background generation is still processing.');

        let pollCount = 0;
        const interval = window.setInterval(async () => {
          pollCount += 1;
          try {
            const refreshed = await getIntroComposition(actId);
            const refreshedBackgroundUrl = refreshed.composition.background.fileUrl;

            if (refreshedBackgroundUrl && refreshedBackgroundUrl !== previousBackgroundUrl) {
              setCompositionId(refreshed.compositionId);
              setBackgroundUrl(refreshedBackgroundUrl);
              setAudioUrl(refreshed.composition.audio.fileUrl);
              setSelectedIds(refreshed.composition.selectedAssetIds || []);
              setCurationSuggestions(refreshed.composition.curation || []);
              setIsApproved(refreshed.composition.approved);
              setIsBackgroundBroken(false);
              setInfoMessage('Background updated. Review the new preview before approval.');
              window.clearInterval(interval);
              return;
            }
          } catch (_error) {
            // Keep polling quietly; the info banner already explains the state.
          }

          if (pollCount >= 12) {
            window.clearInterval(interval);
            setInfoMessage(result.message || 'Background generation is still under review. Try again in a moment.');
          }
        }, 5000);
      } else if (!result.composition.background.fileUrl || result.composition.background.fileUrl === previousBackgroundUrl) {
        setInfoMessage('Background request completed, but no new image was published yet.');
      } else {
        setInfoMessage('Background updated. Review the new preview before approval.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Background generation failed');
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const generateAudio = async () => {
    setIsGeneratingAudio(true);
    setErrorMessage(null);
    try {
      const result = await generateIntroAudio(actId);
      setCompositionId(result.compositionId);
      setBackgroundUrl(result.composition.background.fileUrl);
      setAudioUrl(result.composition.audio.fileUrl);
      setSelectedIds(result.composition.selectedAssetIds);
      setCurationSuggestions(result.composition.curation as IntroCurationItem[]);
      setIsApproved(result.composition.approved);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Intro audio generation failed');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const curateAssets = async () => {
    if (selectedIds.length === 0) return;
    setIsCurating(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const result = await curateIntroPhotos(actId, selectedIds);
      setCompositionId(result.compositionId);
      setSelectedIds(result.composition.selectedAssetIds);
      setCurationSuggestions(result.composition.curation as IntroCurationItem[]);
      setBackgroundUrl(result.composition.background.fileUrl);
      setAudioUrl(result.composition.audio.fileUrl);
      setIsApproved(result.composition.approved);
      setIsBackgroundBroken(false);
    } catch (err) {
      const message = err instanceof IntroCapabilityError ? err.message : err instanceof Error ? err.message : 'Curation failed';
      setErrorMessage(message);
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

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <Card className="space-y-6 rounded-[2rem] border-border/60 bg-card/80 p-5 shadow-xl shadow-slate-200/40">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 text-primary">
              <LayoutPanelTop className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Intro Studio</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Intro Builder</h2>
            </div>
            {isApproved ? (
              <div className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                <Check className="h-3 w-3" /> Approved
              </div>
            ) : compositionId ? (
              <div className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                Draft
              </div>
            ) : (
              <div className="rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Not Saved
              </div>
            )}
          </div>
          <p className="max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            Build the act-scoped intro recipe, review curation, and approve only when stage playback is ready.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateBackground}
            disabled={isGeneratingBackground || isApproved}
            className="h-11 rounded-2xl border-border/80 px-4 font-bold"
          >
            {isGeneratingBackground ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
            {backgroundUrl ? 'Regenerate Background' : 'Generate Background'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateAudio}
            disabled={isGeneratingAudio || isApproved}
            className="h-11 rounded-2xl border-border/80 px-4 font-bold"
          >
            {isGeneratingAudio ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2" />}
            {audioUrl ? 'Regenerate Audio' : 'Generate Audio'}
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={curateAssets}
            disabled={isCurating || selectedIds.length === 0 || isApproved}
            className="h-11 rounded-2xl px-4 font-bold shadow-lg shadow-primary/20"
          >
             {isCurating ? <Loader2 className="animate-spin mr-2" /> : <WandSparkles className="mr-2" />}
             Arrange Photos
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

      <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
        {[
          { id: 'select', label: '1. Select', active: selectedIds.length === 0, done: selectedIds.length > 0 },
          { id: 'curate', label: '2. Curate', active: selectedIds.length > 0 && curationSuggestions.length === 0, done: curationSuggestions.length > 0 },
          { id: 'background', label: '3. Background', active: hasCuration && !hasBackground, done: hasBackground },
          { id: 'approve', label: '4. Approve', active: hasBackground && !isApproved, done: isApproved },
          { id: 'play', label: '5. Play', active: isApproved, done: false },
        ].map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 ${step.active ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${step.done ? 'bg-green-500 border-green-500 text-white' : step.active ? 'border-primary text-primary' : 'border-gray-500 text-gray-500'}`}>
                {step.done ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${step.active ? 'text-primary' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {idx < 4 && <div className="h-px flex-1 mx-4 bg-gray-500/10" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid gap-3 rounded-3xl border border-border/60 bg-muted/10 p-4 sm:grid-cols-3">
        <div className={`rounded-2xl border px-4 py-3 ${hasSelectedAssets ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/60 bg-background/70'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Photos</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{hasSelectedAssets ? `${selectedIds.length} selected` : 'Waiting for selection'}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${hasCuration ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/60 bg-background/70'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Curation</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{hasCuration ? `${curationSuggestions.length} frames arranged` : 'Arrange photos first'}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${hasBackground ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Background</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{hasBackground ? 'Ready for approval' : 'Required before approval'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Step 1</p>
              <h3 className="text-lg font-black tracking-tight text-slate-900">Select Participant Photos</h3>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{selectedIds.length} Selected</span>
          </div>
          {assets.length === 0 ? (
            <Card className="rounded-3xl border-dashed bg-muted/5 p-8 text-center text-gray-400">
              {participantCount === 0
                ? 'No cast is assigned to this act yet. Add performers before building an intro.'
                : 'No approved participant photos found for this act. Approve at least one participant photo before building an intro.'}
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {assets.map((asset, index) => (
                <div 
                  key={asset.id}
                  onClick={() => !isApproved && toggleSelect(asset.id)}
                  className={`group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-3xl border-2 bg-slate-50 transition-all ${selectedIds.includes(asset.id) ? 'border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/10' : 'border-border/60 hover:border-primary/40'} ${isApproved ? 'cursor-default' : ''}`}
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
                  {selectedIds.includes(asset.id) && (
                    <div className="absolute right-3 top-3 rounded-full bg-primary p-1 text-white shadow-lg">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Step 2</p>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Preview & Template</h3>
          </div>
          <Card className="relative aspect-video overflow-hidden rounded-[2rem] border-slate-900/80 bg-slate-950 shadow-2xl">
            {backgroundUrl && !isBackgroundBroken ? (
              <img
                src={backgroundUrl}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
                onError={() => setIsBackgroundBroken(true)}
              />
            ) : (
              <div className="text-center text-gray-600">
                <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-20" />
                <p className="text-sm font-bold opacity-30">{backgroundUrl ? 'BACKGROUND UNAVAILABLE' : 'GENERATE BACKGROUND'}</p>
              </div>
            )}
            
            <div className="relative z-10 flex h-full w-full items-center justify-center">
                {selectedIds.length > 0 ? (
                     <div className="flex gap-3 p-4">
                        {selectedIds.slice(0, 4).map((id, idx) => {
                            const asset = assets.find(a => a.id === id);
                            const suggestion = curationSuggestions.find(s => s.id === id);
                            return (
                                <div key={id} className={`relative h-28 w-20 overflow-hidden rounded-2xl border bg-black/40 shadow-lg backdrop-blur-md animate-in zoom-in slide-in-from-bottom-2 duration-300 ${suggestion ? 'border-primary/50' : 'border-white/20'}`} style={{ animationDelay: `${idx * 100}ms` }}>
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
                                    {suggestion && (
                                        <div className="absolute inset-0 border-2 border-primary/40 pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}
                        {selectedIds.length > 4 && (
                            <div className="w-8 h-24 flex items-center justify-center text-white/50 text-[10px] font-black">+{selectedIds.length - 4}</div>
                        )}
                     </div>
                ) : (
                    <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.24em]">Assembly Simulation</div>
                )}
            </div>
          </Card>
          
          <div className={`rounded-3xl border p-5 transition-all ${curationSuggestions.length > 0 ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-muted/5'}`}>
            <h4 className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] ${curationSuggestions.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                <Sparkles className="w-3 h-3" />
                Photo Direction
            </h4>
            {curationSuggestions.length > 0 ? (
                <div className="space-y-3">
                    {curationSuggestions.slice(0, 4).map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-[10px]">
                            <div className="flex flex-col">
                              <span className="font-black uppercase tracking-[0.18em] text-muted-foreground">Pos {idx + 1}</span>
                              <span className="text-sm font-semibold text-slate-700">{s.narrative || 'Spotlight'}</span>
                            </div>
                            <div className="flex gap-3">
                              <div className="text-right">
                                <span className="block text-muted-foreground">Pacing</span>
                                <span className="font-black uppercase text-slate-900">{s.pacing || 'Cinematic'}</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-muted-foreground">Focal</span>
                                <span className="font-black uppercase text-slate-900">{s.focalPoint || 'Center'}</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-muted-foreground">Duration</span>
                                <span className="font-black uppercase text-slate-900">{s.timing || 3}s</span>
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs italic leading-relaxed text-muted-foreground">
                    Select photos and arrange them to shape movement, focal points, and narrative flow for this act.
                </p>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4 border-t border-border/60 pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              {compositionId ? `Last Saved: ${new Date().toLocaleTimeString()}` : 'Not Saved'}
          </div>
          {!isApproved && approvalBlockers.length > 0 ? (
            <p className="max-w-xl text-xs font-medium leading-relaxed text-amber-700">
              Approval is blocked until: {approvalBlockers.join(' ')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
            <Button 
                variant="outline" 
                onClick={() => saveComposition({ approved: false })}
                disabled={isSaving || !canSaveDraft}
                className="h-11 rounded-2xl border-2 px-6 text-[10px] font-black uppercase tracking-[0.22em]"
            >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : null}
                Save Draft
            </Button>
            <Button 
                disabled={!canApprove}
                variant="default"
                onClick={() => saveComposition({ approved: true })}
                className="h-11 rounded-2xl bg-primary px-8 text-[10px] font-black uppercase tracking-[0.22em] shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
                {isApproved ? <Check className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2 text-white/50" />}
                {isApproved ? 'Approved' : 'Approve for Stage'}
            </Button>
        </div>
      </div>
    </Card>
  );
};
