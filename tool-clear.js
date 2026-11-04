(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$;

const LABELS = { frame: 'Сбросить рамку', square: 'Убрать фигуру', circle: 'Убрать фигуру', ellipse: 'Убрать фигуру', lasso: 'Очистить контур', polygon: 'Убрать многоугольник' };

// Единое «убрать»: кнопка справа, Esc и Delete. Всё попадает в историю, Ctrl+Z возвращает.
function clearCurrent(fromButton) {
  if (!S.img) return;
  const t = S.tool, say = m => { if (fromButton) CC.toast(m); };
  if (t === 'grid') { if (S.sel) { S.sel = null; CC.draw(); } return; }
  if (t === 'lasso') { if (!S.poly) { say('Контура нет'); return; } S.poly = null; }
  else if (t === 'polygon') { if (!S.pg) { say('Многоугольника нет'); return; } S.pg = null; }
  else if (t === 'frame') {
    const s = S.shape;
    if (s && s.x === 0 && s.y === 0 && s.w === S.W && s.h === S.H) { say('Рамка уже по краям картинки'); return; }
    S.shape = { x: 0, y: 0, w: S.W, h: S.H };
  }
  else { if (!S.shape) { say('Фигуры нет'); return; } S.shape = null; }
  CC.commit(); CC.updateInfo(); CC.draw();
}

// Показывает нужные кнопки и поля под выбранный инструмент.
function syncToolUi(t) {
  $('polyFields').hidden = t !== 'polygon';
  $('lassoBtns').hidden = t !== 'lasso';
  $('btnClearShape').textContent = LABELS[t] || 'Убрать фигуру';
}

$('btnClearShape').onclick = () => CC.clearCurrent(true);
$('btnLassoClose').onclick = () => {
  if (!CC.needImage()) return;
  if (!S.poly) { CC.toast('Сначала поставь точки на картинке'); return; }
  if (S.poly.closed) { CC.toast('Контур уже замкнут'); return; }
  CC.closePoly();
};
$('btnLassoBack').onclick = () => {
  if (!CC.needImage()) return;
  if (!S.poly) { CC.toast('Точек нет'); return; }
  /* на замкнутом контуре кнопка тоже убирает последнюю точку, остаются минимум 3 */
  CC.lassoBack(false);
};

Object.assign(CC, { clearCurrent, syncToolUi });
})();