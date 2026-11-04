const C = require('./core.js');
let fail = 0;
function ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail++; }
const area = cells => cells.reduce((s, c) => s + c.w * c.h, 0);
const W = 1000, H = 600;

let cells = C.gridCells([300, 700], [300], W, H);
ok(cells.length === 6, '2 вертикальные + 1 горизонтальная = 6 частей');
ok(area(cells) === W * H, 'сумма площадей = площади изображения (6 частей)');

cells = C.gridCells([300, 700], [200, 400], W, H);
ok(cells.length === 9, '2 + 2 линии = 9 частей');
ok(area(cells) === W * H, 'сумма площадей = площади изображения (9 частей)');

ok(C.gridCells([700, 300], [300], W, H).length === 6, 'порядок линий не важен');
ok(C.gridCells([500, 500, 0, 1000], [], W, H).length === 2, 'дубли и линии на краю игнорируются');
ok(JSON.stringify(C.evenLines(3, 900)) === '[300,600]', 'равномерные линии: 3 части по 900 px');
ok(C.safeName('Мой файл: тест?.png') === 'Мой файл_ тест_', 'безопасное имя файла (кириллица, запрещённые символы)');

console.log(fail ? ('\nПровалено проверок: ' + fail) : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);