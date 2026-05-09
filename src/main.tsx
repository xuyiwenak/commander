import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { RuntimeConfigProvider } from './components/RuntimeConfig';
import { biInit } from './utils/bi';

biInit({ appName: 'commander', apiBase: '/api/bi' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RuntimeConfigProvider>
        <App />
      </RuntimeConfigProvider>
    </ErrorBoundary>
  </StrictMode>,
);
