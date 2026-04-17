// No Zod — just types and a lenient parser. Whatever you put in the config, it works.

export interface AppConfig {
  version: number;
  pollIntervalMs: number;
  configUrl?: string;
  globalEnabled: boolean;
  globalSchedule?: { startHour: number; endHour: number };
  killCombo: string;
  dismissCombo: string;
  dismissDelay: number;
  dismissable: boolean;
  pranks: Record<string, any>;
  keystrokeReactions: {
    enabled: boolean;
    bufferSize: number;
    schedule?: { startHour: number; endHour: number };
    reactions: any[];
  };
  mercy: {
    enabled: boolean;
    phrase: string;
    caseSensitive: boolean;
    pauseDurationMs: number;
    maxUsesPerDay: number;
    confirmationText: string;
    confirmationEmoji: string;
    confirmationDuration: number;
    confirmationColor: string;
    confirmationFontSize: number;
    exhaustedText: string;
    exhaustedEmoji: string;
    exhaustedColor: string;
    resumeText: string;
    resumeEmoji: string;
    resumeColor: string;
    resumeDuration: number;
  };
  autoUpdate: {
    enabled: boolean;
    repo: string;
    checkIntervalMs: number;
    autoRestart: boolean;
    restartDelayMs: number;
  };
}

export type PranksConfig = AppConfig['pranks'];

const DEFAULTS: AppConfig = {
  version: 1,
  pollIntervalMs: 60000,
  globalEnabled: true,
  killCombo: 'CommandOrControl+Shift+Alt+Q',
  dismissCombo: 'Shift+Escape',
  dismissDelay: 2000,
  dismissable: true,
  pranks: {},
  keystrokeReactions: { enabled: false, bufferSize: 100, reactions: [] },
  mercy: {
    enabled: true,
    phrase: 'vlad please stop',
    caseSensitive: false,
    pauseDurationMs: 3600000,
    maxUsesPerDay: 2,
    confirmationText: "Fine. You're free... for now.",
    confirmationEmoji: '😮‍💨',
    confirmationDuration: 4000,
    confirmationColor: '#00ff00',
    confirmationFontSize: 48,
    exhaustedText: 'No mercy left today. Good luck.',
    exhaustedEmoji: '😈',
    exhaustedColor: '#ff0000',
    resumeText: "Time's up. I'm back.",
    resumeEmoji: '👹',
    resumeColor: '#ff0000',
    resumeDuration: 3000,
  },
  autoUpdate: {
    enabled: false,
    repo: 'BanariVlad/red-hairing',
    checkIntervalMs: 3600000,
    autoRestart: true,
    restartDelayMs: 5000,
  },
};

function deepMerge(defaults: any, override: any): any {
  if (override === undefined || override === null) return defaults;
  if (typeof defaults !== 'object' || Array.isArray(defaults)) return override;
  const result: any = { ...defaults };
  for (const key of Object.keys(override)) {
    if (key in result && typeof result[key] === 'object' && !Array.isArray(result[key]) && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

export function parseConfig(raw: any): AppConfig {
  return deepMerge(DEFAULTS, raw) as AppConfig;
}
