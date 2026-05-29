// src/sidecars/rate-limiter.js
// Sidecar Pattern: Rate limiter per user

const configLoader = require('../control-plane/config-loader');

class RateLimiterSidecar {
  constructor() {
    this._store = new Map();
  }

  _getConfig() {
    return configLoader.getPath('bot-config.yaml', 'sidecars.rate_limiter');
  }

  check(userId) {
    const cfg = this._getConfig();
    if (!cfg.enabled) return { allowed: true };

    const now = Date.now();
    const windowMs = cfg.window_seconds * 1000;
    const maxReqs = cfg.max_requests_per_user;

    const history = (this._store.get(userId) || [])
      .filter(ts => now - ts < windowMs);

    if (history.length >= maxReqs) {
      const oldestTs = Math.min(...history);
      const resetIn = Math.ceil((oldestTs + windowMs - now) / 1000);
      return { allowed: false, resetIn };
    }

    history.push(now);
    this._store.set(userId, history);
    return { allowed: true, remaining: maxReqs - history.length };
  }
}

module.exports = new RateLimiterSidecar();
