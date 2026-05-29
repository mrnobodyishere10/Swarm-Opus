// src/queue/worker.js
// OSB Pattern: Background worker — proses async, tulis ke Sheets

const { Worker } = require('bullmq');
const sheetsService = require('../services/sheets');
const geminiService = require('../services/gemini');
const logger = require('../sidecars/logger');
const configLoader = require('../control-plane/config-loader');

// Map bot instances agar bisa kirim pesan dari worker
const botRegistry = new Map();

function registerBot(bot) {
  botRegistry.set('main', bot);
}

function startWorker() {
  const cfg = configLoader.getPath('bot-config.yaml', 'queue');
  const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  const worker = new Worker('keuanganku-tasks', async (job) => {
    logger.info('Processing job', { jobId: job.id, name: job.name });

    if (job.name === 'process-transaction') {
      const { userId, chatId, parsedData } = job.data;

      await sheetsService.appendTransaction(userId, parsedData);

      const bot = botRegistry.get('main');
      if (bot) {
        const typeLabel = parsedData.type === 'expense' ? 'Pengeluaran' : 'Pemasukan';
        const amountFmt = parsedData.amount.toLocaleString('id-ID');
        const msg = `✅ *${typeLabel}* dicatat!\n`
          + `💰 Rp ${amountFmt}\n`
          + `📂 ${parsedData.category}\n`
          + `📝 ${parsedData.description}\n`
          + `📅 ${parsedData.date}`;
        await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      }

      logger.info('Transaction saved', { userId, amount: parsedData.amount });
    }

    if (job.name === 'weekly-summary') {
      const { userId, chatId } = job.data;
      const transactions = await sheetsService.getWeeklyTransactions(userId);
      const summary = await geminiService.generateWeeklySummary(transactions);

      const bot = botRegistry.get('main');
      if (bot && chatId) {
        await bot.sendMessage(chatId, `📊 *Ringkasan Minggu Ini*\n\n${summary}`, {
          parse_mode: 'Markdown',
        });
      }
      logger.info('Weekly summary sent', { userId });
    }
  }, { connection, concurrency: cfg.concurrency });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job?.id, error: err.message });
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id });
  });

  logger.info('Worker started', { concurrency: cfg.concurrency });
  return worker;
}

module.exports = { startWorker, registerBot };
