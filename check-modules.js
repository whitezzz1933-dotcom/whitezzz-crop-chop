const fs = require('fs');
const order = ['core.js', 'state.js', 'view.js', 'tool-grid.js', 'tool-shape.js', 'tool-lasso.js', 'tool-poly.js', 'tool-clear.js', 'export.js', 'input.js', 'app.js', 'window-menu.js', 'hints.js', 'ui-steppers.js', 'reopen.js'];
const mods = order.slice(1, 11);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };

const html = fs.readFileSync('index.html', 'utf8');
const tags = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
ok(JSON.stringify(tags) === JSON.stringify(order), 'порядок скриптов в index.html: ' + tags.join(' → '));

const exportsBy = {}, used = new Map();
for (const f of mods) {
  const src = fs.readFileSync(f, 'utf8'), set = new Set();
  for (const m of src.matchAll(/Object\.assign\(CC,\s*\{([\s\S]*?)\}\s*\)/g)) m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(n => set.add(n.split(':')[0].trim()));
  exportsBy[f] = set;
  for (const m of src.matchAll(/\bCC\.([A-Za-z_$][\w$]*)/g)) { if (!used.has(m[1])) used.set(m[1], new Set()); used.get(m[1]).add(f); }
}
const all = new Set(); mods.forEach(f => exportsBy[f].forEach(n => all.add(n)));
for (const [n, fl] of used) ok(all.has(n), 'CC.' + n + (all.has(n) ? '' : ' НЕ определено, нужно в: ' + [...fl].join(', ')));

mods.forEach((f, i) => {
  const before = new Set(); mods.slice(0, i).forEach(g => exportsBy[g].forEach(n => before.add(n)));
  const src = fs.readFileSync(f, 'utf8');
  for (const line of src.split(/\r?\n/)) {
    if (!/^const\s/.test(line)) continue;
    for (const m of line.matchAll(/\bCC\.([A-Za-z_$][\w$]*)/g)) ok(before.has(m[1]), f + ': при загрузке нужен CC.' + m[1] + (before.has(m[1]) ? '' : ', а он определён позже'));
  }
});

console.log(bad ? ('\nПровалено проверок: ' + bad) : '\nВсе проверки модулей пройдены');
process.exit(bad ? 1 : 0);