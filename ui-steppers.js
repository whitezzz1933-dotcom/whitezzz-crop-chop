(() => {
'use strict';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
const lim = inp => ({ min: inp.min !== '' ? Number(inp.min) : -Infinity, max: inp.max !== '' ? Number(inp.max) : Infinity });
function cur(inp) { const v = parseInt(inp.value, 10); return Number.isFinite(v) ? v : (inp.min !== '' ? Number(inp.min) : 0); }
function setValue(inp, v) {
  const l = lim(inp), nv = clamp(Math.round(v), l.min, l.max);
  if (String(nv) === inp.value) return false;
  inp.value = String(nv); fire(inp, 'input'); return true;
}
// Вернуть управление холсту, чтобы горячие клавиши снова работали.
function release() { const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.classList.contains('stp-b'))) a.blur(); }

function makeBtn(text, label) {
  const b = document.createElement('button');
  b.type = 'button'; b.tabIndex = -1; b.className = 'stp-b'; b.textContent = text; b.setAttribute('aria-label', label);
  b.addEventListener('mousedown', e => e.preventDefault());
  return b;
}
function hold(b, dir, inp) {
  let t1 = 0, t2 = 0;
  const stop = () => {
    clearTimeout(t1); clearInterval(t2); t1 = 0; t2 = 0;
    window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop);
    fire(inp, 'change'); release();
  };
  b.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const big = e.shiftKey, go = () => setValue(inp, cur(inp) + dir * (big ? 10 : 1));
    go();
    t1 = setTimeout(() => { t2 = setInterval(go, 60); }, 380);
    window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop);
  });
}
// Как в Figma: зажать название поля и тянуть вправо (больше) или влево (меньше).
function scrub(label, inp) {
  label.classList.add('scrub');
  let sx = 0, base = 0, active = false, moved = false, swallow = false, pid = null;
  label.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('input,button')) return;
    sx = e.clientX; base = cur(inp); active = true; moved = false; pid = e.pointerId;
    label.setPointerCapture(pid);
  });
  label.addEventListener('pointermove', e => {
    if (!active) return;
    const dx = e.clientX - sx;
    if (!moved && Math.abs(dx) < 3) return;
    moved = true; document.body.classList.add('scrubbing');
    setValue(inp, base + Math.trunc(dx / 3) * (e.shiftKey ? 10 : 1));
  });
  const end = () => {
    if (!active) return;
    active = false; document.body.classList.remove('scrubbing');
    try { label.releasePointerCapture(pid); } catch (e) { /* уже отпущен */ }
    if (moved) { swallow = true; fire(inp, 'change'); release(); }
  };
  label.addEventListener('pointerup', end); label.addEventListener('pointercancel', end); label.addEventListener('lostpointercapture', end);
  label.addEventListener('click', e => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false; } }, true);
}
function upgrade(inp) {
  if (inp.dataset.stp) return;
  inp.dataset.stp = '1';
  const wrap = document.createElement('span'); wrap.className = 'stp';
  const minus = makeBtn('−', 'Меньше'), plus = makeBtn('+', 'Больше');
  inp.parentNode.insertBefore(wrap, inp);
  wrap.append(minus, inp, plus);
  hold(minus, -1, inp); hold(plus, 1, inp);
  const label = inp.closest('label'); if (label) scrub(label, inp);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); inp.blur(); } });
  inp.dataset.prev = inp.value;
  inp.addEventListener('input', () => { const v = parseInt(inp.value, 10); if (Number.isFinite(v)) inp.dataset.prev = String(clamp(v, lim(inp).min, lim(inp).max)); });
  inp.addEventListener('blur', () => {
    const v = parseInt(inp.value, 10);
    if (Number.isFinite(v)) { setValue(inp, v); return; }
    inp.value = inp.dataset.prev; fire(inp, 'input'); fire(inp, 'change');
  });
}
document.querySelectorAll('input[type=number]').forEach(upgrade);
document.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('change', release));
document.querySelectorAll('input[type=checkbox]').forEach(c => c.addEventListener('change', release));
})();