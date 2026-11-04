(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$;
const SQUARE_TOOLS = CC.SQUARE_TOOLS, HELP = CC.HELP, TITLES = CC.TITLES;

// ---------- инструменты и панели ----------
function setTool(t) {
  S.tool = t; S.sel = null;
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  $('gridPanel').style.display = t === 'grid' ? '' : 'none';
  $('shapePanel').style.display = t === 'grid' ? 'none' : '';
  if (t !== 'grid') { $('shapeTitle').textContent = TITLES[t]; $('shapeHelp').textContent = HELP[t]; }
  CC.syncToolUi(t);
  if (S.img) {
    if (t === 'frame') { S.shape = { x: 0, y: 0, w: S.W, h: S.H }; CC.commit(); }
    else if (SQUARE_TOOLS.includes(t) && S.shape) { const s = Math.min(S.shape.w, S.shape.h); S.shape.w = s; S.shape.h = s; CC.commit(); }
  }
  updateInfo(); CC.draw();
}

function updateInfo() {
  if (S.tool === 'grid') {
    const sk = CC.activeSkip().length;
    const n = Core.gridCells(S.v, S.h, S.W || 1, S.H || 1).length - sk;
    $('gridInfo').textContent = `Линий: вертикальных ${S.v.length}, горизонтальных ${S.h.length} → частей: ${n}${sk ? ' (пропущено ' + sk + ')' : ''}`;
  } else {
    $('shapeInfo').textContent = S.tool === 'lasso' ? CC.lassoInfo() : S.tool === 'polygon' ? CC.polyInfo() : S.shape ? `Размер: ${Math.round(S.shape.w)} × ${Math.round(S.shape.h)} px` : 'Фигура не нарисована.';
  }
}

Object.assign(CC, { setTool, updateInfo });

document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
$('btnUndo').onclick = CC.undo;
$('btnRedo').onclick = CC.redo;
$('btnFit').onclick = CC.fit;

new ResizeObserver(CC.resize).observe(CC.stage);
// Страховка: если страницу всё же сдвинуло, вернуть на место.
window.addEventListener('scroll', () => { const e = document.scrollingElement; if (e && (e.scrollLeft || e.scrollTop)) e.scrollTo(0, 0); }, true);

// Для окна «Настройки»: есть ли что терять при обновлении.
window.__cropchopDirty = () => !!S.img || S.items.length > 0;
CC.stage.addEventListener('click', () => { if (!S.img) $('btnOpen').click(); });

setTool('grid'); CC.renderStrip(); CC.resize(); CC.syncUndo();
})();