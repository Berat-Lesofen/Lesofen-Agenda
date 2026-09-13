/**
 * LESOFEN AGENDA - Unified Drag & Drop & Touch Placement Engine
 * Training · Planning · Consistency
 *
 * Supports:
 * 1. HTML5 Desktop Drag and Drop
 * 2. Mobile Touch-Drag with floating ghost element & hit-testing
 * 3. Tap-to-select mode (select split -> tap calendar days to place)
 */

import { agendaStorage } from './storage.js';

export class DragDropManager {
  constructor(calendarInstance) {
    this.calendar = calendarInstance;
    this.selectedSplitId = null;

    // Touch drag state
    this.touchGhost = null;
    this.touchActiveSplitId = null;
    this.touchCurrentHoverCell = null;
    this.touchStartPos = null;
    this.isTouchDragging = false;
  }

  /**
   * Set or toggle currently selected split for tap-to-place mode
   */
  setSelectedSplit(splitId) {
    if (this.selectedSplitId === splitId) {
      this.selectedSplitId = null;
    } else {
      this.selectedSplitId = splitId;
    }
    this.calendar.render();
  }

  getSelectedSplit() {
    return this.selectedSplitId;
  }

  clearSelectedSplit() {
    this.selectedSplitId = null;
  }

  /**
   * Bind drag and drop events to split chips and calendar cells
   */
  bindEvents(container) {
    this.bindSplitChips(container);
    this.bindDayCells(container);
  }

  bindSplitChips(container) {
    const splitChips = container.querySelectorAll('.split-chip');

    splitChips.forEach(chip => {
      const splitId = chip.dataset.split;
      if (!splitId) return;

      // 1. Desktop HTML5 Drag
      chip.setAttribute('draggable', 'true');

      chip.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', splitId);
        e.dataTransfer.effectAllowed = 'copy';
        chip.classList.add('is-dragging');
      });

      chip.addEventListener('dragend', () => {
        chip.classList.remove('is-dragging');
        this.clearCellHighlights(container);
      });

      // 2. Mobile Touch Drag
      chip.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        this.touchActiveSplitId = splitId;
        this.isTouchDragging = false;
      }, { passive: true });

      chip.addEventListener('touchmove', (e) => {
        if (!this.touchStartPos || !this.touchActiveSplitId) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - this.touchStartPos.x);
        const dy = Math.abs(touch.clientY - this.touchStartPos.y);

        // Threshold before engaging drag to allow normal tap
        if (!this.isTouchDragging && (dx > 8 || dy > 8)) {
          this.isTouchDragging = true;
          this.createTouchGhost(chip, touch.clientX, touch.clientY);
        }

        if (this.isTouchDragging && this.touchGhost) {
          e.preventDefault(); // Prevent page scrolling while dragging
          this.updateTouchGhostPosition(touch.clientX, touch.clientY);
          this.checkTouchHover(touch.clientX, touch.clientY);
        }
      }, { passive: false });

      const handleTouchEnd = (e) => {
        if (this.isTouchDragging) {
          if (this.touchCurrentHoverCell && this.touchActiveSplitId) {
            const dateKey = this.touchCurrentHoverCell.dataset.date;
            if (dateKey) {
              const existing = agendaStorage.getWorkout(dateKey);
              agendaStorage.setWorkout(dateKey, this.touchActiveSplitId, existing ? existing.status : 'planned');
              this.calendar.render();
            }
          }
        }
        this.cleanupTouchState();
      };

      chip.addEventListener('touchend', handleTouchEnd);
      chip.addEventListener('touchcancel', handleTouchEnd);
    });
  }

  bindDayCells(container) {
    const dayCells = container.querySelectorAll('.day-cell');

    dayCells.forEach(cell => {
      const dateKey = cell.dataset.date;
      if (!dateKey) return;

      // Desktop Dragover
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        cell.classList.add('drag-over');
      });

      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });

      // Desktop Drop
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        const splitId = e.dataTransfer.getData('text/plain');
        if (splitId && dateKey) {
          const existing = agendaStorage.getWorkout(dateKey);
          agendaStorage.setWorkout(dateKey, splitId, existing ? existing.status : 'planned');
          this.calendar.render();
        }
      });
    });
  }

  createTouchGhost(sourceEl, x, y) {
    this.removeTouchGhost();
    const ghost = sourceEl.cloneNode(true);
    ghost.id = 'touch-drag-ghost';
    ghost.style.position = 'fixed';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.9';
    ghost.style.transform = 'translate(-50%, -50%) scale(1.08)';
    ghost.style.boxShadow = '0 12px 28px rgba(0,0,0,0.6), 0 0 16px rgba(255, 159, 28, 0.4)';
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    document.body.appendChild(ghost);
    this.touchGhost = ghost;
  }

  updateTouchGhostPosition(x, y) {
    if (this.touchGhost) {
      this.touchGhost.style.left = `${x}px`;
      this.touchGhost.style.top = `${y}px`;
    }
  }

  checkTouchHover(x, y) {
    const el = document.elementFromPoint(x, y);
    const cell = el ? el.closest('.day-cell') : null;

    if (cell !== this.touchCurrentHoverCell) {
      if (this.touchCurrentHoverCell) {
        this.touchCurrentHoverCell.classList.remove('drag-over');
      }
      this.touchCurrentHoverCell = cell;
      if (this.touchCurrentHoverCell) {
        this.touchCurrentHoverCell.classList.add('drag-over');
      }
    }
  }

  removeTouchGhost() {
    if (this.touchGhost && this.touchGhost.parentNode) {
      this.touchGhost.parentNode.removeChild(this.touchGhost);
    }
    this.touchGhost = null;
  }

  cleanupTouchState() {
    this.removeTouchGhost();
    if (this.touchCurrentHoverCell) {
      this.touchCurrentHoverCell.classList.remove('drag-over');
      this.touchCurrentHoverCell = null;
    }
    this.touchActiveSplitId = null;
    this.touchStartPos = null;
    this.isTouchDragging = false;
  }

  clearCellHighlights(container) {
    container.querySelectorAll('.day-cell.drag-over').forEach(c => c.classList.remove('drag-over'));
  }
}
