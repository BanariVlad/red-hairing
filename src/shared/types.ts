export type TriggerType = 'click' | 'keypress' | 'idle' | 'interval' | 'random';

export type PrankId =
  | 'cursorText'
  | 'unclosable'
  | 'screenFlip'
  | 'cursorTrail'
  | 'screenTilt'
  | 'fakeBsod'
  | 'screenShake'
  | 'colorInversion'
  | 'matrixRain'
  | 'jumpscare'
  | 'mouseMagnet'
  | 'pixelDecay'
  | 'staticGlitch';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface PrankCommand {
  prank: PrankId;
  action: 'start' | 'stop';
  config?: Record<string, unknown>;
  screenCapture?: string; // base64 data URL for screen-capture pranks
}
