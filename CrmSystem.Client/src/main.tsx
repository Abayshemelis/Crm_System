import { StrictMode } from 'react'
import OfflineNotice from './components/OfflineNotice'
import { setOfflineHandler } from './lib/api'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/notifications/NotificationBell.css'
import App from './App.tsx'

// Unregister any legacy dev Service Worker to prevent caching old JS bundles
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register offline UI fallback for when ngrok tunnel is unreachable
setOfflineHandler(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <OfflineNotice />
    </StrictMode>
  );
});
