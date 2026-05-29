// src/services/gemini.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const configLoader = require('../control-plane/config-loader');
const logger = require('../sidecars/logger');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

let genAI = null;

function getClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY tidak ditemukan di .env');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

function getPrompts() {
  const filePath = path.join(process.cwd(), 'config', 'prompts.yaml');
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

async function parseTransaction(text) {
  const cfg = configLoader.getPath('bot-config.yaml', 'gemini');
  const prompts = getPrompts();
  const client = getClient();

  const model = client.getGenerativeModel({
    model: cfg.model,
    generationConfig: {
      temperature: cfg.temperature,
      maxOutputTokens: cfg.max_tokens,
    },
    systemInstruction: prompts.parse_transaction.system,
  });

  let lastError;
  for (let attempt = 1; attempt <= cfg.parse_retries; attempt++) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await model.generateContent(`Tanggal hari ini: ${today}\nPesan: ${text}`);
      const responseText = result.response.text().trim();
      const clean = responseText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.date === 'today') parsed.date = today;
      logger.info('Transaction parsed', { attempt, type: parsed.type, amount: parsed.amount });
      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn('Parse attempt failed', { attempt, error: err.message });
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  logger.error('Parse failed after retries', { error: lastError?.message });
  return { error: 'Parse gagal setelah beberapa percobaan' };
}

async function generateWeeklySummary(transactions) {
  const cfg = configLoader.getPath('bot-config.yaml', 'gemini');
  const prompts = getPrompts();
  const client = getClient();

  const model = client.getGenerativeModel({
    model: cfg.model,
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    systemInstruction: prompts.weekly_summary.system,
  });

  const result = await model.generateContent(JSON.stringify(transactions));
  return result.response.text();
}

module.exports = { parseTransaction, generateWeeklySummary };
