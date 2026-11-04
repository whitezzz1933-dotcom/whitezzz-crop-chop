(() => {
'use strict';
const CC = window.CC, S = CC.S, $ = CC.$;
// Что запоминаем про текущий лист, чтобы вернуться к нему целиком.
const KEYS = ['img', 'name', 'W', 'H', 'v', 'h', 'shape', 'poly', 'pg', 'skip', 'skipV', 'skipH', 'stamp', 'counter', 'dir', 'hist', 'hi'];
const stack = [];

function snapshot() {
  const o = { info: $('imgInfo').textContent };
  KEYS.forEach(k => { o[k] = S[k]; });
  return o;
}
function syncBack() {
  const b = $('btnBack');
  b.hidden = stack.length === 0;
  b.textContent = stack.length > 1 ? '↩ Назад (' + stack.length + ')' : '↩ К исходному листу';
}
async function reopen() {
  if (S.cutting) return;
  const it = S.items[S.selItem];
  if (!it) { CC.toast('Выбери фрагмент в ленте, потом нажми эту кнопку'); return; }
  let r = null;
  try { r = await window.api.openPiece(it.file); } catch (e) { r = null; }
  if (!r) { CC.toast('Файл не найден или недоступен'); return; }
  stack.push(snapshot());
  CC.loadImage(r.dataUrl, r.name);
  syncBack();
  CC.toast('Фрагмент открыт для нарезки. «К исходному листу» вернёт прежнюю картинку');
}
function back() {
  if (!stack.length) return;
  const o = stack.pop();
  KEYS.forEach(k => { S[k] = o[k]; });
  S.sel = null; S.drag = null;
  $('imgInfo').textContent = o.info;
  $('empty').style.display = 'none';
  CC.fit(); CC.updateInfo(); CC.syncUndo();
  syncBack();
  CC.toast('Вернулась исходная картинка');
}
$('btnReopen').onclick = reopen;
$('btnBack').onclick = back;
syncBack();
Object.assign(CC, { reopenSelected: reopen, backToSheet: back });
})();