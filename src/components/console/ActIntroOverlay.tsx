import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User } from 'lucide-react';

interface Performer {
    firstName: string;
    lastName: string;
    role: string;
}

interface ActIntroOverlayProps {
    isActive: boolean;
    actName: string;
    performers: Performer[];
    videoUrl?: string | null;
    onComplete: () => void;
}

export function ActIntroOverlay({ isActive, actName, performers, videoUrl, onComplete }: ActIntroOverlayProps) {
    // We'll use a fixed sequence for now:
    // 0-2s: Blackout & Title Boom
    // 2-6s: Performer Reveals (1s each)
    // 6-8s: Logo & Ready
    
    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
                >
                    {/* Background Loop (Veo Asset) */}
                    {videoUrl && (
                        <div className="absolute inset-0 z-0">
                            <video 
                                src={videoUrl} 
                                autoPlay 
                                muted 
                                loop 
                                playsInline
                                className="w-full h-full object-cover opacity-60"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
                        </div>
                    )}

                    {/* Content Layers */}
                    <div className="relative z-10 w-full max-w-6xl px-12 text-center">
                        
                        {/* 1. The Title Sequence */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
                            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="mb-24"
                        >
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <span className="h-px w-24 bg-primary/50" />
                                <span className="text-primary font-black tracking-[0.5em] uppercase text-sm">Now Presenting</span>
                                <span className="h-px w-24 bg-primary/50" />
                            </div>
                            <h1 className="text-8xl font-black text-white tracking-tighter uppercase drop-shadow-[0_0_50px_rgba(var(--primary),0.5)]">
                                {actName}
                            </h1>
                        </motion.div>

                        {/* 2. Performer Reveal Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {performers.slice(0, 4).map((performer, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 2 + (idx * 0.5), duration: 0.8 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                                        <User className="text-primary w-10 h-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg">{performer.firstName}</p>
                                        <p className="text-primary/70 font-black uppercase text-[10px] tracking-widest">{performer.role}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Completion Trigger (Invisible for now, usually timed) */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 8 }}
                        onClick={onComplete}
                        className="absolute bottom-12 right-12 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest backdrop-blur-md border border-white/20 flex items-center gap-3 transition-all"
                    >
                        <Sparkles className="text-primary" />
                        Enter Stage
                    </motion.button>

                    {/* Ambient Progress Bar */}
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 10, ease: "linear" }}
                        onAnimationComplete={onComplete}
                        className="absolute bottom-0 left-0 right-0 h-1 bg-primary origin-left"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
