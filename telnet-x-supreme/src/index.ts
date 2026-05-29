// src/index.ts
// CLI entry point — Telnet-X Supreme v5.1

import * as crypto from 'crypto';
import { configLoader } from './control-plane/config-loader';
import { logger } from './sidecars/logger-sidecar';
import { ScanJob, runBatch } from './workers/scan-worker';
import { saveJsonReport, saveTextReport } from './reporters';

async function main() {
  // Load Control Plane
  configLoader.load('scan-profiles.yaml');
  configLoader.load('ai-config.yaml');

  const args = process.argv.slice(2);
  const targets = args.filter(a => !a.startsWith('--'));
  const profileArg = args.find(a => a.startsWith('--profile='));
  const profileName = profileArg?.split('=')[1] || 'quick';

  if (targets.length === 0) {
    console.error([
      '',
      '  Telnet-X Supreme v5.1',
      '',
      '  Usage:',
      '    npx ts-node src/index.ts <host> [host2:port] --profile=<profile>',
      '',
      '  Profiles: quick | deep | audit',
      '',
      '  Examples:',
      '    npx ts-node src/index.ts 192.168.1.1 --profile=quick',
      '    npx ts-node src/index.ts 10.0.0.1 10.0.0.2:2323 --profile=deep',
      '    npx ts-node src/index.ts router.local --profile=audit',
      '',
    ].join('\n'));
    process.exit(1);
  }

  const profiles = configLoader.getPath<any>('scan-profiles.yaml', 'profiles');
  const defaults = configLoader.getPath<any>('scan-profiles.yaml', 'default');
  const profile = profiles[profileName] || defaults;
  const outputCfg = configLoader.getPath<any>('scan-profiles.yaml', 'output');

  logger.info('Telnet-X Supreme v5.1 starting', {
    targets: targets.length,
    profile: profileName,
    ai_analysis: profile.ai_analysis || false,
  });

  // Build scan jobs
  const jobs: ScanJob[] = targets.map(target => {
    const [host, portStr] = target.split(':');
    return {
      id: crypto.randomBytes(4).toString('hex'),
      host,
      port: portStr ? parseInt(portStr) : undefined,
      profile: profileName,
    };
  });

  // Run dengan concurrency dari control plane
  const maxConcurrent = profile.max_concurrent || defaults.max_concurrent;
  const results = await runBatch(jobs, maxConcurrent);

  // Save reports
  const outputDir = outputCfg.directory || './reports';
  const formats: string[] = outputCfg.formats || ['json'];

  const reportPaths: string[] = [];
  if (formats.includes('json')) reportPaths.push(saveJsonReport(results, outputDir));
  if (formats.includes('text')) reportPaths.push(saveTextReport(results, outputDir));

  // Print summary ke terminal
  const open = results.filter(r => r.open).length;
  const critical = results.filter(r => r.aiAnalysis?.risk === 'critical').length;
  const high = results.filter(r => r.aiAnalysis?.risk === 'high').length;

  console.log('\n' + '='.repeat(50));
  console.log('SCAN COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total    : ${results.length}`);
  console.log(`Open     : ${open}`);
  console.log(`Closed   : ${results.length - open}`);
  if (profile.ai_analysis) {
    console.log(`Critical : ${critical}`);
    console.log(`High     : ${high}`);
  }
  console.log('\nReports:');
  reportPaths.forEach(p => console.log(`  → ${p}`));
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
