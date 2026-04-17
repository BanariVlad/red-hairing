import { autoUpdater } from 'electron-updater';
import { AppConfig } from './config/config-schema';

let checkTimer: NodeJS.Timeout | null = null;
let configured = false;

export function setupAutoUpdater(config: AppConfig): void {
  const { autoUpdate } = config;
  if (!autoUpdate.enabled) return;

  // Only configure once — electron-updater doesn't like re-registration
  if (!configured) {
    configured = true;

    autoUpdater.setFeedURL({
      provider: 'github',
      owner: autoUpdate.repo.split('/')[0],
      repo: autoUpdate.repo.split('/')[1],
    });

    // Fully silent — no dialogs, no visible windows
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-downloaded', () => {
      console.log('[AutoUpdater] Update downloaded');

      if (autoUpdate.autoRestart) {
        const delay = autoUpdate.restartDelayMs;
        console.log(`[AutoUpdater] Silent restart in ${delay}ms`);

        setTimeout(() => {
          // quitAndInstall(isSilent, isForceRunAfter)
          // isSilent=true: no installer UI visible
          // isForceRunAfter=true: app restarts after install
          autoUpdater.quitAndInstall(true, true);
        }, delay);
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err.message);
    });

    autoUpdater.on('update-available', () => {
      console.log('[AutoUpdater] Update available, downloading...');
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] Already up to date');
    });
  }

  // Check now
  autoUpdater.checkForUpdates().catch(() => {});

  // Poll on interval
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, autoUpdate.checkIntervalMs);
}

export function stopAutoUpdater(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}
