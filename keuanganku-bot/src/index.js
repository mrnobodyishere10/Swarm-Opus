// src/index.js
// Entry point utama KeuanganKu Bot v2.0

require('dotenv').config();
const express = require('express');
const configLoader = require('./control-plane/config-loader');
const logger = require('./sidecars/logger');
const { createBot } = require('./bot/webhook');
const { startWorker } = require('./queue/worker');
const { startRestServer } = require('./api/rest-server');

async function main() {
  // 1. Load Control Plane (Sovereign Pattern)
  configLoader.load('bot-config.yaml');
  configLoader.load('prompts.yaml');
  logger.info('Control plane loaded', {
    version: configLoader.getPath('bot-config.yaml', 'bot.version'),
  });

  // 2. Start background worker (OSB Pattern)
  startWorker();

  // 3. Start REST API untuk TabunganKu Flutter
  const app = express();
  startRestServer(app);

  // 4. Start Telegram Bot
  const bot = createBot();

  logger.info('KeuanganKu Bot v2.0 fully started', {
    env: process.env.NODE_ENV || 'development',
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    bot.stopPolling?.();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
