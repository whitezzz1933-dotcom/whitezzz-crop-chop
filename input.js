(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$, clamp = CC.clamp;
const cv = CC.cv, stage = CC.stage, toImg = CC.toImg, clampP = CC.clampP, mouse = CC.mouse;
const SQUARE_TOOLS = CC.SQUARE_TOOLS, CURSORS = CC.CURSORS;

function updateCursor(m) {
  let c = 'default';
  if (S.img) {
    if (S.space) c = 'grab';
    else if (S.tool === 'lasso') { c = CC.lassoCursor(m); }
    else if (S.tool === 'polygon') { c = CC.polyCursor(m); }
    else if (S.tool === 'grid') { const h = CC.hitLine(m); c = h ? (h.dir === 'v' ? 'ew-resize' : 'ns-resize') : (S.skipMode ? 'pointer' : 'default'); }
    else {
      const hd = CC.hitHandle(m);
      if (hd) c = CURSORS[hd];
      else if (S.shape && CC.insideShape(toImg(m.x, m.y))) c = 'move';
      else c = 'crosshair';
    }
  }
  cv.style.cursor = c;
}

// ---------- события мыши ----------
cv.addEventListener('mousedown', e => {
  if (!S.img) return;
  const m = mouse(e);
  if (e.button === 1 || S.space) { e.preventDefault(); S.autoFit = false; S.drag = { type: 'pan', sx: m.x, sy: m.y, ox: S.ox, oy: S.oy }; return; }
  if (e.button === 2) { CC.undo(); return; }
  if (e.button !== 0) return;
  if (S.tool === 'lasso') { CC.lassoDown(m, toImg(m.x, m.y), e.shiftKey); return; }
  if (S.tool === 'polygon') { CC.polyDown(m, toImg(m.x, m.y)); return; }
  const q = toImg(m.x, m.y);
  if (S.tool === 'grid') {
    const hit = CC.hitLine(m);
    S.sel = hit;
    if (!hit && S.skipMode) { CC.toggleSkipAt(q); return; }
    if (hit) S.drag = { type: 'line', dir: hit.dir, i: hit.i };
  } else {
    const hd = CC.hitHandle(m);
    if (hd) S.drag = { type: 'resize', hd, b0: { x: S.shape.x, y: S.shape.y, w: S.shape.w, h: S.shape.h } };
    else if (CC.insideShape(q)) S.drag = { type: 'move', dx: q.x - S.shape.x, dy: q.y - S.shape.y };
    else { S.shape = null; S.drag = { type: 'draw', anchor: clampP(q) }; }
  }
  CC.updateInfo(); CC.draw();
});

window.addEventListener('mousemove', e => {
  const m = mouse(e), d = S.drag;
  S.cur = toImg(m.x, m.y);
  if (!d && S.tool === 'lasso' && S.poly && !S.poly.closed) CC.draw();
  if (!d) { updateCursor(m); return; }
  if (d.type === 'pan') { S.ox = d.ox + (m.x - d.sx); S.oy = d.oy + (m.y - d.sy); }
  else if (d.type === 'line') {
    const q = toImg(m.x, m.y);
    if (d.dir === 'v') S.v[d.i] = clamp(Math.round(q.x), 1, S.W - 1); else S.h[d.i] = clamp(Math.round(q.y), 1, S.H - 1);
  }
  else if (d.type === 'draw') {
    S.shape = CC.boxFromPoints(d.anchor, clampP(toImg(m.x, m.y)), SQUARE_TOOLS.includes(S.tool) || e.shiftKey);
  }
  else if (d.type === 'resize') {
    S.shape = CC.resizeShape(d.b0, d.hd, clampP(toImg(m.x, m.y)), SQUARE_TOOLS.includes(S.tool), e.shiftKey);
  }
  else if (d.type === 'pgdraw' || d.type === 'pgvert' || d.type === 'pgmove') { CC.polyDrag(d, m, e.shiftKey); }
  else if (d.type === 'lvertex') { const p = clampP(toImg(m.x, m.y)); S.poly.pts[d.i] = [p.x, p.y]; }
  else if (d.type === 'lmove') {
    const q = toImg(m.x, m.y), b = Core.polygonBBox(d.orig);
    const dx = clamp(q.x - d.q0.x, -b.x, S.W - (b.x + b.w)), dy = clamp(q.y - d.q0.y, -b.y, S.H - (b.y + b.h));
    S.poly.pts = d.orig.map(a => [a[0] + dx, a[1] + dy]);
  }
  else if (d.type === 'move') {
    const q = toImg(m.x, m.y);
    S.shape.x = clamp(q.x - d.dx, 0, S.W - S.shape.w); S.shape.y = clamp(q.y - d.dy, 0, S.H - S.shape.h);
  }
  CC.updateInfo(); CC.draw();
});

window.addEventListener('mouseup', () => {
  const d = S.drag; S.drag = null;
  if (d && d.type === 'draw' && S.shape && (S.shape.w < 4 || S.shape.h < 4)) S.shape = null;
  if (d && d.type === 'pgdraw' && S.pg && S.pg.r < 4) S.pg = null;
  if (d && d.type === 'resize' && S.shape && (S.shape.w < 4 || S.shape.h < 4)) S.shape = d.b0;
  if (d && d.type !== 'pan') CC.commit();
  CC.updateInfo(); CC.draw();
});

cv.addEventListener('dblclick', e => {
  if (S.tool === 'lasso') { CC.lassoDbl(e); return; }
  if (S.tool === 'polygon') { const pm = mouse(e); if (CC.polyInside(toImg(pm.x, pm.y))) CC.cut(); return; }
  if (!S.img || S.tool === 'grid' || !S.shape) return;
  const m = mouse(e);
  if (CC.insideStrict(toImg(m.x, m.y))) CC.cut();
});

cv.addEventListener('wheel', e => {
  e.preventDefault();
  if (!S.img) return;
  S.autoFit = false; const m = mouse(e), ns = clamp(S.scale * Math.exp(-e.deltaY * 0.0015), 0.02, 40);
  S.ox = m.x - (m.x - S.ox) * ns / S.scale; S.oy = m.y - (m.y - S.oy) * ns / S.scale; S.scale = ns;
  CC.draw();
}, { passive: false });

// ---------- клавиатура ----------
const TOOL_KEYS = { KeyG: 'grid', KeyR: 'frame', KeyS: 'square', KeyC: 'circle', KeyE: 'ellipse', KeyL: 'lasso', KeyP: 'polygon' };
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { S.space = true; e.preventDefault(); return; }
  if (e.ctrlKey || e.metaKey) {
    if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); CC.undo(); }
    else if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); CC.redo(); }
    else if (e.code === 'Enter') CC.cut();
    return;
  }
  if (TOOL_KEYS[e.code]) CC.setTool(TOOL_KEYS[e.code]);
  else if (e.code === 'KeyF') CC.fit();
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') { if (S.tool === 'lasso' && S.poly && !S.poly.closed) CC.closePoly(); else CC.cut(); }
  else if (e.code === 'Escape') CC.clearCurrent();
  else if (e.code === 'Delete' || e.code === 'Backspace') { if (S.tool === 'lasso') CC.lassoBack(e.code === 'Delete'); else if (S.tool === 'grid') CC.deleteSelLine(); else CC.clearCurrent(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') S.space = false; });

// ---------- загрузка изображения ----------
function makeStamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}
function loadImage(dataUrl, name) {
  const im = new Image();
  im.onload = () => {
    if (im.naturalWidth > 16384 || im.naturalHeight > 16384 || im.naturalWidth * im.naturalHeight > 100000000) { CC.toast('Слишком большое изображение: больше 16384 px по стороне или 100 мегапикселей'); return; }
    S.img = im; S.W = im.naturalWidth; S.H = im.naturalHeight; S.name = Core.safeName(name);
    S.stamp = makeStamp(); S.counter = 0; S.dir = null;
    S.v = []; S.h = []; S.shape = null; S.poly = null; S.pg = null; S.skip = []; S.skipV = 0; S.skipH = 0; S.sel = null; S.hist = []; S.hi = -1;
    if (S.tool === 'grid') CC.evenFromInputs();
    else if (S.tool === 'frame') S.shape = { x: 0, y: 0, w: S.W, h: S.H };
    CC.commit();
    $('empty').style.display = 'none';
    $('imgInfo').textContent = `${name} · ${S.W}×${S.H} px`;
    CC.fit(); CC.updateInfo();
  };
  im.onerror = () => CC.toast('Не удалось открыть файл');
  im.src = dataUrl;
}
$('btnOpen').onclick = async () => { const r = await window.api.openImage(); if (r) loadImage(r.dataUrl, r.name); };
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());
stage.addEventListener('drop', e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (!f) return;
  if (!/^image\/(png|jpeg)$/.test(f.type)) { CC.toast('Нужен PNG или JPG'); return; }
  const r = new FileReader(); r.onload = () => loadImage(r.result, f.name); r.readAsDataURL(f);
});

Object.assign(CC, { updateCursor, makeStamp, loadImage });
})();