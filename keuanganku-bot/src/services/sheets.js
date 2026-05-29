// src/services/sheets.js
// Rate-limited Google Sheets service dengan exponential backoff

const { google } = require('googleapis');
const configLoader = require('../control-plane/config-loader');
const logger = require('../sidecars/logger');

class SheetsService {
  constructor() {
    this._requestCount = 0;
    this._windowStart = Date.now();
  }

  _getAuth() {
    const creds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!creds) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON tidak ditemukan di .env');
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(creds),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  async _getClient() {
    const auth = this._getAuth();
    return google.sheets({ version: 'v4', auth });
  }

  async _rateLimitedRequest(fn) {
    const cfg = configLoader.getPath('bot-config.yaml', 'sheets');
    const maxPerMinute = cfg.rate_limit_per_minute;
    const maxBackoff = cfg.exponential_backoff_max_ms;

    const now = Date.now();
    if (now - this._windowStart > 60000) {
      this._windowStart = now;
      this._requestCount = 0;
    }

    if (this._requestCount >= maxPerMinute) {
      const waitMs = 60000 - (now - this._windowStart) + 100;
      logger.warn('Rate limit reached, waiting', { waitMs });
      await new Promise(r => setTimeout(r, waitMs));
      this._windowStart = Date.now();
      this._requestCount = 0;
    }

    this._requestCount++;

    let delay = 1000;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err.code === 429 || err.status === 429) {
          delay = Math.min(delay * 2, maxBackoff);
          logger.warn('Quota exceeded, backing off', { attempt, delay });
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error('Max retries exceeded untuk Google Sheets API');
  }

  async appendTransaction(userId, data) {
    const sheets = await this._getClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID tidak ditemukan di .env');

    const row = [
      data.date,
      data.type,
      data.category,
      data.description,
      data.amount,
      userId,
      new Date().toISOString(),
    ];

    return this._rateLimitedRequest(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Transaksi!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      })
    );
  }

  async getWeeklyTransactions(userId) {
    const sheets = await this._getClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    const response = await this._rateLimitedRequest(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Transaksi!A:G',
      })
    );

    const rows = response.data.values || [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return rows
      .slice(1)
      .filter(row => row[5] === userId && new Date(row[0]) >= oneWeekAgo)
      .map(row => ({
        date: row[0], type: row[1], category: row[2],
        description: row[3], amount: parseFloat(row[4]),
      }));
  }

  async getTransactions(userId, { startDate, endDate, limit = 50 } = {}) {
    const sheets = await this._getClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    const response = await this._rateLimitedRequest(() =>
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Transaksi!A:G' })
    );

    const rows = response.data.values || [];
    return rows
      .slice(1)
      .filter(row => {
        if (row[5] !== userId) return false;
        const d = new Date(row[0]);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      })
      .slice(0, limit)
      .map(row => ({
        date: row[0], type: row[1], category: row[2],
        description: row[3], amount: parseFloat(row[4]), user_id: row[5],
      }));
  }

  async getMonthlySummary(userId, year, month) {
    const transactions = await this.getTransactions(userId, {
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-31`,
      limit: 1000,
    });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const byCategory = transactions.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {});

    return { totalIncome, totalExpense, byCategory, transactionCount: transactions.length };
  }
}

module.exports = new SheetsService();
