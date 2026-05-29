// src/queue/producer.js
// OSB Pattern: Enqueue task — jangan pernah proses berat secara sinkron

const { Queue } = require('bullmq');
const configLoader = require('../control-plane/config-loader');
const logger = require('../sidecars/logger');

let queueInstance = null;

function getQueue() {
  if (!queueInstance) {
    const connection = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
    queueInstance = new Queue('keuanganku-tasks', { connection });
  }
  return queueInstance;
}

async function enqueueTransaction(data) {
  const cfg = configLoader.getPath('bot-config.yaml', 'queue');
  const queue = getQueue();
  const job = await queue.add('process-transaction', data, {
    attempts: cfg.retry_attempts,
    backoff: { type: 'exponential', delay: cfg.retry_delay_ms },
    timeout: cfg.job_timeout_ms,
  });
  logger.info('Job enqueued', { jobId: job.id, userId: data.userId });
  return job.id;
}

async function enqueueWeeklySummary(userId) {
  const cfg = configLoader.getPath('bot-config.yaml', 'queue');
  const queue = getQueue();
  const job = await queue.add('weekly-summary', { userId }, {
    attempts: cfg.retry_attempts,
    delay: 0,
  });
  logger.info('Weekly summary enqueued', { jobId: job.id, userId });
  return job.id;
}

module.exports = { enqueueTransaction, enqueueWeeklySummary };
