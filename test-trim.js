const C = require('./core.js');
let fail = 0;
function ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function make(w, h, bg, alphaBg, rect, rgb) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const o = i * 4; d[o] = bg[0]; d[o + 1] = bg[1]; d[o + 2] = bg[2]; d[o + 3] = alphaBg ? 0 : 255; }
  if (rect) for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) { const o = (y * w + x) * 4; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; }
  return d;
}
const R = { x: 20, y: 10, w: 20, h: 20 };

let d = make(100, 80, [0, 0, 0], false, R, [255, 255, 255]);
ok(same(C.trimBounds(d, 100, 80, 12, 0), R), 'чёрный фон, белый квадрат: границы точные');
ok(same(C.trimBounds(d, 100, 80, 12, 5), { x: 15, y: 5, w: 30, h: 30 }), 'отступ 5 px расширяет границы');
d = make(100, 80, [255, 255, 255], false, R, [10, 10, 10]);
ok(same(C.trimBounds(d, 100, 80, 12, 0), R), 'белый фон, тёмный квадрат');
d = make(100, 80, [0, 0, 0], true, R, [200, 30, 30]);
ok(same(C.trimBounds(d, 100, 80, 12, 0), R), 'прозрачный фон: границы по непрозрачным пикселям');
d = make(100, 80, [5, 5, 5], false, R, [255, 255, 255]);
ok(same(C.trimBounds(d, 100, 80, 12, 0), R), 'почти чёрный фон попадает в допуск 12%');
d = make(100, 80, [0, 0, 0], false, { x: 0, y: 0, w: 30, h: 30 }, [255, 255, 255]);
ok(same(C.trimBounds(d, 100, 80, 12, 8), { x: 0, y: 0, w: 38, h: 38 }), 'у края картинки отступ не выходит за границы');
d = make(100, 80, [0, 0, 0], false, null, [0, 0, 0]);
ok(C.trimBounds(d, 100, 80, 12, 8) === null, 'весь фрагмент фона: возвращается null');
d = make(100, 80, [0, 0, 0], false, R, [40, 40, 40]);
ok(C.trimBounds(d, 100, 80, 50, 0) === null, 'малоконтрастный объект при большом допуске считается фоном');
ok(same(C.trimBounds(d, 100, 80, 5, 0), R), 'тот же объект при малом допуске находится');

console.log(fail ? ('\nПровалено проверок: ' + fail) : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);