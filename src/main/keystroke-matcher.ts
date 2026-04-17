import { BrowserWindow } from 'electron';
import { AppConfig } from './config/config-schema';
import { IPC } from '../shared/ipc-channels';

// uiohook keycodes → characters
const KEYCODE_MAP: Record<number, string> = {
  30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g', 35: 'h',
  23: 'i', 36: 'j', 37: 'k', 38: 'l', 50: 'm', 49: 'n', 24: 'o', 25: 'p',
  16: 'q', 19: 'r', 31: 's', 20: 't', 22: 'u', 47: 'v', 17: 'w', 45: 'x',
  21: 'y', 44: 'z',
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  57: ' ', 28: '\n',
};

type MercyCallback = () => boolean;
type PrankTriggerCallback = (prankIds: string[], delay: number) => void;

export class KeystrokeMatcher {
  private buffer: string = '';
  private bufferSize: number = 100;
  private config: AppConfig | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private cooldowns: Map<string, number> = new Map();
  private onMercy: MercyCallback | null = null;
  private onTriggerPranks: PrankTriggerCallback | null = null;

  setOverlayWindow(win: BrowserWindow): void {
    this.overlayWindow = win;
  }

  setMercyCallback(cb: MercyCallback): void {
    this.onMercy = cb;
  }

  setTriggerPranksCallback(cb: PrankTriggerCallback): void {
    this.onTriggerPranks = cb;
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
    this.bufferSize = config.keystrokeReactions?.bufferSize || 100;
  }

  handleKeycode(keycode: number): void {
    const char = KEYCODE_MAP[keycode];
    if (!char) return;

    this.buffer += char;
    if (this.buffer.length > this.bufferSize) {
      this.buffer = this.buffer.slice(-this.bufferSize);
    }

    // Check mercy phrase first
    this.checkMercy();

    // Check keystroke reactions
    if (this.config?.keystrokeReactions?.enabled) {
      this.checkPatterns();
    }
  }

  private checkMercy(): void {
    const mercy = this.config?.mercy;
    if (!mercy?.enabled) return;

    const bufferToCheck = mercy.caseSensitive ? this.buffer : this.buffer.toLowerCase();
    const phraseToCheck = mercy.caseSensitive ? mercy.phrase : mercy.phrase.toLowerCase();

    if (!bufferToCheck.endsWith(phraseToCheck)) return;

    this.buffer = '';

    const granted = this.onMercy?.() ?? false;

    if (granted) {
      console.log(`[KeystrokeMatcher] Mercy granted!`);
      this.overlayWindow?.webContents.send(IPC.MERCY_MESSAGE, {
        text: mercy.confirmationText,
        emoji: mercy.confirmationEmoji,
        color: mercy.confirmationColor,
        fontSize: mercy.confirmationFontSize,
        duration: mercy.confirmationDuration,
      });
    } else {
      console.log(`[KeystrokeMatcher] Mercy denied — no uses left`);
      this.overlayWindow?.webContents.send(IPC.MERCY_MESSAGE, {
        text: mercy.exhaustedText,
        emoji: mercy.exhaustedEmoji,
        color: mercy.exhaustedColor,
        fontSize: mercy.confirmationFontSize,
        duration: mercy.confirmationDuration,
      });
    }
  }

  private checkPatterns(): void {
    const reactions = this.config?.keystrokeReactions?.reactions || [];
    const now = Date.now();

    for (const reaction of reactions) {
      const lastFired = this.cooldowns.get(reaction.pattern) || 0;
      if (now - lastFired < reaction.cooldown) continue;

      const bufferToCheck = reaction.caseSensitive ? this.buffer : this.buffer.toLowerCase();
      const patternToCheck = reaction.caseSensitive ? reaction.pattern : reaction.pattern.toLowerCase();

      if (!bufferToCheck.endsWith(patternToCheck)) continue;

      if (Math.random() > reaction.chance) continue;

      console.log(`[KeystrokeMatcher] Pattern matched: "${reaction.pattern}"`);
      this.cooldowns.set(reaction.pattern, now);
      this.buffer = '';

      // Visual reaction (if response has content)
      if (reaction.response) {
        this.overlayWindow?.webContents.send(IPC.KEYSTROKE_REACTION, {
          pattern: reaction.pattern,
          response: reaction.response,
        });
      }

      // Trigger pranks
      if (reaction.triggerPranks?.length > 0) {
        this.onTriggerPranks?.(reaction.triggerPranks, reaction.triggerDelay || 0);
      }

      break;
    }
  }
}
