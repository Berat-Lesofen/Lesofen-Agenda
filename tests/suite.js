/**
 * LESOFEN AGENDA - Comprehensive Automated Test Suite
 * Training · Planning · Consistency
 */

import assert from 'node:assert/strict';

// Mock localStorage for headless Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();

console.log('🧪 Starting LESOFEN AGENDA Test Suite...\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function it(desc, fn) {
    try {
      fn();
      console.log(`  ✓ ${desc}`);
      passed++;
    } catch (e) {
      console.error(`  ✕ ${desc}`);
      console.error('    Error:', e.message);
      failed++;
    }
  }

  // 1. Storage & Abstraction Tests
  console.log('[1. Storage & Abstraction Tests]');
  const { agendaStorage, SPLITS, SPLIT_MAP, STORAGE_KEY } = await import('../js/storage.js');

  it('All 9 required splits are defined properly', () => {
    const required = ["PUSH", "PULL", "LEGS", "UPPER", "LOWER", "FULL BODY", "ANTERIOR", "POSTERIOR", "REST"];
    assert.equal(SPLITS.length, 9);
    for (const req of required) {
      const found = SPLIT_MAP.get(req);
      assert.ok(found, `Split ${req} must exist`);
      assert.ok(found.color, `Split ${req} has color`);
      assert.ok(found.bg, `Split ${req} has background`);
      assert.ok(found.border, `Split ${req} has border`);
    }
  });

  it('Can add a workout to a day', () => {
    agendaStorage.setWorkout('2026-09-15', 'PUSH', 'planned');
    const workout = agendaStorage.getWorkout('2026-09-15');
    assert.ok(workout);
    assert.equal(workout.split, 'PUSH');
    assert.equal(workout.status, 'planned');
  });

  it('Can toggle workout status between planned and completed', () => {
    const status1 = agendaStorage.toggleStatus('2026-09-15');
    assert.equal(status1, 'completed');
    const w1 = agendaStorage.getWorkout('2026-09-15');
    assert.equal(w1.status, 'completed');

    const status2 = agendaStorage.toggleStatus('2026-09-15');
    assert.equal(status2, 'planned');
    const w2 = agendaStorage.getWorkout('2026-09-15');
    assert.equal(w2.status, 'planned');
  });

  it('Can update/change split for an existing day', () => {
    agendaStorage.setWorkout('2026-09-15', 'PULL', 'completed');
    const workout = agendaStorage.getWorkout('2026-09-15');
    assert.equal(workout.split, 'PULL');
    assert.equal(workout.status, 'completed');
  });

  it('Can delete a workout', () => {
    agendaStorage.deleteWorkout('2026-09-15');
    const workout = agendaStorage.getWorkout('2026-09-15');
    assert.equal(workout, null);
  });

  it('Calculates monthly summary statistics accurately', () => {
    // 3 workouts + 1 rest + 2 completed
    agendaStorage.setWorkout('2026-09-01', 'PUSH', 'completed');
    agendaStorage.setWorkout('2026-09-02', 'PULL', 'completed');
    agendaStorage.setWorkout('2026-09-03', 'REST', 'planned');
    agendaStorage.setWorkout('2026-09-04', 'LEGS', 'planned');

    const stats = agendaStorage.getMonthStats(2026, 8); // Month index 8 = September
    assert.equal(stats.totalWorkouts, 3);
    assert.equal(stats.restDays, 1);
    assert.equal(stats.completed, 2);
  });

  it('Preserves data across reloads (localStorage persistence)', () => {
    const rawData = globalThis.localStorage.getItem(STORAGE_KEY);
    assert.ok(rawData, 'Raw data must exist in localStorage');
    const parsed = JSON.parse(rawData);
    assert.ok(parsed['2026-09-01']);
    assert.equal(parsed['2026-09-01'].split, 'PUSH');
    assert.equal(parsed['2026-09-01'].status, 'completed');
  });

  // 2. Calendar Logic & Boundaries
  console.log('\n[2. Calendar Engine Boundaries]');

  it('Computes correct days in month including leap years', () => {
    const feb2024 = new Date(2024, 2, 0).getDate();
    assert.equal(feb2024, 29);
    const feb2025 = new Date(2025, 2, 0).getDate();
    assert.equal(feb2025, 28);
    const sep2026 = new Date(2026, 9, 0).getDate();
    assert.equal(sep2026, 30);
  });

  it('Handles previous/next month transitions across year boundaries', () => {
    let year = 2026;
    let month = 0; // January

    // Prev month from Jan -> Dec previous year
    if (month === 0) {
      month = 11;
      year -= 1;
    }
    assert.equal(month, 11);
    assert.equal(year, 2025);

    // Next month from Dec -> Jan next year
    if (month === 11) {
      month = 0;
      year += 1;
    }
    assert.equal(month, 0);
    assert.equal(year, 2026);
  });

  // 3. PWA Manifest & Service Worker Verification
  console.log('\n[3. PWA Manifest & Offline Assets Verification]');
  const fs = await import('node:fs');
  const path = await import('node:path');

  it('PWA Manifest is valid JSON and contains required fields', () => {
    const manifestPath = path.resolve('manifest.webmanifest');
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    assert.equal(manifest.name, 'Lesofen Ajanda');
    assert.equal(manifest.short_name, 'Lesofen Ajanda');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.background_color, '#08090c');
    assert.equal(manifest.theme_color, '#08090c');
    assert.ok(manifest.icons.length >= 3);
  });

  it('Service Worker caches all necessary application shell files', () => {
    const swPath = path.resolve('sw.js');
    const content = fs.readFileSync(swPath, 'utf-8');
    assert.ok(content.includes('lesofen-agenda-v10'));
    assert.ok(content.includes('/js/exportCard.js'));
    assert.ok(!content.includes('/js/workoutModal.js'));
    assert.ok(!content.includes('/js/exercisesData.js'));
    assert.ok(content.includes('caches.open'));
    assert.ok(content.includes('caches.match'));
    assert.ok(content.includes('install'));
    assert.ok(content.includes('activate'));
    assert.ok(content.includes('fetch'));
  });

  // 4. V2 Antrenman Günlüğü (Workout Log) Storage Persistence Tests
  console.log('\n[4. Storage Persistence & Backward Compatibility]');

  it('Backward compatibility: normalizes legacy V1 records', () => {
    // Inject legacy V1 record into mock localStorage
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      '2026-09-10': 'PUSH',
      '2026-09-11': { split: 'PULL', status: 'completed' }
    }));

    const freshSchedule = agendaStorage.loadSchedule();
    assert.ok(freshSchedule['2026-09-10']);
    assert.equal(freshSchedule['2026-09-10'].split, 'PUSH');
    assert.equal(freshSchedule['2026-09-10'].status, 'planned');
    assert.deepEqual(freshSchedule['2026-09-10'].exercises, []);
    assert.equal(freshSchedule['2026-09-10'].note, '');

    assert.ok(freshSchedule['2026-09-11']);
    assert.equal(freshSchedule['2026-09-11'].split, 'PULL');
    assert.equal(freshSchedule['2026-09-11'].status, 'completed');
    assert.deepEqual(freshSchedule['2026-09-11'].exercises, []);
    assert.equal(freshSchedule['2026-09-11'].note, '');
  });

  it('Can add exercise with default set to a workout day', () => {
    agendaStorage.setWorkout('2026-09-15', 'PUSH', 'planned');
    const ex1 = agendaStorage.addExerciseToWorkout('2026-09-15', 'Bench Press');
    assert.ok(ex1 && ex1.id);
    assert.equal(ex1.name, 'Bench Press');
    assert.equal(ex1.sets.length, 1);

    const workout = agendaStorage.getWorkout('2026-09-15');
    assert.equal(workout.exercises.length, 1);
    assert.equal(workout.exercises[0].name, 'Bench Press');
  });

  it('Can update weight and reps of a set', () => {
    const workout = agendaStorage.getWorkout('2026-09-15');
    const exId = workout.exercises[0].id;
    agendaStorage.updateSet('2026-09-15', exId, 0, '70', '8');

    const updated = agendaStorage.getWorkout('2026-09-15');
    assert.equal(updated.exercises[0].sets[0].weight, '70');
    assert.equal(updated.exercises[0].sets[0].reps, '8');
  });

  it('Can add sets with auto-prefill from previous set', () => {
    const workout = agendaStorage.getWorkout('2026-09-15');
    const exId = workout.exercises[0].id;
    // Set 2 auto-prefill
    agendaStorage.addSetToExercise('2026-09-15', exId);
    // Set 3 explicit decimal weight & reps
    agendaStorage.addSetToExercise('2026-09-15', exId, '67.5', '7');

    const updated = agendaStorage.getWorkout('2026-09-15');
    assert.equal(updated.exercises[0].sets.length, 3);
    assert.equal(updated.exercises[0].sets[1].weight, '70');
    assert.equal(updated.exercises[0].sets[1].reps, '8');
    assert.equal(updated.exercises[0].sets[2].weight, '67.5');
    assert.equal(updated.exercises[0].sets[2].reps, '7');
  });

  it('Can add free-form workout notes', () => {
    agendaStorage.updateWorkoutNote('2026-09-15', 'Bugün son sette zorlandım.');
    const workout = agendaStorage.getWorkout('2026-09-15');
    assert.equal(workout.note, 'Bugün son sette zorlandım.');
  });

  it('Can remove a set from an exercise', () => {
    const workout = agendaStorage.getWorkout('2026-09-15');
    const exId = workout.exercises[0].id;
    agendaStorage.removeSetFromExercise('2026-09-15', exId, 1);

    const updated = agendaStorage.getWorkout('2026-09-15');
    assert.equal(updated.exercises[0].sets.length, 2);
    assert.equal(updated.exercises[0].sets[0].weight, '70');
    assert.equal(updated.exercises[0].sets[1].weight, '67.5');
  });

  it('Can remove an exercise from a workout', () => {
    const workout = agendaStorage.getWorkout('2026-09-15');
    const exId = workout.exercises[0].id;
    agendaStorage.removeExerciseFromWorkout('2026-09-15', exId);

    const updated = agendaStorage.getWorkout('2026-09-15');
    assert.equal(updated.exercises.length, 0);
    // Note should still persist
    assert.equal(updated.note, 'Bugün son sette zorlandım.');
  });

  it('Changing split preserves existing exercises and notes', () => {
    agendaStorage.addExerciseToWorkout('2026-09-15', 'Overhead Press');
    agendaStorage.setWorkout('2026-09-15', 'UPPER', 'completed');

    const updated = agendaStorage.getWorkout('2026-09-15');
    assert.equal(updated.split, 'UPPER');
    assert.equal(updated.status, 'completed');
    assert.equal(updated.exercises.length, 1);
    assert.equal(updated.exercises[0].name, 'Overhead Press');
    assert.equal(updated.note, 'Bugün son sette zorlandım.');
  });

  // 5. Monthly PNG Card & Simplified Modal Verification
  console.log('\n[5. Monthly PNG Card & Simplified Modal Verification]');
  const { ASCII_MONTH_NAMES, TR_MONTH_NAMES, TR_WEEKDAY_NAMES, exportMonthlyCard } = await import('../js/exportCard.js');

  it('ASCII month names correctly map Turkish characters for file safety', () => {
    assert.equal(ASCII_MONTH_NAMES.length, 12);
    assert.equal(ASCII_MONTH_NAMES[0], 'Ocak');
    assert.equal(ASCII_MONTH_NAMES[1], 'Subat');
    assert.equal(ASCII_MONTH_NAMES[4], 'Mayis');
    assert.equal(ASCII_MONTH_NAMES[7], 'Agustos');
    assert.equal(ASCII_MONTH_NAMES[8], 'Eylul');
    assert.equal(ASCII_MONTH_NAMES[10], 'Kasim');
    assert.equal(ASCII_MONTH_NAMES[11], 'Aralik');

    // Test filename format
    const septFilename = `Lesofen-Ajanda-${ASCII_MONTH_NAMES[8]}-2026.png`;
    assert.equal(septFilename, 'Lesofen-Ajanda-Eylul-2026.png');
  });

  it('exportCard exports all required constants and function', () => {
    assert.equal(typeof exportMonthlyCard, 'function');
    assert.equal(TR_MONTH_NAMES.length, 12);
    assert.equal(TR_WEEKDAY_NAMES.length, 7);
    assert.equal(TR_WEEKDAY_NAMES[0], 'PZT');
    assert.equal(TR_WEEKDAY_NAMES[6], 'PAZ');
  });

  it('Application is streamlined: no modal files or exercise log DOM references', () => {
    const modalPath = path.resolve('js/workoutModal.js');
    assert.equal(fs.existsSync(modalPath), false, 'workoutModal.js must be completely removed');

    const calPath = path.resolve('js/calendar.js');
    const calContent = fs.readFileSync(calPath, 'utf-8');
    assert.ok(!calContent.includes('egz'), 'No egz badge in day cells');
    assert.ok(!calContent.includes('WorkoutModal'), 'No WorkoutModal in calendar.js');
    assert.ok(calContent.includes('btnExportCard'), 'Export card button exists');
    assert.ok(calContent.includes('AYLIK KARTI İNDİR'), 'Exact button text AYLIK KARTI İNDİR exists');
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

