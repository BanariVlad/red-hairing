import { autoUpdater } from 'electron-updater';
import { AppConfig } from './config/config-schema';

let checkTimer: NodeJS.Timeout | null = null;

export function setupAutoUpdater(config: AppConfig): void {
  const { autoUpdate } = config;
  if (!autoUpdate.enabled) return;

  // Configure to use GitHub releases
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: autoUpdate.repo.split('/')[0],
    repo: autoUpdate.repo.split('/')[1],
  });

  // Silent — no dialogs, no user interaction
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', () => {
    console.log('[AutoUpdater] Update downloaded, will install on quit');
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
