import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export function createOverlayWindow(): BrowserWindow {
  const displays = screen.getAllDisplays();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const display of displays) {
    const { x, y, width, height } = display.bounds;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + width > maxX) maxX = x + width;
    if (y + height > maxY) maxY = y + height;
  }

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  console.log(`[Overlay] ${displays.length} displays, total: ${totalWidth}x${totalHeight} at (${minX},${minY})`);

  const preloadPath = path.join(__dirname, '..', 'renderer', 'overlay-preload.js');
  const htmlPath = path.join(__dirname, '..', 'renderer', 'overlay.html');
  const controllerPath = path.join(__dirname, '..', 'renderer', 'prank-controller.js');

  console.log(`[Overlay] preload exists: ${fs.existsSync(preloadPath)}`);
  console.log(`[Overlay] html exists: ${fs.existsSync(htmlPath)}`);
  console.log(`[Overlay] controller exists: ${fs.existsSync(controllerPath)}`);

  const overlay = new BrowserWindow({
    x: minX,
    y: minY,
    width: totalWidth,
    height: totalHeight,
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

  overlay.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[Overlay] FAILED to load: ${code} ${desc}`);
  });

  overlay.webContents.on('did-finish-load', () => {
    console.log('[Overlay] Page loaded OK');
  });

  overlay.webContents.on('console-message', (_e, _level, message) => {
    console.log(`[Renderer] ${message}`);
  });

  overlay.loadFile(htmlPath);

  overlay.once('ready-to-show', () => {
    overlay.show();
    console.log(`[Overlay] Visible: ${overlay.isVisible()}, bounds: ${JSON.stringify(overlay.getBounds())}`);
  });

  return overlay;
}
