(() => {
'use strict';
const btn = document.getElementById('btnSettings');
const header = document.querySelector('header');
const panel = document.createElement('div');
panel.id = 'settingsPanel'; panel.className = 'settings';
document.body.appendChild(panel);
let st = { maximized: false, fullscreen: false, alwaysOnTop: false, zoom: 1, remember: true };
let isOpen = false;
let info = { version: '', packaged: false };
const SIZES = [[1100, 720], [1280, 800], [1600, 900], [1920, 1080]];

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
async function act(type, value) {
  try { const s = await window.api.winAction(type, value); if (s) st = s; } catch (e) { /* окно перезагружается */ }
  if (isOpen) render();
}
function btnRow(label, hint, run, cls) {
  const b = el('button', 'st-btn' + (cls ? ' ' + cls : ''));
  b.append(el('span', '', label));
  if (hint) b.append(el('kbd', '', hint));
  b.addEventListener('click', run);
  return b;
}
function sw(label, checked, run) {
  const l = el('label', 'sw');
  const i = el('input'); i.type = 'checkbox'; i.checked = !!checked;
  i.addEventListener('change', () => run(i.checked));
  l.append(i, el('span', 'track'), el('span', '', label));
  return l;
}
function section(title) { const s = el('div', 'st-sec'); if (title) s.append(el('div', 'st-title', title)); return s; }
function row() { const r = el('div', 'st-row'); r.append(...arguments); return r; }
function small(label, run) { const b = el('button', '', label); b.addEventListener('click', run); return b; }

function render() {
  panel.textContent = '';
  const head = el('div', 'st-head');
  const x = el('button', 'st-x', '✕'); x.title = 'Закрыть (Esc)'; x.addEventListener('click', close);
  head.append(el('h3', '', 'Настройки окна'), x);

  const s1 = section('Окно');
  s1.append(
    btnRow('Обновить окно', 'Ctrl+R', () => act('reload'), 'primary'),
    row(
      small(st.maximized ? 'Восстановить размер' : 'Развернуть', () => act('maximize')),
      small(st.fullscreen ? 'Выйти из полного экрана' : 'Во весь экран (F11)', () => act('fullscreen'))
    ),
    sw('Поверх всех окон', st.alwaysOnTop, v => act('ontop', v))
  );

  const s2 = section('Размер окна');
  s2.append(row.apply(null, SIZES.map(s => small(s[0] + '×' + s[1], () => act('size', s)))));

  const s3 = section('Масштаб интерфейса');
  const z = el('div', 'st-zoom');
  z.append(small('−', () => act('zoom', -0.1)), el('span', 'val', Math.round(st.zoom * 100) + '%'), small('+', () => act('zoom', 0.1)), small('100%', () => act('zoom', 'reset')));
  s3.append(z);

  const s4 = section('Параметры окна');
  s4.append(
    el('p', 'st-note', 'Хранятся отдельно от настроек программы, в файле window-settings.json.'),
    sw('Запоминать размер и положение окна', st.remember, v => act('remember', v)),
    btnRow('Сбросить размер и положение', '', () => act('reset')),
    btnRow('Показать файл настроек окна', '', () => act('settings-file')),
    ...(info.packaged ? [] : [btnRow('Консоль разработчика', 'Ctrl+Shift+I', () => act('devtools'))])
  );

  const s5 = section('О программе');
  const about = el('div', 'about');
  const aTop = el('div', 'about-top');
  const aMark = el('img', 'about-mark'); aMark.src = 'brand/mark-dark.svg'; aMark.alt = '';
  const aNames = el('div', 'about-names');
  const aEn = el('img', 'about-en'); aEn.src = 'brand/wordmark-en.svg'; aEn.alt = 'Crop Chop';
  const aRu = el('img', 'about-ru'); aRu.src = 'brand/wordmark-ru.png'; aRu.alt = 'Режь Кромсай';
  aNames.append(aEn, aRu);
  aTop.append(aMark, aNames);
  const aBlade = el('img', 'about-blade'); aBlade.src = 'brand/blade.svg'; aBlade.alt = '';
  about.append(aTop, aBlade);
  s5.append(about);
  s5.append(
    el('p', 'st-note', 'Crop Chop «Режь-Кромсай»' + (info.version ? ', версия ' + info.version : '')),
    el('p', 'st-note', 'Идея, дизайн, тестирование и сопровождение: Whitezzz Studio. Код создан с помощью ИИ.'),
    el('p', 'st-note', 'Связь: Telegram @Whitezz. Лицензия: MIT.'),
    el('p', 'st-note', 'Работает без интернета: изображения не покидают компьютер.'), el('p', 'st-note', 'Не связано с Figma: Figma это торговая марка Figma, Inc.')
  );
  panel.append(head, s1, s2, s3, s4, s5, el('div', 'st-foot', 'Crop Chop · by Whitezzz Studio'));
}
async function open() {
  try { const s = await window.api.winState(); if (s) st = s; } catch (e) { /* ничего */ }
  try { const i = await window.api.appInfo(); if (i) info = i; } catch (e) { /* ничего */ }
  render(); panel.classList.add('open'); isOpen = true;
}
function close() { panel.classList.remove('open'); isOpen = false; }
btn.addEventListener('click', e => { e.stopPropagation(); if (isOpen) close(); else open(); });
header.addEventListener('contextmenu', e => { e.preventDefault(); if (isOpen) close(); else open(); });
document.addEventListener('mousedown', e => { if (isOpen && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
window.addEventListener('keydown', e => { if (e.code === 'Escape' && isOpen) { e.stopImmediatePropagation(); close(); } }, true);
})();