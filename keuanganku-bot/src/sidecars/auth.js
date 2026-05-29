// src/sidecars/auth.js
// Sidecar Pattern: Auth validasi terpisah dari logika bot

const configLoader = require('../control-plane/config-loader');

class AuthSidecar {
  isEnabled() {
    return configLoader.getPath('bot-config.yaml', 'sidecars.auth.enabled');
  }

  getWhitelist() {
    return configLoader.getPath('bot-config.yaml', 'sidecars.auth.whitelist_users') || [];
  }

  validate(ctx) {
    if (!this.isEnabled()) return { valid: true };
    const userId = ctx?.from?.id;
    if (!userId) return { valid: false, reason: 'No user ID' };
    const whitelist = this.getWhitelist();
    if (whitelist.length > 0 && !whitelist.includes(userId)) {
      return { valid: false, reason: 'User not whitelisted' };
    }
    return { valid: true, userId };
  }
}

module.exports = new AuthSidecar();
