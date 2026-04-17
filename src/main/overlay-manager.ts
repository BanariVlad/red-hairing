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
