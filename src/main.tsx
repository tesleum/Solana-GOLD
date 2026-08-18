import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Root from './Root';
import './index.css';

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(console.error)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
