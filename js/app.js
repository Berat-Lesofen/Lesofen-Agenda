/**
 * LESOFEN AGENDA - Main Application Entry Point
 * Training · Planning · Consistency
 */

import { CalendarApp } from './calendar.js';

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[Lesofen Agenda] App root element #app not found.');
    return;
  }

  // Initialize Calendar Application
  const calendar = new CalendarApp(appContainer);
  window.__LESOFEN_AGENDA__ = calendar;

  // Register Service Worker for PWA & Offline Support
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[Lesofen Agenda] Service Worker registered with scope:', reg.scope);
          if (reg.active) {
            console.log('[Lesofen Agenda] Service Worker active');
          }
          if (navigator.serviceWorker.controller) {
            console.log('[Lesofen Agenda] Page is controlled by Service Worker');
          }
        })
        .catch(err => {
          console.warn('[Lesofen Agenda] Service Worker registration failed:', err);
        });
    });
  }
}
