(() => {
'use strict';
const CC = window.CC, S = CC.S;
const ctx = CC.ctx, toScr = CC.toScr, RECT_TOOLS = CC.RECT_TOOLS;

function handlePoints() {
  const b = S.shape, x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return { nw: [x1, y1], n: [mx, y1], ne: [x2, y1], e: [x2, my], se: [x2, y2], s: [mx, y2], sw: [x1, y2], w: [x1, my] };
}

function drawShape() {
  if (!S.shape) return;
  const x0 = S.ox, y0 = S.oy, iw = S.W * S.scale, ih = S.H * S.scale;
  const a = toScr(S.shape.x, S.shape.y), w = S.shape.w * S.scale, h = S.shape.h * S.scale;
  const isRect = RECT_TOOLS.includes(S.tool);
  const p = new Path2D();
  p.rect(x0, y0, iw, ih);
  if (isRect) p.rect(a.x, a.y, w, h); else p.ellipse(a.x + w / 2, a.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, iw, ih); ctx.clip();
  ctx.fillStyle = 'rgba(8,12,20,0.62)'; ctx.fill(p, 'evenodd');
  ctx.restore();
  const o = new Path2D();
  if (isRect) o.rect(a.x, a.y, w, h); else o.ellipse(a.x + w / 2, a.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(8,12,20,0.85)'; ctx.lineWidth = 4; ctx.stroke(o);
  ctx.strokeStyle = '#c8f031'; ctx.lineWidth = 1.5; ctx.stroke(o);
  if (!isRect) { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(200,240,49,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(a.x, a.y, w, h); ctx.setLineDash([]); }
  const pts = handlePoints();
  Object.keys(pts).forEach(k => {
    const s = toScr(pts[k][0], pts[k][1]);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#10151f'; ctx.lineWidth = 1.5;
    ctx.fillRect(s.x - 5, s.y - 5, 10, 10); ctx.strokeRect(s.x - 5, s.y - 5, 10, 10);
  });
}

function hitHandle(m) {
  if (!S.shape) return null;
  const pts = handlePoints();
  for (const k of ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']) {
    const s = toScr(pts[k][0], pts[k][1]);
    if (Math.abs(m.x - s.x) <= 10 && Math.abs(m.y - s.y) <= 10) return k;
  }
  const a = toScr(S.shape.x, S.shape.y), b = toScr(S.shape.x + S.shape.w, S.shape.y + S.shape.h), t = 7;
  const inX = m.x >= a.x - t && m.x <= b.x + t, inY = m.y >= a.y - t && m.y <= b.y + t;
  if (inY && Math.abs(m.x - a.x) <= t) return 'w';
  if (inY && Math.abs(m.x - b.x) <= t) return 'e';
  if (inX && Math.abs(m.y - a.y) <= t) return 'n';
  if (inX && Math.abs(m.y - b.y) <= t) return 's';
  return null;
}
function insideShape(p) { const b = S.shape; return !!b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
function insideStrict(p) {
  if (!insideShape(p)) return false;
  if (RECT_TOOLS.includes(S.tool)) return true;
  const b = S.shape, nx = (p.x - (b.x + b.w / 2)) / (b.w / 2), ny = (p.y - (b.y + b.h / 2)) / (b.h / 2);
  return nx * nx + ny * ny <= 1;
}
function boxFromPoints(a, p, square) {
  let dx = p.x - a.x, dy = p.y - a.y;
  if (square) {
    const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    const maxW = sx < 0 ? a.x : S.W - a.x, maxH = sy < 0 ? a.y : S.H - a.y;
    const size = Math.min(Math.max(Math.abs(dx), Math.abs(dy)), maxW, maxH);
    dx = sx * size; dy = sy * size;
  }
  return { x: Math.min(a.x, a.x + dx), y: Math.min(a.y, a.y + dy), w: Math.abs(dx), h: Math.abs(dy) };
}
function resizeFree(b0, hd, p) {
  let x1 = b0.x, y1 = b0.y, x2 = b0.x + b0.w, y2 = b0.y + b0.h;
  if (hd.includes('w')) x1 = p.x;
  if (hd.includes('e')) x2 = p.x;
  if (hd.includes('n')) y1 = p.y;
  if (hd.includes('s')) y2 = p.y;
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}
function edgeSquare(b0, hd, p) {
  const cx = b0.x + b0.w / 2, cy = b0.y + b0.h / 2, horiz = hd === 'e' || hd === 'w';
  let s;
  if (hd === 'e') s = p.x - b0.x; else if (hd === 'w') s = b0.x + b0.w - p.x;
  else if (hd === 's') s = p.y - b0.y; else s = b0.y + b0.h - p.y;
  s = Math.max(1, s);
  const maxCross = horiz ? 2 * Math.min(cy, S.H - cy) : 2 * Math.min(cx, S.W - cx);
  const maxAlong = hd === 'e' ? S.W - b0.x : hd === 'w' ? b0.x + b0.w : hd === 's' ? S.H - b0.y : b0.y + b0.h;
  s = Math.min(s, maxCross, maxAlong);
  if (horiz) return { x: hd === 'e' ? b0.x : b0.x + b0.w - s, y: cy - s / 2, w: s, h: s };
  return { x: cx - s / 2, y: hd === 's' ? b0.y : b0.y + b0.h - s, w: s, h: s };
}
function resizeShape(b0, hd, p, lock, shift) {
  if (hd.length === 2) {
    const ax = hd.includes('w') ? b0.x + b0.w : b0.x, ay = hd.includes('n') ? b0.y + b0.h : b0.y;
    return boxFromPoints({ x: ax, y: ay }, p, lock || shift);
  }
  return lock ? edgeSquare(b0, hd, p) : resizeFree(b0, hd, p);
}

Object.assign(CC, { drawShape, handlePoints, hitHandle, insideShape, insideStrict, boxFromPoints, resizeShape });
})();