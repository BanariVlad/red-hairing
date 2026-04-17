import { BrowserWindow, desktopCapturer, screen } from 'electron';
import { AppConfig, PranksConfig } from '../config/config-schema';
import { PrankId, PrankCommand, TriggerType } from '../../shared/types';
import { PrankState, PrankTriggerEvent } from './types';
import { IPC } from '../../shared/ipc-channels';

const ALL_PRANKS: PrankId[] = [
  'cursorText', 'unclosable', 'screenFlip', 'cursorTrail', 'screenTilt',
  'fakeBsod', 'screenShake', 'colorInversion', 'matrixRain', 'jumpscare',
  'mouseMagnet', 'pixelDecay', 'staticGlitch',
];

const SCREEN_CAPTURE_PRANKS: PrankId[] = ['screenFlip', 'screenTilt', 'pixelDecay'];
const INPUT_BLOCKING_PRANKS: PrankId[] = ['unclosable', 'fakeBsod'];

export class PrankScheduler {
  private config: AppConfig | null = null;
  private states: Map<PrankId, PrankState> = new Map();
  private overlayWindow: BrowserWindow | null = null;
  private randomTimers: Map<PrankId, NodeJS.Timeout> = new Map();
  private intervalTimers: Map<PrankId, NodeJS.Timeout> = new Map();
  private paused: boolean = false;

  constructor() {
    for (const id of ALL_PRANKS) {
      this.states.set(id, {
        id,
        active: false,
        lastFired: 0,
        cooldownUntil: 0,
        stopTimer: null,
      });
    }
  }

  setOverlayWindow(win: BrowserWindow): void {
    this.overlayWindow = win;
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
    this.setupTimerTriggers();
  }

  pause(): void {
    this.paused = true;
    this.stopAll();
    this.clearAllTimers();
    console.log('[Scheduler] Paused');
  }

  resume(): void {
    this.paused = false;
    if (this.config) this.setupTimerTriggers();
    console.log('[Scheduler] Resumed');
  }

  isPaused(): boolean {
    return this.paused;
  }

  handleTrigger(event: PrankTriggerEvent): void {
    if (this.paused) return;
    if (!this.config?.globalEnabled) return;
    if (!this.isWithinSchedule(this.config.globalSchedule)) return;

    const pranks = this.config.pranks;

    for (const id of ALL_PRANKS) {
      const prankConfig = pranks[id];
      if (!prankConfig.enabled) continue;
      if (prankConfig.trigger !== event.type) continue;

      this.tryFire(id, prankConfig, event);
    }
  }

  stopAll(): void {
    for (const id of ALL_PRANKS) {
      this.stopPrank(id);
    }
  }

  private clearAllTimers(): void {
    for (const timer of this.randomTimers.values()) clearTimeout(timer);
    for (const timer of this.intervalTimers.values()) clearInterval(timer);
    this.randomTimers.clear();
    this.intervalTimers.clear();
  }

  // Force-fire a prank, bypassing probability/cooldown/trigger checks
  forceFire(id: PrankId): void {
    if (this.paused) return;
    if (!this.config) return;
    const prankConfig = this.config.pranks[id];
    if (!prankConfig) return;

    const state = this.states.get(id)!;
    if (state.active) return;
    if (this.hasActivePrank()) return;

    console.log(`[Scheduler] FORCE FIRING ${id}`);
    this.firePrank(id, prankConfig, { type: 'click' });
  }

  canDismiss(delayMs: number): boolean {
    // Check if any active prank has been running longer than delayMs
    const now = Date.now();
    for (const id of ALL_PRANKS) {
      const state = this.states.get(id)!;
      if (state.active && (now - state.lastFired) >= delayMs) {
        return true;
      }
    }
    return false;
  }

  private hasActivePrank(): boolean {
    for (const state of this.states.values()) {
      if (state.active) return true;
    }
    return false;
  }

  private tryFire(id: PrankId, prankConfig: any, event: PrankTriggerEvent): void {
    const state = this.states.get(id)!;

    // Already active
    if (state.active) return;

    // No overlapping — only one prank at a time
    if (this.hasActivePrank()) return;

    // Cooldown check
    if (Date.now() < state.cooldownUntil) return;

    // Schedule check
    if (!this.isWithinSchedule(prankConfig.schedule)) return;

    // Probability roll
    const roll = Math.random();
    if (roll > prankConfig.chance) {
      console.log(`[Scheduler] ${id} rolled ${roll.toFixed(2)} > ${prankConfig.chance} — skipped`);
      return;
    }

    // Fire!
    console.log(`[Scheduler] FIRING ${id} (roll ${roll.toFixed(2)} <= ${prankConfig.chance})`);
    this.firePrank(id, prankConfig, event);
  }

  private async firePrank(id: PrankId, prankConfig: any, event: PrankTriggerEvent): Promise<void> {
    const state = this.states.get(id)!;
    state.active = true;
    state.lastFired = Date.now();

    let screenCapture: string | undefined;

    // Capture screen for pranks that need it
    if (SCREEN_CAPTURE_PRANKS.includes(id)) {
      screenCapture = await this.captureScreen();
    }

    // Toggle input blocking
    if (INPUT_BLOCKING_PRANKS.includes(id)) {
      this.overlayWindow?.setIgnoreMouseEvents(false);
    }

    // Send start command
    const command: PrankCommand = {
      prank: id,
      action: 'start',
      config: { ...prankConfig, cursorX: event.x, cursorY: event.y },
      screenCapture,
    };

    this.overlayWindow?.webContents.send(IPC.PRANK_START, command);

    // Schedule auto-stop
    state.stopTimer = setTimeout(() => {
      this.stopPrank(id);
    }, prankConfig.duration);

    // Chain: fire other pranks
    if (prankConfig.chainPranks?.length > 0) {
      const delay = prankConfig.chainDelay || 0;
      setTimeout(() => {
        for (const chainId of prankConfig.chainPranks) {
          this.forceFire(chainId as PrankId);
        }
      }, delay);
    }
  }

  private stopPrank(id: PrankId): void {
    const state = this.states.get(id)!;
    if (!state.active) return;

    state.active = false;
    state.cooldownUntil = Date.now() + (this.config?.pranks[id]?.cooldown ?? 10000);

    if (state.stopTimer) {
      clearTimeout(state.stopTimer);
      state.stopTimer = null;
    }

    // Restore click-through
    if (INPUT_BLOCKING_PRANKS.includes(id)) {
      this.overlayWindow?.setIgnoreMouseEvents(true, { forward: true });
    }

    this.overlayWindow?.webContents.send(IPC.PRANK_STOP, { prank: id, action: 'stop' });
  }

  private setupTimerTriggers(): void {
    // Clear existing timers
    for (const timer of this.randomTimers.values()) clearTimeout(timer);
    for (const timer of this.intervalTimers.values()) clearInterval(timer);
    this.randomTimers.clear();
    this.intervalTimers.clear();

    if (!this.config) return;

    for (const id of ALL_PRANKS) {
      const prankConfig = this.config.pranks[id];
      if (!prankConfig.enabled) continue;

      if (prankConfig.trigger === 'random') {
        this.scheduleRandomTrigger(id, prankConfig);
      } else if (prankConfig.trigger === 'interval') {
        const timer = setInterval(() => {
          this.handleTrigger({ type: 'interval' });
        }, prankConfig.duration + prankConfig.cooldown);
        this.intervalTimers.set(id, timer);
      }
    }
  }

  private scheduleRandomTrigger(id: PrankId, prankConfig: any): void {
    const minDelay = prankConfig.cooldown;
    const maxDelay = prankConfig.cooldown * 3;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    const timer = setTimeout(() => {
      this.handleTrigger({ type: 'random' });
      // Re-schedule
      if (this.config?.pranks[id]?.enabled) {
        this.scheduleRandomTrigger(id, this.config.pranks[id]);
      }
    }, delay);

    this.randomTimers.set(id, timer);
  }

  private isWithinSchedule(schedule?: { startHour: number; endHour: number }): boolean {
    if (!schedule) return true;
    const hour = new Date().getHours();
    if (schedule.startHour <= schedule.endHour) {
      return hour >= schedule.startHour && hour < schedule.endHour;
    }
    // Wraps midnight
    return hour >= schedule.startHour || hour < schedule.endHour;
  }

  private async captureScreen(): Promise<string | undefined> {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height },
      });
      if (sources.length > 0) {
        return sources[0].thumbnail.toDataURL();
      }
    } catch (err) {
      console.error('[PrankScheduler] Screen capture failed:', err);
    }
    return undefined;
  }
}
