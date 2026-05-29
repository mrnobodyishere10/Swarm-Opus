// src/sidecars/logger.js
// Sidecar Pattern: Structured JSON logger

const configLoader = require('../control-plane/config-loader');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class LoggerSidecar {
  _getLevel() {
    try {
      return configLoader.getPath('bot-config.yaml', 'sidecars.logger.level') || 'info';
    } catch {
      return 'info';
    }
  }

  _log(level, message, meta = {}) {
    if (LEVELS[level] < LEVELS[this._getLevel()]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    const out = JSON.stringify(entry);
    level === 'error' ? console.error(out) : console.log(out);
  }

  debug(msg, meta) { this._log('debug', msg, meta); }
  info(msg, meta)  { this._log('info',  msg, meta); }
  warn(msg, meta)  { this._log('warn',  msg, meta); }
  error(msg, meta) { this._log('error', msg, meta); }
}

module.exports = new LoggerSidecar();
