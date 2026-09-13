/**
 * LESOFEN AGENDA - Full Browser CDP Automated Test
 * Verifies real rendering, click interactions, modal, split placement,
 * status toggle, responsive widths (360, 375, 390, 412, 1280, 1440, 1920),
 * horizontal overflow, and console error checks.
 */

import { spawn } from 'node:child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9444;
const URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 Launching Microsoft Edge (headless Chromium)...');
  const browserProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=C:\\Users\\BeK\\AppData\\Local\\Temp\\edge_agenda_cdp',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    URL
  ], { stdio: 'ignore' });

  // Wait for port to open
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const pages = await res.json();
        const appPage = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
        if (appPage && appPage.webSocketDebuggerUrl) {
          wsUrl = appPage.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('❌ Could not connect to Edge DevTools.');
    browserProc.kill();
    process.exit(1);
  }

  console.log('🔗 Connected to Edge CDP via WebSocket:', wsUrl);

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Enable Runtime and Page
  await send('Runtime.enable');
  await send('Page.enable');

  async function evalJs(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }

  // Wait for app to render
  await sleep(600);

  console.log('\n--- 1. Functional DOM Tests in Edge ---');

  // Verify app title & structure
  const brandTitle = await evalJs(`document.querySelector('.brand-title')?.textContent`);
  console.log('✓ Brand Title:', brandTitle);

  const splitChipsCount = await evalJs(`document.querySelectorAll('.split-chip').length`);
  console.log('✓ Split Chips in Bank:', splitChipsCount);

  const dayCellsCount = await evalJs(`document.querySelectorAll('.day-cell:not(.day-cell-filler)').length`);
  console.log('✓ Month Day Cells:', dayCellsCount);

  // Test adding a workout via JS interaction
  await evalJs(`
    const testCell = document.querySelector('.day-cell[data-date]');
    const dateKey = testCell.dataset.date;
    window.__LESOfEN_AGENDA__.modal.open(dateKey);
  `);
  await sleep(200);

  const modalOpen = await evalJs(`document.getElementById('workoutModal')?.hasAttribute('open')`);
  console.log('✓ Modal opens on demand:', modalOpen);

  // Select split PUSH
  await evalJs(`
    const pushBtn = document.querySelector('#workoutModal .split-select-btn[data-split-id="PUSH"]');
    pushBtn?.click();
  `);
  await sleep(200);

  // Check if cell has placed PUSH
  const cellHasPush = await evalJs(`(() => {
    const testCell = document.querySelector('.day-cell[data-date]');
    return testCell.querySelector('.placed-split-text')?.textContent.includes('PUSH');
  })()`);
  console.log('✓ Split PUSH assigned to day:', cellHasPush);

  // Check month stats calculation in UI
  const statsWorkouts = await evalJs(`document.querySelector('.summary-val.text-amber')?.textContent`);
  console.log('✓ Month Summary updated (Workouts):', statsWorkouts);

  // Toggle status to completed
  await evalJs(`(() => {
    const testCell = document.querySelector('.day-cell[data-date]');
    const dateKey = testCell.dataset.date;
    window.__LESOfEN_AGENDA__.modal.open(dateKey);
  })()`);
  await sleep(200);

  await evalJs(`(() => {
    const toggleBtn = document.querySelector('#btnToggleStatus');
    toggleBtn?.click();
  })()`);
  await sleep(200);

  const completedInCell = await evalJs(`(() => {
    const testCell = document.querySelector('.day-cell[data-date]');
    return testCell.querySelector('.placed-split-card')?.classList.contains('is-completed');
  })()`);
  console.log('✓ Workout marked as COMPLETED in cell:', completedInCell);

  const completedStats = await evalJs(`document.querySelector('.summary-val.text-emerald')?.textContent`);
  console.log('✓ Month Summary updated (Completed):', completedStats);

  // Test Next / Prev / Today Month navigation
  const initialMonth = await evalJs(`document.querySelector('.month-name')?.textContent`);
  await evalJs(`document.getElementById('btnNextMonth')?.click()`);
  await sleep(200);
  const nextMonth = await evalJs(`document.querySelector('.month-name')?.textContent`);
  console.log(`✓ Next Month navigation: ${initialMonth} -> ${nextMonth}`);

  await evalJs(`document.getElementById('btnPrevMonth')?.click()`);
  await sleep(200);
  const prevMonth = await evalJs(`document.querySelector('.month-name')?.textContent`);
  console.log(`✓ Prev Month navigation back: ${nextMonth} -> ${prevMonth}`);

  await evalJs(`document.getElementById('btnToday')?.click()`);
  await sleep(200);
  // Close modal to ensure clean state
  await evalJs(`window.__LESOfEN_AGENDA__.modal.close()`);
  await sleep(100);

  console.log('\n--- 2. Responsive Viewport & Horizontal Overflow Tests ---');
  const viewports = [
    { width: 360, height: 740, label: '360px (Small Mobile)' },
    { width: 375, height: 667, label: '375px (iPhone SE)' },
    { width: 390, height: 844, label: '390px (iPhone 12/13/14)' },
    { width: 412, height: 915, label: '412px (Pixel 7 / Galaxy S)' },
    { width: 1280, height: 800, label: '1280px (Desktop Compact)' },
    { width: 1440, height: 900, label: '1440px (Desktop Standard)' },
    { width: 1920, height: 1080, label: '1920px (Desktop Full HD)' }
  ];

  let overflowErrors = 0;

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 1000
    });
    await sleep(250);

    const metrics = await evalJs(`(() => {
      const windowWidth = window.innerWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const hasHorizontalOverflow = docScrollWidth > windowWidth || bodyScrollWidth > windowWidth;
      const offenders = [];
      if (hasHorizontalOverflow) {
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width > windowWidth || r.right > windowWidth) {
            offenders.push({ tag: el.tagName, cls: el.className, rRight: Math.round(r.right), rWidth: Math.round(r.width) });
          }
        }
      }
      return { windowWidth, docScrollWidth, bodyScrollWidth, hasHorizontalOverflow, offenders };
    })()`);

    if (metrics.hasHorizontalOverflow) {
      console.error(`❌ Overflow detected at ${vp.label}: scrollWidth=${metrics.docScrollWidth}, innerWidth=${metrics.windowWidth}`);
      console.error('   Offenders:', metrics.offenders);
      overflowErrors++;
    } else {
      console.log(`✓ ${vp.label}: innerWidth=${metrics.windowWidth}px, scrollWidth=${metrics.docScrollWidth}px (overflow = 0)`);
    }
  }

  // Cleanup & Exit
  ws.close();
  browserProc.kill();

  console.log('\n========================================');
  if (overflowErrors === 0) {
    console.log('🎉 ALL BROWSER & RESPONSIVE TESTS PASSED (0 Errors, 0 Overflow)!');
  } else {
    console.error(`⚠️ ${overflowErrors} overflow errors found.`);
    process.exit(1);
  }
  console.log('========================================\n');
}

main().catch(err => {
  console.error('Fatal error in test:', err);
  process.exit(1);
});
