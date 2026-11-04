(() => {
'use strict';
const CC = window.CC = {};
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SQUARE_TOOLS = ['square', 'circle'];
const RECT_TOOLS = ['frame', 'square'];
const CURSORS = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };
const HELP = {
  frame: 'Рамка стоит по краям картинки. Тяни за стороны и углы, чтобы обрезать, внутри тяни, чтобы двигать. Двойной клик внутри вырезает.',
  square: 'Тяни по картинке: рисуется квадрат 1:1. Потом двигай и меняй размер. Двойной клик внутри вырезает.',
  circle: 'Тяни по картинке: рисуется круг. Потом двигай и меняй размер. Вокруг круга будет прозрачно. Двойной клик внутри вырезает.',
  lasso: 'Кликай по картинке, ставя точки. Замкни контур кликом у первой точки (она крупнее и лаймовая), клавишей Enter или двойным кликом. Потом двигай точки и сам контур. Двойной клик по стороне добавляет точку, Shift+клик по точке удаляет её, правая кнопка мыши отменяет последнее действие. Backspace убирает последнюю точку, Esc отменяет контур. Двойной клик внутри вырезает.',
  polygon: 'Тяни от центра: рисуется правильный многоугольник. Поля справа: число сторон, поворот, скругление. Белая точка меняет размер и поворот (Shift: шаг 15°), внутри тяни, чтобы двигать. «Править точки» превращает фигуру в лассо. Фигура остаётся целиком внутри картинки. Esc или Delete убирают фигуру. Двойной клик внутри вырезает.',
  ellipse: 'Тяни по картинке: рисуется овал. Shift делает круг. Вокруг овала будет прозрачно. Двойной клик внутри вырезает.'
};
const TITLES = { frame: 'Рамка', square: 'Квадрат', circle: 'Круг', ellipse: 'Эллипс', lasso: 'Лассо', polygon: 'Многоугольник' };

const S = {
  img: null, name: 'image', W: 0, H: 0, tool: 'grid',
  v: [], h: [], sel: null, shape: null,
  scale: 1, ox: 0, oy: 0, drag: null, space: false,
  items: [], counter: 0, selItem: -1, stamp: '', dir: null, dragged: false,
  hist: [], hi: -1, poly: null, cur: null,
  autoFit: true, cutting: false, pg: null, skip: [], skipV: 0, skipH: 0, skipMode: false, showNums: true
};

let toastTimer;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
function needImage() { if (!S.img) { toast('Сначала открой изображение'); return false; } return true; }

// ---------- история (отмена / возврат) ----------
const snap = () => JSON.stringify({ v: S.v, h: S.h, shape: S.shape, poly: S.poly, pg: S.pg, skip: S.skip, skipV: S.skipV, skipH: S.skipH });
function syncUndo() { $('btnUndo').disabled = S.hi <= 0; $('btnRedo').disabled = S.hi >= S.hist.length - 1; }
function commit() {
  const s = snap();
  if (S.hist[S.hi] === s) return;
  S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(s);
  if (S.hist.length > 200) S.hist.shift();
  S.hi = S.hist.length - 1; syncUndo();
}
function restore(i) {
  const o = JSON.parse(S.hist[i]);
  S.v = o.v; S.h = o.h; S.shape = o.shape; S.poly = o.poly || null; S.pg = o.pg || null; S.skip = o.skip || []; S.skipV = o.skipV || 0; S.skipH = o.skipH || 0; S.sel = null; S.hi = i;
  CC.updateInfo(); syncUndo(); CC.draw();
}
function undo() { if (S.hi > 0) restore(S.hi - 1); else toast('Больше нечего отменять'); }
function redo() { if (S.hi < S.hist.length - 1) restore(S.hi + 1); }

Object.assign(CC, { $, clamp, SQUARE_TOOLS, RECT_TOOLS, CURSORS, HELP, TITLES, S, toast, needImage, syncUndo, commit, restore, undo, redo });
})();