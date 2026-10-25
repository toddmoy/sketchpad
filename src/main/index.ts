import { app, BrowserWindow, Tray, globalShortcut, ipcMain, clipboard, ClipboardItem, nativeImage, screen } from 'electron'
import { join } from 'node:path'

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
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })
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

app.whenReady().then(() => {
  app.dock?.hide()

  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
  icon.setTemplateImage(true)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  if (icon.isEmpty()) tray.setTitle('✎')
  tray.setToolTip(`Sketchpad (${HOTKEY.replace('Alt', '⌥').replace('Command', '⌘').replaceAll('+', '')})`)
  tray.on('click', toggle)
  tray.on('right-click', () => app.quit())

  createWindow()
  globalShortcut.register(HOTKEY, toggle)

  ipcMain.handle('copy-png', (_e, data: ArrayBuffer) => {
    return clipboard.write([new ClipboardItem({ "image/png": new Blob([data], { type: "image/png" }) })])
  })
  ipcMain.on('hide', () => win?.hide())
})

app.on('will-quit', () => globalShortcut.unregisterAll())
