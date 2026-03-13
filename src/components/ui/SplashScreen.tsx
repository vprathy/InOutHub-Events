import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashScreen: React.FC = () => {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        const statuses = [
            'Loading assets...',
            'Checking connectivity...',
            'Syncing stage state...',
            'Ready'
        ];
        let idx = 0;
        const interval = setInterval(() => {
            if (idx < statuses.length - 1) {
                idx++;
                setStatus(statuses[idx]);
            } else {
                clearInterval(interval);
            }
        }, 600);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="relative flex flex-col items-center">
                {/* Logo Animation */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12 relative"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 rotate-12">
                        <div className="text-white text-5xl font-black -rotate-12">IO</div>
                    </div>
                    {/* Ring animation */}
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        className="absolute inset-0 border-2 border-primary rounded-2xl"
                    />
                </motion.div>

                {/* Text Content */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                >
                    <h1 className="text-white text-3xl font-bold tracking-tighter mb-2">
                        INOUT<span className="text-primary">HUB</span>
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase mb-8">
                        Events Command Center
                    </p>
                </motion.div>

                {/* Progress Indicator */}
                <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2.5, ease: "easeInOut" }}
                        className="h-full bg-primary"
                    />
                </div>
                
                <AnimatePresence mode="wait">
                    <motion.p 
                        key={status}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-zinc-400 text-[10px] font-mono uppercase tracking-[0.2em]"
                    >
                        {status}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Version Footer */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-12 text-zinc-600 font-mono text-[10px] tracking-widest"
            >
                V{version}
            </motion.div>
        </motion.div>
    );
};
