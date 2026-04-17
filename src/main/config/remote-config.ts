import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, AppConfigSchema } from './config-schema';
import { DEFAULT_CONFIG } from './default-config';

const CACHE_FILE = 'config-cache.json';

export class RemoteConfig {
  private config: AppConfig = DEFAULT_CONFIG;
  private pollTimer: NodeJS.Timeout | null = null;
  private configUrl: string | null = null;
  private onChange: ((config: AppConfig) => void) | null = null;

  constructor(configUrl: string, onChange: (config: AppConfig) => void) {
    this.configUrl = configUrl;
    this.onChange = onChange;
  }

  async start(): Promise<void> {
    // Load cached config first
    const cached = this.loadCache();
    if (cached) {
      this.config = cached;
      this.onChange?.(this.config);
    }

    // Fetch remote immediately
    await this.fetchAndApply();

    // Start polling
    this.startPolling();
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.fetchAndApply().catch(err => {
        console.error('[RemoteConfig] Poll failed:', err.message);
      });
    }, this.config.pollIntervalMs);
  }

  private async fetchAndApply(): Promise<void> {
    if (!this.configUrl) return;

    try {
      const response = await fetch(this.configUrl, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      const parsed = AppConfigSchema.parse(raw);

      // Check if config actually changed
      const oldJson = JSON.stringify(this.config);
      const newJson = JSON.stringify(parsed);

      if (oldJson !== newJson) {
        this.config = parsed;
        this.saveCache(parsed);
        this.onChange?.(this.config);

        // Update poll interval if changed
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.startPolling();
        }

        console.log('[RemoteConfig] Config updated');
      }
    } catch (err: any) {
      console.error('[RemoteConfig] Fetch failed:', err.message);
    }
  }

  private getCachePath(): string {
    return path.join(app.getPath('userData'), CACHE_FILE);
  }

  private saveCache(config: AppConfig): void {
    try {
      fs.writeFileSync(this.getCachePath(), JSON.stringify(config, null, 2));
    } catch (err: any) {
      console.error('[RemoteConfig] Cache save failed:', err.message);
    }
  }

  private loadCache(): AppConfig | null {
    try {
      const data = fs.readFileSync(this.getCachePath(), 'utf-8');
      return AppConfigSchema.parse(JSON.parse(data));
    } catch {
      return null;
    }
  }
}
