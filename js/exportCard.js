/**
 * LESOFEN AJANDA - Monthly PNG Calendar Card Generator
 * Training · Planning · Consistency
 *
 * Generates a high-resolution, beautiful obsidian-themed PNG card (~1800px width)
 * entirely client-side using HTML5 Canvas. Offline-capable, zero external dependencies.
 */

export const ASCII_MONTH_NAMES = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"
];

export const TR_MONTH_NAMES = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
];

export const TR_WEEKDAY_NAMES = ["PZT", "SAL", "ÇAR", "PER", "CUM", "CMT", "PAZ"];

/**
 * Helper to draw a rounded rectangle with fill and stroke
 */
function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Fallback for older canvas implementations
    const r = typeof radius === 'number' ? radius : 8;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Generate and trigger download of the monthly calendar PNG card
 * @param {number} year - e.g. 2026
 * @param {number} monthIndex - 0 to 11
 * @param {object} storage - agendaStorage instance
 * @param {Map} splitMap - SPLIT_MAP instance
 * @returns {Promise<{success: boolean, filename: string}>}
 */
export async function exportMonthlyCard(year, monthIndex, storage, splitMap) {
  const asciiMonth = ASCII_MONTH_NAMES[monthIndex] || `Ay-${monthIndex + 1}`;
  const filename = `Lesofen-Ajanda-${asciiMonth}-${year}.png`;

  // Compute month calendar days
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let firstDayIndex = new Date(year, monthIndex, 1).getDay();
  firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1; // Mon=0 .. Sun=6

  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  const totalCells = firstDayIndex + daysInMonth;
  const numRows = Math.ceil(totalCells / 7);
  const trailingFillerCount = (numRows * 7) - totalCells;

  // Monthly stats
  const stats = storage.getMonthStats(year, monthIndex);

  // Canvas dimensions
  const canvasWidth = 1800;
  const cellHeight = 120;
  const gridGap = 10;
  const headerHeight = 170;
  const weekdaysHeight = 36;
  const statsHeight = 100;
  const paddingX = 60;
  const paddingY = 50;

  const gridHeight = (numRows * cellHeight) + ((numRows - 1) * gridGap);
  const canvasHeight = paddingY * 2 + headerHeight + weekdaysHeight + gridHeight + statsHeight + 40;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context could not be initialized.');
  }

  // 1. Dark Obsidian Background with Subtle Radial Glow
  ctx.fillStyle = '#08090c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const radialGlow = ctx.createRadialGradient(
    canvasWidth / 2, 0, 50,
    canvasWidth / 2, 0, canvasWidth * 0.75
  );
  radialGlow.addColorStop(0, 'rgba(16, 21, 36, 0.8)');
  radialGlow.addColorStop(0.6, 'rgba(8, 9, 12, 0.4)');
  radialGlow.addColorStop(1, 'rgba(8, 9, 12, 1)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Main Outer Panel Card
  const panelX = paddingX;
  const panelY = paddingY;
  const panelW = canvasWidth - (paddingX * 2);
  const panelH = canvasHeight - (paddingY * 2);

  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 20, '#0d1017', '#1e2433', 1.5);

  // 3. Header Section inside Panel
  const contentX = panelX + 36;
  const contentW = panelW - 72;
  let cursorY = panelY + 36;

  // Kicker pill
  drawRoundedRect(ctx, contentX, cursorY, 154, 26, 6, 'rgba(255, 159, 28, 0.12)', 'rgba(255, 159, 28, 0.35)', 1);
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ff9f1c';
  ctx.fillText('LESOFEN AJANDA', contentX + 16, cursorY + 17);

  // Right top pill: PWA · OFFLINE
  const rightPillW = 120;
  const rightPillX = contentX + contentW - rightPillW;
  drawRoundedRect(ctx, rightPillX, cursorY, rightPillW, 26, 6, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.1)', 1);
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('PWA · OFFLINE', rightPillX + 16, cursorY + 17);

  cursorY += 46;

  // Main Month & Year Title
  ctx.font = '800 38px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${TR_MONTH_NAMES[monthIndex]} ${year}`, contentX, cursorY + 30);

  // Subtitle
  ctx.font = '500 15px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Training · Planning · Consistency', contentX, cursorY + 60);

  // Month stats badge group on top right
  const statBoxW = 120;
  const statBoxH = 46;
  const statGap = 10;
  const totalStatsW = (statBoxW * 3) + (statGap * 2);
  const statsStartX = contentX + contentW - totalStatsW;
  const statsStartY = cursorY + 10;

  // Stat 1: Antrenman
  drawRoundedRect(ctx, statsStartX, statsStartY, statBoxW, statBoxH, 8, 'rgba(255, 159, 28, 0.08)', 'rgba(255, 159, 28, 0.25)', 1);
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ff9f1c';
  ctx.fillText(String(stats.totalWorkouts), statsStartX + 14, statsStartY + 26);
  ctx.font = '500 11px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Antrenman', statsStartX + 14, statsStartY + 40);

  // Stat 2: Dinlenme
  const stat2X = statsStartX + statBoxW + statGap;
  drawRoundedRect(ctx, stat2X, statsStartY, statBoxW, statBoxH, 8, 'rgba(148, 163, 184, 0.08)', 'rgba(148, 163, 184, 0.25)', 1);
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(String(stats.restDays), stat2X + 14, statsStartY + 26);
  ctx.font = '500 11px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Dinlenme', stat2X + 14, statsStartY + 40);

  // Stat 3: Tamamlandı
  const stat3X = stat2X + statBoxW + statGap;
  drawRoundedRect(ctx, stat3X, statsStartY, statBoxW, statBoxH, 8, 'rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.25)', 1);
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText(String(stats.completed), stat3X + 14, statsStartY + 26);
  ctx.font = '500 11px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Tamamlandı', stat3X + 14, statsStartY + 40);

  cursorY += 90;

  // 4. Weekdays Header
  const cellW = (contentW - (6 * gridGap)) / 7;

  for (let c = 0; c < 7; c++) {
    const colX = contentX + (c * (cellW + gridGap));
    drawRoundedRect(ctx, colX, cursorY, cellW, weekdaysHeight, 6, 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.04)', 1);
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(TR_WEEKDAY_NAMES[c], colX + (cellW / 2), cursorY + 22);
  }
  ctx.textAlign = 'left';

  cursorY += weekdaysHeight + gridGap;

  // 5. Calendar Cells Grid
  let currentCellIndex = 0;

  // A. Leading filler days from previous month
  for (let f = 0; f < firstDayIndex; f++) {
    const col = currentCellIndex % 7;
    const row = Math.floor(currentCellIndex / 7);
    const cellX = contentX + (col * (cellW + gridGap));
    const cellY = cursorY + (row * (cellHeight + gridGap));
    const dayNum = prevMonthDays - firstDayIndex + 1 + f;

    drawRoundedRect(ctx, cellX, cellY, cellW, cellHeight, 10, '#090c12', 'rgba(30, 36, 51, 0.4)', 1);
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(String(dayNum).padStart(2, '0'), cellX + 12, cellY + 24);

    currentCellIndex++;
  }

  // B. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const col = currentCellIndex % 7;
    const row = Math.floor(currentCellIndex / 7);
    const cellX = contentX + (col * (cellW + gridGap));
    const cellY = cursorY + (row * (cellHeight + gridGap));

    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const workout = storage.getWorkout(dateKey);
    const split = workout ? splitMap.get(workout.split) : null;
    const isCompleted = workout && workout.status === 'completed';

    // Cell base
    drawRoundedRect(ctx, cellX, cellY, cellW, cellHeight, 10, '#121620', '#1e2433', 1);

    // Day number
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(d).padStart(2, '0'), cellX + 12, cellY + 24);

    // Split Badge if exists
    if (workout && split) {
      const pillX = cellX + 8;
      const pillY = cellY + 36;
      const pillW = cellW - 16;
      const pillH = 50;

      // Solid blend background matching the split
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8, split.bg || 'rgba(255, 255, 255, 0.08)', split.border || 'rgba(255, 255, 255, 0.2)', 1.5);

      // Split Color Dot
      ctx.beginPath();
      ctx.arc(pillX + 14, pillY + 18, 4, 0, Math.PI * 2);
      ctx.fillStyle = split.color;
      ctx.fill();

      // Split Name
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillStyle = split.color;
      ctx.fillText(split.name, pillX + 24, pillY + 22);

      // Status Indicator
      if (isCompleted) {
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText('✓ TAMAMLANDI', pillX + 24, pillY + 38);
      } else {
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('PLANLANDI', pillX + 24, pillY + 38);
      }
    } else {
      // Empty hint icon (+)
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillText('+', cellX + (cellW / 2) - 5, cellY + (cellHeight / 2) + 6);
    }

    currentCellIndex++;
  }

  // C. Trailing filler days from next month
  for (let tf = 1; tf <= trailingFillerCount; tf++) {
    const col = currentCellIndex % 7;
    const row = Math.floor(currentCellIndex / 7);
    const cellX = contentX + (col * (cellW + gridGap));
    const cellY = cursorY + (row * (cellHeight + gridGap));

    drawRoundedRect(ctx, cellX, cellY, cellW, cellHeight, 10, '#090c12', 'rgba(30, 36, 51, 0.4)', 1);
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(String(tf).padStart(2, '0'), cellX + 12, cellY + 24);

    currentCellIndex++;
  }

  cursorY += gridHeight + 24;

  // 6. Footer inside panel
  const footerY = cursorY + 12;

  // Divider line
  ctx.strokeStyle = '#1e2433';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, footerY);
  ctx.lineTo(contentX + contentW, footerY);
  ctx.stroke();

  // Footer Left Brand & Slogan
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('LESOFEN AJANDA', contentX, footerY + 32);

  ctx.font = '500 12px Inter, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('—  Training · Planning · Consistency', contentX + 140, footerY + 32);

  // Footer Right URL
  ctx.textAlign = 'right';
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('lesofen-agenda.vercel.app', contentX + contentW, footerY + 32);
  ctx.textAlign = 'left';

  // 7. Trigger Direct Client Download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, filename, dataUrl };
}
