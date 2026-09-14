/**
 * LESOFEN AJANDA - Main Calendar Engine
 * Training · Planning · Consistency
 */

import { agendaStorage, SPLITS, SPLIT_MAP } from './storage.js';
import { DragDropManager } from './dragdrop.js';
import { exportMonthlyCard } from './exportCard.js';

export class CalendarApp {
  constructor(containerElement) {
    this.container = containerElement;

    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth(); // 0-11

    this.monthNamesTr = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    this.dayNamesTr = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    this.storage = agendaStorage;
    this.dragDrop = new DragDropManager(this);

    // Re-render whenever storage updates
    agendaStorage.subscribe(() => {
      this.render();
    });

    this.render();
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear -= 1;
    } else {
      this.currentMonth -= 1;
    }
    this.render();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear += 1;
    } else {
      this.currentMonth += 1;
    }
    this.render();
  }

  goToToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.render();
  }

  render() {
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    
    // First day index (Monday=0 ... Sunday=6)
    let firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay();
    firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;

    // Previous month filler days
    const prevMonthDays = new Date(this.currentYear, this.currentMonth, 0).getDate();

    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === this.currentYear && today.getMonth() === this.currentMonth);
    const todayDate = today.getDate();

    // Stats
    const stats = agendaStorage.getMonthStats(this.currentYear, this.currentMonth);
    const selectedSplit = this.dragDrop.getSelectedSplit();

    this.container.innerHTML = `
      <div class="agenda-layout">
        
        <!-- Üst Marka & Navigasyon -->
        <header class="agenda-header">
          <div class="brand-group">
            <div class="brand-badge-row">
              <span class="brand-kicker">LESOFEN AJANDA</span>
              <span class="brand-tag">PWA · OFFLINE</span>
            </div>
            <h1 class="brand-title">Training Calendar</h1>
            <p class="brand-subtitle">Training · Planning · Consistency</p>
          </div>

          <!-- Ay Kontrolleri & İndirme Butonu -->
          <div class="nav-controls">
            <div class="nav-month-cluster">
              <button type="button" class="btn-nav" id="btnPrevMonth" aria-label="Önceki Ay" title="Önceki Ay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span class="btn-nav-text">Önceki</span>
              </button>
              <div class="nav-month-display">
                <span class="month-name">${this.monthNamesTr[this.currentMonth].toUpperCase()}</span>
                <span class="year-name">${this.currentYear}</span>
              </div>
              <button type="button" class="btn-nav" id="btnNextMonth" aria-label="Sonraki Ay" title="Sonraki Ay">
                <span class="btn-nav-text">Sonraki</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <button type="button" class="btn-today ${isCurrentMonth ? 'is-current' : ''}" id="btnToday">
                BUGÜN
              </button>
            </div>

            <button type="button" class="btn-export-card" id="btnExportCard" title="Seçili ayı yüksek çözünürlüklü PNG kart olarak indir">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>AYLIK KARTI İNDİR</span>
            </button>
          </div>
        </header>

        <!-- Aylık Mini Özet Şeridi -->
        <div class="month-summary-bar">
          <div class="summary-item">
            <span class="summary-val text-amber">${stats.totalWorkouts}</span>
            <span class="summary-lbl">Antrenman</span>
          </div>
          <span class="summary-divider">·</span>
          <div class="summary-item">
            <span class="summary-val text-slate">${stats.restDays}</span>
            <span class="summary-lbl">Dinlenme</span>
          </div>
          <span class="summary-divider">·</span>
          <div class="summary-item">
            <span class="summary-val text-emerald">${stats.completed}</span>
            <span class="summary-lbl">Tamamlandı</span>
          </div>
        </div>

        <!-- Ana Gövde (Desktop: Sol Takvim, Sağ Panel) -->
        <div class="agenda-main-columns">
          
          <!-- Sol Kolon: Takvim Kartı -->
          <section class="calendar-card" aria-label="Aylık Takvim">
            
            ${selectedSplit ? `
              <div class="active-selection-banner animate-fadeIn">
                <span class="pulse-indicator"></span>
                <span>Seçili Split: <strong>${selectedSplit}</strong> — Takvimde istediğiniz günlere dokunarak hızlıca yerleştirin.</span>
                <button type="button" class="btn-clear-selection" id="btnClearSelection">İptal</button>
              </div>
            ` : ''}

            <!-- Hafta Gün İsimleri -->
            <div class="weekdays-grid">
              ${this.dayNamesTr.map(d => `<div class="weekday-cell">${d}</div>`).join('')}
            </div>

            <!-- Takvim Gün Izgarası -->
            <div class="days-grid">
              
              <!-- Önceki aydan taşan soluk günler -->
              ${Array.from({ length: firstDayIndex }).map((_, i) => {
                const prevDayNum = prevMonthDays - firstDayIndex + 1 + i;
                return `
                  <div class="day-cell day-cell-filler" aria-disabled="true">
                    <span class="day-number filler">${prevDayNum}</span>
                  </div>
                `;
              }).join('')}

              <!-- Mevcut ayın günleri -->
              ${Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const workout = agendaStorage.getWorkout(dateKey);
                const split = workout ? SPLIT_MAP.get(workout.split) : null;
                const isToday = isCurrentMonth && dayNum === todayDate;
                const isCompleted = workout && workout.status === 'completed';

                // Past vs Future styling
                const cellDate = new Date(this.currentYear, this.currentMonth, dayNum, 23, 59, 59);
                const isPast = cellDate < today && !isToday;

                return `
                  <div class="day-cell ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''} ${workout ? 'has-workout' : ''}" 
                       data-date="${dateKey}"
                       tabindex="0"
                       role="button"
                       aria-label="${dayNum} ${this.monthNamesTr[this.currentMonth]} ${workout ? (split?.name || workout.split) : 'Boş gün'}">
                    
                    <div class="day-header">
                      <span class="day-number ${isToday ? 'today-number' : ''}">
                        ${String(dayNum).padStart(2, '0')}
                      </span>
                      ${isToday ? '<span class="today-dot" title="Bugün"></span>' : ''}
                    </div>

                    <div class="day-body">
                      ${workout && split ? (() => {
                        const splitParts = split.name.includes('·')
                          ? split.name.split('·').map(s => s.trim())
                          : split.name.split(' ');
                        const mobileWordsHtml = splitParts.map(p => `<span class="split-word">${p}</span>`).join('');
                        const checkHtml = isCompleted ? '<span class="split-check">✓</span>' : '';
                        return `
                        <div class="placed-split-card ${isCompleted ? 'is-completed' : ''}"
                             style="--split-color: ${split.color}; --split-bg: ${split.bg}; --split-border: ${split.border};">
                          <div class="placed-split-info">
                            <span class="placed-split-text">
                              <span class="split-name-desktop">${split.name}${isCompleted ? ' ✓' : ''}</span>
                              <span class="split-name-mobile">
                                ${mobileWordsHtml}
                                ${checkHtml}
                              </span>
                            </span>
                          </div>
                          <button type="button" 
                                  class="btn-remove-split" 
                                  data-date="${dateKey}" 
                                  aria-label="${split.name} splitini kaldır"
                                  title="Kaldır">×</button>
                        </div>
                        `;
                      })() : `
                        <div class="empty-cell-hint">
                          <span class="plus-icon">+</span>
                        </div>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}

            </div>
          </section>

          <!-- Sağ Kolon (Mobilde altta): Split Kartları & Hızlı Kontrol Paneli -->
          <aside class="sidebar-panel">
            
            <div class="split-bank-box">
              <div class="panel-box-header">
                <div class="box-title-group">
                  <span class="box-kicker">SPLIT BANK</span>
                  <h2 class="box-title">Sürükle veya Seç</h2>
                </div>
                <span class="box-hint">Masaüstü: Tut & Sürükle · Mobil: Dokun</span>
              </div>

              <!-- Split Seçenekleri (13 Model) -->
              <div class="split-chips-container">
                ${SPLITS.map(sp => {
                  const isSelected = selectedSplit === sp.id;
                  return `
                    <button type="button"
                            class="split-chip ${isSelected ? 'is-active' : ''}"
                            data-split="${sp.id}"
                            title="${sp.name} splitini seç veya sürükle"
                            style="--split-color: ${sp.color}; --split-bg: ${sp.bg}; --split-border: ${sp.border};">
                      <span class="chip-dot" style="background: ${sp.color};"></span>
                      <span class="chip-name">${sp.name}</span>
                      ${isSelected ? '<span class="chip-active-badge">SEÇİLİ</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Ergonomi & Hızlı İpuçları Kartı -->
            <div class="ergonomy-tips-card">
              <h3 class="tips-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Hızlı Kullanım
              </h3>
              <ul class="tips-list">
                <li><strong>Masaüstü:</strong> Split kartını tutup takvim gününe sürükleyin.</li>
                <li><strong>Mobil:</strong> Split Bank'ten split seçip günlere dokunun veya kartı sürükleyin.</li>
                <li><strong>Tamamlandı:</strong> Atanmış split kartına dokunarak doğrudan <em>✓ Tamamlandı</em> / <em>Planlandı</em> yapabilirsiniz.</li>
                <li><strong>Silme:</strong> Split kartının yanındaki <em>×</em> butonuna dokunarak kaldırabilirsiniz.</li>
                <li><strong>Aylık Kart:</strong> <em>AYLIK KARTI İNDİR</em> ile seçili ayın antrenman takvimini PNG olarak kaydedin.</li>
              </ul>
            </div>

          </aside>

        </div>

      </div>
    `;

    this.attachEvents();
    this.dragDrop.bindEvents(this.container);
  }

  attachEvents() {
    // 1. Month nav
    const btnPrev = this.container.querySelector('#btnPrevMonth');
    const btnNext = this.container.querySelector('#btnNextMonth');
    const btnToday = this.container.querySelector('#btnToday');

    if (btnPrev) btnPrev.addEventListener('click', () => this.prevMonth());
    if (btnNext) btnNext.addEventListener('click', () => this.nextMonth());
    if (btnToday) btnToday.addEventListener('click', () => this.goToToday());

    // 2. Export Monthly Card button
    const btnExport = this.container.querySelector('#btnExportCard');
    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        const originalHtml = btnExport.innerHTML;
        btnExport.disabled = true;
        btnExport.classList.add('is-exporting');
        try {
          await exportMonthlyCard(this.currentYear, this.currentMonth, this.storage, SPLIT_MAP);
          btnExport.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>AYLIK KART İNDİRİLDİ ✓</span>
          `;
          setTimeout(() => {
            btnExport.innerHTML = originalHtml;
            btnExport.disabled = false;
            btnExport.classList.remove('is-exporting');
          }, 1800);
        } catch (err) {
          console.error('[Lesofen Ajanda] Aylık kart dışa aktarım hatası:', err);
          btnExport.innerHTML = originalHtml;
          btnExport.disabled = false;
          btnExport.classList.remove('is-exporting');
        }
      });
    }

    // 3. Clear selection banner button
    const btnClearSelection = this.container.querySelector('#btnClearSelection');
    if (btnClearSelection) {
      btnClearSelection.addEventListener('click', () => {
        this.dragDrop.clearSelectedSplit();
        this.render();
      });
    }

    // 4. Split chip click (Tap-to-select mode)
    const chips = this.container.querySelectorAll('.split-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const splitId = chip.dataset.split;
        if (splitId) {
          this.dragDrop.setSelectedSplit(splitId);
        }
      });
    });

    // 5. Day cells click
    const cells = this.container.querySelectorAll('.day-cell:not(.day-cell-filler)');
    cells.forEach(cell => {
      const dateKey = cell.dataset.date;
      if (!dateKey) return;

      cell.addEventListener('click', (e) => {
        // 1. If clicking delete button directly
        if (e.target.closest('.btn-remove-split')) {
          e.preventDefault();
          e.stopPropagation();
          agendaStorage.deleteWorkout(dateKey);
          this.render();
          return;
        }

        const selectedSplit = this.dragDrop.getSelectedSplit();
        if (selectedSplit) {
          // Quick tap-to-place mode
          const existing = agendaStorage.getWorkout(dateKey);
          agendaStorage.setWorkout(dateKey, selectedSplit, existing ? existing.status : 'planned');
          this.render();
          return;
        }

        // 2. If clicking on an existing workout split card -> toggle completed status in place!
        const existing = agendaStorage.getWorkout(dateKey);
        if (existing) {
          e.preventDefault();
          agendaStorage.toggleStatus(dateKey);
          this.render();
        }
      });

      // Keyboard accessibility (Enter or Space to open/place)
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      });
    });
  }
}
