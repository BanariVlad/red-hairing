import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  const preloadPath = path.join(__dirname, '..', 'renderer', 'overlay-preload.js');
  const htmlPath = path.join(__dirname, '..', 'renderer', 'overlay.html');
  const controllerPath = path.join(__dirname, '..', 'renderer', 'prank-controller.js');

  console.log(`[Overlay] Preload exists: ${fs.existsSync(preloadPath)} — ${preloadPath}`);
  console.log(`[Overlay] HTML exists: ${fs.existsSync(htmlPath)} — ${htmlPath}`);
  console.log(`[Overlay] Controller exists: ${fs.existsSync(controllerPath)} — ${controllerPath}`);

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
    type: process.platform === 'darwin' ? 'panel' : undefined as any,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.setAlwaysOnTop(true, 'screen-saver', 1);
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.platform === 'darwin') {
    overlay.setWindowButtonVisibility(false);
  }

  // Log any page load errors
  overlay.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[Overlay] Failed to load: ${code} ${desc}`);
  });

  overlay.webContents.on('did-finish-load', () => {
    console.log('[Overlay] Page loaded successfully');
  });

  // Pipe renderer console to log file
  overlay.webContents.on('console-message', (_e, _level, message) => {
    console.log(`[Renderer] ${message}`);
  });

  overlay.loadFile(htmlPath);

  overlay.once('ready-to-show', () => {
    overlay.show();
    const bounds = overlay.getBounds();
    console.log(`[Overlay] Bounds: ${JSON.stringify(bounds)}`);
    console.log(`[Overlay] Visible: ${overlay.isVisible()}, AlwaysOnTop: ${overlay.isAlwaysOnTop()}`);
    console.log(`[Overlay] Display: ${width}x${height} at (${x},${y})`);
  });

  return overlay;
}
