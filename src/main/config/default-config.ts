import { AppConfig, AppConfigSchema } from './config-schema';

export const DEFAULT_CONFIG: AppConfig = AppConfigSchema.parse({
  version: 1,
  pollIntervalMs: 60000,
  globalEnabled: true,
  killCombo: 'CommandOrControl+Shift+Alt+Q',
  pranks: {},
});
