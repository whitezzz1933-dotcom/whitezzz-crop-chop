(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$, clamp = CC.clamp;
const ctx = CC.ctx;

function drawGrid() {
  const x0 = S.ox, y0 = S.oy, iw = S.W * S.scale, ih = S.H * S.scale;
  const cells = Core.gridCells(S.v, S.h, S.W, S.H);
  ctx.font = '600 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const skipSet = activeSkip();
  cells.forEach(c => {
    if (!skipSet.includes(c.row + ',' + c.col)) return;
    const x = x0 + c.x * S.scale, y = y0 + c.y * S.scale, w = c.w * S.scale, h = c.h * S.scale;
    ctx.fillStyle = 'rgba(8,12,20,0.72)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(200,240,49,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + w - 10, y + h - 10); ctx.moveTo(x + w - 10, y + 10); ctx.lineTo(x + 10, y + h - 10); ctx.stroke();
  });
  cells.forEach((c, i) => {
    if (c.w * S.scale < 36 || c.h * S.scale < 26) return;
    if (skipSet.includes(c.row + ',' + c.col)) return;
    if (!S.showNums) return;
    const cx = x0 + (c.x + c.w / 2) * S.scale, cy = y0 + (c.y + c.h / 2) * S.scale;
    ctx.fillStyle = 'rgba(8,12,20,0.72)'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8f031'; ctx.fillText(String(i + 1), cx, cy);
  });
  const line = (x1, y1, x2, y2, sel) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(8,12,20,0.9)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = sel ? '#ffffff' : '#c8f031'; ctx.lineWidth = sel ? 3 : 2.5; ctx.stroke();
  };
  S.v.forEach((v, i) => { const x = x0 + v * S.scale; line(x, y0, x, y0 + ih, !!S.sel && S.sel.dir === 'v' && S.sel.i === i); });
  S.h.forEach((v, i) => { const y = y0 + v * S.scale; line(x0, y, x0 + iw, y, !!S.sel && S.sel.dir === 'h' && S.sel.i === i); });
  ctx.strokeStyle = 'rgba(200,240,49,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, iw - 1, ih - 1);
}

function hitLine(m) {
  const tol = 7; let best = null, bd = tol + 1;
  const x0 = S.ox, y0 = S.oy, iw = S.W * S.scale, ih = S.H * S.scale;
  S.v.forEach((val, i) => { const d = Math.abs(m.x - (x0 + val * S.scale)); if (d < bd && m.y >= y0 - 8 && m.y <= y0 + ih + 8) { bd = d; best = { dir: 'v', i }; } });
  S.h.forEach((val, i) => { const d = Math.abs(m.y - (y0 + val * S.scale)); if (d < bd && m.x >= x0 - 8 && m.x <= x0 + iw + 8) { bd = d; best = { dir: 'h', i }; } });
  return best;
}

function deleteSelLine() {
  if (S.tool !== 'grid') return;
  if (!S.sel) { CC.toast('Сначала выбери линию кликом'); return; }
  (S.sel.dir === 'v' ? S.v : S.h).splice(S.sel.i, 1); S.sel = null; CC.commit(); CC.updateInfo(); CC.draw();
}

function evenFromInputs() {
  const cols = clamp(parseInt($('cols').value, 10) || 1, 1, 40), rows = clamp(parseInt($('rows').value, 10) || 1, 1, 40);
  S.v = Core.evenLines(cols, S.W); S.h = Core.evenLines(rows, S.H);
}
function applyEven() { if (!S.img) return; evenFromInputs(); S.sel = null; CC.commit(); CC.updateInfo(); CC.draw(); }

$('cols').addEventListener('input', applyEven);
$('rows').addEventListener('input', applyEven);
$('btnEven').onclick = () => { if (CC.needImage()) applyEven(); };
$('btnAddV').onclick = () => { if (!CC.needImage()) return; S.v.push(Math.round(S.W / 2)); S.sel = { dir: 'v', i: S.v.length - 1 }; CC.commit(); CC.updateInfo(); CC.draw(); };
$('btnAddH').onclick = () => { if (!CC.needImage()) return; S.h.push(Math.round(S.H / 2)); S.sel = { dir: 'h', i: S.h.length - 1 }; CC.commit(); CC.updateInfo(); CC.draw(); };
$('btnDelLine').onclick = deleteSelLine;
$('btnClearLines').onclick = () => {
  if (!CC.needImage()) return;
  if (!S.v.length && !S.h.length) { CC.toast('Линий нет'); return; }
  S.v = []; S.h = []; S.sel = null;
  CC.commit(); CC.updateInfo(); CC.draw();
  CC.toast('Все линии убраны. Ctrl+Z вернёт их');
};

// ---------- пропуск ячеек ----------
function activeSkip() {
  if (S.skip.length && (S.skipV !== S.v.length || S.skipH !== S.h.length)) S.skip = [];
  return S.skip;
}
function toggleSkipAt(q) {
  const cells = Core.gridCells(S.v, S.h, S.W, S.H);
  const c = cells.find(k => q.x >= k.x && q.x < k.x + k.w && q.y >= k.y && q.y < k.y + k.h);
  if (!c) return;
  const key = c.row + ',' + c.col, cur = activeSkip();
  if (cur.includes(key)) S.skip = cur.filter(k => k !== key);
  else {
    if (cur.length + 1 >= cells.length) { CC.toast('Нельзя пропустить все ячейки'); return; }
    S.skip = cur.concat([key]);
  }
  S.skipV = S.v.length; S.skipH = S.h.length;
  CC.commit(); CC.updateInfo(); CC.draw();
}
function syncSkipUi() {
  const b = $('btnSkipMode');
  b.textContent = 'Пропуск ячеек: ' + (S.skipMode ? 'вкл' : 'выкл');
  b.setAttribute('aria-pressed', String(S.skipMode));
  b.classList.toggle('on', S.skipMode);
}
$('btnSkipMode').onclick = () => { S.skipMode = !S.skipMode; syncSkipUi(); };
$('btnSkipReset').onclick = () => {
  if (!CC.needImage()) return;
  if (!activeSkip().length) { CC.toast('Пропущенных ячеек нет'); return; }
  S.skip = []; CC.commit(); CC.updateInfo(); CC.draw();
};
syncSkipUi();

// ---------- умная сетка по промежуткам ----------
function smartGrid() {
  if (!CC.needImage()) return;
  const noise = clamp(parseInt($('sgNoise').value, 10) || 0, 0, 50);
  const minGap = clamp(parseInt($('sgGap').value, 10) || 1, 1, 2000);
  const k = Math.min(1, Math.sqrt(4000000 / (S.W * S.H)));
  const cw = Math.max(1, Math.round(S.W * k)), ch = Math.max(1, Math.round(S.H * k));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high'; g.drawImage(S.img, 0, 0, cw, ch);
  const id = g.getImageData(0, 0, cw, ch);
  const r = Core.findGaps(id.data, cw, ch, { noise, minGap: Math.max(1, Math.round(minGap * k)), tol: 12 });
  const map = (arr, size) => arr.map(p => clamp(Math.round(p / k), 1, size - 1)).filter((p, i, a) => i === 0 || p !== a[i - 1]);
  const v = map(r.v, S.W), h = map(r.h, S.H);
  if (!v.length && !h.length) { CC.toast('Промежутков не найдено: увеличь «Шум %» или уменьши «Промежуток px»'); return; }
  S.v = v; S.h = h; S.sel = null;
  $('cols').value = String(clamp(v.length + 1, 1, 40)); $('rows').value = String(clamp(h.length + 1, 1, 40));
  CC.commit(); CC.updateInfo(); CC.draw();
  CC.toast('Найдено: ' + (v.length + 1) + ' × ' + (h.length + 1) + '. Проверь линии и поправь вручную');
}
$('btnSmart').onclick = smartGrid;

$('optNums').addEventListener('change', () => { S.showNums = $('optNums').checked; CC.draw(); });

Object.assign(CC, { drawGrid, hitLine, deleteSelLine, evenFromInputs, activeSkip, toggleSkipAt, smartGrid });
})();