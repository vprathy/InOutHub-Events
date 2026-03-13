import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Loader2, Check, Play, Settings2, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { IntroComposition, IntroCurationItem } from '@/types/domain';

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

export const IntroVideoBuilder: React.FC<IntroVideoBuilderProps> = ({ actId }) => {
  const [assets, setAssets] = useState<ParticipantAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [isCurating, setIsCurating] = useState(false);
  const [curationSuggestions, setCurationSuggestions] = useState<IntroCurationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [compositionId, setCompositionId] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const resetCompositionState = () => {
    setSelectedIds([]);
    setBackgroundUrl(null);
    setCurationSuggestions([]);
    setCompositionId(null);
    setIsApproved(false);
  };

  useEffect(() => {
    init();
  }, [actId]);

  const init = async () => {
    setIsLoading(true);
    resetCompositionState();
    await fetchAssets();
    await fetchComposition();
    setIsLoading(false);
  };

  const fetchAssets = async () => {
    const { data: actParts, error: partsError } = await supabase
      .from('act_participants')
      .select('participant_id')
      .eq('act_id', actId);

    if (partsError) return;
    const pIds = actParts.map(p => p.participant_id);

    const { data: participantAssets, error: assetError } = await supabase
      .from('participant_assets')
      .select('*')
      .in('participant_id', pIds)
      .eq('status', 'approved');

    if (!assetError) setAssets(participantAssets || []);
  };

  const fetchComposition = async () => {
    const { data, error: _error } = await supabase
      .from('act_requirements')
      .select('*')
      .eq('act_id', actId)
      .eq('requirement_type', 'IntroComposition')
      .maybeSingle();

    if (!data) return;

    setCompositionId(data.id);
    setBackgroundUrl(data.file_url);
    setIsApproved(data.fulfilled || false);
    if (data.description) {
      try {
        const meta = JSON.parse(data.description) as Partial<IntroComposition>;
        setSelectedIds(meta.selectedAssetIds || []);
        setCurationSuggestions(meta.curation || []);
      } catch (e) {
        console.error('Failed to parse composition metadata', e);
      }
    }
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
    const metadata: IntroComposition = {
      selectedAssetIds,
      curation,
      lastUpdated: new Date().toISOString()
    };

    const payload = {
      act_id: actId,
      requirement_type: 'IntroComposition',
      description: JSON.stringify(metadata),
      file_url: fileUrl,
      fulfilled: approved
    };

    let saveResult;
    if (compositionId) {
      saveResult = await supabase
        .from('act_requirements')
        .update({
          ...payload
        })
        .eq('id', compositionId)
        .select()
        .single();
    } else {
      saveResult = await supabase
        .from('act_requirements')
        .insert({
          ...payload
        })
        .select()
        .single();
    }

    const { data, error: _error } = saveResult;

    if (!_error && data) {
      setCompositionId(data.id);
      setIsApproved(approved);
    }
    setIsSaving(false);
  };

  const generateBackground = async () => {
    setIsGeneratingBackground(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-act-assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-inouthub-trust': 'inouthub-internal-2026-v16'
        },
        body: JSON.stringify({ actId, mode: 'Background' })
      });
      const data = await response.json();
      if (data.publicUrl) {
          setBackgroundUrl(data.publicUrl);
          await saveComposition({ approved: false, fileUrl: data.publicUrl });
      }
    } catch (err) {
      console.error('Background Gen Failed', err);
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const curateAssets = async () => {
    if (selectedIds.length === 0) return;
    setIsCurating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-act-assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-inouthub-trust': 'inouthub-internal-2026-v16'
        },
        body: JSON.stringify({ actId, mode: 'Curation', assetIds: selectedIds })
      });
      const data = await response.json();
      if (data.suggestions) {
          // The edge function returns a stringified JSON in suggestions
          const rawSuggestions = typeof data.suggestions === 'string' 
            ? JSON.parse(data.suggestions.replace(/```json|```/g, '')) 
            : data.suggestions;
            
          const suggestions = (rawSuggestions.suggestions || []) as IntroCurationItem[];
          setCurationSuggestions(suggestions);
          await saveComposition({ approved: false, curation: suggestions });
      }
    } catch (err) {
      console.error('Curation Failed', err);
    } finally {
      setIsCurating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-500" />
            Intro Builder
            </h2>
            {isApproved ? (
                <div className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/20 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Approved
                </div>
            ) : compositionId ? (
                <div className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">
                    Draft
                </div>
            ) : null}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateBackground}
            disabled={isGeneratingBackground || isApproved}
          >
            {isGeneratingBackground ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
            {backgroundUrl ? 'Regenerate Background' : 'Generate Background'}
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={curateAssets}
            disabled={isCurating || selectedIds.length === 0 || isApproved}
          >
             {isCurating ? <Loader2 className="animate-spin mr-2" /> : <Settings2 className="mr-2" />}
             AI Curation
          </Button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
        {[
          { id: 'select', label: '1. Select', active: selectedIds.length === 0, done: selectedIds.length > 0 },
          { id: 'curate', label: '2. Curate', active: selectedIds.length > 0 && curationSuggestions.length === 0, done: curationSuggestions.length > 0 },
          { id: 'approve', label: '3. Approve', active: curationSuggestions.length > 0 && !isApproved, done: isApproved },
          { id: 'play', label: '4. Play', active: isApproved, done: false },
        ].map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 ${step.active ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${step.done ? 'bg-green-500 border-green-500 text-white' : step.active ? 'border-primary text-primary' : 'border-gray-500 text-gray-500'}`}>
                {step.done ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-primary' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {idx < 3 && <div className="h-px flex-1 mx-4 bg-gray-500/10" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Asset Selection */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">1. Select Participant Photos</h3>
            <span className="text-[10px] text-gray-600 font-mono">{selectedIds.length} SELECTED</span>
          </div>
          {assets.length === 0 ? (
            <Card className="p-8 text-center text-gray-400 border-dashed bg-muted/5">
              No approved participant photos found for this act.
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {assets.map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => !isApproved && toggleSelect(asset.id)}
                  className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedIds.includes(asset.id) ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-300'} ${isApproved ? 'cursor-default' : ''}`}
                >
                  <img src={asset.file_url} className="w-full h-full object-cover" alt={asset.name} />
                  {selectedIds.includes(asset.id) && (
                    <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Background & Preview */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">2. Preview & Template</h3>
          <Card className="aspect-video relative overflow-hidden bg-gray-900 flex items-center justify-center border-gray-800 ring-1 ring-white/5 shadow-2xl">
            {backgroundUrl ? (
              <img src={backgroundUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            ) : (
              <div className="text-center text-gray-600">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-bold opacity-30">GENERATE BACKGROUND</p>
              </div>
            )}
            
            <div className="relative z-10 w-full h-full flex items-center justify-center">
                {selectedIds.length > 0 ? (
                     <div className="flex gap-2 p-4">
                        {selectedIds.slice(0, 4).map((id, idx) => {
                            const asset = assets.find(a => a.id === id);
                            const suggestion = curationSuggestions.find(s => s.id === id);
                            return (
                                <div key={id} className={`relative w-16 h-24 bg-black/40 backdrop-blur-md rounded border overflow-hidden shadow-lg animate-in zoom-in slide-in-from-bottom-2 duration-300 ${suggestion ? 'border-primary/50' : 'border-white/20'}`} style={{ animationDelay: `${idx * 100}ms` }}>
                                    {asset && <img src={asset.file_url} className="w-full h-full object-cover opacity-80" />}
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
                    <div className="text-white/20 text-[10px] font-black uppercase tracking-widest">Assembly Simulation</div>
                )}
            </div>
          </Card>
          
          <div className={`p-4 rounded-xl border transition-all ${curationSuggestions.length > 0 ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-muted/5 border-border/50'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${curationSuggestions.length > 0 ? 'text-indigo-400' : 'text-muted-foreground'}`}>
                <Sparkles className="w-3 h-3" />
                AI Curation Workspace
            </h4>
            {curationSuggestions.length > 0 ? (
                <div className="space-y-2">
                    {curationSuggestions.slice(0, 4).map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2 last:border-0 last:pb-0">
                            <div className="flex flex-col">
                              <span className="text-gray-500 font-bold">POS {idx + 1}</span>
                              <span className="text-indigo-300/80 italic">{s.narrative || 'Spotlight'}</span>
                            </div>
                            <div className="flex gap-3">
                              <div className="text-right">
                                <span className="text-gray-600 block">PACING</span>
                                <span className="font-bold text-white uppercase">{s.pacing || 'Cinematic'}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-600 block">FOCAL</span>
                                <span className="font-bold text-white uppercase">{s.focalPoint || 'Center'}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-600 block">DURATION</span>
                                <span className="font-bold text-white uppercase">{s.timing || 3}s</span>
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    Select photos and run curation to identify optimal movement, focal points, and narrative flow for this act.
                </p>
            )}
          </div>
        </section>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-border/50">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
            {compositionId ? `Last Saved: ${new Date().toLocaleTimeString()}` : 'Not Saved'}
        </div>
        <div className="flex gap-3">
            <Button 
                variant="outline" 
                onClick={() => saveComposition({ approved: false })}
                disabled={isSaving || isApproved || (selectedIds.length === 0 && !backgroundUrl)}
                className="font-bold uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl border-2"
            >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : null}
                Save Draft
            </Button>
            <Button 
                disabled={!backgroundUrl || selectedIds.length === 0 || isSaving || isApproved} 
                variant="default"
                onClick={() => saveComposition({ approved: true })}
                className="font-bold uppercase tracking-widest text-[10px] h-10 px-8 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
            >
                {isApproved ? <Check className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2 text-white/50" />}
                {isApproved ? 'Approved' : 'Approve for Stage'}
            </Button>
        </div>
      </div>
    </div>
  );
};
