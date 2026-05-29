// src/sidecars/logger-sidecar.ts
// Sidecar Pattern: Structured logger terpisah dari core

type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class LoggerSidecar {
  private currentLevel: Level = 'info';

  setLevel(level: Level) {
    this.currentLevel = level;
  }

  private log(level: Level, msg: string, meta: Record<string, any> = {}) {
    if (LEVELS[level] < LEVELS[this.currentLevel]) return;
    const entry = {
      ts: new Date().toISOString(),
      level: level.toUpperCase(),
      msg,
      ...meta,
    };
    const out = JSON.stringify(entry);
    level === 'error' ? console.error(out) : console.log(out);
  }

  debug(msg: string, meta?: Record<string, any>) { this.log('debug', msg, meta); }
  info(msg: string, meta?: Record<string, any>)  { this.log('info',  msg, meta); }
  warn(msg: string, meta?: Record<string, any>)  { this.log('warn',  msg, meta); }
  error(msg: string, meta?: Record<string, any>) { this.log('error', msg, meta); }
}

export const logger = new LoggerSidecar();
