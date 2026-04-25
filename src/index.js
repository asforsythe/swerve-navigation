import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Register service worker in both dev and production — required for Web Push in dev
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('[Swerve SW] Registered:', reg.scope))
      .catch((err) => console.warn('[Swerve SW] Registration failed:', err));
  });
}
