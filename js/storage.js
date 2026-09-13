/**
 * LESOFEN AGENDA - Storage & Data Abstraction Layer
 * Training · Planning · Consistency
 *
 * Designed with a clean abstraction so localStorage can be replaced
 * or extended with IndexedDB / Supabase without altering UI logic.
 */

export const STORAGE_KEY = 'lesofen_agenda_schedule_v1';

export const SPLITS = [
  { id: "PUSH", name: "PUSH", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.35)", isRest: false },
  { id: "PULL", name: "PULL", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.35)", isRest: false },
  { id: "LEGS", name: "LEGS", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.35)", isRest: false },
  { id: "UPPER", name: "UPPER", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.35)", isRest: false },
  { id: "LOWER", name: "LOWER", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.35)", isRest: false },
  { id: "FULL BODY", name: "FULL BODY", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.35)", isRest: false },
  { id: "ANTERIOR", name: "ANTERIOR", color: "#eab308", bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.35)", isRest: false },
  { id: "POSTERIOR", name: "POSTERIOR", color: "#ec4899", bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.35)", isRest: false },
  { id: "REST", name: "REST", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.30)", isRest: true }
];

export const SPLIT_MAP = new Map(SPLITS.map(s => [s.id, s]));

class AgendaStorage {
  constructor() {
    this._listeners = new Set();
    this.schedule = this.loadSchedule();
  }

  /**
   * Load schedule from localStorage with V1/V2 normalization
   * @returns {Object.<string, {split: string, status: string, exercises: Array, note: string, updatedAt: string}>}
   */
  loadSchedule() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const normalized = {};
      for (const [dateKey, val] of Object.entries(parsed)) {
        if (!val) continue;
        if (typeof val === 'string') {
          normalized[dateKey] = {
            split: val,
            status: 'planned',
            exercises: [],
            note: '',
            updatedAt: new Date().toISOString()
          };
        } else if (typeof val === 'object' && val.split) {
          normalized[dateKey] = {
            split: val.split,
            status: val.status === 'completed' ? 'completed' : 'planned',
            exercises: Array.isArray(val.exercises) ? val.exercises : [],
            note: typeof val.note === 'string' ? val.note : '',
            updatedAt: val.updatedAt || new Date().toISOString()
          };
        }
      }
      return normalized;
    } catch (err) {
      console.warn('[AgendaStorage] Failed to load schedule from storage:', err);
      return {};
    }
  }

  /**
   * Save current schedule to localStorage
   * @param {boolean} [notify=true] - Whether to notify subscribers (false during high-frequency typing)
   */
  saveSchedule(notify = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.schedule));
      if (notify) {
        this._notify();
      }
    } catch (err) {
      console.error('[AgendaStorage] Failed to save schedule to storage:', err);
    }
  }

  /**
   * Get workout entry for a specific date (YYYY-MM-DD)
   */
  getWorkout(dateKey) {
    return this.schedule[dateKey] || null;
  }

  /**
   * Get split object for dateKey
   */
  getSplitForDate(dateKey) {
    const entry = this.getWorkout(dateKey);
    if (!entry) return null;
    return SPLIT_MAP.get(entry.split) || null;
  }

  /**
   * Set or update workout for a date, preserving exercises and note
   * @param {string} dateKey - Format 'YYYY-MM-DD'
   * @param {string} splitId - Split identifier (e.g. 'PUSH')
   * @param {'planned'|'completed'} [status='planned']
   */
  setWorkout(dateKey, splitId, status = 'planned') {
    if (!splitId) {
      this.deleteWorkout(dateKey);
      return;
    }

    const existing = this.schedule[dateKey];
    this.schedule[dateKey] = {
      split: splitId,
      status: status === 'completed' ? 'completed' : 'planned',
      exercises: existing?.exercises ? [...existing.exercises] : [],
      note: typeof existing?.note === 'string' ? existing.note : '',
      updatedAt: new Date().toISOString()
    };
    this.saveSchedule();
  }

  /**
   * Alias for compatibility
   */
  updateWorkout(dateKey, splitId, status) {
    this.setWorkout(dateKey, splitId, status);
  }

  /**
   * Toggle completion status between 'planned' and 'completed'
   */
  toggleStatus(dateKey) {
    const entry = this.schedule[dateKey];
    if (!entry) return null;
    entry.status = entry.status === 'completed' ? 'planned' : 'completed';
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule();
    return entry.status;
  }

  /**
   * Remove workout entry for a date
   */
  deleteWorkout(dateKey) {
    if (this.schedule[dateKey]) {
      delete this.schedule[dateKey];
      this.saveSchedule();
    }
  }

  /**
   * Alias for compatibility
   */
  removeWorkout(dateKey) {
    this.deleteWorkout(dateKey);
  }

  /**
   * Add an exercise to a workout day
   * @param {string} dateKey
   * @param {string} exerciseName
   * @param {string} [defaultSplit=null]
   * @returns {Object} created exercise
   */
  addExerciseToWorkout(dateKey, exerciseName, defaultSplit = null) {
    let entry = this.schedule[dateKey];
    if (!entry) {
      this.schedule[dateKey] = {
        split: defaultSplit || 'FULL BODY',
        status: 'planned',
        exercises: [],
        note: '',
        updatedAt: new Date().toISOString()
      };
      entry = this.schedule[dateKey];
    }
    if (!Array.isArray(entry.exercises)) {
      entry.exercises = [];
    }

    const newEx = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: exerciseName.trim(),
      sets: [
        { weight: '', reps: '' }
      ]
    };

    entry.exercises.push(newEx);
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule();
    return newEx;
  }

  /**
   * Remove an exercise from a workout day
   */
  removeExerciseFromWorkout(dateKey, exerciseId) {
    const entry = this.schedule[dateKey];
    if (!entry || !Array.isArray(entry.exercises)) return;
    entry.exercises = entry.exercises.filter(ex => ex.id !== exerciseId);
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule();
  }

  /**
   * Add a set to an exercise in a workout day
   */
  addSetToExercise(dateKey, exerciseId, weight = '', reps = '') {
    const entry = this.schedule[dateKey];
    if (!entry || !Array.isArray(entry.exercises)) return;
    const exercise = entry.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    if (!Array.isArray(exercise.sets)) exercise.sets = [];

    let finalWeight = weight;
    let finalReps = reps;
    // Auto prefill from previous set if both empty
    if (finalWeight === '' && finalReps === '' && exercise.sets.length > 0) {
      const last = exercise.sets[exercise.sets.length - 1];
      finalWeight = last.weight || '';
      finalReps = last.reps || '';
    }

    exercise.sets.push({
      weight: String(finalWeight),
      reps: String(finalReps)
    });
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule();
  }

  /**
   * Alias for addSetToExercise
   */
  addSet(dateKey, exerciseId, weight, reps) {
    this.addSetToExercise(dateKey, exerciseId, weight, reps);
  }

  /**
   * Update weight or reps of a set
   */
  updateSet(dateKey, exerciseId, setIndex, weight, reps, notify = false) {
    const entry = this.schedule[dateKey];
    if (!entry || !Array.isArray(entry.exercises)) return;
    const exercise = entry.exercises.find(ex => ex.id === exerciseId);
    if (!exercise || !Array.isArray(exercise.sets) || !exercise.sets[setIndex]) return;

    if (weight !== undefined) exercise.sets[setIndex].weight = String(weight);
    if (reps !== undefined) exercise.sets[setIndex].reps = String(reps);
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule(notify);
  }

  /**
   * Remove a set from an exercise
   */
  removeSetFromExercise(dateKey, exerciseId, setIndex) {
    const entry = this.schedule[dateKey];
    if (!entry || !Array.isArray(entry.exercises)) return;
    const exercise = entry.exercises.find(ex => ex.id === exerciseId);
    if (!exercise || !Array.isArray(exercise.sets)) return;

    exercise.sets.splice(setIndex, 1);
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule(true);
  }

  /**
   * Alias for removeSetFromExercise
   */
  removeSet(dateKey, exerciseId, setIndex) {
    this.removeSetFromExercise(dateKey, exerciseId, setIndex);
  }

  /**
   * Update workout note
   */
  updateWorkoutNote(dateKey, note, notify = false) {
    const entry = this.schedule[dateKey];
    if (!entry) return;
    entry.note = String(note || '');
    entry.updatedAt = new Date().toISOString();
    this.saveSchedule(notify);
  }

  /**
   * Return full schedule copy
   */
  getAllData() {
    return { ...this.schedule };
  }

  /**
   * Calculate statistics for a given year & month (0-indexed month)
   * @param {number} year
   * @param {number} month - 0 to 11
   */
  getMonthStats(year, month) {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    let totalWorkouts = 0;
    let restDays = 0;
    let completed = 0;

    for (const [dateKey, item] of Object.entries(this.schedule)) {
      if (dateKey.startsWith(monthPrefix)) {
        const splitDef = SPLIT_MAP.get(item.split);
        if (splitDef && splitDef.isRest) {
          restDays++;
        } else {
          totalWorkouts++;
        }
        if (item.status === 'completed') {
          completed++;
        }
      }
    }

    return { totalWorkouts, restDays, completed };
  }

  /**
   * Subscribe to storage updates
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify() {
    for (const cb of this._listeners) {
      try {
        cb(this.schedule);
      } catch (e) {
        console.error('[AgendaStorage] Listener error:', e);
      }
    }
  }
}

export const agendaStorage = new AgendaStorage();
