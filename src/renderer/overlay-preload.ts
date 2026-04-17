import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('prankAPI', {
  onPrankStart: (callback: (data: any) => void) => {
    ipcRenderer.on('prank:start', (_e, data) => callback(data));
  },
  onPrankStop: (callback: (data: any) => void) => {
    ipcRenderer.on('prank:stop', (_e, data) => callback(data));
  },
  onCursorPosition: (callback: (pos: { x: number; y: number }) => void) => {
    ipcRenderer.on('cursor:position', (_e, pos) => callback(pos));
  },
  onCursorClick: (callback: (pos: { x: number; y: number }) => void) => {
    ipcRenderer.on('cursor:click', (_e, pos) => callback(pos));
  },
  onKeystrokeReaction: (callback: (data: any) => void) => {
    ipcRenderer.on('keystroke:reaction', (_e, data) => callback(data));
  },
  onMercyMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('mercy:message', (_e, data) => callback(data));
  },
  triggerPranks: (prankIds: string[], delay: number) => {
    ipcRenderer.send('word:trigger-pranks', { prankIds, delay });
  },
});
