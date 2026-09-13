/**
 * LESOFEN AJANDA - Comprehensive Headless Browser Verification
 * Tests:
 *  1. Simplified Modal without exercise log
 *  2. Modal Close ("✕") Bug Fix, Escape dismiss, Backdrop light-dismiss
 *  3. Calendar cell clean display (no "egz" badge, split + ✓)
 *  4. "AYLIK KARTI İNDİR" export button & canvas generation
 *  5. Viewport overflow checks (360px, 375px, 390px, 412px, 768px, 1280px)
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_PORT = 4188;
const DEBUG_PORT = 9588;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

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

function startServer() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const filePath = path.join(ROOT, reqPath);
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + reqPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  return new Promise((resolve) => {
    server.listen(SERVER_PORT, () => {
      resolve(server);
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🧪 Starting Lesofen Ajanda Headless Browser Test...');
  const server = await startServer();
  console.log(`✓ Local test server running on http://localhost:${SERVER_PORT}`);

  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=C:\\Users\\BeK\\AppData\\Local\\Temp\\edge_agenda_simplified_test',
    '--no-first-run',
    '--no-default-browser-check',
    `http://localhost:${SERVER_PORT}/`
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (res.ok) {
        const pages = await res.json();
        const appPage = pages.find(p => p.url && p.url.includes(`localhost:${SERVER_PORT}`)) || pages[0];
        if (appPage && appPage.webSocketDebuggerUrl) {
          wsUrl = appPage.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('❌ Could not connect to Edge DevTools');
    edgeProc.kill();
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
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || a.description || '').join(' ');
      if (text.includes('[DEBUG')) console.log('BROWSER LOG:', text);
      if (data.params.type === 'error') consoleErrors.push(text);
    }
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Eval failed: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  // Wait for page hydration
  await sleep(1000);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✕ ${message}`);
      failed++;
    }
  }

  try {
    console.log('\n[1. App Initialization & Header Button Verification]');
    const title = await evaluate('document.title');
    assert(title.includes('LESOFEN AJANDA'), `Title is correct: "${title}"`);

    const exportBtnText = await evaluate(`
      (() => {
        const btn = document.querySelector('#btnExportCard');
        return btn ? btn.textContent.replace(/\\s+/g, ' ').trim() : null;
      })()
    `);
    assert(exportBtnText === 'AYLIK KARTI İNDİR', `Export button text is strictly "AYLIK KARTI İNDİR" (got "${exportBtnText}")`);

    console.log('\n[2. Simplified Modal & Close ("✕") Verification]');
    // Click on a day cell to open modal
    await evaluate(`
      (() => {
        const cell = document.querySelector('.day-cell:not(.day-cell-filler)');
        cell.click();
      })()
    `);
    await sleep(200);

    const isModalOpen = await evaluate(`
      (() => {
        const dialog = document.querySelector('#workoutModal');
        return dialog && (dialog.open || dialog.hasAttribute('open'));
      })()
    `);
    assert(isModalOpen === true, 'Clicking day opens workoutModal');

    // Verify obsolete exercise UI elements are completely absent
    const hasObsoleteLogElements = await evaluate(`
      (() => {
        return Boolean(
          document.querySelector('.workout-log-section') ||
          document.querySelector('#btnOpenAddExercise') ||
          document.querySelector('#exerciseSearchInput') ||
          document.querySelector('.sets-table-container') ||
          document.querySelector('#workoutNoteTextarea')
        );
      })()
    `);
    assert(hasObsoleteLogElements === false, 'Exercise logging, sets tables, and notes are NOT in the DOM');

    // Test Close via '✕' button
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('#modalBtnClose');
        closeBtn.click();
      })()
    `);
    await sleep(200);

    const isClosedAfterX = await evaluate(`
      (() => {
        const dialog = document.querySelector('#workoutModal');
        return !dialog || (!dialog.open && !dialog.hasAttribute('open'));
      })()
    `);
    assert(isClosedAfterX === true, 'Modal closes cleanly and immediately upon clicking "✕" button');

    // Test Close via Escape key
    await evaluate(`
      (() => {
        const cell = document.querySelector('.day-cell:not(.day-cell-filler)');
        cell.click();
      })()
    `);
    await sleep(150);

    await evaluate(`
      (() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      })()
    `);
    await sleep(200);

    const isClosedAfterEsc = await evaluate(`
      (() => {
        const dialog = document.querySelector('#workoutModal');
        return !dialog || (!dialog.open && !dialog.hasAttribute('open'));
      })()
    `);
    assert(isClosedAfterEsc === true, 'Modal closes cleanly upon pressing Escape key');

    // Test Close via Backdrop click
    await evaluate(`
      (() => {
        const cell = document.querySelector('.day-cell:not(.day-cell-filler)');
        cell.click();
      })()
    `);
    await sleep(150);

    await evaluate(`
      (() => {
        const dialog = document.querySelector('#workoutModal');
        dialog.click();
      })()
    `);
    await sleep(200);

    const isClosedAfterBackdrop = await evaluate(`
      (() => {
        const dialog = document.querySelector('#workoutModal');
        return !dialog || (!dialog.open && !dialog.hasAttribute('open'));
      })()
    `);
    assert(isClosedAfterBackdrop === true, 'Modal closes cleanly upon clicking backdrop (light-dismiss)');

    console.log('\n[3. Calendar Day Cell & Split Completion Verification]');
    // Ensure clean slate for day 15
    await evaluate(`
      (() => {
        const cal = window.__LESOFEN_AGENDA__;
        cal.storage.deleteWorkout('2026-09-15');
        cal.render();
      })()
    `);
    await sleep(150);

    // Assign PUSH to 15th of the month
    await evaluate(`
      (() => {
        const cell = document.querySelector('.day-cell[data-date$="-15"]');
        cell.click();
      })()
    `);
    await sleep(150);

    // Click PUSH button in modal
    await evaluate(`
      (() => {
        const pushBtn = document.querySelector('.split-select-btn[data-split-id="PUSH"]');
        if (pushBtn) pushBtn.click();
      })()
    `);
    await sleep(150);

    // Toggle status to completed
    await evaluate(`
      (() => {
        const toggleBtn = document.querySelector('#btnToggleStatus');
        if (toggleBtn) toggleBtn.click();
      })()
    `);
    await sleep(150);

    // Close modal
    await evaluate(`document.querySelector('#modalBtnClose').click();`);
    await sleep(200);

    // Check calendar cell display: should contain PUSH ✓ and NOT contain egz
    const dayCellContent = await evaluate(`
      (() => {
        const cell = document.querySelector('.day-cell[data-date$="-15"]') || document.querySelector('.day-cell.has-workout');
        if (!cell) return null;
        const text = cell.querySelector('.placed-split-text')?.textContent || '';
        const hasEgzBadge = Boolean(cell.querySelector('.placed-split-badge'));
        return { text, hasEgzBadge, date: cell.dataset.date };
      })()
    `);
    console.log('Day Cell Diag:', dayCellContent);
    assert(dayCellContent && dayCellContent.text.includes('PUSH') && dayCellContent.text.includes('✓'), `Cell shows split name and checkmark: "${dayCellContent?.text}"`);
    assert(dayCellContent && dayCellContent.hasEgzBadge === false, 'Cell has NO "egz" badge');

    console.log('\n[4. "AYLIK KARTI İNDİR" PNG Export Verification]');
    // Trigger card export
    const exportResult = await evaluate(`
      (async () => {
        const { exportMonthlyCard } = await import('/js/exportCard.js');
        const { SPLIT_MAP } = await import('/js/storage.js');
        const calendar = window.__LESOFEN_AGENDA__;
        const res = await exportMonthlyCard(calendar.currentYear, calendar.currentMonth, calendar.storage, SPLIT_MAP);
        return {
          success: res.success,
          filename: res.filename,
          hasDataUrl: Boolean(res.dataUrl && res.dataUrl.startsWith('data:image/png;base64,'))
        };
      })()
    `);

    assert(exportResult.success === true, 'exportMonthlyCard succeeded');
    assert(exportResult.filename.startsWith('Lesofen-Ajanda-') && exportResult.filename.endsWith('.png'), `Filename matches convention: "${exportResult.filename}"`);
    assert(exportResult.hasDataUrl === true, 'Generated valid PNG base64 Data URL');

    // Check button click triggers feedback
    await evaluate(`document.querySelector('#btnExportCard').click();`);
    await sleep(150);

    const buttonFeedback = await evaluate(`
      (() => {
        const btn = document.querySelector('#btnExportCard');
        return btn ? btn.textContent.replace(/\\s+/g, ' ').trim() : '';
      })()
    `);
    assert(buttonFeedback.includes('AYLIK KART İNDİRİLDİ ✓'), `Button displays instant feedback: "${buttonFeedback}"`);

    console.log('\n[5. Responsive Viewport & Overflow Verification]');
    const viewports = [
      { w: 360, h: 640, name: '360px Mobile (Small Android)' },
      { w: 375, h: 667, name: '375px Mobile (iPhone SE)' },
      { w: 390, h: 844, name: '390px Mobile (iPhone 14)' },
      { w: 412, h: 915, name: '412px Mobile (Pixel / Galaxy)' },
      { w: 768, h: 1024, name: '768px Tablet (iPad Mini)' },
      { w: 1280, h: 800, name: '1280px Desktop' }
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 2,
        mobile: vp.w < 768
      });
      await sleep(150);

      const overflowCheck = await evaluate(`
        (() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = docEl.clientWidth;
          const culprits = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > clientW + 1) {
              culprits.push({ tag: el.tagName, id: el.id, cls: el.className, right: Math.round(r.right), width: Math.round(r.width) });
            }
          });
          return {
            scrollW,
            clientW,
            hasOverflow: scrollW > clientW,
            culprits: culprits.slice(0, 5)
          };
        })()
      `);

      if (overflowCheck.hasOverflow) {
        console.log(`Culprits at ${vp.name}:`, overflowCheck.culprits);
      }

      assert(overflowCheck.hasOverflow === false, `${vp.name}: 0px horizontal overflow (scrollWidth: ${overflowCheck.scrollW}, clientWidth: ${overflowCheck.clientW})`);
    }

    console.log('\n[6. Console Error Check]');
    assert(consoleErrors.length === 0, `0 console errors detected (count: ${consoleErrors.length})`);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
    }

  } finally {
    edgeProc.kill();
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Browser Validation: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
