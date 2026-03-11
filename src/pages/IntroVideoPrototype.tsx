import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import ReactPlayer from 'react-player';

const DUMMY_LIVESTREAM_BG = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=3174&auto=format&fit=crop";

const DUMMY_ACT = {
    name: "Senior Jazz Elite Final",
    participants: [
        { name: "Sarah Jenkins", photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop" },
        { name: "Marcus Chen", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop" },
        { name: "Elena Rodriguez", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop" },
        { name: "James Wilson", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop" }
    ]
};

// Phases of the animation
type Phase = 'IDLE' | 'BLACKOUT' | 'TITLE' | 'PARTICIPANTS' | 'OUTRO';

export default function IntroVideoPrototype() {
    const [phase, setPhase] = useState<Phase>('IDLE');
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
    const playerRef = useRef<any>(null);

    const startIntro = () => {
        setPhase('BLACKOUT');

        // Reset and play audio via ReactPlayer state
        setIsPlaying(true);
        setIsMuted(false);
        setVolume(1);
        playerRef.current?.seekTo(0);

        // Orchestrate the timeline
        setTimeout(() => setPhase('TITLE'), 1500); // 1.5s blackout/boom

        setTimeout(() => {
            setPhase('PARTICIPANTS');
            // Cycle through participants every 1.5 seconds
            DUMMY_ACT.participants.forEach((_, index) => {
                setTimeout(() => {
                    setCurrentParticipantIndex(index);
                }, index * 1500);
            });
        }, 4500); // Title stays for 3 seconds

        // Outro after all participants shown
        setTimeout(() => {
            setPhase('OUTRO');
            // Fade audio out
            let currentVol = 1;
            const fade = setInterval(() => {
                currentVol -= 0.05;
                if (currentVol > 0.05) {
                    setVolume(currentVol);
                } else {
                    setIsPlaying(false);
                    clearInterval(fade);
                }
            }, 100);
        }, 4500 + (DUMMY_ACT.participants.length * 1500));

        // Return to idle (live feed)
        setTimeout(() => setPhase('IDLE'), 4500 + (DUMMY_ACT.participants.length * 1500) + 3000);
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black font-sans">

            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-1">
                {/* @ts-ignore */}
                <ReactPlayer
                    ref={playerRef}
                    url="https://youtu.be/VQSGj59INDk"
                    playing={isPlaying}
                    volume={volume}
                    muted={isMuted}
                    width="1000px"
                    height="1000px"
                    playsinline
                    // @ts-ignore
                    config={{
                        youtube: {
                            // @ts-ignore
                            playerVars: {
                                autoplay: 1,
                                origin: window.location.origin
                            }
                        }
                    }}
                    onReady={() => console.log('Player ready')}
                    onStart={() => console.log('Player start')}
                    onPlay={() => console.log('Player play')}
                    onError={(e) => console.error('Player error', e)}
                />
            </div>

            {/* Base Layer: Pretend this is the live camera feed running on the projector */}
            <div
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${phase === 'IDLE' ? 'opacity-100' : 'opacity-0 scale-105'}`}
                style={{ backgroundImage: `url(${DUMMY_LIVESTREAM_BG})` }}
            >
                <div className="absolute inset-0 bg-black/40" />
                {phase === 'IDLE' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <button
                            onClick={startIntro}
                            className="bg-primary hover:bg-primary/90 text-white p-6 rounded-full shadow-[0_0_40px_rgba(var(--primary),0.5)] transition-transform hover:scale-110 flex items-center justify-center group"
                        >
                            <Play className="w-12 h-12 ml-2" fill="currentColor" />
                        </button>
                        <p className="mt-8 text-white/50 tracking-widest uppercase text-sm font-bold">Waiting for Event Command</p>
                    </div>
                )}
            </div>

            {/* The Overlay Graphic Layer */}
            <AnimatePresence>
                {phase !== 'IDLE' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 2 } }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black"
                    >

                        {/* Title Phase */}
                        <AnimatePresence>
                            {phase === 'TITLE' && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0, y: 50 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="text-center"
                                >
                                    <h3 className="text-primary font-bold tracking-[0.3em] uppercase mb-4 text-2xl">Up Next</h3>
                                    <h1 className="text-7xl font-black text-white px-8 py-4 border-y-4 border-primary/50 shadow-[0_0_100px_rgba(var(--primary),0.3)] bg-gradient-to-r from-transparent via-primary/10 to-transparent">
                                        {DUMMY_ACT.name}
                                    </h1>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Participants Phase */}
                        <AnimatePresence mode="wait">
                            {phase === 'PARTICIPANTS' && (
                                <motion.div
                                    key={currentParticipantIndex}
                                    initial={{ x: '100vw', skewX: -10 }}
                                    animate={{ x: 0, skewX: 0 }}
                                    exit={{ x: '-100vw', skewX: 10 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                                    className="absolute inset-x-0 bottom-32 flex items-end px-24"
                                >
                                    {/* The Hero Cutout/Photo */}
                                    <div className="relative w-80 h-96 z-10 shrink-0">
                                        <div className="absolute inset-0 bg-primary/20 rounded-t-full rounded-br-full transform rotate-6 border-4 border-white/10 shadow-2xl backdrop-blur-sm" />
                                        <img
                                            src={DUMMY_ACT.participants[currentParticipantIndex].photoUrl}
                                            alt="dancer"
                                            className="absolute inset-0 w-full h-full object-cover rounded-t-full rounded-br-full shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000"
                                        />
                                    </div>

                                    {/* The Lower Third Name Plate */}
                                    <div className="bg-gradient-to-r from-black via-black/90 to-transparent flex-1 pl-12 pr-48 py-8 -ml-12 mb-8 border-l-8 border-primary relative overflow-hidden backdrop-blur-md">
                                        {/* Glitch/Speed Lines */}
                                        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-repeat shadow-[inset_100px_0_100px_rgba(0,0,0,1)]" />

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="relative z-10"
                                        >
                                            <p className="text-primary font-bold tracking-[0.4em] uppercase text-xl mb-1">Starring</p>
                                            <h2 className="text-6xl font-black text-white tracking-tight uppercase">
                                                {DUMMY_ACT.participants[currentParticipantIndex].name}
                                            </h2>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Outro Phase */}
                        <AnimatePresence>
                            {phase === 'OUTRO' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 1.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-center"
                                >
                                    <div className="w-32 h-32 mx-auto rounded-full bg-primary flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(var(--primary),0.8)]">
                                        <span className="text-white font-black text-4xl tracking-tighter">IOH</span>
                                    </div>
                                    <h3 className="text-white font-black tracking-[0.5em] uppercase text-4xl">Get Ready</h3>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
