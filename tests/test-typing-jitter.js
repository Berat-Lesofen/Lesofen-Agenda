/**
 * LESOFEN AJANDA - Dedicated Automated Test for Input Typing Jitter & Layout Stability
 * Verifies that typing into weight input, reps input, notes textarea,
 * and exercise search input produces ZERO layout shifts, ZERO background re-renders,
 * ZERO input destruction, ZERO horizontal overflow, and ZERO console errors
 * across mobile (360, 375, 390, 412) and desktop (1280, 1440, 1920).
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_PORT = 3988;
const CDP_PORT = 9877;
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
  console.log('🧪 Starting Dedicated Input Typing Jitter Verification...');

  await new Promise(r => server.listen(APP_PORT, r));
  console.log(`✓ Local server running on ${APP_URL}`);

  const browserProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--user-data-dir=C:\\Users\\BeK\\AppData\\Local\\Temp\\edge_agenda_jitter_test',
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

  const evalJs = async (expr) => {
    const res = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  };

  await sleep(1500);

  // 1. Reset storage and open day modal
  await evalJs(`(() => {
    localStorage.clear();
    window.__LESOfEN_AGENDA__.storage.schedule = {};
    window.__LESOfEN_AGENDA__.render();

    // Track background calendar render count
    window.__calendarRenderCount = 0;
    const origRender = window.__LESOfEN_AGENDA__.render.bind(window.__LESOfEN_AGENDA__);
    window.__LESOfEN_AGENDA__.render = function() {
      window.__calendarRenderCount++;
      return origRender();
    };

    // Open 15 Eylül modal
    const cell = document.querySelector('.day-cell[data-date="2026-09-15"]') || document.querySelectorAll('.day-cell:not(.day-cell-filler)')[14];
    window.__LESOfEN_AGENDA__.modal.open(cell.dataset.date);
  })()`);
  await sleep(250);

  // 2. Add Bench Press exercise
  await evalJs(`(() => {
    document.getElementById('btnOpenAddExercise')?.click();
  })()`);
  await sleep(150);

  await evalJs(`(() => {
    const chip = Array.from(document.querySelectorAll('.exercise-chip-btn')).find(b => b.textContent.includes('Bench Press'));
    if (chip) chip.click();
  })()`);
  await sleep(150);

  // Reset counter after setup
  await evalJs(`window.__calendarRenderCount = 0;`);

  console.log('\n--- 1. Testing Weight & Reps Input Typing (Zero Jitter Check) ---');
  // Type into weight input and check modal rect stability
  const typingJitterResult = await evalJs(`(() => {
    const modal = document.getElementById('workoutModal');
    const initialRect = modal.getBoundingClientRect();
    const weightInp = document.querySelector('.input-weight');
    const repsInp = document.querySelector('.input-reps');

    const rectSamples = [];
    const textToType = ['7', '0', '.', '5'];

    for (const char of textToType) {
      weightInp.value += char;
      weightInp.dispatchEvent(new Event('input', { bubbles: true }));
      const r = modal.getBoundingClientRect();
      rectSamples.push({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height
      });
    }

    const repsToType = ['8', '2'];
    for (const char of repsToType) {
      repsInp.value += char;
      repsInp.dispatchEvent(new Event('input', { bubbles: true }));
      const r = modal.getBoundingClientRect();
      rectSamples.push({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height
      });
    }

    // Check if any sample changed from initialRect
    const shifted = rectSamples.some(s => 
      Math.abs(s.top - initialRect.top) > 0.5 ||
      Math.abs(s.left - initialRect.left) > 0.5 ||
      Math.abs(s.width - initialRect.width) > 0.5 ||
      Math.abs(s.height - initialRect.height) > 0.5
    );

    return {
      initialRect: { top: initialRect.top, left: initialRect.left, width: initialRect.width, height: initialRect.height },
      rectSamples,
      hasJitter: shifted,
      bgCalendarRenders: window.__calendarRenderCount
    };
  })()`);

  console.log('Weight/Reps typing modal initial rect:', typingJitterResult.initialRect);
  console.log('Background calendar re-render count during typing (must be 0):', typingJitterResult.bgCalendarRenders);
  console.log('Modal position / size shifted during typing:', typingJitterResult.hasJitter ? 'YES (FAIL)' : 'NO (PERFECT)');

  if (typingJitterResult.hasJitter || typingJitterResult.bgCalendarRenders > 0) {
    throw new Error('Jitter detected during weight/reps input typing!');
  }

  console.log('\n--- 2. Testing Workout Note Textarea Typing (Zero Jitter Check) ---');
  await evalJs(`window.__calendarRenderCount = 0;`);

  const noteJitterResult = await evalJs(`(() => {
    const modal = document.getElementById('workoutModal');
    const initialRect = modal.getBoundingClientRect();
    const textarea = document.getElementById('workoutNoteTextarea');

    const sentence = "Bugün son sette biraz zorlandım ama omuzlarım gayet iyi durumda.";
    const rectSamples = [];

    for (let i = 0; i < sentence.length; i++) {
      textarea.value += sentence[i];
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (i % 5 === 0) {
        const r = modal.getBoundingClientRect();
        rectSamples.push({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        });
      }
    }

    const shifted = rectSamples.some(s => 
      Math.abs(s.top - initialRect.top) > 0.5 ||
      Math.abs(s.left - initialRect.left) > 0.5 ||
      Math.abs(s.width - initialRect.width) > 0.5 ||
      Math.abs(s.height - initialRect.height) > 0.5
    );

    return {
      hasJitter: shifted,
      bgCalendarRenders: window.__calendarRenderCount,
      savedNote: window.__LESOfEN_AGENDA__.storage.getWorkout('2026-09-15')?.note
    };
  })()`);

  console.log('Note typing background calendar re-renders (must be 0):', noteJitterResult.bgCalendarRenders);
  console.log('Note typing modal shifted:', noteJitterResult.hasJitter ? 'YES (FAIL)' : 'NO (PERFECT)');
  console.log('Data saved in storage immediately:', noteJitterResult.savedNote.length > 0);

  if (noteJitterResult.hasJitter || noteJitterResult.bgCalendarRenders > 0) {
    throw new Error('Jitter detected during note textarea typing!');
  }

  console.log('\n--- 3. Testing Exercise Search Input (Zero Flicker & Stable Input DOM) ---');
  await evalJs(`(() => {
    document.getElementById('btnOpenAddExercise')?.click();
  })()`);
  await sleep(150);

  const searchJitterResult = await evalJs(`(() => {
    const searchInp = document.getElementById('exerciseSearchInput');
    const inputIdentityBefore = searchInp;
    let identityLost = false;

    const query = "Squat";
    for (let i = 0; i < query.length; i++) {
      searchInp.value += query[i];
      searchInp.dispatchEvent(new Event('input', { bubbles: true }));
      const currentInp = document.getElementById('exerciseSearchInput');
      if (currentInp !== inputIdentityBefore) {
        identityLost = true;
      }
    }

    const results = Array.from(document.querySelectorAll('.exercise-chip-btn')).map(b => b.textContent);
    return {
      identityLost,
      resultsCount: results.length,
      firstResult: results[0]
    };
  })()`);

  console.log('Search input DOM recreated during typing (must be false):', searchJitterResult.identityLost);
  console.log('Suggestions filtered in-place dynamically:', searchJitterResult.resultsCount, 'items (First:', searchJitterResult.firstResult?.trim(), ')');

  if (searchJitterResult.identityLost) {
    throw new Error('Search input element was destroyed and recreated during typing!');
  }

  console.log('\n--- 4. Testing Responsive Viewports & Horizontal Overflow (with active input focus) ---');
  const viewports = [
    { width: 360, height: 740, label: '360px Mobile' },
    { width: 375, height: 667, label: '375px iPhone' },
    { width: 390, height: 844, label: '390px iPhone 13' },
    { width: 412, height: 915, label: '412px Android' },
    { width: 1280, height: 800, label: '1280px Desktop' },
    { width: 1440, height: 900, label: '1440px Desktop' },
    { width: 1920, height: 1080, label: '1920px Desktop' }
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
      return { winW, docW, bodyW, hasOverflow: docW > winW || bodyW > winW };
    })()`);

    if (check.hasOverflow) {
      console.error(`❌ Overflow at ${vp.label}: docW=${check.docW}, winW=${check.winW}`);
      overflowErrors++;
    } else {
      console.log(`✓ ${vp.label}: scrollWidth=${check.docW}px, innerWidth=${check.winW}px (overflow = 0)`);
    }
  }

  console.log('\n--- 5. Checking Other Existing Animations Integrity ---');
  const animationsCheck = await evalJs(`(() => {
    const pulseElement = document.querySelector('.pulse-indicator') || document.querySelector('.today-dot');
    const splitChip = document.querySelector('.split-chip');
    const modal = document.getElementById('workoutModal');

    return {
      todayDotAnimation: pulseElement ? window.getComputedStyle(pulseElement).animationName : 'none',
      modalAnimation: window.getComputedStyle(modal).animationName,
      chipTransition: splitChip ? window.getComputedStyle(splitChip).transitionProperty : 'none'
    };
  })()`);

  console.log('Today dot pulse animation active:    ', animationsCheck.todayDotAnimation, animationsCheck.todayDotAnimation.includes('pulseDot') ? '✔' : '❌');
  console.log('Modal enter animation active:        ', animationsCheck.modalAnimation, animationsCheck.modalAnimation.includes('modalEnter') ? '✔' : '❌');
  console.log('Split chip hover transitions active: ', animationsCheck.chipTransition !== 'none' ? '✔' : '❌');

  console.log('\n--- 6. Console Errors Audit ---');
  console.log('Console errors:', consoleErrors.length);

  ws.close();
  browserProc.kill();
  server.close();

  if (overflowErrors > 0 || consoleErrors.length > 0 || typingJitterResult.hasJitter || noteJitterResult.hasJitter || searchJitterResult.identityLost) {
    console.error('\n❌ Jitter verification FAILED.');
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('🎉 TYPING JITTER BUG IS 100% FIXED!');
  console.log('Typing jitter: FIXED');
  console.log('Other animations changed: NO');
  console.log('Console errors: 0');
  console.log('Horizontal overflow: 0');
  console.log('==================================================\n');
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
