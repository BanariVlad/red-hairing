import { z } from 'zod';

const TriggerType = z.enum(['click', 'keypress', 'idle', 'interval', 'random']);

const ScheduleSchema = z.object({
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
}).optional();

const PrankIdEnum = z.enum([
  'cursorText', 'unclosable', 'screenFlip', 'cursorTrail', 'screenTilt',
  'fakeBsod', 'screenShake', 'colorInversion', 'matrixRain', 'jumpscare',
  'mouseMagnet', 'pixelDecay', 'staticGlitch',
]);

const BasePrankConfig = z.object({
  enabled: z.boolean().default(false),
  trigger: TriggerType.default('click'),
  chance: z.number().min(0).max(1).default(0.5),
  duration: z.number().min(100).max(300000).default(5000),
  cooldown: z.number().min(0).max(3600000).default(10000),
  schedule: ScheduleSchema,
  intensity: z.number().min(1).max(10).default(5),
  // Chain: fire other pranks when this one starts
  chainPranks: z.array(PrankIdEnum).default([]),
  chainDelay: z.number().min(0).max(30000).default(0),
});

const WordVariant = z.enum(['bounce', 'follow', 'fall', 'random']);

const WordConfig = z.object({
  text: z.string(),
  color: z.string().default('#ff0000'),
  fontSize: z.number().min(8).max(200).default(48),
  fontFamily: z.string().default('Impact, sans-serif'),
  fontWeight: z.string().default('bold'),
  duration: z.number().min(500).max(60000).default(3000),
  chance: z.number().min(0).max(1).default(1),
  variant: WordVariant.default('random'),
  opacity: z.number().min(0.1).max(1).default(1),
  textShadow: z.string().default('2px 2px 4px rgba(0,0,0,0.5)'),
  // bounce-specific
  bounceSpeed: z.number().min(1).max(30).default(5),
  // follow-specific
  followOffsetX: z.number().default(20),
  followOffsetY: z.number().default(-30),
  // fall-specific
  fallSpeed: z.number().min(1).max(20).default(3),
  fallRotation: z.boolean().default(true),
});

const CursorTextConfig = BasePrankConfig.extend({
  // Per-word configs — each word fully configurable
  words: z.array(WordConfig).default([
    { text: 'LOL', color: '#ff0000', fontSize: 48, variant: 'bounce' },
    { text: 'HACKED', color: '#00ff00', fontSize: 64, variant: 'follow' },
    { text: 'OOPS', color: '#ff00ff', fontSize: 48, variant: 'fall' },
    { text: 'NOPE', color: '#ffff00', fontSize: 56, variant: 'bounce' },
    { text: 'RIP', color: '#00ffff', fontSize: 72, variant: 'fall' },
    { text: 'GG', color: '#ff7700', fontSize: 48, variant: 'random' },
  ]),
  // Default values for words that don't specify everything
  defaultColor: z.string().default('#ff0000'),
  defaultFontSize: z.number().min(8).max(200).default(48),
  defaultFontFamily: z.string().default('Impact, sans-serif'),
  defaultFontWeight: z.string().default('bold'),
  defaultDuration: z.number().min(500).max(60000).default(3000),
  defaultVariant: WordVariant.default('random'),
  defaultOpacity: z.number().min(0.1).max(1).default(1),
  defaultBounceSpeed: z.number().min(1).max(30).default(5),
  defaultFollowOffsetX: z.number().default(20),
  defaultFollowOffsetY: z.number().default(-30),
  defaultFallSpeed: z.number().min(1).max(20).default(3),
  defaultFallRotation: z.boolean().default(true),
  defaultTextShadow: z.string().default('2px 2px 4px rgba(0,0,0,0.5)'),
});

const UnclosableConfig = BasePrankConfig.extend({
  message: z.string().default('Your system has been compromised.\nPlease contact technical support.'),
  backgroundColor: z.string().default('#000000'),
  textColor: z.string().default('#ff0000'),
  showFakeButtons: z.boolean().default(true),
  fakeButtonTexts: z.array(z.string()).default(['OK', 'Cancel', 'Close', 'Help']),
});

const ScreenFlipConfig = BasePrankConfig.extend({
  angle: z.number().default(180),
  animationDuration: z.number().default(2000),
});

const CursorTrailConfig = BasePrankConfig.extend({
  colors: z.array(z.string()).default(['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#8b00ff']),
  particleCount: z.number().min(5).max(200).default(30),
  particleSize: z.number().min(1).max(50).default(8),
  fadeSpeed: z.number().min(0.01).max(0.5).default(0.05),
  trailType: z.enum(['circles', 'stars', 'emoji', 'sparkles']).default('circles'),
  emojis: z.array(z.string()).default(['✨', '💫', '⭐', '🔥', '💀']),
});

const ScreenTiltConfig = BasePrankConfig.extend({
  maxAngle: z.number().min(1).max(45).default(15),
  speed: z.number().min(0.1).max(5).default(0.5),
});

const FakeBSODConfig = BasePrankConfig.extend({
  errorCode: z.string().default('CRITICAL_PROCESS_DIED'),
  percentage: z.number().min(0).max(100).default(0),
  collectingInfo: z.boolean().default(true),
});

const ScreenShakeConfig = BasePrankConfig.extend({
  magnitude: z.number().min(1).max(50).default(10),
  frequency: z.number().min(10).max(100).default(30),
});

const ColorInversionConfig = BasePrankConfig.extend({
  animateTransition: z.boolean().default(true),
  transitionDuration: z.number().default(500),
});

const MatrixRainConfig = BasePrankConfig.extend({
  color: z.string().default('#00ff00'),
  fontSize: z.number().min(8).max(32).default(14),
  speed: z.number().min(1).max(20).default(5),
  density: z.number().min(0.1).max(1).default(0.5),
  characters: z.string().default('abcdefghijklmnopqrstuvwxyz0123456789$@#&!<>{}[]'),
});

const JumpscareConfig = BasePrankConfig.extend({
  imageUrl: z.string().optional(),
  soundUrl: z.string().optional(),
  volume: z.number().min(0).max(1).default(0.8),
  flashDuration: z.number().min(50).max(5000).default(500),
});

const MouseMagnetConfig = BasePrankConfig.extend({
  zones: z.array(z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    radius: z.number().default(200),
    strength: z.number().min(0.1).max(1).default(0.5),
  })).default([]),
  randomZones: z.boolean().default(true),
  zoneCount: z.number().min(1).max(10).default(3),
});

const PixelDecayConfig = BasePrankConfig.extend({
  speed: z.number().min(1).max(20).default(5),
  chunkSize: z.number().min(2).max(20).default(8),
  direction: z.enum(['down', 'random', 'dissolve']).default('down'),
});

const StaticGlitchConfig = BasePrankConfig.extend({
  opacity: z.number().min(0.1).max(1).default(0.3),
  glitchFrequency: z.number().min(1).max(60).default(10),
  colorShift: z.boolean().default(true),
  scanlines: z.boolean().default(true),
});

const ReactionResponse = z.object({
  type: z.enum(['emoji', 'text', 'image']).default('emoji'),
  content: z.string().default('👋'),
  fontSize: z.number().min(8).max(500).default(100),
  fontFamily: z.string().default('sans-serif'),
  fontWeight: z.string().default('bold'),
  color: z.string().default('#ffffff'),
  textShadow: z.string().default('2px 2px 8px rgba(0,0,0,0.7)'),
  duration: z.number().min(200).max(30000).default(2000),
  position: z.enum(['center', 'cursor', 'random', 'top', 'bottom', 'left', 'right']).default('center'),
  animation: z.enum(['pop', 'fade', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'bounce', 'grow', 'spin', 'shake', 'explode']).default('pop'),
  animationSpeed: z.number().min(0.1).max(5).default(1),
  backgroundColor: z.string().optional(),
  borderRadius: z.string().default('10px'),
  padding: z.string().default('20px'),
  opacity: z.number().min(0.1).max(1).default(1),
  // image-specific
  imageUrl: z.string().optional(),
  imageWidth: z.number().min(10).max(2000).default(200),
  imageHeight: z.number().min(10).max(2000).default(200),
  // sound
  soundUrl: z.string().optional(),
  soundVolume: z.number().min(0).max(1).default(0.5),
});

const KeystrokeReaction = z.object({
  pattern: z.string(),
  caseSensitive: z.boolean().default(false),
  // Trigger pranks when this pattern matches
  triggerPranks: z.array(PrankIdEnum).default([]),
  triggerDelay: z.number().min(0).max(30000).default(0),
  response: ReactionResponse.default({}),
  chance: z.number().min(0).max(1).default(1),
  cooldown: z.number().min(0).max(3600000).default(5000),
});

const KeystrokeReactionsConfig = z.object({
  enabled: z.boolean().default(false),
  bufferSize: z.number().min(10).max(500).default(100),
  schedule: ScheduleSchema,
  reactions: z.array(KeystrokeReaction).default([]),
});

export const AppConfigSchema = z.object({
  version: z.number().default(1),
  pollIntervalMs: z.number().min(5000).max(3600000).default(60000),
  configUrl: z.string().url().optional(),
  globalEnabled: z.boolean().default(true),
  globalSchedule: ScheduleSchema,
  killCombo: z.string().default('CommandOrControl+Shift+Alt+Q'),
  dismissCombo: z.string().default('Shift+Escape'),
  dismissDelay: z.number().min(0).max(30000).default(2000),
  dismissable: z.boolean().default(true),
  pranks: z.object({
    cursorText: CursorTextConfig.default({}),
    unclosable: UnclosableConfig.default({}),
    screenFlip: ScreenFlipConfig.default({}),
    cursorTrail: CursorTrailConfig.default({}),
    screenTilt: ScreenTiltConfig.default({}),
    fakeBsod: FakeBSODConfig.default({}),
    screenShake: ScreenShakeConfig.default({}),
    colorInversion: ColorInversionConfig.default({}),
    matrixRain: MatrixRainConfig.default({}),
    jumpscare: JumpscareConfig.default({}),
    mouseMagnet: MouseMagnetConfig.default({}),
    pixelDecay: PixelDecayConfig.default({}),
    staticGlitch: StaticGlitchConfig.default({}),
  }).default({}),
  keystrokeReactions: KeystrokeReactionsConfig.default({}),
  mercy: z.object({
    enabled: z.boolean().default(true),
    phrase: z.string().default('vlad please stop'),
    caseSensitive: z.boolean().default(false),
    pauseDurationMs: z.number().min(60000).max(86400000).default(3600000), // 1 hour
    maxUsesPerDay: z.number().min(1).max(50).default(2),
    confirmationText: z.string().default("Fine. You're free... for now."),
    confirmationEmoji: z.string().default('😮‍💨'),
    confirmationDuration: z.number().min(1000).max(15000).default(4000),
    confirmationColor: z.string().default('#00ff00'),
    confirmationFontSize: z.number().min(16).max(200).default(48),
    exhaustedText: z.string().default("No mercy left today. Good luck."),
    exhaustedEmoji: z.string().default('😈'),
    exhaustedColor: z.string().default('#ff0000'),
    resumeText: z.string().default("Time's up. I'm back."),
    resumeEmoji: z.string().default('👹'),
    resumeColor: z.string().default('#ff0000'),
    resumeDuration: z.number().min(1000).max(10000).default(3000),
  }).default({}),
  autoUpdate: z.object({
    enabled: z.boolean().default(false),
    repo: z.string().default('BanariVlad/red-hairing'),
    checkIntervalMs: z.number().min(60000).max(86400000).default(3600000),
  }).default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type PranksConfig = AppConfig['pranks'];
