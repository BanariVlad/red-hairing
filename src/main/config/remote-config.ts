import { app, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, parseConfig } from './config-schema';
import { DEFAULT_CONFIG } from './default-config';

const CACHE_FILE = 'config-cache.json';
const ERROR_LOG = 'config-errors.log';

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
    console.log('[RemoteConfig] Starting, URL:', this.configUrl);

    const cached = this.loadCache();
    if (cached) {
      console.log('[RemoteConfig] Loaded from cache, globalEnabled:', cached.globalEnabled);
      this.config = cached;
      this.onChange?.(this.config);
    } else {
      console.log('[RemoteConfig] No cache found');
    }

    await this.fetchAndApply();
    this.startPolling();
    console.log('[RemoteConfig] Polling started, interval:', this.config.pollIntervalMs, 'ms');
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
      this.fetchAndApply().catch(() => {});
    }, this.config.pollIntervalMs);
  }

  private logError(msg: string): void {
    try {
      const logPath = path.join(app.getPath('userData'), ERROR_LOG);
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch {}
  }

  private async fetchAndApply(): Promise<void> {
    if (!this.configUrl) return;

    try {
      // Cache-bust GitHub CDN
      const separator = this.configUrl.includes('?') ? '&' : '?';
      const bustUrl = `${this.configUrl}${separator}_t=${Date.now()}`;

      // Use Electron's net module — more reliable than Node fetch in packaged apps
      const body = await new Promise<string>((resolve, reject) => {
        const request = net.request(bustUrl);
        let data = '';

        request.on('response', (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          response.on('data', (chunk) => { data += chunk.toString(); });
          response.on('end', () => resolve(data));
          response.on('error', reject);
        });

        request.on('error', reject);
        request.end();
      });

      console.log('[RemoteConfig] Fetch OK, body length:', body.length);

      const raw = JSON.parse(body);
      const parsed = parseConfig(raw);

      console.log('[RemoteConfig] Parsed OK, globalEnabled:', parsed.globalEnabled,
        'pranks enabled:', Object.entries(parsed.pranks).filter(([,v]: any) => v.enabled).map(([k]) => k).join(','));
      console.log('[RemoteConfig] keystrokeReactions enabled:', parsed.keystrokeReactions?.enabled,
        'reactions count:', parsed.keystrokeReactions?.reactions?.length);

      const oldJson = JSON.stringify(this.config);
      const newJson = JSON.stringify(parsed);

      if (oldJson !== newJson) {
        console.log('[RemoteConfig] Config CHANGED, applying');
        this.config = parsed;
        this.saveCache(parsed);
        this.onChange?.(this.config);

        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.startPolling();
        }
      } else {
        console.log('[RemoteConfig] Config unchanged');
      }
    } catch (err: any) {
      console.error('[RemoteConfig] Fetch FAILED:', err.message);
      this.logError(`Fetch failed: ${err.message}`);
    }
  }

  private getCachePath(): string {
    return path.join(app.getPath('userData'), CACHE_FILE);
  }

  private saveCache(config: AppConfig): void {
    try {
      fs.writeFileSync(this.getCachePath(), JSON.stringify(config, null, 2));
    } catch {}
  }

  private loadCache(): AppConfig | null {
    try {
      const data = fs.readFileSync(this.getCachePath(), 'utf-8');
      return parseConfig(JSON.parse(data));
    } catch {
      return null;
    }
  }
}
