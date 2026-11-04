(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$, clamp = CC.clamp;
const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage');

const checker = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#1a2233'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#212b40'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
  return ctx.createPattern(c, 'repeat');
})();

// ---------- координаты ----------
const toImg = (sx, sy) => ({ x: (sx - S.ox) / S.scale, y: (sy - S.oy) / S.scale });
const toScr = (x, y) => ({ x: x * S.scale + S.ox, y: y * S.scale + S.oy });
const clampP = p => ({ x: clamp(p.x, 0, S.W), y: clamp(p.y, 0, S.H) });
function mouse(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

function resize() {
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  if (S.autoFit && S.img) { fit(); return; }
  draw();
}

function fit() {
  S.autoFit = true;
  if (!S.img) return;
  const r = stage.getBoundingClientRect(), pad = 48;
  S.scale = Math.max(0.01, Math.min((r.width - pad) / S.W, (r.height - pad) / S.H));
  S.ox = (r.width - S.W * S.scale) / 2; S.oy = (r.height - S.H * S.scale) / 2;
  draw();
}

// ---------- рисование ----------
function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
  if (!S.img) return;
  const x0 = S.ox, y0 = S.oy, iw = S.W * S.scale, ih = S.H * S.scale;
  ctx.fillStyle = checker; ctx.fillRect(x0, y0, iw, ih);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(S.img, x0, y0, iw, ih);
  if (S.tool === 'grid') CC.drawGrid(); else if (S.tool === 'lasso') CC.drawLasso(); else if (S.tool === 'polygon') CC.drawPoly(); else CC.drawShape();
}

Object.assign(CC, { cv, ctx, stage, toImg, toScr, clampP, mouse, resize, fit, draw });
})();