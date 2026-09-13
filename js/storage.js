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
   * Load schedule from localStorage
   * @returns {Object.<string, {split: string, status: string, updatedAt: string}>}
   */
  loadSchedule() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // Normalize legacy string format if present
      const normalized = {};
      for (const [dateKey, val] of Object.entries(parsed)) {
        if (!val) continue;
        if (typeof val === 'string') {
          normalized[dateKey] = {
            split: val,
            status: 'planned',
            updatedAt: new Date().toISOString()
          };
        } else if (typeof val === 'object' && val.split) {
          normalized[dateKey] = {
            split: val.split,
            status: val.status === 'completed' ? 'completed' : 'planned',
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
   */
  saveSchedule() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.schedule));
      this._notify();
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
   * Set or update workout for a date
   * @param {string} dateKey - Format 'YYYY-MM-DD'
   * @param {string} splitId - Split identifier (e.g. 'PUSH')
   * @param {'planned'|'completed'} [status='planned']
   */
  setWorkout(dateKey, splitId, status = 'planned') {
    if (!splitId) {
      this.deleteWorkout(dateKey);
      return;
    }

    this.schedule[dateKey] = {
      split: splitId,
      status: status === 'completed' ? 'completed' : 'planned',
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
