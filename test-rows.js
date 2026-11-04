const C = require('./core.js');
let fail = 0;
function ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Лист 140x120: сверху два знака рядом, в середине один широкий, внизу один на всю ширину.
function sheet(alphaBg) {
  const w = 140, h = 120, d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = alphaBg ? 0 : 255;
  const fill = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = (y * w + x) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = 255; } };
  fill(10, 10, 40, 30); fill(100, 10, 130, 30); fill(30, 50, 110, 80); fill(5, 100, 135, 115);
  return d;
}
const O = { noise: 1, minGap: 8 };
let d = sheet(false);
ok(same(C.findGaps(d, 140, 120, O).v, []), 'на весь лист вертикального промежутка нет (его закрывают широкие знаки)');
let r = C.findRowsCols(d, 140, 120, O);
ok(same(r.h, [40, 90]), 'горизонтальные линии между строками: ' + JSON.stringify(r.h));
ok(r.rows.length === 3, 'строк три');
ok(same(r.rows.map(x => [x.y0, x.y1]), [[0, 40], [40, 90], [90, 120]]), 'границы строк: ' + JSON.stringify(r.rows.map(x => [x.y0, x.y1])));
ok(same(r.rows[0].v, [70]), 'в верхней строке столбец между двумя знаками: ' + JSON.stringify(r.rows[0].v));
ok(same(r.rows[1].v, []) && same(r.rows[2].v, []), 'в средней и нижней строках столбцов нет');
r = C.findRowsCols(sheet(true), 140, 120, O);
ok(same(r.h, [40, 90]) && same(r.rows[0].v, [70]) && r.rows[1].v.length === 0, 'прозрачный фон даёт тот же результат');

// Обычный лист 3 столбца x 2 строки: столбцы находятся в обеих строках.
function grid() {
  const w = 140, h = 100, g = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) g[i * 4 + 3] = 255;
  for (const x0 of [10, 60, 110]) for (const y0 of [10, 60]) {
    for (let y = y0; y < y0 + 30; y++) for (let x = x0; x < x0 + 20; x++) { const o = (y * w + x) * 4; g[o] = 255; g[o + 1] = 255; g[o + 2] = 255; }
  }
  return g;
}
r = C.findRowsCols(grid(), 140, 100, O);
ok(same(r.h, [50]) && same(r.rows[0].v, [45, 95]) && same(r.rows[1].v, [45, 95]), 'сетка 3 x 2: столбцы в обеих строках: ' + JSON.stringify(r.rows.map(x => x.v)));

// Однотонная картинка: одна строка, ни одного столбца.
const u = new Uint8ClampedArray(60 * 40 * 4).fill(255);
r = C.findRowsCols(u, 60, 40, O);
ok(r.h.length === 0 && r.rows.length === 1 && r.rows[0].v.length === 0, 'однотонная картинка: одна строка без столбцов');

console.log(fail ? ('\nПровалено проверок: ' + fail) : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);