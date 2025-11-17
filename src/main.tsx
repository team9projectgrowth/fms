import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { TenantProvider } from './hooks/useTenant';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>
      <App />
      <Analytics />
    </TenantProvider>
  </StrictMode>
);
