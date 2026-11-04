const C = require('./core.js');
let fail = 0;
function ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Лист 140x100: три столбца и две строки знаков, между ними пустые промежутки.
function sheet(alphaBg) {
  const w = 140, h = 100, d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const o = i * 4; d[o + 3] = alphaBg ? 0 : 255; }
  for (const x0 of [10, 60, 110]) for (const y0 of [10, 60]) {
    for (let y = y0; y < y0 + 30; y++) for (let x = x0; x < x0 + 20; x++) { const o = (y * w + x) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = 255; }
  }
  return d;
}
let d = sheet(false);
let r = C.findGaps(d, 140, 100, { noise: 1, minGap: 8 });
ok(same(r.v, [45, 95]), 'вертикальные линии посередине промежутков: ' + JSON.stringify(r.v));
ok(same(r.h, [50]), 'горизонтальная линия посередине промежутка: ' + JSON.stringify(r.h));
r = C.findGaps(sheet(true), 140, 100, { noise: 1, minGap: 8 });
ok(same(r.v, [45, 95]) && same(r.h, [50]), 'прозрачный фон даёт те же линии');
r = C.findGaps(d, 140, 100, { noise: 1, minGap: 40 });
ok(r.v.length === 0 && r.h.length === 0, 'слишком большой «Промежуток px»: линий нет');
r = C.findGaps(d, 140, 100, { noise: 1, minGap: 8, step: 2 });
ok(same(r.v, [45, 95]) && same(r.h, [50]), 'выборка через пиксель даёт тот же результат');
// Одна «соринка» в промежутке: с шумом 0 промежуток рвётся, с шумом 2% нет.
d = sheet(false); { const o = (5 * 140 + 45) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; }
r = C.findGaps(d, 140, 100, { noise: 0, minGap: 8 });
ok(r.v.length === 3, 'шум 0: соринка делит промежуток на два: ' + JSON.stringify(r.v));
r = C.findGaps(d, 140, 100, { noise: 2, minGap: 8 });
ok(same(r.v, [45, 95]), 'шум 2%: соринка игнорируется');
// Однотонная картинка линий не даёт.
const u = new Uint8ClampedArray(60 * 40 * 4).fill(255);
r = C.findGaps(u, 60, 40, { noise: 1, minGap: 4 });
ok(r.v.length === 0 && r.h.length === 0, 'однотонная картинка: линий нет');
// Светлый фон, тёмные знаки.
d = sheet(false); for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
r = C.findGaps(d, 140, 100, { noise: 1, minGap: 8 });
ok(same(r.v, [45, 95]) && same(r.h, [50]), 'белый фон, чёрные знаки: те же линии');

console.log(fail ? ('\nПровалено проверок: ' + fail) : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);