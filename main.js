const { app, BrowserWindow, ipcMain, nativeImage, nativeTheme, dialog, shell, clipboard, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Папка результатов. Пока output рядом с проектом, позже вынесем в настройки.
const OUT = (() => {
  if (!app.isPackaged) return path.join(__dirname, 'output');
  const cands = [];
  if (process.env.PORTABLE_EXECUTABLE_DIR) cands.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'output'));
  else cands.push(path.join(path.dirname(process.execPath), 'output'));
  cands.push(path.join(app.getPath('documents'), 'Crop Chop', 'output'));
  for (const c of cands) {
    try { fs.mkdirSync(c, { recursive: true }); fs.accessSync(c, fs.constants.W_OK); return c; } catch (e) { /* пробуем следующий */ }
  }
  return cands[cands.length - 1];
})();

// Защита: программа работает только с файлами внутри своей папки output.
const inOut = p => { try { const r = path.relative(OUT, path.resolve(String(p))); return !!r && !r.startsWith('..') && !path.isAbsolute(r); } catch (e) { return false; } };

// Настройки ОКНА лежат отдельно от будущих настроек программы.
// В разработке: рядом с проектом. В установленной версии: в папке данных пользователя.
const WIN_FILE = path.join(app.isPackaged ? app.getPath('userData') : __dirname, 'window-settings.json');
const DEFAULTS = { width: 1280, height: 800, x: null, y: null, maximized: false, alwaysOnTop: false, zoom: 1, remember: true };

function loadWin() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(fs.readFileSync(WIN_FILE, 'utf8'))); }
  catch (e) { return Object.assign({}, DEFAULTS); }
}
let WS = loadWin();
let win = null, saveTimer = null;

function saveWin() { try { fs.writeFileSync(WIN_FILE, JSON.stringify(WS, null, 2)); } catch (e) { /* не критично */ } }
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveWin, 400); }

function visibleOnSomeDisplay(b) {
  return screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y < a.y + a.height - 40 && b.y + b.height > a.y + 40;
  });
}

function setZoom(z) {
  z = Math.min(2, Math.max(0.6, Math.round(z * 100) / 100));
  WS.zoom = z;
  if (win && !win.isDestroyed()) win.webContents.setZoomFactor(z);
  saveWin();
}

async function reloadWindow() {
  if (!win || win.isDestroyed()) return;
  let dirty = false;
  try { dirty = await win.webContents.executeJavaScript('window.__cropchopDirty ? window.__cropchopDirty() : false'); } catch (e) { dirty = false; }
  if (dirty) {
    const r = await dialog.showMessageBox(win, {
      type: 'question', buttons: ['Обновить', 'Отмена'], defaultId: 1, cancelId: 1,
      title: 'Обновить окно', message: 'Обновить окно программы?',
      detail: 'Открытая картинка, линии, контуры и лента миниатюр будут сброшены. Уже вырезанные файлы в папке output останутся.'
    });
    if (r.response !== 0) return;
  }
  win.webContents.reload();
}

function resetWindow() {
  WS = Object.assign({}, DEFAULTS);
  if (win.isFullScreen()) win.setFullScreen(false);
  if (win.isMaximized()) win.unmaximize();
  win.setAlwaysOnTop(false);
  win.setSize(DEFAULTS.width, DEFAULTS.height);
  win.center();
  win.webContents.setZoomFactor(1);
  saveWin();
}

function setSize(w, h) {
  if (win.isFullScreen()) win.setFullScreen(false);
  if (win.isMaximized()) win.unmaximize();
  const a = screen.getDisplayMatching(win.getBounds()).workArea;
  win.setSize(Math.min(w, a.width), Math.min(h, a.height));
  win.center();
}

function winState() {
  return { maximized: win.isMaximized(), fullscreen: win.isFullScreen(), alwaysOnTop: win.isAlwaysOnTop(), zoom: WS.zoom, remember: !!WS.remember };
}

function createWindow() {
  fs.mkdirSync(OUT, { recursive: true });
  nativeTheme.themeSource = 'dark';
  const useSaved = !!WS.remember;
  const opts = {
    width: useSaved ? WS.width : DEFAULTS.width,
    height: useSaved ? WS.height : DEFAULTS.height,
    minWidth: 900, minHeight: 600,
    title: 'Crop Chop — Режь-Кромсай', backgroundColor: '#0e1420', icon: path.join(__dirname, 'icon.ico'),
    alwaysOnTop: !!WS.alwaysOnTop,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  };
  if (useSaved && WS.x !== null && WS.y !== null && visibleOnSomeDisplay({ x: WS.x, y: WS.y, width: opts.width, height: opts.height })) {
    opts.x = WS.x; opts.y = WS.y;
  }
  win = new BrowserWindow(opts);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (ev, url) => { if (!url.startsWith('file://')) ev.preventDefault(); });
  if (useSaved && WS.maximized) win.maximize();
  win.loadFile('index.html');
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(WS.zoom || 1));

  // Запоминание размера и положения (только если включено).
  const track = () => {
    if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    if (!WS.remember) return;
    WS.maximized = win.isMaximized();
    if (!WS.maximized) { const b = win.getNormalBounds(); WS.width = b.width; WS.height = b.height; WS.x = b.x; WS.y = b.y; }
    saveSoon();
  };
  ['resize', 'move', 'maximize', 'unmaximize'].forEach(ev => win.on(ev, track));
  win.on('close', () => { track(); saveWin(); });
  win.on('closed', () => { win = null; });

  // Горячие клавиши окна (работают на любой раскладке).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    if ((ctrl && !input.shift && input.code === 'KeyR') || input.code === 'F5') { event.preventDefault(); reloadWindow(); }
    else if (input.code === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    else if (ctrl && (input.code === 'Equal' || input.code === 'NumpadAdd')) { event.preventDefault(); setZoom(WS.zoom + 0.1); }
    else if (ctrl && (input.code === 'Minus' || input.code === 'NumpadSubtract')) { event.preventDefault(); setZoom(WS.zoom - 0.1); }
    else if (ctrl && (input.code === 'Digit0' || input.code === 'Numpad0')) { event.preventDefault(); setZoom(1); }
    else if (ctrl && input.shift && input.code === 'KeyI') { event.preventDefault(); if (!app.isPackaged) win.webContents.toggleDevTools(); }
  });
}

// ---- меню «Настройки»: состояние и действия окна ----
ipcMain.handle('win-state', () => winState());
ipcMain.handle('app-info', () => ({ version: app.getVersion(), packaged: app.isPackaged }));
ipcMain.handle('win-action', async (e, { type, value }) => {
  switch (type) {
    case 'reload': await reloadWindow(); break;
    case 'maximize': if (win.isMaximized()) win.unmaximize(); else win.maximize(); break;
    case 'fullscreen': win.setFullScreen(!win.isFullScreen()); break;
    case 'ontop': win.setAlwaysOnTop(!!value); WS.alwaysOnTop = !!value; saveWin(); break;
    case 'size': if (Array.isArray(value)) setSize(Number(value[0]), Number(value[1])); break;
    case 'zoom': if (value === 'reset') setZoom(1); else setZoom(WS.zoom + Number(value)); break;
    case 'remember': WS.remember = !!value; saveWin(); break;
    case 'reset': resetWindow(); break;
    case 'settings-file': saveWin(); shell.showItemInFolder(WIN_FILE); break;
    case 'devtools': if (!app.isPackaged) win.webContents.toggleDevTools(); break;
  }
  await new Promise(r => setTimeout(r, 120));
  return win && !win.isDestroyed() ? winState() : null;
});

ipcMain.handle('open-image', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Выбери изображение', properties: ['openFile'],
    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg'] }]
  });
  if (r.canceled || !r.filePaths.length) return null;
  const p = r.filePaths[0];
  const mime = path.extname(p).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return { name: path.basename(p), dataUrl: 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64') };
});

// Все вырезы одной картинки лежат в одной папке сессии, номера идут подряд, ничего не перезаписывается.
ipcMain.handle('save-pieces', (e, { baseName, stamp, startIndex, pieces }) => {
  const safe = path.basename(String(baseName));
  const st = String(stamp).replace(/[^0-9_-]/g, '');
  const dir = path.join(OUT, `${safe}_${st}`);
  fs.mkdirSync(dir, { recursive: true });
  const files = pieces.map((dataUrl, i) => {
    const f = path.join(dir, `${safe}_${String(startIndex + i).padStart(2, '0')}.png`);
    fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64'));
    return f;
  });
  return { dir, files };
});

ipcMain.on('drag-start', (e, file) => {
  if (!inOut(file) || !fs.existsSync(file)) return;
  const icon = nativeImage.createFromPath(file).resize({ width: 64 });
  e.sender.startDrag({ file, icon });
});

ipcMain.handle('open-folder', (e, dir) => shell.openPath(dir && inOut(dir) ? dir : OUT));
ipcMain.handle('open-piece', (e, file) => {
  if (!inOut(file) || !fs.existsSync(file)) return null;
  const mime = path.extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return { name: path.basename(file), dataUrl: 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64') };
});
ipcMain.handle('show-item', (e, file) => { if (inOut(file)) shell.showItemInFolder(file); return true; });
ipcMain.handle('copy-image', (e, file) => { if (inOut(file)) clipboard.writeImage(nativeImage.createFromPath(file)); return true; });

app.whenReady().then(() => { Menu.setApplicationMenu(null); createWindow(); });
app.on('window-all-closed', () => app.quit());
// brand: значок окна и идентификатор приложения для панели задач
try { app.setAppUserModelId('studio.whitezzz.cropchop'); } catch (e) { /* не критично */ }
app.on('browser-window-created', (e, w) => { try { const ic = path.join(__dirname, 'icon.ico'); if (fs.existsSync(ic)) w.setIcon(ic); } catch (err) { /* ничего */ } });