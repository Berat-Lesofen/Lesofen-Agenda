/**
 * LESOFEN AGENDA - Workout Day Detail & Selection Modal
 * Training · Planning · Consistency
 *
 * Implements native HTML <dialog> with closedby="any" and fallback
 * for lighting-fast split placement, completion toggle, and removal.
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
    this.init();
  }

  init() {
    // Create native dialog element
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'workoutModal';
    this.dialog.className = 'agenda-dialog';
    this.dialog.setAttribute('closedby', 'any');
    this.dialog.setAttribute('aria-labelledby', 'modalDayTitle');

    // Modern light-dismiss fallback for browsers without closedby support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      this.dialog.addEventListener('click', (event) => {
        if (event.target !== this.dialog) return;
        const rect = this.dialog.getBoundingClientRect();
        const inside = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!inside) {
          this.close();
        }
      });
    }

    document.body.appendChild(this.dialog);
  }

  formatDateTitle(dateKey) {
    // dateKey: 'YYYY-MM-DD'
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
    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
  }

  close() {
    if (typeof this.dialog.close === 'function') {
      this.dialog.close();
    } else {
      this.dialog.removeAttribute('open');
    }
    this.currentDateKey = null;
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
          <button type="button" class="dialog-close-btn" aria-label="Kapat" id="modalBtnClose">✕</button>
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

          <div class="dialog-divider">
            <span>Split'i Değiştir</span>
          </div>
        ` : `
          <!-- Boş Gün Bilgisi -->
          <div class="empty-day-banner">
            <p>Bu güne bir split atayın:</p>
          </div>
        `}

        <!-- Split Seçenekleri Grid'i -->
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

    this.bindEvents(dateKey);
  }

  bindEvents(dateKey) {
    // Close button
    const closeBtn = this.dialog.querySelector('#modalBtnClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Toggle status button
    const toggleBtn = this.dialog.querySelector('#btnToggleStatus');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        agendaStorage.toggleStatus(dateKey);
        this.onUpdate();
        this.close();
      });
    }

    // Delete workout button
    const deleteBtn = this.dialog.querySelector('#btnDeleteWorkout');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        agendaStorage.deleteWorkout(dateKey);
        this.onUpdate();
        this.close();
      });
    }

    // Split buttons
    const splitBtns = this.dialog.querySelectorAll('.split-select-btn');
    splitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const splitId = btn.dataset.splitId;
        if (splitId) {
          const existing = agendaStorage.getWorkout(dateKey);
          const currentStatus = existing ? existing.status : 'planned';
          agendaStorage.setWorkout(dateKey, splitId, currentStatus);
          this.onUpdate();
          this.close();
        }
      });
    });
  }
}
