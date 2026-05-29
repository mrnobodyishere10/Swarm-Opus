// src/workers/scan-worker.ts
// OSB Pattern: Async worker untuk scan jobs

import { probeTelnet } from '../core/telnet-client';
import { aiSidecar } from '../sidecars/ai-sidecar';
import { configLoader } from '../control-plane/config-loader';
import { logger } from '../sidecars/logger-sidecar';

export interface ScanJob {
  id: string;
  host: string;
  port?: number;
  profile: string;
}

export interface ScanResult {
  jobId: string;
  host: string;
  port: number;
  open: boolean;
  banner: string;
  responseMs: number;
  aiAnalysis?: any;
  error?: string;
  timestamp: string;
}

export async function processScanJob(job: ScanJob): Promise<ScanResult> {
  const profiles = configLoader.getPath<any>('scan-profiles.yaml', 'profiles');
  const defaults = configLoader.getPath<any>('scan-profiles.yaml', 'default');
  const profile = profiles[job.profile] || defaults;
  const port = job.port || defaults.port;

  logger.info('Processing scan job', { jobId: job.id, host: job.host, profile: job.profile });

  const result = await probeTelnet(
    job.host,
    port,
    profile.timeout_ms || defaults.timeout_ms,
    profile.banner_max_bytes || defaults.banner_max_bytes,
  );

  const scanResult: ScanResult = {
    jobId: job.id,
    host: job.host,
    port,
    open: result.open,
    banner: result.banner,
    responseMs: result.responseMs,
    error: result.error,
    timestamp: new Date().toISOString(),
  };

  if (profile.ai_analysis && result.open && result.banner.length > 0) {
    scanResult.aiAnalysis = await aiSidecar.analyzeBanner(job.host, result.banner);
  }

  logger.info('Scan job complete', {
    jobId: job.id,
    open: result.open,
    responseMs: result.responseMs,
    risk: scanResult.aiAnalysis?.risk || 'N/A',
  });

  return scanResult;
}

// Jalankan jobs dengan concurrency limit
export async function runBatch(jobs: ScanJob[], maxConcurrent: number): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  for (let i = 0; i < jobs.length; i += maxConcurrent) {
    const batch = jobs.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(job => processScanJob(job)));
    results.push(...batchResults);
    if (i + maxConcurrent < jobs.length) {
      logger.info(`Batch ${Math.floor(i / maxConcurrent) + 1} done, processing next...`);
    }
  }
  return results;
}
