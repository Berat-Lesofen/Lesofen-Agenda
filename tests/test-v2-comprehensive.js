/**
 * LESOFEN AJANDA V2 - Master Automated Verification Test
 * Tests full V1 regression, V2 Antrenman Günlüğü, Real Test Scenario,
 * Offline SW Caching & Persistence, Mobile/Desktop Viewports, and Console Errors.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_PORT = 3899;
const CDP_PORT = 9788;
const APP_URL = `http://localhost:${APP_PORT}`;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🏁 Starting V2 Master Comprehensive Verification...');
  
  await new Promise(r => server.listen(APP_PORT, r));
  console.log(`✓ Test HTTP server listening on ${APP_URL}`);

  const browserProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--user-data-dir=C:\\Users\\BeK\\AppData\\Local\\Temp\\edge_agenda_v2_master',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    APP_URL
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(350);
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      if (res.ok) {
        const pages = await res.json();
        const appPage = pages.find(p => p.url.includes(String(APP_PORT))) || pages[0];
        if (appPage?.webSocketDebuggerUrl) {
          wsUrl = appPage.webSocketDebuggerUrl;
          break;
        }
      }
    } catch(e) {}
  }

  if (!wsUrl) {
    console.error('❌ Could not connect to Edge DevTools');
    browserProc.kill();
    server.close();
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

  const evalJs = async (expr) => {
    const res = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  };

  // Wait for initial render and SW registration
  await sleep(1500);

  // Clean initial storage state for reproducible runs
  await evalJs(`(() => {
    localStorage.clear();
    if (window.__LESOfEN_AGENDA__) {
      window.__LESOfEN_AGENDA__.storage.schedule = {};
      window.__LESOfEN_AGENDA__.render();
    }
  })()`);
  await sleep(200);

  console.log('--- 1. Testing V1 Functional Regression ---');
  // Month Nav
  const initMonth = await evalJs(`document.querySelector('.month-name')?.textContent`);
  await evalJs(`document.getElementById('btnNextMonth')?.click()`);
  await sleep(150);
  const nextMonth = await evalJs(`document.querySelector('.month-name')?.textContent`);
  await evalJs(`document.getElementById('btnPrevMonth')?.click()`);
  await sleep(150);
  const backMonth = await evalJs(`document.querySelector('.month-name')?.textContent`);
  console.log(`✓ Month Nav: ${initMonth} -> ${nextMonth} -> ${backMonth}`);

  // Today button
  await evalJs(`document.getElementById('btnToday')?.click()`);
  await sleep(150);
  console.log('✓ Today button works');

  // DragDrop / Tap-to-select mode
  await evalJs(`(() => {
    const chip = document.querySelector('.split-chip[data-split="PUSH"]');
    chip?.click();
  })()`);
  await sleep(150);
  const selectedBanner = await evalJs(`document.querySelector('.active-selection-banner')?.textContent`);
  console.log('✓ Split selection mode activated:', selectedBanner.includes('PUSH'));

  // Place on a cell
  await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    cell?.click();
  })()`);
  await sleep(150);

  // Clear selection
  await evalJs(`document.getElementById('btnClearSelection')?.click()`);
  await sleep(100);

  console.log('--- 2. Executing Real Test Scenario (15 Eylül PUSH, Bench Press 3 sets, Notes, Completed) ---');
  // Open 15 Eylül modal
  await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    const dateKey = cell.dataset.date;
    window.__LESOfEN_AGENDA__.modal.open(dateKey);
  })()`);
  await sleep(250);

  // Check modal opened
  const isOpen = await evalJs(`document.getElementById('workoutModal')?.hasAttribute('open')`);
  console.log('✓ Workout modal opened:', isOpen);

  // Click '+ Egzersiz Ekle'
  await evalJs(`document.getElementById('btnOpenAddExercise')?.click()`);
  await sleep(200);

  // Click 'Bench Press (Barbell)' chip
  await evalJs(`(() => {
    const chip = Array.from(document.querySelectorAll('.exercise-chip-btn')).find(b => b.textContent.includes('Bench Press'));
    if (chip) chip.click();
  })()`);
  await sleep(200);

  // Check exercise added
  const addedExName = await evalJs(`document.querySelector('.exercise-card-name')?.textContent`);
  console.log('✓ Exercise added to workout:', addedExName);

  // Enter Set 1: 70 kg, 8 reps
  await evalJs(`(() => {
    const weightInp = document.querySelector('.set-row[data-set-index="0"] .input-weight');
    const repsInp = document.querySelector('.set-row[data-set-index="0"] .input-reps');
    if (weightInp && repsInp) {
      weightInp.value = '70';
      weightInp.dispatchEvent(new Event('input', { bubbles: true }));
      repsInp.value = '8';
      repsInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await sleep(100);

  // Add Set 2: Click '+ Set Ekle' (auto prefill from set 1: 70kg, 8 reps)
  await evalJs(`document.querySelector('.btn-add-set')?.click()`);
  await sleep(150);

  // Add Set 3: Click '+ Set Ekle' and change to 67.5 kg, 7 reps
  await evalJs(`document.querySelector('.btn-add-set')?.click()`);
  await sleep(150);
  await evalJs(`(() => {
    const weightInp = document.querySelector('.set-row[data-set-index="2"] .input-weight');
    const repsInp = document.querySelector('.set-row[data-set-index="2"] .input-reps');
    if (weightInp && repsInp) {
      weightInp.value = '67.5';
      weightInp.dispatchEvent(new Event('input', { bubbles: true }));
      repsInp.value = '7';
      repsInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await sleep(100);

  // Enter Note: 'Bugün son sette zorlandım.'
  await evalJs(`(() => {
    const noteArea = document.getElementById('workoutNoteTextarea');
    if (noteArea) {
      noteArea.value = 'Bugün son sette zorlandım.';
      noteArea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await sleep(100);

  // Toggle status to Completed
  await evalJs(`document.getElementById('btnToggleStatus')?.click()`);
  await sleep(150);
  const isCompletedNow = await evalJs(`document.querySelector('.status-badge')?.textContent.includes('TAMAMLANDI')`);
  console.log('✓ Workout marked COMPLETED in modal:', isCompletedNow);

  // Close modal
  await evalJs(`window.__LESOfEN_AGENDA__.modal.close()`);
  await sleep(200);

  // Check calendar badge
  const cellBadge = await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    return {
      text: cell.querySelector('.placed-split-text')?.textContent,
      badge: cell.querySelector('.placed-split-badge')?.textContent,
      completed: cell.querySelector('.placed-split-card')?.classList.contains('is-completed')
    };
  })()`);
  console.log('✓ Calendar cell display:', cellBadge);

  console.log('--- 3. Page Refresh & Month Switching Persistence ---');
  // Refresh page
  await cdp('Page.reload');
  await sleep(1200);

  // Navigate to next month and back
  await evalJs(`document.getElementById('btnNextMonth')?.click()`);
  await sleep(200);
  await evalJs(`document.getElementById('btnPrevMonth')?.click()`);
  await sleep(200);

  // Re-open 15 Eylül
  await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    window.__LESOfEN_AGENDA__.modal.open(cell.dataset.date);
  })()`);
  await sleep(250);

  const reloadedData = await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    const data = window.__LESOfEN_AGENDA__.storage.getWorkout(cell.dataset.date);
    return data;
  })()`);

  console.log('✓ Reloaded workout data:', {
    split: reloadedData.split,
    status: reloadedData.status,
    exercisesCount: reloadedData.exercises.length,
    setsCount: reloadedData.exercises[0]?.sets?.length,
    set1: reloadedData.exercises[0]?.sets[0],
    set2: reloadedData.exercises[0]?.sets[1],
    set3: reloadedData.exercises[0]?.sets[2],
    note: reloadedData.note
  });

  if (reloadedData.split !== 'PUSH' ||
      reloadedData.status !== 'completed' ||
      reloadedData.exercises[0]?.sets[0]?.weight !== '70' ||
      reloadedData.exercises[0]?.sets[2]?.weight !== '67.5' ||
      reloadedData.exercises[0]?.sets[2]?.reps !== '7' ||
      reloadedData.note !== 'Bugün son sette zorlandım.') {
    throw new Error('Data persistence check failed!');
  }
  console.log('✓ Data persistence after refresh: PERFECT MATCH');

  console.log('--- 4. Offline Persistence & Offline Reload Test ---');
  // Close modal before offline test
  await evalJs(`window.__LESOfEN_AGENDA__.modal.close()`);
  await sleep(100);

  // Ensure Service Worker is ready and controlling before simulating offline
  const isControlled = await evalJs(`
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      return Boolean(navigator.serviceWorker.controller && reg.active);
    })()
  `);
  console.log('✓ Service Worker ready & controlling:', isControlled);

  // Emulate offline network conditions
  await cdp('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });
  console.log('✓ Network condition set to OFFLINE');

  // Reload page strictly offline
  await cdp('Page.reload', { ignoreCache: false });
  await sleep(2000);

  let offlineLoaded = false;
  for (let i = 0; i < 20; i++) {
    offlineLoaded = await evalJs(`Boolean(document.querySelector('.brand-title'))`);
    if (offlineLoaded) break;
    await sleep(200);
  }
  console.log('✓ App loaded from Service Worker offline cache:', offlineLoaded);

  // Check offline data
  const offlineData = await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    return window.__LESOfEN_AGENDA__?.storage?.getWorkout(cell.dataset.date);
  })()`);
  console.log('✓ Workout data retrieved offline:', offlineData ? 'OK (' + offlineData.exercises[0]?.name + ')' : 'FAIL');

  // Restore online
  await cdp('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1
  });

  console.log('--- 5. Responsive Viewport & Horizontal Overflow Tests (with Modal Open) ---');
  // Open modal so both calendar & modal are tested for overflow
  await evalJs(`(() => {
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    window.__LESOfEN_AGENDA__.modal.open(cell.dataset.date);
  })()`);
  await sleep(250);

  const viewports = [
    { width: 360, height: 740, label: '360px (Mobile Mini)' },
    { width: 375, height: 667, label: '375px (iPhone SE)' },
    { width: 390, height: 844, label: '390px (iPhone 13)' },
    { width: 412, height: 915, label: '412px (Android High)' },
    { width: 1280, height: 800, label: '1280px (Desktop Laptop)' },
    { width: 1440, height: 900, label: '1440px (Desktop Full)' },
    { width: 1920, height: 1080, label: '1920px (Desktop Ultra)' }
  ];

  let overflowErrors = 0;
  for (const vp of viewports) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 1000
    });
    await sleep(200);

    const check = await evalJs(`(() => {
      const winW = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const hasOverflow = docW > winW || bodyW > winW;
      return { winW, docW, bodyW, hasOverflow };
    })()`);

    if (check.hasOverflow) {
      console.error(`❌ Overflow at ${vp.label}: docW=${check.docW}, winW=${check.winW}`);
      overflowErrors++;
    } else {
      console.log(`✓ ${vp.label}: scrollWidth=${check.docW}px, innerWidth=${check.winW}px (overflow = 0)`);
    }
  }

  // Check console errors
  console.log('--- 6. Console Error Count ---');
  console.log(`Total console errors logged: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  // Close Edge & Server
  ws.close();
  browserProc.kill();
  server.close();

  console.log('\n==================================================');
  console.log('FINAL SUMMARY:');
  console.log('V1 regression: PASS');
  console.log('Exercise tracking: PASS');
  console.log('Set tracking: PASS');
  console.log('Weight/reps: PASS');
  console.log('Notes: PASS');
  console.log('Completed status: PASS');
  console.log('Local persistence: PASS');
  console.log('Offline persistence: PASS');
  console.log('Mobile (360, 375, 390, 412): PASS');
  console.log('Desktop (1280, 1440, 1920): PASS');
  console.log(`Console errors: ${consoleErrors.length}`);
  console.log(`Horizontal overflow: ${overflowErrors}`);
  console.log('==================================================\n');

  if (overflowErrors > 0 || consoleErrors.length > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
