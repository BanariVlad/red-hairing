import { screen, powerMonitor, BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { PrankTriggerEvent } from './prank-engine/types';

type TriggerHandler = (event: PrankTriggerEvent) => void;
type KeycodeHandler = (keycode: number) => void;

export class InputMonitor {
  private overlayWindows: BrowserWindow[] = [];
  private onTrigger: TriggerHandler;
  private onKeycode: KeycodeHandler | null = null;
  private cursorPollTimer: NodeJS.Timeout | null = null;
  private idlePollTimer: NodeJS.Timeout | null = null;
  private uiohook: any = null;
  private idleThreshold = 30;

  constructor(onTrigger: TriggerHandler, onKeycode?: KeycodeHandler) {
    this.onTrigger = onTrigger;
    this.onKeycode = onKeycode || null;
  }

  setOverlayWindows(wins: BrowserWindow[]): void {
    this.overlayWindows = wins;
  }

  private sendToAll(channel: string, data: any): void {
    for (const win of this.overlayWindows) {
      win.webContents.send(channel, data);
    }
  }

  async start(): Promise<void> {
    this.startCursorPolling();
    this.startIdlePolling();
    await this.startInputHooks();
  }

  stop(): void {
    if (this.cursorPollTimer) clearInterval(this.cursorPollTimer);
    if (this.idlePollTimer) clearInterval(this.idlePollTimer);
    this.uiohook?.stop();
  }

  private startCursorPolling(): void {
    this.cursorPollTimer = setInterval(() => {
      const pos = screen.getCursorScreenPoint();
      this.sendToAll(IPC.CURSOR_POSITION, pos);
    }, 16);
  }

  private startIdlePolling(): void {
    let wasIdle = false;

    this.idlePollTimer = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      const isIdle = idleTime >= this.idleThreshold;

      if (isIdle && !wasIdle) {
        this.onTrigger({ type: 'idle' });
      }
      wasIdle = isIdle;
    }, 5000);
  }

  private async startInputHooks(): Promise<void> {
    try {
      const { uIOhook, UiohookKey } = await import('uiohook-napi');
      this.uiohook = uIOhook;

      uIOhook.on('click', (e: any) => {
        const pos = screen.getCursorScreenPoint();
        this.onTrigger({ type: 'click', x: pos.x, y: pos.y });
        this.sendToAll(IPC.CURSOR_CLICK, pos);
      });

      uIOhook.on('keydown', (e: any) => {
        this.onTrigger({ type: 'keypress', key: String(e.keycode) });
        this.onKeycode?.(e.keycode);
      });

      uIOhook.start();
      console.log('[InputMonitor] uiohook started');
    } catch (err: any) {
      console.error('[InputMonitor] uiohook failed, falling back to polling:', err.message);
    }
  }
}
