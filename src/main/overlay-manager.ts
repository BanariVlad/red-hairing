import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

export function createOverlayWindows(): BrowserWindow[] {
  const displays = screen.getAllDisplays();
  const overlays: BrowserWindow[] = [];

  console.log(`[Overlay] Creating overlays for ${displays.length} displays`);

  for (const display of displays) {
    const { x, y, width, height } = display.workArea;
    console.log(`[Overlay] Display: ${width}x${height} at (${x},${y}) scaleFactor:${display.scaleFactor}`);

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

    overlay.webContents.on('did-fail-load', (_e, code, desc) => {
      console.error(`[Overlay] FAILED to load: ${code} ${desc}`);
    });

    overlay.webContents.on('console-message', (_e, _level, message) => {
      console.log(`[Renderer] ${message}`);
    });

    overlay.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));

    overlay.once('ready-to-show', () => {
      overlay.show();
      console.log(`[Overlay] Visible, bounds: ${JSON.stringify(overlay.getBounds())}`);
    });

    overlays.push(overlay);
  }

  return overlays;
}
