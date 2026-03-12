import { RouterProvider } from 'react-router-dom';
import { router } from '@/router/AppRouter';
import { usePwaManifest } from '@/hooks/usePwaManifest';
import './App.css';

function App() {
  usePwaManifest();
  return <RouterProvider router={router} />;
}

export default App;
