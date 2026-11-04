const C = require('./core.js');
let fail = 0;
function ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail++; }
const close = (a, b, e) => Math.abs(a - b) <= e;

const sq = [[0, 0], [100, 0], [100, 100], [0, 100]];
const tri = [[10, 10], [110, 10], [10, 60]];
const L = [[0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100]];

const b = C.polygonBBox(tri);
ok(b.x === 10 && b.y === 10 && b.w === 100 && b.h === 50, 'рамка вокруг треугольника');
ok(C.polygonArea(sq) === 10000, 'площадь квадрата 100x100');
ok(C.polygonArea(tri) === 2500, 'площадь треугольника');
ok(C.polygonArea(L) === 100 * 40 + 40 * 60, 'площадь Г-образного контура');
ok(C.pointInPolygon(50, 50, sq) === true, 'точка внутри квадрата');
ok(C.pointInPolygon(150, 50, sq) === false, 'точка снаружи квадрата');
ok(C.pointInPolygon(20, 20, L) === true, 'точка внутри Г-контура');
ok(C.pointInPolygon(70, 70, L) === false, 'точка в вырезе Г-контура снаружи');
const hex = C.regularPolygon(0, 0, 100, 6);
ok(hex.length === 6, 'шестиугольник: 6 вершин');
ok(close(C.polygonArea(hex), 3 * Math.sqrt(3) / 2 * 100 * 100, 0.01), 'площадь правильного шестиугольника');
ok(C.regularPolygon(0, 0, 50, 3).length === 3, 'треугольник: 3 вершины');

console.log(fail ? ('\nПровалено проверок: ' + fail) : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);