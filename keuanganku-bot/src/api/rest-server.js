// src/api/rest-server.js
// REST API untuk dikonsumsi TabunganKu Mobile Flutter

const express = require('express');
const sheetsService = require('../services/sheets');
const configLoader = require('../control-plane/config-loader');
const logger = require('../sidecars/logger');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: configLoader.getPath('bot-config.yaml', 'bot.version'),
    timestamp: new Date().toISOString(),
  });
});

// Remote config endpoint (Sovereign Pattern untuk Flutter)
router.get('/config', (req, res) => {
  try {
    const botConfig = configLoader.get('bot-config.yaml');
    res.json({
      api_base_url: process.env.PUBLIC_API_URL || `http://localhost:${process.env.REST_PORT || 3001}`,
      app_version: botConfig.bot.version,
      feature_budget_alert: botConfig.features.budget_alert,
      feature_weekly_summary: botConfig.features.weekly_summary,
      max_transactions_per_page: 50,
    });
  } catch (err) {
    logger.error('GET /config failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET transaksi
router.get('/transactions', async (req, res) => {
  try {
    const { user_id, start_date, end_date, limit } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id wajib diisi' });

    const transactions = await sheetsService.getTransactions(user_id, {
      startDate: start_date,
      endDate: end_date,
      limit: parseInt(limit || '50'),
    });
    res.json({ data: transactions });
  } catch (err) {
    logger.error('GET /transactions failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST transaksi (dari Flutter)
router.post('/transactions', async (req, res) => {
  try {
    const { user_id, type, category, description, amount, date } = req.body;
    if (!user_id || !type || !amount) {
      return res.status(400).json({ error: 'user_id, type, amount wajib diisi' });
    }

    const data = {
      date: date || new Date().toISOString().split('T')[0],
      type, category: category || 'lainnya',
      description: description || '', amount: parseFloat(amount),
    };

    await sheetsService.appendTransaction(user_id, data);
    res.status(201).json({ data: { ...data, user_id } });
  } catch (err) {
    logger.error('POST /transactions failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET ringkasan bulanan
router.get('/summary', async (req, res) => {
  try {
    const { user_id, year, month } = req.query;
    if (!user_id || !year || !month) {
      return res.status(400).json({ error: 'user_id, year, month wajib diisi' });
    }

    const summary = await sheetsService.getMonthlySummary(user_id, year, month);
    res.json({ data: summary });
  } catch (err) {
    logger.error('GET /summary failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

function startRestServer(app) {
  const port = parseInt(process.env.REST_PORT || '3001');
  app.use(express.json());
  app.use('/api', router);
  app.listen(port, () => {
    logger.info('REST API started', { port });
  });
}

module.exports = { startRestServer, router };
