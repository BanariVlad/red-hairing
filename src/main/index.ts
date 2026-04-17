import { app, globalShortcut, BrowserWindow } from 'electron';
import { setupStealth, setupAutoLaunch, enforceSingleInstance } from './app-lifecycle';
import { createOverlayWindow } from './overlay-manager';
import { createTray } from './tray';
import { RemoteConfig } from './config/remote-config';
import { DEFAULT_CONFIG } from './config/default-config';
import { PrankScheduler } from './prank-engine/prank-scheduler';
import { InputMonitor } from './input-monitor';
import { KeystrokeMatcher } from './keystroke-matcher';
import { AppConfig } from './config/config-schema';
import { IPC } from '../shared/ipc-channels';
import { setupAutoUpdater, stopAutoUpdater } from './auto-updater';

// ── Config URL ──────────────────────────────────────────────
const CONFIG_URL = process.env.CONFIG_URL || 'https://gist.githubusercontent.com/BanariVlad/62abaf43930727f8477191d26289a83b/raw/jigx.json';

// ── Single instance ─────────────────────────────────────────
if (!enforceSingleInstance()) {
  process.exit(0);
}

// ── Stealth ─────────────────────────────────────────────────
setupStealth();

// ── Mercy system state ──────────────────────────────────────
let mercyUsesToday = 0;
let mercyDateKey = ''; // 'YYYY-MM-DD'
let mercyPauseTimer: NodeJS.Timeout | null = null;
let mercyActive = false;
let overlayRef: BrowserWindow | null = null;

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tryGrantMercy(): boolean {
  const today = getTodayKey();
  if (mercyDateKey !== today) {
    mercyDateKey = today;
    mercyUsesToday = 0;
  }

  const mercy = currentConfig.mercy;
  if (!mercy.enabled) return false;
  if (mercyActive) return false; // already paused
  if (mercyUsesToday >= mercy.maxUsesPerDay) return false;

  // Grant mercy
  mercyUsesToday++;
  mercyActive = true;
  scheduler.pause(); // stops all active pranks AND clears all timers

  console.log(`[Mercy] Granted (${mercyUsesToday}/${mercy.maxUsesPerDay} today). Pausing for ${mercy.pauseDurationMs / 1000}s`);

  // Schedule resume
  mercyPauseTimer = setTimeout(() => {
    mercyActive = false;
    scheduler.resume(); // re-enables and restarts timers
    console.log('[Mercy] Pause over. Pranks resume.');

    // Show "I'm back" message
    overlayRef?.webContents.send(IPC.MERCY_MESSAGE, {
      text: mercy.resumeText,
      emoji: mercy.resumeEmoji,
      color: mercy.resumeColor,
      fontSize: mercy.confirmationFontSize,
      duration: mercy.resumeDuration,
    });
  }, mercy.pauseDurationMs);

  return true;
}

// ── Core components ─────────────────────────────────────────
const scheduler = new PrankScheduler();
const keystrokeMatcher = new KeystrokeMatcher();
keystrokeMatcher.setMercyCallback(tryGrantMercy);
keystrokeMatcher.setTriggerPranksCallback((prankIds, delay) => {
  if (mercyActive) return;
  const fire = () => {
    for (const id of prankIds) {
      scheduler.forceFire(id as any);
    }
  };
  if (delay > 0) {
    setTimeout(fire, delay);
  } else {
    fire();
  }
});

const inputMonitor = new InputMonitor(
  (event) => {
    if (mercyActive) return; // pranks paused during mercy
    scheduler.handleTrigger(event);
  },
  (keycode) => { keystrokeMatcher.handleKeycode(keycode); },
);

let remoteConfig: RemoteConfig | null = null;
let currentConfig: AppConfig = DEFAULT_CONFIG;

function onConfigChange(config: AppConfig): void {
  currentConfig = config;
  scheduler.updateConfig(config);
  keystrokeMatcher.updateConfig(config);
  registerShortcuts(config);
  setupAutoUpdater(config);
  console.log('[Main] Config applied, globalEnabled:', config.globalEnabled);
}

function registerShortcuts(config: AppConfig): void {
  globalShortcut.unregisterAll();

  // Kill combo
  try {
    globalShortcut.register(config.killCombo, () => {
      console.log('[Main] Kill combo activated');
      cleanup();
      app.quit();
    });
  } catch (err: any) {
    console.error('[Main] Failed to register kill combo:', err.message);
  }

  // Dismiss combo
  if (config.dismissable) {
    try {
      globalShortcut.register(config.dismissCombo, () => {
        if (scheduler.canDismiss(config.dismissDelay)) {
          console.log('[Main] Dismiss combo — stopping all pranks');
          scheduler.stopAll();
        } else {
          console.log('[Main] Dismiss combo — too early, delay not met');
        }
      });
    } catch (err: any) {
      console.error('[Main] Failed to register dismiss combo:', err.message);
    }
  }
}

function cleanup(): void {
  scheduler.stopAll();
  inputMonitor.stop();
  remoteConfig?.stop();
  if (mercyPauseTimer) clearTimeout(mercyPauseTimer);
  stopAutoUpdater();
  globalShortcut.unregisterAll();
}

// ── App ready ───────────────────────────────────────────────
app.whenReady().then(async () => {
  const overlay = createOverlayWindow();
  overlayRef = overlay;
  scheduler.setOverlayWindow(overlay);
  inputMonitor.setOverlayWindow(overlay);
  keystrokeMatcher.setOverlayWindow(overlay);

  createTray(() => {
    cleanup();
    app.quit();
  });

  await inputMonitor.start();

  if (CONFIG_URL) {
    remoteConfig = new RemoteConfig(CONFIG_URL, onConfigChange);
    await remoteConfig.start();
  } else {
    console.log('[Main] No CONFIG_URL set, using defaults (all pranks disabled)');
    onConfigChange(DEFAULT_CONFIG);
  }

  setupAutoLaunch().catch(() => {});

  console.log('[Main] App ready');
});

app.on('window-all-closed', () => {});

app.on('will-quit', () => {
  cleanup();
});
