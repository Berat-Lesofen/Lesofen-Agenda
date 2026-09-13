/**
 * LESOFEN AGENDA - Real Device PWA & Offline CDP Automated Test
 * Verifies Manifest, SW, Offline App Shell, Offline Storage,
 * Android Installability, iOS Meta, Viewport Overflow, and Functional Regression.
 */

import { spawn } from 'node:child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9560;
const PROD_URL = "https://lesofen-agenda.vercel.app/";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 Starting Comprehensive PWA & Offline Validation against:', PROD_URL);

  const proc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=C:\\Users\\BeK\\AppData\\Local\\Temp\\edge_agenda_pwa_master',
    '--no-first-run',
    '--no-default-browser-check',
    PROD_URL
  ], { stdio: 'ignore' });

  // Connect to Edge DevTools
  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const pages = await res.json();
        const appPage = pages.find(p => p.url && p.url.includes('lesofen-agenda.vercel.app')) || pages[0];
        if (appPage && appPage.webSocketDebuggerUrl) {
          wsUrl = appPage.webSocketDebuggerUrl;
          break;
        }
      }
    } catch(e) {}
  }

  if (!wsUrl) {
    console.error('❌ Failed to attach to Edge DevTools');
    proc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let reqId = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params?.type === 'error') {
      const msg = data.params.args.map(a => a.value || a.description).join(' ');
      consoleErrors.push(msg);
    }
  };

  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = reqId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');

  const evalInPage = async (expr) => {
    const res = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  };

  console.log('\n--- 1. MANIFEST & ANDROID INSTALLABILITY CHECKS ---');
  // Wait for initial load and SW registration
  await sleep(2500);

  // Check manifest via CDP
  let manifestData = null;
  try {
    const mfRes = await cdp('Page.getAppManifest');
    manifestData = mfRes;
  } catch(e) {
    console.warn('Page.getAppManifest warning:', e.message);
  }

  const parsedManifest = await evalInPage(`
    fetch('/manifest.webmanifest').then(r => r.json())
  `);

  console.log('Manifest Name:           ', parsedManifest.name, parsedManifest.name === 'Lesofen Ajanda' ? '✔' : '❌');
  console.log('Manifest Short Name:     ', parsedManifest.short_name, parsedManifest.short_name === 'Lesofen Ajanda' ? '✔' : '❌');
  console.log('Manifest Description:    ', parsedManifest.description);
  console.log('Manifest Start URL:      ', parsedManifest.start_url, parsedManifest.start_url === '/' ? '✔' : '❌');
  console.log('Manifest Scope:          ', parsedManifest.scope, parsedManifest.scope === '/' ? '✔' : '❌');
  console.log('Manifest Display:        ', parsedManifest.display, parsedManifest.display === 'standalone' ? '✔' : '❌');
  console.log('Manifest Orientation:    ', parsedManifest.orientation, parsedManifest.orientation === 'portrait-primary' ? '✔' : '❌');
  console.log('Manifest Theme Color:    ', parsedManifest.theme_color, parsedManifest.theme_color === '#08090c' ? '✔' : '❌');
  console.log('Manifest Background:     ', parsedManifest.background_color, parsedManifest.background_color === '#08090c' ? '✔' : '❌');
  console.log('Manifest Icons Count:    ', parsedManifest.icons?.length, parsedManifest.icons?.length >= 3 ? '✔' : '❌');

  const has192 = parsedManifest.icons.some(i => i.sizes === '192x192');
  const has512 = parsedManifest.icons.some(i => i.sizes === '512x512');
  const hasMaskable = parsedManifest.icons.some(i => i.purpose?.includes('maskable'));
  console.log('192x192 Icon present:    ', has192 ? '✔' : '❌');
  console.log('512x512 Icon present:    ', has512 ? '✔' : '❌');
  console.log('Maskable Icon present:   ', hasMaskable ? '✔' : '❌');

  console.log('\n--- 2. IOS SAFARI META TAGS CHECKS ---');
  const iosMeta = await evalInPage(`({
    appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
    statusBar: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content,
    appleTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content,
    appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.href,
    manifestLink: document.querySelector('link[rel="manifest"]')?.href
  })`);

  console.log('apple-mobile-web-app-capable:           ', iosMeta.appleCapable, iosMeta.appleCapable === 'yes' ? '✔' : '❌');
  console.log('apple-mobile-web-app-status-bar-style:  ', iosMeta.statusBar, iosMeta.statusBar === 'black-translucent' ? '✔' : '❌');
  console.log('apple-mobile-web-app-title:             ', iosMeta.appleTitle, iosMeta.appleTitle === 'Lesofen Ajanda' ? '✔' : '❌');
  console.log('apple-touch-icon href:                  ', iosMeta.appleIcon, Boolean(iosMeta.appleIcon) ? '✔' : '❌');

  console.log('\n--- 3. SERVICE WORKER REGISTRATION & CONTROLLER CHECK ---');
  // First visit: check registration
  const swStatus1 = await evalInPage(`
    navigator.serviceWorker.getRegistration().then(reg => ({
      registered: Boolean(reg),
      active: Boolean(reg?.active),
      scope: reg?.scope,
      controller: Boolean(navigator.serviceWorker.controller)
    }))
  `);
  console.log('Initial SW Registered:   ', swStatus1.registered ? '✔' : '❌');
  console.log('Initial SW Active:       ', swStatus1.active ? '✔' : '❌');
  console.log('Initial SW Scope:        ', swStatus1.scope);

  // Reload once so the service worker becomes controller (skipWaiting + clients.claim also ensures this)
  console.log('Reloading page to verify controller...');
  await cdp('Page.reload');
  await sleep(2500);

  const swStatus2 = await evalInPage(`
    navigator.serviceWorker.getRegistration().then(reg => ({
      registered: Boolean(reg),
      active: Boolean(reg?.active),
      controller: Boolean(navigator.serviceWorker.controller)
    }))
  `);
  console.log('Post-reload Controller:  ', swStatus2.controller ? '✔ Page is Controlled' : '❌ Not Controlled');

  console.log('\n--- 4. REAL ONLINE INTERACTION & LOCALSTORAGE DATA POPULATION ---');
  // Assign PUSH, PULL, REST to dates in current month via real UI interactions
  const testData = await evalInPage(`
    (() => {
      const year = 2026;
      const monthStr = '09';
      const d1 = year + '-' + monthStr + '-10';
      const d2 = year + '-' + monthStr + '-12';
      const d3 = year + '-' + monthStr + '-14';

      // 1. Tap PUSH chip, then tap day 1
      document.querySelector('[data-split="PUSH"]').click();
      document.querySelector('[data-date="' + d1 + '"]').click();

      // 2. Tap PULL chip, then tap day 2
      document.querySelector('[data-split="PULL"]').click();
      document.querySelector('[data-date="' + d2 + '"]').click();

      // 3. Tap REST chip, then tap day 3
      document.querySelector('[data-split="REST"]').click();
      document.querySelector('[data-date="' + d3 + '"]').click();

      // Verify DOM cards placed
      const card1 = document.querySelector('[data-date="' + d1 + '\"] .placed-split-card');
      const card2 = document.querySelector('[data-date="' + d2 + '\"] .placed-split-card');
      const card3 = document.querySelector('[data-date="' + d3 + '\"] .placed-split-card');

      return {
        d1, d2, d3,
        card1: Boolean(card1),
        card2: Boolean(card2),
        card3: Boolean(card3)
      };
    })()
  `);
  console.log('Placed PUSH on 2026-09-10: ', testData.card1 ? '✔' : '❌');
  console.log('Placed PULL on 2026-09-12: ', testData.card2 ? '✔' : '❌');
  console.log('Placed REST on 2026-09-14: ', testData.card3 ? '✔' : '❌');

  // Reload online and verify data preserved
  console.log('Reloading online to test persistence...');
  await cdp('Page.reload');
  await sleep(2000);

  const persistedCheckOnline = await evalInPage(`
    (() => {
      const card1 = document.querySelector('[data-date=\"2026-09-10\"] .placed-split-text')?.textContent;
      const card2 = document.querySelector('[data-date=\"2026-09-12\"] .placed-split-text')?.textContent;
      const card3 = document.querySelector('[data-date=\"2026-09-14\"] .placed-split-text')?.textContent;
      return { card1, card2, card3 };
    })()
  `);
  console.log('Online Persist Card 1:   ', persistedCheckOnline.card1, persistedCheckOnline.card1?.includes('PUSH') ? '✔' : '❌');
  console.log('Online Persist Card 2:   ', persistedCheckOnline.card2, persistedCheckOnline.card2?.includes('PULL') ? '✔' : '❌');
  console.log('Online Persist Card 3:   ', persistedCheckOnline.card3, persistedCheckOnline.card3?.includes('REST') ? '✔' : '❌');

  console.log('\n--- 5. OFFLINE REAL SCENARIO TEST (Network offline = true) ---');
  // Emulate completely offline network
  console.log('🔌 Disconnecting network (Offline Mode ON)...');
  await cdp('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });

  // Verify navigator.onLine is false or fetch fails
  const isOnlineInBrowser = await evalInPage('navigator.onLine');
  console.log('Browser reported online: ', isOnlineInBrowser);

  // Reload page while strictly offline
  console.log('🔄 Reloading page while 100% OFFLINE...');
  await cdp('Page.reload', { ignoreCache: false });
  await sleep(2500);

  // Check if App Shell, DOM, CSS, JS, and Data loaded
  const offlineCheck = await evalInPage(`
    (() => {
      const title = document.title;
      const splitsCount = document.querySelectorAll('.split-chip').length;
      const dayCells = document.querySelectorAll('.day-cell').length;
      const statsBar = Boolean(document.querySelector('.month-summary-bar'));
      const card1 = document.querySelector('[data-date=\"2026-09-10\"] .placed-split-text')?.textContent;
      const card2 = document.querySelector('[data-date=\"2026-09-12\"] .placed-split-text')?.textContent;
      const card3 = document.querySelector('[data-date=\"2026-09-14\"] .placed-split-text')?.textContent;

      // Verify localStorage read while offline
      const rawStorage = localStorage.getItem('lesofen_agenda_schedule_v1');
      const parsedStorage = rawStorage ? JSON.parse(rawStorage) : null;

      // Check CSS applied (background color computed)
      const bgColor = window.getComputedStyle(document.body).backgroundColor;

      return {
        title,
        splitsCount,
        dayCells,
        statsBar,
        card1,
        card2,
        card3,
        storageCount: parsedStorage ? Object.keys(parsedStorage).length : 0,
        bgColor
      };
    })()
  `);

  console.log('Offline Page Title:      ', offlineCheck.title);
  console.log('Offline Split Chips:     ', offlineCheck.splitsCount, offlineCheck.splitsCount === 9 ? '✔ PASSED' : '❌ FAILED');
  console.log('Offline Calendar Cells:  ', offlineCheck.dayCells, offlineCheck.dayCells >= 28 ? '✔ PASSED' : '❌ FAILED');
  console.log('Offline Stats Bar:       ', offlineCheck.statsBar ? '✔ PASSED' : '❌ FAILED');
  console.log('Offline Data PUSH:       ', offlineCheck.card1, offlineCheck.card1?.includes('PUSH') ? '✔ PASSED' : '❌ FAILED');
  console.log('Offline Data PULL:       ', offlineCheck.card2, offlineCheck.card2?.includes('PULL') ? '✔ PASSED' : '❌ FAILED');
  console.log('Offline Data REST:       ', offlineCheck.card3, offlineCheck.card3?.includes('REST') ? '✔ PASSED' : '❌ FAILED');
  console.log('Offline Storage Keys:    ', offlineCheck.storageCount, offlineCheck.storageCount >= 3 ? '✔ PASSED' : '❌ FAILED');

  // Test adding a workout while offline
  console.log('Testing adding workout while OFFLINE...');
  const offlineAdd = await evalInPage(`
    (() => {
      document.querySelector('[data-split="LEGS"]').click();
      document.querySelector('[data-date="2026-09-20"]').click();
      const legsCard = document.querySelector('[data-date="2026-09-20"] .placed-split-text')?.textContent;
      return Boolean(legsCard && legsCard.includes('LEGS'));
    })()
  `);
  console.log('Offline workout add LEGS:', offlineAdd ? '✔ PASSED' : '❌ FAILED');

  // Re-enable network
  console.log('🔌 Restoring network (Online Mode ON)...');
  await cdp('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1
  });
  await sleep(1000);

  console.log('\n--- 6. FUNCTIONAL REGRESSION CHECKS ---');
  const funcTest = await evalInPage(`
    (() => {
      // 1. Test Next Month
      const initialMonth = window.__LESOFEN_AGENDA__.currentMonth;
      document.getElementById('btnNextMonth').click();
      const nextMonth = window.__LESOFEN_AGENDA__.currentMonth;

      // 2. Test Today button
      document.getElementById('btnToday').click();
      const todayMonth = window.__LESOFEN_AGENDA__.currentMonth;

      // 3. Test Prev Month
      document.getElementById('btnPrevMonth').click();
      const prevMonth = window.__LESOFEN_AGENDA__.currentMonth;

      // 4. Return to target month for workout test and clear selected split
      window.__LESOFEN_AGENDA__.currentYear = 2026;
      window.__LESOFEN_AGENDA__.currentMonth = 8; // September
      window.__LESOFEN_AGENDA__.dragDrop.clearSelectedSplit();
      window.__LESOFEN_AGENDA__.render();

      // 5. Test modal open
      const dayCell = document.querySelector('[data-date="2026-09-10"]');
      dayCell.click();
      const dialog = document.getElementById('workoutModal');
      const modalOpen = Boolean(dialog && dialog.open);

      // 6. Test toggle completed
      const toggleBtn = document.getElementById('btnToggleStatus');
      if (toggleBtn) toggleBtn.click();
      const workoutAfterToggle = window.__LESOFEN_AGENDA__.storage.getWorkout('2026-09-10');
      const isCompleted = workoutAfterToggle?.status === 'completed';

      // 7. Test delete workout
      const deleteBtn = document.getElementById('btnDeleteWorkout');
      if (deleteBtn) deleteBtn.click();
      const workoutAfterDelete = window.__LESOFEN_AGENDA__.storage.getWorkout('2026-09-10');

      return {
        nextOk: nextMonth !== initialMonth,
        todayOk: todayMonth !== undefined,
        modalOk: modalOpen,
        completedOk: isCompleted,
        deleteOk: workoutAfterDelete === null
      };
    })()
  `);

  console.log('Next Month Nav:          ', funcTest.nextOk ? '✔ PASSED' : '❌ FAILED');
  console.log('Today Button:            ', funcTest.todayOk ? '✔ PASSED' : '❌ FAILED');
  console.log('Workout Modal Dialog:    ', funcTest.modalOk ? '✔ PASSED' : '❌ FAILED');
  console.log('Toggle Status Completed: ', funcTest.completedOk ? '✔ PASSED' : '❌ FAILED');
  console.log('Delete Workout:          ', funcTest.deleteOk ? '✔ PASSED' : '❌ FAILED');

  console.log('\n--- 7. VIEWPORT REGRESSION & HORIZONTAL OVERFLOW CHECKS ---');
  const widths = [360, 375, 390, 412, 1280, 1440, 1920];
  let overflowPass = true;
  for (const w of widths) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 800,
      deviceScaleFactor: 1,
      mobile: w < 600
    });
    await sleep(200);
    const scrollWidth = await evalInPage('document.documentElement.scrollWidth');
    const clientWidth = await evalInPage('document.documentElement.clientWidth');
    const hasOverflow = scrollWidth > clientWidth;
    if (hasOverflow) overflowPass = false;
    console.log(`Viewport ${w}px: scrollWidth=${scrollWidth}, clientWidth=${clientWidth} ${hasOverflow ? '❌ OVERFLOW' : '✔ NO OVERFLOW'}`);
  }

  console.log('\n--- 8. CONSOLE ERRORS AUDIT ---');
  console.log('Total Console Errors:    ', consoleErrors.length, consoleErrors.length === 0 ? '✔ None' : '❌ ' + consoleErrors.join('; '));

  ws.close();
  proc.kill();

  const allPassed = (
    parsedManifest.name === 'Lesofen Ajanda' &&
    parsedManifest.short_name === 'Lesofen Ajanda' &&
    parsedManifest.display === 'standalone' &&
    has192 && has512 &&
    iosMeta.appleCapable === 'yes' &&
    swStatus1.registered &&
    swStatus2.controller &&
    offlineCheck.splitsCount === 9 &&
    offlineCheck.storageCount >= 3 &&
    offlineAdd &&
    funcTest.nextOk &&
    funcTest.completedOk &&
    funcTest.deleteOk &&
    overflowPass &&
    consoleErrors.length === 0
  );

  if (allPassed) {
    console.log('\n========================================');
    console.log('🎉 ALL PWA, OFFLINE & DEVICE TESTS PASSED!');
    console.log('========================================');
    process.exit(0);
  } else {
    console.error('\n❌ Validation checks failed.');
    process.exit(1);
  }
}

run();
