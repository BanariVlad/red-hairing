import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

export function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  const overlay = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: false,
    fullscreenable: false,
    show: false,
    // 'panel' type floats above tiling WMs (aerospace, yabai, etc.)
    type: process.platform === 'darwin' ? 'panel' : undefined as any,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Click-through by default
  overlay.setIgnoreMouseEvents(true, { forward: true });

  // Keep always on top at screen-saver level — 'screen-saver' is highest
  overlay.setAlwaysOnTop(true, 'screen-saver', 1);

  // Prevent the window from appearing in alt-tab / mission control
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Ensure aerospace/yabai don't tile this window
  overlay.setWindowButtonVisibility(false);

  overlay.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));

  overlay.once('ready-to-show', () => {
    overlay.show();
    // Debug: log overlay bounds and state
    const bounds = overlay.getBounds();
    console.log(`[Overlay] Bounds: ${JSON.stringify(bounds)}`);
    console.log(`[Overlay] Visible: ${overlay.isVisible()}, AlwaysOnTop: ${overlay.isAlwaysOnTop()}`);
    console.log(`[Overlay] Display: ${width}x${height} at (${x},${y})`);

    // Pipe renderer console to main process terminal
    overlay.webContents.on('console-message', (_e, _level, message) => {
      console.log(`[Renderer] ${message}`);
    });

    // Debug: flash red background for 2 seconds to confirm overlay is visible
    overlay.webContents.executeJavaScript(`
      document.body.style.background = 'rgba(255,0,0,0.5)';
      setTimeout(() => { document.body.style.background = 'transparent'; }, 2000);
    `);
  });

  return overlay;
}
