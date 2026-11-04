const C = require('./core.js');
let fail = 0;
function ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail++; }
const close = (a, b, e) => Math.abs(a - b) <= e;

const up = C.regularPolygon(0, 0, 100, 6, -Math.PI / 2);
const bu = C.polygonBBox(up);
ok(close(bu.w, 173.205, 0.01) && close(bu.h, 200, 0.01), 'шестиугольник вершиной вверх: 173.2 × 200');
const flat = C.regularPolygon(0, 0, 100, 6, (30 - 90) * Math.PI / 180);
const bf = C.polygonBBox(flat);
ok(close(bf.w, 200, 0.01) && close(bf.h, 173.205, 0.01), 'поворот 30°: ровная верхняя сторона, 200 × 173.2');

const r0 = C.roundedPolygon(up, 0, 8);
ok(r0.length === 6 && r0.every((p, i) => p[0] === up[i][0] && p[1] === up[i][1]), 'скругление 0: точки без изменений');
const r5 = C.roundedPolygon(up, 0.5, 8), r10 = C.roundedPolygon(up, 1, 8);
ok(r5.length === 6 * 9, 'скругление: 6 вершин × 9 точек = 54');
const a0 = C.polygonArea(up), a5 = C.polygonArea(r5), a10 = C.polygonArea(r10);
ok(a5 < a0 && a5 > 0, 'скруглённая фигура меньше исходной и не пустая');
ok(a10 < a5, 'чем больше скругление, тем меньше площадь');
ok(r5.every(p => p[0] >= bu.x - 1e-6 && p[0] <= bu.x + bu.w + 1e-6 && p[1] >= bu.y - 1e-6 && p[1] <= bu.y + bu.h + 1e-6), 'скруглённый контур не выходит за исходную рамку');
ok(C.pointInPolygon(0, 0, r10) === true, 'центр внутри скруглённой фигуры');
ok(C.pointInPolygon(150, 0, r10) === false, 'точка снаружи');
ok(close(C.polygonArea(C.roundedPolygon(up, 2, 8)), a10, 1e-6), 'скругление больше 100% приравнивается к 100%');
const tri = C.regularPolygon(0, 0, 100, 3, -Math.PI / 2);
ok(C.roundedPolygon(tri, 0.4, 8).length === 27, 'треугольник скругляется: 3 × 9 точек');

console.log(fail ? ('\nПровалено проверок: ' + fail) : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);