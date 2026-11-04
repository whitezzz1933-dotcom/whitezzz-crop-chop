(() => {
'use strict';
const CC = window.CC, S = CC.S;
const ctx = CC.ctx, toImg = CC.toImg, toScr = CC.toScr, clampP = CC.clampP, mouse = CC.mouse;

function lassoInfo() {
  const p = S.poly;
  if (!p) return 'Кликай по картинке, чтобы ставить точки.';
  if (!p.closed) return `Точек: ${p.pts.length}. Замкни: клик у первой точки, Enter или двойной клик.`;
  const b = Core.polygonBBox(p.pts);
  return `Контур замкнут: ${p.pts.length} точек, ${Math.round(b.w)} × ${Math.round(b.h)} px`;
}
function closePoly() {
  const p = S.poly;
  if (!p || p.closed) return;
  if (p.pts.length < 3) { CC.toast('Нужно минимум 3 точки'); return; }
  p.closed = true; CC.commit(); CC.updateInfo(); CC.draw();
}
function vertexAt(m) {
  const p = S.poly; if (!p) return -1;
  for (let i = 0; i < p.pts.length; i++) {
    const s = toScr(p.pts[i][0], p.pts[i][1]);
    if (Math.abs(m.x - s.x) <= 12 && Math.abs(m.y - s.y) <= 12) return i;
  }
  return -1;
}
function edgeAt(m) {
  const p = S.poly; if (!p || !p.closed) return null;
  const n = p.pts.length;
  for (let i = 0; i < n; i++) {
    const a = toScr(p.pts[i][0], p.pts[i][1]), b = toScr(p.pts[(i + 1) % n][0], p.pts[(i + 1) % n][1]);
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    let t = l2 ? ((m.x - a.x) * dx + (m.y - a.y) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const px = a.x + t * dx, py = a.y + t * dy;
    if (Math.hypot(m.x - px, m.y - py) <= 7) { const q = toImg(px, py); return { i, x: q.x, y: q.y }; }
  }
  return null;
}
function insideLasso(q) { return !!S.poly && S.poly.closed && Core.pointInPolygon(q.x, q.y, S.poly.pts); }
function lassoCursor(m) {
  const p = S.poly;
  if (p && p.closed) { if (vertexAt(m) >= 0) return 'pointer'; if (insideLasso(toImg(m.x, m.y))) return 'move'; }
  return 'crosshair';
}
function lassoDown(m, q, shift) {
  const p = S.poly, pt = clampP(q);
  if (shift && p && vertexAt(m) >= 0) { lassoRightClick(m); return; }
  if (p && !p.closed) {
    if (p.pts.length >= 3) {
      const s = toScr(p.pts[0][0], p.pts[0][1]);
      if (Math.hypot(m.x - s.x, m.y - s.y) <= 11) { closePoly(); return; }
    }
    p.pts.push([pt.x, pt.y]); CC.commit(); CC.updateInfo(); CC.draw(); return;
  }
  if (p && p.closed) {
    const vi = vertexAt(m);
    if (vi >= 0) { if (shift) { lassoRightClick(m); return; } S.drag = { type: 'lvertex', i: vi }; return; }
    if (insideLasso(q)) { S.drag = { type: 'lmove', q0: q, orig: p.pts.map(a => a.slice()) }; return; }
  }
  S.poly = { pts: [[pt.x, pt.y]], closed: false };
  CC.commit(); CC.updateInfo(); CC.draw();
}
function lassoRightClick(m) {
  const p = S.poly; if (!p) return;
  const vi = vertexAt(m); if (vi < 0) return;
  if (p.closed && p.pts.length <= 3) { CC.toast('В контуре должно остаться минимум 3 точки'); return; }
  p.pts.splice(vi, 1);
  if (!p.pts.length) S.poly = null;
  CC.commit(); CC.updateInfo(); CC.draw();
}
function lassoDbl(e) {
  const p = S.poly; if (!S.img || !p) return;
  const m = mouse(e), q = toImg(m.x, m.y);
  if (!p.closed) {
    if (p.pts.length > 1) {
      const a = p.pts[p.pts.length - 1], b = p.pts[p.pts.length - 2];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) * S.scale < 6) p.pts.pop();
    }
    closePoly(); return;
  }
  const ed = edgeAt(m);
  if (ed && vertexAt(m) < 0) { p.pts.splice(ed.i + 1, 0, [ed.x, ed.y]); CC.commit(); CC.updateInfo(); CC.draw(); return; }
  if (insideLasso(q)) CC.cut();
}
function lassoBack(isDelete) {
  const p = S.poly; if (!p) return;
  if (isDelete) { S.poly = null; } else if (p.closed) { if (p.pts.length <= 3) { CC.toast('В замкнутом контуре должно остаться минимум 3 точки'); return; } p.pts.pop(); } else if (!p.closed && !isDelete) { p.pts.pop(); if (!p.pts.length) S.poly = null; }
  else S.poly = null;
  CC.commit(); CC.updateInfo(); CC.draw();
}
function lassoEsc() { if (S.tool === 'lasso' && S.poly) { S.poly = null; CC.commit(); CC.updateInfo(); CC.draw(); } }
function drawLasso() {
  const p = S.poly; if (!p) return;
  const x0 = S.ox, y0 = S.oy, iw = S.W * S.scale, ih = S.H * S.scale;
  const sp = p.pts.map(a => toScr(a[0], a[1]));
  const line = () => { const o = new Path2D(); sp.forEach((s, i) => i ? o.lineTo(s.x, s.y) : o.moveTo(s.x, s.y)); if (p.closed) o.closePath(); return o; };
  if (p.closed) {
    const dim = new Path2D(); dim.rect(x0, y0, iw, ih);
    sp.forEach((s, i) => i ? dim.lineTo(s.x, s.y) : dim.moveTo(s.x, s.y)); dim.closePath();
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, iw, ih); ctx.clip();
    ctx.fillStyle = 'rgba(8,12,20,0.62)'; ctx.fill(dim, 'evenodd'); ctx.restore();
  }
  const o = line();
  ctx.strokeStyle = 'rgba(8,12,20,0.85)'; ctx.lineWidth = 4; ctx.stroke(o);
  ctx.strokeStyle = '#c8f031'; ctx.lineWidth = 1.5; ctx.stroke(o);
  if (!p.closed && S.cur && sp.length) {
    const last = sp[sp.length - 1], c = toScr(S.cur.x, S.cur.y);
    ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(c.x, c.y);
    ctx.strokeStyle = '#c8f031'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  }
  sp.forEach((s, i) => {
    const first = i === 0 && !p.closed && sp.length >= 3, r = first ? 7 : 5;
    ctx.fillStyle = first ? '#c8f031' : '#ffffff'; ctx.strokeStyle = '#10151f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(s.x - r, s.y - r, 2 * r, 2 * r); ctx.fill(); ctx.stroke();
  });
}

Object.assign(CC, { lassoInfo, closePoly, lassoCursor, lassoDown, lassoRightClick, lassoDbl, lassoBack, lassoEsc, drawLasso });
})();