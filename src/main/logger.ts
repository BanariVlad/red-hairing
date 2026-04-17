import * as fs from 'fs';
import * as path from 'path';

let logPath: string | null = null;

export function initLogger(userDataPath: string): void {
  logPath = path.join(userDataPath, 'debug.log');
  try { fs.writeFileSync(logPath, `=== Started ${new Date().toISOString()} ===\n`); } catch {}

  const originalLog = console.log;
  const originalError = console.error;

  function writeLog(level: string, args: any[]) {
    if (!logPath) return;
    const msg = `[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
    try { fs.appendFileSync(logPath, msg); } catch {}
  }

  console.log = (...args: any[]) => {
    originalLog(...args);
    writeLog('LOG', args);
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    writeLog('ERR', args);
  };
}

export function getLogPath(): string {
  return logPath || 'not initialized';
}
