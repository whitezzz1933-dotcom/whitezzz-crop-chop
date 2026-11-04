// Ядро Crop Chop: чистая геометрия, без интерфейса. Работает и в окне, и в тестах.
(function (root) {
  function normLines(lines, size) {
    const a = lines.map(v => Math.round(v)).filter(v => v > 0 && v < size).sort((p, q) => p - q);
    return a.filter((v, i) => i === 0 || v !== a[i - 1]);
  }
  function gridCells(vLines, hLines, W, H) {
    const xs = [0].concat(normLines(vLines, W), [W]);
    const ys = [0].concat(normLines(hLines, H), [H]);
    const cells = [];
    for (let r = 0; r < ys.length - 1; r++) {
      for (let c = 0; c < xs.length - 1; c++) {
        cells.push({ x: xs[c], y: ys[r], w: xs[c + 1] - xs[c], h: ys[r + 1] - ys[r], row: r, col: c });
      }
    }
    return cells;
  }
  function evenLines(n, size) {
    const a = [];
    for (let i = 1; i < n; i++) a.push(Math.round(size * i / n));
    return a;
  }
  function safeName(s) {
    return String(s).replace(/\.[^.]+$/, '').replace(/[<>:"\/\\|?*\x00-\x1f]/g, '_').trim() || 'image';
  }
    function polygonBBox(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
    return { x, y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
  }
  function polygonArea(pts) {
    let s = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    return Math.abs(s) / 2;
  }
  function pointInPolygon(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function regularPolygon(cx, cy, r, n, rot) {
    const a0 = (rot === undefined) ? -Math.PI / 2 : rot, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i * 2 * Math.PI / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  function roundedPolygon(pts, k, segs) {
    const n = pts.length; segs = segs || 8;
    if (!(k > 0) || n < 3) return pts.map(p => p.slice());
    k = Math.min(k, 1);
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) || 1, l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
      const d1 = k * l1 / 2, d2 = k * l2 / 2;
      const a = [p1[0] + (p0[0] - p1[0]) * d1 / l1, p1[1] + (p0[1] - p1[1]) * d1 / l1];
      const b = [p1[0] + (p2[0] - p1[0]) * d2 / l2, p1[1] + (p2[1] - p1[1]) * d2 / l2];
      for (let s = 0; s <= segs; s++) {
        const t = s / segs, u = 1 - t;
        out.push([u * u * a[0] + 2 * u * t * p1[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * b[1]]);
      }
    }
    return out;
  }
  function detectBg(d, w, h) {
    const pts = [], step = Math.max(1, Math.floor((w + h) / 200));
    for (let x = 0; x < w; x += step) { pts.push(x, 0, x, h - 1); }
    for (let y = 0; y < h; y += step) { pts.push(0, y, w - 1, y); }
    let transp = 0; const n = pts.length / 2, buckets = new Map();
    for (let i = 0; i < pts.length; i += 2) {
      const o = (pts[i + 1] * w + pts[i]) * 4;
      if (d[o + 3] < 10) { transp++; continue; }
      const key = (d[o] >> 5) + ',' + (d[o + 1] >> 5) + ',' + (d[o + 2] >> 5);
      const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      b.n++; b.r += d[o]; b.g += d[o + 1]; b.b += d[o + 2]; buckets.set(key, b);
    }
    if (transp / n >= 0.5) return { alpha: true };
    let best = null;
    for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
    if (!best) return { alpha: true };
    return { alpha: false, r: best.r / best.n, g: best.g / best.n, b: best.b / best.n };
  }
  function trimBounds(d, w, h, tolPercent, pad) {
    const bg = detectBg(d, w, h), thr = Math.max(0, tolPercent) * 2.55;
    const empty = o => d[o + 3] < 10 || (!bg.alpha && Math.max(Math.abs(d[o] - bg.r), Math.abs(d[o + 1] - bg.g), Math.abs(d[o + 2] - bg.b)) <= thr);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (!empty(row + x * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    if (x1 < 0) return null;
    pad = Math.max(0, pad | 0);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function findGaps(d, w, h, opts) {
    opts = opts || {};
    const noise = opts.noise === undefined ? 1 : opts.noise, minGap = opts.minGap === undefined ? 8 : opts.minGap, tol = opts.tol === undefined ? 12 : opts.tol;
    const step = opts.step || Math.max(1, Math.floor(Math.sqrt(w * h / 4000000)));
    const bg = detectBg(d, w, h), thr = tol * 2.55;
    const nx = Math.ceil(w / step), ny = Math.ceil(h / step);
    const cx = new Int32Array(nx), ry = new Int32Array(ny);
    for (let y = 0, iy = 0; y < h; y += step, iy++) {
      for (let x = 0, ix = 0; x < w; x += step, ix++) {
        const o = (y * w + x) * 4;
        if (d[o + 3] < 10) continue;
        if (!bg.alpha && Math.max(Math.abs(d[o] - bg.r), Math.abs(d[o + 1] - bg.g), Math.abs(d[o + 2] - bg.b)) <= thr) continue;
        cx[ix]++; ry[iy]++;
      }
    }
    const lines = (counts, total, len) => {
      const res = [], n = counts.length;
      let a = -1;
      for (let i = 0; i <= n; i++) {
        const empty = i < n && counts[i] * 100 <= noise * total;
        if (empty && a < 0) a = i;
        if (!empty && a >= 0) {
          const b = i - 1, start = a * step, end = Math.min(len, (b + 1) * step);
          if (a > 0 && b < n - 1 && end - start >= minGap) res.push(Math.round((start + end) / 2));
          a = -1;
        }
      }
      return res;
    };
    return { v: lines(cx, ny, w), h: lines(ry, nx, h) };
  }
  function cropRGBA(d, w, x0, y0, x1, y1) {
    const cw = x1 - x0, ch = y1 - y0, o = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) { const s = ((y0 + y) * w + x0) * 4; o.set(d.subarray(s, s + cw * 4), y * cw * 4); }
    return o;
  }
  // Сначала строки (горизонтальные промежутки на весь лист), затем столбцы внутри каждой строки отдельно.
  function findRowsCols(d, w, h, opts) {
    const hs = findGaps(d, w, h, opts).h, ys = [0].concat(hs, [h]), rows = [];
    for (let i = 0; i < ys.length - 1; i++) {
      const y0 = ys[i], y1 = ys[i + 1];
      if (y1 - y0 < 1) continue;
      rows.push({ y0, y1, v: findGaps(cropRGBA(d, w, 0, y0, w, y1), w, y1 - y0, opts).v });
    }
    return { h: hs, rows };
  }
  const Core = { normLines, gridCells, evenLines, safeName, polygonBBox, polygonArea, pointInPolygon, regularPolygon, roundedPolygon, trimBounds, findGaps, findRowsCols };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);