import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

export function createOverlayWindow(): BrowserWindow {
  // Calculate bounding box across ALL displays
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
      preload: path.join(__dirname, '..', 'renderer', 'overlay-preload.js'),
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

  overlay.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));

  overlay.once('ready-to-show', () => {
    overlay.show();
  });

  return overlay;
}
