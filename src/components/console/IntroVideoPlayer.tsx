import { X, Loader2, Music, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import type { IntroComposition } from '@/types/domain';

interface IntroVideoPlayerProps {
    composition: IntroComposition;
    actName: string;
    participants: any[];
    onClose: () => void;
    defaultFullscreen?: boolean;
}

export function IntroVideoPlayer({ composition, actName, participants, onClose, defaultFullscreen = true }: IntroVideoPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(-1); // -1 is Title/Ambient start
    const [allImagesLoaded, setAllImagesLoaded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
    const audioRef = useRef<HTMLAudioElement>(null);

    const photos = composition.selectedAssetIds.map(id => {
        const participant = participants.find((p: any) => (p.assets || []).some((a: any) => a.id === id));
        const asset = participants.flatMap((p: any) => p.assets || []).find((a: any) => a.id === id);
        const suggestion = composition.curation.find((s) => s.id === id);
        return {
            url: asset?.fileUrl,
            name: participant ? `${participant.firstName} ${participant.lastName}` : 'Performer',
            suggestion: suggestion || { pacing: 'cinematic', focalPoint: 'center', timing: 3 }
        };
    }).filter(p => p.url);

    useEffect(() => {
       setAllImagesLoaded(false);
       setCurrentIndex(-1);

       const imageUrls = [composition.background.fileUrl, ...photos.map(p => p.url)].filter(Boolean);
       if (imageUrls.length === 0) {
           setAllImagesLoaded(true);
           return;
       }

       let isDisposed = false;
       let settledCount = 0;
       const markSettled = () => {
           settledCount++;
           if (!isDisposed && settledCount >= imageUrls.length) {
               setAllImagesLoaded(true);
           }
       };

       const timeout = window.setTimeout(() => {
           if (!isDisposed) setAllImagesLoaded(true);
       }, 2500);

       imageUrls.forEach(url => {
           const img = new Image();
           img.src = url;
           img.onload = markSettled;
           img.onerror = markSettled;
       });

       if (audioRef.current && composition.audio.fileUrl) {
           audioRef.current.volume = 0.5;
           audioRef.current.play().catch(e => console.warn('Audio autoplay blocked', e));
       }

       return () => {
           isDisposed = true;
           window.clearTimeout(timeout);
       };
    }, [composition.audio.fileUrl, composition.background.fileUrl, photos]);

    useEffect(() => {
        if (!allImagesLoaded) return;

        let timer: any;
        if (currentIndex === -1) {
            timer = setTimeout(() => setCurrentIndex(0), 3000); // 3s Title card
        } else if (currentIndex < photos.length) {
            const suggestion = photos[currentIndex].suggestion;
            timer = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, (suggestion.timing || 3) * 1000);
        } else {
            // End of intro - wait bit then close or show final
            timer = setTimeout(() => onClose(), 2000);
        }

        return () => clearTimeout(timer);
    }, [currentIndex, allImagesLoaded, onClose, photos]);

    const getKenBurns = (suggestion: any) => {
        const duration = suggestion.timing || 3;
        const scaleFrom = 1.0;
        const scaleTo = suggestion.pacing === 'fast' ? 1.2 : 1.1;
        
        let x = 0;
        let y = 0;
        if (suggestion.focalPoint === 'left') x = -5;
        if (suggestion.focalPoint === 'right') x = 5;

        return {
            initial: { scale: scaleFrom, x: 0, y: 0, opacity: 0 },
            animate: { 
                scale: scaleTo, 
                x: x, 
                y: y, 
                opacity: 1,
                transition: { 
                    opacity: { duration: 0.8 },
                    scale: { duration: duration, ease: "linear" as const },
                    x: { duration: duration, ease: "linear" as const }
                }
            },
            exit: { opacity: 0, transition: { duration: 0.5 } }
        };
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center overflow-hidden p-4"
        >
            {composition.audio.fileUrl && <audio ref={audioRef} src={composition.audio.fileUrl} />}

            <motion.div
                layout
                className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl ${isFullscreen ? 'h-full w-full rounded-none border-none' : 'h-[min(78vh,720px)] w-full max-w-5xl'}`}
            >
            
                <div className="absolute top-4 right-4 z-[110] flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen((value) => !value)}
                        className="text-white hover:bg-white/10 rounded-full h-11 w-11"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose}
                        className="text-white hover:bg-white/10 rounded-full h-11 w-11"
                    >
                        <X size={28} />
                    </Button>
                </div>

                {/* Background Layer */}
                <motion.div
                    className="absolute inset-0 z-0"
                    initial={{ scale: 1.04, x: 0 }}
                    animate={{ scale: [1.04, 1.12, 1.08], x: [0, -12, 8] }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                >
                    <img 
                        src={composition.background.fileUrl || ''} 
                        className="w-full h-full object-cover opacity-18 blur-xl scale-110 saturate-75" 
                        alt="" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                </motion.div>

                <div className="relative z-10 w-full h-full flex items-center justify-center">
                {!allImagesLoaded ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-white/40 font-black tracking-widest text-[10px] uppercase">Buffering Dynamic Assets</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {currentIndex === -1 && (
                            <motion.div 
                                key="title"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                transition={{ duration: 1 }}
                                className="text-center space-y-4"
                            >
                                <p className="text-primary font-black tracking-[0.5em] text-xs uppercase animate-pulse">Live Intro Cue</p>
                                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic">{actName}</h1>
                                <div className="h-0.5 w-24 bg-primary mx-auto" />
                            </motion.div>
                        )}

                        {currentIndex >= 0 && currentIndex < photos.length && (
                            <motion.div 
                                key={photos[currentIndex].url}
                                {...getKenBurns(photos[currentIndex].suggestion)}
                                className="relative w-full h-full flex items-center justify-center"
                            >
                                <div className={`relative aspect-[2/3] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 rounded-lg overflow-hidden ${isFullscreen ? 'h-[70vh]' : 'h-[62vh]'}`}>
                                     <img 
                                        src={photos[currentIndex].url} 
                                        className="w-full h-full object-cover" 
                                        alt={photos[currentIndex].name} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-10 left-10 text-left">
                                        <p className="text-primary font-black tracking-widest text-xs uppercase mb-1">Performing Now</p>
                                        <h3 className="text-4xl font-black text-white uppercase italic">{photos[currentIndex].name}</h3>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentIndex >= photos.length && (
                            <motion.div 
                                key="outro"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center"
                            >
                                <p className="text-white/20 font-black tracking-[1em] text-xl uppercase">Silence on Set</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                </div>

                {/* Status Overlays */}
                <div className="absolute bottom-6 left-6 z-[110] flex flex-wrap items-center gap-3">
                    <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[10px] text-white font-black uppercase tracking-wider">
                            {currentIndex === -1 ? 'Initializing' : `Active Scene ${currentIndex + 1}/${photos.length}`}
                        </span>
                    </div>
                    {composition.audio.fileUrl && (
                        <div className="bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-full border border-primary/30 flex items-center gap-3">
                            <Music className="w-3 h-3 text-primary" />
                            <span className="text-[10px] text-primary font-black uppercase tracking-wider">Audio Active</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
