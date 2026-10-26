import { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, clipboard, ClipboardItem, nativeImage, screen } from 'electron'
import { join } from 'node:path'
import { log, logFile } from './log'

const HOTKEY = 'Alt+Command+D'

let tray: Tray | null = null
let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 420,
    minWidth: 280,
    minHeight: 220,
    show: false,
    frame: false,
    resizable: true,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })
  const wc = win.webContents
  wc.on('console-message', (e) => {
    if (e.level === 'warning' || e.level === 'error')
      log(e.level === 'error' ? 'error' : 'warn', `renderer: ${e.message} (${e.sourceId}:${e.lineNumber})`)
  })
  wc.on('render-process-gone', (_e, details) => log('error', 'renderer gone', details))
  wc.on('unresponsive', () => log('warn', 'renderer unresponsive'))
  wc.on('responsive', () => log('info', 'renderer responsive again'))
  wc.on('did-fail-load', (_e, code, desc, url) => log('error', 'load failed', { code, desc, url }))
  wc.on('preload-error', (_e, path, err) => log('error', 'preload error', path, err))
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.on('blur', () => {
    if (!win?.webContents.isDevToolsOpened()) win?.hide()
  })

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

// Place the popup under the tray icon (or top-center of the active screen when opened by hotkey).
function positionWindow() {
  if (!win || !tray) return
  const { width } = win.getBounds()
  const trayBounds = tray.getBounds()
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(trayBounds.width ? trayBounds : cursor)
  const area = display.workArea
  const anchorX = trayBounds.width ? trayBounds.x + trayBounds.width / 2 : area.x + area.width / 2
  const x = Math.round(Math.min(Math.max(anchorX - width / 2, area.x + 8), area.x + area.width - width - 8))
  win.setPosition(x, area.y + 4)
}

function show() {
  if (!win) return
  positionWindow()
  win.show()
  win.focus()
  win.webContents.send('shown')
}

function toggle() {
  if (win?.isVisible()) win.hide()
  else show()
}

// Opening the app again (Raycast, Spotlight, Finder) should bring up the popup.
if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', show)
app.on('activate', show)

app.on('child-process-gone', (_e, details) => log('error', 'child process gone', details))

app.whenReady().then(() => {
  log('info', `started v${app.getVersion()} electron ${process.versions.electron}, logging to ${logFile}`)
  app.dock?.hide()

  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
  icon.setTemplateImage(true)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  if (icon.isEmpty()) {
    log('warn', 'tray icon missing, using text fallback')
    tray.setTitle('✎')
  }
  tray.setToolTip(`Sketchpad (${HOTKEY.replace('Alt', '⌥').replace('Command', '⌘').replaceAll('+', '')})`)
  tray.on('click', toggle)
  tray.on('right-click', () => app.quit())

  createWindow()
  win?.once('ready-to-show', show)
  globalShortcut.register(HOTKEY, toggle)

  ipcMain.handle('copy-png', (_e, data: ArrayBuffer) => {
    return clipboard.write([new ClipboardItem({ "image/png": new Blob([data], { type: "image/png" }) })])
  })
  ipcMain.on('hide', () => win?.hide())
  ipcMain.on('show-menu', (_e, x: number, y: number) => {
    if (!win) return
    Menu.buildFromTemplate([{ label: 'Quit Sketchpad', accelerator: 'Command+Q', click: () => app.quit() }]).popup({
      window: win,
      x: Math.round(x),
      y: Math.round(y),
    })
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
