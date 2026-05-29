// src/reporters/index.ts
// Output formatters untuk hasil scan

import * as fs from 'fs';
import * as path from 'path';
import { ScanResult } from '../workers/scan-worker';
import { logger } from '../sidecars/logger-sidecar';

export function saveJsonReport(results: ScanResult[], outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outputDir, `scan-${ts}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  logger.info('JSON report saved', { filePath });
  return filePath;
}

export function saveTextReport(results: ScanResult[], outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outputDir, `scan-${ts}.txt`);

  const lines: string[] = [
    '========================================',
    'TELNET-X SUPREME v5.1 - SCAN REPORT',
    `Generated: ${new Date().toISOString()}`,
    `Total Targets: ${results.length}`,
    `Open: ${results.filter(r => r.open).length}`,
    `Closed: ${results.filter(r => !r.open).length}`,
    '========================================',
    '',
  ];

  for (const r of results) {
    lines.push(`HOST: ${r.host}:${r.port}`);
    lines.push(`STATUS: ${r.open ? '✅ OPEN' : '❌ CLOSED'} (${r.responseMs}ms)`);

    if (r.banner) {
      lines.push(`BANNER: ${r.banner.replace(/\n/g, ' ').slice(0, 120)}`);
    }

    if (r.aiAnalysis) {
      const ai = r.aiAnalysis;
      lines.push(`AI RISK: ${ai.risk?.toUpperCase() || 'UNKNOWN'}`);
      lines.push(`SERVICE: ${ai.service || 'unknown'} ${ai.version || ''}`);
      if (ai.findings?.length) {
        lines.push(`FINDINGS:`);
        ai.findings.forEach((f: string) => lines.push(`  - ${f}`));
      }
      if (ai.recommendations?.length) {
        lines.push(`RECOMMENDATIONS:`);
        ai.recommendations.forEach((rec: string) => lines.push(`  → ${rec}`));
      }
    }

    if (r.error) lines.push(`ERROR: ${r.error}`);
    lines.push('----------------------------------------');
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  logger.info('Text report saved', { filePath });
  return filePath;
}
