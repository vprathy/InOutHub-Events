import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router/AppRouter';
import { usePwaManifest } from '@/hooks/usePwaManifest';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { AnimatePresence } from 'framer-motion';
import { PwaUpdateBanner } from '@/components/pwa/PwaUpdateBanner';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  usePwaManifest();

  useEffect(() => {
    // Show splash screen for 3 seconds to ensure premium feel
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isLoading && <SplashScreen />}
      </AnimatePresence>
      <RouterProvider router={router} />
      <PwaUpdateBanner />
    </>
  );
}

export default App;
