// src/bot/webhook.js

const TelegramBot = require('node-telegram-bot-api');
const authSidecar = require('../sidecars/auth');
const rateLimiter = require('../sidecars/rate-limiter');
const logger = require('../sidecars/logger');
const geminiService = require('../services/gemini');
const { enqueueTransaction, enqueueWeeklySummary } = require('../queue/producer');
const { registerBot } = require('../queue/worker');
const configLoader = require('../control-plane/config-loader');

function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN tidak ditemukan di .env');

  const isProduction = process.env.NODE_ENV === 'production';
  const bot = new TelegramBot(token, {
    polling: !isProduction,
    webHook: isProduction ? { port: parseInt(process.env.PORT || '3000') } : false,
  });

  // Daftarkan bot ke worker agar bisa kirim pesan dari background
  registerBot(bot);

  // === MIDDLEWARE: semua pesan masuk ===
  bot.on('message', async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands
    if (text?.startsWith('/')) return;
    if (!text) return;

    // Auth check
    const authResult = authSidecar.validate(msg);
    if (!authResult.valid) {
      logger.warn('Auth failed', { userId, reason: authResult.reason });
      return;
    }

    // Rate limit check
    const rlResult = rateLimiter.check(userId);
    if (!rlResult.allowed) {
      await bot.sendMessage(chatId,
        `⏳ Terlalu banyak request. Coba lagi dalam ${rlResult.resetIn} detik.`
      );
      return;
    }

    // Parse transaksi via Gemini
    try {
      await bot.sendChatAction(chatId, 'typing');

      const featureAiParse = configLoader.getPath('bot-config.yaml', 'features.ai_parse');
      if (!featureAiParse) {
        await bot.sendMessage(chatId, '⚠️ Fitur AI parse sedang nonaktif.');
        return;
      }

      const parsed = await geminiService.parseTransaction(text);

      if (parsed.error) {
        await bot.sendMessage(chatId,
          `❓ Tidak bisa memahami pesan kamu.\n\nContoh format:\n• "makan siang 25rb"\n• "transport ojek 15rb"\n• "terima gaji 5jt"`
        );
        return;
      }

      // Enqueue ke worker (OSB Pattern — tidak proses sinkron)
      const jobId = await enqueueTransaction({
        userId: userId.toString(),
        chatId,
        rawText: text,
        parsedData: parsed,
      });

      await bot.sendMessage(chatId,
        `⏳ Mencatat transaksi... _(${jobId.toString().slice(-6)})_`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      logger.error('Message processing failed', { userId, error: err.message });
      await bot.sendMessage(chatId, '❌ Terjadi kesalahan. Coba lagi ya.');
    }
  });

  // === COMMAND: /start ===
  bot.onText(/\/start/, async (msg) => {
    const name = msg.from?.first_name || 'Kamu';
    const welcome = configLoader.getPath('bot-config.yaml', 'bot.welcome_message');
    await bot.sendMessage(msg.chat.id,
      `Hai ${name}! 👋\n\n${welcome}\n\nKirim langsung catatan:\n• "makan siang 25rb"\n• "gajian 3.5jt"\n• "transport 15rb"\n\n/rekap — ringkasan minggu ini\n/bantuan — panduan lengkap`
    );
  });

  // === COMMAND: /rekap ===
  bot.onText(/\/rekap/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    await bot.sendMessage(chatId, '📊 Mengambil rekap minggu ini...');
    await enqueueWeeklySummary(userId);
    // Catatan: hasil dikirim oleh worker setelah selesai diproses
  });

  // === COMMAND: /bantuan ===
  bot.onText(/\/bantuan/, async (msg) => {
    const helpText = `📖 *Panduan KeuanganKu Bot*\n\n`
      + `*Catat Pengeluaran:*\n`
      + `• "makan siang 25rb"\n`
      + `• "beli bensin 50.000"\n`
      + `• "bayar listrik 200rb"\n\n`
      + `*Catat Pemasukan:*\n`
      + `• "terima gaji 5jt"\n`
      + `• "freelance 500rb"\n\n`
      + `*Perintah:*\n`
      + `• /rekap — ringkasan minggu ini\n`
      + `• /bantuan — panduan ini`;
    await bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  });

  logger.info('KeuanganKu Bot initialized', {
    mode: isProduction ? 'webhook' : 'polling',
  });

  return bot;
}

module.exports = { createBot };
