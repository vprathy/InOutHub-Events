import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './index.css';
import App from '@/App.tsx';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for automatic updates
const updateSW = registerSW({
  onNeedRefresh() {
    // Automatically accept the update and reload the page
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  immediate: true
});

// Ensure clients reload when a new service worker takes over
if (import.meta.env.PROD) {
  let refreshing = false;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

import { SelectionProvider } from '@/context/SelectionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <SelectionProvider>
          <App />
        </SelectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
