import { Tray, Menu, app, nativeImage } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;

export function createTray(onQuit: () => void): Tray {
  // Create a 1x1 transparent icon — effectively invisible tray
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Audio Device Graph');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', click: onQuit },
  ]);

  tray.setContextMenu(contextMenu);

  return tray;
}
