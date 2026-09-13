/**
 * LESOFEN AJANDA - Workout Day Detail & Workout Log Modal (V2)
 * Training · Planning · Consistency
 *
 * Implements native HTML <dialog> with closedby="any" and fallback
 * for lighting-fast split placement, exercise tracking, set logging,
 * free-form notes, completion toggle, and removal.
 */

import { agendaStorage, SPLITS, SPLIT_MAP } from './storage.js';
import { DEFAULT_EXERCISES } from './exercisesData.js';

export class WorkoutModal {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    this.dialog = null;
    this.currentDateKey = null;
    this.isPickerOpen = false;
    this.pickerSearch = '';
    this.monthNamesTr = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    this.init();
  }

  init() {
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
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${this.monthNamesTr[monthIndex]} ${year}`;
  }

  open(dateKey) {
    this.currentDateKey = dateKey;
    this.isPickerOpen = false;
    this.pickerSearch = '';
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
    this.isPickerOpen = false;
    this.pickerSearch = '';
  }

  render() {
    if (!this.currentDateKey) return;

    // Preserve scroll position if re-rendering while open
    const scrollContainer = this.dialog.querySelector('.dialog-content');
    const scrollPos = scrollContainer ? scrollContainer.scrollTop : 0;

    const dateKey = this.currentDateKey;
    const dateTitle = this.formatDateTitle(dateKey);
    const currentWorkout = agendaStorage.getWorkout(dateKey);
    const currentSplit = currentWorkout ? SPLIT_MAP.get(currentWorkout.split) : null;
    const isCompleted = currentWorkout && currentWorkout.status === 'completed';
    const exercises = (currentWorkout && Array.isArray(currentWorkout.exercises)) ? currentWorkout.exercises : [];

    // Filter suggestions for picker
    const q = this.pickerSearch.trim().toLowerCase();
    const suggestions = DEFAULT_EXERCISES.filter(ex => {
      if (!q) return true;
      return ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q);
    });

    // If current split is known and no search, prioritize matching split exercises
    if (!q && currentSplit) {
      suggestions.sort((a, b) => {
        const aHas = a.splits?.includes(currentSplit.id) ? 1 : 0;
        const bHas = b.splits?.includes(currentSplit.id) ? 1 : 0;
        return bHas - aHas;
      });
    }

    const exactMatch = DEFAULT_EXERCISES.some(ex => ex.name.toLowerCase() === q);

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
        ` : `
          <!-- Boş Gün Bilgisi -->
          <div class="empty-day-banner">
            <p>Bu güne bir split atayın veya egzersiz ekleyin:</p>
          </div>
        `}

        <!-- ==============================================
             ANTRENMAN GÜNLÜĞÜ (EGZERSİZLER & SETLER)
             ============================================== -->
        <section class="workout-log-section" aria-label="Antrenman Günlüğü">
          <div class="workout-section-header">
            <div class="section-title-group">
              <span class="section-kicker">ANTRENMAN</span>
              <h4 class="section-title">Egzersizler & Setler</h4>
            </div>
            <button type="button" class="btn-add-exercise" id="btnOpenAddExercise">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Egzersiz Ekle
            </button>
          </div>

          <!-- Egzersiz Arama / Ekleme Paneli -->
          ${this.isPickerOpen ? `
            <div class="exercise-picker-box animate-fadeIn">
              <div class="picker-search-bar">
                <input type="text" 
                       id="exerciseSearchInput" 
                       class="exercise-search-input" 
                       placeholder="Egzersiz ara veya yeni yaz..." 
                       value="${this.pickerSearch}"
                       autocomplete="off">
                <button type="button" class="btn-picker-close" id="btnClosePicker" title="Kapat">✕</button>
              </div>

              ${(q && !exactMatch) ? `
                <button type="button" class="btn-add-custom-exercise" id="btnAddCustomExercise" data-ex-name="${this.pickerSearch.trim()}">
                  + "<strong>${this.pickerSearch.trim()}</strong>" Ekle (Özel)
                </button>
              ` : ''}

              <div class="picker-chips-grid">
                ${suggestions.slice(0, 16).map(item => `
                  <button type="button" class="exercise-chip-btn" data-ex-name="${item.name}">
                    <span class="ex-chip-name">${item.name}</span>
                    <span class="ex-chip-cat">${item.category}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Egzersiz Kartları Listesi -->
          <div class="exercise-cards-list">
            ${exercises.length === 0 ? `
              <div class="empty-exercises-state">
                <p>Henüz egzersiz eklenmedi.</p>
                <span>Yukarıdaki <strong>+ Egzersiz Ekle</strong> butonuna dokunarak setlerinizi kaydedin.</span>
              </div>
            ` : exercises.map(ex => `
              <div class="exercise-card" data-exercise-id="${ex.id}">
                <div class="exercise-card-header">
                  <div class="exercise-title-group">
                    <span class="exercise-card-name">${ex.name}</span>
                    <span class="exercise-card-badge">${ex.sets.length} set</span>
                  </div>
                  <button type="button" 
                          class="btn-remove-exercise" 
                          data-exercise-id="${ex.id}" 
                          title="${ex.name} egzersizini sil" 
                          aria-label="${ex.name} egzersizini sil">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                <div class="sets-table-container">
                  <div class="sets-table-header">
                    <span class="col-set">SET</span>
                    <span class="col-weight">AĞIRLIK (KG)</span>
                    <span class="col-reps">TEKRAR</span>
                    <span class="col-del"></span>
                  </div>

                  <div class="sets-rows-list">
                    ${ex.sets.map((set, sIdx) => `
                      <div class="set-row" data-exercise-id="${ex.id}" data-set-index="${sIdx}">
                        <span class="set-label">Set ${sIdx + 1}</span>
                        
                        <div class="set-input-group">
                          <input type="number" 
                                 step="0.5" 
                                 min="0" 
                                 max="999" 
                                 inputmode="decimal" 
                                 class="set-input input-weight" 
                                 data-exercise-id="${ex.id}" 
                                 data-set-index="${sIdx}" 
                                 data-field="weight" 
                                 placeholder="-" 
                                 value="${set.weight || ''}">
                          <span class="unit-tag">kg</span>
                        </div>

                        <div class="set-input-group">
                          <input type="number" 
                                 step="1" 
                                 min="0" 
                                 max="999" 
                                 inputmode="numeric" 
                                 class="set-input input-reps" 
                                 data-exercise-id="${ex.id}" 
                                 data-set-index="${sIdx}" 
                                 data-field="reps" 
                                 placeholder="-" 
                                 value="${set.reps || ''}">
                          <span class="unit-tag">tk</span>
                        </div>

                        <button type="button" 
                                class="btn-remove-set" 
                                data-exercise-id="${ex.id}" 
                                data-set-index="${sIdx}" 
                                title="Seti sil" 
                                aria-label="Seti sil">✕</button>
                      </div>
                    `).join('')}
                  </div>

                  <button type="button" class="btn-add-set" data-exercise-id="${ex.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Set Ekle
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- NOT ALANI -->
          <div class="workout-note-box">
            <div class="note-box-header">
              <label for="workoutNoteTextarea" class="note-kicker">NOT</label>
              <span class="note-hint">İsteğe bağlı serbest antrenman notu</span>
            </div>
            <textarea id="workoutNoteTextarea" 
                      class="workout-note-textarea" 
                      rows="2" 
                      placeholder="Bugünkü antrenman notları... (ör: Sol omuz biraz yorgundu)">${currentWorkout?.note || ''}</textarea>
          </div>
        </section>

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

    // Restore scroll position
    if (scrollPos > 0) {
      const newScrollContainer = this.dialog.querySelector('.dialog-content');
      if (newScrollContainer) newScrollContainer.scrollTop = scrollPos;
    }

    this.bindEvents(dateKey);

    // Auto-focus search input if picker was just opened
    if (this.isPickerOpen) {
      const searchInput = this.dialog.querySelector('#exerciseSearchInput');
      if (searchInput) {
        searchInput.focus();
        // Place cursor at end of input
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }
    }
  }

  bindEvents(dateKey) {
    // 1. Close button
    const closeBtn = this.dialog.querySelector('#modalBtnClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 2. Toggle status button
    const toggleBtn = this.dialog.querySelector('#btnToggleStatus');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        agendaStorage.toggleStatus(dateKey);
        this.onUpdate();
        this.render();
      });
    }

    // 3. Delete workout button
    const deleteBtn = this.dialog.querySelector('#btnDeleteWorkout');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        agendaStorage.deleteWorkout(dateKey);
        this.onUpdate();
        this.close();
      });
    }

    // 4. Split buttons (change or assign split without losing workout log)
    const splitBtns = this.dialog.querySelectorAll('.split-select-btn');
    splitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const splitId = btn.dataset.splitId;
        if (splitId) {
          const existing = agendaStorage.getWorkout(dateKey);
          const currentStatus = existing ? existing.status : 'planned';
          agendaStorage.setWorkout(dateKey, splitId, currentStatus);
          this.onUpdate();
          this.render();
        }
      });
    });

    // 5. Open / Close Exercise Picker
    const btnOpenPicker = this.dialog.querySelector('#btnOpenAddExercise');
    if (btnOpenPicker) {
      btnOpenPicker.addEventListener('click', () => {
        this.isPickerOpen = !this.isPickerOpen;
        this.pickerSearch = '';
        this.render();
      });
    }

    const btnClosePicker = this.dialog.querySelector('#btnClosePicker');
    if (btnClosePicker) {
      btnClosePicker.addEventListener('click', () => {
        this.isPickerOpen = false;
        this.pickerSearch = '';
        this.render();
      });
    }

    // 6. Exercise Search Input
    const searchInput = this.dialog.querySelector('#exerciseSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.pickerSearch = e.target.value;
        this.render();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const customName = this.pickerSearch.trim();
          if (customName) {
            this.addExercise(dateKey, customName);
          }
        }
      });
    }

    // 7. Click on Exercise Chip Suggestion
    const chipBtns = this.dialog.querySelectorAll('.exercise-chip-btn');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const exName = btn.dataset.exName;
        if (exName) {
          this.addExercise(dateKey, exName);
        }
      });
    });

    // 8. Add custom exercise button
    const btnAddCustom = this.dialog.querySelector('#btnAddCustomExercise');
    if (btnAddCustom) {
      btnAddCustom.addEventListener('click', () => {
        const exName = btnAddCustom.dataset.exName;
        if (exName) {
          this.addExercise(dateKey, exName);
        }
      });
    }

    // 9. Remove Exercise button
    const removeExBtns = this.dialog.querySelectorAll('.btn-remove-exercise');
    removeExBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = btn.dataset.exerciseId;
        if (exId) {
          agendaStorage.removeExerciseFromWorkout(dateKey, exId);
          this.onUpdate();
          this.render();
        }
      });
    });

    // 10. Add Set button
    const addSetBtns = this.dialog.querySelectorAll('.btn-add-set');
    addSetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = btn.dataset.exerciseId;
        if (exId) {
          agendaStorage.addSetToExercise(dateKey, exId);
          this.onUpdate();
          this.render();
        }
      });
    });

    // 11. Remove Set button
    const removeSetBtns = this.dialog.querySelectorAll('.btn-remove-set');
    removeSetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = btn.dataset.exerciseId;
        const sIdx = parseInt(btn.dataset.setIndex, 10);
        if (exId && !isNaN(sIdx)) {
          agendaStorage.removeSetFromExercise(dateKey, exId, sIdx);
          this.onUpdate();
          this.render();
        }
      });
    });

    // 12. Set Input Fields (Live Auto-save on input without re-rendering)
    const setInputs = this.dialog.querySelectorAll('.set-input');
    setInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const exId = input.dataset.exerciseId;
        const sIdx = parseInt(input.dataset.setIndex, 10);
        const field = input.dataset.field; // 'weight' or 'reps'
        const val = input.value;

        if (exId && !isNaN(sIdx) && field) {
          if (field === 'weight') {
            agendaStorage.updateSet(dateKey, exId, sIdx, val, undefined);
          } else if (field === 'reps') {
            agendaStorage.updateSet(dateKey, exId, sIdx, undefined, val);
          }
        }
      });
    });

    // 13. Workout Note Textarea (Live Auto-save on input)
    const noteTextarea = this.dialog.querySelector('#workoutNoteTextarea');
    if (noteTextarea) {
      noteTextarea.addEventListener('input', (e) => {
        agendaStorage.updateWorkoutNote(dateKey, e.target.value);
      });
    }
  }

  addExercise(dateKey, name) {
    const currentWorkout = agendaStorage.getWorkout(dateKey);
    const defaultSplit = currentWorkout ? currentWorkout.split : 'FULL BODY';
    agendaStorage.addExerciseToWorkout(dateKey, name, defaultSplit);
    this.isPickerOpen = false;
    this.pickerSearch = '';
    this.onUpdate();
    this.render();
  }
}
