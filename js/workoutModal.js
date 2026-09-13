/**
 * LESOFEN AJANDA - Simplified Day Detail & Split Modal
 * Training · Planning · Consistency
 *
 * Provides a lightning-fast, ultra-clean modal for assigning splits,
 * toggling completion status, removing workouts, and rock-solid dismiss.
 */

import { agendaStorage, SPLITS, SPLIT_MAP } from './storage.js';

export class WorkoutModal {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    this.dialog = null;
    this.currentDateKey = null;
    this.monthNamesTr = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.init();
  }

  init() {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'workoutModal';
    this.dialog.className = 'agenda-dialog';
    this.dialog.setAttribute('aria-labelledby', 'modalDayTitle');

    // Robust delegated click handler on dialog
    this.dialog.addEventListener('click', (event) => {
      // 1. Backdrop / Light-dismiss
      if (event.target === this.dialog) {
        this.close();
        return;
      }

      // 2. Close button
      if (event.target.closest('#modalBtnClose')) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        return;
      }

      // 3. Toggle Status button
      if (event.target.closest('#btnToggleStatus')) {
        event.preventDefault();
        if (this.currentDateKey) {
          agendaStorage.toggleStatus(this.currentDateKey);
          this.onUpdate();
          this.render();
        }
        return;
      }

      // 4. Delete Workout button
      if (event.target.closest('#btnDeleteWorkout')) {
        event.preventDefault();
        if (this.currentDateKey) {
          agendaStorage.deleteWorkout(this.currentDateKey);
          this.onUpdate();
          this.close();
        }
        return;
      }

      // 5. Split Selection buttons
      const splitBtn = event.target.closest('.split-select-btn');
      if (splitBtn && this.currentDateKey) {
        event.preventDefault();
        const splitId = splitBtn.dataset.splitId;
        if (splitId) {
          const existing = agendaStorage.getWorkout(this.currentDateKey);
          const currentStatus = existing ? existing.status : 'planned';
          agendaStorage.setWorkout(this.currentDateKey, splitId, currentStatus);
          this.onUpdate();
          this.render();
        }
        return;
      }
    });

    // Native cancel event on <dialog> (e.g. native Escape)
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });

    document.body.appendChild(this.dialog);
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && this.isOpen()) {
      e.preventDefault();
      this.close();
    }
  }

  formatDateTitle(dateKey) {
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${this.monthNamesTr[monthIndex]} ${year}`;
  }

  open(dateKey) {
    this.currentDateKey = dateKey;
    this.render();

    // Register Escape key listener
    document.addEventListener('keydown', this.handleKeyDown);

    if (typeof this.dialog.showModal === 'function') {
      try {
        if (!this.dialog.open) {
          this.dialog.showModal();
        }
      } catch {
        this.dialog.setAttribute('open', '');
      }
    } else {
      this.dialog.setAttribute('open', '');
    }
  }

  isOpen() {
    return Boolean(this.currentDateKey && this.dialog && (this.dialog.open || this.dialog.hasAttribute('open')));
  }

  close() {
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.dialog) {
      if (typeof this.dialog.close === 'function') {
        try {
          if (this.dialog.open) {
            this.dialog.close();
          }
        } catch {
          this.dialog.removeAttribute('open');
        }
      }
      this.dialog.removeAttribute('open');
    }

    this.currentDateKey = null;
    this.onUpdate();
  }

  render() {
    if (!this.currentDateKey) return;

    const dateKey = this.currentDateKey;
    const dateTitle = this.formatDateTitle(dateKey);
    const currentWorkout = agendaStorage.getWorkout(dateKey);
    const currentSplit = currentWorkout ? SPLIT_MAP.get(currentWorkout.split) : null;
    const isCompleted = currentWorkout && currentWorkout.status === 'completed';

    this.dialog.innerHTML = `
      <div class="dialog-content">
        <!-- Dialog Header -->
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-kicker">GÜN DETAYI</span>
            <h3 id="modalDayTitle" class="dialog-title">${dateTitle}</h3>
          </div>
          <button type="button" class="dialog-close-btn" aria-label="Kapat" id="modalBtnClose" title="Kapat">✕</button>
        </div>

        ${currentWorkout ? `
          <!-- Mevcut Split Bilgisi & Durum -->
          <div class="workout-status-card" style="border-color: ${currentSplit?.border || 'var(--border-subtle)'}; background: ${currentSplit?.bg || 'var(--bg-card)'}">
            <div class="split-info">
              <span class="split-color-pill" style="background: ${currentSplit?.color || '#fff'};"></span>
              <span class="split-name" style="color: ${currentSplit?.color || '#fff'};">${currentSplit?.name || currentWorkout.split}</span>
            </div>
            <div class="status-badge ${isCompleted ? 'is-completed' : 'is-planned'}">
              ${isCompleted ? '✓ TAMAMLANDI' : 'PLANLANDI'}
            </div>
          </div>

          <!-- Aksiyon Butonları -->
          <div class="dialog-actions-grid">
            <button type="button" class="btn-action btn-toggle-status ${isCompleted ? 'btn-is-completed' : 'btn-mark-completed'}" id="btnToggleStatus">
              ${isCompleted ? '↩ Tamamlanmadı Yap' : '✓ Tamamlandı Olarak İşaretle'}
            </button>
            <button type="button" class="btn-action btn-delete" id="btnDeleteWorkout">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Split'i Sil
            </button>
          </div>
        ` : `
          <!-- Boş Gün Bilgisi -->
          <div class="empty-day-banner">
            <p>Bu güne bir antrenman split'i atayın:</p>
          </div>
        `}

        <!-- Split Seçici / Değiştirici -->
        <div class="dialog-divider">
          <span>${currentWorkout ? "Split'i Değiştir" : "Split Seçin"}</span>
        </div>

        <div class="split-selector-grid">
          ${SPLITS.map(split => {
            const isSelected = currentWorkout && currentWorkout.split === split.id;
            return `
              <button type="button" 
                      class="split-select-btn ${isSelected ? 'is-active' : ''}" 
                      data-split-id="${split.id}"
                      style="--split-color: ${split.color}; --split-bg: ${split.bg}; --split-border: ${split.border};">
                <span class="split-dot" style="background: ${split.color}"></span>
                <span class="split-text">${split.name}</span>
                ${isSelected ? '<span class="split-check">✓</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
