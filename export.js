(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$;
const RECT_TOOLS = CC.RECT_TOOLS;
let droppedNote = '';

function renderPiece(x, y, w, h, kind) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (kind === 'ellipse') { g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.closePath(); g.clip(); }
  g.drawImage(S.img, -x, -y);
  return c;
}
function thumbOf(c) {
  const k = Math.min(1, 180 / c.height, 300 / c.width);
  const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(c.width * k)); t.height = Math.max(1, Math.round(c.height * k));
  const g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL('image/png');
}

// Автообрезка пустых полей (цвет фона определяется по краю, допуск в процентах).
function trimCanvas(c) {
  if (!$('trimOn').checked) return c;
  if (c.width * c.height > 40000000) { CC.toast('Фрагмент слишком большой для автообрезки, оставлен как есть'); return c; }
  const g = c.getContext('2d', { willReadFrequently: true });
  const id = g.getImageData(0, 0, c.width, c.height);
  const tol = CC.clamp(parseInt($('trimTol').value, 10) || 0, 0, 100), pad = CC.clamp(parseInt($('trimPad').value, 10) || 0, 0, 500);
  const b = Core.trimBounds(id.data, c.width, c.height, tol, pad);
  if (!b || (b.w === c.width && b.h === c.height)) return c;
  const o = document.createElement('canvas'); o.width = b.w; o.height = b.h;
  o.getContext('2d').drawImage(c, -b.x, -b.y);
  return o;
}

// Общее сохранение: превращает холсты в файлы, добавляет миниатюры в ленту.
async function savePartsFromCanvases(parts) {
  S.cutting = true;
  try {
    parts = parts.map(trimCanvas);
    const urls = parts.map(c => c.toDataURL('image/png'));
    const thumbs = parts.map(thumbOf);
    const res = await window.api.savePieces(S.name, S.stamp, S.counter + 1, urls);
    S.counter += urls.length; S.dir = res.dir;
    thumbs.forEach((t, i) => S.items.push({ thumb: t, file: res.files[i] }));
    S.selItem = S.items.length - 1;
    renderStrip(true);
    CC.toast(`Готово: ${urls.length} шт. добавлено в ленту, файлы в output${droppedNote}`); droppedNote = '';
  } catch (err) { CC.toast('Ошибка при сохранении: ' + err.message); }
  S.cutting = false;
}

// Ячейка не пустая, если в ней есть что-то кроме цвета фона (допуск берётся из поля «Допуск %»).
function isNotEmpty(c) {
  if (c.width * c.height > 40000000) return true;
  const g = c.getContext('2d', { willReadFrequently: true });
  const id = g.getImageData(0, 0, c.width, c.height);
  const tol = CC.clamp(parseInt($('trimTol').value, 10) || 12, 0, 100);
  return Core.trimBounds(id.data, c.width, c.height, tol, 0) !== null;
}

async function cut() {
  if (!CC.needImage() || S.cutting) return;
  if (S.tool === 'lasso') { cutLasso(); return; }
  if (S.tool === 'polygon') { await cutPoly(); return; }
  const parts = [];
  if (S.tool === 'grid') {
    const cells = Core.gridCells(S.v, S.h, S.W, S.H);
    if (cells.length < 2) { CC.toast('Добавь хотя бы одну линию'); return; }
    const skipSet = CC.activeSkip();
    const use = cells.filter(c => !skipSet.includes(c.row + ',' + c.col));
    if (!use.length) { CC.toast('Все ячейки пропущены'); return; }
    let made = use.map(c => renderPiece(c.x, c.y, c.w, c.h, null));
    if ($('optSkipEmpty').checked) {
      const before = made.length;
      made = made.filter(isNotEmpty);
      if (!made.length) { CC.toast('Все ячейки пустые: нечего вырезать'); return; }
      if (before > made.length) droppedNote = '. Пустых пропущено: ' + (before - made.length);
    }
    made.forEach(c => parts.push(c));
  } else {
    if (!S.shape) { CC.toast('Сначала нарисуй фигуру на картинке'); return; }
    const x = Math.round(S.shape.x), y = Math.round(S.shape.y);
    const w = Math.max(1, Math.min(Math.round(S.shape.w), S.W - x)), h = Math.max(1, Math.min(Math.round(S.shape.h), S.H - y));
    parts.push(renderPiece(x, y, w, h, RECT_TOOLS.includes(S.tool) ? 'rect' : 'ellipse'));
  }
  await savePartsFromCanvases(parts);
}

async function cutLasso() {
  const p = S.poly;
  if (!p) { CC.toast('Сначала поставь точки на картинке'); return; }
  if (!p.closed) { CC.toast('Сначала замкни контур: клик у первой точки или Enter'); return; }
  const b = Core.polygonBBox(p.pts);
  const x = Math.max(0, Math.floor(b.x)), y = Math.max(0, Math.floor(b.y));
  const w = Math.max(1, Math.min(Math.ceil(b.x + b.w), S.W) - x), h = Math.max(1, Math.min(Math.ceil(b.y + b.h), S.H) - y);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.beginPath();
  p.pts.forEach((a, i) => i ? g.lineTo(a[0] - x, a[1] - y) : g.moveTo(a[0] - x, a[1] - y));
  g.closePath(); g.clip();
  g.drawImage(S.img, -x, -y);
  await savePartsFromCanvases([c]);
}

async function cutOutline(pts) {
  const b = Core.polygonBBox(pts);
  const x = Math.max(0, Math.floor(b.x)), y = Math.max(0, Math.floor(b.y));
  const w = Math.max(1, Math.min(Math.ceil(b.x + b.w), S.W) - x), h = Math.max(1, Math.min(Math.ceil(b.y + b.h), S.H) - y);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.beginPath();
  pts.forEach((a, i) => i ? g.lineTo(a[0] - x, a[1] - y) : g.moveTo(a[0] - x, a[1] - y));
  g.closePath(); g.clip();
  g.drawImage(S.img, -x, -y);
  await savePartsFromCanvases([c]);
}
async function cutPoly() {
  const pts = CC.polyOutline();
  if (!pts) { CC.toast('Сначала нарисуй многоугольник на картинке'); return; }
  await cutOutline(pts);
}

// ---------- полоса фрагментов ----------
function renderStrip(scrollEnd) {
  const el = $('pieces'); el.innerHTML = '';
  S.items.forEach((it, i) => {
    const d = document.createElement('div'); d.className = 'piece' + (i === S.selItem ? ' sel' : '');
    d.title = 'Клик: показать файл в папке. Перетащи в Figma.';
    const im = document.createElement('img'); im.src = it.thumb; im.draggable = true;
    im.addEventListener('dragstart', e => { e.preventDefault(); S.dragged = true; window.api.startDrag(it.file); });
    d.addEventListener('mousedown', () => { S.dragged = false; });
    d.addEventListener('click', () => {
      if (S.dragged) { S.dragged = false; return; }
      S.selItem = i;
      [...el.children].forEach((c, j) => c.classList.toggle('sel', j === i));
      window.api.showItem(it.file);
    });
    const n = document.createElement('span'); n.textContent = String(i + 1);
    d.append(im, n); el.append(d);
  });
  $('stripInfo').textContent = S.items.length
    ? `В ленте: ${S.items.length}. Перетащи любую в Figma, клик показывает файл в папке.`
    : 'Здесь копятся вырезанные части.';
  if (scrollEnd) el.scrollLeft = el.scrollWidth;
}

$('btnCut').onclick = cut;
$('btnCopy').onclick = async () => {
  const it = S.items[S.selItem];
  if (!it) { CC.toast('Нет выбранной части'); return; }
  await window.api.copyImage(it.file); CC.toast('Скопировано. Вставь в Figma через Ctrl+V');
};
$('btnFolder').onclick = () => window.api.openFolder(S.dir);
$('btnClear').onclick = () => { S.items = []; S.selItem = -1; renderStrip(); CC.toast('Лента очищена. Файлы остались в папке output'); };

Object.assign(CC, { renderPiece, thumbOf, savePartsFromCanvases, cut, cutLasso, cutPoly, renderStrip });
})();