import { X, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

interface IntroVideoPlayerProps {
    videoUrl: string;
    posterUrl: string;
    actName: string;
    onClose: () => void;
}

export function IntroVideoPlayer({ videoUrl, posterUrl, actName, onClose }: IntroVideoPlayerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Handle ESC key to close
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
            <div className="absolute top-6 right-6 z-10">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="text-white hover:bg-white/10 rounded-full h-12 w-12"
                >
                    <X size={32} />
                </Button>
            </div>

            <div className="absolute top-6 left-8 z-10 pointer-events-none">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Live Intro Cue</p>
                <h2 className="text-2xl font-black text-white tracking-tighter">{actName}</h2>
            </div>

            <div className="relative w-full h-full flex items-center justify-center">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-white/60 font-bold tracking-widest text-xs uppercase text-center max-w-[200px]">
                            BUFFERING STAGE MEDIA...
                        </p>
                    </div>
                )}

                <video
                    ref={videoRef}
                    src={videoUrl}
                    poster={posterUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onCanPlay={() => setIsLoading(false)}
                    className="w-full h-full object-cover"
                />

                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[10px] text-white font-black uppercase tracking-wider">AI Generated Atmosphere</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
