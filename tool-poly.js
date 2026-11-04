(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$, clamp = CC.clamp;
const ctx = CC.ctx, toImg = CC.toImg, toScr = CC.toScr, clampP = CC.clampP;

const normDeg = d => ((d + 180) % 360 + 360) % 360 - 180;
const intField = (id, a, b, def) => { const v = parseInt($(id).value, 10); return clamp(Number.isFinite(v) ? v : def, a, b); };
const sidesF = () => intField('pgSides', 3, 12, 6);
const rotF = () => intField('pgRot', -180, 180, 0);
const roundF = () => intField('pgRound', 0, 100, 0);
const maxR = g => Math.max(1, Math.min(g.cx, S.W - g.cx, g.cy, S.H - g.cy));

// Фигура хранится параметрами: центр, радиус, сторон, поворот (0° = вершина вверх), скругление 0..100.
function basePoints(g) { return Core.regularPolygon(g.cx, g.cy, g.r, g.n, (g.rot - 90) * Math.PI / 180); }
function polyOutline() {
  const g = S.pg;
  if (!g || g.r < 2) return null;
  return Core.roundedPolygon(basePoints(g), g.round / 100, 8);
}
function polyInside(q) { const o = polyOutline(); return !!o && Core.pointInPolygon(q.x, q.y, o); }
function vertex0Screen() { const g = S.pg, a = (g.rot - 90) * Math.PI / 180; return toScr(g.cx + g.r * Math.cos(a), g.cy + g.r * Math.sin(a)); }
function hitVertex0(m) { if (!S.pg || S.pg.r < 2) return false; const s = vertex0Screen(); return Math.abs(m.x - s.x) <= 11 && Math.abs(m.y - s.y) <= 11; }
function polyCursor(m) {
  if (S.pg && S.pg.r >= 2) { if (hitVertex0(m)) return 'pointer'; if (polyInside(toImg(m.x, m.y))) return 'move'; }
  return 'crosshair';
}

function polyDown(m, q) {
  const g = S.pg && S.pg.r >= 2 ? S.pg : null;
  if (g && hitVertex0(m)) { S.drag = { type: 'pgvert' }; return; }
  if (g && polyInside(q)) { S.drag = { type: 'pgmove', dx: q.x - g.cx, dy: q.y - g.cy }; return; }
  const c = clampP(q);
  S.pg = { cx: c.x, cy: c.y, r: 0, n: sidesF(), rot: rotF(), round: roundF() };
  S.drag = { type: 'pgdraw' };
  CC.updateInfo(); CC.draw();
}
function polyDrag(d, m, shift) {
  const g = S.pg; if (!g) return;
  const raw = toImg(m.x, m.y), q = clampP(raw);
  if (d.type === 'pgdraw') g.r = Math.min(Math.hypot(q.x - g.cx, q.y - g.cy), maxR(g));
  else if (d.type === 'pgvert') {
    g.r = Math.max(1, Math.min(Math.hypot(q.x - g.cx, q.y - g.cy), maxR(g)));
    let deg = Math.atan2(q.y - g.cy, q.x - g.cx) * 180 / Math.PI + 90;
    if (shift) deg = Math.round(deg / 15) * 15;
    g.rot = normDeg(deg);
  } else if (d.type === 'pgmove') {
    g.cx = clamp(raw.x - d.dx, g.r, S.W - g.r); g.cy = clamp(raw.y - d.dy, g.r, S.H - g.r);
  }
}

function syncFields() {
  const g = S.pg; if (!g) return;
  const set = (id, v) => { const el = $(id); if (document.activeElement !== el) el.value = v; };
  set('pgSides', g.n); set('pgRot', Math.round(g.rot)); set('pgRound', g.round);
}
function polyInfo() {
  const g = S.pg;
  syncFields();
  if (!g || g.r < 2) return 'Тяни от центра, чтобы нарисовать многоугольник.';
  return `${g.n} сторон, радиус ${Math.round(g.r)} px, поворот ${Math.round(g.rot)}°, скругление ${g.round}%`;
}

function drawPoly() {
  const g = S.pg; if (!g || g.r < 2) return;
  const out = polyOutline();
  const x0 = S.ox, y0 = S.oy, iw = S.W * S.scale, ih = S.H * S.scale;
  const sp = out.map(a => toScr(a[0], a[1]));
  const dim = new Path2D(); dim.rect(x0, y0, iw, ih);
  sp.forEach((s, i) => i ? dim.lineTo(s.x, s.y) : dim.moveTo(s.x, s.y)); dim.closePath();
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, iw, ih); ctx.clip();
  ctx.fillStyle = 'rgba(8,12,20,0.62)'; ctx.fill(dim, 'evenodd'); ctx.restore();
  const o = new Path2D(); sp.forEach((s, i) => i ? o.lineTo(s.x, s.y) : o.moveTo(s.x, s.y)); o.closePath();
  ctx.strokeStyle = 'rgba(8,12,20,0.85)'; ctx.lineWidth = 4; ctx.stroke(o);
  ctx.strokeStyle = '#c8f031'; ctx.lineWidth = 1.5; ctx.stroke(o);
  if (g.round > 0) {
    const bp = basePoints(g).map(a => toScr(a[0], a[1]));
    ctx.setLineDash([4, 4]); ctx.beginPath(); bp.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)); ctx.closePath();
    ctx.strokeStyle = 'rgba(200,240,49,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  }
  const c = toScr(g.cx, g.cy);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(c.x - 6, c.y); ctx.lineTo(c.x + 6, c.y); ctx.moveTo(c.x, c.y - 6); ctx.lineTo(c.x, c.y + 6); ctx.stroke();
  const v = vertex0Screen();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#10151f'; ctx.lineWidth = 1.5;
  ctx.fillRect(v.x - 6, v.y - 6, 12, 12); ctx.strokeRect(v.x - 6, v.y - 6, 12, 12);
}

// Поля справа: меняют фигуру сразу, шаг истории добавляется при отпускании.
function applyFields() {
  const g = S.pg; if (!g) return;
  g.n = sidesF(); g.rot = rotF(); g.round = roundF();
  CC.updateInfo(); CC.draw();
}
['pgSides', 'pgRot', 'pgRound'].forEach(id => {
  $(id).addEventListener('input', applyFields);
  $(id).addEventListener('change', () => { applyFields(); CC.commit(); });
});

// «Править точки»: многоугольник становится лассо.
function polyToLasso() {
  if (!CC.needImage()) return;
  const g = S.pg;
  if (!g || g.r < 2) { CC.toast('Сначала нарисуй многоугольник'); return; }
  const pts = Core.roundedPolygon(basePoints(g), g.round / 100, 3).map(a => [clamp(a[0], 0, S.W), clamp(a[1], 0, S.H)]);
  S.pg = null; S.poly = { pts, closed: true };
  CC.commit();
  CC.setTool('lasso');
  CC.toast('Теперь это лассо: двигай точки');
}
$('btnPgEdit').onclick = polyToLasso;

Object.assign(CC, { polyOutline, polyInside, polyCursor, polyDown, polyDrag, polyInfo, drawPoly });
})();